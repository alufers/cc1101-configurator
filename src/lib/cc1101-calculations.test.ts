/**
 * Unit tests for CC1101 register encode/decode functions.
 *
 * Reference values come from TI SmartRF Studio screenshots showing three
 * configurations, all with fXOSC = 26 MHz:
 *
 *  Case A (Image 1): 868 MHz, GFSK, 38.38 kBaud, 101.56 kHz BW, 20.64 kHz dev
 *    FREQ2=0x21 FREQ1=0x62 FREQ0=0x76
 *    MDMCFG4=0xCA  MDMCFG3=0x83
 *    DEVIATN=0x35  FSCTRL1=0x06
 *    MDMCFG1=0x22  MDMCFG0=0xF8
 *
 *  Case B (Image 2): 868 MHz, GFSK, 249.94 kBaud, 541.67 kHz BW, 126.95 kHz dev
 *    FREQ2=0x21 FREQ1=0x62 FREQ0=0x76
 *    MDMCFG4=0x2D  MDMCFG3=0x3B
 *    DEVIATN=0x62  FSCTRL1=0x12
 *    MDMCFG1=0x22  MDMCFG0=0xF8
 *
 *  Case C (Image 3): 915 MHz, same modem config as Case B
 *    FREQ2=0x23 FREQ1=0x31 FREQ0=0x3B
 *    MDMCFG4=0x2D  MDMCFG3=0x3B
 *    DEVIATN=0x62  FSCTRL1=0x12
 */

import {
  getBits,
  setBits,
  findNearestIndex,
  decodeBaseFreqMHz,
  encodeBaseFreq,
  decodeDataRateKBaud,
  encodeDataRate,
  getValidDataRates,
  decodeRxBwKHz,
  encodeRxBw,
  getValidRxBwValues,
  decodeDeviationKHz,
  encodeDeviation,
  getValidDeviations,
  decodeIFFreqKHz,
  encodeIFFreq,
  stepIFFreqKHz,
  decodeChanSpacingKHz,
  encodeChanSpacing,
  getValidChanSpacings,
  decodeCarrierFreqMHz,
  decodeModFormat,
  encodeModFormat,
  isFSKMode,
  REG,
} from "./cc1101-calculations";

const XTAL = 26.0; // MHz

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Build a minimal register map sufficient for a specific decode function. */
function regsA() {
  return {
    [REG.FREQ2]: 0x21, [REG.FREQ1]: 0x62, [REG.FREQ0]: 0x76,
    [REG.MDMCFG4]: 0xca, [REG.MDMCFG3]: 0x83,
    [REG.DEVIATN]: 0x35,
    [REG.FSCTRL1]: 0x06,
    [REG.MDMCFG1]: 0x22, [REG.MDMCFG0]: 0xf8,
    [REG.CHANNR]: 0x00,
  };
}

function regsB() {
  return {
    [REG.FREQ2]: 0x21, [REG.FREQ1]: 0x62, [REG.FREQ0]: 0x76,
    [REG.MDMCFG4]: 0x2d, [REG.MDMCFG3]: 0x3b,
    [REG.DEVIATN]: 0x62,
    [REG.FSCTRL1]: 0x12,
    [REG.MDMCFG1]: 0x22, [REG.MDMCFG0]: 0xf8,
    [REG.CHANNR]: 0x00,
  };
}

function regsC() {
  return {
    ...regsB(),
    [REG.FREQ2]: 0x23, [REG.FREQ1]: 0x31, [REG.FREQ0]: 0x3b,
  };
}

// ─── getBits / setBits ────────────────────────────────────────────────────────

