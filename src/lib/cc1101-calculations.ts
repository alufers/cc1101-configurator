/**
 * CC1101 register encode/decode calculations.
 * All formulas from TI datasheet SWRS061I.
 */

// Register addresses
export const REG = {
  IOCFG2: 0x00,
  IOCFG1: 0x01,
  IOCFG0: 0x02,
  FIFOTHR: 0x03,
  SYNC1: 0x04,
  SYNC0: 0x05,
  PKTLEN: 0x06,
  PKTCTRL1: 0x07,
  PKTCTRL0: 0x08,
  ADDR: 0x09,
  CHANNR: 0x0a,
  FSCTRL1: 0x0b,
  FSCTRL0: 0x0c,
  FREQ2: 0x0d,
  FREQ1: 0x0e,
  FREQ0: 0x0f,
  MDMCFG4: 0x10,
  MDMCFG3: 0x11,
  MDMCFG2: 0x12,
  MDMCFG1: 0x13,
  MDMCFG0: 0x14,
  DEVIATN: 0x15,
  MCSM2: 0x16,
  MCSM1: 0x17,
  MCSM0: 0x18,
  FOCCFG: 0x19,
  BSCFG: 0x1a,
  AGCCTRL2: 0x1b,
  AGCCTRL1: 0x1c,
  AGCCTRL0: 0x1d,
  WOREVT1: 0x1e,
  WOREVT0: 0x1f,
  WORCTRL: 0x20,
  FREND1: 0x21,
  FREND0: 0x22,
  FSCAL3: 0x23,
  FSCAL2: 0x24,
  FSCAL1: 0x25,
  FSCAL0: 0x26,
  RCCTRL1: 0x27,
  RCCTRL0: 0x28,
} as const;

/** Registers that are calibration/test internals — hidden from the UI and all outputs. */
export const HIDDEN_REG_ADDRS = new Set<number>([
  REG.FSCAL3, REG.FSCAL2, REG.FSCAL1, REG.FSCAL0,
  0x29, // FSTEST
]);

// CC1101 constant names for C output
export const CC1101_NAMES: Record<number, string> = {
  [REG.IOCFG2]: "CC1101_IOCFG2",
  [REG.IOCFG1]: "CC1101_IOCFG1",
  [REG.IOCFG0]: "CC1101_IOCFG0",
  [REG.FIFOTHR]: "CC1101_FIFOTHR",
  [REG.SYNC1]: "CC1101_SYNC1",
  [REG.SYNC0]: "CC1101_SYNC0",
  [REG.PKTLEN]: "CC1101_PKTLEN",
  [REG.PKTCTRL1]: "CC1101_PKTCTRL1",
  [REG.PKTCTRL0]: "CC1101_PKTCTRL0",
  [REG.ADDR]: "CC1101_ADDR",
  [REG.CHANNR]: "CC1101_CHANNR",
  [REG.FSCTRL1]: "CC1101_FSCTRL1",
  [REG.FSCTRL0]: "CC1101_FSCTRL0",
  [REG.FREQ2]: "CC1101_FREQ2",
  [REG.FREQ1]: "CC1101_FREQ1",
  [REG.FREQ0]: "CC1101_FREQ0",
  [REG.MDMCFG4]: "CC1101_MDMCFG4",
  [REG.MDMCFG3]: "CC1101_MDMCFG3",
  [REG.MDMCFG2]: "CC1101_MDMCFG2",
  [REG.MDMCFG1]: "CC1101_MDMCFG1",
  [REG.MDMCFG0]: "CC1101_MDMCFG0",
  [REG.DEVIATN]: "CC1101_DEVIATN",
  [REG.MCSM2]: "CC1101_MCSM2",
  [REG.MCSM1]: "CC1101_MCSM1",
  [REG.MCSM0]: "CC1101_MCSM0",
  [REG.FOCCFG]: "CC1101_FOCCFG",
  [REG.BSCFG]: "CC1101_BSCFG",
  [REG.AGCCTRL2]: "CC1101_AGCCTRL2",
  [REG.AGCCTRL1]: "CC1101_AGCCTRL1",
  [REG.AGCCTRL0]: "CC1101_AGCCTRL0",
  [REG.WOREVT1]: "CC1101_WOREVT1",
  [REG.WOREVT0]: "CC1101_WOREVT0",
  [REG.WORCTRL]: "CC1101_WORCTRL",
  [REG.FREND1]: "CC1101_FREND1",
  [REG.FREND0]: "CC1101_FREND0",
  [REG.FSCAL3]: "CC1101_FSCAL3",
  [REG.FSCAL2]: "CC1101_FSCAL2",
  [REG.FSCAL1]: "CC1101_FSCAL1",
  [REG.FSCAL0]: "CC1101_FSCAL0",
  [REG.RCCTRL1]: "CC1101_RCCTRL1",
  [REG.RCCTRL0]: "CC1101_RCCTRL0",
};

