import type { Breadcrumb } from "../lib/view-models.js";

type BreadcrumbsProps = {
  items: Breadcrumb[];
  onNavigate: (path: string) => void;
};

export function Breadcrumbs({ items, onNavigate }: BreadcrumbsProps) {
  return (
    <nav className="breadcrumbs" aria-label="Breadcrumb">
      {items.map((item, index) => (
        <span className="breadcrumb-item" key={item.path}>
          {index > 0 ? <span className="breadcrumb-separator">/</span> : null}
          <button onClick={() => onNavigate(item.path)} type="button">
            {item.label}
          </button>
        </span>
      ))}
    </nav>
  );
}
