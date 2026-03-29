import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useCC1101Store } from "@/lib/use-cc1101-store";
import { CC1101_ADDR_BY_NAME } from "@/lib/cc1101-calculations";
import type { PaTable, RegisterMap } from "@/lib/cc1101-types";

interface ParseResult {
  registers: RegisterMap;
  paTable: PaTable;
  presetName: string;
}

function parseFlipper(text: string): ParseResult | null {
  const nameMatch = text.match(/Custom_preset_name:\s*(.+)/);
  const dataMatch = text.match(/Custom_preset_data:\s*([0-9A-Fa-f\s]+)/);

  if (!dataMatch) return null;

  const name = nameMatch?.[1]?.trim() ?? "imported";
  const bytes = dataMatch[1]
    .trim()
    .split(/\s+/)
    .map((b) => parseInt(b, 16));

  if (bytes.some(isNaN)) return null;

  const registers: RegisterMap = {};
  let i = 0;

  // Parse addr-value pairs until 00 00 end marker
  while (i + 1 < bytes.length) {
    if (bytes[i] === 0x00 && bytes[i + 1] === 0x00) {
      i += 2;
      break;
    }
    registers[bytes[i]] = bytes[i + 1];
    i += 2;
  }

  // Remaining 8 bytes = PATABLE
  const paTable: PaTable = [0, 0, 0, 0, 0, 0, 0, 0];
  for (let j = 0; j < 8 && i + j < bytes.length; j++) {
    paTable[j] = bytes[i + j];
  }

  return { registers, paTable, presetName: name };
}

function parseCCode(text: string): ParseResult | null {
  // Extract array name from "const uint8_t name_regs[] = {"
  const nameMatch = text.match(/const\s+uint8_t\s+(\w+?)(?:_regs)?\s*\[\]/);
  const name = nameMatch?.[1] ?? "imported";

  // Find the array body between { and };
  const bodyMatch = text.match(/\{([^}]+)\}/s);
  if (!bodyMatch) return null;

  const body = bodyMatch[1];
  const registers: RegisterMap = {};
  const paTable: PaTable = [0, 0, 0, 0, 0, 0, 0, 0];

  // Extract all tokens: CC1101_* constant names and hex values
  // Remove comments
  const noComments = body.replace(/\/\/[^\n]*/g, "").replace(/\/\*[\s\S]*?\*\//g, "");

  // Tokenize
  const tokens = noComments
    .split(/[\s,]+/)
    .map((t) => t.trim())
    .filter(Boolean);

  const parsed: number[] = [];
  for (const token of tokens) {
    if (token.startsWith("CC1101_") || token.startsWith("0x") || token.startsWith("0X")) {
      if (token.startsWith("CC1101_")) {
        const addr = CC1101_ADDR_BY_NAME[token];
        if (addr !== undefined) parsed.push(addr);
        // else unknown constant - try to skip
      } else {
        const val = parseInt(token, 16);
        if (!isNaN(val)) parsed.push(val);
      }
    } else if (/^\d+$/.test(token)) {
      parsed.push(parseInt(token, 10));
    }
  }

  // Walk pairs: addr, value until 0, 0 end marker, then 8 PATABLE bytes
  let i = 0;
  while (i + 1 < parsed.length) {
    if (parsed[i] === 0 && parsed[i + 1] === 0) {
      i += 2;
      break;
    }
    registers[parsed[i]] = parsed[i + 1];
    i += 2;
  }

  for (let j = 0; j < 8 && i + j < parsed.length; j++) {
    paTable[j] = parsed[i + j];
  }

  if (Object.keys(registers).length === 0) return null;

  return { registers, paTable, presetName: name };
}

function parseInput(text: string): ParseResult | null {
  const trimmed = text.trim();
  if (trimmed.includes("Custom_preset_data:")) {
    return parseFlipper(trimmed);
  }
  if (trimmed.includes("uint8_t") || trimmed.includes("CC1101_")) {
    return parseCCode(trimmed);
  }
  return null;
}

interface ImportModalProps {
  open: boolean;
  onClose: () => void;
}

export function ImportModal({ open, onClose }: ImportModalProps) {
  const importPreset = useCC1101Store((s) => s.importPreset);
  const [text, setText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<ParseResult | null>(null);

  function handleTextChange(t: string) {
    setText(t);
    setError(null);
    if (t.trim()) {
      const result = parseInput(t);
      setPreview(result);
      if (!result) setError("Could not detect format. Paste C code (uint8_t array) or Flipper preset (Custom_preset_data:).");
    } else {
      setPreview(null);
    }
  }

  function handleImport() {
    if (!preview) return;
    importPreset(preview.registers, preview.paTable, preview.presetName);
    onClose();
    setText("");
    setPreview(null);
  }

  function handleClose() {
    onClose();
    setText("");
    setError(null);
    setPreview(null);
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && handleClose()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Import Preset</DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Paste a C source array (<code className="text-xs bg-muted px-1 rounded">uint8_t name[]</code>) or
            Flipper Zero preset (<code className="text-xs bg-muted px-1 rounded">Custom_preset_data:</code>).
          </p>

          <Textarea
            className="font-mono text-xs min-h-[200px]"
            placeholder={`Paste C code:\nconst uint8_t my_preset_regs[] = { CC1101_IOCFG0, 0x0D, ... };\n\nOr Flipper format:\nCustom_preset_name: AM_1\nCustom_preset_module: CC1101\nCustom_preset_data: 02 0D 03 07 ...`}
            value={text}
            onChange={(e) => handleTextChange(e.target.value)}
          />

          {error && (
            <p className="text-xs text-destructive">{error}</p>
          )}

          {preview && !error && (
            <div className="text-xs bg-muted rounded p-3 space-y-1">
              <div className="font-semibold text-foreground">Preview:</div>
              <div><span className="text-muted-foreground">Name: </span>{preview.presetName}</div>
              <div><span className="text-muted-foreground">Registers: </span>{Object.keys(preview.registers).length} values</div>
              <div>
                <span className="text-muted-foreground">PATABLE: </span>
                <span className="font-mono">
                  [{preview.paTable.map((b) => `0x${b.toString(16).padStart(2, "0").toUpperCase()}`).join(", ")}]
                </span>
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>Cancel</Button>
          <Button onClick={handleImport} disabled={!preview || !!error}>
            Import
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
