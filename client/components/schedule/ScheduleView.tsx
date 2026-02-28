import { useState, useRef, useMemo, useCallback, useEffect } from "react";
import { Team, Member, Project, Assignment } from "@/lib/types";
import {
  Granularity,
  getTimelineColumns,
  isWeekend,
  isTodayInColumn,
  dateToString,
  columnWidthInDays,
  addDays,
  parseDate,
} from "@/lib/dateUtils";
import { assignLanes } from "@/lib/laneUtils";
import TimelineHeader from "./TimelineHeader";
import GanttBar from "./GanttBar";
import AssignmentDialog from "./AssignmentDialog";
import ScheduleCsvDialog from "./ScheduleCsvDialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  CalendarDays,
  ZoomIn,
  ZoomOut,
} from "lucide-react";

interface Props {
  teams: Team[];
  members: Member[];
  projects: Project[];
  assignments: Assignment[];
  addTeam: (t: Omit<Team, "id">) => Team;
  addMember: (m: Omit<Member, "id">) => Member;
  addProject: (p: Omit<Project, "id">) => Project;
  addAssignment: (a: Omit<Assignment, "id">) => {
    success: boolean;
    conflicts: Assignment[];
  };
  updateAssignment: (
    id: string,
    data: Partial<Assignment>,
  ) => { success: boolean; conflicts: Assignment[] };
  deleteAssignment: (id: string) => void;
}

type GroupBy = "team" | "member" | "project";

const LANE_HEIGHT = 28;
const LANE_GAP = 2;
const MIN_ROW_HEIGHT = 40;

function getRowHeight(laneCount: number): number {
  return Math.max(
    laneCount * (LANE_HEIGHT + LANE_GAP) + LANE_GAP,
    MIN_ROW_HEIGHT,
  );
}

const ZOOM_LEVELS: Record<
  Granularity,
  { min: number; max: number; default: number; step: number }
> = {
  day: { min: 20, max: 60, default: 36, step: 4 },
  week: { min: 30, max: 100, default: 60, step: 10 },
  month: { min: 40, max: 160, default: 80, step: 15 },
  quarter: { min: 60, max: 240, default: 120, step: 20 },
};

const GRANULARITY_LABELS: Record<Granularity, string> = {
  day: "Day",
  week: "Week",
  month: "Month",
  quarter: "Quarter",
};

const GROUP_BY_LABELS: Record<GroupBy, string> = {
  team: "By Team",
  member: "By Member",
  project: "By Project",
};

interface SwimlaneRow {
  id: string;
  assignments: Assignment[];
}

interface SwimlaneGroup {
  id: string;
  label: string;
  color: string;
  count: number;
  rows: SwimlaneRow[];
}

