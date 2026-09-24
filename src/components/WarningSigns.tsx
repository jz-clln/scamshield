import { ScamWarningSign } from "@/types/analysis";
import { Icon } from "./Icon";

export function WarningSigns({
  signs,
}: {
  signs: ScamWarningSign[];
}) {
  if (signs.length === 0) return null;

  return (
    <section className="warning-section">
      <h2>
        Signals worth a closer look{" "}
        <span>{signs.length.toString().padStart(2, "0")}</span>
      </h2>

      <ul className="warning-list">
        {signs.map((sign, i) => (
          <li
            key={`${sign.title}-${i}`}
            className="warning-item enter-up"
            style={{ animationDelay: `${i * 80}ms` }}
          >
            <span className="warning-icon">
              <Icon name="alert" width="18" height="18" />
            </span>

            <div>
              <h3>{sign.title}</h3>
              <p>{sign.explanation}</p>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}