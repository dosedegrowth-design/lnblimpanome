/**
 * Bits de UI reutilizaveis para listagens em tabela.
 * Inspirado no padrao "Aguardando · 22 / Reprovados · 57 / Aprovados · 19".
 */
"use client";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

// ───────────────────────────────────────────────────────────
// Tabs com counter (linha de status no topo da tabela)
// ───────────────────────────────────────────────────────────
export interface TabItem {
  value: string;
  label: string;
  count: number;
}

export function TabsCounter({
  tabs, value, onChange,
}: {
  tabs: TabItem[];
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="flex items-center gap-6 border-b border-gray-200">
      {tabs.map((t) => {
        const active = t.value === value;
        return (
          <button
            key={t.value}
            onClick={() => onChange(t.value)}
            className={cn(
              "relative py-3 text-sm transition-colors flex items-center gap-1.5",
              active ? "text-forest-900 font-semibold" : "text-gray-500 hover:text-gray-800 font-medium"
            )}
          >
            <span>{t.label}</span>
            <span className={cn("text-xs", active ? "text-forest-900" : "text-gray-400")}>· {t.count}</span>
            {active && (
              <span className="absolute -bottom-px left-0 right-0 h-0.5 bg-emerald-500 rounded-full" />
            )}
          </button>
        );
      })}
    </div>
  );
}

// ───────────────────────────────────────────────────────────
// Chips de filtros removiveis
// ───────────────────────────────────────────────────────────
export interface ChipFiltro {
  key: string;
  label: string;
  value: string;
}

export function FilterChips({
  filtros, onRemove,
}: {
  filtros: ChipFiltro[];
  onRemove: (key: string) => void;
}) {
  return (
    <div className="flex items-center flex-wrap gap-2">
      {filtros.map((f) => (
        <button
          key={f.key}
          onClick={() => onRemove(f.key)}
          className="inline-flex items-center gap-1.5 rounded-full bg-gray-100 hover:bg-gray-200 px-3 py-1 text-xs text-gray-700 transition group"
        >
          <span className="text-gray-500">{f.label}:</span>
          <span className="font-semibold">{f.value}</span>
          <X className="size-3 text-gray-400 group-hover:text-gray-700" />
        </button>
      ))}
    </div>
  );
}

// ───────────────────────────────────────────────────────────
// Pill de Prioridade / Status com bolinha colorida
// ───────────────────────────────────────────────────────────
type PillTone = "low" | "med" | "high" | "neutral" | "success" | "warning" | "danger" | "info";

const PILL_TONES: Record<PillTone, { dot: string; text: string }> = {
  low:     { dot: "bg-gray-400",    text: "text-gray-600" },
  med:     { dot: "bg-amber-500",   text: "text-amber-700" },
  high:    { dot: "bg-red-500",     text: "text-red-700" },
  neutral: { dot: "bg-gray-300",    text: "text-gray-600" },
  success: { dot: "bg-emerald-500", text: "text-emerald-700" },
  warning: { dot: "bg-amber-500",   text: "text-amber-700" },
  danger:  { dot: "bg-red-500",     text: "text-red-700" },
  info:    { dot: "bg-brand-500",   text: "text-brand-700" },
};

export function PriorityPill({
  tone, label,
}: {
  tone: PillTone;
  label: string;
}) {
  const t = PILL_TONES[tone] || PILL_TONES.neutral;
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-gray-50 px-2.5 py-1 text-xs font-medium">
      <span className={cn("size-1.5 rounded-full", t.dot)} />
      <span className={t.text}>{label}</span>
    </span>
  );
}

// ───────────────────────────────────────────────────────────
// Progress Circle (estilo 12/14 com circulo ao redor)
// ───────────────────────────────────────────────────────────
export function ProgressCircle({
  value, total, size = 18,
}: {
  value: number;
  total: number;
  size?: number;
}) {
  const pct = total > 0 ? value / total : 0;
  const radius = (size - 3) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - pct);
  const complete = pct >= 1;
  const color = complete ? "#10b981" : pct >= 0.5 ? "#10b981" : "#9ca3af";

  return (
    <span className="inline-flex items-center gap-1.5">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="shrink-0">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill={complete ? color : "transparent"}
          stroke="#e5e7eb"
          strokeWidth="2"
        />
        {!complete && (
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="transparent"
            stroke={color}
            strokeWidth="2"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            transform={`rotate(-90 ${size / 2} ${size / 2})`}
            strokeLinecap="round"
          />
        )}
        {complete && (
          <path
            d={`M${size * 0.28} ${size * 0.52} L${size * 0.45} ${size * 0.68} L${size * 0.72} ${size * 0.34}`}
            stroke="white"
            strokeWidth="2"
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        )}
      </svg>
      <span className="text-xs text-forest-800 tabular-nums">
        <span className="font-semibold">{value}</span>
        <span className="text-gray-400"> / {total}</span>
      </span>
    </span>
  );
}

// ───────────────────────────────────────────────────────────
// AvatarCircle (com fallback de iniciais e gradient)
// ───────────────────────────────────────────────────────────
export function AvatarCircle({
  name, size = 24,
}: {
  name: string;
  size?: number;
}) {
  const initials = name.trim().split(/\s+/).slice(0, 2).map((s) => s.charAt(0).toUpperCase()).join("");
  // Hash deterministico pra escolher gradient consistente por nome
  const hash = [...name].reduce((acc, c) => acc + c.charCodeAt(0), 0);
  const gradients = [
    "from-brand-400 to-brand-600",
    "from-emerald-400 to-emerald-600",
    "from-amber-400 to-amber-600",
    "from-violet-400 to-violet-600",
    "from-rose-400 to-rose-600",
    "from-forest-500 to-forest-700",
  ];
  const grad = gradients[hash % gradients.length];

  return (
    <span
      className={cn(
        "inline-flex items-center justify-center rounded-full bg-gradient-to-br shadow-sm text-white font-semibold shrink-0",
        grad
      )}
      style={{ width: size, height: size, fontSize: size * 0.4 }}
    >
      {initials || "?"}
    </span>
  );
}

// ───────────────────────────────────────────────────────────
// Toolbar de tabela (search + filter button + chips)
// ───────────────────────────────────────────────────────────
export function TableToolbar({
  search, onSearchChange, searchPlaceholder, children, right,
}: {
  search: string;
  onSearchChange: (v: string) => void;
  searchPlaceholder?: string;
  children?: React.ReactNode; // chips de filtro
  right?: React.ReactNode;    // botoes a direita
}) {
  return (
    <div className="flex items-center gap-3 flex-wrap py-4">
      {children}
      <div className="ml-auto flex items-center gap-2">
        <div className="relative">
          <input
            type="text"
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder={searchPlaceholder ?? "Pesquisar na página"}
            className="w-64 rounded-full border border-gray-200 pl-9 pr-3 py-1.5 text-sm bg-gray-50/50 focus:outline-none focus:bg-white focus:ring-2 focus:ring-brand-200 focus:border-brand-300 placeholder:text-gray-400"
          />
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-gray-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
        </div>
        {right}
      </div>
    </div>
  );
}
