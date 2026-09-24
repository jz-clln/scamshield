// File: src/lib/concern-level.ts

import {
  ConcernLevel,
  JevResult,
} from "@/types/analysis";

/**
 * ScamShield decision engine.
 *
 * IMPORTANT:
 * JEV identifies the signals.
 * ScamShield determines the final concern level.
 * OpenAI explains the result afterward.
 *
 * riskScore is supporting evidence only.
 */
export function deriveConcernLevel(
  result: JevResult
): ConcernLevel {
  const {
    category,

    scamProbability,
    riskScore,
    confidence,

    urgencyProbability,
    financialRequestProbability,
    sensitiveInformationProbability,
    impersonationProbability,
    suspiciousLinkProbability,
    threatProbability,
    rewardProbability,
    paymentChangeProbability,
  } = result;

  // ---------------------------------------------------------------
  // Strong signal thresholds
  // ---------------------------------------------------------------

  const strongUrgency =
    urgencyProbability >= 0.7;

  const strongFinancialRequest =
    financialRequestProbability >= 0.7;

  const strongCredentialRequest =
    sensitiveInformationProbability >= 0.7;

  const strongImpersonation =
    impersonationProbability >= 0.7;

  const strongSuspiciousLink =
    suspiciousLinkProbability >= 0.7;

  const strongThreat =
    threatProbability >= 0.7;

  const strongReward =
    rewardProbability >= 0.7;

  const strongPaymentChange =
    paymentChangeProbability >= 0.7;

  // ---------------------------------------------------------------
  // HIGH-CONCERN PATTERNS
  // ---------------------------------------------------------------

  /**
   * Credential phishing.
   *
   * Example:
   * "Your account is blocked. Click here and enter your OTP."
   */
  const credentialPhishing =
    strongCredentialRequest &&
    (
      strongSuspiciousLink ||
      strongImpersonation ||
      strongThreat
    );

  if (credentialPhishing) {
    return "high";
  }

  /**
   * Advance-fee / fake prize.
   *
   * Example:
   * "You won ₱50,000. Pay ₱1,000 to claim it."
   */
  const advanceFeePattern =
    strongReward &&
    strongFinancialRequest;

  if (advanceFeePattern) {
    return "high";
  }

  /**
   * Payment redirection.
   *
   * Especially important for MSMEs.
   *
   * Example:
   * "We changed our bank account.
   * Send your payment to this new GCash immediately."
   */
  const paymentRedirectionPattern =
    strongPaymentChange &&
    strongFinancialRequest &&
    (
      strongUrgency ||
      strongImpersonation
    );

  if (paymentRedirectionPattern) {
    return "high";
  }

  /**
   * Threat + money/credentials.
   */
  const coerciveThreatPattern =
    strongThreat &&
    (
      strongCredentialRequest ||
      (
        strongFinancialRequest &&
        strongUrgency
      )
    );

  if (coerciveThreatPattern) {
    return "high";
  }

  /**
   * Deceptive impersonation involving money or credentials.
   */
  const impersonationPattern =
    strongImpersonation &&
    (
      strongCredentialRequest ||
      (
        strongFinancialRequest &&
        strongUrgency
      )
    );

  if (impersonationPattern) {
    return "high";
  }

  /**
   * JEV strongly believes this is a scam AND
   * there is supporting evidence.
   *
   * We never use scamProbability alone.
   */
  const strongSupportingSignals = [
    strongCredentialRequest,
    strongImpersonation,
    strongSuspiciousLink,
    strongThreat,
    strongReward,
    strongPaymentChange,
  ].filter(Boolean).length;

  if (
    scamProbability >= 0.85 &&
    strongSupportingSignals >= 2
  ) {
    return "high";
  }

  /**
   * Very high scam probability with a high risk score.
   *
   * Requires both measurements rather than one.
   */
  if (
    scamProbability >= 0.9 &&
    riskScore >= 3 &&
    confidence >= 0.6
  ) {
    return "high";
  }

  // ---------------------------------------------------------------
  // LOW-CONCERN PATTERNS
  // ---------------------------------------------------------------

  /**
   * JEV explicitly sees this as legitimate,
   * scam likelihood is low, and no major high-risk
   * indicators exist.
   */
  const majorSignalPresent =
    strongCredentialRequest ||
    strongImpersonation ||
    strongSuspiciousLink ||
    strongThreat ||
    strongReward ||
    strongPaymentChange;

  if (
    category === "legitimate" &&
    scamProbability <= 0.3 &&
    !majorSignalPresent
  ) {
    return "low";
  }

  /**
   * Very low scam probability and no meaningful
   * deceptive signals.
   *
   * A financial request or normal deadline by itself
   * does not push the message into verification.
   */
  if (
    scamProbability <= 0.25 &&
    !majorSignalPresent
  ) {
    return "low";
  }

  // ---------------------------------------------------------------
  // NEEDS VERIFICATION
  // ---------------------------------------------------------------

  /**
   * The model sees a meaningful possibility of scam behavior.
   */
  if (scamProbability >= 0.45) {
    return "needs_verification";
  }

  /**
   * A credential request is concerning even when JEV
   * is uncertain about the overall scam classification.
   */
  if (
    sensitiveInformationProbability >= 0.5
  ) {
    return "needs_verification";
  }

  /**
   * Payment destination changes deserve independent verification.
   */
  if (
    paymentChangeProbability >= 0.5 &&
    financialRequestProbability >= 0.5
  ) {
    return "needs_verification";
  }

  /**
   * Suspicious link combined with pressure or identity claims.
   */
  if (
    suspiciousLinkProbability >= 0.5 &&
    (
      urgencyProbability >= 0.5 ||
      impersonationProbability >= 0.5 ||
      threatProbability >= 0.5
    )
  ) {
    return "needs_verification";
  }

  /**
   * Multiple medium-strength suspicious signals.
   */
  const mediumSupportingSignals = [
    sensitiveInformationProbability >= 0.5,
    impersonationProbability >= 0.5,
    suspiciousLinkProbability >= 0.5,
    threatProbability >= 0.5,
    rewardProbability >= 0.5,
    paymentChangeProbability >= 0.5,
  ].filter(Boolean).length;

  if (mediumSupportingSignals >= 2) {
    return "needs_verification";
  }

  /**
   * Unknown messages should not automatically be declared safe
   * when JEV has some uncertainty.
   */
  if (
    category === "unknown" &&
    (
      scamProbability >= 0.3 ||
      riskScore >= 1.5
    )
  ) {
    return "needs_verification";
  }

  // ---------------------------------------------------------------
  // DEFAULT
  // ---------------------------------------------------------------

  return "low";
}

