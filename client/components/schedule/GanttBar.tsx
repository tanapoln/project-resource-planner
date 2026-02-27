import { useRef, useState, useCallback } from "react";
import { Assignment, Project } from "@/lib/types";
import { parseDate, dateToString, addDays, differenceInDays } from "@/lib/dateUtils";
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import { format } from "date-fns";

interface Props {
  assignment: Assignment;
  project: Project;
  timelineStart: Date;
  dayWidth: number;
  onUpdate: (id: string, data: Partial<Assignment>) => { success: boolean; conflicts: Assignment[] };
  onDelete: (id: string) => void;
}

type DragMode = "move" | "resize-left" | "resize-right" | null;

export default function GanttBar({ assignment, project, timelineStart, dayWidth, onUpdate, onDelete }: Props) {
  const barRef = useRef<HTMLDivElement>(null);
  const [dragMode, setDragMode] = useState<DragMode>(null);
  const [conflict, setConflict] = useState(false);
  const dragState = useRef({ startX: 0, origLeft: 0, origWidth: 0, origStartDate: "", origEndDate: "" });

  const startDate = parseDate(assignment.startDate);
  const endDate = parseDate(assignment.endDate);
  const offsetDays = differenceInDays(startDate, timelineStart);
  const durationDays = differenceInDays(endDate, startDate) + 1;
  const left = offsetDays * dayWidth;
  const width = durationDays * dayWidth;

  const handleMouseDown = useCallback((e: React.MouseEvent, mode: DragMode) => {
    e.preventDefault();
    e.stopPropagation();
    setDragMode(mode);
    setConflict(false);
    dragState.current = {
      startX: e.clientX,
      origLeft: left,
      origWidth: width,
      origStartDate: assignment.startDate,
      origEndDate: assignment.endDate,
    };

    const handleMouseMove = (ev: MouseEvent) => {
      const dx = ev.clientX - dragState.current.startX;
      const daysDelta = Math.round(dx / dayWidth);
      if (daysDelta === 0) return;

      let newStart = dragState.current.origStartDate;
      let newEnd = dragState.current.origEndDate;

      if (mode === "move") {
        newStart = dateToString(addDays(parseDate(dragState.current.origStartDate), daysDelta));
        newEnd = dateToString(addDays(parseDate(dragState.current.origEndDate), daysDelta));
      } else if (mode === "resize-left") {
        const proposed = addDays(parseDate(dragState.current.origStartDate), daysDelta);
        if (proposed <= parseDate(dragState.current.origEndDate)) {
          newStart = dateToString(proposed);
        }
      } else if (mode === "resize-right") {
        const proposed = addDays(parseDate(dragState.current.origEndDate), daysDelta);
        if (proposed >= parseDate(dragState.current.origStartDate)) {
          newEnd = dateToString(proposed);
        }
      }

      const result = onUpdate(assignment.id, { startDate: newStart, endDate: newEnd });
      if (!result.success) {
        setConflict(true);
        // Revert
        onUpdate(assignment.id, { startDate: dragState.current.origStartDate, endDate: dragState.current.origEndDate });
      } else {
        setConflict(false);
      }
    };

    const handleMouseUp = () => {
      setDragMode(null);
      setTimeout(() => setConflict(false), 1500);
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
  }, [assignment, dayWidth, left, width, onUpdate]);

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div
          ref={barRef}
          className={`gantt-bar absolute top-1 h-[calc(100%-8px)] flex items-center group select-none
            ${conflict ? "ring-2 ring-destructive animate-pulse" : ""}
            ${dragMode ? "opacity-80 shadow-xl z-30" : "z-10"}
          `}
          style={{
            left,
            width: Math.max(width, dayWidth),
            backgroundColor: project.color,
          }}
          onMouseDown={(e) => handleMouseDown(e, "move")}
          onContextMenu={(e) => {
            e.preventDefault();
            onDelete(assignment.id);
          }}
        >
          {/* Left resize handle */}
          <div
            className="absolute left-0 top-0 bottom-0 w-2 cursor-col-resize hover:bg-black/20 rounded-l-md"
            onMouseDown={(e) => handleMouseDown(e, "resize-left")}
          />
          {/* Label */}
          <span className="text-[11px] font-medium text-white truncate px-3 pointer-events-none">
            {project.name}
          </span>
          {/* Right resize handle */}
          <div
            className="absolute right-0 top-0 bottom-0 w-2 cursor-col-resize hover:bg-black/20 rounded-r-md"
            onMouseDown={(e) => handleMouseDown(e, "resize-right")}
          />
        </div>
      </TooltipTrigger>
      <TooltipContent side="top" className="text-xs">
        <p className="font-semibold">{project.name}</p>
        <p>{format(startDate, "MMM d")} - {format(endDate, "MMM d, yyyy")}</p>
        <p className="text-muted-foreground">{durationDays} day{durationDays !== 1 ? "s" : ""}</p>
        {conflict && <p className="text-destructive font-medium mt-1">Schedule conflict!</p>}
        <p className="text-muted-foreground mt-1">Right-click to remove</p>
      </TooltipContent>
    </Tooltip>
  );
}
