// Core types shared across the ScamShield pipeline.
// Pipeline: OpenAI (sees) -> JEV (decides) -> OpenAI (explains)

export type InputMode = "image" | "text";

export type ScamCategory =
  | "phishing"
  | "payment_request"
  | "impersonation"
  | "fake_reward"
  | "account_threat"
  | "job_scam"
  | "investment_scam"
  | "marketplace_scam"
  | "suspicious_link"
  | "other"
  | "unclear"
  | "none";

export type ConcernLevel = "low" | "needs_verification" | "high";

// Step 2 output — OpenAI image understanding
export interface ExtractedMessage {
  extractedText: string;
  language: string;
  sourceType: string;
  readability: "clear" | "unclear";
}

// Step 4 output — JEV structured decision
export interface JevResult {
  category: ScamCategory;
  urgency: boolean;
  financialRequest: boolean;
  sensitiveInformation: boolean;
  impersonation: boolean;
  suspiciousLink: boolean;
  threat: boolean;
  reward: boolean;
  riskScore: number; // 0.0 - 3.0
}

// Step 6 output — OpenAI explanation
export interface WarningSign {
  title: string;
  explanation: string;
}

export interface ExplanationResult {
  summary: string;
  warningSigns: WarningSign[];
  recommendedActions: string[];
}

// Request body for POST /api/analyze
export interface AnalyzeRequest {
  mode: InputMode;
  text?: string;
  imageBase64?: string;
  mimeType?: string;
}

// Final combined result shown on the Result screen
export interface AnalysisResult {
  concernLevel: ConcernLevel;
  category: ScamCategory;
  riskScore: number;
  extractedText: string;
  jev: JevResult;
  explanation: ExplanationResult;
  // true when the final OpenAI explanation step failed and we fell back
  // to JEV output + predefined recommendations (see spec section 23/24)
  usedFallbackExplanation: boolean;
}

// Shape returned by the API on a handled failure (see spec section 23)
export interface AnalyzeError {
  error: true;
  stage: "validation" | "extraction" | "jev" | "explanation";
  message: string;
}
