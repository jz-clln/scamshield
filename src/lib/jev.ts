// File: src/lib/jev.ts

import { JevResult, ScamCategory } from "@/types/analysis";

const SYSTEMONE_ENDPOINT = "https://api.typesafe.ai/v1/systemone";
const DEFAULT_MODEL = "jev-latest";

/**
 * Do not treat 0.50 as a magical line between false and true.
 *
 * We keep the raw probabilities in JevResult and only use this threshold
 * for convenience booleans displayed elsewhere in the app.
 */
const NOUL_THRESHOLD = 0.6;

const RETRYABLE_STATUSES = new Set([429, 529]);
const MAX_RETRIES = 2;

/**
 * One category taxonomy is used by BOTH:
 * 1. Real JEV
 * 2. Local fallback
 *
 * This fixes the previous mismatch where live JEV returned categories such
 * as "financial_fraud" while the fallback returned "payment_request".
 */
const CATEGORY_CRITERIA: Record<ScamCategory, string> = {
  phishing:
    "Attempts to steal passwords, OTPs, MPINs, login credentials, card information, or other sensitive account information through deceptive messages, links, or websites.",

  financial_fraud:
    "Uses deception to trick the recipient into sending money, transferring funds, paying fake fees, or sending money to an unauthorized payment destination.",

  impersonation:
    "Deceptively pretends to be a trusted person, business, bank, government agency, employer, supplier, or organization in order to influence the recipient.",

  prize_scam:
    "Claims the recipient won an unexpected prize, lottery, giveaway, reward, or benefit and uses the claim to request money, credentials, or personal information.",

  delivery_scam:
    "Uses deceptive parcel, courier, shipment, or delivery claims to request money, credentials, personal information, or suspicious link visits.",

  job_scam:
    "Uses a fake or deceptive employment opportunity, online task, recruitment process, or job offer to obtain money or sensitive information.",

  investment_scam:
    "Promises suspicious, guaranteed, unrealistic, or unusually high financial returns in order to obtain money or financial information.",

  marketplace_scam:
    "Uses deceptive buyer, seller, payment, refund, or marketplace claims to obtain money, credentials, goods, or sensitive information.",

  account_threat:
    "Threatens account suspension, closure, penalties, loss of access, or similar consequences as part of a deceptive attempt to pressure the recipient.",

  legitimate:
    "An ordinary message with no meaningful evidence of deception. Normal bills, payment reminders, delivery updates, appointments, business requests, and deadlines may be legitimate when they do not contain deceptive indicators.",

  unknown:
    "There is not enough information in the message to reasonably determine whether it represents a scam or an ordinary communication.",
};

/**
 * risk_score is now a supporting signal.
 *
 * It is NOT used by itself to determine the final ScamShield concern level.
 */
const RISK_SCORE_LEVELS = [
  "0 - No meaningful evidence of scam behavior. The message appears ordinary or contains only routine communication.",
  "1 - Minor uncertainty or weak suspicious indicators, but there is not enough evidence of deception.",
  "2 - Multiple suspicious indicators or a potentially deceptive request that should be independently verified.",
  "3 - Strong evidence of deceptive behavior such as credential theft, payment redirection, impersonation combined with requests, or coercive threats.",
  "4 - Very strong evidence of an attempted scam, such as explicit credential theft, deceptive financial transfer instructions, advance-fee fraud, or several strong scam tactics combined.",
];

export class JevError extends Error {
  constructor(
    message: string,
    public readonly status = 502
  ) {
    super(message);
    this.name = "JevError";
  }
}

interface SystemOneRequest {
  state: string;
  model: string;
  questions: Record<string, unknown>;
}

interface ChoiceAnswer {
  type: "choice";
  choice: string;
  probabilities: Record<string, number>;
  confidence: number;
}

interface NoulAnswer {
  type: "noul";
  noul: number;
}

interface ScoreAnswer {
  type: "score";
  score: number;
  legend: Record<string, string>;
  probabilities: Record<string, number>;
  confidence: number;
}

interface SystemOneResponse {
  model: string;

