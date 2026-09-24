"use client";

import { useEffect, useState } from "react";
import { ConcernLevel } from "@/types/analysis";

export function RiskGauge({ probability, level }: { probability?: number; level: ConcernLevel }) {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    const frame = requestAnimationFrame(() => setReady(true));
    return () => cancelAnimationFrame(frame);
  }, []);
  const valid = typeof probability === "number" && Number.isFinite(probability) && probability >= 0 && probability <= 1;
  const percent = valid ? Math.round(probability * 100) : null;
  return <div className={`risk-gauge gauge-${level}`} role="img" aria-label={percent === null ? "Scam likelihood unavailable" : `Estimated scam likelihood: ${percent} percent`}>
    <svg viewBox="0 0 220 220" aria-hidden="true">
      <circle className="gauge-guide" cx="110" cy="110" r="103" />
      <circle className="gauge-track" cx="110" cy="110" r="88" />
      <circle className="gauge-fill" cx="110" cy="110" r="88" pathLength="100" strokeDasharray="100" strokeDashoffset={ready && percent !== null ? 100 - percent : 100} transform="rotate(-90 110 110)" />
    </svg>
    <div className="gauge-value"><span>{percent === null ? "—" : percent}<small>{percent !== null ? "%" : ""}</small></span><p>Scam likelihood</p><span className="gauge-caption">{percent === null ? "Not available" : "AI estimate"}</span></div>
  </div>;
}
