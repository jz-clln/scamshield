"use client";

import { useRef, useState, DragEvent } from "react";
import { validateImageFile } from "@/lib/validation";
import { Icon } from "./Icon";

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
          if (e.key === "Enter" || e.key === " ") { e.preventDefault(); inputRef.current?.click(); }
        }}
        className={`upload-zone ${dragActive ? "drag-active" : ""}`}
      >
        <span className="upload-icon"><Icon name="upload" width="28" height="28" /></span>
        <p className="font-display text-gabi font-medium">
          Choose a screenshot
        </p>
        <p className="text-sm text-gabi/55 mt-1">
          Tap to browse or drag it here
        </p>
        <span className="upload-formats">PNG, JPG, WEBP · Up to 3 MB</span>
        <input
          ref={inputRef}
          type="file"
          accept="image/png,image/jpeg,image/jpg,image/webp"
          className="hidden"
          onChange={(e) => handleFiles(e.target.files)}
        />
      </div>
      {error && <p role="alert" className="text-sm text-peligro mt-2">{error}</p>}
    </div>
  );
}
