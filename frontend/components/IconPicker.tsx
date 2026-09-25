"use client";

import React, { useState, useMemo } from "react";
import { ICON_GROUPS } from "@/lib/icon-map";
import { Search, X } from "lucide-react";
import dynamicIconImports from 'lucide-react/dynamicIconImports';
import { cn } from "@/lib/utils";
import { Icon } from "./Icon";

type IconPickerProps = {
  value: string;
  onChange: (iconName: string) => void;
  isOpen: boolean;
  onClose: () => void;
};

// Convert kebab-case to PascalCase
const toPascal = (str: string) => str.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join('');

export function IconPicker({ value, onChange, isOpen, onClose }: IconPickerProps) {
  const [searchTerm, setSearchTerm] = useState("");

  const filteredGroups = useMemo(() => {
    if (!searchTerm) return ICON_GROUPS;
    const lowerTerm = searchTerm.toLowerCase();
    
    // Search all dynamic imports by generating PascalCase names
    const allLucideKeys = Object.keys(dynamicIconImports)
      .filter(k => k.includes(lowerTerm) || k.replace(/-/g, '').includes(lowerTerm))
      .slice(0, 50)
      .map(toPascal);
      
    return [{ name: "Search Results", icons: allLucideKeys }];
  }, [searchTerm]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-slate-900/50 backdrop-blur-sm p-0 sm:p-4 animate-in fade-in">
      <div className="bg-white w-full sm:w-[500px] h-[85vh] sm:h-[600px] sm:max-h-[85vh] rounded-t-[32px] sm:rounded-[24px] shadow-xl flex flex-col overflow-hidden animate-in slide-in-from-bottom-8 sm:slide-in-from-bottom-0 sm:zoom-in-95">
        
        {/* Header */}
        <div className="p-4 sm:p-6 border-b border-slate-100 flex items-center justify-between shrink-0">
          <div>
            <h3 className="text-lg font-bold text-slate-900">Choose Icon</h3>
            <p className="text-sm text-slate-500">Select an icon for your goal</p>
          </div>
          <button 
            onClick={onClose}
            className="p-2 rounded-full hover:bg-slate-100 text-slate-500 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search */}
        <div className="p-4 sm:p-6 border-b border-slate-100 shrink-0">
          <div className="relative">
            <Search className="w-5 h-5 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input 
              type="text"
              placeholder="Search icons..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-11 pr-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand transition-all"
            />
          </div>
        </div>

        {/* Grid */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-8">
          {filteredGroups.map(group => (
            <div key={group.name} className="space-y-3">
              <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">{group.name}</h4>
              <div className="grid grid-cols-4 sm:grid-cols-5 gap-2 sm:gap-3">
                {group.icons.map(iconName => (
                  <button
                    key={iconName}
                    onClick={() => {
                      onChange(iconName);
                      onClose();
                    }}
                    className={cn(
                      "aspect-square rounded-xl sm:rounded-2xl flex items-center justify-center transition-all duration-200",
                      value === iconName 
                        ? "bg-brand text-white shadow-md shadow-brand/20 scale-105" 
                        : "bg-slate-50 text-slate-600 hover:bg-slate-100 hover:scale-105"
                    )}
                  >
                    <Icon name={iconName} className="w-6 h-6 sm:w-7 sm:h-7" />
                  </button>
                ))}
              </div>
            </div>
          ))}

          {filteredGroups.length === 0 && (
            <div className="text-center py-12">
              <p className="text-slate-500 text-sm">No icons found for &quot;{searchTerm}&quot;</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

