import { Checkbox } from "@/components/ui/checkbox";
import { useCC1101Store } from "@/lib/use-cc1101-store";
import { cn } from "@/lib/utils";

interface RegGroupProps {
  addrs: number[];
  children: React.ReactNode;
}

export function RegGroup({ addrs, children }: RegGroupProps) {
  const enabledRegs = useCC1101Store((s) => s.enabledRegs);
  const setRegsEnabled = useCC1101Store((s) => s.setRegsEnabled);
  const hoveredRegAddr = useCC1101Store((s) => s.hoveredRegAddr);
  const hoveredBitRange = useCC1101Store((s) => s.hoveredBitRange);

  const enabled = addrs.length > 0 && !!enabledRegs[addrs[0]];

  // Only highlight at the group level when hovering a register row (not a bitfield row).
  // When hoveredBitRange is set, the individual ParamRow handles the highlight instead.
  const isHoveredFromTable = !hoveredBitRange && addrs.some((a) => a === hoveredRegAddr);

  return (
    <div className="flex gap-2 mb-1">
      <div className="pt-0.5 shrink-0">
        <Checkbox
          checked={enabled}
          onCheckedChange={(v) => setRegsEnabled(addrs, !!v)}
        />
      </div>
      {/* Relative container so we can place the click-to-enable overlay */}
      <div className="relative flex-1 min-w-0">
        {/* Click-to-enable overlay shown when disabled */}
        {!enabled && (
          <div
            className="absolute inset-0 z-10 cursor-pointer"
            title="Click to enable"
            onClick={() => setRegsEnabled(addrs, true)}
          />
        )}
        <div
          className={cn(
            "border-l pl-2 transition-colors rounded-sm",
            isHoveredFromTable && "border-blue-400 bg-blue-100/70",
            !isHoveredFromTable && (enabled ? "border-border" : "border-border/40"),
            !enabled && "opacity-50 pointer-events-none select-none"
          )}
        >
          {children}
        </div>
      </div>
    </div>
  );
}