describe("getBits", () => {
  test("extracts a single bit", () => {
    expect(getBits(0b10110110, 7, 7)).toBe(1);
    expect(getBits(0b10110110, 0, 0)).toBe(0);
  });

  test("extracts a multi-bit field", () => {
    expect(getBits(0b10110110, 7, 6)).toBe(0b10);
    expect(getBits(0b10110110, 5, 4)).toBe(0b11);
    expect(getBits(0b10110110, 3, 0)).toBe(0b0110);
  });

  test("full byte", () => {
    expect(getBits(0xca, 7, 0)).toBe(0xca);
  });

  test("MDMCFG4=0xCA: CHANBW_E=3 CHANBW_M=0 DRATE_E=10", () => {
    const reg = 0xca;
    expect(getBits(reg, 7, 6)).toBe(3);  // CHANBW_E
    expect(getBits(reg, 5, 4)).toBe(0);  // CHANBW_M
    expect(getBits(reg, 3, 0)).toBe(10); // DRATE_E
  });

  test("DEVIATN=0x35: DEVIATION_E=3 DEVIATION_M=5", () => {
    const reg = 0x35;
    expect(getBits(reg, 6, 4)).toBe(3); // DEVIATION_E
    expect(getBits(reg, 2, 0)).toBe(5); // DEVIATION_M
  });

  test("DEVIATN=0x62: DEVIATION_E=6 DEVIATION_M=2", () => {
    const reg = 0x62;
    expect(getBits(reg, 6, 4)).toBe(6); // DEVIATION_E
    expect(getBits(reg, 2, 0)).toBe(2); // DEVIATION_M
  });
});

describe("setBits", () => {
  test("sets high bits", () => {
    expect(setBits(0x00, 7, 6, 0b11)).toBe(0b11000000);
  });

  test("sets low nibble without touching high nibble", () => {
    expect(setBits(0xf0, 3, 0, 0b0101)).toBe(0xf5);
  });

  test("clears bits when value is 0", () => {
    expect(setBits(0xff, 3, 0, 0)).toBe(0xf0);
  });

  test("roundtrip: get then set gives original byte", () => {
    const byte = 0xca;
    const e = getBits(byte, 7, 6);
    const m = getBits(byte, 5, 4);
    const d = getBits(byte, 3, 0);
    let rebuilt = 0x00;
    rebuilt = setBits(rebuilt, 7, 6, e);
    rebuilt = setBits(rebuilt, 5, 4, m);
    rebuilt = setBits(rebuilt, 3, 0, d);
    expect(rebuilt).toBe(byte);
  });
});

// ─── findNearestIndex ─────────────────────────────────────────────────────────

describe("findNearestIndex", () => {
  const arr = [1, 5, 10, 20, 50, 100];

  test("finds exact match", () => {
    expect(arr[findNearestIndex(10, arr)]).toBe(10);
  });

  test("finds nearest below", () => {
    expect(arr[findNearestIndex(7, arr)]).toBe(5);
  });

  test("finds nearest above", () => {
    expect(arr[findNearestIndex(14, arr)]).toBe(10);
  });

  test("clamps to first element", () => {
    expect(arr[findNearestIndex(0, arr)]).toBe(1);
  });

  test("clamps to last element", () => {
    expect(arr[findNearestIndex(999, arr)]).toBe(100);
  });
});

// ─── Base Frequency ───────────────────────────────────────────────────────────

describe("decodeBaseFreqMHz", () => {
  test("Case A: FREQ=0x216276 → ~867.999 MHz", () => {
    // 26 * 2187894 / 65536 = 867.9998...
    const freq = decodeBaseFreqMHz(regsA(), XTAL);
    expect(freq).toBeCloseTo(868.0, 1);
  });

  test("Case B: same FREQ bytes as Case A → ~868 MHz", () => {
    expect(decodeBaseFreqMHz(regsB(), XTAL)).toBeCloseTo(868.0, 1);
  });

  test("Case C: FREQ=0x23313B → ~915 MHz", () => {
    // 26 * 2306363 / 65536 = 914.9993...
    const freq = decodeBaseFreqMHz(regsC(), XTAL);
    expect(freq).toBeCloseTo(915.0, 1);
  });

  test("433 MHz band: FREQ2=0x10 FREQ1=0xB0 FREQ0=0x71 → ~433.92 MHz", () => {
    // 26 * 1093745 / 65536 = 433.918... MHz
    const regs = { [REG.FREQ2]: 0x10, [REG.FREQ1]: 0xb0, [REG.FREQ0]: 0x71 };
    expect(decodeBaseFreqMHz(regs, XTAL)).toBeCloseTo(433.92, 1);
  });

  test("exact formula: freq = (fXOSC / 2^16) * FREQ[23:0]", () => {
    // FREQ word = 1, smallest nonzero frequency
    const regs = { [REG.FREQ2]: 0, [REG.FREQ1]: 0, [REG.FREQ0]: 1 };
    expect(decodeBaseFreqMHz(regs, XTAL)).toBeCloseTo(26 / 65536, 8);
  });
});

