"use client";

import { MAX_TEXT_LENGTH } from "@/lib/validation";

interface MessageInputProps {
  value: string;
  onChange: (value: string) => void;
  error: string | null;
}

export function MessageInput({ value, onChange, error }: MessageInputProps) {
  return (
    <div className="message-field">
      <label htmlFor="message-text" className="field-label">The message you want to check</label>
      <textarea
        id="message-text"
        aria-invalid={!!error}
        aria-describedby={error ? "message-error message-count" : "message-count"}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        maxLength={MAX_TEXT_LENGTH}
        rows={7}
        placeholder="Paste your SMS, chat, or email here…"
        className="message-textarea"
      />
      <div className="field-meta">
        <span id="message-count">
          {value.length.toLocaleString()} / {MAX_TEXT_LENGTH.toLocaleString()} characters
        </span>
        {error && <span id="message-error" role="alert" className="text-peligro">{error}</span>}
      </div>
    </div>
  );
}
