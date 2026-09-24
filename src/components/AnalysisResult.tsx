import { AnalysisResult as AnalysisResultType, ScamCategory } from "@/types/analysis";
import { ConcernBadge } from "./ConcernBadge";
import { WarningSigns } from "./WarningSigns";
import { RecommendationCard } from "./RecommendationCard";

const CATEGORY_LABELS: Record<ScamCategory, string> = {
  phishing: "Phishing",
  payment_request: "Suspicious Payment Request",
  impersonation: "Impersonation",
  fake_reward: "Fake Reward",
  account_threat: "Account Threat",
  job_scam: "Job Scam",
  investment_scam: "Investment Scam",
  marketplace_scam: "Marketplace Scam",
  suspicious_link: "Suspicious Link",
  other: "Other",
  unclear: "Unclear",
  none: "No Category Detected",
};

export function AnalysisResult({ result }: { result: AnalysisResultType }) {
  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <ConcernBadge level={result.concernLevel} />
        <h1 className="font-display text-2xl font-semibold text-gabi">
          {CATEGORY_LABELS[result.category]}
        </h1>
        <p className="text-gabi/70">{result.explanation.summary}</p>
      </div>

      <WarningSigns signs={result.explanation.warningSigns} />

      <RecommendationCard actions={result.explanation.recommendedActions} />

      <p className="text-xs text-gabi/45 border-t border-dagat/10 pt-4">
        ScamShield identifies warning signs. It does not independently confirm
        whether the sender is fraudulent.
      </p>
    </div>
  );
}
