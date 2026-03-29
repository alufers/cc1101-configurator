import { REG } from "./cc1101-calculations";
import type { PaTable } from "./cc1101-types";

export const DEFAULT_PATABLE: PaTable = [0xc0, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00];
export const DEFAULT_CRYSTAL_MHZ = 26.0;
export const DEFAULT_PRESET_NAME = "my_preset";

/** Only these registers are included in the output by default. */
export const DEFAULT_ENABLED_REGS: Record<number, boolean> = {
  [REG.MDMCFG2]: true,
  [REG.MDMCFG3]: true,
  [REG.MDMCFG4]: true,
};
