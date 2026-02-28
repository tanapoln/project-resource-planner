import { format, addDays, addWeeks, addMonths, addQuarters, differenceInDays, differenceInWeeks, differenceInMonths, differenceInQuarters, startOfWeek, startOfMonth, startOfQuarter, eachDayOfInterval, isSameMonth } from "date-fns";

export type Granularity = "day" | "week" | "month" | "quarter";

export function getTimelineRange(weeksToShow = 6): { start: Date; end: Date; days: Date[] } {
  const today = new Date();
  const start = startOfWeek(addDays(today, -7), { weekStartsOn: 1 });
  const end = addDays(start, weeksToShow * 7 - 1);
  const days = eachDayOfInterval({ start, end });
  return { start, end, days };
}

/**
 * Generate columns (Date[]) for a given granularity and offset.
 * The range is computed so that:
 *   1. It always covers [dataMinDate .. dataMaxDate] (all assignment dates).
 *   2. It meets minimum forward-looking requirements per granularity.
 *   3. Offset extends the range further for navigation.
 */
export function getTimelineColumns(
  granularity: Granularity,
  offset: number,
  dataMinDate?: Date | null,
  dataMaxDate?: Date | null,
): Date[] {
  const today = new Date();
  let rangeStart: Date;
  let rangeEnd: Date;

  if (granularity === "day") {
    // Show 1 week before today + at least 60 days ahead
    rangeStart = startOfWeek(addDays(today, -7), { weekStartsOn: 1 });
    rangeEnd = addDays(today, 60);
    // Apply offset (7 days per step)
    if (offset < 0) rangeStart = addDays(rangeStart, offset * 7);
    if (offset > 0) rangeEnd = addDays(rangeEnd, offset * 7);
  } else if (granularity === "week") {
    // Show 4 weeks before + at least 12 weeks ahead
    rangeStart = startOfWeek(addWeeks(today, -4), { weekStartsOn: 1 });
    rangeEnd = addWeeks(today, 12);
    if (offset < 0) rangeStart = addWeeks(rangeStart, offset * 4);
    if (offset > 0) rangeEnd = addWeeks(rangeEnd, offset * 4);
  } else if (granularity === "month") {
    // Show 2 months before + at least 6 months ahead or to end of year
    rangeStart = startOfMonth(addMonths(today, -2));
    const sixAhead = addMonths(today, 6);
    const endOfYear = new Date(today.getFullYear(), 11, 31);
    rangeEnd = sixAhead > endOfYear ? sixAhead : endOfYear;
    if (offset < 0) rangeStart = addMonths(rangeStart, offset * 3);
    if (offset > 0) rangeEnd = addMonths(rangeEnd, offset * 3);
  } else {
    // Quarter: show 2 quarters before + at least 3 years ahead
    rangeStart = startOfQuarter(addQuarters(today, -2));
    rangeEnd = addQuarters(today, 12); // 3 years = 12 quarters
    if (offset < 0) rangeStart = addQuarters(rangeStart, offset * 2);
    if (offset > 0) rangeEnd = addQuarters(rangeEnd, offset * 2);
  }

  // Rule 1: extend to cover all assignment dates
  if (dataMinDate && dataMinDate < rangeStart) {
    if (granularity === "day") rangeStart = startOfWeek(dataMinDate, { weekStartsOn: 1 });
    else if (granularity === "week") rangeStart = startOfWeek(dataMinDate, { weekStartsOn: 1 });
    else if (granularity === "month") rangeStart = startOfMonth(dataMinDate);
    else rangeStart = startOfQuarter(dataMinDate);
  }
  if (dataMaxDate && dataMaxDate > rangeEnd) {
    rangeEnd = dataMaxDate;
  }

  // Generate columns from rangeStart to rangeEnd
  const columns: Date[] = [];
  if (granularity === "day") {
    let d = new Date(rangeStart);
    while (d <= rangeEnd) {
      columns.push(new Date(d));
      d = addDays(d, 1);
    }
  } else if (granularity === "week") {
    let d = startOfWeek(rangeStart, { weekStartsOn: 1 });
    const endBound = addWeeks(rangeEnd, 1);
    while (d <= endBound) {
      columns.push(new Date(d));
      d = addWeeks(d, 1);
    }
  } else if (granularity === "month") {
    let d = startOfMonth(rangeStart);
    const endBound = addMonths(rangeEnd, 1);
    while (d <= endBound) {
      columns.push(new Date(d));
      d = addMonths(d, 1);
    }
  } else {
    let d = startOfQuarter(rangeStart);
    const endBound = addQuarters(rangeEnd, 1);
    while (d <= endBound) {
      columns.push(new Date(d));
      d = addQuarters(d, 1);
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
