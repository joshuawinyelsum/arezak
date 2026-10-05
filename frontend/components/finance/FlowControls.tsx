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
      className={`min-h-12 w-full rounded-xl px-4 py-3 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:bg-muted-foreground/20 disabled:text-muted-foreground ${variant === "primary" ? "bg-brand text-white hover:bg-brand-hover" : "border border-border bg-card text-card-foreground hover:bg-muted"}`}
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
      className={`flex min-h-[76px] w-full items-center justify-between gap-4 rounded-2xl border p-4 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand disabled:cursor-not-allowed disabled:opacity-70 ${selected ? "border-brand bg-blue-50/60" : "border-border bg-card hover:border-border"}`}
    >
      <span className="min-w-0">
        <span className="block font-semibold text-foreground">{title}</span>
        <span className="mt-1 block text-sm leading-snug text-muted-foreground">{description}</span>
      </span>
      <span className="flex shrink-0 items-center gap-2">
        {badge && <span className="rounded-full bg-input px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">{badge}</span>}
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
      <label htmlFor={id} className="mb-1.5 block text-sm font-semibold text-foreground">{label}</label>
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
        className="min-h-12 w-full scroll-mt-5 rounded-xl border border-border bg-card px-4 py-3 text-base text-foreground placeholder:text-muted-foreground focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
      />
      {hint && <p className="mt-1.5 text-xs text-muted-foreground">{hint}</p>}
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
        <label htmlFor={id} className="text-sm font-semibold text-foreground">Amount</label>
        {availableBalance !== undefined && (
          <span className="text-xs text-muted-foreground">Available GH₵{(availableBalance / 100).toFixed(2)}</span>
        )}
      </div>
      <div className="relative">
        <span className="pointer-events-none absolute inset-y-0 left-4 flex items-center text-sm font-semibold text-muted-foreground">GH₵</span>
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
          className="min-h-14 w-full scroll-mt-5 rounded-xl border border-border bg-card pl-14 pr-4 text-2xl font-semibold tabular-nums text-foreground placeholder:text-muted-foreground/30 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
        />
      </div>
      <p id={`${id}-hint`} className="mt-1.5 text-xs text-muted-foreground">Enter cedis and pesewas, for example 25.50.</p>
    </div>
  );
}

export function ReviewRows({ rows }: { rows: { label: string; value: React.ReactNode; strong?: boolean }[] }) {
  return (
    <dl className="divide-y divide-slate-100 rounded-2xl border border-border bg-card px-4">
      {rows.map((row) => (
        <div key={row.label} className="flex items-start justify-between gap-4 py-3.5">
          <dt className="text-sm text-muted-foreground">{row.label}</dt>
          <dd className={`max-w-[65%] break-words text-right text-sm ${row.strong ? "font-semibold text-foreground" : "font-medium text-card-foreground"}`}>{row.value}</dd>
        </div>
      ))}
    </dl>
  );
}

