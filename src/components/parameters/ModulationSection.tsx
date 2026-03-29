import { useMemo } from "react";
import { AudioLines } from "lucide-react";
import { ParamRow } from "@/components/ParamRow";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { NumericInput } from "@/components/NumericInput";
import { RegGroup } from "@/components/RegGroup";
import { useCC1101Store } from "@/lib/use-cc1101-store";
import { useValidation, findError } from "@/lib/use-validation";
import {
  decodeDataRateKBaud,
  encodeDataRate,
  decodeDeviationKHz,
  encodeDeviation,
  decodeModFormat,
  encodeModFormat,
  decodeSyncMode,
  encodeSyncMode,
  isFSKMode,
  SYNC_MODE_OPTIONS,
  getValidDataRates,
  getValidDeviations,
  getBits,
  setBits,
  type ModFormat,
  REG,
} from "@/lib/cc1101-calculations";

export function ModulationSection() {
  const mdmcfg2 = useCC1101Store((s) => s.registers[REG.MDMCFG2] ?? 0x02);
  const mdmcfg3 = useCC1101Store((s) => s.registers[REG.MDMCFG3] ?? 0x22);
  const mdmcfg4 = useCC1101Store((s) => s.registers[REG.MDMCFG4] ?? 0x8b);
  const deviatn = useCC1101Store((s) => s.registers[REG.DEVIATN] ?? 0x47);
  const crystalFreqMHz = useCC1101Store((s) => s.crystalFreqMHz);
  const setRegisters = useCC1101Store((s) => s.setRegisters);
  const setRegister = useCC1101Store((s) => s.setRegister);

  const errors = useValidation();

  const regs = { [REG.MDMCFG2]: mdmcfg2, [REG.MDMCFG3]: mdmcfg3, [REG.MDMCFG4]: mdmcfg4, [REG.DEVIATN]: deviatn };

  const modFormat = decodeModFormat(regs);
  const showDeviation = isFSKMode(modFormat);
  const dataRateKBaud = decodeDataRateKBaud(regs, crystalFreqMHz);
  const deviationKHz = decodeDeviationKHz(regs, crystalFreqMHz);
  const syncMode = decodeSyncMode(regs);
  const manchesterOn = getBits(mdmcfg2, 3, 3) === 1;
  const dcFilterOff = getBits(mdmcfg2, 7, 7) === 1;

  const validDataRates = useMemo(() => getValidDataRates(crystalFreqMHz), [crystalFreqMHz]);
  const validDeviations = useMemo(() => getValidDeviations(crystalFreqMHz), [crystalFreqMHz]);

  return (
    <div>
      <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-1.5">
        <AudioLines className="w-3.5 h-3.5" />
        Modulation
      </h3>

      <RegGroup addrs={[REG.MDMCFG2]}>
        <ParamRow
          label="Format"
          description="Modulation format (MOD_FORMAT). MSK requires data rate > 26 kBaud."
          error={findError(errors, "modFormat")}
          focusAddrs={[REG.MDMCFG2]}
          focusBitRanges={[{ addr: REG.MDMCFG2, startBit: 6, stopBit: 4 }]}
        >
          <Select value={modFormat} onValueChange={(fmt) => setRegister(REG.MDMCFG2, encodeModFormat(fmt as ModFormat, mdmcfg2))}>
            <SelectTrigger className="h-7 text-xs flex-1">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {(["2-FSK", "GFSK", "ASK/OOK", "4-FSK", "MSK"] as ModFormat[]).map((f) => (
                <SelectItem key={f} value={f} className="text-xs">{f}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </ParamRow>

        <ParamRow
          label="Sync Mode"
          description="Sync word qualifier mode (SYNC_MODE). Controls how sync word is used for packet detection."
          focusAddrs={[REG.MDMCFG2]}
          focusBitRanges={[{ addr: REG.MDMCFG2, startBit: 2, stopBit: 0 }]}
        >
          <Select value={syncMode} onValueChange={(v) => setRegister(REG.MDMCFG2, encodeSyncMode(v, mdmcfg2))}>
            <SelectTrigger className="h-7 text-xs flex-1">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {SYNC_MODE_OPTIONS.map((o) => (
                <SelectItem key={o.value} value={o.value} className="text-xs">{o.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </ParamRow>

        <ParamRow
          label="Manchester Encoding"
          description="Enable Manchester encoding/decoding (MANCHESTER_EN). Doubles the effective symbol rate."
          focusAddrs={[REG.MDMCFG2]}
          focusBitRanges={[{ addr: REG.MDMCFG2, startBit: 3, stopBit: 3 }]}
        >
          <Switch checked={manchesterOn} onCheckedChange={(v) => setRegister(REG.MDMCFG2, setBits(mdmcfg2, 3, 3, v ? 1 : 0))} />
        </ParamRow>

        <ParamRow
          label="DC Filter Off"
          description="Disable digital DC blocking filter before demodulator (DEM_DCFILT_OFF)."
          focusAddrs={[REG.MDMCFG2]}
          focusBitRanges={[{ addr: REG.MDMCFG2, startBit: 7, stopBit: 7 }]}
        >
          <Switch checked={dcFilterOff} onCheckedChange={(v) => setRegister(REG.MDMCFG2, setBits(mdmcfg2, 7, 7, v ? 1 : 0))} />
        </ParamRow>
      </RegGroup>

      <RegGroup addrs={[REG.MDMCFG4, REG.MDMCFG3]}>
        <ParamRow
          label="Data Rate"
          unit="kBaud"
          description="Symbol rate: (256 + DRATE_M) × 2^DRATE_E × fXOSC / 2^28. MSK requires > 26 kBaud."
          error={findError(errors, "dataRate")}
          focusAddrs={[REG.MDMCFG4, REG.MDMCFG3]}
          focusBitRanges={[
            { addr: REG.MDMCFG4, startBit: 3, stopBit: 0 }, // DRATE_E
            { addr: REG.MDMCFG3, startBit: 7, stopBit: 0 }, // DRATE_M
          ]}
        >
          <NumericInput
            value={dataRateKBaud}
            precision={5}
            validValues={validDataRates}
            onCommit={(v) => setRegisters(encodeDataRate(v, crystalFreqMHz, mdmcfg4))}
          />
        </ParamRow>
      </RegGroup>

      {showDeviation && (
        <RegGroup addrs={[REG.DEVIATN]}>
          <ParamRow
            label="Deviation"
            unit="kHz"
            description="FSK frequency deviation: fXOSC / 2^17 × (8 + DEV_M) × 2^DEV_E"
            focusAddrs={[REG.DEVIATN]}
            focusBitRanges={[
              { addr: REG.DEVIATN, startBit: 6, stopBit: 4 }, // DEV_E
              { addr: REG.DEVIATN, startBit: 2, stopBit: 0 }, // DEV_M
            ]}
          >
            <NumericInput
              value={deviationKHz}
              precision={3}
              validValues={validDeviations}
              onCommit={(v) => setRegister(REG.DEVIATN, encodeDeviation(v, crystalFreqMHz))}
            />
          </ParamRow>
        </RegGroup>
      )}
    </div>
  );
}
