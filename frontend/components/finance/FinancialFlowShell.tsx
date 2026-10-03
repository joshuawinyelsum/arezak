"use client";

import React, { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { FlowHeader } from "./FlowHeader";

type Viewport = { height: number; top: number };

export function FinancialFlowShell({
  title,
  stepLabel,
  onBack,
  onClose,
  children,
  footer,
}: {
  title: string;
  stepLabel: string;
  onBack?: () => void;
  onClose: () => void;
  children: React.ReactNode;
  footer: React.ReactNode;
}) {
  const contentRef = useRef<HTMLDivElement>(null);
  const dialogRef = useRef<HTMLElement>(null);
  const [viewport, setViewport] = useState<Viewport>({ height: 0, top: 0 });
  const [portalReady, setPortalReady] = useState(false);

  useEffect(() => {
    const body = document.body;
    const previousOverflow = body.style.overflow;
    const previousFocus = document.activeElement;
    body.style.overflow = "hidden";
    setPortalReady(true);

    const updateViewport = () => {
      const visual = window.visualViewport;
      const top = visual?.offsetTop ?? 0;
      const availableLayoutHeight = Math.max(0, window.innerHeight - top);
      setViewport({
        // Some mobile browsers report a visual viewport taller than the
        // remaining layout viewport after panning a focused field. Clamp the
        // shell so its sticky action area stays inside the visible layout.
        height: Math.min(visual?.height ?? window.innerHeight, availableLayoutHeight),
        top,
      });
    };

    updateViewport();
    window.requestAnimationFrame(() => dialogRef.current?.focus());
    window.visualViewport?.addEventListener("resize", updateViewport);
    window.visualViewport?.addEventListener("scroll", updateViewport);
    window.addEventListener("resize", updateViewport);
    return () => {
      body.style.overflow = previousOverflow;
      if (previousFocus instanceof HTMLElement) previousFocus.focus();
      window.visualViewport?.removeEventListener("resize", updateViewport);
      window.visualViewport?.removeEventListener("scroll", updateViewport);
      window.removeEventListener("resize", updateViewport);
    };
  }, []);

  const keepFocusedInputVisible = (event: React.FocusEvent<HTMLDivElement>) => {
    const target = event.target;
    if (!(target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement || target instanceof HTMLSelectElement)) return;
    window.setTimeout(() => {
      const content = contentRef.current;
      if (!content) return;
      const elementBounds = target.getBoundingClientRect();
      const contentBounds = content.getBoundingClientRect();
      const bottomLimit = contentBounds.bottom - 20;
      if (elementBounds.bottom > bottomLimit) {
        content.scrollBy({ top: elementBounds.bottom - bottomLimit, behavior: "smooth" });
      } else if (elementBounds.top < contentBounds.top + 12) {
        content.scrollBy({ top: elementBounds.top - contentBounds.top - 12, behavior: "smooth" });
      }
    }, 160);
  };

  const keepKeyboardFocusInside = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "Escape") {
      event.preventDefault();
      onClose();
      return;
    }
    if (event.key !== "Tab" || !dialogRef.current) return;
    const focusable = Array.from(dialogRef.current.querySelectorAll<HTMLElement>(
      'button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])'
    )).filter((element) => element.offsetParent !== null);
    if (focusable.length === 0) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  };

  const shell = (
    <div
      className="fixed inset-x-0 z-[70] flex items-end justify-center bg-slate-950/45 backdrop-blur-[2px] md:items-center md:p-6"
      style={{
        top: viewport.top,
        height: viewport.height
          ? `min(${viewport.height}px, calc(100dvh - ${viewport.top}px))`
          : "100dvh",
      }}
      onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}
      onKeyDown={keepKeyboardFocusInside}
    >
      <section
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="financial-flow-title"
        tabIndex={-1}
        className="flex min-h-0 w-full max-h-full flex-col overflow-hidden rounded-t-[28px] bg-card shadow-2xl md:max-h-[min(90dvh,780px)] md:max-w-lg md:rounded-3xl"
        style={{ height: "min(100%, 780px)" }}
      >
        <FlowHeader title={title} stepLabel={stepLabel} onBack={onBack} onClose={onClose} />
        <div
          ref={contentRef}
          onFocusCapture={keepFocusedInputVisible}
          className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 py-5 sm:px-6"
        >
          {children}
        </div>
        {footer}
      </section>
    </div>
  );

  return portalReady ? createPortal(shell, document.body) : null;
}

