import { ChevronRight } from "lucide-react";

import type { Breadcrumb } from "../lib/view-models.js";

type BreadcrumbsProps = {
  items: Breadcrumb[];
  onNavigate: (path: string) => void;
};

export function Breadcrumbs({ items, onNavigate }: BreadcrumbsProps) {
  return (
    <nav
      aria-label="Breadcrumb"
      className="flex flex-wrap items-center gap-2 text-sm text-slate-500 dark:text-gray-400"
    >
      {items.map((item, index) => (
        <span className="inline-flex items-center gap-2" key={item.path}>
          {index > 0 ? <ChevronRight className="h-4 w-4 text-slate-300 dark:text-gray-700" /> : null}
          <button
            className="transition hover:text-cyan-600 dark:hover:text-cyan-400"
            onClick={() => onNavigate(item.path)}
            type="button"
          >
            {item.label}
          </button>
        </span>
      ))}
    </nav>
  );
}
