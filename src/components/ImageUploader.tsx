"use client";

import { useRef, useState, DragEvent } from "react";
import { validateImageFile } from "@/lib/validation";

interface ImageUploaderProps {
  file: File | null;
  previewUrl: string | null;
  onFileSelected: (file: File, previewUrl: string) => void;
  onClear: () => void;
  error: string | null;
}

export function ImageUploader({
  file,
  previewUrl,
  onFileSelected,
  onClear,
  error,
}: ImageUploaderProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragActive, setDragActive] = useState(false);

  function handleFiles(fileList: FileList | null) {
    const selected = fileList?.[0];
    if (!selected) return;

    const result = validateImageFile(selected);
    if (!result.valid) {
      onFileSelected(selected, ""); // let parent surface the error via `error` prop path
      return;
    }

    onFileSelected(selected, URL.createObjectURL(selected));
  }

  function handleDrop(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setDragActive(false);
    handleFiles(e.dataTransfer.files);
  }

  if (file && previewUrl) {
    return (
      <div className="relative rounded-xl border border-dagat/15 bg-white overflow-hidden">
        <img
          src={previewUrl}
          alt="Uploaded screenshot preview"
          className="max-h-72 w-full object-contain bg-dagat-light/40"
        />
        <button
          type="button"
          onClick={onClear}
          className="absolute top-3 right-3 rounded-full bg-gabi/80 text-white text-xs px-3 py-1.5 hover:bg-gabi transition-colors"
        >
          Remove
        </button>
      </div>
    );
  }

  return (
    <div>
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragActive(true);
        }}
        onDragLeave={() => setDragActive(false)}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") inputRef.current?.click();
        }}
        className={`rounded-xl border-2 border-dashed p-10 text-center cursor-pointer transition-colors ${
          dragActive
            ? "border-dagat bg-dagat-light/60"
            : "border-dagat/25 bg-white hover:border-dagat/50"
        }`}
      >
        <p className="font-display text-gabi font-medium">
          Drop a screenshot here
        </p>
        <p className="text-sm text-gabi/55 mt-1">
          or click to browse — PNG, JPG, or WEBP, up to 8MB
        </p>
        <input
          ref={inputRef}
          type="file"
          accept="image/png,image/jpeg,image/jpg,image/webp"
          className="hidden"
          onChange={(e) => handleFiles(e.target.files)}
        />
      </div>
      {error && <p className="text-sm text-peligro mt-2">{error}</p>}
    </div>
  );
}
