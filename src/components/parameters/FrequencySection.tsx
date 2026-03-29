import { useMemo } from "react";
import { Waves } from "lucide-react";
import { ParamRow } from "@/components/ParamRow";
import { NumericInput } from "@/components/NumericInput";
import { RegGroup } from "@/components/RegGroup";
import { useCC1101Store } from "@/lib/use-cc1101-store";
import { useValidation, findError } from "@/lib/use-validation";
import {
  decodeBaseFreqMHz,
  encodeBaseFreq,
  decodeChanSpacingKHz,
  encodeChanSpacing,
  decodeCarrierFreqMHz,
  getValidChanSpacings,
  stepFreqMHz,
  VALID_FREQ_RANGES_MHZ,
  REG,
} from "@/lib/cc1101-calculations";

const FREQ_RANGES_DESC = VALID_FREQ_RANGES_MHZ.map(([lo, hi]) => `${lo}–${hi} MHz`).join(", ");

export function FrequencySection() {
  const freq2 = useCC1101Store((s) => s.registers[REG.FREQ2] ?? 0x20);
  const freq1 = useCC1101Store((s) => s.registers[REG.FREQ1] ?? 0x34);
  const freq0 = useCC1101Store((s) => s.registers[REG.FREQ0] ?? 0x62);
  const mdmcfg1 = useCC1101Store((s) => s.registers[REG.MDMCFG1] ?? 0x22);
  const mdmcfg0 = useCC1101Store((s) => s.registers[REG.MDMCFG0] ?? 0xf8);
  const channr = useCC1101Store((s) => s.registers[REG.CHANNR] ?? 0);
  const crystalFreqMHz = useCC1101Store((s) => s.crystalFreqMHz);
  const setRegisters = useCC1101Store((s) => s.setRegisters);
  const setRegister = useCC1101Store((s) => s.setRegister);
  const setCrystalFreq = useCC1101Store((s) => s.setCrystalFreq);

  const errors = useValidation();

  const regs = { [REG.FREQ2]: freq2, [REG.FREQ1]: freq1, [REG.FREQ0]: freq0, [REG.MDMCFG1]: mdmcfg1, [REG.MDMCFG0]: mdmcfg0, [REG.CHANNR]: channr };
  const baseFreqMHz = decodeBaseFreqMHz(regs, crystalFreqMHz);
  const chanSpacingKHz = decodeChanSpacingKHz(regs, crystalFreqMHz);
  const carrierMHz = decodeCarrierFreqMHz(regs, crystalFreqMHz);

  const freqStepMHz = useMemo(() => stepFreqMHz(0, 1, crystalFreqMHz), [crystalFreqMHz]);
  const validChanSpacings = useMemo(() => getValidChanSpacings(crystalFreqMHz), [crystalFreqMHz]);

  return (
    <div>
      <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-1.5">
        <Waves className="w-3.5 h-3.5" />
        Frequency
      </h3>

      <ParamRow label="Crystal Frequency" unit="MHz" description="Reference crystal oscillator frequency. Default is 26 MHz for most CC1101 modules.">
        <NumericInput
          value={crystalFreqMHz}
          precision={3}
          stepSize={0.5}
          min={1}
          max={40}
          onCommit={(v) => setCrystalFreq(v)}
        />
      </ParamRow>

      <RegGroup addrs={[REG.FREQ2, REG.FREQ1, REG.FREQ0]}>
        <ParamRow
          label="Base Frequency"
          unit="MHz"
          description={`Base carrier frequency (FREQ2/1/0). Valid bands: ${FREQ_RANGES_DESC}`}
          error={findError(errors, "baseFreq")}
          focusAddrs={[REG.FREQ2, REG.FREQ1, REG.FREQ0]}
        >
          <NumericInput
            value={baseFreqMHz}
            precision={6}
            stepSize={freqStepMHz}
            onCommit={(v) => setRegisters(encodeBaseFreq(v, crystalFreqMHz))}
          />
        </ParamRow>
      </RegGroup>

      <RegGroup addrs={[REG.CHANNR]}>
        <ParamRow
          label="Channel Number"
          unit="dec"
          description="Channel number (CHANNR). Carrier = Base + Channel × Channel Spacing."
          focusAddrs={[REG.CHANNR]}
        >
          <NumericInput
            value={channr}
            precision={0}
            stepSize={1}
            min={0}
            max={255}
            onCommit={(v) => setRegister(REG.CHANNR, Math.round(v))}
          />
        </ParamRow>
      </RegGroup>

      <RegGroup addrs={[REG.MDMCFG1, REG.MDMCFG0]}>
        <ParamRow
          label="Channel Spacing"
          unit="kHz"
          description="Channel spacing (CHANSPC). f_space = fXOSC / 2^18 × (256 + CHANSPC_M) × 2^CHANSPC_E"
          focusAddrs={[REG.MDMCFG1, REG.MDMCFG0]}
          focusBitRanges={[
            { addr: REG.MDMCFG1, startBit: 1, stopBit: 0 }, // CHANSPC_E
            { addr: REG.MDMCFG0, startBit: 7, stopBit: 0 }, // CHANSPC_M
          ]}
        >
          <NumericInput
            value={chanSpacingKHz}
            precision={3}
            validValues={validChanSpacings}
            onCommit={(v) => setRegisters(encodeChanSpacing(v, crystalFreqMHz, mdmcfg1))}
          />
        </ParamRow>
      </RegGroup>

      <ParamRow label="Carrier Frequency" unit="MHz" description="Actual transmit/receive frequency = Base + Channel × Spacing (read-only, computed).">
        <div className="h-7 flex items-center px-3 rounded-md border border-input bg-muted text-xs font-mono text-muted-foreground">
          {carrierMHz.toFixed(6)}
        </div>
      </ParamRow>
    </div>
  );
}