describe("encodeBaseFreq", () => {
  test("encode 868 MHz round-trips to within 1 kHz", () => {
    const encoded = encodeBaseFreq(868.0, XTAL);
    expect(decodeBaseFreqMHz(encoded, XTAL)).toBeCloseTo(868.0, 2);
  });

  test("encode 915 MHz round-trips to within 1 kHz", () => {
    const encoded = encodeBaseFreq(915.0, XTAL);
    expect(decodeBaseFreqMHz(encoded, XTAL)).toBeCloseTo(915.0, 2);
  });

  test("encode 433.92 MHz round-trips to within 1 kHz", () => {
    const encoded = encodeBaseFreq(433.92, XTAL);
    expect(decodeBaseFreqMHz(encoded, XTAL)).toBeCloseTo(433.92, 2);
  });

  test("encode 315 MHz round-trips", () => {
    const encoded = encodeBaseFreq(315.0, XTAL);
    expect(decodeBaseFreqMHz(encoded, XTAL)).toBeCloseTo(315.0, 1);
  });

  test("output is three register entries", () => {
    const encoded = encodeBaseFreq(868.0, XTAL);
    expect(encoded).toHaveProperty(String(REG.FREQ2));
    expect(encoded).toHaveProperty(String(REG.FREQ1));
    expect(encoded).toHaveProperty(String(REG.FREQ0));
  });

  test("FREQ2 uses only 6 bits (≤ 0x3F)", () => {
    for (const freq of [315, 433.92, 868, 915]) {
      const encoded = encodeBaseFreq(freq, XTAL);
      expect(encoded[REG.FREQ2]).toBeLessThanOrEqual(0x3f);
    }
  });
});

// ─── Data Rate ────────────────────────────────────────────────────────────────

describe("decodeDataRateKBaud", () => {
  test("Case A: MDMCFG4=0xCA MDMCFG3=0x83 → ~38.38 kBaud", () => {
    // (256+131) * 2^10 * 26e6 / 2^28 / 1000 = 38.384 kBaud
    expect(decodeDataRateKBaud(regsA(), XTAL)).toBeCloseTo(38.384, 1);
  });

  test("Case B/C: MDMCFG4=0x2D MDMCFG3=0x3B → ~249.94 kBaud", () => {
    // (256+59) * 2^13 * 26e6 / 2^28 / 1000 = 249.939 kBaud
    expect(decodeDataRateKBaud(regsB(), XTAL)).toBeCloseTo(249.94, 1);
  });

  test("exact formula check at minimum: DRATE_E=0 DRATE_M=0 → 0.5975 kBaud", () => {
    // (256+0) * 2^0 * 26e6 / 2^28 / 1000 = 256*26e6/268435456/1000
    const regs = { [REG.MDMCFG4]: 0x00, [REG.MDMCFG3]: 0x00 };
    const expected = 256 * 26e6 / Math.pow(2, 28) / 1000;
    expect(decodeDataRateKBaud(regs, XTAL)).toBeCloseTo(expected, 4);
  });
});

