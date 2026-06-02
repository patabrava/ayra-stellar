"use client";

import { useEffect, useId, useRef, useState } from "react";
import Image from "next/image";
import { Film, FileImage, Upload, X } from "lucide-react";

import { MAX_UPDATE_MEDIA_BYTES, UPDATE_MEDIA_ACCEPT } from "@/lib/ayra/upload";

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  const kib = bytes / 1024;
  if (kib < 1024) return `${kib.toFixed(kib >= 100 ? 0 : 1)} KB`;
  const mib = kib / 1024;
  return `${mib.toFixed(mib >= 10 ? 0 : 1)} MB`;
}

export function UpdateMediaField() {
  const fieldId = useId().replace(/:/g, "");
  const helpId = `${fieldId}-help`;
  const inputRef = useRef<HTMLInputElement>(null);
  const previewUrlRef = useRef<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  useEffect(() => {
    return () => {
      if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
    };
  }, []);

  const isOversized = selectedFile ? selectedFile.size > MAX_UPDATE_MEDIA_BYTES : false;
  const fileLabel = selectedFile
    ? selectedFile.type.startsWith("video/")
      ? "Video"
      : "Image"
    : "No file selected";
  const headline = selectedFile
    ? "File attached"
    : "Choose a file or drop it here";
  const subtitle = selectedFile
    ? "Tap the panel to replace it, or clear it before submitting."
    : "PNG, JPG, WEBP, SVG, or MP4. AYRA blocks anything above 4 MB.";

  function replaceSelectedFile(file: File | null) {
    if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
    const nextPreviewUrl = file?.type.startsWith("image/")
      ? URL.createObjectURL(file)
      : null;
    previewUrlRef.current = nextPreviewUrl;
    setSelectedFile(file);
    setPreviewUrl(nextPreviewUrl);
  }

  function clearSelectedFile() {
    replaceSelectedFile(null);
    if (inputRef.current) inputRef.current.value = "";
  }

  return (
    <div className="field upload-field">
      <div className="upload-field-head">
        <label htmlFor={fieldId}>Upload public media</label>
        <span className="upload-limit">Max {formatBytes(MAX_UPDATE_MEDIA_BYTES)}</span>
      </div>
      <p className="upload-note" id={helpId}>
        PNG, JPG, WEBP, SVG, or MP4. Files above the limit are blocked before the
        submission reaches AYRA.
      </p>
      <div
        aria-live="polite"
        className={selectedFile ? "upload-card upload-card-selected" : "upload-card"}
        data-state={selectedFile ? "selected" : "empty"}
        data-oversized={isOversized ? "true" : "false"}
      >
        <input
          accept={UPDATE_MEDIA_ACCEPT}
          aria-describedby={helpId}
          className="upload-input"
          id={fieldId}
          name="mediaFile"
          onChange={(event) => replaceSelectedFile(event.target.files?.[0] ?? null)}
          ref={inputRef}
          type="file"
        />
        <div className="upload-card-main">
          <div className="upload-preview" data-tone={isOversized ? "warn" : "ok"}>
            {previewUrl ? (
              <Image alt="" fill sizes="56px" src={previewUrl} unoptimized />
            ) : selectedFile ? (
              selectedFile.type.startsWith("video/") ? (
                <Film className="h-5 w-5" />
              ) : (
                <FileImage className="h-5 w-5" />
              )
            ) : (
              <Upload className="h-5 w-5" />
            )}
          </div>
          <div className="upload-meta">
            <span className="upload-headline">{headline}</span>
            <span className="upload-file-name">
              {selectedFile ? selectedFile.name : "No file selected yet"}
            </span>
            <span className="upload-file-details">{subtitle}</span>
          </div>
        </div>
        <div className="upload-card-side">
          <span className="upload-select">
            <Upload className="h-4 w-4" />
            {selectedFile ? "Replace file" : "Choose file"}
          </span>
          <span className="upload-file-chip">
            {selectedFile ? `${formatBytes(selectedFile.size)} · ${fileLabel}` : "Optional"}
          </span>
        </div>
      </div>
      {selectedFile ? (
        <div className="upload-actions">
          <span className={isOversized ? "upload-file-note warn" : "upload-file-note ok"}>
            {isOversized
              ? "This file exceeds AYRA's 4 MB cap."
              : "Ready to submit with this update."}
          </span>
          <button
            aria-label="Clear selected file"
            className="upload-clear"
            onClick={clearSelectedFile}
            type="button"
          >
            <X className="h-4 w-4" />
            Clear file
          </button>
        </div>
      ) : null}
    </div>
  );
}
