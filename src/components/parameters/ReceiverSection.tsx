import { useMemo } from "react";
import { Signal } from "lucide-react";
import { ParamRow } from "@/components/ParamRow";
import { NumericInput } from "@/components/NumericInput";
import { RegGroup } from "@/components/RegGroup";
import { useCC1101Store } from "@/lib/use-cc1101-store";
import {
  decodeRxBwKHz,
  encodeRxBw,
  decodeIFFreqKHz,
  encodeIFFreq,
  getValidRxBwValues,
  stepIFFreqKHz,
  setBits,
  REG,
} from "@/lib/cc1101-calculations";

export function ReceiverSection() {
  const mdmcfg4 = useCC1101Store((s) => s.registers[REG.MDMCFG4] ?? 0x8b);
  const fsctrl1 = useCC1101Store((s) => s.registers[REG.FSCTRL1] ?? 0x0f);
  const crystalFreqMHz = useCC1101Store((s) => s.crystalFreqMHz);
  const setRegister = useCC1101Store((s) => s.setRegister);

  const regs = { [REG.MDMCFG4]: mdmcfg4, [REG.FSCTRL1]: fsctrl1 };
  const rxBwKHz = decodeRxBwKHz(regs, crystalFreqMHz);
  const ifFreqKHz = decodeIFFreqKHz(regs, crystalFreqMHz);

  const validRxBwValues = useMemo(() => getValidRxBwValues(crystalFreqMHz), [crystalFreqMHz]);
  const ifStepSize = useMemo(() => stepIFFreqKHz(0, 1, crystalFreqMHz), [crystalFreqMHz]);

  return (
    <div>
      <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-1.5">
        <Signal className="w-3.5 h-3.5" />
        Receiver
      </h3>

      {/* RX BW shares the MDMCFG4/MDMCFG3 enable-group with Data Rate,
          but only touches MDMCFG4 bits [7:4]. */}
      <RegGroup addrs={[REG.MDMCFG4, REG.MDMCFG3]}>
        <ParamRow
          label="RX Filter BW"
          unit="kHz"
          description="Receive channel filter bandwidth: fXOSC / (8 × (4 + CHANBW_M) × 2^CHANBW_E). Should be ≥ 2× signal bandwidth."
          focusAddrs={[REG.MDMCFG4]}
          focusBitRanges={[
            { addr: REG.MDMCFG4, startBit: 7, stopBit: 6 }, // CHANBW_E
            { addr: REG.MDMCFG4, startBit: 5, stopBit: 4 }, // CHANBW_M
          ]}
        >
          <NumericInput
            value={rxBwKHz}
            precision={3}
            validValues={validRxBwValues}
            onCommit={(v) => setRegister(REG.MDMCFG4, encodeRxBw(v, crystalFreqMHz, mdmcfg4))}
          />
        </ParamRow>
      </RegGroup>

      <RegGroup addrs={[REG.FSCTRL1]}>
        <ParamRow
          label="IF Frequency"
          unit="kHz"
          description="Intermediate frequency: fXOSC / 2^10 × FREQ_IF."
          focusAddrs={[REG.FSCTRL1]}
          focusBitRanges={[{ addr: REG.FSCTRL1, startBit: 4, stopBit: 0 }]}
        >
          <NumericInput
            value={ifFreqKHz}
            precision={3}
            stepSize={ifStepSize}
            min={0}
            onCommit={(v) => setRegister(REG.FSCTRL1, setBits(fsctrl1, 4, 0, encodeIFFreq(v, crystalFreqMHz)))}
          />
        </ParamRow>
      </RegGroup>
    </div>
  );
}
