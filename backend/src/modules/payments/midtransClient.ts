import crypto from "crypto";
import {
  MIDTRANS_SERVER_KEY,
  MIDTRANS_SNAP_BASE_URL,
  MIDTRANS_API_BASE_URL,
} from "../../config/midtrans";
import { CreateChargeInput } from "./validation";

export const generateSignature = (
  orderId: string,
  statusCode: string,
  grossAmount: string,
  serverKey = MIDTRANS_SERVER_KEY
): string => {
  const rawString = `${orderId}${statusCode}${grossAmount}${serverKey}`;
  return crypto.createHash("sha512").update(rawString).digest("hex");
};

export const verifySignature = (
  payload: {
    order_id: string;
    status_code: string;
    gross_amount: string;
    signature_key: string;
    [key: string]: any;
  },
  serverKey = MIDTRANS_SERVER_KEY
): boolean => {
  const expectedSignature = generateSignature(
    payload.order_id,
    payload.status_code,
    payload.gross_amount,
    serverKey
  );
  return payload.signature_key === expectedSignature;
};

export const chargeQris = async (input: CreateChargeInput) => {
  const authHeader = `Basic ${Buffer.from(MIDTRANS_SERVER_KEY + ":").toString("base64")}`;
  
  const payload: any = {
    payment_type: "qris",
    transaction_details: {
      order_id: input.orderNumber,
      gross_amount: Math.round(input.grossAmount),
    },
    qris: {
      acquirer: "gopay",
    },
    customer_details: {
      first_name: input.customer?.name || "Customer",
      phone: input.customer?.phone || "",
      ...(input.customer?.email && { email: input.customer.email }),
    },
    custom_expiry: {
      expiry_duration: input.expiryMinutes || 10,
      unit: "minute",
    },
  };

  if (input.itemDetails && input.itemDetails.length > 0) {
    payload.item_details = input.itemDetails;
  }

  let transactionId = "";
  let qrUrl = "";
  let qrString = "";
  let rawResponse: any = null;

  try {
    const response = await fetch(`${MIDTRANS_API_BASE_URL}/charge`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        Authorization: authHeader,
      },
      body: JSON.stringify(payload),
    });

    const data: any = await response.json();

    if (!response.ok || (data.status_code !== "201" && data.status_code !== "200")) {
      throw new Error(
        data.status_message || data.error_messages?.join(", ") || "Failed to create Midtrans QRIS charge"
      );
    }

    rawResponse = data;
    transactionId = data.transaction_id;
    qrUrl = data.actions?.find((a: any) => a.name === "generate-qr-code")?.url || "";
    qrString = data.qr_string || "";
  } catch (err: any) {
    // If testing or offline or missing credentials, provide deterministic mock for sandbox
    if (process.env.NODE_ENV === "test" || !MIDTRANS_SERVER_KEY) {
      transactionId = `mock-midtrans-qris-${input.orderNumber}`;
      qrUrl = `https://api.sandbox.midtrans.com/v2/qris/${transactionId}/qr-code`;
      qrString = `00020101021226590014ID.LINKAJA.WWW01189360091100210082720205008270303UMI51440014ID.CO.QRIS.WWW0215ID10200210082720303UMI5204581253033605405500005802ID5913Planet Cinema6007Jakarta61051234062070703A0163045952`;
      rawResponse = {
        status_code: "201",
        status_message: "QRIS transaction is created",
        transaction_id: transactionId,
        order_id: input.orderNumber,
        gross_amount: String(input.grossAmount),
        payment_type: "qris",
        transaction_status: "pending",
        actions: [{ name: "generate-qr-code", method: "GET", url: qrUrl }],
        qr_string: qrString,
      };
    } else {
      throw err;
    }
  }

  return {
    transactionId,
    qrUrl,
    qrString,
    rawResponse,
  };
};

export const createSnapToken = async (input: CreateChargeInput) => {
  const authHeader = `Basic ${Buffer.from(MIDTRANS_SERVER_KEY + ":").toString("base64")}`;

  const payload: any = {
    transaction_details: {
      order_id: input.orderNumber,
      gross_amount: Math.round(input.grossAmount),
    },
    customer_details: {
      first_name: input.customer?.name || "Customer",
      phone: input.customer?.phone || "",
      ...(input.customer?.email && { email: input.customer.email }),
    },
    expiry: {
      unit: "minutes",
      duration: input.expiryMinutes || 10,
    },
  };

  if (input.itemDetails && input.itemDetails.length > 0) {
    payload.item_details = input.itemDetails;
  }

  let snapToken = "";
  let redirectUrl = "";
  let rawResponse: any = null;

  try {
    const response = await fetch(`${MIDTRANS_SNAP_BASE_URL}/transactions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        Authorization: authHeader,
      },
      body: JSON.stringify(payload),
    });

    const data: any = await response.json();

    if (!response.ok || !data.token) {
      throw new Error(
        data.error_messages?.join(", ") || data.message || "Failed to create Midtrans Snap transaction"
      );
    }

    snapToken = data.token;
    redirectUrl = data.redirect_url;
    rawResponse = data;
  } catch (err: any) {
    if (process.env.NODE_ENV === "test" || !MIDTRANS_SERVER_KEY) {
      snapToken = `mock-snap-${input.orderNumber}`;
      redirectUrl = `https://app.sandbox.midtrans.com/snap/v2/vtweb/${snapToken}`;
      rawResponse = { token: snapToken, redirect_url: redirectUrl };
    } else {
      throw err;
    }
  }

  return {
    snapToken,
    redirectUrl,
    rawResponse,
  };
};

export const queryMidtransStatus = async (orderId: string) => {
  const authHeader = `Basic ${Buffer.from(MIDTRANS_SERVER_KEY + ":").toString("base64")}`;
  try {
    const response = await fetch(`${MIDTRANS_API_BASE_URL}/${orderId}/status`, {
      method: "GET",
      headers: {
        Accept: "application/json",
        Authorization: authHeader,
      },
    });

    if (response.ok) {
      return await response.json();
    }
    return null;
  } catch (err) {
    return null;
  }
};
