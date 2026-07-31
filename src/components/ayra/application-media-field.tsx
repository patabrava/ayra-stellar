"use client";

import Image from "next/image";
import { ImagePlus, MoveLeft, MoveRight, X } from "lucide-react";
import { useMemo, useRef, useState } from "react";

import {
  APPLICATION_MEDIA_ACCEPT,
  MAX_GALLERY_IMAGES,
  MAX_PROJECT_IMAGE_BYTES,
  MAX_PROJECT_MEDIA_BYTES,
} from "@/lib/ayra/project-media";

type GalleryItem = { file: File; url: string; alt: string; credit: string };

function formatMb(bytes: number) {
  return `${(bytes / 1024 / 1024).toFixed(bytes >= 10 * 1024 * 1024 ? 0 : 1)} MB`;
}

function filesForInput(input: HTMLInputElement | null, files: File[]) {
  if (!input || typeof DataTransfer === "undefined") return;
  const transfer = new DataTransfer();
  files.forEach((file) => transfer.items.add(file));
  input.files = transfer.files;
}

export function ApplicationMediaField({ requireRights = true }: { requireRights?: boolean }) {
  const galleryRef = useRef<HTMLInputElement>(null);
  const [main, setMain] = useState<{ file: File; url: string } | null>(null);
  const [gallery, setGallery] = useState<GalleryItem[]>([]);

  const totalBytes = (main?.file.size ?? 0) + gallery.reduce((sum, item) => sum + item.file.size, 0);
  const metadata = useMemo(() => JSON.stringify(gallery.map((item, index) => ({
    index,
    alt: item.alt.trim(),
    credit: item.credit.trim() || undefined,
  }))), [gallery]);
  const error = gallery.length > MAX_GALLERY_IMAGES
    ? "Choose no more than eight gallery photos."
    : totalBytes > MAX_PROJECT_MEDIA_BYTES
      ? "The complete photo set must be 60 MB or smaller."
      : [main?.file, ...gallery.map((item) => item.file)].some((file) => file && file.size > MAX_PROJECT_IMAGE_BYTES)
        ? "Each photo must be 10 MB or smaller."
        : null;

  function setMainFile(file?: File) {
    if (main) URL.revokeObjectURL(main.url);
    setMain(file ? { file, url: URL.createObjectURL(file) } : null);
  }

  function setGalleryFiles(files: File[]) {
    gallery.forEach((item) => URL.revokeObjectURL(item.url));
    const next = files.slice(0, MAX_GALLERY_IMAGES).map((file) => ({
      file,
      url: URL.createObjectURL(file),
      alt: "",
      credit: "",
    }));
    setGallery(next);
    filesForInput(galleryRef.current, next.map((item) => item.file));
  }

  function updateGallery(index: number, patch: Partial<GalleryItem>) {
    setGallery((items) => items.map((item, itemIndex) => itemIndex === index ? { ...item, ...patch } : item));
  }

  function move(index: number, direction: -1 | 1) {
    const target = index + direction;
    if (target < 0 || target >= gallery.length) return;
    const next = [...gallery];
    [next[index], next[target]] = [next[target], next[index]];
    setGallery(next);
    filesForInput(galleryRef.current, next.map((item) => item.file));
  }

  function remove(index: number) {
    const removed = gallery[index];
    if (removed) URL.revokeObjectURL(removed.url);
    const next = gallery.filter((_, itemIndex) => itemIndex !== index);
    setGallery(next);
    filesForInput(galleryRef.current, next.map((item) => item.file));
  }

  return (
    <fieldset className="grid gap-5 border border-rule p-4" aria-describedby="project-media-help project-media-error">
      <legend className="px-2 font-medium">Project photography</legend>
      <p className="text-sm leading-6 text-ink-muted" id="project-media-help">
        Add one landscape main image (minimum 2000 × 1125) and up to eight optional gallery photos. JPEG, PNG, or WebP; 10 MB each and 60 MB total. Photos stay private until AYRA approves them.
      </p>

      <div className="field">
        <label htmlFor="mainImage">Main image</label>
        <input accept={APPLICATION_MEDIA_ACCEPT} id="mainImage" name="mainImage" onChange={(event) => setMainFile(event.target.files?.[0])} required type="file" />
        {main ? (
          <div className="relative mt-3 aspect-video overflow-hidden border border-rule bg-black/5">
            <Image alt="Selected main project preview" fill sizes="(min-width: 768px) 50vw, 100vw" src={main.url} unoptimized className="object-cover" />
          </div>
        ) : null}
      </div>
      <div className="grid-2">
        <div className="field">
          <label htmlFor="mainImageAlt">Main image description</label>
          <input id="mainImageAlt" maxLength={240} minLength={5} name="mainImageAlt" placeholder="Medicinal plants growing in the Providencia nursery" required />
        </div>
        <div className="field">
          <label htmlFor="mainImageCredit">Photo credit (optional)</label>
          <input id="mainImageCredit" maxLength={160} name="mainImageCredit" placeholder="Dr Claudia Feix" />
        </div>
      </div>

      <div className="field">
        <label htmlFor="galleryImages">Additional gallery photos (optional)</label>
        <input accept={APPLICATION_MEDIA_ACCEPT} id="galleryImages" multiple name="galleryImages" onChange={(event) => setGalleryFiles(Array.from(event.target.files ?? []))} ref={galleryRef} type="file" />
      </div>
      <input name="galleryMetadata" type="hidden" value={metadata} />

      {gallery.length ? (
        <div className="grid gap-4 md:grid-cols-2">
          {gallery.map((item, index) => (
            <article className="border border-rule p-3" key={`${item.file.name}-${item.file.lastModified}`}>
              <div className="relative aspect-[4/3] overflow-hidden bg-black/5">
                <Image alt="" fill sizes="(min-width: 768px) 35vw, 100vw" src={item.url} unoptimized className="object-cover" />
              </div>
              <div className="mt-3 text-xs text-ink-muted">{index + 1}. {item.file.name} · {formatMb(item.file.size)}</div>
              <div className="field mt-3">
                <label htmlFor={`gallery-alt-${index}`}>Photo description</label>
                <input id={`gallery-alt-${index}`} maxLength={240} minLength={5} onChange={(event) => updateGallery(index, { alt: event.target.value })} required value={item.alt} />
              </div>
              <div className="field mt-3">
                <label htmlFor={`gallery-credit-${index}`}>Photo credit (optional)</label>
                <input id={`gallery-credit-${index}`} maxLength={160} onChange={(event) => updateGallery(index, { credit: event.target.value })} value={item.credit} />
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                <button aria-label={`Move ${item.file.name} earlier`} className="btn ghost" disabled={index === 0} onClick={() => move(index, -1)} type="button"><MoveLeft className="h-4 w-4" /> Earlier</button>
                <button aria-label={`Move ${item.file.name} later`} className="btn ghost" disabled={index === gallery.length - 1} onClick={() => move(index, 1)} type="button">Later <MoveRight className="h-4 w-4" /></button>
                <button aria-label={`Remove ${item.file.name}`} className="btn danger" onClick={() => remove(index)} type="button"><X className="h-4 w-4" /> Remove</button>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <div className="flex items-center gap-2 text-sm text-ink-muted"><ImagePlus className="h-4 w-4" /> No gallery photos selected.</div>
      )}

      {requireRights ? <label className="flex items-start gap-3 text-sm leading-6">
        <input className="mt-1" name="heroImageRightsConfirmed" required type="checkbox" value="true" />
        <span>I own these photos or have permission for AYRA to publish the selected images on its homepage and project pages.</span>
      </label> : null}
      <p className="text-sm text-[var(--danger)]" id="project-media-error" role="alert">{error}</p>
    </fieldset>
  );
}
