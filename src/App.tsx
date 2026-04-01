import { useState, useEffect, useMemo } from "react";
import { Upload, Save, SaveAll, MoreHorizontal, Share2, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ParameterPanel } from "@/components/ParameterPanel";
import { OutputPanel } from "@/components/OutputPanel";
import { ImportModal } from "@/components/ImportModal";
import { PresetSelect } from "@/components/PresetSelect";
import { SaveAsDialog } from "@/components/SaveAsDialog";
import { ShareButton } from "@/components/ShareButton";
import { useCC1101Store } from "@/lib/use-cc1101-store";
import { SYSTEM_PRESETS, RESET_PRESET_ID, decodeSharePayload, encodeSharePayload, type PresetData } from "@/lib/system-presets";
import { loadUserPresets, upsertUserPreset, generateUserPresetId } from "@/lib/user-presets";
import { DEFAULT_ENABLED_REGS } from "@/lib/cc1101-defaults";
import { setBits } from "@/lib/cc1101-calculations";
import type { RegisterDef } from "@/lib/cc1101-types";

function buildResetRegs(regDefs: RegisterDef[]): Record<number, number> {
  const resetRegs: Record<number, number> = {};
  for (const def of regDefs) {
    let val = 0;
    for (const bf of def.bitfields) {
      val = setBits(val, bf.startBit, bf.stopBit, bf.resetValue ?? 0);
    }
    resetRegs[def.address] = val;
  }
  return resetRegs;
}

