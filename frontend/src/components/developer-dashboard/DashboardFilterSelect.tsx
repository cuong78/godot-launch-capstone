import React, { useEffect, useId, useRef, useState } from "react";
import { Check, ChevronDown, SlidersHorizontal } from "lucide-react";

type FilterTone = "neutral" | "info" | "success" | "warning" | "danger";

export interface DashboardFilterOption<T extends string> {
  value: T;
  label: string;
  tone?: FilterTone;
}

interface DashboardFilterSelectProps<T extends string> {
  label: string;
  value: T;
  options: DashboardFilterOption<T>[];
  onChange: (value: T) => void;
  align?: "left" | "right";
}

const toneClasses: Record<FilterTone, string> = {
  neutral: "bg-slate-400 dark:bg-slate-500",
  info: "bg-sky-500",
  success: "bg-emerald-500",
  warning: "bg-amber-400",
  danger: "bg-rose-500",
};

export function DashboardFilterSelect<T extends string>({
  label,
  value,
  options,
  onChange,
  align = "right",
}: DashboardFilterSelectProps<T>) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const menuId = useId();
  const selectedOption =
    options.find((option) => option.value === value) ?? options[0];

  useEffect(() => {
    if (!isOpen) return;

    const handlePointerDown = (event: MouseEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  return (
    <div ref={containerRef} className="relative min-w-0">
      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-controls={menuId}
        onClick={() => setIsOpen((open) => !open)}
        className={`flex min-h-11 w-full min-w-0 items-center gap-3 rounded-[10px] border px-3.5 text-left transition-[background-color,border-color,color] duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500/35 sm:w-auto sm:min-w-[210px] ${
          isOpen
            ? "border-sky-500/40 bg-sky-500/[0.06] text-slate-950 dark:border-sky-400/35 dark:bg-sky-400/[0.07] dark:text-white"
            : "border-slate-200 bg-white text-slate-800 hover:border-slate-300 hover:bg-slate-50 dark:border-slate-700/80 dark:bg-[#0c121a] dark:text-slate-200 dark:hover:border-slate-600 dark:hover:bg-slate-800/55"
        }`}
      >
        <SlidersHorizontal
          size={16}
          strokeWidth={1.8}
          className="shrink-0 text-slate-400 dark:text-slate-500"
          aria-hidden="true"
        />
        <span className="min-w-0 flex-1">
          <span className="block text-[10px] font-semibold uppercase tracking-[0.1em] text-slate-400 dark:text-slate-500">
            {label.replace(/:$/, "")}
          </span>
          <span className="mt-0.5 flex items-center gap-2 truncate text-sm font-semibold">
            <span
              className={`h-1.5 w-1.5 shrink-0 rounded-full ${
                toneClasses[selectedOption?.tone ?? "neutral"]
              }`}
            />
            <span className="truncate">{selectedOption?.label}</span>
          </span>
        </span>
        <ChevronDown
          size={16}
          className={`shrink-0 text-slate-400 transition-transform duration-150 ${
            isOpen ? "rotate-180" : ""
          }`}
          aria-hidden="true"
        />
      </button>

      {isOpen && (
        <div
          id={menuId}
          role="listbox"
          aria-label={label}
          className={`absolute top-[calc(100%+8px)] z-50 w-[min(320px,calc(100vw-2.5rem))] overflow-hidden rounded-xl border border-slate-200 bg-white p-1.5 dark:border-slate-700/80 dark:bg-[#101720] ${
            align === "right" ? "right-0" : "left-0"
          }`}
        >
          {options.map((option) => {
            const isSelected = option.value === value;
            return (
              <button
                key={option.value}
                type="button"
                role="option"
                aria-selected={isSelected}
                onClick={() => {
                  onChange(option.value);
                  setIsOpen(false);
                }}
                className={`flex min-h-10 w-full items-center gap-3 rounded-lg px-3 text-left text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-sky-500/40 ${
                  isSelected
                    ? "bg-sky-500/10 font-semibold text-sky-700 dark:bg-sky-400/10 dark:text-sky-300"
                    : "text-slate-600 hover:bg-slate-100 hover:text-slate-950 dark:text-slate-300 dark:hover:bg-slate-800/70 dark:hover:text-white"
                }`}
              >
                <span
                  className={`h-2 w-2 shrink-0 rounded-full ${
                    toneClasses[option.tone ?? "neutral"]
                  }`}
                />
                <span className="min-w-0 flex-1 truncate">{option.label}</span>
                <Check
                  size={15}
                  className={isSelected ? "opacity-100" : "opacity-0"}
                  aria-hidden="true"
                />
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
