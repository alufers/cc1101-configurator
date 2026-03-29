import { useState, useCallback } from "react";
import { Check, ChevronDown, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList, CommandSeparator } from "@/components/ui/command";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useCC1101Store } from "@/lib/use-cc1101-store";
import { SYSTEM_PRESETS, RESET_PRESET_ID, type PresetData } from "@/lib/system-presets";
import { deleteUserPreset } from "@/lib/user-presets";
import { cn } from "@/lib/utils";

interface PresetSelectProps {
  userPresets: PresetData[];
  onUserPresetsChange: (presets: PresetData[]) => void;
  onSelectPreset: (preset: PresetData | "reset") => void;
  isUnsaved: boolean;
}

export function PresetSelect({ userPresets, onUserPresetsChange, onSelectPreset, isUnsaved }: PresetSelectProps) {
  const [open, setOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<PresetData | null>(null);

  const activePresetId = useCC1101Store((s) => s.activePresetId);
  const presetName = useCC1101Store((s) => s.presetName);

  const allPresets = [...SYSTEM_PRESETS, ...userPresets];
  const displayName = allPresets.find((p) => p.id === activePresetId)?.name
    ?? (activePresetId === RESET_PRESET_ID ? "Reset" : null)
    ?? presetName
    ?? "Custom";

  function handleSelect(preset: PresetData | "reset") {
    setOpen(false);
    onSelectPreset(preset);
  }

  const handleDeleteClick = useCallback((e: React.MouseEvent, preset: PresetData) => {
    e.stopPropagation();
    setDeleteTarget(preset);
  }, []);

  function confirmDelete() {
    if (!deleteTarget) return;
    const updated = deleteUserPreset(deleteTarget.id);
    onUserPresetsChange(updated);
    setDeleteTarget(null);
  }

  return (
    <>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            className="h-7 text-xs justify-between min-w-[180px] max-w-[240px] font-normal"
          >
            <span className={cn("truncate", isUnsaved && "font-semibold")}>
              {isUnsaved ? `${displayName} *` : displayName}
            </span>
            <ChevronDown className="ml-1 h-3.5 w-3.5 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-64 p-0" align="start">
          <Command>
            <CommandInput placeholder="Search presets..." className="h-8" />
            <CommandList className="max-h-[480px]">
              <CommandEmpty>No presets found.</CommandEmpty>

              <CommandGroup heading="System Presets">
                <CommandItem
                  value="reset"
                  onSelect={() => handleSelect("reset")}
                  className="text-xs"
                >
                  <Check className={cn("mr-2 h-3.5 w-3.5", activePresetId === RESET_PRESET_ID ? "opacity-100" : "opacity-0")} />
                  Reset
                </CommandItem>
                {SYSTEM_PRESETS.map((p) => (
                  <CommandItem key={p.id} value={p.name} onSelect={() => handleSelect(p)} className="text-xs">
                    <Check className={cn("mr-2 h-3.5 w-3.5", activePresetId === p.id ? "opacity-100" : "opacity-0")} />
                    {p.name}
                  </CommandItem>
                ))}
              </CommandGroup>

              {userPresets.length > 0 && (
                <>
                  <CommandSeparator />
                  <CommandGroup heading="User Presets">
                    {userPresets.map((p) => (
                      <CommandItem key={p.id} value={p.name} onSelect={() => handleSelect(p)} className="text-xs pr-1">
                        <Check className={cn("mr-2 h-3.5 w-3.5 shrink-0", activePresetId === p.id ? "opacity-100" : "opacity-0")} />
                        <span className="flex-1 truncate">{p.name}</span>
                        <button
                          className="ml-1 p-0.5 rounded text-muted-foreground hover:text-destructive hover:bg-destructive/10 shrink-0"
                          onClick={(e) => handleDeleteClick(e, p)}
                          tabIndex={-1}
                          aria-label={`Delete preset ${p.name}`}
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </>
              )}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      <Dialog open={!!deleteTarget} onOpenChange={(v) => !v && setDeleteTarget(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete Preset</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Are you sure you want to delete <span className="font-medium text-foreground">{deleteTarget?.name}</span>? This cannot be undone.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>Cancel</Button>
            <Button variant="destructive" onClick={confirmDelete}>Delete</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
