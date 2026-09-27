"use client";

/**
 * PayAndBuy — Everyday financial services grid.
 *
 * This is a configuration-driven surface. New services are added to the
 * SERVICE_REGISTRY array below — no Home page redesign needed.
 *
 * Each service has a `status`:
 *   "available"   → fully functional (real backend integration)
 *   "coming_soon" → not yet implemented; shows clear visual indicator
 *   "sandbox"     → simulated only; shows "Sandbox" badge
 *
 * IMPORTANT: Never mark a service "available" unless the backend
 * integration is real. Never simulate a successful transaction for
 * "coming_soon" services.
 */

import React from "react";
import { Phone, Wifi, Zap, Droplets, Tv, GraduationCap, QrCode, Store } from "lucide-react";

type ServiceStatus = "available" | "coming_soon" | "sandbox";

interface Service {
  key: string;
  label: string;
  icon: React.ElementType;
  status: ServiceStatus;
  color: string;
  bg: string;
}

// ── Service registry — add new services here ─────────────────────────────────
// Backend integrations do not exist yet. All marked coming_soon.
const SERVICE_REGISTRY: Service[] = [
  {
    key: "airtime",
    label: "Airtime",
    icon: Phone,
    status: "coming_soon",
    color: "text-red-500",
    bg: "bg-red-50",
  },
  {
    key: "data",
    label: "Data",
    icon: Wifi,
    status: "coming_soon",
    color: "text-blue-500",
    bg: "bg-blue-50",
  },
  {
    key: "electricity",
    label: "Electricity",
    icon: Zap,
    status: "coming_soon",
    color: "text-yellow-500",
    bg: "bg-yellow-50",
  },
  {
    key: "water",
    label: "Water",
    icon: Droplets,
    status: "coming_soon",
    color: "text-cyan-500",
    bg: "bg-cyan-50",
  },
  {
    key: "tv",
    label: "TV / Cable",
    icon: Tv,
    status: "coming_soon",
    color: "text-purple-500",
    bg: "bg-purple-50",
  },
  {
    key: "school",
    label: "School Fees",
    icon: GraduationCap,
    status: "coming_soon",
    color: "text-green-600",
    bg: "bg-green-50",
  },
  {
    key: "merchant",
    label: "Merchant",
    icon: Store,
    status: "coming_soon",
    color: "text-orange-500",
    bg: "bg-orange-50",
  },
  {
    key: "qr",
    label: "QR Pay",
    icon: QrCode,
    status: "coming_soon",
    color: "text-slate-600",
    bg: "bg-slate-100",
  },
];

// Visible by default (rest hidden behind "More")
const VISIBLE_COUNT = 5;

interface PayAndBuyProps {
  onServiceTap?: (key: string) => void;
}

export function PayAndBuy({ onServiceTap }: PayAndBuyProps) {
  const visible = SERVICE_REGISTRY.slice(0, VISIBLE_COUNT);
  const hasMore = SERVICE_REGISTRY.length > VISIBLE_COUNT;

  const handleTap = (service: Service) => {
    if (service.status === "available" && onServiceTap) {
      onServiceTap(service.key);
    }
    // coming_soon and sandbox services: do nothing (no fake success)
  };

  return (
    <section>
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-semibold text-slate-900 text-base">Pay & Buy</h2>
        <span className="text-[10px] font-semibold text-white bg-slate-400 px-2 py-0.5 rounded-full uppercase tracking-wider">
          Coming soon
        </span>
      </div>

      <div className="grid grid-cols-5 gap-2 md:gap-3">
        {visible.map((service) => (
          <button
            key={service.key}
            onClick={() => handleTap(service)}
            // Visually inactive for coming_soon — clear non-interactive appearance
            className={`flex flex-col items-center gap-2 p-3 rounded-2xl border transition-all ${
              service.status === "available"
                ? "bg-white border-slate-200 hover:border-brand/30 hover:shadow-sm cursor-pointer"
                : "bg-slate-50 border-slate-100 opacity-60 cursor-default"
            }`}
            tabIndex={service.status === "available" ? 0 : -1}
            aria-disabled={service.status !== "available"}
          >
            <div
              className={`w-9 h-9 rounded-full flex items-center justify-center ${service.bg}`}
            >
              <service.icon className={`w-4 h-4 ${service.color}`} />
            </div>
            <div className="text-[10px] font-medium text-slate-600 leading-tight text-center">
              {service.label}
            </div>
          </button>
        ))}

        {/* "More" tile — leads to full services screen (future) */}
        {hasMore && (
          <div className="flex flex-col items-center gap-2 p-3 rounded-2xl bg-slate-50 border border-slate-100 opacity-60">
            <div className="w-9 h-9 rounded-full bg-slate-200 flex items-center justify-center">
              <span className="text-slate-500 text-xs font-bold">+{SERVICE_REGISTRY.length - VISIBLE_COUNT}</span>
            </div>
            <div className="text-[10px] font-medium text-slate-500 leading-tight text-center">
              More
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
