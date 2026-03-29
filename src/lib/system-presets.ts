import type { RegisterMap, PaTable } from "./cc1101-types";
import { REG } from "./cc1101-calculations";

export interface PresetData {
  id: string;
  name: string;
  registers: RegisterMap;
  paTable: PaTable;
  crystalFreqMHz: number;
}

const ZERO_PATABLE: PaTable = [0, 0, 0, 0, 0, 0, 0, 0];

export const SYSTEM_PRESETS: PresetData[] = [
  {
    id: "system:ook_270khz",
    name: "ook_270khz_async",
    crystalFreqMHz: 26,
    registers: {
      [REG.IOCFG0]: 0x0D,
      [REG.FIFOTHR]: 0x47,
      [REG.PKTCTRL0]: 0x32,
      [REG.FSCTRL1]: 0x06,
      [REG.MDMCFG0]: 0x00,
      [REG.MDMCFG1]: 0x00,
      [REG.MDMCFG2]: 0x30,
      [REG.MDMCFG3]: 0x32,
      [REG.MDMCFG4]: 0x67,
      [REG.MCSM0]: 0x18,
      [REG.FOCCFG]: 0x18,
      [REG.AGCCTRL0]: 0x40,
      [REG.AGCCTRL1]: 0x00,
      [REG.AGCCTRL2]: 0x03,
      [REG.WORCTRL]: 0xFB,
      [REG.FREND0]: 0x11,
      [REG.FREND1]: 0xB6,
    },
    paTable: [0x00, 0xC0, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00],
  },
  {
    id: "system:ook_650khz",
    name: "ook_650khz_async",
    crystalFreqMHz: 26,
    registers: {
      [REG.IOCFG0]: 0x0D,
      [REG.FIFOTHR]: 0x07,
      [REG.PKTCTRL0]: 0x32,
      [REG.FSCTRL1]: 0x06,
      [REG.MDMCFG0]: 0x00,
      [REG.MDMCFG1]: 0x00,
      [REG.MDMCFG2]: 0x30,
      [REG.MDMCFG3]: 0x32,
      [REG.MDMCFG4]: 0x17,
      [REG.MCSM0]: 0x18,
      [REG.FOCCFG]: 0x18,
      [REG.AGCCTRL0]: 0x91,
      [REG.AGCCTRL1]: 0x00,
      [REG.AGCCTRL2]: 0x07,
      [REG.WORCTRL]: 0xFB,
      [REG.FREND0]: 0x11,
      [REG.FREND1]: 0xB6,
    },
    paTable: [0x00, 0xC0, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00],
  },
  {
    id: "system:2fsk_dev2_38khz",
    name: "2fsk_dev2_38khz_async",
    crystalFreqMHz: 26,
    registers: {
      [REG.IOCFG0]: 0x0D,
      [REG.FSCTRL1]: 0x06,
      [REG.PKTCTRL0]: 0x32,
      [REG.PKTCTRL1]: 0x04,
      [REG.MDMCFG0]: 0x00,
      [REG.MDMCFG1]: 0x02,
      [REG.MDMCFG2]: 0x04,
      [REG.MDMCFG3]: 0x83,
      [REG.MDMCFG4]: 0x67,
      [REG.DEVIATN]: 0x04,
      [REG.MCSM0]: 0x18,
      [REG.FOCCFG]: 0x16,
      [REG.AGCCTRL0]: 0x91,
      [REG.AGCCTRL1]: 0x00,
      [REG.AGCCTRL2]: 0x07,
      [REG.WORCTRL]: 0xFB,
      [REG.FREND0]: 0x10,
      [REG.FREND1]: 0x56,
    },
    paTable: [0xC0, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00],
  },
  {
    id: "system:2fsk_dev47_6khz",
    name: "2fsk_dev47_6khz_async",
    crystalFreqMHz: 26,
    registers: {
      [REG.IOCFG0]: 0x0D,
      [REG.FSCTRL1]: 0x06,
      [REG.PKTCTRL0]: 0x32,
      [REG.PKTCTRL1]: 0x04,
      [REG.MDMCFG0]: 0x00,
      [REG.MDMCFG1]: 0x02,
      [REG.MDMCFG2]: 0x04,
      [REG.MDMCFG3]: 0x83,
      [REG.MDMCFG4]: 0x67,
      [REG.DEVIATN]: 0x47,
      [REG.MCSM0]: 0x18,
      [REG.FOCCFG]: 0x16,
      [REG.AGCCTRL0]: 0x91,
      [REG.AGCCTRL1]: 0x00,
      [REG.AGCCTRL2]: 0x07,
      [REG.WORCTRL]: 0xFB,
      [REG.FREND0]: 0x10,
      [REG.FREND1]: 0x56,
    },
    paTable: [0xC0, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00],
  },
  {
    id: "system:msk_99_97kb",
    name: "msk_99_97kb_async",
    crystalFreqMHz: 26,
    registers: {
      [REG.IOCFG0]: 0x06,
      [REG.FIFOTHR]: 0x07,
      [REG.SYNC1]: 0x46,
      [REG.SYNC0]: 0x4C,
      [REG.ADDR]: 0x00,
      [REG.PKTLEN]: 0x00,
      [REG.CHANNR]: 0x00,
      [REG.PKTCTRL0]: 0x05,
      [REG.FSCTRL0]: 0x23,
      [REG.FSCTRL1]: 0x06,
      [REG.MDMCFG0]: 0xF8,
      [REG.MDMCFG1]: 0x22,
      [REG.MDMCFG2]: 0x72,
      [REG.MDMCFG3]: 0xF8,
      [REG.MDMCFG4]: 0x5B,
      [REG.DEVIATN]: 0x47,
      [REG.MCSM0]: 0x18,
      [REG.FOCCFG]: 0x16,
      [REG.AGCCTRL0]: 0xB2,
      [REG.AGCCTRL1]: 0x00,
      [REG.AGCCTRL2]: 0xC7,
      [REG.FREND0]: 0x10,
      [REG.FREND1]: 0x56,
      [REG.BSCFG]: 0x1C,
      0x29: 0x59, // FSTEST
    },
    paTable: [0xC0, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00],
  },
  {
    id: "system:gfsk_9_99kb",
    name: "gfsk_9_99kb_async",
    crystalFreqMHz: 26,
    registers: {
      [REG.IOCFG0]: 0x06,
      [REG.FIFOTHR]: 0x47,
      [REG.PKTCTRL0]: 0x05,
      [REG.FSCTRL1]: 0x06,
      [REG.SYNC1]: 0x46,
      [REG.SYNC0]: 0x4C,
      [REG.ADDR]: 0x00,
      [REG.PKTLEN]: 0x00,
      [REG.MDMCFG4]: 0xC8,
      [REG.MDMCFG3]: 0x93,
      [REG.MDMCFG2]: 0x12,
      [REG.DEVIATN]: 0x34,
      [REG.MCSM0]: 0x18,
      [REG.FOCCFG]: 0x16,
      [REG.AGCCTRL2]: 0x43,
      [REG.AGCCTRL1]: 0x40,
      [REG.AGCCTRL0]: 0x91,
      [REG.WORCTRL]: 0xFB,
    },
    paTable: [0xC0, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00],
  },
];

/** The "Reset" entry — registers come from JSON reset values at runtime. */
export const RESET_PRESET_ID = "system:reset";

/** URL hash encoding/decoding */
export interface SharePayload {
  name: string;
  registers: RegisterMap;
  paTable: PaTable;
  crystalFreqMHz: number;
  enabledRegs: Record<number, boolean>;
}

export function encodeSharePayload(payload: SharePayload): string {
  const json = JSON.stringify(payload);
  return btoa(json);
}

export function decodeSharePayload(b64: string): SharePayload | null {
  try {
    const json = atob(b64);
    return JSON.parse(json) as SharePayload;
  } catch {
    return null;
  }
}