// Reverse map: constant name -> address
export const CC1101_ADDR_BY_NAME: Record<string, number> = Object.fromEntries(
  Object.entries(CC1101_NAMES).map(([addr, name]) => [name, Number(addr)])
);

/** Extract bits [msb:lsb] from a byte (inclusive). */
export function getBits(byte: number, msb: number, lsb: number): number {
  const mask = (1 << (msb - lsb + 1)) - 1;
  return (byte >> lsb) & mask;
}

/** Set bits [msb:lsb] in a byte, return new byte. */
export function setBits(byte: number, msb: number, lsb: number, val: number): number {
  const width = msb - lsb + 1;
  const mask = ((1 << width) - 1) << lsb;
  return (byte & ~mask) | ((val & ((1 << width) - 1)) << lsb);
}

// ─── Stepping utilities ───────────────────────────────────────────────────────

/** Binary search: find nearest index in sorted array. */
export function findNearestIndex(value: number, sorted: number[]): number {
  if (sorted.length === 0) return 0;
  let lo = 0, hi = sorted.length - 1;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (sorted[mid] < value) lo = mid + 1;
    else hi = mid;
  }
  if (lo === 0) return 0;
  if (lo >= sorted.length) return sorted.length - 1;
  return Math.abs(sorted[lo] - value) < Math.abs(sorted[lo - 1] - value) ? lo : lo - 1;
}

/** Step to the next/previous value in a sorted list. */
export function stepSortedValue(current: number, dir: 1 | -1, sorted: number[]): number {
  if (sorted.length === 0) return current;
  const idx = findNearestIndex(current, sorted);
  return sorted[Math.max(0, Math.min(sorted.length - 1, idx + dir))];
}

// ─── Base Frequency ──────────────────────────────────────────────────────────
// f_carrier = (fXOSC / 2^16) * FREQ[23:0]

export function decodeBaseFreqMHz(regs: Record<number, number>, fXOSC_MHz: number): number {
  const freq2 = regs[REG.FREQ2] ?? 0;
  const freq1 = regs[REG.FREQ1] ?? 0;
  const freq0 = regs[REG.FREQ0] ?? 0;
  const freqWord = ((freq2 & 0x3f) << 16) | (freq1 << 8) | freq0;
  return (fXOSC_MHz / Math.pow(2, 16)) * freqWord;
}

export function encodeBaseFreq(freqMHz: number, fXOSC_MHz: number): Record<number, number> {
  const freqWord = Math.round((freqMHz * Math.pow(2, 16)) / fXOSC_MHz);
  const clamped = Math.max(0, Math.min(0x3fffff, freqWord));
  return {
    [REG.FREQ2]: (clamped >> 16) & 0x3f,
    [REG.FREQ1]: (clamped >> 8) & 0xff,
    [REG.FREQ0]: clamped & 0xff,
  };
}

/** Step frequency by 1 LSB (fXOSC/2^16) in given direction. */
export function stepFreqMHz(currentMHz: number, dir: 1 | -1, fXOSC_MHz: number): number {
  const stepMHz = fXOSC_MHz / Math.pow(2, 16);
  return currentMHz + dir * stepMHz;
}

