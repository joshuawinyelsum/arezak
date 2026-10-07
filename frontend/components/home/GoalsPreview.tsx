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
import { Icon } from "@/components/Icon";

interface Goal {
  id: string;
  name: string;
  target_amount: number;
  current_amount: number;
  locked_amount: number;
  status: string;
  icon?: string;
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
    <section className="goals-preview" aria-labelledby="goals-preview-title">
      <div className="goals-preview-heading">
        <div><h2 id="goals-preview-title">Goals</h2></div>
        <Link
          href="/goals"
          className="text-link"
        >
          See all <ChevronRight className="w-3.5 h-3.5" />
        </Link>
      </div>

      {activeGoals.length === 0 ? (
        <div className="goals-preview-empty">
          <Target className="w-5 h-5" aria-hidden="true" />
          <div>
            <p className="text-sm font-medium text-foreground">No goals yet</p>
            <p className="text-xs text-muted-foreground mt-1">No money is protected for goals yet.</p>
          </div>
          <Link
            href="/goals/create"
            className="text-link"
          >
            Create a goal
          </Link>
        </div>
      ) : (
        <div className="goal-lines">
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
                className="goal-line group"
              >
                <span className="goal-symbol" aria-hidden="true"><Icon name={goal.icon || "Target"} width={25} height={25} strokeWidth={2} /></span>
                <span className="goal-line-content">
                  <span className="goal-line-top">
                    <span className="goal-name">{goal.name}</span>
                    {isAchieved && <span className="goal-completed">Completed</span>}
                    <ChevronRight className="goal-chevron" size={17} aria-hidden="true" />
                  </span>
                  <span className="goal-line-amount">
                    {formatPesewas(goal.current_amount).replace(/\.00$/, "")} <span>/ {formatPesewas(goal.target_amount).replace(/\.00$/, "")}</span>
                  </span>
                  <span className="goal-progress-row">
                    <span className="goal-track" role="progressbar" aria-label={`${goal.name} progress`} aria-valuenow={progress} aria-valuemin={0} aria-valuemax={100}>
                      <span className={`goal-fill ${isAchieved ? "is-achieved" : ""}`} style={{ width: `${progress}%` }} />
                    </span>
                    <span className="goal-percent">{progress}%</span>
                  </span>
                </span>
              </Link>
            );
          })}
        </div>
      )}
    </section>
  );
}

