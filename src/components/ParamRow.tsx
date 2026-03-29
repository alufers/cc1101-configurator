import { useRef } from "react";
import { AlertCircle } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useCC1101Store, type BitRange } from "@/lib/use-cc1101-store";
import { bitRangeOverlaps, cn } from "@/lib/utils";

// Shared timer across all ParamRow instances — cancels a pending clear when
// any ParamRow gets focus, preventing the "clear fires after next focus" race.
let pendingClearTimer: ReturnType<typeof setTimeout> | null = null;

interface ParamRowProps {
  label: string;
  unit?: string;
  description?: string;
  error?: string;
  focusAddrs?: number[];
  focusBitRanges?: BitRange[];
  children: React.ReactNode;
}

export function ParamRow({
  label,
  unit,
  description,
  error,
  focusAddrs,
  focusBitRanges,
  children,
}: ParamRowProps) {
  const setFocused = useCC1101Store((s) => s.setFocused);
  const clearFocused = useCC1101Store((s) => s.clearFocused);
  const hoveredBitRange = useCC1101Store((s) => s.hoveredBitRange);
  const containerRef = useRef<HTMLDivElement>(null);

  // Highlight this row when the user hovers a matching bitfield in the register table
  const isHoveredByBitfield =
    hoveredBitRange !== null &&
    focusBitRanges !== undefined &&
    focusBitRanges.some(
      (r) =>
        r.addr === hoveredBitRange.addr &&
        bitRangeOverlaps(r.startBit, r.stopBit, hoveredBitRange.startBit, hoveredBitRange.stopBit)
    );

  function handleFocus() {
    if (pendingClearTimer !== null) {
      clearTimeout(pendingClearTimer);
      pendingClearTimer = null;
    }
    if (focusAddrs && focusAddrs.length > 0) {
      setFocused(focusAddrs, focusBitRanges ?? null);
    }
  }

  function handleBlur(e: React.FocusEvent) {
    if (!containerRef.current?.contains(e.relatedTarget as Node)) {
      pendingClearTimer = setTimeout(() => {
        pendingClearTimer = null;
        clearFocused();
      }, 0);
    }
  }

  return (
    <div
      className={cn(
        "flex flex-col mb-2 rounded px-1 -mx-1 transition-colors",
        isHoveredByBitfield && "bg-blue-100"
      )}
    >
      <div
        ref={containerRef}
        className="flex items-center gap-2"
        onFocus={handleFocus}
        onBlur={handleBlur}
      >
        {description ? (
          <Tooltip>
            <TooltipTrigger asChild>
              <Label
                className={cn(
                  "w-40 shrink-0 text-xs cursor-help border-b border-dotted border-transparent hover:border-muted-foreground/40",
                  error ? "text-destructive" : "text-muted-foreground"
                )}
              >
                {label}
              </Label>
            </TooltipTrigger>
            <TooltipContent className="max-w-xs text-xs whitespace-pre-wrap">
              {description}
            </TooltipContent>
          </Tooltip>
        ) : (
          <Label className={cn("w-40 shrink-0 text-xs", error ? "text-destructive" : "text-muted-foreground")}>
            {label}
          </Label>
        )}
        <div
          className={cn(
            "flex items-center gap-1 flex-1 min-w-0",
            error && "[&_input]:border-destructive [&_button[role='combobox']]:border-destructive"
          )}
        >
          <div className="flex-1 min-w-0">{children}</div>
          {unit && <span className="text-xs text-muted-foreground w-10 shrink-0">{unit}</span>}
        </div>
      </div>
      {error && (
        <div className="ml-40 mt-1 flex items-start gap-1.5 rounded-md border border-destructive/50 bg-destructive/10 px-2.5 py-1.5 text-xs text-destructive">
          <AlertCircle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}
    </div>
  );
}