function AppHeader({
  onImport,
  userPresets,
  onUserPresetsChange,
}: {
  onImport: () => void;
  userPresets: PresetData[];
  onUserPresetsChange: (p: PresetData[]) => void;
}) {
  const [saveAsOpen, setSaveAsOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [shareCopied, setShareCopied] = useState(false);

  const activePresetId = useCC1101Store((s) => s.activePresetId);
  const presetName = useCC1101Store((s) => s.presetName);
  const registers = useCC1101Store((s) => s.registers);
  const savedRegisters = useCC1101Store((s) => s.savedRegisters);
  const enabledRegs = useCC1101Store((s) => s.enabledRegs);
  const savedEnabledRegs = useCC1101Store((s) => s.savedEnabledRegs);
  const paTable = useCC1101Store((s) => s.paTable);
  const crystalFreqMHz = useCC1101Store((s) => s.crystalFreqMHz);
  const importPreset = useCC1101Store((s) => s.importPreset);
  const regDefs = useCC1101Store((s) => s.regDefs);

  const isUnsaved = useMemo(() => {
    if (!activePresetId) return true;
    const allRegAddrs = new Set([
      ...Object.keys(registers).map(Number),
      ...Object.keys(savedRegisters).map(Number),
    ]);
    for (const addr of allRegAddrs) {
      if ((registers[addr] ?? 0) !== (savedRegisters[addr] ?? 0)) return true;
    }
    const allEnabledAddrs = new Set([
      ...Object.keys(enabledRegs).map(Number),
      ...Object.keys(savedEnabledRegs).map(Number),
    ]);
    for (const addr of allEnabledAddrs) {
      if (!!enabledRegs[addr] !== !!savedEnabledRegs[addr]) return true;
    }
    return false;
  }, [activePresetId, registers, savedRegisters, enabledRegs, savedEnabledRegs]);

  function buildCurrentPreset(name: string, id: string): PresetData {
    return { id, name, registers: { ...registers }, paTable: [...paTable] as PresetData["paTable"], crystalFreqMHz };
  }

  function handleSelectPreset(preset: PresetData | "reset") {
    if (preset === "reset") {
      importPreset(buildResetRegs(regDefs), [0, 0, 0, 0, 0, 0, 0, 0], "Reset", RESET_PRESET_ID, DEFAULT_ENABLED_REGS);
    } else {
      importPreset(preset.registers, preset.paTable, preset.name, preset.id);
    }
  }

  function handleSave() {
    const isSystemPreset = !activePresetId || activePresetId.startsWith("system:") || activePresetId.startsWith("share:");

    if (isSystemPreset) {
      setSaveAsOpen(true);
    } else {
      const existing = userPresets.find((p) => p.id === activePresetId);
      if (!existing) return;
      const updated = upsertUserPreset(buildCurrentPreset(existing.name, existing.id));
      onUserPresetsChange(updated);
      importPreset(registers, paTable, existing.name, existing.id);
    }
  }

  function getSuggestedName(): string {
    if (activePresetId?.startsWith("system:")) {
      const sys = SYSTEM_PRESETS.find((p) => p.id === activePresetId);
      return sys ? `${sys.name} - modified` : `${presetName} - modified`;
    }
    if (activePresetId === RESET_PRESET_ID) return "Reset - modified";
    return presetName;
  }

  function handleSaveAsConfirm(name: string) {
    const id = generateUserPresetId();
    const preset = buildCurrentPreset(name, id);
    const updated = upsertUserPreset(preset);
    onUserPresetsChange(updated);
    importPreset(registers, paTable, name, id);
    setSaveAsOpen(false);
  }

  function handleCopyShareLink() {
    const encoded = encodeSharePayload({ name: presetName, registers, paTable, crystalFreqMHz, enabledRegs });
    const base = window.location.href.split("#")[0];
    navigator.clipboard.writeText(`${base}#config=${encoded}`).then(() => {
      setShareCopied(true);
      setTimeout(() => setShareCopied(false), 2000);
    });
  }

  return (
    <>
      <div className="border-b px-3 py-2 flex items-center gap-2 bg-background shrink-0 flex-wrap">
        <h1 className="text-sm font-semibold whitespace-nowrap">CC1101 Configurator</h1>
        <div className="flex items-center gap-1.5 flex-1 min-w-0">
          <span className="text-xs text-muted-foreground whitespace-nowrap">Preset:</span>
          <PresetSelect
            userPresets={userPresets}
            onUserPresetsChange={onUserPresetsChange}
            onSelectPreset={handleSelectPreset}
            isUnsaved={isUnsaved}
          />
          <Button
            variant="outline"
            size="sm"
            className="h-7 w-7 p-0"
            onClick={handleSave}
            disabled={!isUnsaved}
            title="Save"
          >
            <Save className="w-3.5 h-3.5" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="h-7 w-7 p-0"
            onClick={() => setSaveAsOpen(true)}
            disabled={!isUnsaved}
            title="Save As"
          >
            <SaveAll className="w-3.5 h-3.5" />
          </Button>
        </div>
        {/* Desktop: show Share + Import inline */}
        <div className="hidden sm:flex items-center gap-1.5">
          <ShareButton />
          <Button variant="outline" size="sm" className="h-7 text-xs gap-1.5" onClick={onImport}>
            <Upload className="w-3.5 h-3.5" />
            Import
          </Button>
        </div>
        {/* Mobile: collapse Share + Import into ⋮ menu */}
        <div className="flex sm:hidden">
          <Popover open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className="h-7 w-7 p-0" title="More actions">
                <MoreHorizontal className="w-3.5 h-3.5" />
              </Button>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-44 p-1.5 flex flex-col gap-0.5">
              <Button
                variant="ghost"
                size="sm"
                className="h-8 text-xs gap-2 justify-start w-full"
                onClick={() => { handleCopyShareLink(); setMobileMenuOpen(false); }}
              >
                {shareCopied ? <Check className="w-3.5 h-3.5" /> : <Share2 className="w-3.5 h-3.5" />}
                {shareCopied ? "Copied!" : "Copy share link"}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 text-xs gap-2 justify-start w-full"
                onClick={() => { onImport(); setMobileMenuOpen(false); }}
              >
                <Upload className="w-3.5 h-3.5" />
                Import
              </Button>
            </PopoverContent>
          </Popover>
        </div>
      </div>

      <SaveAsDialog
        open={saveAsOpen}
        initialName={getSuggestedName()}
        onSave={handleSaveAsConfirm}
        onCancel={() => setSaveAsOpen(false)}
      />
    </>
  );
}

export default function App() {
  const [importOpen, setImportOpen] = useState(false);
  const [userPresets, setUserPresets] = useState<PresetData[]>(() => loadUserPresets());
  const loadRegDefs = useCC1101Store((s) => s.loadRegDefs);
  const importPreset = useCC1101Store((s) => s.importPreset);
  const regDefs = useCC1101Store((s) => s.regDefs);

  useEffect(() => {
    loadRegDefs().then(() => {
      const hash = window.location.hash;
      const match = hash.match(/[#&]config=([^&]*)/);
      if (match) {
        const payload = decodeSharePayload(match[1]);
        if (payload) {
          importPreset(payload.registers, payload.paTable, payload.name, `share:${Date.now()}`, payload.enabledRegs);
          return;
        }
      }
      // No URL config — load reset preset as default
      const resetRegs = buildResetRegs(useCC1101Store.getState().regDefs);
      importPreset(resetRegs, [0, 0, 0, 0, 0, 0, 0, 0], "Reset", RESET_PRESET_ID, DEFAULT_ENABLED_REGS);
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <TooltipProvider delayDuration={400}>
      <div className="flex flex-col h-screen overflow-hidden bg-background">
        <AppHeader
          onImport={() => setImportOpen(true)}
          userPresets={userPresets}
          onUserPresetsChange={setUserPresets}
        />
        <div className="flex flex-1 overflow-hidden">
          <aside className="hidden md:block w-[36rem] shrink-0 border-r overflow-y-auto">
            <ParameterPanel />
          </aside>
          <main className="flex-1 overflow-hidden flex flex-col min-w-0">
            <OutputPanel />
          </main>
        </div>
      </div>
      <ImportModal open={importOpen} onClose={() => setImportOpen(false)} />
      <footer className="border-t px-4 py-1.5 text-xs text-muted-foreground flex items-center gap-1 shrink-0 bg-background">
        <a
          href="https://github.com/alufers/cc1101-configurator"
          target="_blank"
          rel="noopener noreferrer"
          className="hover:text-foreground underline underline-offset-2"
        >
          github.com/alufers/cc1101-configurator
        </a>
      </footer>
    </TooltipProvider>
  );
}
