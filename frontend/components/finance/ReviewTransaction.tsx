import React from "react";
import { FlowNotice, ReviewRows } from "./FlowControls";

export function ReviewTransaction({
  rows,
  notice,
}: {
  rows: { label: string; value: React.ReactNode; strong?: boolean }[];
  notice: string;
}) {
  return (
    <div className="space-y-4">
      <p className="text-sm leading-relaxed text-slate-600">Check the details below before you continue.</p>
      <ReviewRows rows={rows} />
      <FlowNotice tone="warning">{notice}</FlowNotice>
    </div>
  );
}
