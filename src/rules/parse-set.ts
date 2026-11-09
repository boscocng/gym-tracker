import type { Enums } from "@/database.types";

type WeightUnit = Enums<"weight_unit">;

export type AliasTarget = { exerciseId: number; isBodyweight: boolean };

export type ParsedSet = { exerciseId: number; loadValue: number; loadUnit: WeightUnit; reps: number };

export type ParseResult =
  | { kind: "set"; set: ParsedSet }
  | { kind: "unknown"; spokenName: string; loadGiven: boolean }
  | { kind: "error"; message: string };

export const PARSE_ERROR = "Couldn’t read that. Try “bench 185 for 6”.";

const MAX_LOAD = 9999.99;
const MAX_REPS = 999;

const UNIT_WORDS = new Map<string, WeightUnit>([
  ["lb", "lb"],
  ["lbs", "lb"],
  ["pound", "lb"],
  ["pounds", "lb"],
  ["kg", "kg"],
  ["kgs", "kg"],
  ["kilo", "kg"],
  ["kilos", "kg"],
  ["kilogram", "kg"],
  ["kilograms", "kg"],
]);
const REP_WORDS = new Set(["rep", "reps", "times"]);
const ORDINALS = new Set([
  "first",
  "second",
  "third",
  "fourth",
  "fifth",
  "sixth",
  "seventh",
  "eighth",
  "ninth",
  "tenth",
  "last",
  "next",
  "another",
  "final",
]);
const ORDINAL_SUFFIXES = new Set(["st", "nd", "rd", "th"]);
const FILLER = new Set([
  ...UNIT_WORDS.keys(),
  ...REP_WORDS,
  ...ORDINALS,
  ...ORDINAL_SUFFIXES,
  ...["for", "x", "at", "by", "with", "of", "and", "plus", "set", "sets", "number", "the", "a", "an", "i", "did"],
  "weighted",
]);

const SMALL = new Map(
  [
    "zero",
    "one",
    "two",
    "three",
    "four",
    "five",
    "six",
    "seven",
    "eight",
    "nine",
    "ten",
    "eleven",
    "twelve",
    "thirteen",
    "fourteen",
    "fifteen",
    "sixteen",
    "seventeen",
    "eighteen",
    "nineteen",
  ].map((word, value) => [word, value]),
);
const TENS = new Map(
  ["twenty", "thirty", "forty", "fifty", "sixty", "seventy", "eighty", "ninety"].map((word, index) => [
    word,
    (index + 2) * 10,
  ]),
);

type NumberWord = { value: number; next: number };
type Reading = { load: number | null; unit: WeightUnit; reps: number };

function isNumber(token: string): boolean {
  return /^\d/.test(token);
}

function isNameWord(token: string): boolean {
  return !isNumber(token) && !FILLER.has(token);
}

function tokenize(text: string): string[] {
  return text.toLowerCase().replaceAll("+", " plus ").match(/\d+(?:\.\d+)?|[a-z]+/g) ?? [];
}

export function normalizeAlias(text: string): string {
  return (text.toLowerCase().match(/[a-z]+/g) ?? []).join(" ");
}

function belowHundred(tokens: readonly string[], index: number): NumberWord | null {
  const tens = TENS.get(tokens[index]);
  if (tens !== undefined) {
    const unit = SMALL.get(tokens[index + 1]);
    return unit !== undefined && unit > 0 && unit < 10
      ? { value: tens + unit, next: index + 2 }
      : { value: tens, next: index + 1 };
  }
  const small = SMALL.get(tokens[index]);
  return small === undefined ? null : { value: small, next: index + 1 };
}

// Reads "fifty", "twenty five", "one hundred and forty", and gym-style "one eighty five" or "four oh five".
function numberWord(tokens: readonly string[], index: number): NumberWord | null {
  const lead = tokens[index] === "a" ? 1 : SMALL.get(tokens[index]);
  if (lead !== undefined && lead > 0 && lead < 10) {
    if (tokens[index + 1] === "hundred") {
      const andSkipped = tokens[index + 2] === "and" ? index + 3 : index + 2;
      const rest = belowHundred(tokens, andSkipped);
      return rest ? { value: lead * 100 + rest.value, next: rest.next } : { value: lead * 100, next: index + 2 };
    }
    const ones = SMALL.get(tokens[index + 2]);
    if (tokens[index + 1] === "oh" && ones !== undefined && ones > 0 && ones < 10) {
      return { value: lead * 100 + ones, next: index + 3 };
    }
    const rest = tokens[index] === "a" ? null : belowHundred(tokens, index + 1);
    if (rest && rest.value >= 10) {
      return { value: lead * 100 + rest.value, next: rest.next };
    }
  }
  return belowHundred(tokens, index);
}