describe("encodeDataRate", () => {
  test("encode 38.4 kBaud round-trips within 0.5 kBaud", () => {
    const encoded = encodeDataRate(38.4, XTAL);
    expect(decodeDataRateKBaud(encoded, XTAL)).toBeCloseTo(38.4, 0);
  });

  test("encode 250 kBaud round-trips within 1 kBaud", () => {
    const encoded = encodeDataRate(250, XTAL);
    expect(decodeDataRateKBaud(encoded, XTAL)).toBeCloseTo(250, 0);
  });

  test("encode 1.2 kBaud round-trips within 0.1 kBaud", () => {
    const encoded = encodeDataRate(1.2, XTAL);
    expect(decodeDataRateKBaud(encoded, XTAL)).toBeCloseTo(1.2, 1);
  });

  test("encode 4.8 kBaud round-trips within 0.1 kBaud", () => {
    const encoded = encodeDataRate(4.8, XTAL);
    expect(decodeDataRateKBaud(encoded, XTAL)).toBeCloseTo(4.8, 1);
  });

  test("encode 9.6 kBaud round-trips within 0.1 kBaud", () => {
    const encoded = encodeDataRate(9.6, XTAL);
    expect(decodeDataRateKBaud(encoded, XTAL)).toBeCloseTo(9.6, 1);
  });

  test("DRATE_E fits in 4 bits (≤ 15)", () => {
    for (const rate of [1.2, 38.4, 250]) {
      const encoded = encodeDataRate(rate, XTAL);
      expect(getBits(encoded[REG.MDMCFG4] ?? 0, 3, 0)).toBeLessThanOrEqual(15);
    }
  });

  test("DRATE_M fits in a byte (≤ 255)", () => {
    for (const rate of [1.2, 38.4, 250]) {
      const encoded = encodeDataRate(rate, XTAL);
      expect(encoded[REG.MDMCFG3]).toBeGreaterThanOrEqual(0);
      expect(encoded[REG.MDMCFG3]).toBeLessThanOrEqual(255);
    }
  });

  test("getValidDataRates contains all 16*256 unique values sorted", () => {
    const vals = getValidDataRates(XTAL);
    expect(vals.length).toBeGreaterThan(0);
    for (let i = 1; i < vals.length; i++) {
      expect(vals[i]).toBeGreaterThanOrEqual(vals[i - 1]);
    }
  });
});

// ─── RX Filter Bandwidth ──────────────────────────────────────────────────────

describe("decodeRxBwKHz", () => {
  test("Case A: MDMCFG4=0xCA → 101.5625 kHz", () => {
    // fXOSC / (8 * (4+0) * 2^3) = 26e6/256 = 101562.5 Hz
    expect(decodeRxBwKHz(regsA(), XTAL)).toBeCloseTo(101.5625, 3);
  });

  test("Case B/C: MDMCFG4=0x2D → 541.6667 kHz", () => {
    // fXOSC / (8 * (4+2) * 2^0) = 26e6/48 = 541666.67 Hz
    expect(decodeRxBwKHz(regsB(), XTAL)).toBeCloseTo(541.667, 2);
  });

  test("max BW: CHANBW_E=0 CHANBW_M=0 → 812.5 kHz", () => {
    // 26e6 / (8 * 4 * 1) = 812500 Hz
    const regs = { [REG.MDMCFG4]: 0x00 };
    expect(decodeRxBwKHz(regs, XTAL)).toBeCloseTo(812.5, 1);
  });

  test("min BW: CHANBW_E=3 CHANBW_M=3 → ~50.78 kHz", () => {
    // 26e6 / (8 * 7 * 8) = 26e6/448 = 58035.7 Hz
    // Actually: E=3, M=3 → 26e6/(8*(4+3)*2^3) = 26e6/448 = 58035.7
    const regs = { [REG.MDMCFG4]: 0xff };
    const bw = decodeRxBwKHz(regs, XTAL);
    expect(bw).toBeGreaterThan(0);
    expect(bw).toBeLessThan(100);
  });
});

