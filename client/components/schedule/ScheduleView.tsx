import { useState, useRef, useMemo, useCallback } from "react";
import { Team, Member, Project, Assignment } from "@/lib/types";
import {
  Granularity, getTimelineColumns, isWeekend, isTodayInColumn,
  dateToString, getBarPosition, columnWidthInDays,
} from "@/lib/dateUtils";
import TimelineHeader from "./TimelineHeader";
import GanttBar from "./GanttBar";
import AssignmentDialog from "./AssignmentDialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
} from "@/components/ui/select";
import { ChevronLeft, ChevronRight, Plus, CalendarDays, ZoomIn, ZoomOut } from "lucide-react";

interface Props {
  teams: Team[];
  members: Member[];
  projects: Project[];
  assignments: Assignment[];
  addAssignment: (a: Omit<Assignment, "id">) => { success: boolean; conflicts: Assignment[] };
  updateAssignment: (id: string, data: Partial<Assignment>) => { success: boolean; conflicts: Assignment[] };
  deleteAssignment: (id: string) => void;
}

const ROW_HEIGHT = 40;

const ZOOM_LEVELS: Record<Granularity, { min: number; max: number; default: number; step: number }> = {
  day:     { min: 20, max: 60,  default: 36,  step: 4 },
  week:    { min: 30, max: 100, default: 60,  step: 10 },
  month:   { min: 40, max: 160, default: 80,  step: 15 },
  quarter: { min: 60, max: 240, default: 120, step: 20 },
};

const GRANULARITY_LABELS: Record<Granularity, string> = {
  day: "Day",
  week: "Week",
  month: "Month",
  quarter: "Quarter",
};

