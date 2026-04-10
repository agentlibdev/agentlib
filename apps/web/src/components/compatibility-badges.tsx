import type { AgentCompatibility } from "../lib/types.js";
import { getCompatibilityTargetLabel } from "../lib/compatibility-targets.js";

type CompatibilityBadgesProps = {
  compatibility: AgentCompatibility;
  compact?: boolean;
};

export function CompatibilityBadges({
  compatibility,
  compact = false
}: CompatibilityBadgesProps) {
  const groups = [
    {
      label: "Built for",
      targets: compatibility.targets.filter((target) => target.builtFor)
    },
    {
      label: "Tested with",
      targets: compatibility.targets.filter((target) => target.tested)
    },
    {
      label: "Adapter available",
      targets: compatibility.targets.filter((target) => target.adapterAvailable)
    }
  ].filter((group) => group.targets.length > 0);

  if (groups.length === 0) {
    return null;
  }

  return (
    <div className={compact ? "space-y-3" : "space-y-4"}>
      {groups.map((group) => (
        <div key={group.label} className="space-y-2">
          <p className="eyebrow">{group.label}</p>
          <div className="flex flex-wrap gap-2">
            {group.targets.map((target) => (
              <span key={`${group.label}-${target.targetId}`} className="status-pill">
                {getCompatibilityTargetLabel(target.targetId)}
              </span>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
