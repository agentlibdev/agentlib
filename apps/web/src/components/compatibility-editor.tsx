import type { AgentCompatibility } from "../lib/types.js";
import { COMPATIBILITY_TARGETS } from "../lib/compatibility-targets.js";

type CompatibilityEditorProps = {
  compatibility: AgentCompatibility;
  onChange: (compatibility: AgentCompatibility) => void;
};

function isEnabled(
  compatibility: AgentCompatibility,
  targetId: string,
  field: "builtFor" | "tested" | "adapterAvailable"
): boolean {
  return compatibility.targets.find((target) => target.targetId === targetId)?.[field] ?? false;
}

export function CompatibilityEditor({ compatibility, onChange }: CompatibilityEditorProps) {
  function toggle(
    targetId: string,
    field: "builtFor" | "tested" | "adapterAvailable",
    checked: boolean
  ) {
    const existing = compatibility.targets.find((target) => target.targetId === targetId) ?? {
      targetId,
      builtFor: false,
      tested: false,
      adapterAvailable: false
    };
    const nextTarget = {
      ...existing,
      [field]: checked
    };
    const nextTargets = compatibility.targets
      .filter((target) => target.targetId !== targetId)
      .concat(
        nextTarget.builtFor || nextTarget.tested || nextTarget.adapterAvailable
          ? [nextTarget]
          : []
      )
      .sort((left, right) => left.targetId.localeCompare(right.targetId));

    onChange({ targets: nextTargets });
  }

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-[minmax(0,1fr)_80px_80px_80px] gap-2 text-xs font-medium uppercase tracking-[0.24em] text-slate-500 dark:text-gray-500">
        <span>Target</span>
        <span>Built</span>
        <span>Tested</span>
        <span>Adapter</span>
      </div>
      <div className="space-y-2">
        {COMPATIBILITY_TARGETS.map((target) => (
          <div
            key={target.id}
            className="grid grid-cols-[minmax(0,1fr)_80px_80px_80px] items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 dark:border-gray-800"
          >
            <span className="text-sm text-slate-800 dark:text-gray-100">{target.label}</span>
            <label className="flex items-center justify-center">
              <input
                checked={isEnabled(compatibility, target.id, "builtFor")}
                onChange={(event) => toggle(target.id, "builtFor", event.target.checked)}
                type="checkbox"
              />
            </label>
            <label className="flex items-center justify-center">
              <input
                checked={isEnabled(compatibility, target.id, "tested")}
                onChange={(event) => toggle(target.id, "tested", event.target.checked)}
                type="checkbox"
              />
            </label>
            <label className="flex items-center justify-center">
              <input
                checked={isEnabled(compatibility, target.id, "adapterAvailable")}
                onChange={(event) => toggle(target.id, "adapterAvailable", event.target.checked)}
                type="checkbox"
              />
            </label>
          </div>
        ))}
      </div>
    </div>
  );
}