export default function ScheduleView({
  teams, members, projects, assignments,
  addAssignment, updateAssignment, deleteAssignment,
}: Props) {
  const [offset, setOffset] = useState(0);
  const [granularity, setGranularity] = useState<Granularity>("day");
  const [colWidth, setColWidth] = useState(ZOOM_LEVELS.day.default);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogDefaults, setDialogDefaults] = useState<{ memberId?: string; date?: string }>({});
  const scrollRef = useRef<HTMLDivElement>(null);

  const columns = useMemo(
    () => getTimelineColumns(granularity, offset),
    [granularity, offset],
  );

  const timelineStart = columns[0];

  // Group members by team
  const grouped = useMemo(() => {
    return teams
      .map((team) => ({
        team,
        members: members.filter((m) => m.teamId === team.id),
      }))
      .filter((g) => g.members.length > 0);
  }, [teams, members]);

  const getProject = useCallback((id: string) => projects.find((p) => p.id === id), [projects]);

  const getMemberAssignments = useCallback(
    (memberId: string) => assignments.filter((a) => a.memberId === memberId),
    [assignments],
  );

  const handleCellClick = (memberId: string, day: Date) => {
    setDialogDefaults({ memberId, date: dateToString(day) });
    setDialogOpen(true);
  };

  const handleGranularityChange = (value: string) => {
    const g = value as Granularity;
    setGranularity(g);
    setColWidth(ZOOM_LEVELS[g].default);
    setOffset(0);
  };

  const zoomIn = () => {
    setColWidth((w) => Math.min(w + ZOOM_LEVELS[granularity].step, ZOOM_LEVELS[granularity].max));
  };

  const zoomOut = () => {
    setColWidth((w) => Math.max(w - ZOOM_LEVELS[granularity].step, ZOOM_LEVELS[granularity].min));
  };

  const totalWidth = columns.length * colWidth;

  const navStep = granularity === "day" ? 2 : 1;

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold text-foreground">Schedule</h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            Drag to move or resize. Right-click to remove.
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {/* Granularity selector */}
          <Select value={granularity} onValueChange={handleGranularityChange}>
            <SelectTrigger className="h-8 w-[110px] text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {(Object.keys(GRANULARITY_LABELS) as Granularity[]).map((g) => (
                <SelectItem key={g} value={g}>{GRANULARITY_LABELS[g]}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Zoom controls */}
          <div className="flex items-center border rounded-md">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 rounded-r-none"
              onClick={zoomOut}
              disabled={colWidth <= ZOOM_LEVELS[granularity].min}
            >
              <ZoomOut className="h-3.5 w-3.5" />
            </Button>
            <div className="h-8 w-px bg-border" />
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 rounded-l-none"
              onClick={zoomIn}
              disabled={colWidth >= ZOOM_LEVELS[granularity].max}
            >
              <ZoomIn className="h-3.5 w-3.5" />
            </Button>
          </div>

          {/* Navigation */}
          <div className="flex items-center gap-1">
            <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setOffset((o) => o - navStep)}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="sm" className="h-8 text-xs" onClick={() => setOffset(0)}>
              Today
            </Button>
            <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setOffset((o) => o + navStep)}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>

          <Button size="sm" className="h-8" onClick={() => { setDialogDefaults({}); setDialogOpen(true); }}>
            <Plus className="h-4 w-4 mr-1" /> Assign
          </Button>
        </div>
      </div>

      {/* Gantt Chart */}
      <div className="border rounded-lg bg-card overflow-hidden">
        <div className="flex">
          {/* Left sidebar */}
          <div className="shrink-0 w-48 border-r bg-card z-10">
            <div className="h-[58px] border-b bg-muted/30 flex items-end px-3 pb-1.5">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Member</span>
            </div>
            {grouped.map(({ team, members: teamMembers }) => (
              <div key={team.id}>
                <div className="flex items-center gap-2 px-3 py-2 bg-muted/40 border-b">
                  <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: team.color }} />
                  <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{team.name}</span>
                  <Badge variant="secondary" className="text-[10px] h-4 px-1.5">{teamMembers.length}</Badge>
                </div>
                {teamMembers.map((member) => (
                  <div
                    key={member.id}
                    className="flex items-center gap-2 px-3 border-b hover:bg-muted/20 transition-colors"
                    style={{ height: ROW_HEIGHT }}
                  >
                    <div
                      className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-semibold text-white shrink-0"
                      style={{ backgroundColor: team.color }}
                    >
                      {member.name.split(" ").map((n) => n[0]).join("").slice(0, 2)}
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-medium truncate">{member.name}</p>
                      <p className="text-[10px] text-muted-foreground truncate">{member.role}</p>
                    </div>
                  </div>
                ))}
              </div>
            ))}
          </div>

          {/* Right scrollable timeline */}
          <div ref={scrollRef} className="overflow-x-auto flex-1">
            <div style={{ width: totalWidth, minWidth: totalWidth }}>
              <TimelineHeader columns={columns} colWidth={colWidth} granularity={granularity} />

              {grouped.map(({ team, members: teamMembers }) => (
                <div key={team.id}>
                  <div className="bg-muted/40 border-b" style={{ height: 28 }} />
                  {teamMembers.map((member) => {
                    const memberAssignments = getMemberAssignments(member.id);
                    return (
                      <div
                        key={member.id}
                        className="relative border-b"
                        style={{ height: ROW_HEIGHT }}
                      >
                        {/* Column cells background */}
                        <div className="absolute inset-0 flex">
                          {columns.map((col, i) => {
                            const weekend = granularity === "day" && isWeekend(col);
                            const today = isTodayInColumn(col, granularity);
                            return (
                              <div
                                key={i}
                                className={`border-r last:border-r-0 cursor-pointer hover:bg-primary/5 transition-colors
                                  ${weekend ? "bg-muted/30" : ""}
                                  ${today ? "bg-primary/10" : ""}
                                `}
                                style={{ width: colWidth, minWidth: colWidth }}
                                onClick={() => handleCellClick(member.id, col)}
                              />
                            );
                          })}
                        </div>
                        {/* Assignment bars */}
                        {memberAssignments.map((assignment) => {
                          const proj = getProject(assignment.projectId);
                          if (!proj) return null;
                          return (
                            <GanttBar
                              key={assignment.id}
                              assignment={assignment}
                              project={proj}
                              columns={columns}
                              colWidth={colWidth}
                              granularity={granularity}
                              onUpdate={updateAssignment}
                              onDelete={deleteAssignment}
                            />
                          );
                        })}
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 text-xs text-muted-foreground flex-wrap">
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-sm bg-primary/10 border border-primary/30" /> Today
        </span>
        {granularity === "day" && (
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-sm bg-muted/30 border" /> Weekend
          </span>
        )}
        <span className="flex items-center gap-1.5">
          <CalendarDays className="h-3 w-3" /> Click a cell to assign
        </span>
        <span className="ml-auto text-muted-foreground/60">
          Zoom: {Math.round(((colWidth - ZOOM_LEVELS[granularity].min) / (ZOOM_LEVELS[granularity].max - ZOOM_LEVELS[granularity].min)) * 100)}%
        </span>
      </div>

      <AssignmentDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        members={members}
        projects={projects}
        teams={teams}
        defaults={dialogDefaults}
        onSave={addAssignment}
      />
    </div>
  );
}
