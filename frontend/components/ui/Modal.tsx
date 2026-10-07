"use client";

import React, { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

type ModalProps = {
  open: boolean;
  onClose: () => void;
  ariaLabel: string;
  children: React.ReactNode;
  closeOnBackdrop?: boolean;
  panelClassName?: string;
};

let originalBodyOverflow: string | undefined;
let originalAppInert: boolean | undefined;

function syncModalLayers() {
  const layers = Array.from(document.querySelectorAll<HTMLElement>("[data-modal-layer]"));
  const app = document.querySelector<HTMLElement>(".app-shell");

  if (layers.length && app && originalAppInert === undefined) originalAppInert = app.inert;
  layers.forEach((layer, index) => { layer.inert = index !== layers.length - 1; });
  if (app) app.inert = layers.length > 0 || originalAppInert === true;

  if (!layers.length) {
    if (app && originalAppInert !== undefined) app.inert = originalAppInert;
    originalAppInert = undefined;
    if (originalBodyOverflow !== undefined) document.body.style.overflow = originalBodyOverflow;
    originalBodyOverflow = undefined;
  }
}

export function Modal({ open, onClose, ariaLabel, children, closeOnBackdrop = false, panelClassName = "" }: ModalProps) {
  const [host, setHost] = useState<HTMLElement | null>(null);
  const closeRef = useRef(onClose);
  const restoreFocusRef = useRef<HTMLElement | null>(null);
  closeRef.current = onClose;

  useEffect(() => {
    if (!open) return;
    restoreFocusRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    if (originalBodyOverflow === undefined) originalBodyOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const layer = document.createElement("div");
    layer.dataset.modalLayer = "true";
    document.body.appendChild(layer);
    syncModalLayers();
    setHost(layer);

    return () => {
      layer.remove();
      setHost(null);
      syncModalLayers();
      const trigger = restoreFocusRef.current;
      if (trigger?.isConnected && !trigger.closest("[inert]") && !trigger.hasAttribute("disabled")) trigger.focus();
    };
  }, [open]);

  useEffect(() => {
    if (!host) return;
    const panel = host.querySelector<HTMLElement>("[role=dialog]");
    const isTop = () => document.querySelectorAll("[data-modal-layer]").item(document.querySelectorAll("[data-modal-layer]").length - 1) === host;
    const focusables = () => Array.from(panel?.querySelectorAll<HTMLElement>(
      'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
    ) ?? []).filter((element) => element.offsetParent !== null);
    const onKeyDown = (event: KeyboardEvent) => {
      if (!isTop()) return;
      if (event.key === "Escape") {
        event.preventDefault();
        closeRef.current();
      } else if (event.key === "Tab" && panel) {
        const items = focusables();
        if (!items.length) { event.preventDefault(); panel.focus(); return; }
        const first = items[0];
        const last = items[items.length - 1];
        if (event.shiftKey && (document.activeElement === first || !panel.contains(document.activeElement))) {
          event.preventDefault(); last.focus();
        } else if (!event.shiftKey && (document.activeElement === last || !panel.contains(document.activeElement))) {
          event.preventDefault(); first.focus();
        }
      }
    };
    document.addEventListener("keydown", onKeyDown);
    requestAnimationFrame(() => (panel?.querySelector<HTMLElement>("[autofocus]") ?? focusables()[0] ?? panel)?.focus());
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [host]);

  if (!open || !host) return null;
  return createPortal(
    <div
      className="modal-backdrop"
      data-modal-backdrop="true"
      onMouseDown={(event) => {
        if (closeOnBackdrop && event.target === event.currentTarget) closeRef.current();
      }}
    >
      <section
        className={`modal-panel ${panelClassName}`}
        role="dialog"
        aria-modal="true"
        aria-label={ariaLabel}
        tabIndex={-1}
      >
        {children}
      </section>
    </div>,
    host
  );
}
