import { LucideIcon } from "lucide-react";

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  icon?: LucideIcon;
  actions?: React.ReactNode;
}

// icon prop mantido por compat — nao renderiza mais (design minimalista)
export function PageHeader({ title, subtitle, actions }: PageHeaderProps) {
  return (
    <header className="mb-7 flex items-end justify-between gap-4 flex-wrap">
      <div>
        <h1 className="font-display text-2xl sm:text-3xl tracking-tight text-gray-900">{title}</h1>
        {subtitle && <p className="text-gray-500 mt-1 text-sm">{subtitle}</p>}
      </div>
      {actions && <div className="flex items-center gap-2 shrink-0">{actions}</div>}
    </header>
  );
}
