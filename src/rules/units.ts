import type { Enums } from "@/database.types";

type WeightUnit = Enums<"weight_unit">;

export const KG_PER_LB = 0.45359237;

function amountIn(unit: WeightUnit, reading: { value: number; unit: WeightUnit; kg: number }): number {
  if (reading.unit === unit) {
    return reading.value;
  }
  return unit === "kg" ? reading.kg : reading.kg / KG_PER_LB;
}

export function weightIn(unit: WeightUnit, reading: { value: number; unit: WeightUnit; kg: number }): number {
  return Math.round(amountIn(unit, reading) * 10) / 10;
}

export function fromKg(unit: WeightUnit, kg: number): number {
  return weightIn(unit, { value: kg, unit: "kg", kg });
}

export function formatWeight(amount: number): string {
  return amount.toFixed(1);
}

export function formatChange(amount: number): string {
  const text = Math.abs(amount).toFixed(1);
  if (text === "0.0") {
    return text;
  }
  return `${amount > 0 ? "+" : "\u2212"}${text}`;
}

export function formatLoad(amount: number): string {
  return Number.isInteger(amount) ? String(amount) : amount.toFixed(1);
}
