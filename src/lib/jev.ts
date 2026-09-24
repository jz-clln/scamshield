import { JevResult, ScamCategory } from "@/types/analysis";

// JEV is the structured risk decision engine (spec section 8-9).
// This file is intentionally an abstraction boundary: everything else in
// the app only ever calls `analyzeMessage`. Swap the implementation below
// for a real JEV integration without touching the API route or UI.
//
// TODO: this ships with a local keyword heuristic as a placeholder so the
// full pipeline is demoable end to end. Replace with the real JEV call
// once its API contract is confirmed — set JEV_API_URL / JEV_API_KEY in
// .env.local and this file will call it directly instead.

export async function analyzeMessage(text: string): Promise<JevResult> {
  const apiUrl = process.env.JEV_API_URL;

  if (apiUrl) {
    const response = await fetch(apiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(process.env.JEV_API_KEY
          ? { Authorization: `Bearer ${process.env.JEV_API_KEY}` }
          : {}),
      },
      body: JSON.stringify({ text }),
    });

    if (!response.ok) {
      throw new Error(`JEV request failed with status ${response.status}`);
    }

    return (await response.json()) as JevResult;
  }

  return heuristicJev(text);
}

// --- Local placeholder heuristic -------------------------------------
// Simple keyword scoring standing in for JEV's structured questions.
// Not a substitute for a real model — replace when JEV is ready.

const URGENCY_WORDS = [
  "immediately", "urgent", "now", "today", "expire", "expires",
  "within 24 hours", "within 30 minutes", "act now", "suspend", "agad",
];
const FINANCIAL_WORDS = [
  "gcash", "paymaya", "send money", "deposit", "transfer", "payment",
  "account number", "load", "bayad", "magbayad", "padala",
];
const SENSITIVE_WORDS = [
  "otp", "password", "pin", "cvv", "login", "verify your account",
  "card number", "username",
];
const IMPERSONATION_WORDS = [
  "bank", "official", "government", "bir", "sss", "gsis", "courier",
  "lazada", "shopee", "customer service", "support team",
];
const LINK_PATTERN = /(https?:\/\/|www\.)\S+/i;
const THREAT_WORDS = [
  "suspend", "penalty", "blocked", "legal action", "arrest", "close your account",
];
const REWARD_WORDS = [
  "congratulations", "won", "winner", "prize", "claim your", "free", "reward",
];

function countMatches(lower: string, words: string[]): boolean {
  return words.some((w) => lower.includes(w));
}

function heuristicJev(text: string): JevResult {
  const lower = text.toLowerCase();

  const urgency = countMatches(lower, URGENCY_WORDS);
  const financialRequest = countMatches(lower, FINANCIAL_WORDS);
  const sensitiveInformation = countMatches(lower, SENSITIVE_WORDS);
  const impersonation = countMatches(lower, IMPERSONATION_WORDS);
  const suspiciousLink = LINK_PATTERN.test(text);
  const threat = countMatches(lower, THREAT_WORDS);
  const reward = countMatches(lower, REWARD_WORDS);

  const flags = [
    urgency,
    financialRequest,
    sensitiveInformation,
    impersonation,
    suspiciousLink,
    threat,
    reward,
  ].filter(Boolean).length;

  // Rough 0-3 scale, weighted toward money + sensitive-info requests.
  let riskScore = flags * 0.45;
  if (financialRequest && urgency) riskScore += 0.5;
  if (sensitiveInformation) riskScore += 0.4;
  riskScore = Math.min(3, Math.round(riskScore * 10) / 10);

  const category = pickCategory({
    financialRequest,
    sensitiveInformation,
    impersonation,
    suspiciousLink,
    threat,
    reward,
  });

  return {
    category,
    urgency,
    financialRequest,
    sensitiveInformation,
    impersonation,
    suspiciousLink,
    threat,
    reward,
    riskScore,
  };
}

function pickCategory(flags: {
  financialRequest: boolean;
  sensitiveInformation: boolean;
  impersonation: boolean;
  suspiciousLink: boolean;
  threat: boolean;
  reward: boolean;
}): ScamCategory {
  if (flags.reward && flags.financialRequest) return "fake_reward";
  if (flags.sensitiveInformation && flags.suspiciousLink) return "phishing";
  if (flags.threat) return "account_threat";
  if (flags.impersonation && flags.financialRequest) return "impersonation";
  if (flags.financialRequest) return "payment_request";
  if (flags.suspiciousLink) return "suspicious_link";
  if (
    !flags.financialRequest &&
    !flags.sensitiveInformation &&
    !flags.impersonation &&
    !flags.suspiciousLink &&
    !flags.threat &&
    !flags.reward
  ) {
    return "none";
  }
  return "unclear";
}
