export type TrainingDayCase = {
  name: string;
  at: string;
  timeZone: string;
  rolloverHour: number;
  day: string;
};

const newYork = "America/New_York";

export const trainingDayCases: readonly TrainingDayCase[] = [
  { name: "01:30 belongs to the previous day", at: "2026-11-08T06:30:00Z", timeZone: newYork, rolloverHour: 4, day: "2026-11-07" },
  { name: "03:59:59 is still the previous day", at: "2026-11-08T08:59:59Z", timeZone: newYork, rolloverHour: 4, day: "2026-11-07" },
  { name: "04:00 starts the new day", at: "2026-11-08T09:00:00Z", timeZone: newYork, rolloverHour: 4, day: "2026-11-08" },
  { name: "spring forward: 03:30 EDT is still the previous day", at: "2026-03-08T07:30:00Z", timeZone: newYork, rolloverHour: 4, day: "2026-03-07" },
  { name: "spring forward: 04:00 EDT starts the day", at: "2026-03-08T08:00:00Z", timeZone: newYork, rolloverHour: 4, day: "2026-03-08" },
  { name: "fall back: first 01:30", at: "2026-11-01T05:30:00Z", timeZone: newYork, rolloverHour: 4, day: "2026-10-31" },
  { name: "fall back: second 01:30", at: "2026-11-01T06:30:00Z", timeZone: newYork, rolloverHour: 4, day: "2026-10-31" },
  { name: "fall back: 04:00 EST starts the day", at: "2026-11-01T09:00:00Z", timeZone: newYork, rolloverHour: 4, day: "2026-11-01" },
  { name: "month boundary", at: "2026-12-01T08:00:00Z", timeZone: newYork, rolloverHour: 4, day: "2026-11-30" },
  { name: "year boundary with rollover 0 is plain midnight", at: "2027-01-01T05:00:00Z", timeZone: newYork, rolloverHour: 0, day: "2027-01-01" },
  { name: "half-hour offset zone", at: "2026-11-08T22:00:00Z", timeZone: "Asia/Kolkata", rolloverHour: 4, day: "2026-11-08" },
  { name: "half-hour offset zone before rollover", at: "2026-11-08T22:15:00Z", timeZone: "Asia/Kolkata", rolloverHour: 4, day: "2026-11-08" },
  { name: "half-hour offset zone at rollover", at: "2026-11-08T22:30:00Z", timeZone: "Asia/Kolkata", rolloverHour: 4, day: "2026-11-09" },
];