describe("encodeRxBw", () => {
  test("encode 101.5625 kHz selects CHANBW_E=3 CHANBW_M=0", () => {
    const reg = encodeRxBw(101.5625, XTAL, 0x00);
    expect(getBits(reg, 7, 6)).toBe(3); // CHANBW_E
    expect(getBits(reg, 5, 4)).toBe(0); // CHANBW_M
  });

  test("encode 541.667 kHz selects CHANBW_E=0 CHANBW_M=2", () => {
    const reg = encodeRxBw(541.667, XTAL, 0x00);
    expect(getBits(reg, 7, 6)).toBe(0); // CHANBW_E
    expect(getBits(reg, 5, 4)).toBe(2); // CHANBW_M
  });

  test("encode round-trips for all 16 valid BW values", () => {
    const validBws = getValidRxBwValues(XTAL);
    for (const bw of validBws) {
      const reg = encodeRxBw(bw, XTAL, 0x00);
      const decoded = decodeRxBwKHz({ [REG.MDMCFG4]: reg }, XTAL);
      expect(decoded).toBeCloseTo(bw, 2);
    }
  });

  test("encoding preserves data-rate bits in MDMCFG4", () => {
    const original = 0x83; // DRATE_E = 3 in low nibble
    const encoded = encodeRxBw(101.5625, XTAL, original);
    // Low 4 bits must be preserved from original
    expect(getBits(encoded, 3, 0)).toBe(getBits(original, 3, 0));
  });

  test("exactly 16 unique BW values with 26 MHz crystal", () => {
    expect(getValidRxBwValues(XTAL)).toHaveLength(16);
  });
});

// ─── Frequency Deviation ──────────────────────────────────────────────────────

describe("decodeDeviationKHz", () => {
  test("Case A: DEVIATN=0x35 → E=3 M=5 → 20629.88 Hz = 20.6299 kHz", () => {
    // 26e6 * (8+5) * 2^3 / 2^17 = 26e6 * 104 / 131072 = 20629.8828125 Hz
    expect(decodeDeviationKHz({ [REG.DEVIATN]: 0x35 }, XTAL)).toBeCloseTo(20.6299, 2);
  });

  test("Case B/C: DEVIATN=0x62 → E=6 M=2 → 126953.125 Hz = 126.953 kHz", () => {
    // 26e6 / 2^17 * 10 * 64 = 26e6*640/131072 = 126953.125 Hz
    expect(decodeDeviationKHz({ [REG.DEVIATN]: 0x62 }, XTAL)).toBeCloseTo(126.953, 2);
  });

  test("min value: E=0 M=0 → ~1.587 kHz", () => {
    // 26e6/131072 * 8 * 1 = 1586.9... Hz
    const dev = decodeDeviationKHz({ [REG.DEVIATN]: 0x00 }, XTAL);
    expect(dev).toBeCloseTo(1.587, 1);
  });

  test("exact formula: fdev = fXOSC/2^17 * (8+M) * 2^E", () => {
    const E = 2, M = 3;
    const reg = (E << 4) | M; // bits 6:4 = E, bits 2:0 = M
    const expected = XTAL * 1e6 / Math.pow(2, 17) * (8 + M) * Math.pow(2, E) / 1000;
    expect(decodeDeviationKHz({ [REG.DEVIATN]: reg }, XTAL)).toBeCloseTo(expected, 4);
  });
});

describe("encodeDeviation", () => {
  test("encode 20.6375 kHz → DEVIATN=0x35", () => {
    expect(encodeDeviation(20.6375, XTAL)).toBe(0x35);
  });

  test("encode 126.953125 kHz → DEVIATN=0x62", () => {
    expect(encodeDeviation(126.953125, XTAL)).toBe(0x62);
  });

  test("encode 47.607 kHz round-trips within 2 kHz", () => {
    const reg = encodeDeviation(47.607, XTAL);
    expect(decodeDeviationKHz({ [REG.DEVIATN]: reg }, XTAL)).toBeCloseTo(47.607, 0);
  });

  test("encode round-trips for all 64 valid deviation values", () => {
    const validDevs = getValidDeviations(XTAL);
    for (const dev of validDevs) {
      const reg = encodeDeviation(dev, XTAL);
      expect(decodeDeviationKHz({ [REG.DEVIATN]: reg }, XTAL)).toBeCloseTo(dev, 2);
    }
  });

  test("output fits in a byte", () => {
    for (const dev of [1.59, 20.6, 47.6, 127]) {
      const reg = encodeDeviation(dev, XTAL);
      expect(reg).toBeGreaterThanOrEqual(0);
      expect(reg).toBeLessThanOrEqual(0xff);
    }
  });
});

