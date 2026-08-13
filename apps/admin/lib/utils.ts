import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Formats minor-unit integers (pesewas) as GHS currency for display. */
export function formatMoney(minorUnits: number, currency = "GHS"): string {
  return new Intl.NumberFormat("en-GH", { style: "currency", currency }).format(minorUnits / 100);
}

export function formatDate(date: string | Date): string {
  return new Intl.DateTimeFormat("en-GH", { year: "numeric", month: "short", day: "numeric" }).format(new Date(date));
}