  answers: {
    scam_category: ChoiceAnswer;

    scam_likelihood: NoulAnswer;

    urgency_flag: NoulAnswer;

    financial_request: NoulAnswer;

    sensitive_information: NoulAnswer;

    impersonation: NoulAnswer;

    suspicious_link: NoulAnswer;

    threat: NoulAnswer;

    reward: NoulAnswer;

    payment_change: NoulAnswer;

    risk_score: ScoreAnswer;
  };

  usage?: {
    input_tokens: number;
    output_tokens: number;
  };
}

/**
 * Main JEV analysis entry point.
 */
export async function analyzeMessage(text: string): Promise<JevResult> {
  const cleanedText = text.trim();

  if (!cleanedText) {
    throw new JevError("Message text is required.", 400);
  }

  const apiKey = process.env.JEV_API_KEY?.trim();

  const endpoint =
    process.env.JEV_API_URL?.trim() || SYSTEMONE_ENDPOINT;

  /**
   * Keep the app demoable when JEV credentials are not configured.
   *
   * This fallback is intentionally conservative.
   */
  if (!apiKey) {
    if (
      process.env.JEV_API_URL?.trim() ||
      process.env.JEV_MODEL?.trim()
    ) {
      throw new JevError(
        "JEV_API_KEY is missing. Configure it on the server and restart the app.",
        503
      );
    }

    return heuristicJev(cleanedText);
  }

  validateEndpoint(endpoint);

  const requestBody: SystemOneRequest = {
    state: cleanedText,

    model:
      process.env.JEV_MODEL?.trim() ||
      DEFAULT_MODEL,

    questions: {
      scam_category: {
        type: "choice",

        instructions:
          "Classify the message according to its primary behavior. " +
          "Do not classify a message as a scam merely because it contains a payment request, deadline, company name, bank name, link, or unusual spelling. " +
          "Look for actual evidence of deception, credential theft, fraudulent financial requests, deceptive impersonation, fake rewards, or manipulative threats. " +
          "Use legitimate for ordinary communications without meaningful scam evidence. " +
          "Use unknown when the available message does not provide enough evidence to reasonably classify it.",

        criteria: CATEGORY_CRITERIA,
      },

      scam_likelihood: {
        type: "noul",

        instructions:
          "Based only on evidence contained in the message, is this likely an attempt to scam or deceive the recipient? " +
          "Consider credential theft, fraudulent payment requests, deceptive impersonation, fake rewards, payment redirection, suspicious links combined with deceptive requests, and coercive threats. " +
          "A normal payment request, routine deadline, sender identifying themselves as a company, unfamiliar sender, ordinary link, or spelling mistake alone is NOT enough. " +
          "Do not assume facts that are not present in the message.",
      },

      urgency_flag: {
        type: "noul",

        instructions:
          "Does the message use suspicious or artificial urgency to pressure the recipient into acting before they can reasonably verify the request? " +
          "Examples include immediate payment demands, extremely short artificial deadlines, threats designed to force action, or repeated pressure to act now. " +
          "A normal due date, appointment time, delivery window, or routine deadline alone should not count.",
      },

      financial_request: {
        type: "noul",

        instructions:
          "Does the message request money, payment, transfer, deposit, fee, gift card purchase, cryptocurrency payment, or another financial transaction? " +
          "This question only identifies whether a financial request exists. " +
          "A financial request is NOT automatically a scam.",
      },

      sensitive_information: {
        type: "noul",

        instructions:
          "Does the message request high-risk sensitive information such as an OTP, password, MPIN, PIN, CVV, card number, account login credentials, authentication code, or similar security credential? " +
          "Do not mark ordinary non-sensitive information requests as credential theft.",
      },

      impersonation: {
        type: "noul",

        instructions:
          "Does the message show evidence of potentially deceptive impersonation? " +
          "Look for someone claiming a trusted identity while making unusual payment requests, requesting credentials, sending suspicious links, applying threats, or otherwise attempting to exploit that identity. " +
          "Do NOT mark this true merely because the sender says they represent a business, bank, government agency, employer, courier, supplier, or organization.",
      },

      suspicious_link: {
        type: "noul",

        instructions:
          "Does the message contain or encourage use of a potentially deceptive or suspicious link? " +
          "Consider unusual domains, shortened URLs, lookalike domains, links used for credential requests, or links connected to suspicious payment or account claims. " +
          "Do NOT mark this true merely because the message contains a normal web link.",
      },

      threat: {
        type: "noul",

        instructions:
          "Does the message use a suspicious threat or fear tactic to pressure the recipient? " +
          "Examples include fraudulent account suspension threats, invented penalties, arrest threats, loss-of-money threats, or immediate cancellation used to force action. " +
          "Routine notices about genuine deadlines or policies alone should not count.",
      },

      reward: {
        type: "noul",

        instructions:
          "Does the message promise an unexpected or suspicious prize, giveaway, lottery win, financial reward, unusually high income opportunity, or unrealistic investment return? " +
          "Do not mark normal discounts, confirmed promotions, or ordinary rewards as suspicious without additional evidence.",
      },

      payment_change: {
        type: "noul",

        instructions:
          "Does the message unexpectedly request payment to a new or different bank account, e-wallet number, payment destination, cryptocurrency wallet, or payment method? " +
          "Focus on changes or redirections in payment instructions rather than ordinary payment requests.",
      },

      risk_score: {
        type: "score",

        instructions:
          "Assess the overall strength of scam indicators in the message. " +
          "Use combinations of evidence rather than counting ordinary features. " +
          "Normal payments, deadlines, links, business names, or account notifications alone should remain low risk. " +
          "Increase the score when evidence shows credential theft, deceptive impersonation, fraudulent payment redirection, fake rewards requiring payment, suspicious links combined with credential requests, coercive threats, or several deceptive behaviors together.",

        criteria: RISK_SCORE_LEVELS,
      },
    },
  };

  const data = await callSystemOne(
    endpoint,
    apiKey,
    requestBody
  );

  return toJevResult(data);
}

