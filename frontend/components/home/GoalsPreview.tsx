"use client";

/**
 * GoalsPreview — Compact goal progress display for Home.
 *
 * Shows up to 3 active/in-progress goals with name, progress bar, and amounts.
 * Full experience lives on the Goals tab.
 *
 * Terminology:
 *   - "Add to Goal" = Available → Protected (goal contribution)
 *   - "Withdraw from Goal" = Protected → Available (internal reallocation)
 *   These are NOT shown here — they live on the Goal detail page.
 */

import React from "react";
import Link from "next/link";
import { Target, ChevronRight } from "lucide-react";

interface Goal {
  id: string;
  name: string;
  target_amount: number;
  current_amount: number;
  locked_amount: number;
  status: string;
}

interface GoalsPreviewProps {
  goals: Goal[];
  formatPesewas: (pesewas: number) => string;
}

export function GoalsPreview({ goals, formatPesewas }: GoalsPreviewProps) {
  const activeGoals = goals.filter(
    (g) => g.status === "ACTIVE" || g.status === "ACHIEVED"
  );

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-4">
      <div className="flex justify-between items-center mb-4">
        <h2 className="font-semibold text-slate-900">Your Goals</h2>
        <Link
          href="/goals"
          className="flex items-center gap-0.5 text-xs text-brand font-medium hover:underline"
        >
          See all <ChevronRight className="w-3.5 h-3.5" />
        </Link>
      </div>

      {activeGoals.length === 0 ? (
        <div className="flex flex-col items-center text-center py-6 gap-3">
          <Target className="w-8 h-8 text-slate-200" />
          <div>
            <p className="text-sm font-medium text-slate-900">No goals yet</p>
            <p className="text-xs text-slate-400 mt-1">
              Protect money for things that matter.
            </p>
          </div>
          <Link
            href="/goals/create"
            className="mt-1 px-4 py-2 bg-brand text-white text-xs font-semibold rounded-xl hover:bg-brand-hover transition-colors"
          >
            Create a goal
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {activeGoals.slice(0, 3).map((goal) => {
            const progress =
              goal.target_amount > 0
                ? Math.min(
                    Math.round((goal.current_amount / goal.target_amount) * 100),
                    100
                  )
                : 0;
            const isAchieved = goal.status === "ACHIEVED";

            return (
              <Link
                key={goal.id}
                href={`/goals/${goal.id}`}
                className="block group"
              >
                <div className="flex justify-between items-center mb-1.5">
                  <span className="text-sm font-semibold text-slate-900 group-hover:text-brand transition-colors">
                    {goal.name}
                  </span>
                  <div className="flex items-center gap-2">
                    {isAchieved && (
                      <span className="text-[10px] font-semibold text-green-600 bg-green-50 px-2 py-0.5 rounded-full">
                        Done
                      </span>
                    )}
                    <span className="text-xs text-slate-500 font-medium">
                      {progress}%
                    </span>
                  </div>
                </div>
                <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-700 ${
                      isAchieved ? "bg-green-500" : "bg-brand"
                    }`}
                    style={{ width: `${progress}%` }}
                  />
                </div>
                <div className="mt-1.5 text-[11px] text-slate-400">
                  {formatPesewas(goal.current_amount)} of{" "}
                  {formatPesewas(goal.target_amount)}
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </section>
  );
}
