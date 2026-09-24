import { Icon } from "./Icon";

export function RecommendationCard({ actions }: { actions: string[] }) {
  if (actions.length === 0) return null;

  return (
    <section className="recommendation-card">
      <span className="eyebrow"><Icon name="shield" width="16" height="16" /> MOVE FORWARD WITH CARE</span>
      <h2>Your next steps</h2>
      <ol>
        {actions.map((action, i) => (
          <li key={i}>
            <span className="action-number">{i + 1}</span>
            <span>{action}</span>
          </li>
        ))}
      </ol>
    </section>
  );
}