/**
 * Validate URL before using it.
 */
function validateEndpoint(endpoint: string): void {
  try {
    const url = new URL(endpoint);

    if (
      !["https:", "http:"].includes(url.protocol) ||
      url.username ||
      url.password
    ) {
      throw new Error();
    }
  } catch {
    throw new JevError(
      "JEV_API_URL must be a valid HTTP or HTTPS endpoint.",
      503
    );
  }
}

/**
 * Call TypeSafe systemOne.
 */
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
    if (
      error instanceof Error &&
      ["TimeoutError", "AbortError"].includes(error.name)
    ) {
      throw new JevError(
        "JEV took too long to respond. Please try again.",
        504
      );
    }

    throw new JevError(
      "Could not connect to JEV. Check the server connection and JEV_API_URL."
    );
  }

  if (response.ok) {
    try {
      return (await response.json()) as SystemOneResponse;
    } catch {
      throw new JevError(
        "JEV returned invalid JSON. Check that JEV_API_URL is the evaluation endpoint."
      );
    }
  }

  /**
   * Retry rate-limit / overload responses.
   */
  if (
    RETRYABLE_STATUSES.has(response.status) &&
    attempt < MAX_RETRIES
  ) {
    await response.body?.cancel();

    const delayMs = 500 * 2 ** attempt;

    await new Promise((resolve) =>
      setTimeout(resolve, delayMs)
    );

    return callSystemOne(
      endpoint,
      apiKey,
      body,
      attempt + 1
    );
  }

  await response.body?.cancel();

  const messages: Record<number, string> = {
    400:
      "JEV rejected the analysis request (400). Check the model and question schema.",

    401:
      "JEV authentication failed (401). Check JEV_API_KEY on the server.",

    403:
      "JEV denied access (403). Check the API key's permissions and model access.",

    404:
      "JEV endpoint or model was not found (404). Check JEV_API_URL and JEV_MODEL.",

    422:
      "JEV rejected the analysis request (422). Check the model and question schema.",

    429:
      "JEV rate or quota limit reached (429). Check your quota or try again later.",

    529:
      "JEV is temporarily overloaded (529). Please try again later.",
  };

  throw new JevError(
    messages[response.status] ??
      `JEV request failed (${response.status}). Please try again later.`,

    RETRYABLE_STATUSES.has(response.status)
      ? 503
      : 502
  );
}