// ─── Channel Spacing ─────────────────────────────────────────────────────────
// Δf = (fXOSC / 2^18) * (256 + CHANSPC_M) * 2^CHANSPC_E

export function decodeChanSpacingKHz(regs: Record<number, number>, fXOSC_MHz: number): number {
  const mdmcfg1 = regs[REG.MDMCFG1] ?? 0x22;
  const mdmcfg0 = regs[REG.MDMCFG0] ?? 0xf8;
  const e = getBits(mdmcfg1, 1, 0);
  const m = mdmcfg0;
  return ((fXOSC_MHz * 1e6) / Math.pow(2, 18)) * (256 + m) * Math.pow(2, e) / 1000;
}

export function encodeChanSpacing(kHz: number, fXOSC_MHz: number, currentMdmcfg1 = 0x22): Record<number, number> {
  const fXOSC = fXOSC_MHz * 1e6;
  let bestError = Infinity, bestE = 0, bestM = 0;
  for (let e = 0; e <= 3; e++) {
    const m = Math.round((kHz * 1000 * Math.pow(2, 18)) / (fXOSC * Math.pow(2, e)) - 256);
    const mc = Math.max(0, Math.min(255, m));
    const actual = (fXOSC / Math.pow(2, 18)) * (256 + mc) * Math.pow(2, e) / 1000;
    const err = Math.abs(actual - kHz);
    if (err < bestError) { bestError = err; bestE = e; bestM = mc; }
  }
  return {
    [REG.MDMCFG1]: setBits(currentMdmcfg1, 1, 0, bestE),
    [REG.MDMCFG0]: bestM,
  };
}

export function getValidChanSpacings(fXOSC_MHz: number): number[] {
  const fXOSC = fXOSC_MHz * 1e6;
  const vals: number[] = [];
  for (let e = 0; e <= 3; e++)
    for (let m = 0; m <= 255; m++)
      vals.push((fXOSC / Math.pow(2, 18)) * (256 + m) * Math.pow(2, e) / 1000);
  return [...new Set(vals)].sort((a, b) => a - b);
}

// ─── Data Rate ───────────────────────────────────────────────────────────────
// R = (256 + DRATE_M) * 2^DRATE_E * fXOSC / 2^28

export function decodeDataRateKBaud(regs: Record<number, number>, fXOSC_MHz: number): number {
  const mdmcfg4 = regs[REG.MDMCFG4] ?? 0x8b;
  const mdmcfg3 = regs[REG.MDMCFG3] ?? 0x22;
  const e = getBits(mdmcfg4, 3, 0);
  const m = mdmcfg3;
  return ((256 + m) * Math.pow(2, e) * fXOSC_MHz * 1e6) / Math.pow(2, 28) / 1000;
}

export function encodeDataRate(kBaud: number, fXOSC_MHz: number, currentMdmcfg4 = 0x8b): Record<number, number> {
  const fXOSC = fXOSC_MHz * 1e6;
  let bestError = Infinity, bestE = 0, bestM = 0;
  for (let e = 0; e <= 15; e++) {
    const m = Math.round(((kBaud * 1000 * Math.pow(2, 28)) / (fXOSC * Math.pow(2, e))) - 256);
    const mc = Math.max(0, Math.min(255, m));
    const actual = ((256 + mc) * Math.pow(2, e) * fXOSC) / Math.pow(2, 28) / 1000;
    const err = Math.abs(actual - kBaud);
    if (err < bestError) { bestError = err; bestE = e; bestM = mc; }
  }
  return {
    [REG.MDMCFG4]: setBits(currentMdmcfg4, 3, 0, bestE),
    [REG.MDMCFG3]: bestM,
  };
}

export function getValidDataRates(fXOSC_MHz: number): number[] {
  const fXOSC = fXOSC_MHz * 1e6;
  const vals: number[] = [];
  for (let e = 0; e <= 15; e++)
    for (let m = 0; m <= 255; m++)
      vals.push(((256 + m) * Math.pow(2, e) * fXOSC) / Math.pow(2, 28) / 1000);
  return [...new Set(vals.map(v => +v.toPrecision(10)))].sort((a, b) => a - b);
}

