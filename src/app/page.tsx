"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ImageUploader } from "@/components/ImageUploader";
import { MessageInput } from "@/components/MessageInput";
import { AnalyzeButton } from "@/components/AnalyzeButton";
import { ProcessingPanel } from "@/components/ProcessingPanel";
import { Icon } from "@/components/Icon";
import { InputMode } from "@/types/analysis";
import { validateImageFile, validateTextInput } from "@/lib/validation";

export default function HomePage() {
  const router = useRouter();
  const [mode, setMode] = useState<InputMode>("text");
  const [text, setText] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [fieldError, setFieldError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const requestRef = useRef<AbortController | null>(null);

  useEffect(() => () => requestRef.current?.abort(), []);
  useEffect(() => () => { if (previewUrl) URL.revokeObjectURL(previewUrl); }, [previewUrl]);

  function handleFileSelected(selected: File, url: string) {
    const result = validateImageFile(selected);
    setFieldError(result.valid ? null : result.error ?? "Invalid file.");
    setFile(result.valid ? selected : null);
    setPreviewUrl(result.valid ? url : null);
  }

  function fileToBase64(f: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve((reader.result as string).split(",")[1] ?? "");
      reader.onerror = reject;
      reader.readAsDataURL(f);
    });
  }

  function cancelAnalysis() {
    requestRef.current?.abort();
    requestRef.current = null;
    setLoading(false);
    requestAnimationFrame(() => document.getElementById("message-text")?.focus({ preventScroll: true }));
  }

  async function handleAnalyze() {
    if (requestRef.current) return;
    setSubmitError(null);
    if (mode === "text") {
      const validation = validateTextInput(text);
      if (!validation.valid) { setFieldError(validation.error ?? "Invalid input."); return; }
    } else if (!file) { setFieldError("Upload a screenshot to continue."); return; }
    setFieldError(null);
    const controller = new AbortController();
    requestRef.current = controller;
    setLoading(true);
    const timeout = setTimeout(() => controller.abort("timeout"), 120_000);
    let navigating = false;
    try {
      const body = mode === "text" ? { mode, text } : { mode, imageBase64: await fileToBase64(file as File), mimeType: (file as File).type };
      const res = await fetch("/api/analyze", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body), signal: controller.signal });
      const data = await res.json();
      if (controller.signal.aborted) return;
      if (!res.ok) { setSubmitError(data.message ?? "Something went wrong. Please try again."); return; }
      try { sessionStorage.setItem("scamshield:result", JSON.stringify(data)); }
      catch { setSubmitError("Your browser could not save the result for this tab. Allow site storage and try again."); return; }
      navigating = true;
      router.push("/result");
    } catch {
      if (!controller.signal.aborted) setSubmitError("We could not reach ScamShield right now. Your message is still here. Please try again.");
      else if (controller.signal.reason === "timeout") setSubmitError("This check took too long. Your message is still here. Please try again.");
    } finally {
      clearTimeout(timeout);
      if (requestRef.current === controller && !navigating) { requestRef.current = null; setLoading(false); }
    }
  }

  return <div className="app-container home-page">
    <section className="hero enter-up">
      <div className="hero-copy">
        <span className="eyebrow hero-eyebrow"><span className="live-dot" /> A LITTLE CLARITY. A SAFER NEXT STEP.</span>
        <h1>Pause the doubt.<br /><span>Check the message.</span></h1>
        <p>An unexpected text. An offer too good to be true. Get a clearer picture before you click, reply, or pay.</p>
        <div className="hero-tags"><span><Icon name="sparkle" /> AI-powered insights</span><span><Icon name="text" /> English & Filipino</span></div>
      </div>
      <div className="hero-art" aria-hidden="true"><div className="art-ring ring-outer" /><div className="art-ring ring-inner" /><div className="art-shield"><Icon name="shield" width="66" height="66" /></div><span className="art-chip chip-top"><Icon name="scan" /> Look closer</span><span className="art-chip chip-bottom"><span className="live-dot" /> Act with clarity</span><span className="art-star">+</span></div>
    </section>

    <div className="workspace-grid">
      <section className="analysis-workspace enter-up delay-one" aria-label="Check a message">
        {loading ? <ProcessingPanel onCancel={cancelAnalysis} /> : <div className="input-card">
          <div className="card-heading"><div><span className="eyebrow">YOUR SECOND OPINION</span><h2>Let’s take a look.</h2></div><span className="icon-tile"><Icon name="scan" /></span></div>
          <div className="mode-switch" role="group" aria-label="Message input method">
            <span className={`mode-indicator ${mode === "image" ? "at-image" : ""}`} aria-hidden="true" />
            <button type="button" aria-pressed={mode === "text"} onClick={() => { setMode("text"); setFieldError(null); setSubmitError(null); }}><Icon name="text" />Paste message</button>
            <button type="button" aria-pressed={mode === "image"} onClick={() => { setMode("image"); setFieldError(null); setSubmitError(null); }}><Icon name="image" />Screenshot</button>
          </div>
          <div className="input-transition" key={mode}>
            {mode === "text" ? <MessageInput value={text} onChange={value => { setText(value); setFieldError(null); }} error={fieldError} /> : <ImageUploader file={file} previewUrl={previewUrl} onFileSelected={handleFileSelected} onClear={() => { setFile(null); setPreviewUrl(null); setFieldError(null); }} error={fieldError} />}
          </div>
          {mode === "text" && !text && <button type="button" className="example-button" onClick={() => setText("Your account will be suspended today. Send your OTP now to verify your identity and keep your account active.")}>Just exploring? <span>Try an example <Icon name="arrow" width="14" height="14" /></span></button>}
          <div className="analyze-action"><AnalyzeButton onClick={handleAnalyze} loading={loading} disabled={loading} /></div>
          <p className="input-note"><Icon name="lock" width="13" height="13" /> Remove passwords, OTPs, and private details before submitting.</p>
        </div>}
        {submitError && <div className="error-banner enter-up" role="alert"><Icon name="alert" /><p>{submitError}</p></div>}
      </section>

      <aside className="insight-sidebar enter-up delay-two">
        <div className="clarity-card"><span className="eyebrow">FROM UNCERTAINTY TO UNDERSTANDING</span><h2>A check that<br />makes sense.</h2><p>More than a yes or no. Understand the signals behind a suspicious message.</p><ol className="feature-list">{[
          { icon: "scan" as const, title: "Spot the signals", text: "Check for suspicious requests, pressure tactics, and deception." },
          { icon: "shield" as const, title: "Understand the risk", text: "See the estimated likelihood, risk score, and urgency in one place." },
          { icon: "arrow" as const, title: "Know your next move", text: "Get practical steps to help you respond with confidence." },
        ].map((item, i) => <li key={item.title}><span className="feature-icon"><Icon name={item.icon} /></span><div><span className="feature-number">0{i + 1}</span><h3>{item.title}</h3><p>{item.text}</p></div></li>)}</ol></div>
        <div className="gentle-reminder"><Icon name="shield" /><p>A useful second opinion.<br /><strong>Your judgment still matters.</strong></p></div>
      </aside>
    </div>
    <div className="bottom-note enter-up delay-two"><span>PAUSE. CHECK. VERIFY.</span><p>A little more informed. A little more in control.</p></div>
  </div>;
}
