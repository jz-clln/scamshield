import { ConcernLevel } from "@/types/analysis";

// Spec section 10 — risk score to concern level thresholds.
export function scoreToConcernLevel(score: number): ConcernLevel {
  if (score >= 2.0) return "high";
  if (score >= 1.0) return "needs_verification";
  return "low";
}

export interface ConcernLevelMeta {
  label: string;
  description: string;
  colorClass: string; // text color
  bgClass: string; // background wash
  dotClass: string; // solid indicator dot
}

// Note: class names below are written out in full (never built at runtime
// via string concatenation/.replace()) so Tailwind's JIT scanner can find
// and generate them.
export const CONCERN_LEVEL_META: Record<ConcernLevel, ConcernLevelMeta> = {
  low: {
    label: "Low Concern",
    description:
      "Few clear warning signs were detected. This does not mean the message is guaranteed to be safe.",
    colorClass: "text-ligtas",
    bgClass: "bg-ligtas-light",
    dotClass: "bg-ligtas",
  },
  needs_verification: {
    label: "Needs Verification",
    description:
      "This message contains warning signs that should be checked before you respond or take action.",
    colorClass: "text-alerto",
    bgClass: "bg-alerto-light",
    dotClass: "bg-alerto",
  },
  high: {
    label: "High Concern",
    description:
      "This message contains several warning signs commonly associated with scams.",
    colorClass: "text-peligro",
    bgClass: "bg-peligro-light",
    dotClass: "bg-peligro",
  },
};

// Predefined, safe fallback recommendations used when the final OpenAI
// explanation step fails (spec section 23/24) — the app must still be
// able to show something useful.
export const FALLBACK_RECOMMENDATIONS: Record<ConcernLevel, string[]> = {
  low: [
    "Stay alert for urgent requests for money or personal information.",
    "Verify the sender through an official channel if anything feels off.",
  ],
  needs_verification: [
    "Do not act on the message yet.",
    "Verify the sender using contact details you already trust, not ones in the message.",
    "Do not share passwords, OTPs, or PINs.",
  ],
  high: [
    "Do not send money or share information yet.",
    "Contact the sender using a previously verified channel.",
    "Do not open any links in the message.",
    "Do not share OTPs, passwords, or PINs.",
  ],
};
