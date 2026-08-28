export type MoneyValue = {
  amount: string;
  currencyCode: string;
};

export function formatMoney(value: MoneyValue, locale?: string) {
  try {
    const [integer, fraction = ""] = value.amount.split(".");
    const formattedFractionLength = Math.min(fraction.length, 20);
    const formatter = new Intl.NumberFormat(locale, {
      style: "currency",
      currency: value.currencyCode,
      minimumFractionDigits: formattedFractionLength,
      maximumFractionDigits: 20,
    });
    const formattedValue = fraction
      ? `${integer}.${fraction.slice(0, formattedFractionLength)}`
      : integer;
    const remainingFraction = fraction.slice(formattedFractionLength);
    return formatter
      .formatToParts(formattedValue as unknown as number)
      .map((part) =>
        part.type === "fraction" ? `${part.value}${remainingFraction}` : part.value,
      )
      .join("");
  } catch {
    return `${value.amount} ${value.currencyCode}`;
  }
}

export function formatInventoryDate(value: string, locale?: string) {
  return new Intl.DateTimeFormat(locale).format(new Date(value));
}

export function formatCalendarDate(value: string, locale?: string) {
  return new Intl.DateTimeFormat(locale, { timeZone: "UTC" }).format(
    new Date(`${value}T00:00:00.000Z`),
  );
}