// ─── RX Bandwidth ────────────────────────────────────────────────────────────
// BW = fXOSC / (8 * (4 + CHANBW_M) * 2^CHANBW_E)

export function decodeRxBwKHz(regs: Record<number, number>, fXOSC_MHz: number): number {
  const mdmcfg4 = regs[REG.MDMCFG4] ?? 0x8b;
  const e = getBits(mdmcfg4, 7, 6);
  const m = getBits(mdmcfg4, 5, 4);
  return (fXOSC_MHz * 1e6) / (8 * (4 + m) * Math.pow(2, e)) / 1000;
}

export function encodeRxBw(kHz: number, fXOSC_MHz: number, currentMdmcfg4: number): number {
  const fXOSC = fXOSC_MHz * 1e6;
  let bestError = Infinity, bestReg = currentMdmcfg4;
  for (let e = 0; e <= 3; e++) {
    for (let m = 0; m <= 3; m++) {
      const actual = fXOSC / (8 * (4 + m) * Math.pow(2, e)) / 1000;
      const err = Math.abs(actual - kHz);
      if (err < bestError) { bestError = err; bestReg = setBits(setBits(currentMdmcfg4, 7, 6, e), 5, 4, m); }
    }
  }
  return bestReg;
}

export function getValidRxBwValues(fXOSC_MHz: number): number[] {
  const vals: number[] = [];
  for (let e = 0; e <= 3; e++)
    for (let m = 0; m <= 3; m++)
      vals.push((fXOSC_MHz * 1e6) / (8 * (4 + m) * Math.pow(2, e)) / 1000);
  return vals.sort((a, b) => a - b);
}

// ─── IF Frequency ────────────────────────────────────────────────────────────
// f_IF = (fXOSC / 2^10) * FREQ_IF

export function decodeIFFreqKHz(regs: Record<number, number>, fXOSC_MHz: number): number {
  const fsctrl1 = regs[REG.FSCTRL1] ?? 0x0f;
  const freqIF = getBits(fsctrl1, 4, 0);
  return (fXOSC_MHz * 1e6 / Math.pow(2, 10)) * freqIF / 1000;
}

export function encodeIFFreq(kHz: number, fXOSC_MHz: number): number {
  const freqIF = Math.round((kHz * 1000 * Math.pow(2, 10)) / (fXOSC_MHz * 1e6));
  return Math.max(0, Math.min(31, freqIF));
}

/** Step IF by 1 FREQ_IF increment */
export function stepIFFreqKHz(currentKHz: number, dir: 1 | -1, fXOSC_MHz: number): number {
  const step = fXOSC_MHz * 1e6 / Math.pow(2, 10) / 1000;
  const freqIF = Math.round(currentKHz / step);
  return Math.max(0, Math.min(31, freqIF + dir)) * step;
}

// ─── Frequency Deviation ─────────────────────────────────────────────────────
// f_dev = (fXOSC / 2^17) * (8 + DEV_M) * 2^DEV_E

export function decodeDeviationKHz(regs: Record<number, number>, fXOSC_MHz: number): number {
  const deviatn = regs[REG.DEVIATN] ?? 0x47;
  const e = getBits(deviatn, 6, 4);
  const m = getBits(deviatn, 2, 0);
  return (fXOSC_MHz * 1e6 / Math.pow(2, 17)) * (8 + m) * Math.pow(2, e) / 1000;
}

export function encodeDeviation(kHz: number, fXOSC_MHz: number): number {
  const fXOSC = fXOSC_MHz * 1e6;
  let bestError = Infinity, bestReg = 0x47;
  for (let e = 0; e <= 7; e++) {
    for (let m = 0; m <= 7; m++) {
      const actual = (fXOSC / Math.pow(2, 17)) * (8 + m) * Math.pow(2, e) / 1000;
      const err = Math.abs(actual - kHz);
      if (err < bestError) { bestError = err; bestReg = (e << 4) | m; }
    }
  }
  return bestReg;
}

