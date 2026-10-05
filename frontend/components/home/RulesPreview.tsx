"use client";

/**
 * RulesPreview — Compact display of active money rules on Home.
 *
 * Rules are a core Arezak differentiator. This section communicates that
 * Arezak can actively control money, not just track it.
 *
 * If the Rules API is unavailable, shows an honest empty state that
 * communicates the future capability without pretending it is functional.
 *
 * Rules data will eventually come from GET /api/v1/rules.
 * That API does not exist yet — this component accepts an optional `rules`
 * prop and degrades gracefully to an empty state.
 */

import React from "react";
import Link from "next/link";
import { SlidersHorizontal, ChevronRight, CheckCircle2 } from "lucide-react";

export interface Rule {
  id: string;
  name: string;
  description?: string;
  is_active: boolean;
}

interface RulesPreviewProps {
  rules: Rule[];
}

export function RulesPreview({ rules }: RulesPreviewProps) {
  const activeRules = rules.filter((r) => r.is_active);

  return (
    <section className="bg-card border border-border rounded-[24px] p-5 shadow-sm">
      <div className="flex justify-between items-center mb-4">
        <h2 className="font-semibold text-foreground">Money Rules</h2>
        <Link
          href="/rules"
          className="flex items-center gap-0.5 text-xs text-brand font-medium hover:underline"
        >
          Manage <ChevronRight className="w-3.5 h-3.5" />
        </Link>
      </div>

      {activeRules.length === 0 ? (
        <div className="flex flex-col items-center text-center py-5 gap-3">
          <SlidersHorizontal className="w-7 h-7 text-muted-foreground/20" />
          <div>
            <p className="text-sm font-medium text-foreground">No active rules</p>
            <p className="text-xs text-muted-foreground mt-1 max-w-[180px] mx-auto">
              Automatically organise your money as it comes in.
            </p>
          </div>
          <Link
            href="/rules"
            className="text-xs text-brand font-semibold hover:underline"
          >
            Set up a rule →
          </Link>
        </div>
      ) : (
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground mb-3">
            {activeRules.length} active rule{activeRules.length !== 1 ? "s" : ""}
          </p>
          {activeRules.slice(0, 3).map((rule) => (
            <div
              key={rule.id}
              className="flex items-center gap-3 py-1"
            >
              <CheckCircle2 className="w-4 h-4 text-success-foreground shrink-0" />
              <span className="text-sm text-card-foreground font-medium">
                {rule.name}
              </span>
            </div>
          ))}
          {activeRules.length > 3 && (
            <Link
              href="/rules"
              className="block text-xs text-brand font-medium mt-2 hover:underline"
            >
              +{activeRules.length - 3} more rules
            </Link>
          )}
        </div>
      )}
    </section>
  );
}

