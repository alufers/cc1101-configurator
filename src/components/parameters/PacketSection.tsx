import { useState, useEffect } from "react";
import { Package } from "lucide-react";
import { ParamRow } from "@/components/ParamRow";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { NumericInput } from "@/components/NumericInput";
import { RegGroup } from "@/components/RegGroup";
import { useCC1101Store } from "@/lib/use-cc1101-store";
import { useValidation, findError } from "@/lib/use-validation";
import {
  getBits,
  setBits,
  decodePreamble,
  encodePreamble,
  PREAMBLE_OPTIONS,
  ADDRESS_CHECK_OPTIONS,
  PACKET_FORMAT_OPTIONS,
  PKT_LEN_CFG_OPTIONS,
  REG,
} from "@/lib/cc1101-calculations";

export function PacketSection() {
  const pktctrl0 = useCC1101Store((s) => s.registers[REG.PKTCTRL0] ?? 0x45);
  const pktctrl1 = useCC1101Store((s) => s.registers[REG.PKTCTRL1] ?? 0x04);
  const mdmcfg1 = useCC1101Store((s) => s.registers[REG.MDMCFG1] ?? 0x22);
  const pktlen = useCC1101Store((s) => s.registers[REG.PKTLEN] ?? 0xff);
  const sync1 = useCC1101Store((s) => s.registers[REG.SYNC1] ?? 0xd3);
  const sync0 = useCC1101Store((s) => s.registers[REG.SYNC0] ?? 0x91);
  const addr = useCC1101Store((s) => s.registers[REG.ADDR] ?? 0x00);
  const setRegister = useCC1101Store((s) => s.setRegister);

  const errors = useValidation();

  const regs = { [REG.MDMCFG1]: mdmcfg1, [REG.PKTCTRL1]: pktctrl1 };

  const whitening = getBits(pktctrl0, 6, 6) === 1;
  const pktFormat = String(getBits(pktctrl0, 5, 4));
  const crcEnable = getBits(pktctrl0, 2, 2) === 1;
  const pktLenCfg = String(getBits(pktctrl0, 1, 0));
  const fecEnable = getBits(mdmcfg1, 7, 7) === 1;
  const appendStatus = getBits(pktctrl1, 2, 2) === 1;
  const crcAutoflush = getBits(pktctrl1, 3, 3) === 1;
  const addrCheck = String(getBits(pktctrl1, 1, 0));
  const preamble = decodePreamble(regs);

  const sync1Str = sync1.toString(16).padStart(2, "0").toUpperCase();
  const sync0Str = sync0.toString(16).padStart(2, "0").toUpperCase();
  const [sync1Input, setSync1Input] = useState(sync1Str);
  const [sync0Input, setSync0Input] = useState(sync0Str);
  const [sync1Focused, setSync1Focused] = useState(false);
  const [sync0Focused, setSync0Focused] = useState(false);

  useEffect(() => { if (!sync1Focused) setSync1Input(sync1Str); }, [sync1Str, sync1Focused]);
  useEffect(() => { if (!sync0Focused) setSync0Input(sync0Str); }, [sync0Str, sync0Focused]);

  function commitSync(byte: "sync1" | "sync0", raw: string) {
    const clean = raw.replace(/[^0-9a-fA-F]/g, "").slice(0, 2).padStart(2, "0");
    const val = parseInt(clean, 16);
    if (byte === "sync1") setRegister(REG.SYNC1, val);
    else setRegister(REG.SYNC0, val);
  }

  return (
    <div>
      <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-1.5">
        <Package className="w-3.5 h-3.5" />
        Packet Control
      </h3>

      <RegGroup addrs={[REG.SYNC1, REG.SYNC0]}>
        <ParamRow
          label="Sync Word (SYNC1)"
          unit="hex"
          description="High byte of 16-bit sync word (SYNC1)."
          focusAddrs={[REG.SYNC1]}
        >
          <Input
            type="text"
            maxLength={2}
            className="h-7 text-xs font-mono"
            value={sync1Input}
            onChange={(e) => setSync1Input(e.target.value.replace(/[^0-9a-fA-F]/g, "").slice(0, 2).toUpperCase())}
            onFocus={() => setSync1Focused(true)}
            onBlur={() => { setSync1Focused(false); commitSync("sync1", sync1Input); }}
            onKeyDown={(e) => { if (e.key === "Enter") (e.target as HTMLInputElement).blur(); }}
          />
        </ParamRow>
        <ParamRow
          label="Sync Word (SYNC0)"
          unit="hex"
          description="Low byte of 16-bit sync word (SYNC0)."
          focusAddrs={[REG.SYNC0]}
        >
          <Input
            type="text"
            maxLength={2}
            className="h-7 text-xs font-mono"
            value={sync0Input}
            onChange={(e) => setSync0Input(e.target.value.replace(/[^0-9a-fA-F]/g, "").slice(0, 2).toUpperCase())}
            onFocus={() => setSync0Focused(true)}
            onBlur={() => { setSync0Focused(false); commitSync("sync0", sync0Input); }}
            onKeyDown={(e) => { if (e.key === "Enter") (e.target as HTMLInputElement).blur(); }}
          />
        </ParamRow>
      </RegGroup>

      <RegGroup addrs={[REG.ADDR]}>
        <ParamRow
          label="Device Address"
          unit="dec"
          description="Device address (ADDR) used for address filtering when PKTCTRL1.ADR_CHK is enabled."
          focusAddrs={[REG.ADDR]}
        >
          <NumericInput
            value={addr}
            precision={0}
            stepSize={1}
            min={0}
            max={255}
            onCommit={(v) => setRegister(REG.ADDR, Math.round(v))}
          />
        </ParamRow>
      </RegGroup>

      <RegGroup addrs={[REG.PKTCTRL0]}>
        <ParamRow
          label="Packet Format"
          description="Packet format (PKT_FORMAT): Normal, Synchronous serial, Random TX, or Asynchronous serial."
          focusAddrs={[REG.PKTCTRL0]}
          focusBitRanges={[{ addr: REG.PKTCTRL0, startBit: 5, stopBit: 4 }]}
        >
          <Select value={pktFormat} onValueChange={(v) => setRegister(REG.PKTCTRL0, setBits(pktctrl0, 5, 4, parseInt(v)))}>
            <SelectTrigger className="h-7 text-xs flex-1">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PACKET_FORMAT_OPTIONS.map((o) => (
                <SelectItem key={o.value} value={o.value} className="text-xs">{o.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </ParamRow>

        <ParamRow
          label="Packet Length Mode"
          description="Packet length configuration (LENGTH_CONFIG): Fixed, Variable (first byte is length), or Infinite."
          error={findError(errors, "pktLenCfg")}
          focusAddrs={[REG.PKTCTRL0]}
          focusBitRanges={[{ addr: REG.PKTCTRL0, startBit: 1, stopBit: 0 }]}
        >
          <Select value={pktLenCfg} onValueChange={(v) => setRegister(REG.PKTCTRL0, setBits(pktctrl0, 1, 0, parseInt(v)))}>
            <SelectTrigger className="h-7 text-xs flex-1">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PKT_LEN_CFG_OPTIONS.map((o) => (
                <SelectItem key={o.value} value={o.value} className="text-xs">{o.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </ParamRow>

        <ParamRow
          label="Whitening"
          description="Turn data whitening on/off (WHITE_DATA)."
          focusAddrs={[REG.PKTCTRL0]}
          focusBitRanges={[{ addr: REG.PKTCTRL0, startBit: 6, stopBit: 6 }]}
        >
          <Switch checked={whitening} onCheckedChange={(v) => setRegister(REG.PKTCTRL0, setBits(pktctrl0, 6, 6, v ? 1 : 0))} />
        </ParamRow>

        <ParamRow
          label="CRC Enable"
          description="Enable CRC calculation in TX and CRC check in RX (CRC_EN)."
          focusAddrs={[REG.PKTCTRL0]}
          focusBitRanges={[{ addr: REG.PKTCTRL0, startBit: 2, stopBit: 2 }]}
        >
          <Switch checked={crcEnable} onCheckedChange={(v) => setRegister(REG.PKTCTRL0, setBits(pktctrl0, 2, 2, v ? 1 : 0))} />
        </ParamRow>
      </RegGroup>

      <RegGroup addrs={[REG.PKTLEN]}>
        <ParamRow
          label="Packet Length"
          unit="dec"
          description="Packet length in fixed-length mode, or maximum length in variable-length mode (PKTLEN)."
          focusAddrs={[REG.PKTLEN]}
        >
          <NumericInput
            value={pktlen}
            precision={0}
            stepSize={1}
            min={0}
            max={255}
            onCommit={(v) => setRegister(REG.PKTLEN, Math.round(v))}
          />
        </ParamRow>
      </RegGroup>

      <RegGroup addrs={[REG.MDMCFG1, REG.MDMCFG0]}>
        <ParamRow
          label="Preamble Length"
          description="Minimum number of preamble bytes to transmit (NUM_PREAMBLE)."
          focusAddrs={[REG.MDMCFG1]}
          focusBitRanges={[{ addr: REG.MDMCFG1, startBit: 6, stopBit: 4 }]}
        >
          <Select value={preamble} onValueChange={(v) => setRegister(REG.MDMCFG1, encodePreamble(v, mdmcfg1))}>
            <SelectTrigger className="h-7 text-xs flex-1">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PREAMBLE_OPTIONS.map((o) => (
                <SelectItem key={o.value} value={o.value} className="text-xs">{o.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </ParamRow>

        <ParamRow
          label="FEC Enable"
          description="Enable Forward Error Correction with interleaving (FEC_EN). Only supported with fixed packet length mode."
          error={findError(errors, "fecEnable")}
          focusAddrs={[REG.MDMCFG1]}
          focusBitRanges={[{ addr: REG.MDMCFG1, startBit: 7, stopBit: 7 }]}
        >
          <Switch checked={fecEnable} onCheckedChange={(v) => setRegister(REG.MDMCFG1, setBits(mdmcfg1, 7, 7, v ? 1 : 0))} />
        </ParamRow>
      </RegGroup>

      <RegGroup addrs={[REG.PKTCTRL1]}>
        <ParamRow
          label="Address Check"
          description="Controls address check configuration (ADR_CHK)."
          focusAddrs={[REG.PKTCTRL1]}
          focusBitRanges={[{ addr: REG.PKTCTRL1, startBit: 1, stopBit: 0 }]}
        >
          <Select value={addrCheck} onValueChange={(v) => setRegister(REG.PKTCTRL1, setBits(pktctrl1, 1, 0, parseInt(v)))}>
            <SelectTrigger className="h-7 text-xs flex-1">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {ADDRESS_CHECK_OPTIONS.map((o) => (
                <SelectItem key={o.value} value={o.value} className="text-xs">{o.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </ParamRow>

        <ParamRow
          label="CRC Autoflush"
          description="Enable automatic flush of RX FIFO when CRC is not OK (CRC_AUTOFLUSH)."
          focusAddrs={[REG.PKTCTRL1]}
          focusBitRanges={[{ addr: REG.PKTCTRL1, startBit: 3, stopBit: 3 }]}
        >
          <Switch checked={crcAutoflush} onCheckedChange={(v) => setRegister(REG.PKTCTRL1, setBits(pktctrl1, 3, 3, v ? 1 : 0))} />
        </ParamRow>

        <ParamRow
          label="Append Status"
          description="Append two status bytes (RSSI and LQI) to the payload in the RX FIFO (APPEND_STATUS)."
          focusAddrs={[REG.PKTCTRL1]}
          focusBitRanges={[{ addr: REG.PKTCTRL1, startBit: 2, stopBit: 2 }]}
        >
          <Switch checked={appendStatus} onCheckedChange={(v) => setRegister(REG.PKTCTRL1, setBits(pktctrl1, 2, 2, v ? 1 : 0))} />
        </ParamRow>
      </RegGroup>
    </div>
  );
}