export default function ScheduleView({
  teams,
  members,
  projects,
  assignments,
  addTeam,
  addMember,
  addProject,
  addAssignment,
  updateAssignment,
  deleteAssignment,
}: Props) {
  const [offset, setOffset] = useState(0);
  const [granularity, setGranularity] = useState<Granularity>(() => {
    const saved = localStorage.getItem("schedule-granularity");
    return saved && saved in GRANULARITY_LABELS ? (saved as Granularity) : "day";
  });
  const [groupBy, setGroupBy] = useState<GroupBy>(() => {
    const saved = localStorage.getItem("schedule-groupBy");
    return saved && saved in GROUP_BY_LABELS ? (saved as GroupBy) : "team";
  });
  useEffect(() => { localStorage.setItem("schedule-granularity", granularity); }, [granularity]);
  useEffect(() => { localStorage.setItem("schedule-groupBy", groupBy); }, [groupBy]);

  const [colWidth, setColWidth] = useState(ZOOM_LEVELS.day.default);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogDefaults, setDialogDefaults] = useState<{
    memberId?: string;
    date?: string;
    endDate?: string;
  }>({});
  const scrollRef = useRef<HTMLDivElement>(null);
  const headerScrollRef = useRef<HTMLDivElement>(null);
  const toolbarRef = useRef<HTMLDivElement>(null);
  const isSyncingScroll = useRef(false);
  const [dateHeaderTop, setDateHeaderTop] = useState(0);

  // Measure toolbar to position sticky date header right below it
  useEffect(() => {
    const measure = () => {
      if (toolbarRef.current) {
        // app header = 56px (top-14), then toolbar height + py-3 padding
        setDateHeaderTop(56 + toolbarRef.current.offsetHeight);
      }
    };
    measure();
    // Re-measure on resize since toolbar may wrap on narrow screens
    const ro = new ResizeObserver(measure);
    ro.observe(toolbarRef.current!);
    return () => ro.disconnect();
  }, []);

  const handleBodyScroll = useCallback(() => {
    if (isSyncingScroll.current) return;
    isSyncingScroll.current = true;
    if (headerScrollRef.current && scrollRef.current) {
      headerScrollRef.current.scrollLeft = scrollRef.current.scrollLeft;
    }
    isSyncingScroll.current = false;
  }, []);

  const handleHeaderScroll = useCallback(() => {
    if (isSyncingScroll.current) return;
    isSyncingScroll.current = true;
    if (scrollRef.current && headerScrollRef.current) {
      scrollRef.current.scrollLeft = headerScrollRef.current.scrollLeft;
    }
    isSyncingScroll.current = false;
  }, []);

  // Drag-to-select state
  const [dragSelect, setDragSelect] = useState<{
    rowId: string;
    startIdx: number;
    endIdx: number;
  } | null>(null);
  const isDraggingRef = useRef(false);

  // Vertical drag reassign state
  const [dropTargetRowId, setDropTargetRowId] = useState<string | null>(null);

  const handleReassign = useCallback(
    (assignmentId: string, targetRowId: string) => {
      if (groupBy === "project") {
        updateAssignment(assignmentId, { projectId: targetRowId });
      } else {
        updateAssignment(assignmentId, { memberId: targetRowId });
      }
    },
    [groupBy, updateAssignment],
  );

  const handleDropTargetChange = useCallback((rowId: string | null) => {
    setDropTargetRowId(rowId);
  }, []);

  // Compute min/max dates from all assignments
  const { dataMinDate, dataMaxDate } = useMemo(() => {
    if (assignments.length === 0)
      return { dataMinDate: null, dataMaxDate: null };
    let min = parseDate(assignments[0].startDate);
    let max = parseDate(assignments[0].endDate);
    for (const a of assignments) {
      const s = parseDate(a.startDate);
      const e = parseDate(a.endDate);
      if (s < min) min = s;
      if (e > max) max = e;
    }
    return { dataMinDate: min, dataMaxDate: max };
  }, [assignments]);

  const columns = useMemo(
    () => getTimelineColumns(granularity, offset, dataMinDate, dataMaxDate),
    [granularity, offset, dataMinDate, dataMaxDate],
  );

  const getProject = useCallback(
    (id: string) => projects.find((p) => p.id === id),
    [projects],
  );
  const getMember = useCallback(
    (id: string) => members.find((m) => m.id === id),
    [members],
  );
  const getTeam = useCallback(
    (id: string) => teams.find((t) => t.id === id),
    [teams],
  );

  // Build swimlane data based on groupBy mode
  const { groups, sidebarLabel } = useMemo(() => {
    if (groupBy === "team") {
      const teamIds = new Set(teams.map((t) => t.id));
      const g: SwimlaneGroup[] = teams
        .map((team) => {
          const teamMembers = members.filter((m) => m.teamId === team.id);
          return {
            id: team.id,
            label: team.name,
            color: team.color,
            count: teamMembers.length,
            rows: teamMembers.map((m) => ({
              id: m.id,
              assignments: assignments.filter((a) => a.memberId === m.id),
            })),
          };
        })
        .filter((g) => g.rows.length > 0);

      // Add unassigned members (no team or invalid teamId)
      const unassigned = members.filter(
        (m) => !m.teamId || !teamIds.has(m.teamId),
      );
      if (unassigned.length > 0) {
        g.push({
          id: "__unassigned",
          label: "Unassigned",
          color: "#94a3b8",
          count: unassigned.length,
          rows: unassigned.map((m) => ({
            id: m.id,
            assignments: assignments.filter((a) => a.memberId === m.id),
          })),
        });
      }

      return { groups: g, sidebarLabel: "Member" };
    }

    if (groupBy === "member") {
      const rows: SwimlaneRow[] = members.map((m) => ({
        id: m.id,
        assignments: assignments.filter((a) => a.memberId === m.id),
      }));
      const g: SwimlaneGroup[] = [
        {
          id: "__all_members",
          label: "",
          color: "",
          count: members.length,
          rows,
        },
      ];
      return { groups: g, sidebarLabel: "Member" };
    }

    // groupBy === "project"
    const rows: SwimlaneRow[] = projects.map((p) => ({
      id: p.id,
      assignments: assignments.filter((a) => a.projectId === p.id),
    }));
    const g: SwimlaneGroup[] = [
      {
        id: "__all_projects",
        label: "",
        color: "",
        count: projects.length,
        rows,
      },
    ];
    return { groups: g, sidebarLabel: "Project" };
  }, [groupBy, teams, members, projects, assignments]);

  // Pre-compute lane info for every row
  const rowLaneData = useMemo(() => {
    const map = new Map<
      string,
      { lanes: Map<string, number>; laneCount: number }
    >();
    for (const group of groups) {
      for (const row of group.rows) {
        map.set(row.id, assignLanes(row.assignments));
      }
    }
    return map;
  }, [groups]);

  const handleCellMouseDown = useCallback(
    (rowId: string, colIdx: number, e: React.MouseEvent) => {
      if (e.button !== 0) return; // only left click
      isDraggingRef.current = false;
      setDragSelect({ rowId, startIdx: colIdx, endIdx: colIdx });
    },
    [],
  );

  const handleCellMouseEnter = useCallback((rowId: string, colIdx: number) => {
    setDragSelect((prev) => {
      if (!prev || prev.rowId !== rowId) return prev;
      if (prev.endIdx !== colIdx) isDraggingRef.current = true;
      return { ...prev, endIdx: colIdx };
    });
  }, []);

  const handleCellMouseUp = useCallback(() => {
    if (!dragSelect) return;
    const minIdx = Math.min(dragSelect.startIdx, dragSelect.endIdx);
    const maxIdx = Math.max(dragSelect.startIdx, dragSelect.endIdx);
    const startDay = columns[minIdx];
    // End date = last day of the last selected column
    const endDay = addDays(
      columns[maxIdx],
      columnWidthInDays(granularity, columns[maxIdx]) - 1,
    );

    if (groupBy === "project") {
      setDialogDefaults({
        date: dateToString(startDay),
        endDate: dateToString(endDay),
      });
    } else {
      setDialogDefaults({
        memberId: dragSelect.rowId,
        date: dateToString(startDay),
        endDate: dateToString(endDay),
      });
    }
    setDialogOpen(true);
    setDragSelect(null);
    isDraggingRef.current = false;
  }, [dragSelect, columns, granularity, groupBy]);

  const handleGranularityChange = (value: string) => {
    const g = value as Granularity;
    setGranularity(g);
    setColWidth(ZOOM_LEVELS[g].default);
    setOffset(0);
  };

  const zoomIn = () => {
    setColWidth((w) =>
      Math.min(w + ZOOM_LEVELS[granularity].step, ZOOM_LEVELS[granularity].max),
    );
  };
  const zoomOut = () => {
    setColWidth((w) =>
      Math.max(w - ZOOM_LEVELS[granularity].step, ZOOM_LEVELS[granularity].min),
    );
  };

  const totalWidth = columns.length * colWidth;
  const navStep = granularity === "day" ? 2 : 1;

  const renderSidebarRow = (row: SwimlaneRow) => {
    const laneData = rowLaneData.get(row.id);
    const rowHeight = getRowHeight(laneData?.laneCount ?? 1);

    if (groupBy === "project") {
      const proj = getProject(row.id);
      if (!proj) return null;
      return (
        <div
          className="flex items-center gap-2 px-3 border-b hover:bg-muted/20 transition-colors"
          style={{ height: rowHeight }}
        >
          <div
            className="w-3 h-3 rounded-full shrink-0"
            style={{ backgroundColor: proj.color }}
          />
          <div className="min-w-0">
            <p className="text-xs font-medium truncate">{proj.name}</p>
            <p className="text-[10px] text-muted-foreground truncate">
              {proj.description}
            </p>
          </div>
        </div>
      );
    }
    const member = getMember(row.id);
    if (!member) return null;
    const team = getTeam(member.teamId);
    return (
      <div
        className="flex items-center gap-2 px-3 border-b hover:bg-muted/20 transition-colors"
        style={{ height: rowHeight }}
      >
        <div
          className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-semibold text-white shrink-0"
          style={{ backgroundColor: team?.color ?? "#94a3b8" }}
        >
          {member.name
            .split(" ")
            .map((n) => n[0])
            .join("")
            .slice(0, 2)}
        </div>
        <div className="min-w-0">
          <p className="text-xs font-medium truncate">{member.name}</p>
          <p className="text-[10px] text-muted-foreground truncate">
            {groupBy === "member" && team ? `${team.name} · ` : ""}
            {member.role}
          </p>
        </div>
      </div>
    );
  };

  const getBarInfo = useCallback(
    (assignment: Assignment): { color: string; label: string } => {
      if (groupBy === "project") {
        const member = getMember(assignment.memberId);
        const team = getTeam(member?.teamId ?? "");
        return {
          color: team?.color ?? "#94a3b8",
          label: member?.name ?? "Unknown",
        };
      }
      const proj = getProject(assignment.projectId);
      return {
        color: proj?.color ?? "#94a3b8",
        label: proj?.name ?? "Unknown",
      };
    },
    [groupBy, getProject, getMember, getTeam],
  );

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div
        ref={toolbarRef}
        className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sticky top-14 z-30 bg-background py-3 -mt-3"
      >
        <div>
          <h2 className="text-xl font-semibold text-foreground">Schedule</h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            Drag to move or resize. Right-click to remove.
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Select
            value={groupBy}
            onValueChange={(v) => setGroupBy(v as GroupBy)}
          >
            <SelectTrigger className="h-8 w-[120px] text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {(Object.keys(GROUP_BY_LABELS) as GroupBy[]).map((g) => (
                <SelectItem key={g} value={g}>
                  {GROUP_BY_LABELS[g]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={granularity} onValueChange={handleGranularityChange}>
            <SelectTrigger className="h-8 w-[110px] text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {(Object.keys(GRANULARITY_LABELS) as Granularity[]).map((g) => (
                <SelectItem key={g} value={g}>
                  {GRANULARITY_LABELS[g]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

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

          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              onClick={() => setOffset((o) => o - navStep)}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="h-8 text-xs"
              onClick={() => setOffset(0)}
            >
              Today
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              onClick={() => setOffset((o) => o + navStep)}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>

          <ScheduleCsvDialog
            teams={teams}
            members={members}
            projects={projects}
            assignments={assignments}
            addTeam={addTeam}
            addMember={addMember}
            addProject={addProject}
            addAssignment={addAssignment}
          />

          <Button
            size="sm"
            className="h-8"
            onClick={() => {
              setDialogDefaults({});
              setDialogOpen(true);
            }}
          >
            <Plus className="h-4 w-4 mr-1" /> Assign
          </Button>
        </div>
      </div>

      {/* Gantt Chart */}
      <div className="border rounded-lg bg-card">
        {/* Sticky date header */}
        <div
          className="sticky z-20 bg-card rounded-t-lg border-b"
          style={{ top: dateHeaderTop }}
        >
          <div className="flex">
            <div className="shrink-0 w-48 border-r bg-muted/30 flex items-end px-3 pb-1.5 h-[60px]">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                {sidebarLabel}
              </span>
            </div>
            <div
              ref={headerScrollRef}
              className="overflow-hidden flex-1"
              onScroll={handleHeaderScroll}
            >
              <div style={{ width: totalWidth, minWidth: totalWidth }}>
                <TimelineHeader
                  columns={columns}
                  colWidth={colWidth}
                  granularity={granularity}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Body */}
        <div className="flex">
          {/* Left sidebar */}
          <div className="shrink-0 w-48 border-r bg-card z-10">
            {groups.map((group) => (
              <div key={group.id}>
                {group.label && (
                  <div className="flex items-center gap-2 px-3 py-2 bg-muted/40 border-b">
                    <div
                      className="w-2.5 h-2.5 rounded-full"
                      style={{ backgroundColor: group.color }}
                    />
                    <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      {group.label}
                    </span>
                    <Badge
                      variant="secondary"
                      className="text-[10px] h-4 px-1.5"
                    >
                      {group.count}
                    </Badge>
                  </div>
                )}
                {group.rows.map((row) => (
                  <div key={row.id}>{renderSidebarRow(row)}</div>
                ))}
              </div>
            ))}
          </div>

          {/* Right scrollable timeline body */}
          <div
            ref={scrollRef}
            className="overflow-x-auto flex-1"
            onScroll={handleBodyScroll}
          >
            <div style={{ width: totalWidth, minWidth: totalWidth }}>
              {groups.map((group) => (
                <div key={group.id}>
                  {group.label && (
                    <div
                      className="bg-muted/40 border-b"
                      style={{ height: "calc(1rem + 1px + (0.5rem * 2))" }}
                    />
                  )}
                  {group.rows.map((row) => {
                    const laneData = rowLaneData.get(row.id);
                    const laneMap = laneData?.lanes ?? new Map();
                    const laneCount = laneData?.laneCount ?? 1;
                    const rowHeight = getRowHeight(laneCount);

                    return (
                      <div
                        key={row.id}
                        data-row-id={row.id}
                        className={`relative border-b transition-colors ${dropTargetRowId === row.id ? "bg-primary/10 ring-1 ring-inset ring-primary/30" : ""}`}
                        style={{ height: rowHeight }}
                      >
                        {/* Column cells background */}
                        <div className="absolute inset-0 flex">
                          {columns.map((col, i) => {
                            const weekend =
                              granularity === "day" && isWeekend(col);
                            const today = isTodayInColumn(col, granularity);
                            const isSelected =
                              dragSelect &&
                              dragSelect.rowId === row.id &&
                              i >=
                                Math.min(
                                  dragSelect.startIdx,
                                  dragSelect.endIdx,
                                ) &&
                              i <=
                                Math.max(
                                  dragSelect.startIdx,
                                  dragSelect.endIdx,
                                );
                            return (
                              <div
                                key={i}
                                className={`border-r last:border-r-0 cursor-crosshair select-none transition-colors
                                  ${weekend ? "bg-muted/30" : ""}
                                  ${today ? "bg-primary/10" : ""}
                                  ${isSelected ? "!bg-primary/20" : "hover:bg-primary/5"}
                                `}
                                style={{ width: colWidth, minWidth: colWidth }}
                                onMouseDown={(e) =>
                                  handleCellMouseDown(row.id, i, e)
                                }
                                onMouseEnter={() =>
                                  handleCellMouseEnter(row.id, i)
                                }
                                onMouseUp={handleCellMouseUp}
                              />
                            );
                          })}
                        </div>
                        {/* Assignment bars */}
                        {row.assignments.map((assignment) => {
                          const barInfo = getBarInfo(assignment);
                          const lane = laneMap.get(assignment.id) ?? 0;
                          return (
                            <GanttBar
                              key={assignment.id}
                              assignment={assignment}
                              barColor={barInfo.color}
                              barLabel={barInfo.label}
                              columns={columns}
                              colWidth={colWidth}
                              granularity={granularity}
                              lane={lane}
                              laneCount={laneCount}
                              onUpdate={updateAssignment}
                              onDelete={deleteAssignment}
                              onReassign={handleReassign}
                              onDropTargetChange={handleDropTargetChange}
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
          <span className="w-3 h-3 rounded-sm bg-primary/10 border border-primary/30" />{" "}
          Today
        </span>
        {granularity === "day" && (
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-sm bg-muted/30 border" /> Weekend
          </span>
        )}
        <span className="flex items-center gap-1.5">
          <CalendarDays className="h-3 w-3" /> Click or drag cells to assign
        </span>
        <span className="ml-auto text-muted-foreground/60">
          Zoom:{" "}
          {Math.round(
            ((colWidth - ZOOM_LEVELS[granularity].min) /
              (ZOOM_LEVELS[granularity].max - ZOOM_LEVELS[granularity].min)) *
              100,
          )}
          %
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
        onCreateProject={addProject}
      />
    </div>
  );
}
