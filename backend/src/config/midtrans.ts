export const MIDTRANS_MERCHANT_ID = process.env.MIDTRANS_MERCHANT_ID || "";
export const MIDTRANS_SERVER_KEY = process.env.MIDTRANS_SERVER_KEY || "";
export const MIDTRANS_CLIENT_KEY = process.env.MIDTRANS_CLIENT_KEY || "";
export const MIDTRANS_IS_PRODUCTION = process.env.MIDTRANS_IS_PRODUCTION === "true";

export const MIDTRANS_SNAP_BASE_URL = MIDTRANS_IS_PRODUCTION
  ? "https://app.midtrans.com/snap/v1"
  : "https://app.sandbox.midtrans.com/snap/v1";

export const MIDTRANS_API_BASE_URL = MIDTRANS_IS_PRODUCTION
  ? "https://api.midtrans.com/v2"
  : "https://api.sandbox.midtrans.com/v2";

export const DOWNSTREAM_URLS: Record<string, string> = {
  TICKETING: process.env.TICKETING_API_URL || "http://127.0.0.1:5011",
  CONCESSION: process.env.CONCESSION_API_URL || "http://127.0.0.1:5050",
  PARKING: process.env.PARKING_API_URL || "http://127.0.0.1:5070",
};

export const PLATFORM_INTERNAL_API_KEY =
  process.env.PLATFORM_INTERNAL_API_KEY || "sec_internal_planet_cinema_uat_key_99x";
