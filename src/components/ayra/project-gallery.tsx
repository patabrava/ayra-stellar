"use client";

import Image from "next/image";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import type { InitiativeMedia } from "@/lib/ayra/domain";

export function ProjectGallery({
  media,
  projectName = "Project",
}: {
  media: InitiativeMedia[];
  projectName?: string;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const returnFocusRef = useRef<HTMLButtonElement | null>(null);
  const [active, setActive] = useState(0);
  const current = media[active];

  function open(index: number, trigger: HTMLButtonElement) {
    setActive(index);
    returnFocusRef.current = trigger;
    dialogRef.current?.showModal();
  }
  function close() {
    dialogRef.current?.close();
    returnFocusRef.current?.focus();
  }
  function move(direction: -1 | 1) {
    setActive((index) => (index + direction + media.length) % media.length);
  }

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    const keydown = (event: KeyboardEvent) => {
      if (event.key === "ArrowLeft") setActive((index) => (index - 1 + media.length) % media.length);
      if (event.key === "ArrowRight") setActive((index) => (index + 1) % media.length);
    };
    dialog.addEventListener("keydown", keydown);
    return () => dialog.removeEventListener("keydown", keydown);
  }, [media.length]);

  if (!media.length) return null;
  return (
    <section className="project-gallery" aria-labelledby="project-gallery-title">
      <div className="project-gallery-heading">
        <div>
          <div className="place-line">Field photography</div>
          <h2
            className="display mt-5 text-3xl font-medium md:text-4xl"
            id="project-gallery-title"
          >
            Project gallery
          </h2>
        </div>
        <span className="public-dim text-sm">
          {media.length} approved {media.length === 1 ? "image" : "images"}
        </span>
      </div>
      <div className="project-gallery-grid mt-5">
        {media.map((item, index) => (
          <button className="project-gallery-thumb" key={item.id} onClick={(event) => open(index, event.currentTarget)} type="button">
            <Image alt={item.alt} height={item.height} sizes="(min-width: 1024px) 30vw, (min-width: 640px) 48vw, 100vw" src={item.url} unoptimized width={item.width} />
            <span>{item.alt}</span>
            {item.credit ? <small>{item.credit}</small> : null}
          </button>
        ))}
      </div>
      <dialog
        aria-label={`${projectName} project gallery`}
        className="project-gallery-dialog"
        onClose={() => returnFocusRef.current?.focus()}
        ref={dialogRef}
      >
        {current ? (
          <div className="project-gallery-dialog-inner">
            <button
              aria-label="Close photo viewer"
              className="project-gallery-close"
              onClick={close}
              type="button"
            >
              <X />
            </button>
            <Image
              alt={current.alt}
              height={current.height}
              sizes="95vw"
              src={current.url}
              unoptimized
              width={current.width}
            />
            <div className="project-gallery-dialog-caption">
              <p>{current.alt}</p>
              {current.credit ? <small>Photo: {current.credit}</small> : null}
            </div>
            {media.length > 1 ? (
              <div className="project-gallery-controls">
                <button aria-label="Previous photo" onClick={() => move(-1)} type="button">
                  <ChevronLeft />
                </button>
                <span>{active + 1} / {media.length}</span>
                <button aria-label="Next photo" onClick={() => move(1)} type="button">
                  <ChevronRight />
                </button>
              </div>
            ) : null}
          </div>
        ) : null}
      </dialog>
    </section>
  );
}
