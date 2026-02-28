import { useMemo } from "react";
import { Granularity, formatColumnLabel, formatGroupLabel, isWeekend, isTodayInColumn, columnWidthInDays } from "@/lib/dateUtils";

interface Props {
  columns: Date[];
  colWidth: number;
  granularity: Granularity;
}

export default function TimelineHeader({ columns, colWidth, granularity }: Props) {
  // Group columns by their group label (month for day/week, year for month/quarter)
  const groups = useMemo(() => {
    const result: { label: string; span: number }[] = [];
    let current = { label: formatGroupLabel(columns[0], granularity), span: 0 };
    for (const col of columns) {
      const label = formatGroupLabel(col, granularity);
      if (label === current.label) {
        current.span++;
      } else {
        result.push(current);
        current = { label, span: 1 };
      }
    }
    result.push(current);
    return result;
  }, [columns, granularity]);

  return (
    <div className="sticky top-0 z-20 bg-card border-b h-[60px]">
      {/* Group row (month/year) */}
      <div className="flex border-b h-[30px]">
        {groups.map((g, i) => (
          <div
            key={i}
            className="text-xs font-semibold text-muted-foreground px-2 py-1.5 border-r last:border-r-0 truncate"
            style={{ width: g.span * colWidth, minWidth: g.span * colWidth }}
          >
            {g.label}
          </div>
        ))}
      </div>
      {/* Column labels row */}
      <div className="flex h-[30px]">
        {columns.map((col, i) => {
          const weekend = granularity === "day" && isWeekend(col);
          const today = isTodayInColumn(col, granularity);
          return (
            <div
              key={i}
              className={`flex flex-col items-center justify-center py-1 border-r last:border-r-0 text-[10px] leading-tight
                ${weekend ? "bg-muted/50 text-muted-foreground/60" : "text-muted-foreground"}
                ${today ? "bg-primary/10 font-bold text-primary" : ""}
              `}
              style={{ width: colWidth, minWidth: colWidth }}
            >
              <span>{formatColumnLabel(col, granularity)}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
