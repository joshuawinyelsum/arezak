import React from "react";
import { ArrowLeft, X } from "lucide-react";

export function FlowHeader({
  title,
  stepLabel,
  onBack,
  onClose,
}: {
  title: string;
  stepLabel: string;
  onBack?: () => void;
  onClose: () => void;
}) {
  return (
    <header className="flex shrink-0 items-center gap-3 border-b border-slate-100 px-5 pt-[calc(env(safe-area-inset-top,0px)+1rem)] pb-4 sm:px-6 sm:pt-4">
      {onBack ? (
        <button
          type="button"
          onClick={onBack}
          aria-label="Go back"
          className="grid h-11 w-11 shrink-0 place-items-center rounded-xl text-slate-600 hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
        >
          <ArrowLeft className="h-5 w-5" aria-hidden="true" />
        </button>
      ) : (
        <span className="w-11 shrink-0" aria-hidden="true" />
      )}
      <div className="min-w-0 flex-1">
        <h2 id="financial-flow-title" className="truncate text-lg font-bold text-slate-900">{title}</h2>
        <p className="text-xs text-slate-500">{stepLabel}</p>
      </div>
      <button
        type="button"
        onClick={onClose}
        aria-label="Close flow"
        className="grid h-11 w-11 shrink-0 place-items-center rounded-xl text-slate-500 hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
      >
        <X className="h-5 w-5" aria-hidden="true" />
      </button>
    </header>
  );
}
