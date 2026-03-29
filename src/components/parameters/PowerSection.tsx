import { Zap } from "lucide-react";
import { ParamRow } from "@/components/ParamRow";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RegGroup } from "@/components/RegGroup";
import { useCC1101Store } from "@/lib/use-cc1101-store";
import { useValidation, findError } from "@/lib/use-validation";
import {
  TX_POWER_OPTIONS,
  decodeModFormat,
  decodeTxPowerDbm,
  encodeTxPower,
  REG,
} from "@/lib/cc1101-calculations";

export function PowerSection() {
  const mdmcfg2 = useCC1101Store((s) => s.registers[REG.MDMCFG2] ?? 0x02);
  const paTable = useCC1101Store((s) => s.paTable);
  const setPaTable = useCC1101Store((s) => s.setPaTable);
  const setRegister = useCC1101Store((s) => s.setRegister);

  const errors = useValidation();

  const modFormat = decodeModFormat({ [REG.MDMCFG2]: mdmcfg2 });
  const currentDbm = decodeTxPowerDbm(paTable, modFormat);

  function handlePowerChange(v: string) {
    const dbm = parseInt(v);
    const { paTable: newPaTable, frend0 } = encodeTxPower(dbm, modFormat);
    setPaTable(newPaTable);
    setRegister(REG.FREND0, frend0);
  }

  return (
    <div>
      <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-1.5">
        <Zap className="w-3.5 h-3.5" />
        Power
      </h3>

      <RegGroup addrs={[REG.FREND0]}>
        <ParamRow
          label="TX Power"
          description="Transmit output power level. ASK/OOK mode is limited to ≤ −1 dBm."
          error={findError(errors, "txPower")}
          focusAddrs={[REG.FREND0]}
        >
          <Select value={String(currentDbm)} onValueChange={handlePowerChange}>
            <SelectTrigger className="h-7 text-xs flex-1">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {TX_POWER_OPTIONS.map((o) => (
                <SelectItem key={o.dbm} value={String(o.dbm)} className="text-xs">{o.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </ParamRow>

        <div className="text-xs text-muted-foreground mb-2">
          <span>PATABLE: </span>
          <span className="font-mono">
            [{paTable.map((b) => `0x${b.toString(16).padStart(2, "0").toUpperCase()}`).join(", ")}]
          </span>
        </div>
      </RegGroup>
    </div>
  );
}
