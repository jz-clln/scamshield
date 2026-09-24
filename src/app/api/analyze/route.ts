// File: src/types/analysis.ts

// ---------------------------------------------------------------------
// Concern Level
// ---------------------------------------------------------------------

export type ConcernLevel =
  | "low"
  | "needs_verification"
  | "high";

// ---------------------------------------------------------------------
// Scam Categories
// ---------------------------------------------------------------------

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

// ---------------------------------------------------------------------
// API Request
// ---------------------------------------------------------------------

export type AnalyzeRequest =
  | {
      mode: "text";
      text: string;

      // Prevent accidental use of image fields in text mode.
      imageBase64?: never;
      mimeType?: never;
    }
  | {
      mode: "image";
      imageBase64: string;
      mimeType: string;

      // Prevent accidental use of text field in image mode.
      text?: never;
    };

// ---------------------------------------------------------------------
// API Error
// ---------------------------------------------------------------------

export interface AnalyzeError {
  error: true;

  stage:
    | "validation"
    | "extraction"
    | "jev"
    | "explanation";

  message: string;
}

// ---------------------------------------------------------------------
// JEV Result
// ---------------------------------------------------------------------

export interface JevResult {
  // Main category returned by JEV.
  category: ScamCategory;

  // ---------------------------------------------------------------
  // Convenience boolean values
  // ---------------------------------------------------------------

  urgency: boolean;

  financialRequest: boolean;

  sensitiveInformation: boolean;

  impersonation: boolean;

  suspiciousLink: boolean;

  threat: boolean;

  reward: boolean;

  paymentChange: boolean;

  // ---------------------------------------------------------------
  // Raw JEV probabilities
  // ---------------------------------------------------------------

  scamProbability: number;

  urgencyProbability: number;

  financialRequestProbability: number;

  sensitiveInformationProbability: number;

  impersonationProbability: number;

  suspiciousLinkProbability: number;

  threatProbability: number;

  rewardProbability: number;

  paymentChangeProbability: number;

  // ---------------------------------------------------------------
  // Risk / confidence
  // ---------------------------------------------------------------

  riskScore: number;

  confidence: number;

  categoryConfidence: number;
}

// ---------------------------------------------------------------------
// OpenAI Explanation
// ---------------------------------------------------------------------

export interface ScamWarningSign {
  title: string;
  explanation: string;
}

export interface ScamExplanation {
  summary: string;

  warningSigns: ScamWarningSign[];

  recommendedActions: string[];
}

// ---------------------------------------------------------------------
// Image Extraction
// ---------------------------------------------------------------------

export type ImageReadability =
  | "clear"
  | "unclear";

export interface ImageExtractionResult {
  extractedText: string;

  readability: ImageReadability;

  language?: string;

  sourceType?: string;
}

// ---------------------------------------------------------------------
// Final ScamShield Analysis Result
// ---------------------------------------------------------------------

export interface AnalysisResult {
  // Final ScamShield concern classification.
  concernLevel: ConcernLevel;

  // Primary JEV category.
  category: ScamCategory;

  // Supporting JEV risk score.
  riskScore: number;

  // Text that was actually analyzed.
  extractedText: string;

  // Full structured JEV output.
  jev: JevResult;

  // OpenAI user-facing explanation.
  explanation: ScamExplanation;

  // True when OpenAI explanation failed and the app used
  // predefined fallback recommendations instead.
  usedFallbackExplanation: boolean;
}