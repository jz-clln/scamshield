import { WarningSign } from "@/types/analysis";

export function WarningSigns({ signs }: { signs: WarningSign[] }) {
  if (signs.length === 0) return null;

  return (
    <div>
      <h2 className="font-display font-semibold text-gabi mb-3">
        Why ScamShield flagged this
      </h2>
      <ul className="space-y-3">
        {signs.map((sign, i) => (
          <li key={i} className="rounded-lg border border-dagat/10 bg-white p-4">
            <p className="font-medium text-gabi">{sign.title}</p>
            <p className="text-sm text-gabi/65 mt-1">{sign.explanation}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}
