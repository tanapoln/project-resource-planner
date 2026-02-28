import { useState, useEffect, useMemo } from "react";
import { Team, Member, Project, Assignment } from "@/lib/types";
import { findConflicts } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
} from "@/components/ui/select";
import { AlertTriangle } from "lucide-react";
import { dateToString } from "@/lib/dateUtils";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  members: Member[];
  projects: Project[];
  teams: Team[];
  defaults: { memberId?: string; date?: string };
  onSave: (a: Omit<Assignment, "id">) => { success: boolean; conflicts: Assignment[] };
}

export default function AssignmentDialog({ open, onOpenChange, members, projects, teams, defaults, onSave }: Props) {
  const [memberId, setMemberId] = useState("");
  const [projectId, setProjectId] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (open) {
      setMemberId(defaults.memberId ?? "");
      setProjectId(projects[0]?.id ?? "");
      const today = dateToString(new Date());
      setStartDate(defaults.date ?? today);
      const end = new Date(defaults.date ?? today);
      end.setDate(end.getDate() + 6);
      setEndDate(dateToString(end));
      setError("");
    }
  }, [open, defaults, projects]);

  // Compute which members have conflicts for the current date range
  const { availableMembers, conflictedMembers, conflictMap } = useMemo(() => {
    if (!startDate || !endDate || startDate > endDate) {
      return { availableMembers: members, conflictedMembers: [] as Member[], conflictMap: new Map<string, string>() };
    }
    const available: Member[] = [];
    const conflicted: Member[] = [];
    const cMap = new Map<string, string>();

    for (const m of members) {
      const conflicts = findConflicts(m.id, startDate, endDate);
      if (conflicts.length > 0) {
        conflicted.push(m);
        const projectNames = conflicts.map((c) => {
          const p = projects.find((pr) => pr.id === c.projectId);
          return p?.name ?? "Unknown";
        });
        cMap.set(m.id, projectNames.join(", "));
      } else {
        available.push(m);
      }
    }
    return { availableMembers: available, conflictedMembers: conflicted, conflictMap: cMap };
  }, [members, projects, startDate, endDate]);

  // If selected member becomes conflicted after date change, clear selection
  useEffect(() => {
    if (memberId && conflictMap.has(memberId)) {
      setMemberId("");
    }
  }, [conflictMap, memberId]);

  const handleSave = () => {
    if (!memberId || !projectId || !startDate || !endDate) {
      setError("Please fill in all fields.");
      return;
    }
    if (startDate > endDate) {
      setError("End date must be after start date.");
      return;
    }

    const result = onSave({ memberId, projectId, startDate, endDate });
    if (!result.success) {
      const conflictProjects = result.conflicts.map((c) => {
        const p = projects.find((pr) => pr.id === c.projectId);
        return p?.name ?? "Unknown";
      });
      setError(`Schedule conflict! This member is already assigned to: ${conflictProjects.join(", ")} during this period.`);
      return;
    }
    onOpenChange(false);
  };

  const getTeamForMember = (mId: string) => {
    const member = members.find((m) => m.id === mId);
    if (!member) return null;
    return teams.find((t) => t.id === member.teamId);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Assign to Project</DialogTitle>
          <DialogDescription>
            Schedule a team member to work on a project. Each person can only work on one project at a time.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          {/* Date fields first so conflict info is computed before member selection */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium mb-1.5 block">Start Date</label>
              <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
            </div>
            <div>
              <label className="text-sm font-medium mb-1.5 block">End Date</label>
              <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
            </div>
          </div>
          <div>
            <label className="text-sm font-medium mb-1.5 block">Member</label>
            <Select value={memberId} onValueChange={setMemberId}>
              <SelectTrigger>
                <SelectValue placeholder="Select a member" />
              </SelectTrigger>
              <SelectContent>
                {availableMembers.map((m) => {
                  const team = getTeamForMember(m.id);
                  return (
                    <SelectItem key={m.id} value={m.id}>
                      {m.name} {team ? `(${team.name})` : ""}
                    </SelectItem>
                  );
                })}
                {conflictedMembers.length > 0 && availableMembers.length > 0 && (
                  <div className="mx-1 my-1 h-px bg-border" />
                )}
                {conflictedMembers.map((m) => {
                  const team = getTeamForMember(m.id);
                  const conflictInfo = conflictMap.get(m.id) ?? "";
                  return (
                    <SelectItem key={m.id} value={m.id} disabled>
                      <span className="flex flex-col">
                        <span className="text-muted-foreground">
                          {m.name} {team ? `(${team.name})` : ""}
                        </span>
                        <span className="text-[10px] text-destructive/70">
                          Busy: {conflictInfo}
                        </span>
                      </span>
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-sm font-medium mb-1.5 block">Project</label>
            <Select value={projectId} onValueChange={setProjectId}>
              <SelectTrigger>
                <SelectValue placeholder="Select a project" />
              </SelectTrigger>
              <SelectContent>
                {projects.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    <span className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full inline-block" style={{ backgroundColor: p.color }} />
                      {p.name}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {error && (
            <div className="flex items-start gap-2 p-3 rounded-md bg-destructive/10 text-destructive text-sm">
              <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSave}>Assign</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
