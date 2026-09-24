import { ConcernLevel } from "@/types/analysis";
import { CONCERN_LEVEL_META } from "@/lib/concern-level";

export function ConcernBadge({ level }: { level: ConcernLevel }) {
  const meta = CONCERN_LEVEL_META[level];

  return (
    <div className={`inline-flex items-center gap-2 rounded-full px-4 py-2 ${meta.bgClass}`}>
      <span className={`h-2 w-2 rounded-full ${meta.dotClass}`} />
      <span className={`font-display font-semibold ${meta.colorClass}`}>
        {meta.label}
      </span>
    </div>
  );
}
