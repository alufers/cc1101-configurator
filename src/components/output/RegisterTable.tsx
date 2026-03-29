import { useState, useEffect, useRef, memo, useCallback } from "react";
import { ChevronRight, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useCC1101Store, type BitRange } from "@/lib/use-cc1101-store";
import { getBits, getRegisterGroup, HIDDEN_REG_ADDRS } from "@/lib/cc1101-calculations";
import { stripHtml, bitRangeOverlaps, cn } from "@/lib/utils";
import type { RegisterDef, BitfieldDef } from "@/lib/cc1101-types";

function getBitfieldDisplay(bf: BitfieldDef, regValue: number): string {
  const val = getBits(regValue, bf.startBit, bf.stopBit);
  const opt = bf.values.find((v) => v.number === val);
  if (opt) return `${val} — ${opt.brief}`;
  return `0x${val.toString(16).toUpperCase()}`;
}

/** Renders description text, preserving HTML tables. */
function DescriptionContent({ html }: { html: string }) {
  if (!html.includes("<table")) {
    return <>{stripHtml(html)}</>;
  }
  return (
    <div
      className="[&_table]:border-collapse [&_table]:text-xs [&_td]:border [&_td]:border-current [&_td]:px-1.5 [&_td]:py-0.5 [&_th]:border [&_th]:border-current [&_th]:px-1.5 [&_th]:py-0.5 [&_th]:font-semibold"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}

const RegisterRow = memo(function RegisterRow({
  def,
  forceExpanded,
  focusExpanded,
  isRegFocused,
  isHovered,
  focusedBitRanges,
  onRegMouseEnter,
  onBfMouseEnter,
}: {
  def: RegisterDef;
  forceExpanded: boolean;
  focusExpanded: boolean;
  isRegFocused: boolean;
  isHovered: boolean;
  focusedBitRanges: BitRange[] | null;
  onRegMouseEnter: () => void;
  onBfMouseEnter: (r: BitRange) => void;
}) {
  const value = useCC1101Store((s) => s.registers[def.address] ?? 0);
  const savedValue = useCC1101Store((s) => s.savedRegisters[def.address] ?? 0);
  const changedKey = useCC1101Store((s) => s.changedAddrs[def.address] ?? 0);
  const enabled = useCC1101Store((s) => !!s.enabledRegs[def.address]);
  const setRegister = useCC1101Store((s) => s.setRegister);
  const setRegsEnabled = useCC1101Store((s) => s.setRegsEnabled);

  const isChanged = value !== savedValue;
  const [localExpanded, setLocalExpanded] = useState(false);
  const expanded = forceExpanded || localExpanded || focusExpanded;

  const [flashClass, setFlashClass] = useState<"" | "reg-flash-a" | "reg-flash-b">("");
  const prevKey = useRef(changedKey);
  useEffect(() => {
    if (changedKey !== prevKey.current && changedKey > 0) {
      prevKey.current = changedKey;
      setFlashClass((c) => (c === "reg-flash-a" ? "reg-flash-b" : "reg-flash-a"));
    }
  }, [changedKey]);

  const [editing, setEditing] = useState(false);
  const [hexInput, setHexInput] = useState("");

  const hexVal = value.toString(16).padStart(2, "0").toUpperCase();
  const addrHex = def.address.toString(16).padStart(2, "0").toUpperCase();
  const rwBitfields = def.bitfields.filter((bf) => bf.access === "R/W");
  const tooltipHtml = [def.description, def.formulaNote].filter(Boolean).join("\n\n");

  function handleHexBlur() {
    const parsed = parseInt(hexInput, 16);
    if (!isNaN(parsed)) setRegister(def.address, parsed & 0xff);
    setEditing(false);
  }

  function handleRowClick() {
    if (rwBitfields.length > 0) setLocalExpanded((v) => !v);
  }

  const highlighted = isRegFocused || isHovered;

  function isBfFocused(bf: BitfieldDef): boolean {
    if (!isRegFocused) return false;
    if (!focusedBitRanges) return true;
    return focusedBitRanges.some(
      (r) => r.addr === def.address && bitRangeOverlaps(bf.startBit, bf.stopBit, r.startBit, r.stopBit)
    );
  }

  return (
    <>
      <tr
        className={cn(
          "border-b border-border transition-colors",
          flashClass,
          isChanged && !highlighted && "bg-amber-50/40",
          highlighted && "bg-blue-100",
          rwBitfields.length > 0 && "cursor-pointer",
          !enabled && "opacity-50"
        )}
        onClick={handleRowClick}
        onMouseEnter={onRegMouseEnter}
      >
        <td className="py-1 pl-2 pr-1 w-12">
          <div className="flex items-center gap-1">
            <div onClick={(e) => e.stopPropagation()}>
              <Checkbox
                checked={enabled}
                onCheckedChange={(v) => setRegsEnabled(getRegisterGroup(def.address), !!v)}
              />
            </div>
            {rwBitfields.length > 0 && (
              <span className="text-muted-foreground">
                {expanded ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
              </span>
            )}
          </div>
        </td>

        <td className="py-1 px-1">
          <span className="text-xs text-muted-foreground/50 font-mono mr-1.5">0x{addrHex}</span>
          <Tooltip>
            <TooltipTrigger asChild>
              <span className="text-xs font-mono cursor-help border-b border-dotted border-muted-foreground/60 select-none">
                {def.name}
              </span>
            </TooltipTrigger>
            <TooltipContent className="max-w-sm text-xs leading-relaxed">
              <DescriptionContent html={tooltipHtml} />
            </TooltipContent>
          </Tooltip>
        </td>

        <td className="py-1 px-1 pr-4 w-24 text-right" onClick={(e) => e.stopPropagation()}>
          {editing ? (
            <Input
              autoFocus
              type="text"
              maxLength={2}
              defaultValue={hexVal}
              className="h-6 text-xs font-mono w-14 px-1 ml-auto"
              onChange={(e) => setHexInput(e.target.value)}
              onBlur={handleHexBlur}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleHexBlur();
                if (e.key === "Escape") setEditing(false);
              }}
            />
          ) : (
            <button
              onClick={() => { setHexInput(hexVal); setEditing(true); }}
              className={cn(
                "text-xs font-mono text-blue-600 hover:text-blue-800 border border-transparent hover:border-blue-300 rounded px-1",
                isChanged && "font-semibold"
              )}
            >
              0x{hexVal}
            </button>
          )}
        </td>
      </tr>

      {expanded && rwBitfields.map((bf) => {
        const bfFocused = isBfFocused(bf);
        // When register is focused: focused bf → blue, others → white
        // When register is only hovered: gentle blue for all
        const bfBg = isRegFocused
          ? (bfFocused ? "bg-blue-200" : "bg-white")
          : isHovered
          ? "bg-blue-50"
          : "bg-muted/20";

        return (
          <tr
            key={bf.name}
            className={cn("border-b border-border/40", bfBg, !enabled && "opacity-50")}
            onMouseEnter={() => onBfMouseEnter({ addr: def.address, startBit: bf.startBit, stopBit: bf.stopBit })}
          >
            <td />
            <td className="py-0.5 pl-5 pr-1">
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className="text-xs font-mono text-muted-foreground cursor-help border-b border-dotted border-muted-foreground/40">
                    {bf.name}
                  </span>
                </TooltipTrigger>
                <TooltipContent className="max-w-xs text-xs leading-relaxed">
                  <DescriptionContent html={bf.description || bf.name} />
                </TooltipContent>
              </Tooltip>
              <span className="text-xs text-muted-foreground/50 ml-1">[{bf.startBit}:{bf.stopBit}]</span>
            </td>
            <td className="py-0.5 px-1 pr-4 text-right min-w-[310px]">
              <span className="text-xs text-foreground/80 block text-right whitespace-nowrap overflow-hidden text-ellipsis" title={getBitfieldDisplay(bf, value)}>
                {getBitfieldDisplay(bf, value)}
              </span>
            </td>
          </tr>
        );
      })}
    </>
  );
});

