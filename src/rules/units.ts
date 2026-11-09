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

export function formatWeight(amount: number): string {
  return amount.toFixed(1);
}
