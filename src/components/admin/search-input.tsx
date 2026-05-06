"use client";
import { useEffect, useState } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { Search, X } from "lucide-react";

interface SearchInputProps {
  placeholder?: string;
  paramName?: string;
}

export function SearchInput({ placeholder = "Buscar...", paramName = "q" }: SearchInputProps) {
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();
  const [value, setValue] = useState(sp.get(paramName) || "");

  useEffect(() => {
    const t = setTimeout(() => {
      const params = new URLSearchParams(sp.toString());
      if (value) params.set(paramName, value);
      else params.delete(paramName);
      router.replace(`${pathname}?${params.toString()}`);
    }, 300);
    return () => clearTimeout(t);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  return (
    <div className="relative w-full sm:w-72">
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-gray-400 pointer-events-none" />
      <input
        type="search"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder={placeholder}
        className="w-full h-10 pl-10 pr-9 rounded-lg border border-gray-200 bg-white text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500"
      />
      {value && (
        <button
          onClick={() => setValue("")}
          className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded hover:bg-gray-100"
          aria-label="Limpar busca"
        >
          <X className="size-3.5 text-gray-400" />
        </button>
      )}
    </div>
  );
}
