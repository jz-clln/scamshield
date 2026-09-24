"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AnalysisResult as AnalysisResultType } from "@/types/analysis";
import { AnalysisResult } from "@/components/AnalysisResult";

export default function ResultPage() {
  const router = useRouter();
  const [result, setResult] = useState<AnalysisResultType | null>(null);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    const stored = sessionStorage.getItem("scamshield:result");
    if (!stored) {
      setNotFound(true);
      return;
    }
    setResult(JSON.parse(stored));
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

  if (!result) return null;

  return (
    <div className="max-w-content mx-auto px-5 py-12">
      <AnalysisResult result={result} />

      <button
        type="button"
        onClick={() => {
          sessionStorage.removeItem("scamshield:result");
          router.push("/");
        }}
        className="mt-8 w-full rounded-xl border border-dagat/20 text-dagat font-display font-medium py-3.5 hover:bg-dagat-light/50 transition-colors"
      >
        Analyze another message
      </button>
    </div>
  );
}
