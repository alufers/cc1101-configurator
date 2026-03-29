import { create } from "zustand";
import type { RegisterDef, RegisterMap, PaTable } from "./cc1101-types";
import { DEFAULT_PATABLE, DEFAULT_CRYSTAL_MHZ, DEFAULT_PRESET_NAME, DEFAULT_ENABLED_REGS } from "./cc1101-defaults";
import { setBits, REGISTER_GROUPS } from "./cc1101-calculations";

export interface BitRange {
  addr: number;
  startBit: number; // MSB
  stopBit: number;  // LSB
}

const RESET_PRESET_ID = "system:reset";

interface CC1101Store {
  registers: RegisterMap;
  paTable: PaTable;
  crystalFreqMHz: number;
  presetName: string;
  regDefs: RegisterDef[];
  loading: boolean;
  /** addr -> animation counter (increments on each change to trigger replay) */
  changedAddrs: Record<number, number>;
  /** Which registers are included in the output */
  enabledRegs: Record<number, boolean>;
  /** Register addresses highlighted due to parameter-panel focus */
  focusedRegAddrs: number[];
  /** Specific bitfield ranges highlighted (null = all bitfields in focusedRegAddrs) */
  focusedBitRanges: BitRange[] | null;
  /** Register address hovered in the register table */
  hoveredRegAddr: number | null;
  /** Specific bitfield hovered in the register table */
  hoveredBitRange: BitRange | null;
  /** Snapshot of registers at last save/load — used for "modified" highlighting */
  savedRegisters: RegisterMap;
  /** Snapshot of enabledRegs at last save/load */
  savedEnabledRegs: Record<number, boolean>;
  /** ID of the currently active preset (system:* or user:*) */
  activePresetId: string | null;
  /** Whether the user has interacted — gates validation error display */
  validationEnabled: boolean;

  setRegister: (addr: number, value: number) => void;
  setRegisters: (updates: RegisterMap) => void;
  setPaTable: (pt: PaTable) => void;
  setCrystalFreq: (mhz: number) => void;
  setPresetName: (name: string) => void;
  clearChangedAddrs: () => void;
  setRegsEnabled: (addrs: number[], enabled: boolean) => void;
  setFocused: (addrs: number[], bitRanges: BitRange[] | null) => void;
  clearFocused: () => void;
  setHoveredRegAddr: (addr: number | null) => void;
  setHoveredBitRange: (r: BitRange | null) => void;
  enableValidation: () => void;
  /** Import: replaces registers + paTable without marking as changed */
  importPreset: (registers: RegisterMap, paTable: PaTable, name: string, presetId?: string, enabledRegsOverride?: Record<number, boolean>) => void;
  loadRegDefs: () => Promise<void>;
}

/** When the Reset preset is active and a change occurs, detach from it. */
function detachFromReset(state: CC1101Store): Partial<CC1101Store> {
  if (state.activePresetId === RESET_PRESET_ID) {
    return { activePresetId: null, presetName: "Untitled preset" };
  }
  return {};
}

