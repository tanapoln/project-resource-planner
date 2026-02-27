import { useState, useRef, useMemo, useCallback } from "react";
import { Team, Member, Project, Assignment } from "@/lib/types";
import { getTimelineRange, isWeekend, isToday, parseDate, dateToString, dayOffset } from "@/lib/dateUtils";
import TimelineHeader from "./TimelineHeader";
import GanttBar from "./GanttBar";
import AssignmentDialog from "./AssignmentDialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ChevronLeft, ChevronRight, Plus, CalendarDays } from "lucide-react";

interface Props {
  teams: Team[];
  members: Member[];
  projects: Project[];
  assignments: Assignment[];
  addAssignment: (a: Omit<Assignment, "id">) => { success: boolean; conflicts: Assignment[] };
  updateAssignment: (id: string, data: Partial<Assignment>) => { success: boolean; conflicts: Assignment[] };
  deleteAssignment: (id: string) => void;
}

const DAY_WIDTH = 36;
const ROW_HEIGHT = 40;

export default function ScheduleView({
  teams, members, projects, assignments,
  addAssignment, updateAssignment, deleteAssignment,
}: Props) {
  const [weeksOffset, setWeeksOffset] = useState(0);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogDefaults, setDialogDefaults] = useState<{ memberId?: string; date?: string }>({});
  const scrollRef = useRef<HTMLDivElement>(null);

  const timeline = useMemo(() => getTimelineRange(8), []);
  const days = useMemo(() => {
    const start = new Date(timeline.start);
    start.setDate(start.getDate() + weeksOffset * 7);
    const end = new Date(start);
    end.setDate(end.getDate() + 8 * 7 - 1);
    const result: Date[] = [];
    const cur = new Date(start);
    while (cur <= end) {
      result.push(new Date(cur));
      cur.setDate(cur.getDate() + 1);
    }
    return result;
  }, [timeline.start, weeksOffset]);

  const timelineStart = days[0];

  // Group members by team
  const grouped = useMemo(() => {
    return teams.map((team) => ({
      team,
      members: members.filter((m) => m.teamId === team.id),
    })).filter((g) => g.members.length > 0);
  }, [teams, members]);

  const getProject = useCallback((id: string) => projects.find((p) => p.id === id), [projects]);
  const getTeam = useCallback((id: string) => teams.find((t) => t.id === id), [teams]);

  const getMemberAssignments = useCallback(
    (memberId: string) => assignments.filter((a) => a.memberId === memberId),
    [assignments]
  );

  const handleCellClick = (memberId: string, day: Date) => {
    setDialogDefaults({ memberId, date: dateToString(day) });
    setDialogOpen(true);
  };

  const totalWidth = days.length * DAY_WIDTH;

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-foreground">Schedule</h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            Drag to move or resize assignments. Right-click to remove.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setWeeksOffset((w) => w - 2)}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={() => setWeeksOffset(0)}>
            Today
          </Button>
          <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setWeeksOffset((w) => w + 2)}>
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button size="sm" onClick={() => { setDialogDefaults({}); setDialogOpen(true); }}>
            <Plus className="h-4 w-4 mr-1" /> Assign
          </Button>
        </div>
      </div>

      {/* Gantt Chart */}
      <div className="border rounded-lg bg-card overflow-hidden">
        <div className="flex">
          {/* Left sidebar with member names */}
          <div className="shrink-0 w-48 border-r bg-card z-10">
            {/* Header spacer */}
            <div className="h-[58px] border-b bg-muted/30 flex items-end px-3 pb-1.5">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Member</span>
            </div>
            {/* Member rows */}
            {grouped.map(({ team, members: teamMembers }) => (
              <div key={team.id}>
                {/* Team header */}
                <div className="flex items-center gap-2 px-3 py-2 bg-muted/40 border-b">
                  <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: team.color }} />
                  <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{team.name}</span>
                  <Badge variant="secondary" className="text-[10px] h-4 px-1.5">{teamMembers.length}</Badge>
                </div>
                {teamMembers.map((member) => {
                  const memberAssignments = getMemberAssignments(member.id);
                  return (
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
                  );
                })}
              </div>
            ))}
          </div>

          {/* Right scrollable timeline */}
          <div ref={scrollRef} className="overflow-x-auto flex-1">
            <div style={{ width: totalWidth, minWidth: totalWidth }}>
              <TimelineHeader days={days} dayWidth={DAY_WIDTH} />

              {grouped.map(({ team, members: teamMembers }) => (
                <div key={team.id}>
                  {/* Team header row in timeline */}
                  <div className="bg-muted/40 border-b" style={{ height: 28 }} />
                  {/* Member swimlanes */}
                  {teamMembers.map((member) => {
                    const memberAssignments = getMemberAssignments(member.id);
                    return (
                      <div
                        key={member.id}
                        className="relative border-b"
                        style={{ height: ROW_HEIGHT }}
                      >
                        {/* Day cells background */}
                        <div className="absolute inset-0 flex">
                          {days.map((day, i) => (
                            <div
                              key={i}
                              className={`border-r last:border-r-0 cursor-pointer hover:bg-primary/5 transition-colors
                                ${isWeekend(day) ? "bg-muted/30" : ""}
                                ${isToday(day) ? "bg-primary/10" : ""}
                              `}
                              style={{ width: DAY_WIDTH, minWidth: DAY_WIDTH }}
                              onClick={() => handleCellClick(member.id, day)}
                            />
                          ))}
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
                              timelineStart={timelineStart}
                              dayWidth={DAY_WIDTH}
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

      {/* Today indicator legend */}
      <div className="flex items-center gap-4 text-xs text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-sm bg-primary/10 border border-primary/30" /> Today
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-sm bg-muted/30 border" /> Weekend
        </span>
        <span className="flex items-center gap-1.5">
          <CalendarDays className="h-3 w-3" /> Click a cell to assign
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
