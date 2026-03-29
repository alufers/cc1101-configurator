import { useState, useMemo } from "react";
import { Copy, Check } from "lucide-react";
import hljs from "highlight.js/lib/core";
import hljsC from "highlight.js/lib/languages/c";
import { Button } from "@/components/ui/button";
import { useCC1101Store } from "@/lib/use-cc1101-store";
import {
  CC1101_NAMES,
  getBits,
  REG,
  HIDDEN_REG_ADDRS,
  decodeBaseFreqMHz,
  decodeDataRateKBaud,
  decodeRxBwKHz,
  decodeDeviationKHz,
  decodeIFFreqKHz,
  decodeChanSpacingKHz,
  decodeModFormat,
  decodeSyncMode,
  decodePreamble,
  SYNC_MODE_OPTIONS,
} from "@/lib/cc1101-calculations";
import type { RegisterDef } from "@/lib/cc1101-types";

hljs.registerLanguage("c", hljsC);

/** Registers whose value is self-explanatory — no comment needed. */
const NO_COMMENT_REGS: Set<number> = new Set([
  REG.PKTLEN, REG.CHANNR, REG.ADDR,
  REG.SYNC1, REG.SYNC0,
  REG.FSCTRL0,
  REG.FSCAL3, REG.FSCAL2, REG.FSCAL1, REG.FSCAL0,
  REG.RCCTRL1, REG.RCCTRL0,
  REG.WOREVT1, REG.WOREVT0,
]);

function generateSmartComment(
  def: RegisterDef,
  value: number,
  allRegs: Record<number, number>,
  crystalFreqMHz: number
): string {
  const addr = def.address;

  if (NO_COMMENT_REGS.has(addr)) return "";

  // Formula-based registers
  switch (addr) {
    case REG.FREQ2: {
      const mhz = decodeBaseFreqMHz(allRegs, crystalFreqMHz);
      return `Base frequency: ${mhz.toFixed(6)} MHz`;
    }
    case REG.FREQ1:
    case REG.FREQ0:
      return ""; // covered by FREQ2

    case REG.MDMCFG4: {
      const bw = decodeRxBwKHz(allRegs, crystalFreqMHz);
      return `Channel BW: ${bw.toFixed(3)} kHz`;
    }
    case REG.MDMCFG3: {
      const rate = decodeDataRateKBaud(allRegs, crystalFreqMHz);
      return `Data rate: ${rate.toFixed(4)} kBaud`;
    }
    case REG.MDMCFG2: {
      const fmt = decodeModFormat(allRegs);
      const syncLabel = SYNC_MODE_OPTIONS.find((o) => o.value === decodeSyncMode(allRegs))?.label ?? "";
      const extras: string[] = [];
      if (getBits(value, 3, 3)) extras.push("Manchester encoding");
      if (getBits(value, 7, 7)) extras.push("DC filter off");
      return [fmt, syncLabel, ...extras].filter(Boolean).join(", ");
    }
    case REG.MDMCFG1: {
      const preamble = decodePreamble(allRegs);
      const parts = [`Preamble: ${preamble} bytes`];
      if (getBits(value, 7, 7)) parts.push("FEC enabled");
      return parts.join(", ");
    }
    case REG.MDMCFG0: {
      const spacing = decodeChanSpacingKHz(allRegs, crystalFreqMHz);
      return `Channel spacing: ${spacing.toFixed(3)} kHz`;
    }
    case REG.DEVIATN: {
      const dev = decodeDeviationKHz(allRegs, crystalFreqMHz);
      return `Deviation: ${dev.toFixed(3)} kHz`;
    }
    case REG.FSCTRL1: {
      const ifFreq = decodeIFFreqKHz(allRegs, crystalFreqMHz);
      return `IF frequency: ${ifFreq.toFixed(3)} kHz`;
    }
  }

  // General: enumerate meaningful bitfield enum values
  const parts: string[] = [];
  for (const bf of def.bitfields) {
    if (bf.access !== "R/W") continue;
    const val = getBits(value, bf.startBit, bf.stopBit);
    const opt = bf.values.find((v) => v.number === val);
    if (opt) parts.push(`${bf.name}=${opt.brief}`);
  }
  return parts.join("; ");
}

function generateCCode(
  presetName: string,
  regDefs: RegisterDef[],
  registers: Record<number, number>,
  paTable: readonly number[],
  crystalFreqMHz: number
): string {
  const safeName = presetName.replace(/[^a-zA-Z0-9_]/g, "_");
  const lines: string[] = [];

  lines.push(`const uint8_t ${safeName}_regs[] = {`);

  for (const def of regDefs) {
    const value = registers[def.address] ?? 0;
    const constName = CC1101_NAMES[def.address] ?? `0x${def.address.toString(16).toUpperCase()}`;
    const comment = generateSmartComment(def, value, registers, crystalFreqMHz);
    const hexVal = `0x${value.toString(16).padStart(2, "0").toUpperCase()}`;

    lines.push(`    ${constName},`);
    lines.push(comment ? `    ${hexVal}, // ${comment}` : `    ${hexVal},`);
  }

  lines.push("    /* End of register list */");
  lines.push("    0,");
  lines.push("    0,");
  lines.push("");
  lines.push("    // patable[8]");
  lines.push(`    ${paTable.map((b) => `0x${b.toString(16).padStart(2, "0").toUpperCase()}`).join(", ")},`);
  lines.push("};");

  return lines.join("\n");
}

export function CCodeView() {
  const registers = useCC1101Store((s) => s.registers);
  const paTable = useCC1101Store((s) => s.paTable);
  const presetName = useCC1101Store((s) => s.presetName);
  const regDefs = useCC1101Store((s) => s.regDefs);
  const enabledRegs = useCC1101Store((s) => s.enabledRegs);
  const crystalFreqMHz = useCC1101Store((s) => s.crystalFreqMHz);
  const [copied, setCopied] = useState(false);

  const activeRegDefs = useMemo(
    () => regDefs.filter((d) => !!enabledRegs[d.address] && !HIDDEN_REG_ADDRS.has(d.address)),
    [regDefs, enabledRegs]
  );

  const code = useMemo(
    () => generateCCode(presetName, activeRegDefs, registers, paTable, crystalFreqMHz),
    [presetName, activeRegDefs, registers, paTable, crystalFreqMHz]
  );

  const highlighted = useMemo(() => hljs.highlight(code, { language: "c" }).value, [code]);

  function handleCopy() {
    navigator.clipboard.writeText(code).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-3 py-2 border-b shrink-0">
        <span className="text-xs text-muted-foreground">C source array</span>
        <Button variant="outline" size="sm" className="h-7 text-xs gap-1.5" onClick={handleCopy}>
          {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
          {copied ? "Copied!" : "Copy"}
        </Button>
      </div>
      <div className="flex-1 overflow-auto">
        <pre className="text-xs font-mono p-4 leading-5">
          <code className="hljs" dangerouslySetInnerHTML={{ __html: highlighted }} />
        </pre>
      </div>
    </div>
  );
}
