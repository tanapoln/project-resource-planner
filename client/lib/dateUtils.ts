import { format, addDays, differenceInDays, startOfWeek, eachDayOfInterval, isSameMonth } from "date-fns";

export function getTimelineRange(weeksToShow = 6): { start: Date; end: Date; days: Date[] } {
  const today = new Date();
  const start = startOfWeek(addDays(today, -7), { weekStartsOn: 1 });
  const end = addDays(start, weeksToShow * 7 - 1);
  const days = eachDayOfInterval({ start, end });
  return { start, end, days };
}

export function dayOffset(start: Date, date: Date): number {
  return differenceInDays(date, start);
}

export function formatDay(date: Date): string {
  return format(date, "d");
}

export function formatDayHeader(date: Date): string {
  return format(date, "EEE");
}

export function formatMonth(date: Date): string {
  return format(date, "MMM yyyy");
}

export function isWeekend(date: Date): boolean {
  const day = date.getDay();
  return day === 0 || day === 6;
}

export function isToday(date: Date): boolean {
  const now = new Date();
  return date.toDateString() === now.toDateString();
}

export function dateToString(date: Date): string {
  return format(date, "yyyy-MM-dd");
}

export function parseDate(str: string): Date {
  return new Date(str + "T00:00:00");
}

export { isSameMonth, differenceInDays, addDays };
