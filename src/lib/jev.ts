import { JevResult, ScamCategory } from "@/types/analysis";

// TypeSafe systemOne contract: https://docs.typesafe.ai/api.
// The three primary questions match the Postman rubric. Additional noul
// questions supply the warning signals used by the explanation step.

const SYSTEMONE_ENDPOINT = "https://api.typesafe.ai/v1/systemone";
const DEFAULT_MODEL = "jev-latest";
const NOUL_THRESHOLD = 0.5; // probability >= this counts as "yes"
const RETRYABLE_STATUSES = new Set([429, 529]);
const MAX_RETRIES = 2;

const CATEGORY_CRITERIA = {
  phishing: "Attempts to steal personal information, account credentials, passwords, MPINs, or OTPs through deceptive links, websites, or messages.",
  financial_fraud: "Attempts to trick the recipient into sending money, making fraudulent payments, or transferring funds.",
  impersonation: "Pretends to be a trusted person, company, bank, government agency, or organization to deceive the recipient.",
  prize_scam: "Claims the recipient won a prize, lottery, reward, or giveaway and requests money or personal information to claim it.",
  delivery_scam: "Uses fake package delivery notifications, shipment problems, or courier payment requests to deceive the recipient.",
  job_scam: "Offers fake employment opportunities, suspicious online tasks, or jobs requiring upfront payments.",
  legitimate: "An ordinary message without identifiable scam indicators.",
  unknown: "Insufficient information to determine the primary scam category.",
};

// Five ordered levels produce a probability-weighted score from 0 to 4.
const RISK_SCORE_LEVELS = [
  "0 - No identifiable scam indicators. The message appears ordinary and contains no suspicious requests.",
  "1 - Minor suspicious indicators. The message is somewhat unusual but does not request sensitive information or money.",
  "2 - Moderate scam indicators. The message contains suspicious claims, unfamiliar links, or potentially deceptive requests.",
  "3 - Strong scam indicators. The message combines suspicious links, impersonation, threats, or requests for sensitive information.",
  "4 - Very strong scam indicators. The message explicitly requests account credentials, MPINs, passwords, OTPs, or fraudulent financial transactions through deceptive means.",
];

export class JevError extends Error {
  constructor(message: string, public readonly status = 502) {
    super(message);
    this.name = "JevError";
  }
}

interface SystemOneRequest {
  state: string;
  model: string;
  questions: Record<string, unknown>;
}

interface SystemOneResponse {
  model: string;
  answers: {
    scam_category: { type: "choice"; choice: string; probabilities: Record<string, number>; confidence: number };
    urgency_flag: { type: "noul"; noul: number };
    financial_request: { type: "noul"; noul: number };
    sensitive_information: { type: "noul"; noul: number };
    impersonation: { type: "noul"; noul: number };
    suspicious_link: { type: "noul"; noul: number };
    threat: { type: "noul"; noul: number };
    reward: { type: "noul"; noul: number };
    risk_score: { type: "score"; score: number; legend: Record<string, string>; probabilities: Record<string, number>; confidence: number };
  };
  usage: { input_tokens: number; output_tokens: number };
}

export async function analyzeMessage(text: string): Promise<JevResult> {
  const apiKey = process.env.JEV_API_KEY?.trim();
  const endpoint = process.env.JEV_API_URL?.trim() || SYSTEMONE_ENDPOINT;

  // No key configured — keep the app demoable without live credentials.
  if (!apiKey) {
    if (process.env.JEV_API_URL?.trim() || process.env.JEV_MODEL?.trim()) {
      throw new JevError("JEV_API_KEY is missing. Configure it on the server and restart the app.", 503);
    }
    return heuristicJev(text);
  }

  try {
    const url = new URL(endpoint);
    if (!["https:", "http:"].includes(url.protocol) || url.username || url.password) throw new Error();
  } catch {
    throw new JevError("JEV_API_URL must be a valid HTTP or HTTPS endpoint.", 503);
  }

  const requestBody: SystemOneRequest = {
    state: text,
    model: process.env.JEV_MODEL?.trim() || DEFAULT_MODEL,
    questions: {
      scam_category: {
        type: "choice",
        instructions: "Classify the SMS according to its primary scam tactic. Use the message content, requested actions, impersonation attempts, and suspicious links as evidence. Classify as legitimate or unknown when there is insufficient evidence of a specific scam.",
        criteria: CATEGORY_CRITERIA,
      },
      urgency_flag: {
        type: "noul",
        instructions: "Does the SMS use urgency, artificial deadlines, threats, immediate-action demands, or fear of negative consequences to pressure the recipient into acting quickly? Evaluate the presence of urgency tactics, not whether the message is actually fraudulent.",
      },
      financial_request: {
        type: "noul",
        instructions: "Does the message request money, payment, transfer, deposit, or another financial transaction?",
      },
      sensitive_information: {
        type: "noul",
        instructions:
          "Does the message request sensitive information such as a password, OTP, PIN, login credentials, or card information?",
      },
      impersonation: {
        type: "noul",
        instructions:
          "Does the sender claim to represent another person, company, financial institution, government agency, or organization?",
      },
      suspicious_link: {
        type: "noul",
        instructions: "Does the message contain or encourage the recipient to open a potentially suspicious link?",
      },
      threat: {
        type: "noul",
        instructions:
          "Does the message threaten account suspension, financial loss, penalties, or another negative consequence to pressure the recipient?",
      },
      reward: {
        type: "noul",
        instructions: "Does the message promise an unexpected reward, prize, income opportunity, or investment return?",
      },
      risk_score: {
        type: "score",
        instructions: "Assess the strength of scam indicators present in this SMS. Evaluate suspicious links, credential requests, financial demands, impersonation, threats, and pressure tactics. Use only evidence contained in the message. Do not assume that an urgent or unfamiliar message is automatically fraudulent.",
        criteria: RISK_SCORE_LEVELS,
      },
    },
  };

  const data = await callSystemOne(endpoint, apiKey, requestBody);
  return toJevResult(data);
}

