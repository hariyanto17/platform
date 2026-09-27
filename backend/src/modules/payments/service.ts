import { prisma } from "../../utils/prisma";
import { AppError } from "../../utils/errorHandler";
import {
  CreateChargeInput,
  MidtransWebhookPayload,
} from "./validation";
import {
  chargeQris,
  createSnapToken,
  generateSignature,
  queryMidtransStatus,
  verifySignature,
} from "./midtransClient";
import { dispatchPaymentEventToDownstream } from "./dispatcher";
import { PaymentStatus } from "@prisma/client";

export const createCharge = async (input: CreateChargeInput) => {
  const transactionNumber = `TRX-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;

  // Check if an existing pending payment transaction already exists
  const existing = await prisma.paymentTransaction.findFirst({
    where: {
      appCode: input.appCode,
      externalOrderId: input.externalOrderId,
      status: "PENDING",
    },
    include: { splitItems: true },
  });

  const now = new Date();
  if (existing && existing.expiredAt && existing.expiredAt > now && (existing.redirectUrl || existing.qrString || existing.snapToken)) {
    return {
      transactionId: existing.id,
      transactionNumber: existing.transactionNumber,
      orderNumber: existing.externalOrderId,
      appCode: existing.appCode,
      grossAmount: existing.grossAmount,
      paymentType: existing.paymentType,
      status: existing.status,
      qrUrl: existing.redirectUrl || "",
      qrString: existing.qrString || "",
      snapToken: existing.snapToken || "",
      expiredAt: existing.expiredAt.toISOString(),
    };
  }

  let chargeResult: any;
  const expiredAt = new Date(Date.now() + (input.expiryMinutes || 10) * 60 * 1000);

  if (input.paymentType === "snap") {
    chargeResult = await createSnapToken(input);
  } else {
    chargeResult = await chargeQris(input);
  }

  const splitItemsData = (
    input.splitItems && input.splitItems.length > 0
      ? input.splitItems
      : [
          {
            targetAppCode: input.appCode as "TICKETING" | "CONCESSION" | "PARKING",
            targetOrderId: input.externalOrderId,
            amount: input.grossAmount,
          },
        ]
  ).map((s: { targetAppCode: "TICKETING" | "CONCESSION" | "PARKING"; targetOrderId: string; amount: number }) => ({
    targetAppCode: s.targetAppCode,
    targetOrderId: s.targetOrderId,
    amount: s.amount,
    status: "PENDING" as PaymentStatus,
  }));

  const transaction = await prisma.paymentTransaction.create({
    data: {
      transactionNumber,
      appCode: input.appCode,
      externalOrderId: input.externalOrderId,
      provider: "MIDTRANS",
      paymentType: input.paymentType || "qris",
      grossAmount: input.grossAmount,
      status: "PENDING",
      midtransTransactionId: chargeResult.transactionId || null,
      redirectUrl: chargeResult.qrUrl || chargeResult.redirectUrl || null,
      qrString: chargeResult.qrString || null,
      snapToken: chargeResult.snapToken || null,
      customerName: input.customer?.name || null,
      customerEmail: input.customer?.email || null,
      customerPhone: input.customer?.phone || null,
      itemDetails: input.itemDetails ? (input.itemDetails as any) : undefined,
      metadata: input.metadata ? (input.metadata as any) : undefined,
      rawResponse: chargeResult.rawResponse || null,
      expiredAt,
      splitItems: {
        create: splitItemsData,
      },
    },
    include: { splitItems: true },
  });

  return {
    transactionId: transaction.id,
    transactionNumber: transaction.transactionNumber,
    orderNumber: transaction.externalOrderId,
    appCode: transaction.appCode,
    grossAmount: transaction.grossAmount,
    paymentType: transaction.paymentType,
    status: transaction.status,
    qrUrl: transaction.redirectUrl || "",
    qrString: transaction.qrString || "",
    snapToken: transaction.snapToken || "",
    expiredAt: expiredAt.toISOString(),
  };
};

export const handleMidtransWebhook = async (payload: MidtransWebhookPayload) => {
  // 1. Signature Verification
  const isSignatureValid = verifySignature(payload);
  if (!isSignatureValid) {
    await prisma.paymentWebhookLog.create({
      data: {
        provider: "MIDTRANS",
        orderId: payload.order_id,
        statusCode: payload.status_code,
        grossAmount: payload.gross_amount,
        signatureKey: payload.signature_key,
        isSignatureValid: false,
        eventStatus: payload.transaction_status,
        payload: payload as any,
        dispatchStatus: "FAILED",
        dispatchError: "Invalid Midtrans signature key",
      },
    });
    throw new AppError("UNAUTHORIZED", "Invalid Midtrans signature key");
  }

  // 2. Find internal PaymentTransaction
  const transaction = await prisma.paymentTransaction.findFirst({
    where: {
      OR: [
        { externalOrderId: payload.order_id },
        { transactionNumber: payload.order_id },
      ],
    },
    include: { splitItems: true },
  });

  if (!transaction) {
    await prisma.paymentWebhookLog.create({
      data: {
        provider: "MIDTRANS",
        orderId: payload.order_id,
        statusCode: payload.status_code,
        grossAmount: payload.gross_amount,
        signatureKey: payload.signature_key,
        isSignatureValid: true,
        eventStatus: payload.transaction_status,
        payload: payload as any,
        dispatchStatus: "FAILED",
        dispatchError: `Transaction not found for order_id: ${payload.order_id}`,
      },
    });
    throw new AppError("NOT_FOUND", `Payment transaction not found for order_id: ${payload.order_id}`);
  }

  // 3. Map Midtrans transaction status
  const midtransStatus = (payload.transaction_status || "").toLowerCase();
  const fraudStatus = (payload.fraud_status || "").toLowerCase();

  let targetStatus: PaymentStatus = "PENDING";
  let dispatchEvent: "SETTLEMENT" | "PENDING" | "CANCELLED" | "EXPIRED" | "FAILED" = "PENDING";

  if (midtransStatus === "settlement" || (midtransStatus === "capture" && fraudStatus === "accept")) {
    targetStatus = "SETTLEMENT";
    dispatchEvent = "SETTLEMENT";
  } else if (midtransStatus === "expire") {
    targetStatus = "EXPIRE";
    dispatchEvent = "EXPIRED";
  } else if (["cancel", "deny"].includes(midtransStatus)) {
    targetStatus = midtransStatus === "cancel" ? "CANCEL" : "DENY";
    dispatchEvent = "CANCELLED";
  } else if (midtransStatus === "pending") {
    targetStatus = "PENDING";
    dispatchEvent = "PENDING";
  }

  // 4. Update PaymentTransaction
  const updatedTx = await prisma.paymentTransaction.update({
    where: { id: transaction.id },
    data: {
      status: targetStatus,
      midtransTransactionId: payload.transaction_id || transaction.midtransTransactionId,
      rawResponse: payload as any,
      ...(targetStatus === "SETTLEMENT" ? { settledAt: new Date() } : {}),
    },
  });

  // 5. Dispatch Event to Downstream Microservice(s)
  const dispatchResult = await dispatchPaymentEventToDownstream(transaction.id, dispatchEvent, payload);

  // 6. Record Webhook Log Audit
  await prisma.paymentWebhookLog.create({
    data: {
      paymentTransactionId: transaction.id,
      provider: "MIDTRANS",
      orderId: payload.order_id,
      statusCode: payload.status_code,
      grossAmount: payload.gross_amount,
      signatureKey: payload.signature_key,
      isSignatureValid: true,
      eventStatus: payload.transaction_status,
      payload: payload as any,
      dispatchStatus: dispatchResult.success ? "SUCCESS" : "PARTIAL_OR_FAILED",
      dispatchError: dispatchResult.success ? null : JSON.stringify(dispatchResult.results),
    },
  });

  return {
    status: targetStatus,
    message: `Payment status updated to ${targetStatus} and dispatched downstream`,
    transactionId: updatedTx.id,
    orderNumber: updatedTx.externalOrderId,
    dispatchResult,
  };
};

export const getPaymentStatus = async (identifier: string) => {
  let transaction = await prisma.paymentTransaction.findFirst({
    where: {
      OR: [
        { id: identifier },
        { transactionNumber: identifier },
        { externalOrderId: identifier },
      ],
    },
    include: { splitItems: true },
  });

  if (!transaction) throw new AppError("NOT_FOUND", "Payment transaction not found");

  // If pending, sync with Midtrans
  if (transaction.status === "PENDING") {
    const remoteData: any = await queryMidtransStatus(transaction.externalOrderId);
    if (remoteData && remoteData.transaction_status) {
      const status = (remoteData.transaction_status || "").toLowerCase();
      const fraudStatus = (remoteData.fraud_status || "").toLowerCase();

      if (status === "settlement" || (status === "capture" && fraudStatus === "accept")) {
        transaction = await prisma.paymentTransaction.update({
          where: { id: transaction.id },
          data: {
            status: "SETTLEMENT",
            settledAt: new Date(),
            midtransTransactionId: remoteData.transaction_id,
            rawResponse: remoteData,
          },
          include: { splitItems: true },
        });
        await dispatchPaymentEventToDownstream(transaction.id, "SETTLEMENT", remoteData);
      } else if (status === "expire") {
        transaction = await prisma.paymentTransaction.update({
          where: { id: transaction.id },
          data: {
            status: "EXPIRE",
            rawResponse: remoteData,
          },
          include: { splitItems: true },
        });
        await dispatchPaymentEventToDownstream(transaction.id, "EXPIRED", remoteData);
      }
    }
  }

  return {
    id: transaction.id,
    transactionNumber: transaction.transactionNumber,
    appCode: transaction.appCode,
    externalOrderId: transaction.externalOrderId,
    status: transaction.status,
    paymentType: transaction.paymentType,
    grossAmount: transaction.grossAmount,
    redirectUrl: transaction.redirectUrl,
    qrString: transaction.qrString,
    snapToken: transaction.snapToken,
    expiredAt: transaction.expiredAt,
    settledAt: transaction.settledAt,
    splitItems: transaction.splitItems,
  };
};

export const simulatePaymentSuccess = async (orderNumber: string) => {
  const transaction = await prisma.paymentTransaction.findFirst({
    where: {
      OR: [{ externalOrderId: orderNumber }, { transactionNumber: orderNumber }],
    },
  });

  if (!transaction) throw new AppError("NOT_FOUND", "Transaction not found");

  const grossAmount = `${Math.round(transaction.grossAmount)}.00`;
  const statusCode = "200";
  const signatureKey = generateSignature(
    transaction.externalOrderId,
    statusCode,
    grossAmount
  );

  const payload: MidtransWebhookPayload = {
    order_id: transaction.externalOrderId,
    status_code: statusCode,
    gross_amount: grossAmount,
    signature_key: signatureKey,
    transaction_id: `sim-platform-${Date.now()}`,
    transaction_status: "settlement",
    payment_type: transaction.paymentType || "qris",
    fraud_status: "accept",
  };

  return handleMidtransWebhook(payload);
};