function convertNumberWords(tokens: readonly string[]): string[] {
  const converted: string[] = [];
  let index = 0;
  while (index < tokens.length) {
    const word = numberWord(tokens, index);
    converted.push(word ? String(word.value) : tokens[index]);
    index = word ? word.next : index + 1;
  }
  return converted;
}

// Drops spoken set numbers ("set 2", "set number two", "first set", "2nd set") before numbers are read.
function dropSetNumbers(tokens: readonly string[]): string[] {
  const kept: string[] = [];
  for (let index = 0; index < tokens.length; index += 1) {
    const token = tokens[index];
    if (token === "set") {
      const at = tokens[index + 1] === "number" ? index + 2 : index + 1;
      if (/^\d+$/.test(tokens[at] ?? "")) {
        index = at;
        continue;
      }
      const word = belowHundred(tokens, at);
      if (word) {
        index = word.next - 1;
        continue;
      }
    }
    if (ORDINALS.has(token) && tokens[index + 1] === "set") {
      index += 1;
      continue;
    }
    if (/^\d+$/.test(token) && ORDINAL_SUFFIXES.has(tokens[index + 1] ?? "") && tokens[index + 2] === "set") {
      index += 2;
      continue;
    }
    kept.push(token);
  }
  return kept;
}

function findAlias(tokens: readonly string[], aliases: ReadonlyMap<string, AliasTarget>) {
  const maxWords = Math.max(0, ...[...aliases.keys()].map((alias) => alias.split(" ").length));
  let best: { start: number; length: number; target: AliasTarget } | null = null;
  for (let start = 0; start < tokens.length; start += 1) {
    for (let length = Math.min(maxWords, tokens.length - start); length > (best?.length ?? 0); length -= 1) {
      const target = aliases.get(tokens.slice(start, start + length).join(" "));
      if (target) {
        best = { start, length, target };
        break;
      }
    }
  }
  return best;
}

function readNumbers(tokens: readonly string[], defaultUnit: WeightUnit): Reading | null {
  const reps: number[] = [];
  const loads: { value: number; unit: WeightUnit | undefined }[] = [];
  const plain: number[] = [];
  tokens.forEach((token, index) => {
    if (!isNumber(token)) {
      return;
    }
    const next = tokens[index + 1] ?? "";
    if (REP_WORDS.has(next)) {
      reps.push(Number(token));
    } else if (UNIT_WORDS.has(next) || tokens[index - 1] === "plus") {
      loads.push({ value: Number(token), unit: UNIT_WORDS.get(next) });
    } else {
      plain.push(Number(token));
    }
  });
  const count = reps.length + loads.length + plain.length;
  if (count === 0 || count > 2 || reps.length > 1 || loads.length > 1) {
    return null;
  }

  const [first = null, second = null] = plain;
  const markedLoad = loads[0]?.value ?? null;
  const repCount = reps[0] ?? (markedLoad !== null || second === null ? first : second);
  const load = reps.length > 0 || markedLoad !== null ? (markedLoad ?? first) : second === null ? null : first;
  if (repCount === null || !Number.isInteger(repCount) || repCount < 1 || repCount > MAX_REPS) {
    return null;
  }
  if (load !== null && load > MAX_LOAD) {
    return null;
  }
  const spokenUnit = loads[0]?.unit ?? tokens.map((token) => UNIT_WORDS.get(token)).find(Boolean);
  return {
    load: load === null ? null : Math.round(load * 100) / 100,
    unit: spokenUnit ?? defaultUnit,
    reps: repCount,
  };
}

export function parseSet(
  text: string,
  aliases: ReadonlyMap<string, AliasTarget>,
  defaultUnit: WeightUnit,
): ParseResult {
  const tokens = tokenize(text);
  const match = findAlias(tokens, aliases);
  const rest = match ? [...tokens.slice(0, match.start), ...tokens.slice(match.start + match.length)] : tokens;
  const words = convertNumberWords(dropSetNumbers(rest));
  const reading = readNumbers(words, defaultUnit);
  if (!reading) {
    return { kind: "error", message: PARSE_ERROR };
  }

  // Any exercise word the alias doesn't cover ("zercher" in "zercher squat") means a different exercise.
  if (!match || words.some(isNameWord)) {
    const spokenName = convertNumberWords(dropSetNumbers(tokens)).filter(isNameWord).join(" ");
    return spokenName
      ? { kind: "unknown", spokenName, loadGiven: reading.load !== null }
      : { kind: "error", message: PARSE_ERROR };
  }

  const load = reading.load ?? (match.target.isBodyweight ? 0 : null);
  if (load === null) {
    return { kind: "error", message: PARSE_ERROR };
  }
  return {
    kind: "set",
    set: { exerciseId: match.target.exerciseId, loadValue: load, loadUnit: reading.unit, reps: reading.reps },
  };
}
