"use client";
import { useRouter, useSearchParams } from "next/navigation";
import type { Tag } from "@/lib/kanban-shared";
import { corClasses } from "@/lib/kanban-shared";

export function TagFilter({ tags, selecionadas }: { tags: Tag[]; selecionadas: string[] }) {
  const router = useRouter();
  const params = useSearchParams();

  function toggle(codigo: string) {
    const set = new Set(selecionadas);
    if (set.has(codigo)) set.delete(codigo);
    else set.add(codigo);

    const sp = new URLSearchParams(params.toString());
    if (set.size === 0) sp.delete("tag");
    else sp.set("tag", [...set].join(","));
    router.push(`?${sp.toString()}`);
  }

  return (
    <div className="flex flex-wrap gap-1.5">
      {tags.map((t) => {
        const c = corClasses(t.cor);
        const ativo = selecionadas.includes(t.codigo);
        return (
          <button
            key={t.codigo}
            onClick={() => toggle(t.codigo)}
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold transition border ${
              ativo
                ? `${c.bg} ${c.text} ${c.border}`
                : "bg-white text-gray-500 border-gray-200 hover:bg-gray-50"
            }`}
          >
            {t.emoji && <span>{t.emoji}</span>}
            <span>{t.nome}</span>
            <span className="text-[10px] opacity-60">({t.processos_count})</span>
          </button>
        );
      })}
    </div>
  );
}
