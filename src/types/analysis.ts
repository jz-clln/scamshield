// File: src/types/analysis.ts

export type ConcernLevel = "low" | "needs_verification" | "high";

export type ScamCategory =
  | "phishing"
  | "financial_fraud"
  | "impersonation"
  | "prize_scam"
  | "delivery_scam"
  | "job_scam"
  | "investment_scam"
  | "marketplace_scam"
  | "account_threat"
  | "legitimate"
  | "unknown";

export interface JevResult {
  category: ScamCategory;

  // Boolean convenience values.
  // These are derived from the raw JEV probabilities.
  urgency: boolean;
  financialRequest: boolean;
  sensitiveInformation: boolean;
  impersonation: boolean;
  suspiciousLink: boolean;
  threat: boolean;
  reward: boolean;
  paymentChange: boolean;

  // Raw JEV probabilities.
  // Keep these because 0.49 and 0.51 should not be treated
  // as dramatically different predictions.
  urgencyProbability: number;
  financialRequestProbability: number;
  sensitiveInformationProbability: number;
  impersonationProbability: number;
  suspiciousLinkProbability: number;
  threatProbability: number;
  rewardProbability: number;
  paymentChangeProbability: number;

  // Overall JEV outputs.
  scamProbability: number;
  riskScore: number;
  confidence: number;
  categoryConfidence: number;
}

export interface ScamWarningSign {
  title: string;
  explanation: string;
}

export interface ScamExplanation {
  summary: string;
  warningSigns: ScamWarningSign[];
  recommendedActions: string[];
}

export interface AnalysisResult {
  extractedText: string;
  concernLevel: ConcernLevel;
  jev: JevResult;
  explanation?: ScamExplanation;
}