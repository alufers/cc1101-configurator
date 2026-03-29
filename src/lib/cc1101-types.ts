export interface BitfieldValue {
  number: number;
  brief: string;
}

export interface BitfieldDef {
  name: string;
  startBit: number;
  stopBit: number;
  access: string;
  resetValue: number;
  values: BitfieldValue[];
  description: string;
}

export interface RegisterDef {
  name: string;
  address: number;
  description: string;
  formulaNote?: string;
  bitfields: BitfieldDef[];
}

export type RegisterMap = Record<number, number>;
export type PaTable = [number, number, number, number, number, number, number, number];
