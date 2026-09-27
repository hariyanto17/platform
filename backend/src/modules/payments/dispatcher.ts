import { prisma } from "../../utils/prisma";
import { DOWNSTREAM_URLS, PLATFORM_INTERNAL_API_KEY } from "../../config/midtrans";
import { DispatchNotificationPayload } from "./validation";

export const dispatchPaymentEventToDownstream = async (
  transactionId: string,
  eventStatus: "SETTLEMENT" | "PENDING" | "CANCELLED" | "EXPIRED" | "FAILED",
  rawPayload: any
) => {
  const transaction = await prisma.paymentTransaction.findUnique({
    where: { id: transactionId },
    include: { splitItems: true },
  });

  if (!transaction) return { success: false, error: "Transaction not found" };

  const dispatchResults: Array<{
    targetAppCode: string;
    targetOrderId: string;
    endpoint: string;
    success: boolean;
    error?: string;
    response?: any;
  }> = [];

  // Determine split targets or fallback to primary appCode
  const targets: Array<{
    id?: string;
    targetAppCode: string;
    targetOrderId: string;
    amount: number;
  }> =
    transaction.splitItems.length > 0
      ? transaction.splitItems
      : [
          {
            targetAppCode: transaction.appCode,
            targetOrderId: transaction.externalOrderId,
            amount: transaction.grossAmount,
          },
        ];

  for (const target of targets) {
    const baseUrl = DOWNSTREAM_URLS[target.targetAppCode];
    if (!baseUrl) {
      dispatchResults.push({
        targetAppCode: target.targetAppCode,
        targetOrderId: target.targetOrderId,
        endpoint: "UNKNOWN",
        success: false,
        error: `No downstream URL configured for application: ${target.targetAppCode}`,
      });
      continue;
    }

    const cleanBaseUrl = baseUrl.replace(/\/api$/, "").replace(/\/$/, "");
    const endpoint = `${cleanBaseUrl}/api/internal/payments/notification`;
    const notificationPayload: DispatchNotificationPayload = {
      masterTransactionNumber: transaction.transactionNumber,
      externalOrderId: transaction.externalOrderId,
      targetAppCode: target.targetAppCode,
      targetOrderId: target.targetOrderId,
      status: eventStatus,
      provider: "MIDTRANS",
      paymentType: transaction.paymentType,
      providerTransactionId: transaction.midtransTransactionId || transaction.transactionNumber,
      grossAmount: target.amount,
      settledAt: transaction.settledAt?.toISOString(),
      rawPayload,
    };

    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          "x-platform-internal-key": PLATFORM_INTERNAL_API_KEY,
        },
        body: JSON.stringify(notificationPayload),
      });

      const resBody: any = await response.json().catch(() => ({}));

      const isSuccess = response.ok;
      dispatchResults.push({
        targetAppCode: target.targetAppCode,
        targetOrderId: target.targetOrderId,
        endpoint,
        success: isSuccess,
        response: resBody,
        ...(isSuccess ? {} : { error: `HTTP ${response.status}: ${JSON.stringify(resBody)}` }),
      });

      // If split item exists in DB, update tracking
      if (target.id) {
        await prisma.paymentSplitItem.update({
          where: { id: target.id },
          data: {
            status:
              eventStatus === "SETTLEMENT"
                ? "SETTLEMENT"
                : eventStatus === "EXPIRED"
                ? "EXPIRE"
                : eventStatus === "CANCELLED"
                ? "CANCEL"
                : "FAILURE",
            dispatchedAt: new Date(),
            acknowledgedAt: isSuccess ? new Date() : null,
            dispatchResponse: resBody as any,
          },
        });
      }
    } catch (err: any) {
      dispatchResults.push({
        targetAppCode: target.targetAppCode,
        targetOrderId: target.targetOrderId,
        endpoint,
        success: false,
        error: err?.message || String(err),
      });
    }
  }

  return {
    success: dispatchResults.every((r) => r.success),
    results: dispatchResults,
  };
};
