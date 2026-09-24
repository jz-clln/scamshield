// File: src/types/analysis.ts

// ---------------------------------------------------------------------
// Input mode
// ---------------------------------------------------------------------

export type InputMode = "text" | "image";

// ---------------------------------------------------------------------
// Concern level
// ---------------------------------------------------------------------

export type ConcernLevel =
  | "low"
  | "needs_verification"
  | "high";

// ---------------------------------------------------------------------
// Scam categories
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
// Analyze API request
// ---------------------------------------------------------------------

export type AnalyzeRequest =
  | {
      mode: "text";
      text: string;

      imageBase64?: never;
      mimeType?: never;
    }
  | {
      mode: "image";
      imageBase64: string;
      mimeType: string;

      text?: never;
    };

// ---------------------------------------------------------------------
// Analyze API error
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
// JEV result
// ---------------------------------------------------------------------

export interface JevResult {
  // ---------------------------------------------------------------
  // Primary classification
  // ---------------------------------------------------------------

  category: ScamCategory;

  categoryConfidence: number;

  // ---------------------------------------------------------------
  // Overall JEV scam evaluation
  // ---------------------------------------------------------------

  /**
   * JEV's probability that the message is attempting
   * to scam or deceive the recipient.
   *
   * Range:
   * 0.0 = very unlikely
   * 1.0 = very likely
   */
  scamProbability: number;

  /**
   * JEV's supporting 0-4 risk score.
   *
   * This should NOT be used alone to determine
   * the final ScamShield concern level.
   */
  riskScore: number;

  /**
   * Confidence associated with the JEV risk score.
   */
  confidence: number;

  // ---------------------------------------------------------------
  // Boolean convenience values
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
  // Raw JEV signal probabilities
  // ---------------------------------------------------------------

  /**
   * Suspicious or artificial urgency.
   */
  urgencyProbability: number;

  /**
   * Request for payment, transfer, deposit, or money.
   */
  financialRequestProbability: number;

  /**
   * Request for OTP, password, PIN, MPIN, CVV,
   * login credentials, or similar sensitive data.
   */
  sensitiveInformationProbability: number;

  /**
   * Evidence of deceptive impersonation.
   */
  impersonationProbability: number;

  /**
   * Probability that the message contains or encourages
   * use of a suspicious/deceptive link.
   */
  suspiciousLinkProbability: number;

  /**
   * Probability that the message uses suspicious
   * threats or fear tactics.
   */
  threatProbability: number;

  /**
   * Probability that the message contains an unexpected
   * prize, reward, giveaway, or unrealistic opportunity.
   */
  rewardProbability: number;

  /**
   * Probability that the message unexpectedly redirects
   * payment to a new account or payment destination.
   */
  paymentChangeProbability: number;
}

// ---------------------------------------------------------------------
// OpenAI warning sign
// ---------------------------------------------------------------------

export interface ScamWarningSign {
  title: string;

  explanation: string;
}

// ---------------------------------------------------------------------
// OpenAI explanation
// ---------------------------------------------------------------------

export interface ScamExplanation {
  /**
   * Short explanation of the overall result.
   */
  summary: string;

  /**
   * Individual warning signs detected in the message.
   */
  warningSigns: ScamWarningSign[];

  /**
   * Practical actions the user should take next.
   */
  recommendedActions: string[];
}

// ---------------------------------------------------------------------
// Image extraction
// ---------------------------------------------------------------------

export type ImageReadability =
  | "clear"
  | "unclear";

export interface ImageExtractionResult {
  /**
   * Text OpenAI extracted from the uploaded screenshot.
   */
  extractedText: string;

  /**
   * Whether OpenAI could reliably read the image.
   */
  readability: ImageReadability;

  /**
   * Optional detected language.
   */
  language?: string;

  /**
   * Optional source classification such as:
   * SMS screenshot, Messenger screenshot, email, etc.
   */
  sourceType?: string;
}

// ---------------------------------------------------------------------
// Final ScamShield API result
// ---------------------------------------------------------------------

export interface AnalysisResult {
  /**
   * ScamShield's final concern decision.
   *
   * Determined by deriveConcernLevel(),
   * NOT by OpenAI.
   */
  concernLevel: ConcernLevel;

  /**
   * Main category identified by JEV.
   */
  category: ScamCategory;

  /**
   * JEV's supporting risk score.
   */
  riskScore: number;

  /**
   * Cleaned text that was actually analyzed.
   */
  extractedText: string;

  /**
   * Complete structured result returned by JEV.
   */
  jev: JevResult;

  /**
   * Human-readable explanation generated by OpenAI
   * or by the fallback explanation system.
   */
  explanation: ScamExplanation;

  /**
   * True when OpenAI explanation generation failed
   * and ScamShield used predefined fallback guidance.
   */
  usedFallbackExplanation: boolean;
}