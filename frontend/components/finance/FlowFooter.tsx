import React from "react";

export function FlowFooter({
  children,
  hint,
}: {
  children: React.ReactNode;
  hint?: string;
}) {
  return (
    <footer className="shrink-0 border-t border-slate-100 bg-white px-5 pt-3 pb-[calc(env(safe-area-inset-bottom,0px)+1rem)] sm:px-6">
      {hint && <p className="mb-2 text-center text-xs text-slate-500">{hint}</p>}
      {children}
    </footer>
  );
}