export function getValidDeviations(fXOSC_MHz: number): number[] {
  const vals: number[] = [];
  for (let e = 0; e <= 7; e++)
    for (let m = 0; m <= 7; m++)
      vals.push((fXOSC_MHz * 1e6 / Math.pow(2, 17)) * (8 + m) * Math.pow(2, e) / 1000);
  return [...new Set(vals)].sort((a, b) => a - b);
}

// ─── Carrier Frequency ───────────────────────────────────────────────────────

export function decodeCarrierFreqMHz(regs: Record<number, number>, fXOSC_MHz: number): number {
  const base = decodeBaseFreqMHz(regs, fXOSC_MHz);
  const chan = regs[REG.CHANNR] ?? 0;
  const spacing = decodeChanSpacingKHz(regs, fXOSC_MHz);
  return base + (chan * spacing) / 1000;
}

// ─── Modulation Format ───────────────────────────────────────────────────────

export type ModFormat = "2-FSK" | "GFSK" | "ASK/OOK" | "4-FSK" | "MSK";

const MOD_FORMAT_MAP: Record<number, ModFormat> = { 0: "2-FSK", 1: "GFSK", 3: "ASK/OOK", 4: "4-FSK", 7: "MSK" };
const MOD_FORMAT_REVERSE: Record<ModFormat, number> = { "2-FSK": 0, GFSK: 1, "ASK/OOK": 3, "4-FSK": 4, MSK: 7 };

export function decodeModFormat(regs: Record<number, number>): ModFormat {
  const val = getBits(regs[REG.MDMCFG2] ?? 0x02, 6, 4);
  return MOD_FORMAT_MAP[val] ?? "2-FSK";
}

export function encodeModFormat(fmt: ModFormat, currentMdmcfg2: number): number {
  return setBits(currentMdmcfg2, 6, 4, MOD_FORMAT_REVERSE[fmt] ?? 0);
}

export function isFSKMode(fmt: ModFormat): boolean {
  return fmt === "2-FSK" || fmt === "GFSK" || fmt === "4-FSK" || fmt === "MSK";
}

// ─── Sync Mode ───────────────────────────────────────────────────────────────

export const SYNC_MODE_OPTIONS: { value: string; label: string; bits: number }[] = [
  { value: "0", label: "No preamble/sync", bits: 0 },
  { value: "1", label: "15/16 sync word bits detected", bits: 1 },
  { value: "2", label: "16/16 sync word bits detected", bits: 2 },
  { value: "3", label: "30/32 sync word bits detected", bits: 3 },
  { value: "4", label: "Carrier sense above threshold", bits: 4 },
  { value: "5", label: "15/16 + carrier sense", bits: 5 },
  { value: "6", label: "16/16 + carrier sense", bits: 6 },
  { value: "7", label: "30/32 + carrier sense", bits: 7 },
];

export function decodeSyncMode(regs: Record<number, number>): string {
  return String(getBits(regs[REG.MDMCFG2] ?? 0x02, 2, 0));
}

export function encodeSyncMode(value: string, currentMdmcfg2: number): number {
  return setBits(currentMdmcfg2, 2, 0, parseInt(value));
}

// ─── Preamble Length ─────────────────────────────────────────────────────────

export const PREAMBLE_OPTIONS: { value: string; label: string; bits: number }[] = [
  { value: "2", label: "2 bytes", bits: 0 },
  { value: "3", label: "3 bytes", bits: 1 },
  { value: "4", label: "4 bytes", bits: 2 },
  { value: "6", label: "6 bytes", bits: 3 },
  { value: "8", label: "8 bytes", bits: 4 },
  { value: "12", label: "12 bytes", bits: 5 },
  { value: "16", label: "16 bytes", bits: 6 },
  { value: "24", label: "24 bytes", bits: 7 },
];

