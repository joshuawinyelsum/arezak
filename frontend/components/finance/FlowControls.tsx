import React from "react";
import { Check, Info } from "lucide-react";

export function FlowButton({
  children,
  onClick,
  disabled = false,
  type = "button",
  variant = "primary",
  form,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  type?: "button" | "submit";
  variant?: "primary" | "secondary";
  form?: string;
}) {
  return (
    <button
      type={type}
      form={form}
      onClick={onClick}
      disabled={disabled}
      className={`min-h-12 w-full rounded-xl px-4 py-3 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-500 ${variant === "primary" ? "bg-brand text-white hover:bg-brand-hover" : "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"}`}
    >
      {children}
    </button>
  );
}

export function ChoiceCard({
  title,
  description,
  badge,
  selected = false,
  disabled = false,
  onClick,
}: {
  title: string;
  description: string;
  badge?: string;
  selected?: boolean;
  disabled?: boolean;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-pressed={selected}
      className={`flex min-h-[76px] w-full items-center justify-between gap-4 rounded-2xl border p-4 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand disabled:cursor-not-allowed disabled:opacity-70 ${selected ? "border-brand bg-blue-50/60" : "border-slate-200 bg-white hover:border-slate-300"}`}
    >
      <span className="min-w-0">
        <span className="block font-semibold text-slate-900">{title}</span>
        <span className="mt-1 block text-sm leading-snug text-slate-500">{description}</span>
      </span>
      <span className="flex shrink-0 items-center gap-2">
        {badge && <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-slate-600">{badge}</span>}
        {selected && <Check className="h-5 w-5 text-brand" aria-label="Selected" />}
      </span>
    </button>
  );
}

export function FlowNotice({
  children,
  tone = "info",
}: {
  children: React.ReactNode;
  tone?: "info" | "warning";
}) {
  return (
    <div className={`flex items-start gap-3 rounded-xl border p-3 text-sm leading-relaxed ${tone === "warning" ? "border-amber-200 bg-amber-50 text-amber-900" : "border-blue-100 bg-blue-50 text-blue-900"}`} role="note">
      <Info className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
      <div>{children}</div>
    </div>
  );
}

export function FlowField({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
  inputMode,
  autoComplete,
  hint,
  required = true,
  maxLength,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: "text" | "tel";
  inputMode?: "text" | "tel" | "decimal" | "numeric";
  autoComplete?: string;
  hint?: string;
  required?: boolean;
  maxLength?: number;
}) {
  const id = React.useId();
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-sm font-semibold text-slate-800">{label}</label>
      <input
        id={id}
        name={id}
        type={type}
        inputMode={inputMode}
        autoComplete={autoComplete}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        required={required}
        maxLength={maxLength}
        className="min-h-12 w-full scroll-mt-5 rounded-xl border border-slate-300 bg-white px-4 py-3 text-base text-slate-900 placeholder:text-slate-400 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
      />
      {hint && <p className="mt-1.5 text-xs text-slate-500">{hint}</p>}
    </div>
  );
}

export function AmountInput({
  value,
  onChange,
  availableBalance,
}: {
  value: string;
  onChange: (value: string) => void;
  availableBalance?: number;
}) {
  const id = React.useId();
  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between gap-3">
        <label htmlFor={id} className="text-sm font-semibold text-slate-800">Amount</label>
        {availableBalance !== undefined && (
          <span className="text-xs text-slate-500">Available GH₵{(availableBalance / 100).toFixed(2)}</span>
        )}
      </div>
      <div className="relative">
        <span className="pointer-events-none absolute inset-y-0 left-4 flex items-center text-sm font-semibold text-slate-500">GH₵</span>
        <input
          id={id}
          name="amount"
          type="text"
          inputMode="decimal"
          autoComplete="off"
          value={value}
          onChange={(event) => onChange(event.target.value.replace(/[^\d.]/g, ""))}
          placeholder="0.00"
          aria-describedby={`${id}-hint`}
          className="min-h-14 w-full scroll-mt-5 rounded-xl border border-slate-300 bg-white pl-14 pr-4 text-2xl font-semibold tabular-nums text-slate-900 placeholder:text-slate-300 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
        />
      </div>
      <p id={`${id}-hint`} className="mt-1.5 text-xs text-slate-500">Enter cedis and pesewas, for example 25.50.</p>
    </div>
  );
}

export function ReviewRows({ rows }: { rows: { label: string; value: React.ReactNode; strong?: boolean }[] }) {
  return (
    <dl className="divide-y divide-slate-100 rounded-2xl border border-slate-200 bg-white px-4">
      {rows.map((row) => (
        <div key={row.label} className="flex items-start justify-between gap-4 py-3.5">
          <dt className="text-sm text-slate-500">{row.label}</dt>
          <dd className={`max-w-[65%] break-words text-right text-sm ${row.strong ? "font-semibold text-slate-900" : "font-medium text-slate-700"}`}>{row.value}</dd>
        </div>
      ))}
    </dl>
  );
}