// ─── IF Frequency ─────────────────────────────────────────────────────────────

describe("decodeIFFreqKHz", () => {
  test("Case A: FSCTRL1=0x06 → FREQ_IF=6 → 152.34375 kHz", () => {
    // 26e6/1024 * 6 = 152343.75 Hz
    expect(decodeIFFreqKHz({ [REG.FSCTRL1]: 0x06 }, XTAL)).toBeCloseTo(152.344, 2);
  });

  test("Case B/C: FSCTRL1=0x12 → FREQ_IF=18 → 457.03125 kHz", () => {
    // 26e6/1024 * 18 = 457031.25 Hz
    expect(decodeIFFreqKHz({ [REG.FSCTRL1]: 0x12 }, XTAL)).toBeCloseTo(457.031, 2);
  });

  test("FREQ_IF=0 → 0 kHz", () => {
    expect(decodeIFFreqKHz({ [REG.FSCTRL1]: 0x00 }, XTAL)).toBeCloseTo(0, 5);
  });

  test("FREQ_IF=15 (max sensible) → 380.859 kHz", () => {
    // 26e6/1024 * 15 = 380859.375 Hz
    expect(decodeIFFreqKHz({ [REG.FSCTRL1]: 0x0f }, XTAL)).toBeCloseTo(380.859, 2);
  });
});

describe("encodeIFFreq", () => {
  test("encode 152.344 kHz → FREQ_IF=6", () => {
    expect(encodeIFFreq(152.344, XTAL)).toBe(6);
  });

  test("encode 457.031 kHz → FREQ_IF=18", () => {
    expect(encodeIFFreq(457.031, XTAL)).toBe(18);
  });

  test("clamps negative input to 0", () => {
    expect(encodeIFFreq(-10, XTAL)).toBe(0);
  });

  test("clamps oversized input to 31", () => {
    expect(encodeIFFreq(9999, XTAL)).toBe(31);
  });

  test("round-trip is exact (only 32 valid values)", () => {
    for (let freqIF = 0; freqIF <= 31; freqIF++) {
      const kHz = XTAL * 1e6 / Math.pow(2, 10) * freqIF / 1000;
      expect(encodeIFFreq(kHz, XTAL)).toBe(freqIF);
    }
  });
});

describe("stepIFFreqKHz", () => {
  test("steps up by one FREQ_IF unit", () => {
    const step = XTAL * 1e6 / Math.pow(2, 10) / 1000; // one LSB in kHz
    const curr = step * 6; // FREQ_IF=6
    expect(stepIFFreqKHz(curr, 1, XTAL)).toBeCloseTo(step * 7, 4);
  });

  test("clamps at 0 when stepping down from 0", () => {
    expect(stepIFFreqKHz(0, -1, XTAL)).toBeCloseTo(0, 4);
  });

  test("clamps at 31*step when stepping up from max", () => {
    const step = XTAL * 1e6 / Math.pow(2, 10) / 1000;
    const max = step * 31;
    expect(stepIFFreqKHz(max, 1, XTAL)).toBeCloseTo(max, 4);
  });
});

// ─── Channel Spacing ──────────────────────────────────────────────────────────