export function decodePreamble(regs: Record<number, number>): string {
  const bits = getBits(regs[REG.MDMCFG1] ?? 0x22, 6, 4);
  return PREAMBLE_OPTIONS.find((o) => o.bits === bits)?.value ?? "4";
}

export function encodePreamble(value: string, currentMdmcfg1: number): number {
  const bits = PREAMBLE_OPTIONS.find((o) => o.value === value)?.bits ?? 2;
  return setBits(currentMdmcfg1, 6, 4, bits);
}

// ─── Address Check ───────────────────────────────────────────────────────────

export const ADDRESS_CHECK_OPTIONS = [
  { value: "0", label: "No address check" },
  { value: "1", label: "Check, no broadcast" },
  { value: "2", label: "Check + 0x00 broadcast" },
  { value: "3", label: "Check + 0x00 and 0xFF broadcast" },
];

// ─── Packet Format ───────────────────────────────────────────────────────────

export const PACKET_FORMAT_OPTIONS = [
  { value: "0", label: "Normal (FIFO)" },
  { value: "1", label: "Sync serial mode" },
  { value: "2", label: "Random TX mode" },
  { value: "3", label: "Async serial mode" },
];

// ─── Packet Length Config ────────────────────────────────────────────────────

export const PKT_LEN_CFG_OPTIONS = [
  { value: "0", label: "Fixed packet length" },
  { value: "1", label: "Variable (first byte = length)" },
  { value: "2", label: "Infinite packet length" },
];

// ─── TX Power PATABLE ────────────────────────────────────────────────────────
// Values from datasheet Table 37 (868 MHz)

export const TX_POWER_OPTIONS: { dbm: number; label: string; patable: number }[] = [
  { dbm: 12, label: "12 dBm", patable: 0xc0 },
  { dbm: 10, label: "10 dBm", patable: 0xc5 },
  { dbm: 7, label: "7 dBm", patable: 0xcd },
  { dbm: 5, label: "5 dBm", patable: 0x86 },
  { dbm: 0, label: "0 dBm", patable: 0x50 },
  { dbm: -6, label: "-6 dBm", patable: 0x37 },
  { dbm: -10, label: "-10 dBm", patable: 0x26 },
  { dbm: -15, label: "-15 dBm", patable: 0x1d },
  { dbm: -20, label: "-20 dBm", patable: 0x17 },
  { dbm: -30, label: "-30 dBm", patable: 0x03 },
];

export function decodeTxPowerDbm(paTable: readonly number[], modFormat: ModFormat): number {
  const powerByte = modFormat === "ASK/OOK" ? paTable[1] : paTable[0];
  return TX_POWER_OPTIONS.find((o) => o.patable === powerByte)?.dbm ?? 0;
}

export function encodeTxPower(
  dbm: number,
  modFormat: ModFormat
): { paTable: [number, number, number, number, number, number, number, number]; frend0: number } {
  const opt = TX_POWER_OPTIONS.find((o) => o.dbm === dbm) ?? TX_POWER_OPTIONS[4];
  const pt: [number, number, number, number, number, number, number, number] = [0, 0, 0, 0, 0, 0, 0, 0];
  if (modFormat === "ASK/OOK") {
    pt[0] = 0x00;
    pt[1] = opt.patable;
    return { paTable: pt, frend0: 0x11 };
  } else {
    pt[0] = opt.patable;
    return { paTable: pt, frend0: 0x10 };
  }
}

// ─── GDO Pin Function Options (from datasheet Table 41) ──────────────────────

