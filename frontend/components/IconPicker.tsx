"use client";

import React, { useState, useMemo } from "react";
import * as LucideIcons from "lucide-react";
import { Search, X } from "lucide-react";
import { cn } from "@/lib/utils";

const ICON_GROUPS = [
  {
    name: "Popular",
    icons: ["Target", "Heart", "Star", "Flame", "Zap", "CheckCircle", "ThumbsUp", "Award"]
  },
  {
    name: "Finance & Wealth",
    icons: ["Wallet", "Banknote", "Coins", "CreditCard", "PiggyBank", "TrendingUp", "Landmark", "Briefcase", "Gem", "Building", "PieChart", "BarChart"]
  },
  {
    name: "Travel & Transport",
    icons: ["Plane", "Car", "Bus", "Train", "Bike", "Ship", "Navigation", "Map", "Globe", "Luggage", "Ticket", "Palmtree", "Hotel", "Compass"]
  },
  {
    name: "Technology & Devices",
    icons: ["Laptop", "Smartphone", "Tablet", "Monitor", "Headphones", "Camera", "Watch", "Tv", "Gamepad", "Speaker", "Wifi", "Battery", "Cpu"]
  },
  {
    name: "Home & Lifestyle",
    icons: ["Home", "Sofa", "Bed", "Coffee", "Utensils", "Shirt", "ShoppingBag", "ShoppingCart", "Gift", "Music", "Umbrella", "Smile", "Sun", "Moon"]
  },
  {
    name: "Health & Fitness",
    icons: ["Activity", "Dumbbell", "HeartPulse", "Apple", "Stethoscope", "Cross", "Pill", "Medal", "Timer"]
  },
  {
    name: "Education & Learning",
    icons: ["GraduationCap", "Book", "BookOpen", "Library", "PenTool", "Microscope", "Calculator", "Lightbulb", "FileText"]
  },
  {
    name: "People & Family",
    icons: ["User", "Users", "Baby", "PersonStanding", "UserCircle", "Contact"]
  },
  {
    name: "Security & Tools",
    icons: ["Shield", "Key", "Lock", "Unlock", "Tool", "Hammer", "Wrench", "Settings", "Sliders"]
  }
];

const ALL_ICONS = Array.from(new Set(ICON_GROUPS.flatMap(g => g.icons)));

type IconPickerProps = {
  value: string;
  onChange: (iconName: string) => void;
  isOpen: boolean;
  onClose: () => void;
};

export function IconPicker({ value, onChange, isOpen, onClose }: IconPickerProps) {
  const [searchTerm, setSearchTerm] = useState("");

  const filteredGroups = useMemo(() => {
    if (!searchTerm) return ICON_GROUPS;
    const lowerTerm = searchTerm.toLowerCase();
    
    // Also search all lucide icons if there's a search term, to allow discovering unlisted ones
    const allLucideKeys = Object.keys(LucideIcons).filter(k => 
      k !== "createLucideIcon" && 
      k !== "default" && 
      !k.endsWith("Icon") &&
      k.toLowerCase().includes(lowerTerm)
    ).slice(0, 50); // Limit to 50 results for performance

    return [
      {
        name: "Search Results",
        icons: allLucideKeys
      }
    ];
  }, [searchTerm]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-slate-900/50 backdrop-blur-sm p-0 sm:p-4 animate-in fade-in">
      <div className="bg-white w-full sm:w-[500px] h-[85vh] sm:h-[600px] sm:max-h-[85vh] rounded-t-[32px] sm:rounded-[24px] shadow-xl flex flex-col overflow-hidden animate-in slide-in-from-bottom-8 sm:slide-in-from-bottom-0 sm:zoom-in-95">
        
        {/* Header */}
        <div className="p-4 sm:p-6 border-b border-slate-100 flex items-center justify-between bg-white shrink-0">
          <h2 className="text-xl font-bold text-slate-900">Choose an icon</h2>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Search */}
        <div className="px-4 sm:px-6 py-4 border-b border-slate-100 shrink-0">
          <div className="relative">
            <Search className="w-5 h-5 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input 
              type="text"
              placeholder="Search icons (e.g., 'laptop', 'travel')..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand/20 transition-all"
            />
            {searchTerm && (
              <button 
                onClick={() => setSearchTerm("")}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-8">
          {filteredGroups.map(group => {
            if (group.icons.length === 0) return null;
            
            return (
              <div key={group.name}>
                <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-3 px-1">{group.name}</h3>
                <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
                  {group.icons.map(iconName => {
                    const IconComp = (LucideIcons as any)[iconName];
                    if (!IconComp) return null;
                    
                    const isSelected = value === iconName;
                    
                    return (
                      <button
                        key={iconName}
                        onClick={() => {
                          onChange(iconName);
                          onClose();
                        }}
                        className={cn(
                          "aspect-square flex flex-col items-center justify-center rounded-2xl transition-all border-2",
                          isSelected 
                            ? "bg-brand/10 border-brand text-brand" 
                            : "bg-white border-slate-100 text-slate-600 hover:border-slate-200 hover:bg-slate-50"
                        )}
                        title={iconName}
                      >
                        <IconComp className={cn("w-6 h-6", isSelected ? "opacity-100" : "opacity-80")} />
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
          
          {filteredGroups.length === 1 && filteredGroups[0].icons.length === 0 && (
            <div className="text-center py-10 text-slate-400">
              <Search className="w-10 h-10 mx-auto mb-3 opacity-20" />
              <p>No icons found for &quot;{searchTerm}&quot;</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
