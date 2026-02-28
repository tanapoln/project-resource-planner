import { format, addDays, addWeeks, addMonths, addQuarters, differenceInDays, differenceInWeeks, differenceInMonths, differenceInQuarters, startOfWeek, startOfMonth, startOfQuarter, eachDayOfInterval, isSameMonth } from "date-fns";

export type Granularity = "day" | "week" | "month" | "quarter";

export function getTimelineRange(weeksToShow = 6): { start: Date; end: Date; days: Date[] } {
  const today = new Date();
  const start = startOfWeek(addDays(today, -7), { weekStartsOn: 1 });
  const end = addDays(start, weeksToShow * 7 - 1);
  const days = eachDayOfInterval({ start, end });
  return { start, end, days };
}

/** Generate columns (Date[]) for a given granularity and offset */
export function getTimelineColumns(granularity: Granularity, offset: number): Date[] {
  const today = new Date();
  const columns: Date[] = [];

  if (granularity === "day") {
    const start = startOfWeek(addDays(today, -7), { weekStartsOn: 1 });
    start.setDate(start.getDate() + offset * 7);
    for (let i = 0; i < 8 * 7; i++) {
      columns.push(addDays(start, i));
    }
  } else if (granularity === "week") {
    let start = startOfWeek(addWeeks(today, -4 + offset * 4), { weekStartsOn: 1 });
    for (let i = 0; i < 20; i++) {
      columns.push(addWeeks(start, i));
    }
  } else if (granularity === "month") {
    let start = startOfMonth(addMonths(today, -2 + offset * 3));
    for (let i = 0; i < 12; i++) {
      columns.push(addMonths(start, i));
    }
  } else {
    // quarter
    let start = startOfQuarter(addQuarters(today, -1 + offset * 2));
    for (let i = 0; i < 8; i++) {
      columns.push(addQuarters(start, i));
    }
  }

  return columns;
}

/** Get the width of one column in days, for positioning bars */
export function columnWidthInDays(granularity: Granularity, colDate: Date): number {
  if (granularity === "day") return 1;
  if (granularity === "week") return 7;
  if (granularity === "month") {
    const next = addMonths(colDate, 1);
    return differenceInDays(next, colDate);
  }
  // quarter
  const next = addQuarters(colDate, 1);
  return differenceInDays(next, colDate);
}

/** Format column label based on granularity */
export function formatColumnLabel(date: Date, granularity: Granularity): string {
  if (granularity === "day") return format(date, "d");
  if (granularity === "week") return `W${format(date, "w")}`;
  if (granularity === "month") return format(date, "MMM");
  return `Q${Math.ceil((date.getMonth() + 1) / 3)}`;
}

/** Format the top-level group header */
export function formatGroupLabel(date: Date, granularity: Granularity): string {
  if (granularity === "day") return format(date, "MMM yyyy");
  if (granularity === "week") return format(date, "MMM yyyy");
  if (granularity === "month") return format(date, "yyyy");
  return format(date, "yyyy");
}

/** Calculate pixel position and width of an assignment bar across any granularity */
export function getBarPosition(
  startDate: Date,
  endDate: Date,
  columns: Date[],
  colWidth: number,
  granularity: Granularity,
): { left: number; width: number } {
  const timelineStart = columns[0];
  // Total days the timeline spans
  const lastCol = columns[columns.length - 1];
  const timelineEndDate = addDays(lastCol, columnWidthInDays(granularity, lastCol));
  const totalTimelineDays = differenceInDays(timelineEndDate, timelineStart);
  const totalTimelineWidth = columns.length * colWidth;
  const pixelsPerDay = totalTimelineWidth / totalTimelineDays;

  const offsetDays = differenceInDays(startDate, timelineStart);
  const durationDays = differenceInDays(endDate, startDate) + 1;

  return {
    left: offsetDays * pixelsPerDay,
    width: Math.max(durationDays * pixelsPerDay, 8),
  };
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

export function isTodayInColumn(date: Date, granularity: Granularity): boolean {
  const now = new Date();
  if (granularity === "day") return date.toDateString() === now.toDateString();
  const end = addDays(date, columnWidthInDays(granularity, date) - 1);
  return now >= date && now <= end;
}

export { isSameMonth, differenceInDays, addDays };
