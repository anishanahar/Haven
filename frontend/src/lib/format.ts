import { format, formatDistanceToNow } from "date-fns";

export function formatMoney(amount: number, currency = "USD"): string {
  return new Intl.NumberFormat("en-US", { style: "currency", currency, maximumFractionDigits: 2 }).format(amount);
}

export function formatCompactMoney(amount: number): string {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", notation: "compact", maximumFractionDigits: 1 }).format(
    amount,
  );
}

export function formatPercent(value: number): string {
  return `${value.toFixed(0)}%`;
}

export function formatDate(iso: string): string {
  return format(new Date(iso), "MMM d, yyyy");
}

export function formatRelative(iso: string): string {
  return formatDistanceToNow(new Date(iso), { addSuffix: true });
}

export function formatAddress(address: string, chars = 4): string {
  if (address.length <= chars * 2 + 3) return address;
  return `${address.slice(0, chars)}...${address.slice(-chars)}`;
}
