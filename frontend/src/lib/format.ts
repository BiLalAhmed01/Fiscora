const currencyFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const currencyFormatterNoCents = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

/** Consistent $ formatting with thousands separators, used everywhere a dollar amount is shown. */
export function formatCurrency(amount: number, { cents = true }: { cents?: boolean } = {}): string {
  return (cents ? currencyFormatter : currencyFormatterNoCents).format(amount);
}
