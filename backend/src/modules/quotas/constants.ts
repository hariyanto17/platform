export const QUOTA_LIMIT_TYPES = {
  HARD_LIMIT: "HARD_LIMIT",
  SOFT_LIMIT: "SOFT_LIMIT",
  FAIR_USE: "FAIR_USE",
} as const;

export type QuotaLimitType = (typeof QUOTA_LIMIT_TYPES)[keyof typeof QUOTA_LIMIT_TYPES];

export const QUOTA_MEASUREMENT_TYPES = {
  GAUGE: "GAUGE",
  COUNTER: "COUNTER",
} as const;

export type QuotaMeasurementType = (typeof QUOTA_MEASUREMENT_TYPES)[keyof typeof QUOTA_MEASUREMENT_TYPES];

export const CANONICAL_RESOURCES = {
  MAX_ACTIVE_DEVICES: "MAX_ACTIVE_DEVICES",
  MAX_OUTLETS: "MAX_OUTLETS",
  MAX_SKUS: "MAX_SKUS",
  MAX_MONTHLY_TRANSACTIONS: "MAX_MONTHLY_TRANSACTIONS",
  STORAGE_GB: "STORAGE_GB",
  API_CALLS: "API_CALLS",
  WHATSAPP_CREDITS: "WHATSAPP_CREDITS",
} as const;

export type CanonicalResourceCode = (typeof CANONICAL_RESOURCES)[keyof typeof CANONICAL_RESOURCES];

export interface CanonicalResourceMetadata {
  code: string;
  name: string;
  description: string;
  limitType: QuotaLimitType;
  unit: string;
  measurementType: QuotaMeasurementType;
}

export const CANONICAL_RESOURCE_DEFINITIONS: Record<string, CanonicalResourceMetadata> = {
  MAX_ACTIVE_DEVICES: {
    code: "MAX_ACTIVE_DEVICES",
    name: "Active Device Seats",
    description: "Maximum concurrently activated cashier POS / kiosk / mobile devices",
    limitType: "HARD_LIMIT",
    unit: "DEVICES",
    measurementType: "GAUGE",
  },
  MAX_OUTLETS: {
    code: "MAX_OUTLETS",
    name: "Operational Outlets / Branches",
    description: "Maximum active cinema or store locations",
    limitType: "HARD_LIMIT",
    unit: "OUTLETS",
    measurementType: "GAUGE",
  },
  MAX_SKUS: {
    code: "MAX_SKUS",
    name: "Active Catalog SKUs",
    description: "Maximum active menu, concession, ticket, or inventory items",
    limitType: "FAIR_USE",
    unit: "SKUS",
    measurementType: "GAUGE",
  },
  MAX_MONTHLY_TRANSACTIONS: {
    code: "MAX_MONTHLY_TRANSACTIONS",
    name: "Monthly Transaction Volume",
    description: "Reasonable monthly completed sales transactions threshold",
    limitType: "FAIR_USE",
    unit: "TRANSACTIONS",
    measurementType: "COUNTER",
  },
  STORAGE_GB: {
    code: "STORAGE_GB",
    name: "Cloud Storage Quota",
    description: "Media, movie trailers, poster assets and backup storage allocation in GB",
    limitType: "SOFT_LIMIT",
    unit: "GIGABYTES",
    measurementType: "GAUGE",
  },
  API_CALLS: {
    code: "API_CALLS",
    name: "Monthly External API Calls",
    description: "Open API & Integration webhook call quota per calendar month",
    limitType: "SOFT_LIMIT",
    unit: "CALLS",
    measurementType: "COUNTER",
  },
  WHATSAPP_CREDITS: {
    code: "WHATSAPP_CREDITS",
    name: "WhatsApp Notification Credits",
    description: "Monthly customer e-ticket & promo message broadcast credits",
    limitType: "SOFT_LIMIT",
    unit: "CREDITS",
    measurementType: "COUNTER",
  },
};
