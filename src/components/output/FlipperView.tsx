import { useState, useMemo } from "react";
import { Copy, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useCC1101Store } from "@/lib/use-cc1101-store";
import { HIDDEN_REG_ADDRS } from "@/lib/cc1101-calculations";

function highlightFlipper(text: string): string {
  return text
    .split("\n")
    .map((line) => {
      const colonIdx = line.indexOf(":");
      if (colonIdx === -1) return escapeHtml(line);
      const key = escapeHtml(line.slice(0, colonIdx));
      const colon = ":";
      const val = line.slice(colonIdx + 1);
      // Highlight hex bytes in the data line
      const highlightedVal = val.replace(
        /\b([0-9A-Fa-f]{2})\b/g,
        '<span class="flip-hex">$1</span>'
      );
      return `<span class="flip-key">${key}</span><span class="flip-colon">${colon}</span><span class="flip-value">${highlightedVal}</span>`;
    })
    .join("\n");
}

function escapeHtml(s: string) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function generateFlipperData(
  regDefs: { address: number }[],
  registers: Record<number, number>,
  paTable: readonly number[]
): string {
  const bytes: number[] = [];
  for (const def of regDefs) {
    bytes.push(def.address, registers[def.address] ?? 0);
  }
  bytes.push(0x00, 0x00);
  for (const b of paTable) bytes.push(b);
  return bytes.map((b) => b.toString(16).padStart(2, "0").toUpperCase()).join(" ");
}

export function FlipperView() {
  const registers = useCC1101Store((s) => s.registers);
  const paTable = useCC1101Store((s) => s.paTable);
  const presetName = useCC1101Store((s) => s.presetName);
  const regDefs = useCC1101Store((s) => s.regDefs);
  const enabledRegs = useCC1101Store((s) => s.enabledRegs);
  const [copied, setCopied] = useState(false);

  const activeRegDefs = useMemo(
    () => regDefs.filter((d) => !!enabledRegs[d.address] && !HIDDEN_REG_ADDRS.has(d.address)),
    [regDefs, enabledRegs]
  );

  const dataBytes = useMemo(
    () => generateFlipperData(activeRegDefs, registers, paTable),
    [activeRegDefs, registers, paTable]
  );

  const plainText = useMemo(
    () => [`Custom_preset_name: ${presetName}`, "Custom_preset_module: CC1101", `Custom_preset_data: ${dataBytes}`].join("\n"),
    [presetName, dataBytes]
  );

  const highlighted = useMemo(() => highlightFlipper(plainText), [plainText]);

  function handleCopy() {
    navigator.clipboard.writeText(plainText).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-3 py-2 border-b shrink-0">
        <span className="text-xs text-muted-foreground">Flipper Zero preset format</span>
        <Button variant="outline" size="sm" className="h-7 text-xs gap-1.5 shrink-0" onClick={handleCopy}>
          {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
          {copied ? "Copied!" : "Copy"}
        </Button>
      </div>
      <div className="flex-1 overflow-auto">
        <pre className="text-xs font-mono p-4 leading-6 whitespace-pre-wrap break-all">
          <code dangerouslySetInnerHTML={{ __html: highlighted }} />
        </pre>
      </div>
    </div>
  );
}
