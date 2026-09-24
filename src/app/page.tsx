"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ImageUploader } from "@/components/ImageUploader";
import { MessageInput } from "@/components/MessageInput";
import { AnalyzeButton } from "@/components/AnalyzeButton";
import { InputMode } from "@/types/analysis";
import { validateImageFile, validateTextInput } from "@/lib/validation";

const LOADING_STEPS = [
  "Reading message...",
  "Analyzing warning signs...",
  "Preparing recommendation...",
];

export default function HomePage() {
  const router = useRouter();
  const [mode, setMode] = useState<InputMode>("text");
  const [text, setText] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [fieldError, setFieldError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState(0);

  function handleFileSelected(selected: File, url: string) {
    const result = validateImageFile(selected);
    if (!result.valid) {
      setFieldError(result.error ?? "Invalid file.");
      setFile(null);
      setPreviewUrl(null);
      return;
    }
    setFieldError(null);
    setFile(selected);
    setPreviewUrl(url);
  }

  function handleClearFile() {
    setFile(null);
    setPreviewUrl(null);
    setFieldError(null);
  }

  function fileToBase64(f: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        resolve(result.split(",")[1] ?? "");
      };
      reader.onerror = reject;
      reader.readAsDataURL(f);
    });
  }

  async function handleAnalyze() {
    setSubmitError(null);

    if (mode === "text") {
      const validation = validateTextInput(text);
      if (!validation.valid) {
        setFieldError(validation.error ?? "Invalid input.");
        return;
      }
    } else if (!file) {
      setFieldError("Upload a screenshot to continue.");
      return;
    }
    setFieldError(null);

    setLoading(true);
    setLoadingStep(0);
    const stepTimer = setInterval(() => {
      setLoadingStep((s) => Math.min(s + 1, LOADING_STEPS.length - 1));
    }, 900);

    try {
      const body =
        mode === "text"
          ? { mode, text }
          : { mode, imageBase64: await fileToBase64(file as File), mimeType: (file as File).type };

      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const data = await res.json();

      if (!res.ok) {
        setSubmitError(data.message ?? "Something went wrong. Please try again.");
        return;
      }

      sessionStorage.setItem("scamshield:result", JSON.stringify(data));
      router.push("/result");
    } catch {
      setSubmitError("We could not reach ScamShield right now. Please try again.");
    } finally {
      clearInterval(stepTimer);
      setLoading(false);
    }
  }

  return (
    <div className="max-w-content mx-auto px-5 py-12">
      <div className="mb-10">
        <h1 className="font-display text-3xl font-semibold text-gabi leading-tight">
          Not sure if a message is safe?
        </h1>
        <p className="text-gabi/65 mt-2">
          Upload a screenshot or paste the message. ScamShield checks it for
          common warning signs before you act.
        </p>
      </div>

      <div className="flex gap-1 rounded-lg bg-dagat/5 p-1 mb-5 w-fit">
        <ModeTab active={mode === "text"} onClick={() => setMode("text")}>
          Paste message
        </ModeTab>
        <ModeTab active={mode === "image"} onClick={() => setMode("image")}>
          Upload screenshot
        </ModeTab>
      </div>

      {mode === "text" ? (
        <MessageInput value={text} onChange={setText} error={fieldError} />
      ) : (
        <ImageUploader
          file={file}
          previewUrl={previewUrl}
          onFileSelected={handleFileSelected}
          onClear={handleClearFile}
          error={fieldError}
        />
      )}

      <div className="mt-5">
        <AnalyzeButton onClick={handleAnalyze} loading={loading} disabled={loading} />
      </div>

      {loading && (
        <p className="text-sm text-gabi/55 mt-3 text-center">
          {LOADING_STEPS[loadingStep]}
        </p>
      )}

      {submitError && (
        <p className="text-sm text-peligro mt-3 text-center">{submitError}</p>
      )}

      <HowItWorks />
    </div>
  );
}

function ModeTab({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
        active ? "bg-white text-dagat shadow-sm" : "text-gabi/55 hover:text-gabi"
      }`}
    >
      {children}
    </button>
  );
}

function HowItWorks() {
  const steps = [
    { title: "Sees", body: "OpenAI reads your screenshot or message and extracts the text." },
    { title: "Decides", body: "JEV checks it against known scam patterns and produces a risk score." },
    { title: "Explains", body: "OpenAI turns that result into plain warning signs and next steps." },
  ];

  return (
    <div className="mt-16 pt-8 border-t border-dagat/10">
      <ol className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        {steps.map((step, i) => (
          <li key={step.title}>
            <div className="font-display text-dagat/40 text-sm mb-1">{i + 1}</div>
            <p className="font-display font-semibold text-gabi">{step.title}</p>
            <p className="text-sm text-gabi/60 mt-1">{step.body}</p>
          </li>
        ))}
      </ol>
    </div>
  );
}