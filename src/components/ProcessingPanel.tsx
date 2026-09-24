"use client";

import { useEffect, useRef, useState } from "react";
import { Icon } from "./Icon";

const TIPS = [
  { title: "A little pause goes a long way.", text: "Scammers often want a fast reaction. Taking a moment to check puts you back in control." },
  { title: "Your OTP is yours. Always.", text: "A legitimate support agent should never need your password, PIN, or one-time code." },
  { title: "Use a channel you already trust.", text: "Verify unexpected requests through an official app or a contact you have saved." },
  { title: "Look beyond the sender's name.", text: "A familiar name or profile photo alone does not confirm who sent a message." },
];

export function ProcessingPanel({ onCancel }: { onCancel: () => void }) {
  const [seconds, setSeconds] = useState(0);
  const headingRef = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    headingRef.current?.focus({ preventScroll: true });
    headingRef.current?.scrollIntoView({ block: "nearest", behavior: "instant" });
    const timer = setInterval(() => setSeconds(s => s + 1), 1000);
    return () => clearInterval(timer);
  }, []);
  const tip = Math.floor(seconds / 7) % TIPS.length;

  return <section className="processing-panel enter-up" aria-busy="true" aria-label="Message analysis in progress">
    <div className="processing-top"><span className="eyebrow"><span className="live-dot" /> ANALYSIS IN PROGRESS</span><span className="elapsed" aria-hidden="true">{seconds}s</span></div>
    <div className="scanner" aria-hidden="true">
      <div className="scanner-orbit orbit-one" /><div className="scanner-orbit orbit-two" />
      <div className="scanner-core"><Icon name="shield" width="43" height="43" /></div>
      <span className="scan-particle particle-one" /><span className="scan-particle particle-two" />
    </div>
    <div role="status" aria-live="polite">
      <h2 ref={headingRef} tabIndex={-1}>{seconds >= 25 ? "Giving this a closer look" : "Looking beneath the message"}</h2>
      <p>{seconds >= 25 ? "The analysis is taking a little longer. You can keep waiting or cancel and try again." : "Checking the details so you can decide what to do next."}</p>
    </div>
    <div className="indeterminate-track" aria-hidden="true"><span /></div>
    <div className="processing-tags" aria-hidden="true"><span>Language & context</span><span>Warning signs</span><span>Next steps</span></div>
    <div className="safety-tip" key={tip}><Icon name="sparkle" /><div><span className="eyebrow">WHILE WE CHECK</span><h3>{TIPS[tip].title}</h3><p>{TIPS[tip].text}</p></div></div>
    <button type="button" className="text-button" onClick={onCancel}>Cancel analysis</button>
  </section>;
}
