import { useState } from "react";
import { Share2, Copy, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { useCC1101Store } from "@/lib/use-cc1101-store";
import { encodeSharePayload } from "@/lib/system-presets";

export function ShareButton() {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const presetName = useCC1101Store((s) => s.presetName);
  const registers = useCC1101Store((s) => s.registers);
  const paTable = useCC1101Store((s) => s.paTable);
  const crystalFreqMHz = useCC1101Store((s) => s.crystalFreqMHz);
  const enabledRegs = useCC1101Store((s) => s.enabledRegs);

  function buildUrl(): string {
    const encoded = encodeSharePayload({ name: presetName, registers, paTable, crystalFreqMHz, enabledRegs });
    const base = window.location.href.split("#")[0];
    return `${base}#config=${encoded}`;
  }

  function handleCopy() {
    navigator.clipboard.writeText(buildUrl()).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="h-7 text-xs gap-1.5">
          <Share2 className="w-3.5 h-3.5" />
          Share
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-96 p-3" align="end">
        <p className="text-sm font-medium mb-2">Share this configuration</p>
        <div className="flex gap-2">
          <Input readOnly value={buildUrl()} className="h-8 text-xs font-mono" onClick={(e) => (e.target as HTMLInputElement).select()} />
          <Button size="sm" className="h-8 shrink-0 gap-1.5" onClick={handleCopy}>
            {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
            {copied ? "Copied" : "Copy"}
          </Button>
        </div>
        <p className="text-xs text-muted-foreground mt-2">Anyone with this link can load your exact configuration.</p>
      </PopoverContent>
    </Popover>
  );
}