export interface ConcernLevelMeta {
  label: string;
  description: string;
  colorClass: string;
  bgClass: string;
  dotClass: string;
}

export const CONCERN_LEVEL_META: Record<
  ConcernLevel,
  ConcernLevelMeta
> = {
  low: {
    label: "Low Concern",

    description:
      "Few meaningful scam indicators were detected. This does not guarantee that the message or sender is legitimate.",

    colorClass: "text-ligtas",

    bgClass: "bg-ligtas-light",

    dotClass: "bg-ligtas",
  },

  needs_verification: {
    label: "Needs Verification",

    description:
      "The message contains uncertain or suspicious indicators. Verify the sender or request before taking action.",

    colorClass: "text-alerto",

    bgClass: "bg-alerto-light",

    dotClass: "bg-alerto",
  },

  high: {
    label: "High Concern",

    description:
      "The message contains strong combinations of warning signs commonly associated with scams. Do not act until the request has been independently verified.",

    colorClass: "text-peligro",

    bgClass: "bg-peligro-light",

    dotClass: "bg-peligro",
  },
};

export const FALLBACK_RECOMMENDATIONS: Record<
  ConcernLevel,
  string[]
> = {
  low: [
    "Continue to stay alert for unexpected requests for money, credentials, or personal information.",

    "Verify the sender through an official channel if any part of the message seems unusual.",
  ],

  needs_verification: [
    "Do not act on the message until you have verified the request.",

    "Contact the sender using contact details you already trust, not contact information provided only in the suspicious message.",

    "Do not share passwords, OTPs, MPINs, PINs, or authentication codes.",

    "Verify payment instructions before sending money.",
  ],

  high: [
    "Do not send money or provide sensitive information yet.",

    "Do not provide passwords, OTPs, MPINs, PINs, CVVs, or login credentials.",

    "Avoid using links or contact details contained in the suspicious message.",

    "Contact the organization or person through a previously verified channel.",

    "Independently verify any new payment account or payment destination before transferring funds.",
  ],
};