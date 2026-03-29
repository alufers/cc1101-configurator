import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Whether two MSB-first bit ranges [startBit:stopBit] overlap. */
export function bitRangeOverlaps(
  aStart: number, aStop: number,
  bStart: number, bStop: number
): boolean {
  // Overlap when one range doesn't end before the other begins
  return aStart >= bStop && bStart >= aStop;
}

/** Strip HTML tags and decode basic entities for use in plain-text contexts. */
export function stripHtml(html: string): string {
  return html
    .replace(/<[^>]*>/g, " ")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&")
    .replace(/&nbsp;/g, " ")
    .replace(/\s{2,}/g, " ")
    .trim();
}
