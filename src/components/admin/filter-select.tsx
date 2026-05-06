"use client";
import { useRouter, useSearchParams, usePathname } from "next/navigation";

interface FilterSelectProps {
  paramName: string;
  options: { value: string; label: string }[];
  defaultLabel?: string;
}

export function FilterSelect({ paramName, options, defaultLabel = "Todos" }: FilterSelectProps) {
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();
  const value = sp.get(paramName) || "";

  function handleChange(v: string) {
    const params = new URLSearchParams(sp.toString());
    if (v) params.set(paramName, v);
    else params.delete(paramName);
    router.replace(`${pathname}?${params.toString()}`);
  }

  return (
    <select
      value={value}
      onChange={(e) => handleChange(e.target.value)}
      className="h-10 px-3 rounded-lg border border-gray-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500"
    >
      <option value="">{defaultLabel}</option>
      {options.map((o) => (
        <option key={o.value} value={o.value}>{o.label}</option>
      ))}
    </select>
  );
}
