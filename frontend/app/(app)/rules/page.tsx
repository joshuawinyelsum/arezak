"use client";

/**
 * Rules page — Arezak's financial automation layer.
 *
 * Rules are Arezak's core differentiator: money that gets automatically
 * organised as it comes in.
 *
 * CURRENT STATE: The Rules API does not exist yet.
 * There is no GET /rules endpoint. The AllocationRule model exists in the
 * database but has no API surface for reading or creating rules.
 *
 * WHAT THIS PAGE MUST NOT DO:
 *   - Show fake hardcoded rule data (destroys trust)
 *   - Show a "Create rule" flow that doesn't connect to a backend
 *   - Expose rule_id, trigger_type, action_type, or other internal fields
 *
 * WHAT THIS PAGE DOES:
 *   - Shows an honest empty state that communicates the feature's value
 *   - Architectures the page so it's ready to accept Rule[] from the API
 *   - Shows a "Coming soon" indicator instead of pretending the feature is live
 *
 * MISSING BACKEND CONTRACTS (required before this page becomes functional):
 *   - GET  /api/v1/rules              — list user's active rules
 *   - POST /api/v1/rules              — create a new rule
 *   - PUT  /api/v1/rules/{id}         — update a rule
 *   - DELETE /api/v1/rules/{id}       — remove a rule
 *   - GET  /api/v1/rules/templates    — available rule types/templates
 *
 * Rule user-facing model (NOT the DB model):
 *   name:        "Protect school fees"
 *   trigger:     "Every time money enters my account"
 *   action:      "Protect 20% in my School goal"
 *   is_active:   true
 */

import React from "react";
import { SlidersHorizontal, Zap, Shield, ArrowDownLeft } from "lucide-react";

// Rule type — mirrors what the future API will return (not the backend DB schema)
interface Rule {
  id: string;
  name: string;
  summary: string; // human-readable one-liner e.g. "Protect 20% for School on every income"
  is_active: boolean;
}

// Placeholder: empty until GET /rules API exists
const API_RULES: Rule[] = [];

// What rules will look like — shown as educational examples, clearly not functional
const RULE_TEMPLATES = [
  {
    icon: ArrowDownLeft,
    bg: "bg-green-50",
    color: "text-green-600",
    name: "Income Allocation",
    description: "Every time money enters, automatically protect a portion toward a goal.",
  },
  {
    icon: Shield,
    bg: "bg-blue-50",
    color: "text-blue-600",
    name: "Spending Guard",
    description: "Prevent spending below a minimum available balance.",
  },
  {
    icon: Zap,
    bg: "bg-amber-50",
    color: "text-amber-600",
    name: "Auto-save",
    description: "Protect a fixed amount on a schedule — weekly or monthly.",
  },
];

export default function RulesPage() {
  const rules = API_RULES; // Replace with useEffect + apiFetch when API exists
  const activeRules = rules.filter((r) => r.is_active);

  return (
    <div className="w-full max-w-3xl mx-auto space-y-5 animate-in fade-in duration-500 pb-12">

      {/* Header */}
      <header className="flex justify-between items-center py-2">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-slate-900">
            Money Rules
          </h1>
          <p className="text-sm text-slate-400 mt-0.5">
            Automatic rules that organise your money.
          </p>
        </div>
        {/* Create rule button — disabled until API exists */}
        <button
          disabled
          className="px-4 py-2 bg-slate-100 text-slate-400 text-sm font-semibold rounded-xl cursor-not-allowed"
          title="Rule creation coming soon"
        >
          + New Rule
        </button>
      </header>

      {/* API not yet available — honest banner */}
      <div className="bg-amber-50 border border-amber-100 rounded-2xl p-4 flex items-start gap-3">
        <SlidersHorizontal className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-semibold text-amber-900">Rules are coming soon</p>
          <p className="text-xs text-amber-700 mt-0.5">
            The rules engine is being built. When ready, you will be able to set
            up automatic financial rules here.
          </p>
        </div>
      </div>

      {/* Active rules — empty for now, ready when API is wired */}
      {activeRules.length > 0 ? (
        <div className="space-y-3">
          {activeRules.map((rule) => (
            <div
              key={rule.id}
              className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm flex items-center justify-between"
            >
              <div>
                <p className="font-semibold text-slate-900 text-sm">{rule.name}</p>
                <p className="text-xs text-slate-400 mt-0.5">{rule.summary}</p>
              </div>
              <div className="w-2 h-2 rounded-full bg-green-500 shrink-0" />
            </div>
          ))}
        </div>
      ) : (
        /* Empty state — no rules yet */
        <div className="bg-white border border-slate-100 rounded-[24px] p-8 flex flex-col items-center text-center shadow-sm">
          <div className="w-14 h-14 rounded-full bg-slate-50 flex items-center justify-center mb-4">
            <SlidersHorizontal className="w-7 h-7 text-slate-300" />
          </div>
          <h2 className="text-base font-semibold text-slate-900">No rules yet</h2>
          <p className="text-sm text-slate-400 mt-1 max-w-xs">
            Rules tell Arezak how to automatically organise your money every
            time something happens — like income arriving.
          </p>
        </div>
      )}

      {/* Rule template previews — educational, clearly marked as preview */}
      <div>
        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3 px-1">
          What you&apos;ll be able to do
        </p>
        <div className="space-y-2.5">
          {RULE_TEMPLATES.map((template) => (
            <div
              key={template.name}
              className="bg-white border border-slate-100 rounded-2xl p-4 flex items-center gap-4 opacity-60"
            >
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${template.bg}`}
              >
                <template.icon className={`w-5 h-5 ${template.color}`} />
              </div>
              <div className="min-w-0">
                <p className="font-semibold text-sm text-slate-900">{template.name}</p>
                <p className="text-xs text-slate-500 mt-0.5 truncate">
                  {template.description}
                </p>
              </div>
              <span className="text-[10px] font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full uppercase tracking-wider shrink-0 ml-auto">
                Soon
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
