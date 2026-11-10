import type { PostgrestError } from "@supabase/supabase-js";
import type { DayHistory } from "@/rules/day-status";
import type { SessionClient } from "./supabase";

const PAGE_SIZE = 1000;

type Page<Row> = PromiseLike<{ data: Row[] | null; error: PostgrestError | null }>;

// The Data API returns at most 1000 rows per request, so long ranges are read page by page.
export async function readAll<Row>(page: (from: number, to: number) => Page<Row>): Promise<Row[]> {
  const rows: Row[] = [];
  for (let from = 0; ; from += PAGE_SIZE) {
    const { data, error } = await page(from, from + PAGE_SIZE - 1);
    if (error) {
      throw error;
    }
    rows.push(...(data ?? []));
    if ((data ?? []).length < PAGE_SIZE) {
      return rows;
    }
  }
}

// Which days from `from` to `to` have sets, and how the others were marked.
export async function readDayHistory(
  supabase: SessionClient,
  startDate: string,
  from: string,
  to: string,
): Promise<DayHistory> {
  const [trained, marks] = await Promise.all([
    readAll((first, last) =>
      supabase.from("trained_days").select("day").gte("day", from).lte("day", to).order("day").range(first, last),
    ),
    readAll((first, last) =>
      supabase.from("day_marks").select("day, kind").gte("day", from).lte("day", to).order("day").range(first, last),
    ),
  ]);
  return {
    startDate,
    trained: new Set(trained.map((row) => row.day)),
    marks: new Map(marks.map((row) => [row.day, row.kind])),
  };
}