async function callSystemOne(
  endpoint: string,
  apiKey: string,
  body: SystemOneRequest,
  attempt = 0
): Promise<SystemOneResponse> {
  let response: Response;
  try {
    response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(30_000),
      redirect: "error",
      cache: "no-store",
    });
  } catch (error) {
    if (error instanceof Error && ["TimeoutError", "AbortError"].includes(error.name)) {
      throw new JevError("JEV took too long to respond. Please try again.", 504);
    }
    throw new JevError("Could not connect to JEV. Check the server connection and JEV_API_URL.");
  }

  if (response.ok) {
    try {
      return await response.json();
    } catch {
      throw new JevError("JEV returned invalid JSON. Check that JEV_API_URL is the evaluation endpoint.");
    }
  }

  // 429 / 529 — TypeSafe's own docs recommend exponential backoff retries.
  if (RETRYABLE_STATUSES.has(response.status) && attempt < MAX_RETRIES) {
    await response.body?.cancel();
    const delayMs = 500 * 2 ** attempt;
    await new Promise((resolve) => setTimeout(resolve, delayMs));
    return callSystemOne(endpoint, apiKey, body, attempt + 1);
  }

  // Do not expose upstream response bodies: they may echo submitted text or secrets.
  await response.body?.cancel();
  const messages: Record<number, string> = {
    400: "JEV rejected the analysis request (400). Check the model and question schema.",
    401: "JEV authentication failed (401). Check JEV_API_KEY on the server.",
    403: "JEV denied access (403). Check the API key's permissions and model access.",
    404: "JEV endpoint or model was not found (404). Check JEV_API_URL and JEV_MODEL.",
    422: "JEV rejected the analysis request (422). Check the model and question schema.",
    429: "JEV rate or quota limit reached (429). Check your quota or try again later.",
    529: "JEV is temporarily overloaded (529). Please try again later.",
  };
  throw new JevError(messages[response.status] ?? `JEV request failed (${response.status}). Please try again later.`, RETRYABLE_STATUSES.has(response.status) ? 503 : 502);
}

function toJevResult(data: SystemOneResponse): JevResult {
  const a = data?.answers;
  if (!a || a.scam_category?.type !== "choice" ||
      !Object.prototype.hasOwnProperty.call(CATEGORY_CRITERIA, a.scam_category.choice) ||
      a.risk_score?.type !== "score" || !Number.isFinite(a.risk_score.score) ||
      a.risk_score.score < 0 || a.risk_score.score > 4) {
    throw new JevError("JEV returned an invalid category or risk score. Check the endpoint's response schema.");
  }
  for (const key of ["urgency_flag", "financial_request", "sensitive_information", "impersonation", "suspicious_link", "threat", "reward"] as const) {
    const answer = a[key];
    if (answer?.type !== "noul" || !Number.isFinite(answer.noul) || answer.noul < 0 || answer.noul > 1) {
      throw new JevError(`JEV returned an invalid answer for ${key}. Please try again.`);
    }
  }

  return {
    category: a.scam_category.choice as ScamCategory,
    urgency: a.urgency_flag.noul >= NOUL_THRESHOLD,
    financialRequest: a.financial_request.noul >= NOUL_THRESHOLD,
    sensitiveInformation: a.sensitive_information.noul >= NOUL_THRESHOLD,
    impersonation: a.impersonation.noul >= NOUL_THRESHOLD,
    suspiciousLink: a.suspicious_link.noul >= NOUL_THRESHOLD,
    threat: a.threat.noul >= NOUL_THRESHOLD,
    reward: a.reward.noul >= NOUL_THRESHOLD,
    riskScore: a.risk_score.score,
  };
}

// --- Local placeholder heuristic -------------------------------------
// Used only when JEV_API_KEY isn't set, so the app stays demoable
// without live credentials. Not a substitute for the real model above.

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

  let riskScore = flags * 0.45;
  if (financialRequest && urgency) riskScore += 0.5;
  if (sensitiveInformation) riskScore += 0.4;
  riskScore = Math.min(4, Math.round(riskScore * 4 / 3 * 10) / 10);

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
