import { LucideIcon } from "lucide-react";

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description?: string;
  action?: React.ReactNode;
}

export function EmptyState({ icon: Icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="text-center py-16 px-4">
      <div className="size-16 mx-auto rounded-2xl bg-sand-50 grid place-items-center mb-4">
        <Icon className="size-7 text-gray-400" />
      </div>
      <h3 className="font-display text-xl text-forest-800 mb-1">{title}</h3>
      {description && <p className="text-sm text-gray-500 max-w-md mx-auto">{description}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
