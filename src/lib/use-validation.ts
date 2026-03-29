import { useCC1101Store } from "./use-cc1101-store";
import {
  decodeBaseFreqMHz,
  decodeDataRateKBaud,
  decodeModFormat,
  decodeTxPowerDbm,
  isValidFreqMHz,
  VALID_FREQ_RANGES_MHZ,
  getBits,
  REG,
} from "./cc1101-calculations";

export interface ValidationError {
  /** Identifies which field this error belongs to */
  field: string;
  message: string;
}

export function useValidation(): ValidationError[] {
  const registers = useCC1101Store((s) => s.registers);
  const paTable = useCC1101Store((s) => s.paTable);
  const crystalFreqMHz = useCC1101Store((s) => s.crystalFreqMHz);
  const validationEnabled = useCC1101Store((s) => s.validationEnabled);

  const errors: ValidationError[] = [];

  if (!validationEnabled) return errors;

  const modFormat = decodeModFormat(registers);
  const baseFreqMHz = decodeBaseFreqMHz(registers, crystalFreqMHz);
  const dataRateKBaud = decodeDataRateKBaud(registers, crystalFreqMHz);
  const txPowerDbm = decodeTxPowerDbm(paTable, modFormat);
  const pktctrl0 = registers[REG.PKTCTRL0] ?? 0x45;
  const mdmcfg1 = registers[REG.MDMCFG1] ?? 0x22;

  // Frequency band validation
  if (!isValidFreqMHz(baseFreqMHz)) {
    const ranges = VALID_FREQ_RANGES_MHZ.map(([lo, hi]) => `${lo}–${hi} MHz`).join(", ");
    errors.push({
      field: "baseFreq",
      message: `Frequency must be in a valid band: ${ranges}`,
    });
  }

  // MSK requires data rate > 26 kBaud
  if (modFormat === "MSK" && dataRateKBaud <= 26) {
    errors.push({
      field: "modFormat",
      message: "MSK requires data rate > 26 kBaud",
    });
    errors.push({
      field: "dataRate",
      message: "MSK requires data rate > 26 kBaud",
    });
  }

  // ASK/OOK max output power limitation
  if (modFormat === "ASK/OOK" && txPowerDbm > -1) {
    errors.push({
      field: "txPower",
      message: "ASK/OOK output power must be ≤ −1 dBm",
    });
  }

  // FEC only with fixed packet length
  const fecEnabled = getBits(mdmcfg1, 7, 7) === 1;
  const pktLenCfg = getBits(pktctrl0, 1, 0);
  if (fecEnabled && pktLenCfg !== 0) {
    errors.push({
      field: "fecEnable",
      message: "FEC is only supported with fixed packet length (LENGTH_CONFIG = 0)",
    });
    errors.push({
      field: "pktLenCfg",
      message: "Variable/infinite length mode is incompatible with FEC",
    });
  }

  return errors;
}

/** Find error message for a specific field, or undefined if none. */
export function findError(errors: ValidationError[], field: string): string | undefined {
  return errors.find((e) => e.field === field)?.message;
}
