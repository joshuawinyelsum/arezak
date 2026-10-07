"use client";

import React from "react";
import { SlidersHorizontal, ArrowDownLeft, LockKeyhole, CircleDot } from "lucide-react";

export default function RulesPage() {
  return <div className="page-frame rules-page pb-12">
    <header className="page-heading"><div><h1>Rules</h1></div><button disabled className="action-button disabled-action" title="Rule creation is unavailable until the rules API is ready">New rule</button></header>

    <section className="rules-empty module">
      <div className="rules-flow" aria-label="A rule connects an event, a condition, and an action"><div className="flow-node"><span><ArrowDownLeft size={18} /></span><b>WHEN</b><small>Money moves</small></div><div className="flow-link" aria-hidden="true" /><div className="flow-node"><span><CircleDot size={18} /></span><b>CHECK</b><small>Your conditions</small></div><div className="flow-link" aria-hidden="true" /><div className="flow-node"><span><LockKeyhole size={18} /></span><b>THEN</b><small>Protect your intent</small></div></div>
      <div className="rules-empty-copy"><h2>Rule management unavailable</h2><p>Rules can’t be created or changed yet. Account and goal constraints remain in effect.</p></div>
    </section>
  </div>;
}
