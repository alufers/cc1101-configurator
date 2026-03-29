# /// script
# dependencies = ["lxml"]
# ///
"""Convert cc1101_register_definitions.xml to cc1101_registers.json.

Filters out read-only registers (address >= 0x30) and only includes
registers that have at least one R/W bitfield.
"""

import json
import sys
from pathlib import Path

from lxml import etree

SCRIPT_DIR = Path(__file__).parent
PROJECT_DIR = SCRIPT_DIR.parent
XML_PATH = PROJECT_DIR / "cc1101_register_definitions.xml"
OUT_PATH = PROJECT_DIR / "public" / "cc1101_registers.json"

# Datasheet formula notes to augment tooltips for key registers
FORMULA_NOTES = {
    "FREQ2": "Formula: f_carrier = (f_XOSC / 2^16) × FREQ[23:0]. With 26 MHz crystal, resolution = 396.7 Hz/LSB.",
    "FREQ1": "Formula: f_carrier = (f_XOSC / 2^16) × FREQ[23:0]. Middle byte of 24-bit frequency word.",
    "FREQ0": "Formula: f_carrier = (f_XOSC / 2^16) × FREQ[23:0]. Low byte of 24-bit frequency word.",
    "MDMCFG4": "RX BW formula: BW = f_XOSC / (8 × (4 + CHANBW_M) × 2^CHANBW_E). Data rate formula: R = (256 + DRATE_M) × 2^DRATE_E × f_XOSC / 2^28.",
    "MDMCFG3": "Data rate formula: R = (256 + DRATE_M) × 2^DRATE_E × f_XOSC / 2^28. DRATE_M is the 8-bit mantissa.",
    "MDMCFG1": "Channel spacing exponent. Formula: Δf = (f_XOSC / 2^18) × (256 + CHANSPC_M) × 2^CHANSPC_E.",
    "MDMCFG0": "Channel spacing mantissa. Formula: Δf = (f_XOSC / 2^18) × (256 + CHANSPC_M) × 2^CHANSPC_E.",
    "DEVIATN": "Deviation formula: f_dev = (f_XOSC / 2^17) × (8 + DEVIATION_M) × 2^DEVIATION_E. Applies to 2-FSK, GFSK, 4-FSK modes.",
    "FSCTRL1": "IF frequency formula: f_IF = (f_XOSC / 2^10) × FREQ_IF. Default 0x0F → 381 kHz at 26 MHz crystal.",
    "FSCTRL0": "Frequency offset compensation. Signed 8-bit value added to base frequency.",
    "CHANNR": "Channel number. Carrier frequency = base + CHAN × channel_spacing.",
}


def get_text(el, tag, default=""):
    child = el.find(tag)
    if child is not None and child.text:
        return child.text.strip()
    return default


def parse_hex_or_int(s):
    s = s.strip()
    if s.startswith("0x") or s.startswith("0X"):
        return int(s, 16)
    return int(s)


def main():
    tree = etree.parse(str(XML_PATH))
    root = tree.getroot()

    registers = []

    for reg_el in root.findall(".//Register"):
        name = get_text(reg_el, "Name")
        addr_str = get_text(reg_el, "Address")
        description = get_text(reg_el, "Description")

        try:
            address = parse_hex_or_int(addr_str)
        except (ValueError, TypeError):
            print(f"  Skipping {name}: bad address '{addr_str}'", file=sys.stderr)
            continue

        # Skip status/read-only registers at 0x30+
        if address >= 0x30:
            continue

        bitfields = []
        has_rw = False

        for bf_el in reg_el.findall(".//Bitfield"):
            bf_name = get_text(bf_el, "Name")
            start_str = get_text(bf_el, "Start")
            stop_str = get_text(bf_el, "Stop")
            access = get_text(bf_el, "Access")
            reset_str = get_text(bf_el, "Reset", "0x00")
            bf_description = get_text(bf_el, "Description")

            try:
                start_bit = int(start_str)
                stop_bit = int(stop_str)
                reset_value = parse_hex_or_int(reset_str)
            except (ValueError, TypeError):
                continue

            values = []
            for val_el in bf_el.findall("Value"):
                num_str = get_text(val_el, "Number")
                brief = get_text(val_el, "Brief")
                try:
                    num = parse_hex_or_int(num_str)
                    values.append({"number": num, "brief": brief})
                except (ValueError, TypeError):
                    pass

            if access == "R/W":
                has_rw = True

            bitfields.append(
                {
                    "name": bf_name,
                    "startBit": start_bit,
                    "stopBit": stop_bit,
                    "access": access,
                    "resetValue": reset_value,
                    "values": values,
                    "description": bf_description,
                }
            )

        # Only include registers with at least one R/W bitfield
        if not has_rw:
            continue

        reg_entry = {
            "name": name,
            "address": address,
            "description": description,
            "bitfields": bitfields,
        }

        # Add formula note if available
        if name in FORMULA_NOTES:
            reg_entry["formulaNote"] = FORMULA_NOTES[name]

        registers.append(reg_entry)

    # Sort by address
    registers.sort(key=lambda r: r["address"])

    OUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    with open(OUT_PATH, "w") as f:
        json.dump(registers, f, indent=2)

    print(f"Wrote {len(registers)} registers to {OUT_PATH}")


if __name__ == "__main__":
    main()
