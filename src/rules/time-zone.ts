export function isTimeZone(value: string): boolean {
  if (!/^[A-Za-z]/.test(value)) {
    return false;
  }
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: value });
    return true;
  } catch {
    return false;
  }
}
