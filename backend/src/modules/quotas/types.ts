import { QuotaLimitType, QuotaMeasurementType } from "./constants";

export interface QuotaGrantSource {
  type: "PLAN" | "ADD_ON" | "CUSTOM";
  code: string;
  name?: string;
  quantity?: number | null;
  isUnlimited?: boolean;
  overrideMode?: "ADD" | "REPLACE";
}

export interface EffectiveQuotaDetail {
  resourceCode: string;
  name: string;
  description: string | null;
  limitType: QuotaLimitType;
  unit: string;
  measurementType: QuotaMeasurementType;
  isUnlimited: boolean;
  allocated: number | null; // null if isUnlimited is true
  used: number;
  remaining: number | null; // null if isUnlimited is true
  overage: number;
  percentageUsed: number | null; // null if isUnlimited is true
  period: string; // e.g. "GLOBAL" or "2026-08"
  enforceable: boolean;
  status: "HEALTHY" | "NEAR_LIMIT" | "LIMIT_REACHED" | "OVERAGE";
  sources: QuotaGrantSource[];
  lastRecordedAt?: string;
}

export interface ResolvedEffectiveQuotas {
  organizationId: string;
  organizationName: string;
  subscriptionId: string | null;
  planCode: string | null;
  subscriptionStatus: string | null;
  period: string;
  quotas: Record<string, EffectiveQuotaDetail>;
  quotaList: EffectiveQuotaDetail[];
  totalResources: number;
  nearLimitCount: number;
  hardLimitViolationsCount: number;
  totalOverageCount: number;
}

export interface QuotaCheckResult {
  allowed: boolean;
  resourceCode: string;
  limitType: QuotaLimitType;
  isUnlimited: boolean;
  effectiveLimit: number | null;
  currentUsage: number;
  requestedAmount: number;
  projectedUsage: number;
  remaining: number | null;
  overage: number;
  status: "ALLOWED" | "REJECTED_HARD_LIMIT" | "ALLOWED_WITH_OVERAGE";
  reason?: string;
}

export interface UsageRecordInput {
  organizationId: string;
  resourceCode: string;
  quantity: number;
  mode: "SET" | "INCREMENT";
  period?: string;
  metadata?: Record<string, any>;
}

export interface TenantQuotaOverrideInput {
  resourceCode: string;
  quantity?: number | null;
  isUnlimited?: boolean;
  overrideMode?: "ADD" | "REPLACE";
  effectiveFrom?: string;
  effectiveUntil?: string | null;
  notes?: string;
}
