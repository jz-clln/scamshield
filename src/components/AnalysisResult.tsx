import { AnalysisResult as AnalysisResultType, ScamCategory } from "@/types/analysis";
import { ConcernBadge } from "./ConcernBadge";
import { WarningSigns } from "./WarningSigns";
import { RecommendationCard } from "./RecommendationCard";
import { RiskGauge } from "./RiskGauge";
import { Icon } from "./Icon";

const CATEGORY_LABELS: Record<ScamCategory, string> = {
  phishing: "Phishing",
  financial_fraud: "Financial Fraud",
  impersonation: "Impersonation",
  prize_scam: "Prize Scam",
  delivery_scam: "Delivery Scam",
  job_scam: "Job Scam",
  investment_scam: "Investment Scam",
  marketplace_scam: "Marketplace Scam",
  account_threat: "Account Threat",
  legitimate: "Likely Legitimate",
  unknown: "Unknown Category",
};

export function AnalysisResult({ result }: { result: AnalysisResultType }) {
  return (
    <div className="result-grid">
      <section className={`risk-card enter-up risk-${result.concernLevel}`} aria-label="Risk overview">
        <div className="risk-card-top"><span className="eyebrow">THE BIG PICTURE</span><Icon name="shield" /></div>
        <RiskGauge probability={result.jev.scamProbability} level={result.concernLevel} />
        <div className="risk-badge"><ConcernBadge level={result.concernLevel} /></div>
        <div className="risk-metrics">
          <div><span>Risk score</span><strong>{result.riskScore.toFixed(2)} <small>/ 4</small></strong><div className="score-segments" aria-hidden="true">{[1, 2, 3, 4].map(n => <i key={n} className={result.riskScore >= n - 0.5 ? "filled" : ""} />)}</div></div>
          <div><span>Model confidence</span><strong>{result.jev.confidence == null ? "—" : `${Math.round(result.jev.confidence * 100)}%`}</strong><small>In the risk score</small></div>
        </div>
        <div className={`urgency-row ${result.jev.urgency ? "urgency-detected" : ""}`}><Icon name="clock" /><div><span>Urgency tactics</span><strong>{result.jev.urgency ? "Detected" : "Not detected"}</strong></div>{result.jev.urgencyProbability != null && <span className="urgency-percent">{Math.round(result.jev.urgencyProbability * 100)}%<small>likelihood</small></span>}</div>
        <p className="estimate-note">Likelihood is an AI estimate, not proof. Confidence describes certainty in the risk score, not the chance of a scam.</p>
        {result.jev.scamProbability == null && <p className="estimate-note">Likelihood and confidence are unavailable for demo or older results. Run a new analysis with JEV to see them.</p>}
      </section>
      <div className="result-details enter-up delay-one">
        <section className="result-summary"><span className="eyebrow">WHAT WE FOUND</span><h1>{CATEGORY_LABELS[result.category] ?? "Message analysis"}</h1><p>{result.explanation.summary}</p>{result.usedFallbackExplanation && <p className="fallback-note">The detailed explanation is unavailable. Your risk analysis is complete; general guidance is shown below.</p>}</section>
        <WarningSigns signs={result.explanation.warningSigns} />
        <RecommendationCard actions={result.explanation.recommendedActions} />
        <details className="message-disclosure"><summary><span><Icon name="text" /> Your original message</span><span className="disclosure-plus" aria-hidden="true">+</span></summary><p>{result.extractedText}</p></details>
      </div>
    </div>
  );
}
