export type GrantType = "PLAN" | "ADD_ON" | "VERTICAL" | "CUSTOM";
export type EntitlementStatus = "GRANTED" | "ACTIVE" | "SUSPENDED" | "EXPIRED" | "REVOKED";

export interface GrantSource {
  type: GrantType;
  code: string;
  name?: string;
  grantId?: string;
}

export interface EffectiveFeatureDetail {
  key: string;
  name: string;
  moduleCode: string;
  isCore: boolean;
  active: boolean;
  sources: GrantSource[];
  isRevoked: boolean;
  missingDependencies?: string[];
}

export interface ResolvedEntitlements {
  organizationId: string;
  organizationName: string;
  subscriptionId: string | null;
  planCode: string | null;
  subscriptionStatus: string | null;
  effectiveFeatures: string[];
  featureDetails: Record<string, EffectiveFeatureDetail>;
  revokedFeatures: string[];
  totalEffective: number;
  totalRevoked: number;
}
