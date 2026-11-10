import type { Enums } from "@/database.types";
import { formatWeight, fromKg } from "@/rules/units";
import type { TrendPoint } from "@/rules/weigh-in";

const WIDTH = 326;
const HEIGHT = 72;
const INSET_X = 6;
const TOP = 10;
const BOTTOM = 62;

type Props = { points: readonly TrendPoint[]; unit: Enums<"weight_unit"> };

export function WeightChart({ points, unit }: Props) {
  const values = points.flatMap((point) => [point.kg, point.averageKg]).filter((kg) => kg !== null);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const x = (index: number) => INSET_X + (index * (WIDTH - 2 * INSET_X)) / (points.length - 1);
  const y = (kg: number) => (max === min ? (TOP + BOTTOM) / 2 : BOTTOM - ((kg - min) / (max - min)) * (BOTTOM - TOP));
  const line = points
    .flatMap((point, index) =>
      point.averageKg === null ? [] : [`${x(index).toFixed(1)},${y(point.averageKg).toFixed(1)}`],
    )
    .join(" ");
  const averages = points.flatMap((point) =>
    point.averageKg === null ? [] : [formatWeight(fromKg(unit, point.averageKg))],
  );
  const today = points[points.length - 1];

  return (
    <svg
      viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
      role="img"
      aria-label={`Daily weigh-ins over the last 14 days, with the 7-day average going from ${averages[0]} to ${averages.at(-1)} ${unit}`}
      className="block h-auto w-full"
    >
      <line x1="0" y1={HEIGHT - 0.5} x2={WIDTH} y2={HEIGHT - 0.5} className="stroke-border" strokeWidth="1" />
      <polyline
        points={line}
        fill="none"
        className="stroke-accent"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <g className="fill-[#6b6a66]">
        {points.slice(0, -1).map(
          (point, index) => point.kg !== null && <circle key={point.day} cx={x(index)} cy={y(point.kg)} r="2.5" />,
        )}
      </g>
      {today.kg !== null && <circle cx={x(points.length - 1)} cy={y(today.kg)} r="4" className="fill-text" />}
    </svg>
  );
}