describe("decodeChanSpacingKHz", () => {
  test("Case A/B/C: MDMCFG1=0x22 MDMCFG0=0xF8 → 199.951172 kHz", () => {
    // E=2, M=248: 26e6/2^18 * (256+248) * 4 = 26e6*2016/262144 = 199951.17 Hz
    expect(decodeChanSpacingKHz(regsA(), XTAL)).toBeCloseTo(199.951172, 4);
  });

  test("E=0 M=0 → minimum spacing ~49.988 kHz", () => {
    // 26e6/2^18 * 256 * 1 = 26e6*256/262144 = 25390.625 Hz
    const regs = { [REG.MDMCFG1]: 0x00, [REG.MDMCFG0]: 0x00 };
    expect(decodeChanSpacingKHz(regs, XTAL)).toBeCloseTo(25.391, 2);
  });

  test("E=3 M=255 → maximum spacing ~405.457 kHz", () => {
    // 26e6/2^18 * (256+255) * 8 = 26e6*4088/262144
    const regs = { [REG.MDMCFG1]: 0x03, [REG.MDMCFG0]: 0xff };
    const spacing = decodeChanSpacingKHz(regs, XTAL);
    expect(spacing).toBeGreaterThan(400);
  });
});

describe("encodeChanSpacing", () => {
  test("encode 199.951 kHz → decodes back within 0.01 kHz", () => {
    const encoded = encodeChanSpacing(199.951, XTAL);
    expect(decodeChanSpacingKHz(encoded, XTAL)).toBeCloseTo(199.951, 1);
  });

  test("encode 100 kHz round-trips within 1 kHz", () => {
    const encoded = encodeChanSpacing(100, XTAL);
    expect(decodeChanSpacingKHz(encoded, XTAL)).toBeCloseTo(100, 0);
  });

  test("encode 50 kHz round-trips within 1 kHz", () => {
    const encoded = encodeChanSpacing(50, XTAL);
    expect(decodeChanSpacingKHz(encoded, XTAL)).toBeCloseTo(50, 0);
  });

  test("preserves upper bits of MDMCFG1", () => {
    const base = 0xf4; // preamble/FEC bits set in upper nibble
    const encoded = encodeChanSpacing(200, XTAL, base);
    // bits [7:2] should be preserved
    expect(getBits(encoded[REG.MDMCFG1], 7, 2)).toBe(getBits(base, 7, 2));
  });

  test("getValidChanSpacings returns sorted values", () => {
    const vals = getValidChanSpacings(XTAL);
    expect(vals.length).toBeGreaterThan(0);
    for (let i = 1; i < vals.length; i++) {
      expect(vals[i]).toBeGreaterThanOrEqual(vals[i - 1]);
    }
  });
});

// ─── Carrier Frequency ────────────────────────────────────────────────────────

describe("decodeCarrierFreqMHz", () => {
  test("Case A: channel 0 → carrier equals base frequency", () => {
    const carrier = decodeCarrierFreqMHz(regsA(), XTAL);
    const base = decodeBaseFreqMHz(regsA(), XTAL);
    expect(carrier).toBeCloseTo(base, 6);
  });

  test("channel 1 shifts carrier by one channel spacing", () => {
    const regsAch1 = { ...regsA(), [REG.CHANNR]: 1 };
    const carrier = decodeCarrierFreqMHz(regsAch1, XTAL);
    const base = decodeBaseFreqMHz(regsA(), XTAL);
    const spacing = decodeChanSpacingKHz(regsA(), XTAL);
    expect(carrier).toBeCloseTo(base + spacing / 1000, 4);
  });

  test("channel 10 shifts carrier by 10 × spacing", () => {
    const regsAch10 = { ...regsA(), [REG.CHANNR]: 10 };
    const carrier = decodeCarrierFreqMHz(regsAch10, XTAL);
    const base = decodeBaseFreqMHz(regsA(), XTAL);
    const spacing = decodeChanSpacingKHz(regsA(), XTAL);
    expect(carrier).toBeCloseTo(base + 10 * spacing / 1000, 3);
  });

  test("Case C: 915 MHz + channel 0 → ~915 MHz", () => {
    expect(decodeCarrierFreqMHz(regsC(), XTAL)).toBeCloseTo(915.0, 1);
  });
});

// ─── Modulation Format ────────────────────────────────────────────────────────