/**
 * Convert raw SystemOne data into our normalized application format.
 */
function toJevResult(
  data: SystemOneResponse
): JevResult {
  const answers = data?.answers;

  if (!answers) {
    throw new JevError(
      "JEV returned an invalid response."
    );
  }

  validateChoiceAnswer(
    "scam_category",
    answers.scam_category
  );

  validateScoreAnswer(
    "risk_score",
    answers.risk_score
  );

  const noulKeys = [
    "scam_likelihood",
    "urgency_flag",
    "financial_request",
    "sensitive_information",
    "impersonation",
    "suspicious_link",
    "threat",
    "reward",
    "payment_change",
  ] as const;

  for (const key of noulKeys) {
    validateNoulAnswer(
      key,
      answers[key]
    );
  }

  const category =
    answers.scam_category.choice as ScamCategory;

  if (
    !Object.prototype.hasOwnProperty.call(
      CATEGORY_CRITERIA,
      category
    )
  ) {
    throw new JevError(
      `JEV returned an unsupported category: ${category}`
    );
  }

  return {
    category,

    categoryConfidence:
      answers.scam_category.confidence,

    scamProbability:
      answers.scam_likelihood.noul,

    riskScore:
      answers.risk_score.score,

    confidence:
      answers.risk_score.confidence,

    urgency:
      answers.urgency_flag.noul >=
      NOUL_THRESHOLD,

    urgencyProbability:
      answers.urgency_flag.noul,

    financialRequest:
      answers.financial_request.noul >=
      NOUL_THRESHOLD,

    financialRequestProbability:
      answers.financial_request.noul,

    sensitiveInformation:
      answers.sensitive_information.noul >=
      NOUL_THRESHOLD,

    sensitiveInformationProbability:
      answers.sensitive_information.noul,

    impersonation:
      answers.impersonation.noul >=
      NOUL_THRESHOLD,

    impersonationProbability:
      answers.impersonation.noul,

    suspiciousLink:
      answers.suspicious_link.noul >=
      NOUL_THRESHOLD,

    suspiciousLinkProbability:
      answers.suspicious_link.noul,

    threat:
      answers.threat.noul >=
      NOUL_THRESHOLD,

    threatProbability:
      answers.threat.noul,

    reward:
      answers.reward.noul >=
      NOUL_THRESHOLD,

    rewardProbability:
      answers.reward.noul,

    paymentChange:
      answers.payment_change.noul >=
      NOUL_THRESHOLD,

    paymentChangeProbability:
      answers.payment_change.noul,
  };
}

function validateChoiceAnswer(
  name: string,
  answer: ChoiceAnswer | undefined
): void {
  if (
    !answer ||
    answer.type !== "choice" ||
    typeof answer.choice !== "string" ||
    !Number.isFinite(answer.confidence) ||
    answer.confidence < 0 ||
    answer.confidence > 1
  ) {
    throw new JevError(
      `JEV returned an invalid answer for ${name}.`
    );
  }
}

function validateNoulAnswer(
  name: string,
  answer: NoulAnswer | undefined
): void {
  if (
    !answer ||
    answer.type !== "noul" ||
    !Number.isFinite(answer.noul) ||
    answer.noul < 0 ||
    answer.noul > 1
  ) {
    throw new JevError(
      `JEV returned an invalid answer for ${name}.`
    );
  }
}

function validateScoreAnswer(
  name: string,
  answer: ScoreAnswer | undefined
): void {
  if (
    !answer ||
    answer.type !== "score" ||
    !Number.isFinite(answer.score) ||
    answer.score < 0 ||
    answer.score > 4 ||
    !Number.isFinite(answer.confidence) ||
    answer.confidence < 0 ||
    answer.confidence > 1
  ) {
    throw new JevError(
      `JEV returned an invalid answer for ${name}.`
    );
  }
}

