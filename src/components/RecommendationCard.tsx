export function RecommendationCard({ actions }: { actions: string[] }) {
  if (actions.length === 0) return null;

  return (
    <div className="rounded-lg bg-dagat-light/60 p-5">
      <h2 className="font-display font-semibold text-gabi mb-3">
        What you should do
      </h2>
      <ol className="space-y-2">
        {actions.map((action, i) => (
          <li key={i} className="flex gap-3 text-sm text-gabi/80">
            <span className="font-display font-semibold text-dagat shrink-0">
              {i + 1}
            </span>
            <span>{action}</span>
          </li>
        ))}
      </ol>
    </div>
  );
}