export function RegisterTable() {
  const regDefs = useCC1101Store((s) => s.regDefs);
  const loading = useCC1101Store((s) => s.loading);
  const focusedRegAddrs = useCC1101Store((s) => s.focusedRegAddrs);
  const focusedBitRanges = useCC1101Store((s) => s.focusedBitRanges);
  const hoveredRegAddr = useCC1101Store((s) => s.hoveredRegAddr);
  const setHoveredRegAddr = useCC1101Store((s) => s.setHoveredRegAddr);
  const setHoveredBitRange = useCC1101Store((s) => s.setHoveredBitRange);
  const [allExpanded, setAllExpanded] = useState(false);

  const visibleDefs = regDefs.filter((d) => !HIDDEN_REG_ADDRS.has(d.address));
  const focusedSet = new Set(focusedRegAddrs);

  // Stable per-address hover setters (avoids blowing memo on every render)
  const regHoverSetters = useRef<Map<number, () => void>>(new Map());
  const getRegHoverSetter = useCallback(
    (addr: number) => {
      if (!regHoverSetters.current.has(addr)) {
        regHoverSetters.current.set(addr, () => setHoveredRegAddr(addr));
      }
      return regHoverSetters.current.get(addr)!;
    },
    [setHoveredRegAddr]
  );

  if (loading) {
    return <div className="p-4 text-sm text-muted-foreground">Loading register definitions…</div>;
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-2 px-3 py-2 border-b shrink-0">
        <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => setAllExpanded((v) => !v)}>
          {allExpanded ? "Collapse All" : "Expand All"}
        </Button>
        <span className="text-xs text-muted-foreground ml-auto">{visibleDefs.length} registers</span>
      </div>
      <div
        className="overflow-y-auto flex-1"
        onMouseLeave={() => setHoveredRegAddr(null)}
      >
        <table className="w-full text-sm">
          <thead className="sticky top-0 bg-background border-b z-10">
            <tr>
              <th className="w-12" />
              <th className="text-left py-1.5 px-1 text-xs font-medium text-muted-foreground">Register</th>
              <th className="text-right py-1.5 px-1 pr-4 text-xs font-medium text-muted-foreground min-w-[310px]">Value</th>
            </tr>
          </thead>
          <tbody>
            {visibleDefs.map((def) => (
              <RegisterRow
                key={def.address}
                def={def}
                forceExpanded={allExpanded}
                focusExpanded={focusedSet.has(def.address)}
                isRegFocused={focusedSet.has(def.address)}
                isHovered={hoveredRegAddr === def.address}
                focusedBitRanges={focusedBitRanges}
                onRegMouseEnter={getRegHoverSetter(def.address)}
                onBfMouseEnter={setHoveredBitRange}
              />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