// ---------------------------------------------------------------------
// Local fallback
// ---------------------------------------------------------------------
//
// Used only when JEV_API_KEY is not configured.
//
// This fallback intentionally avoids treating ordinary payment requests
// and ordinary urgency as automatic scams.
// ---------------------------------------------------------------------

const URGENCY_WORDS = [
  "immediately",
  "urgent",
  "act now",
  "right now",
  "within 30 minutes",
  "within 1 hour",
  "within one hour",
  "today only",
  "agad",
  "kaagad",
];

const FINANCIAL_WORDS = [
  "send money",
  "send payment",
  "pay now",
  "payment",
  "deposit",
  "transfer",
  "gcash",
  "maya",
  "paymaya",
  "bank transfer",
  "gift card",
  "crypto",
  "bitcoin",
  "bayad",
  "magbayad",
  "padala",
];

const SENSITIVE_WORDS = [
  "otp",
  "one time password",
  "one-time password",
  "password",
  "mpin",
  "pin",
  "cvv",
  "card number",
  "login credentials",
  "authentication code",
  "verification code",
];

const IMPERSONATION_WORDS = [
  "this is your bank",
  "bank security team",
  "customer support team",
  "official support",
  "government office",
  "bir officer",
  "sss officer",
  "courier support",
  "account manager",
  "your supplier",
  "your boss",
];

const THREAT_WORDS = [
  "account will be suspended",
  "account will be blocked",
  "permanently blocked",
  "legal action",
  "you will be arrested",
  "penalty",
  "account will be closed",
  "lose access",
  "permanently deleted",
];

const REWARD_WORDS = [
  "congratulations",
  "you won",
  "winner",
  "claim your prize",
  "lottery",
  "guaranteed profit",
  "guaranteed return",
  "free iphone",
  "cash prize",
];

const PAYMENT_CHANGE_WORDS = [
  "new gcash",
  "new maya",
  "new bank account",
  "changed our bank account",
  "changed our payment account",
  "different account",
  "new account number",
  "send to this account instead",
  "old account is unavailable",
];

const LINK_PATTERN =
  /\b(?:https?:\/\/|www\.)[^\s]+/i;

function containsAny(
  lower: string,
  words: string[]
): boolean {
  return words.some((word) =>
    lower.includes(word)
  );
}

function booleanProbability(
  value: boolean,
  yesProbability = 0.9,
  noProbability = 0.1
): number {
  return value
    ? yesProbability
    : noProbability;
}

/**
 * Conservative offline fallback.
 *
 * The fallback looks for combinations of suspicious behavior instead
 * of simply counting keywords.
 */
