export function formatInventoryDate(value: string, locale?: string) {
  return new Intl.DateTimeFormat(locale).format(new Date(value));
}

export function formatCalendarDate(value: string, locale?: string) {
  return new Intl.DateTimeFormat(locale, { timeZone: "UTC" }).format(
    new Date(`${value}T00:00:00.000Z`),
  );
}
