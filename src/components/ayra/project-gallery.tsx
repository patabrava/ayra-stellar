"use client";

import Image from "next/image";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import type { InitiativeMedia } from "@/lib/ayra/domain";

export function ProjectGallery({ media }: { media: InitiativeMedia[] }) {
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
      <div className="place-line" id="project-gallery-title">Project gallery</div>
      <div className="project-gallery-grid mt-5">
        {media.map((item, index) => (
          <button className="project-gallery-thumb" key={item.id} onClick={(event) => open(index, event.currentTarget)} type="button">
            <Image alt={item.alt} height={item.height} sizes="(min-width: 1024px) 30vw, (min-width: 640px) 48vw, 100vw" src={item.url} unoptimized width={item.width} />
            {item.credit ? <span>Photo: {item.credit}</span> : null}
          </button>
        ))}
      </div>
      <dialog aria-label="Project photo viewer" className="project-gallery-dialog" onClose={() => returnFocusRef.current?.focus()} ref={dialogRef}>
        {current ? <div className="project-gallery-dialog-inner">
          <button aria-label="Close photo viewer" className="project-gallery-close" onClick={close} type="button"><X /></button>
          <Image alt={current.alt} height={current.height} sizes="95vw" src={current.url} unoptimized width={current.width} />
          <div className="project-gallery-caption"><p>{current.alt}</p>{current.credit ? <span>Photo: {current.credit}</span> : null}</div>
          {media.length > 1 ? <><button aria-label="Previous photo" className="project-gallery-prev" onClick={() => move(-1)} type="button"><ChevronLeft /></button><button aria-label="Next photo" className="project-gallery-next" onClick={() => move(1)} type="button"><ChevronRight /></button></> : null}
        </div> : null}
      </dialog>
    </section>
  );
}