export const GDO_FUNCTION_OPTIONS: { value: number; label: string }[] = [
  { value: 0x00, label: "0x00: RX FIFO at or above threshold" },
  { value: 0x01, label: "0x01: RX FIFO at threshold or end of packet" },
  { value: 0x02, label: "0x02: TX FIFO at or above threshold" },
  { value: 0x03, label: "0x03: TX FIFO full" },
  { value: 0x04, label: "0x04: RX FIFO overflowed" },
  { value: 0x05, label: "0x05: TX FIFO underflowed" },
  { value: 0x06, label: "0x06: Sync word sent/received" },
  { value: 0x07, label: "0x07: Packet received with CRC OK" },
  { value: 0x08, label: "0x08: Preamble Quality Reached (PQI above threshold)" },
  { value: 0x09, label: "0x09: Clear Channel Assessment (CCA)" },
  { value: 0x0a, label: "0x0A: Lock detector output (PLL lock)" },
  { value: 0x0b, label: "0x0B: Serial Clock (synchronous serial mode)" },
  { value: 0x0c, label: "0x0C: Serial Synchronous Data Output" },
  { value: 0x0d, label: "0x0D: Serial Data Output (asynchronous mode)" },
  { value: 0x0e, label: "0x0E: Carrier Sense (RSSI above threshold)" },
  { value: 0x0f, label: "0x0F: CRC OK (cleared entering/restarting RX)" },
  { value: 0x16, label: "0x16: RX_HARD_DATA[1]" },
  { value: 0x17, label: "0x17: RX_HARD_DATA[0]" },
  { value: 0x1b, label: "0x1B: PA_PD (PA power-down signal)" },
  { value: 0x1c, label: "0x1C: LNA_PD (LNA power-down signal)" },
  { value: 0x1d, label: "0x1D: RX_SYMBOL_TICK" },
  { value: 0x24, label: "0x24: WOR_EVNT0" },
  { value: 0x25, label: "0x25: WOR_EVNT1" },
  { value: 0x26, label: "0x26: CLK_256" },
  { value: 0x27, label: "0x27: CLK_32k" },
  { value: 0x29, label: "0x29: CHIP_RDYn" },
  { value: 0x2b, label: "0x2B: XOSC_STABLE" },
  { value: 0x2e, label: "0x2E: High impedance / 3-state" },
  { value: 0x2f, label: "0x2F: HW to 0 (1 with INV=1) — external PA/LNA/RX-TX switch" },
  { value: 0x30, label: "0x30: CLK_XOSC/1" },
  { value: 0x31, label: "0x31: CLK_XOSC/1.5" },
  { value: 0x32, label: "0x32: CLK_XOSC/2" },
  { value: 0x33, label: "0x33: CLK_XOSC/3" },
  { value: 0x34, label: "0x34: CLK_XOSC/4" },
  { value: 0x35, label: "0x35: CLK_XOSC/6" },
  { value: 0x36, label: "0x36: CLK_XOSC/8" },
  { value: 0x37, label: "0x37: CLK_XOSC/12" },
  { value: 0x38, label: "0x38: CLK_XOSC/16" },
  { value: 0x39, label: "0x39: CLK_XOSC/24" },
  { value: 0x3a, label: "0x3A: CLK_XOSC/32" },
  { value: 0x3b, label: "0x3B: CLK_XOSC/48" },
  { value: 0x3c, label: "0x3C: CLK_XOSC/64" },
  { value: 0x3d, label: "0x3D: CLK_XOSC/96" },
  { value: 0x3e, label: "0x3E: CLK_XOSC/128" },
  { value: 0x3f, label: "0x3F: CLK_XOSC/192 (default GDO0)" },
];

// ─── Valid frequency bands (MHz) from datasheet Table 5 ─────────────────────

export const VALID_FREQ_RANGES_MHZ: [number, number][] = [
  [300, 348],
  [387, 464],
  [779, 928],
];

export function isValidFreqMHz(mhz: number): boolean {
  return VALID_FREQ_RANGES_MHZ.some(([lo, hi]) => mhz >= lo && mhz <= hi);
}

// ─── Register groups (must be enabled/disabled together) ─────────────────────

export const REGISTER_GROUPS: number[][] = [
  [REG.FREQ2, REG.FREQ1, REG.FREQ0],
  [REG.SYNC1, REG.SYNC0],
  [REG.MDMCFG1, REG.MDMCFG0],
  [REG.MDMCFG4, REG.MDMCFG3],
];

export function getRegisterGroup(addr: number): number[] {
  return REGISTER_GROUPS.find((g) => g.includes(addr)) ?? [addr];
}
