import { useState, useEffect, useRef } from "react";
import { ChevronUp, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { findNearestIndex } from "@/lib/cc1101-calculations";

interface NumericInputProps {
  value: number;
  unit?: string;
  precision?: number;
  /** Sorted list of all valid values (for mantissa+exponent fields). */
  validValues?: number[];
  /** Linear step amount (for fields like frequency, IF). */
  stepSize?: number;
  min?: number;
  max?: number;
  /** Called when the user commits a new value (step click or blur). */
  onCommit: (v: number) => void;
  className?: string;
}

export function NumericInput({
  value,
  unit,
  precision = 3,
  validValues,
  stepSize,
  min,
  max,
  onCommit,
  className,
}: NumericInputProps) {
  const [text, setText] = useState(value.toFixed(precision));
  const [focused, setFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Keep display in sync when value changes from outside (register update)
  useEffect(() => {
    if (!focused) {
      setText(value.toFixed(precision));
    }
  }, [value, precision, focused]);

  function step(dir: 1 | -1) {
    let next: number;
    if (validValues && validValues.length > 0) {
      const idx = findNearestIndex(value, validValues);
      const ni = Math.max(0, Math.min(validValues.length - 1, idx + dir));
      next = validValues[ni];
    } else if (stepSize !== undefined) {
      next = value + dir * stepSize;
      if (min !== undefined) next = Math.max(min, next);
      if (max !== undefined) next = Math.min(max, next);
    } else {
      return;
    }
    onCommit(next);
  }

  const atMax = validValues && validValues.length > 0
    ? findNearestIndex(value, validValues) >= validValues.length - 1
    : max !== undefined && value >= max;

  const atMin = validValues && validValues.length > 0
    ? findNearestIndex(value, validValues) <= 0
    : min !== undefined && value <= min;

  function handleBlur() {
    setFocused(false);
    const parsed = parseFloat(text);
    if (!isNaN(parsed)) {
      onCommit(parsed);
    } else {
      setText(value.toFixed(precision));
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter") inputRef.current?.blur();
    if (e.key === "ArrowUp") { e.preventDefault(); step(1); }
    if (e.key === "ArrowDown") { e.preventDefault(); step(-1); }
  }

  return (
    <div className={cn("flex items-center gap-0.5", className)}>
      <div className="relative flex items-center flex-1 min-w-0">
        <input
          ref={inputRef}
          type="text"
          inputMode="decimal"
          value={text}
          className="h-7 w-full rounded-md border border-input bg-transparent px-2 py-1 pr-6 text-xs shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          onChange={(e) => setText(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
        />
        {/* Vertical stepper buttons inside the input */}
        <div className="absolute right-0 top-0 bottom-0 flex flex-col border-l border-input w-5">
          <button
            tabIndex={-1}
            disabled={!!atMax}
            className="flex-1 flex items-center justify-center hover:bg-muted/60 rounded-tr-md text-muted-foreground hover:text-foreground disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-transparent"
            onMouseDown={(e) => { e.preventDefault(); step(1); }}
          >
            <ChevronUp className="w-3 h-3" />
          </button>
          <button
            tabIndex={-1}
            disabled={!!atMin}
            className="flex-1 flex items-center justify-center hover:bg-muted/60 border-t border-input rounded-br-md text-muted-foreground hover:text-foreground disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-transparent"
            onMouseDown={(e) => { e.preventDefault(); step(-1); }}
          >
            <ChevronDown className="w-3 h-3" />
          </button>
        </div>
      </div>
      {unit && <span className="text-xs text-muted-foreground w-10 shrink-0">{unit}</span>}
    </div>
  );
}