function heuristicJev(
  text: string
): JevResult {
  const lower = text.toLowerCase();

  const urgency =
    containsAny(
      lower,
      URGENCY_WORDS
    );

  const financialRequest =
    containsAny(
      lower,
      FINANCIAL_WORDS
    );

  const sensitiveInformation =
    containsAny(
      lower,
      SENSITIVE_WORDS
    );

  const claimedIdentity =
    containsAny(
      lower,
      IMPERSONATION_WORDS
    );

  const suspiciousLink =
    LINK_PATTERN.test(text) &&
    (
      sensitiveInformation ||
      containsAny(lower, [
        "verify",
        "login",
        "sign in",
        "claim",
        "suspended",
        "blocked",
      ])
    );

  const threat =
    containsAny(
      lower,
      THREAT_WORDS
    );

  const reward =
    containsAny(
      lower,
      REWARD_WORDS
    );

  const paymentChange =
    containsAny(
      lower,
      PAYMENT_CHANGE_WORDS
    );

  /**
   * Claiming to represent a company or organization is NOT
   * automatically impersonation.
   *
   * We only call it deceptive impersonation when it appears with
   * another suspicious request or pressure tactic.
   */
  const impersonation =
    claimedIdentity &&
    (
      sensitiveInformation ||
      suspiciousLink ||
      paymentChange ||
      threat ||
      (
        financialRequest &&
        urgency
      )
    );

  // ---------------------------------------------------------------
  // Strong scam patterns
  // ---------------------------------------------------------------

  const credentialPhishing =
    sensitiveInformation &&
    (
      suspiciousLink ||
      impersonation ||
      threat
    );

  const advanceFeeScam =
    reward &&
    financialRequest;

  const paymentRedirection =
    paymentChange &&
    financialRequest &&
    (
      urgency ||
      impersonation
    );

  const coercivePayment =
    financialRequest &&
    threat &&
    (
      urgency ||
      impersonation
    );

  // ---------------------------------------------------------------
  // Probability estimate used only by the offline fallback.
  // ---------------------------------------------------------------

  let scamProbability = 0.08;

  if (credentialPhishing) {
    scamProbability += 0.78;
  }

  if (advanceFeeScam) {
    scamProbability += 0.75;
  }

  if (paymentRedirection) {
    scamProbability += 0.7;
  }

  if (coercivePayment) {
    scamProbability += 0.55;
  }

  if (
    suspiciousLink &&
    urgency
  ) {
    scamProbability += 0.18;
  }

  if (
    impersonation &&
    financialRequest
  ) {
    scamProbability += 0.2;
  }

  if (
    reward &&
    !financialRequest
  ) {
    scamProbability += 0.18;
  }

  scamProbability =
    clamp01(scamProbability);

  /**
   * Convert fallback probability to a rough 0-4 supporting score.
   *
   * Again, concern level does NOT rely on this alone.
   */
  const riskScore =
    Math.round(
      scamProbability * 4 * 10
    ) / 10;

  const category = pickCategory({
    financialRequest,
    sensitiveInformation,
    impersonation,
    suspiciousLink,
    threat,
    reward,
    paymentChange,
    scamProbability,
  });

  return {
    category,

    categoryConfidence:
      category === "unknown"
        ? 0.4
        : 0.8,

    scamProbability,

    riskScore,

    confidence: 0.65,

    urgency,
    urgencyProbability:
      booleanProbability(urgency),

    financialRequest,
    financialRequestProbability:
      booleanProbability(financialRequest),

    sensitiveInformation,
    sensitiveInformationProbability:
      booleanProbability(
        sensitiveInformation
      ),

    impersonation,
    impersonationProbability:
      booleanProbability(impersonation),

    suspiciousLink,
    suspiciousLinkProbability:
      booleanProbability(suspiciousLink),

    threat,
    threatProbability:
      booleanProbability(threat),

    reward,
    rewardProbability:
      booleanProbability(reward),

    paymentChange,
    paymentChangeProbability:
      booleanProbability(paymentChange),
  };
}

function pickCategory(flags: {
  financialRequest: boolean;
  sensitiveInformation: boolean;
  impersonation: boolean;
  suspiciousLink: boolean;
  threat: boolean;
  reward: boolean;
  paymentChange: boolean;
  scamProbability: number;
}): ScamCategory {
  if (
    flags.sensitiveInformation &&
    flags.suspiciousLink
  ) {
    return "phishing";
  }

  if (
    flags.reward &&
    flags.financialRequest
  ) {
    return "prize_scam";
  }

  if (
    flags.paymentChange &&
    flags.financialRequest
  ) {
    return "financial_fraud";
  }

  if (
    flags.threat &&
    (
      flags.sensitiveInformation ||
      flags.financialRequest ||
      flags.suspiciousLink
    )
  ) {
    return "account_threat";
  }

  if (
    flags.impersonation &&
    (
      flags.financialRequest ||
      flags.sensitiveInformation
    )
  ) {
    return "impersonation";
  }

  if (
    flags.financialRequest &&
    flags.scamProbability >= 0.6
  ) {
    return "financial_fraud";
  }

  if (
    flags.scamProbability < 0.3 &&
    !flags.sensitiveInformation &&
    !flags.paymentChange &&
    !flags.threat
  ) {
    return "legitimate";
  }

  return "unknown";
}

function clamp01(
  value: number
): number {
  return Math.min(
    1,
    Math.max(0, value)
  );
}