describe("decodeModFormat / encodeModFormat", () => {
  const formats = ["2-FSK", "GFSK", "ASK/OOK", "4-FSK", "MSK"] as const;

  test("encodes and decodes all formats without touching other bits", () => {
    const base = 0b10001010; // some unrelated bits in positions [7,3:0]
    for (const fmt of formats) {
      const reg = encodeModFormat(fmt, base);
      const regs = { [REG.MDMCFG2]: reg };
      expect(decodeModFormat(regs)).toBe(fmt);
      // Other bits (7, 3:0) should be preserved
      expect(getBits(reg, 7, 7)).toBe(getBits(base, 7, 7));
      expect(getBits(reg, 2, 0)).toBe(getBits(base, 2, 0));
    }
  });

  test("isFSKMode: FSK variants return true, OOK false", () => {
    expect(isFSKMode("2-FSK")).toBe(true);
    expect(isFSKMode("GFSK")).toBe(true);
    expect(isFSKMode("4-FSK")).toBe(true);
    expect(isFSKMode("MSK")).toBe(true);
    expect(isFSKMode("ASK/OOK")).toBe(false);
  });
});

// ─── Cross-check: full Case A register map ───────────────────────────────────

describe("Case A full integration (868 MHz GFSK 38.4 kBaud)", () => {
  const r = regsA();

  test("base frequency ~868 MHz", () => {
    expect(decodeBaseFreqMHz(r, XTAL)).toBeCloseTo(868.0, 1);
  });

  test("data rate ~38.38 kBaud", () => {
    expect(decodeDataRateKBaud(r, XTAL)).toBeCloseTo(38.38, 1);
  });

  test("RX BW = 101.5625 kHz", () => {
    expect(decodeRxBwKHz(r, XTAL)).toBeCloseTo(101.5625, 3);
  });

  test("deviation ~20.64 kHz", () => {
    expect(decodeDeviationKHz(r, XTAL)).toBeCloseTo(20.64, 0);
  });

  test("IF frequency ~152.34 kHz", () => {
    expect(decodeIFFreqKHz(r, XTAL)).toBeCloseTo(152.344, 2);
  });

  test("channel spacing ~199.951 kHz", () => {
    expect(decodeChanSpacingKHz(r, XTAL)).toBeCloseTo(199.951, 2);
  });

  test("carrier equals base at channel 0", () => {
    expect(decodeCarrierFreqMHz(r, XTAL)).toBeCloseTo(868.0, 1);
  });
});

describe("Case B full integration (868 MHz GFSK 250 kBaud)", () => {
  const r = regsB();

  test("base frequency ~868 MHz", () => {
    expect(decodeBaseFreqMHz(r, XTAL)).toBeCloseTo(868.0, 1);
  });

  test("data rate ~249.94 kBaud", () => {
    expect(decodeDataRateKBaud(r, XTAL)).toBeCloseTo(249.94, 1);
  });

  test("RX BW = 541.667 kHz", () => {
    expect(decodeRxBwKHz(r, XTAL)).toBeCloseTo(541.667, 2);
  });

  test("deviation = 126.953125 kHz", () => {
    expect(decodeDeviationKHz(r, XTAL)).toBeCloseTo(126.953125, 3);
  });

  test("IF frequency = 457.031 kHz", () => {
    expect(decodeIFFreqKHz(r, XTAL)).toBeCloseTo(457.031, 2);
  });

  test("channel spacing ~199.951 kHz", () => {
    expect(decodeChanSpacingKHz(r, XTAL)).toBeCloseTo(199.951, 2);
  });
});

describe("Case C full integration (915 MHz GFSK 250 kBaud)", () => {
  const r = regsC();

  test("base frequency ~915 MHz", () => {
    expect(decodeBaseFreqMHz(r, XTAL)).toBeCloseTo(915.0, 1);
  });

  test("data rate same as Case B", () => {
    expect(decodeDataRateKBaud(r, XTAL)).toBeCloseTo(249.94, 1);
  });

  test("RX BW same as Case B", () => {
    expect(decodeRxBwKHz(r, XTAL)).toBeCloseTo(541.667, 2);
  });
});
