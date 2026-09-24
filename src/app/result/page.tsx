"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AnalysisResult as AnalysisResultType } from "@/types/analysis";
import { AnalysisResult } from "@/components/AnalysisResult";
import { Icon } from "@/components/Icon";

export default function ResultPage() {
  const router = useRouter();
  const [result, setResult] = useState<AnalysisResultType | null>(null);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    try {
      const stored = sessionStorage.getItem("scamshield:result");
      if (!stored) { setNotFound(true); return; }
      const parsed = JSON.parse(stored);
      if (!parsed?.jev || !parsed.explanation || !Number.isFinite(parsed.riskScore) || !["low", "needs_verification", "high"].includes(parsed.concernLevel) || !Array.isArray(parsed.explanation.warningSigns) || !Array.isArray(parsed.explanation.recommendedActions)) throw new Error("Invalid saved result");
      setResult(parsed);
    } catch {
      setNotFound(true);
    }
  }, []);

  if (notFound) {
    return (
      <div className="max-w-content mx-auto px-5 py-16 text-center">
        <p className="text-gabi/65">
          No analysis to show yet. Start by uploading a screenshot or pasting a message.
        </p>
        <button
          type="button"
          onClick={() => router.push("/")}
          className="mt-4 rounded-lg bg-dagat text-white px-5 py-2.5 font-display font-medium hover:bg-dagat-dark transition-colors"
        >
          Analyze a message
        </button>
      </div>
    );
  }

  if (!result) return <div className="app-container result-page" role="status"><div className="result-skeleton">Opening your analysis…</div></div>;

  return (
    <div className="app-container result-page">
      <div className="result-heading enter-up"><div><span className="eyebrow"><Icon name="check" width="15" height="15" /> ANALYSIS COMPLETE</span><h2>A clearer picture.</h2></div><span className="result-heading-note">Your message, understood.</span></div>
      <AnalysisResult result={result} />

      <button
        type="button"
        onClick={() => {
          try { sessionStorage.removeItem("scamshield:result"); } catch { /* Navigation still works without storage. */ }
          router.push("/");
        }}
        className="primary-button analyze-another"
      >
        <Icon name="scan" /><span>Check another message</span><Icon name="arrow" />
      </button>
    </div>
  );
}
