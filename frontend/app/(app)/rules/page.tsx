"use client";

import React from "react";
import { SlidersHorizontal, Shield, ArrowDownLeft, LockKeyhole, ArrowRight, CircleDot } from "lucide-react";

export default function RulesPage() {
  return <div className="page-frame rules-page pb-12">
    <header className="page-heading"><div><p className="page-eyebrow">YOUR FINANCIAL CONTROL / RULES</p><h1>Rules</h1><p>Decisions you make. Boundaries Arezak keeps.</p></div><button disabled className="action-button disabled-action" title="Rule creation is unavailable until the rules API is ready">New rule</button></header>

    <section className="rules-intro module"><div className="rules-intro-icon"><SlidersHorizontal size={22} /></div><div><p className="section-kicker">YOUR MONEY, ON YOUR TERMS</p><h2>Put your decisions to work.</h2><p>Rules define how money is organized and what stays protected. Arezak applies your constraints as money moves.</p></div><span className="rules-coming">IN DEVELOPMENT</span></section>

    <section className="rules-empty module">
      <div className="rules-flow" aria-label="A rule connects an event, a condition, and an action"><div className="flow-node"><span><ArrowDownLeft size={18} /></span><b>WHEN</b><small>Money moves</small></div><div className="flow-link" aria-hidden="true" /><div className="flow-node"><span><CircleDot size={18} /></span><b>CHECK</b><small>Your conditions</small></div><div className="flow-link" aria-hidden="true" /><div className="flow-node"><span><LockKeyhole size={18} /></span><b>THEN</b><small>Protect your intent</small></div></div>
      <div className="rules-empty-copy"><h2>Your rules, in one place.</h2><p>The rules API is not available yet, so rule creation and management are currently disabled. Existing account and goal protections continue to be enforced by Arezak.</p><span className="rules-availability"><i /> Rule management unavailable</span></div>
    </section>

    <div className="rules-principle"><span className="section-kicker">HOW RULES WORK</span><p className="rules-principle-copy"><Shield size={16} /> A rule links an event to your condition and the money action Arezak should enforce. <ArrowRight size={15} /></p></div>
  </div>;
}
