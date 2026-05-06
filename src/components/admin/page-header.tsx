import { LucideIcon } from "lucide-react";

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  icon?: LucideIcon;
  actions?: React.ReactNode;
}

export function PageHeader({ title, subtitle, icon: Icon, actions }: PageHeaderProps) {
  return (
    <header className="mb-8 flex items-start justify-between gap-4">
      <div className="flex items-start gap-4">
        {Icon && (
          <div className="size-12 rounded-xl bg-brand-50 grid place-items-center shrink-0">
            <Icon className="size-5 text-brand-600" />
          </div>
        )}
        <div>
          <h1 className="font-display text-3xl text-forest-800">{title}</h1>
          {subtitle && <p className="text-gray-500 mt-1 text-sm">{subtitle}</p>}
        </div>
      </div>
      {actions && <div className="flex items-center gap-2 shrink-0">{actions}</div>}
    </header>
  );
}