export const useCC1101Store = create<CC1101Store>((set) => ({
  registers: {},
  paTable: [...DEFAULT_PATABLE] as PaTable,
  crystalFreqMHz: DEFAULT_CRYSTAL_MHZ,
  presetName: DEFAULT_PRESET_NAME,
  regDefs: [],
  loading: true,
  changedAddrs: {},
  enabledRegs: { ...DEFAULT_ENABLED_REGS },
  focusedRegAddrs: [],
  focusedBitRanges: null,
  hoveredRegAddr: null,
  hoveredBitRange: null,
  savedRegisters: {},
  savedEnabledRegs: { ...DEFAULT_ENABLED_REGS },
  activePresetId: null,
  validationEnabled: false,

  setRegister: (addr, value) =>
    set((state) => {
      const clamped = value & 0xff;
      const prev = state.registers[addr] ?? 0;
      if (prev === clamped) return {};
      return {
        registers: { ...state.registers, [addr]: clamped },
        changedAddrs: { ...state.changedAddrs, [addr]: (state.changedAddrs[addr] ?? 0) + 1 },
        validationEnabled: true,
        ...detachFromReset(state),
      };
    }),

  setRegisters: (updates) =>
    set((state) => {
      const newRegs = { ...state.registers };
      const newChanged = { ...state.changedAddrs };
      let anyChanged = false;
      for (const [addr, val] of Object.entries(updates)) {
        const a = Number(addr);
        const clamped = val & 0xff;
        if ((newRegs[a] ?? 0) !== clamped) {
          newRegs[a] = clamped;
          newChanged[a] = (newChanged[a] ?? 0) + 1;
          anyChanged = true;
        }
      }
      return anyChanged
        ? { registers: newRegs, changedAddrs: newChanged, validationEnabled: true, ...detachFromReset(state) }
        : {};
    }),

  setPaTable: (pt) =>
    set((state) => ({ paTable: pt, validationEnabled: true, ...detachFromReset(state) })),

  setCrystalFreq: (mhz) =>
    set((state) => ({ crystalFreqMHz: mhz, validationEnabled: true, ...detachFromReset(state) })),

  setPresetName: (name) => set({ presetName: name }),
  clearChangedAddrs: () => set({ changedAddrs: {} }),
  enableValidation: () => set({ validationEnabled: true }),

  setRegsEnabled: (addrs, enabled) =>
    set((state) => {
      const next = { ...state.enabledRegs };
      let anyChanged = false;
      for (const a of addrs) {
        if (next[a] !== enabled) {
          next[a] = enabled;
          anyChanged = true;
        }
      }
      return anyChanged
        ? { enabledRegs: next, ...detachFromReset(state) }
        : {};
    }),

  setFocused: (addrs, bitRanges) => set({ focusedRegAddrs: addrs, focusedBitRanges: bitRanges }),
  clearFocused: () => set({ focusedRegAddrs: [], focusedBitRanges: null }),
  setHoveredRegAddr: (addr) => set({ hoveredRegAddr: addr, hoveredBitRange: null }),
  setHoveredBitRange: (r) => set({ hoveredBitRange: r, hoveredRegAddr: r?.addr ?? null }),

  importPreset: (registers, paTable, name, presetId, enabledRegsOverride) => {
    let enabledRegs: Record<number, boolean>;
    if (enabledRegsOverride) {
      enabledRegs = enabledRegsOverride;
    } else {
      enabledRegs = {};
      for (const addr of Object.keys(registers)) {
        enabledRegs[Number(addr)] = true;
      }
      for (const group of REGISTER_GROUPS) {
        if (group.some((a) => enabledRegs[a])) {
          for (const a of group) enabledRegs[a] = true;
        }
      }
    }
    set({
      registers: { ...registers },
      paTable: [...paTable] as PaTable,
      presetName: name,
      changedAddrs: {},
      enabledRegs,
      savedRegisters: { ...registers },
      savedEnabledRegs: { ...enabledRegs },
      activePresetId: presetId ?? null,
      validationEnabled: false,
    });
  },

  loadRegDefs: async () => {
    try {
      const res = await fetch("/cc1101_registers.json");
      const data: RegisterDef[] = await res.json();

      const resetRegs: RegisterMap = {};
      for (const def of data) {
        let val = 0;
        for (const bf of def.bitfields) {
          val = setBits(val, bf.startBit, bf.stopBit, bf.resetValue ?? 0);
        }
        resetRegs[def.address] = val;
      }

      set((state) => ({
        regDefs: data,
        loading: false,
        registers: Object.keys(state.registers).length === 0 ? resetRegs : state.registers,
        savedRegisters: Object.keys(state.savedRegisters).length === 0 ? resetRegs : state.savedRegisters,
      }));
    } catch (err) {
      console.error("Failed to load register definitions:", err);
      set({ loading: false });
    }
  },
}));
