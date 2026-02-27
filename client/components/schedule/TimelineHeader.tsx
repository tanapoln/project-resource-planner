import { useMemo } from "react";
import { formatDay, formatMonth, isWeekend, isToday, isSameMonth } from "@/lib/dateUtils";

interface Props {
  days: Date[];
  dayWidth: number;
}

export default function TimelineHeader({ days, dayWidth }: Props) {
  // Group days into months
  const months = useMemo(() => {
    const result: { label: string; span: number }[] = [];
    let current = { label: formatMonth(days[0]), span: 0 };
    for (const day of days) {
      const label = formatMonth(day);
      if (label === current.label) {
        current.span++;
      } else {
        result.push(current);
        current = { label, span: 1 };
      }
    }
    result.push(current);
    return result;
  }, [days]);

  return (
    <div className="sticky top-0 z-20 bg-card border-b">
      {/* Month row */}
      <div className="flex border-b">
        {months.map((m, i) => (
          <div
            key={i}
            className="text-xs font-semibold text-muted-foreground px-2 py-1.5 border-r last:border-r-0 truncate"
            style={{ width: m.span * dayWidth, minWidth: m.span * dayWidth }}
          >
            {m.label}
          </div>
        ))}
      </div>
      {/* Day row */}
      <div className="flex">
        {days.map((day, i) => {
          const weekend = isWeekend(day);
          const today = isToday(day);
          return (
            <div
              key={i}
              className={`flex flex-col items-center justify-center py-1 border-r last:border-r-0 text-[10px] leading-tight
                ${weekend ? "bg-muted/50 text-muted-foreground/60" : "text-muted-foreground"}
                ${today ? "bg-primary/10 font-bold text-primary" : ""}
              `}
              style={{ width: dayWidth, minWidth: dayWidth }}
            >
              <span>{formatDay(day)}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
