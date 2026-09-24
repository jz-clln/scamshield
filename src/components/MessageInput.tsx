"use client";

import { MAX_TEXT_LENGTH } from "@/lib/validation";

interface MessageInputProps {
  value: string;
  onChange: (value: string) => void;
  error: string | null;
}

export function MessageInput({ value, onChange, error }: MessageInputProps) {
  return (
    <div>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        maxLength={MAX_TEXT_LENGTH}
        rows={7}
        placeholder="Paste the suspicious message here — e.g. Your account will be suspended today. Verify immediately using this link."
        className="w-full rounded-xl border border-dagat/20 bg-white p-4 text-gabi placeholder:text-gabi/35 focus-visible:outline-none focus:border-dagat resize-none"
      />
      <div className="flex items-center justify-between mt-1.5">
        <span className="text-xs text-gabi/45">
          {value.length} / {MAX_TEXT_LENGTH}
        </span>
        {error && <span className="text-sm text-peligro">{error}</span>}
      </div>
    </div>
  );
}
