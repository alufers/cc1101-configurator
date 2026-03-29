import { Cpu } from "lucide-react";
import { ParamRow } from "@/components/ParamRow";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { RegGroup } from "@/components/RegGroup";
import { useCC1101Store } from "@/lib/use-cc1101-store";
import { getBits, setBits, GDO_FUNCTION_OPTIONS, REG } from "@/lib/cc1101-calculations";

export function GpioSection() {
  const iocfg0 = useCC1101Store((s) => s.registers[REG.IOCFG0] ?? 0x3f);
  const iocfg1 = useCC1101Store((s) => s.registers[REG.IOCFG1] ?? 0x2e);
  const iocfg2 = useCC1101Store((s) => s.registers[REG.IOCFG2] ?? 0x29);
  const setRegister = useCC1101Store((s) => s.setRegister);

  const gdo0Val = getBits(iocfg0, 5, 0);
  const gdo1Val = getBits(iocfg1, 5, 0);
  const gdo2Val = getBits(iocfg2, 5, 0);
  const gdo0Inv = getBits(iocfg0, 6, 6) === 1;
  const gdo1Inv = getBits(iocfg1, 6, 6) === 1;
  const gdo2Inv = getBits(iocfg2, 6, 6) === 1;

  function getOptionValue(val: number): string {
    return GDO_FUNCTION_OPTIONS.find((o) => o.value === val) ? String(val) : String(val);
  }

  return (
    <div>
      <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-1.5">
        <Cpu className="w-3.5 h-3.5" />
        GPIO Pins
      </h3>

      <RegGroup addrs={[REG.IOCFG0]}>
        <ParamRow
          label="GDO0 Function"
          description="GDO0 output signal selection (GDO0_CFG)."
          focusAddrs={[REG.IOCFG0]}
          focusBitRanges={[{ addr: REG.IOCFG0, startBit: 5, stopBit: 0 }]}
        >
          <Select value={getOptionValue(gdo0Val)} onValueChange={(v) => setRegister(REG.IOCFG0, setBits(iocfg0, 5, 0, parseInt(v)))}>
            <SelectTrigger className="h-7 text-xs flex-1">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {GDO_FUNCTION_OPTIONS.map((o) => (
                <SelectItem key={o.value} value={String(o.value)} className="text-xs">{o.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </ParamRow>
        <ParamRow
          label="GDO0 Inverted"
          description="Invert output polarity of GDO0."
          focusAddrs={[REG.IOCFG0]}
          focusBitRanges={[{ addr: REG.IOCFG0, startBit: 6, stopBit: 6 }]}
        >
          <Checkbox
            checked={gdo0Inv}
            onCheckedChange={(v) => setRegister(REG.IOCFG0, setBits(iocfg0, 6, 6, v ? 1 : 0))}
          />
        </ParamRow>
      </RegGroup>

      <RegGroup addrs={[REG.IOCFG1]}>
        <ParamRow
          label="GDO1 Function"
          description="GDO1 output signal selection (GDO1_CFG). Also used as SPI MISO during SPI access."
          focusAddrs={[REG.IOCFG1]}
          focusBitRanges={[{ addr: REG.IOCFG1, startBit: 5, stopBit: 0 }]}
        >
          <Select value={getOptionValue(gdo1Val)} onValueChange={(v) => setRegister(REG.IOCFG1, setBits(iocfg1, 5, 0, parseInt(v)))}>
            <SelectTrigger className="h-7 text-xs flex-1">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {GDO_FUNCTION_OPTIONS.map((o) => (
                <SelectItem key={o.value} value={String(o.value)} className="text-xs">{o.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </ParamRow>
        <ParamRow
          label="GDO1 Inverted"
          description="Invert output polarity of GDO1."
          focusAddrs={[REG.IOCFG1]}
          focusBitRanges={[{ addr: REG.IOCFG1, startBit: 6, stopBit: 6 }]}
        >
          <Checkbox
            checked={gdo1Inv}
            onCheckedChange={(v) => setRegister(REG.IOCFG1, setBits(iocfg1, 6, 6, v ? 1 : 0))}
          />
        </ParamRow>
      </RegGroup>

      <RegGroup addrs={[REG.IOCFG2]}>
        <ParamRow
          label="GDO2 Function"
          description="GDO2 output signal selection (GDO2_CFG)."
          focusAddrs={[REG.IOCFG2]}
          focusBitRanges={[{ addr: REG.IOCFG2, startBit: 5, stopBit: 0 }]}
        >
          <Select value={getOptionValue(gdo2Val)} onValueChange={(v) => setRegister(REG.IOCFG2, setBits(iocfg2, 5, 0, parseInt(v)))}>
            <SelectTrigger className="h-7 text-xs flex-1">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {GDO_FUNCTION_OPTIONS.map((o) => (
                <SelectItem key={o.value} value={String(o.value)} className="text-xs">{o.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </ParamRow>
        <ParamRow
          label="GDO2 Inverted"
          description="Invert output polarity of GDO2."
          focusAddrs={[REG.IOCFG2]}
          focusBitRanges={[{ addr: REG.IOCFG2, startBit: 6, stopBit: 6 }]}
        >
          <Checkbox
            checked={gdo2Inv}
            onCheckedChange={(v) => setRegister(REG.IOCFG2, setBits(iocfg2, 6, 6, v ? 1 : 0))}
          />
        </ParamRow>
      </RegGroup>
    </div>
  );
}
