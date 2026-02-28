import { useState, useRef, useCallback } from "react";
import { Team, Member, Project, Assignment } from "@/lib/types";
import { parseScheduleCsv, CsvScheduleRow, escapeCsv } from "@/lib/csvImport";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { Upload, Download } from "lucide-react";

interface Props {
  teams: Team[];
  members: Member[];
  projects: Project[];
  assignments: Assignment[];
  addTeam: (t: Omit<Team, "id">) => Team;
  addMember: (m: Omit<Member, "id">) => Member;
  addProject: (p: Omit<Project, "id">) => Project;
  addAssignment: (a: Omit<Assignment, "id">) => { success: boolean; conflicts: Assignment[] };
}

const TEAM_COLORS = ["#6366f1", "#06b6d4", "#f43f5e", "#f59e0b", "#10b981", "#8b5cf6", "#ec4899", "#14b8a6"];
const PROJECT_COLORS = ["#8b5cf6", "#f59e0b", "#10b981", "#ef4444", "#3b82f6", "#ec4899", "#14b8a6", "#f97316"];

export default function ScheduleCsvDialog({
  teams, members, projects, assignments,
  addTeam, addMember, addProject, addAssignment,
}: Props) {
  const [csvDialog, setCsvDialog] = useState(false);
  const [csvPreview, setCsvPreview] = useState<CsvScheduleRow[]>([]);
  const [csvFileName, setCsvFileName] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Track what will be auto-created
  const getAutoCreateInfo = (rows: CsvScheduleRow[]) => {
    const existingTeams = new Set(teams.map((t) => t.name.toLowerCase()));
    const existingMembers = new Set(members.map((m) => m.name.toLowerCase()));
    const existingProjects = new Set(projects.map((p) => p.name.toLowerCase()));

    const newTeams = new Set<string>();
    const newMembers = new Set<string>();
    const newProjects = new Set<string>();

    for (const row of rows) {
      if (row.team && !existingTeams.has(row.team.toLowerCase())) {
        newTeams.add(row.team);
        existingTeams.add(row.team.toLowerCase());
      }
      if (!existingMembers.has(row.member.toLowerCase())) {
        newMembers.add(row.member);
        existingMembers.add(row.member.toLowerCase());
      }
      if (!existingProjects.has(row.project.toLowerCase())) {
        newProjects.add(row.project);
        existingProjects.add(row.project.toLowerCase());
      }
    }

    return { newTeams, newMembers, newProjects };
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setCsvFileName(file.name);
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      const rows = parseScheduleCsv(text);
      setCsvPreview(rows);
      setCsvDialog(true);
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  const handleCsvImport = () => {
    // Track created entities by name for lookups
    const teamMap = new Map<string, string>(); // lowercase name -> id
    for (const t of teams) teamMap.set(t.name.toLowerCase(), t.id);

    const memberMap = new Map<string, string>();
    for (const m of members) memberMap.set(m.name.toLowerCase(), m.id);

    const projectMap = new Map<string, string>();
    for (const p of projects) projectMap.set(p.name.toLowerCase(), p.id);

    let teamColorIdx = teams.length;
    let projectColorIdx = projects.length;

    for (const row of csvPreview) {
      // Ensure team exists
      let teamId = "";
      if (row.team) {
        const key = row.team.toLowerCase();
        if (teamMap.has(key)) {
          teamId = teamMap.get(key)!;
        } else {
          const newTeam = addTeam({ name: row.team, color: TEAM_COLORS[teamColorIdx % TEAM_COLORS.length] });
          teamId = newTeam.id;
          teamMap.set(key, teamId);
          teamColorIdx++;
        }
      }

      // Ensure member exists
      const memberKey = row.member.toLowerCase();
      let memberId: string;
      if (memberMap.has(memberKey)) {
        memberId = memberMap.get(memberKey)!;
      } else {
        if (!teamId && teams.length > 0) {
          teamId = teamMap.values().next().value ?? "";
        }
        const newMember = addMember({ name: row.member, role: row.role || "Engineer", teamId });
        memberId = newMember.id;
        memberMap.set(memberKey, memberId);
      }

      // Ensure project exists
      const projectKey = row.project.toLowerCase();
      let projectId: string;
      if (projectMap.has(projectKey)) {
        projectId = projectMap.get(projectKey)!;
      } else {
        const newProject = addProject({
          name: row.project,
          description: "",
          color: PROJECT_COLORS[projectColorIdx % PROJECT_COLORS.length],
        });
        projectId = newProject.id;
        projectMap.set(projectKey, projectId);
        projectColorIdx++;
      }

      // Create assignment (skip if conflict)
      addAssignment({
        memberId,
        projectId,
        startDate: row.startDate,
        endDate: row.endDate,
      });
    }

    setCsvDialog(false);
    setCsvPreview([]);
  };

  const handleExportCsv = useCallback(() => {
    const header = "Member,Team,Role,Project,Start Date,End Date";
    const rows = assignments.map((a) => {
      const member = members.find((m) => m.id === a.memberId);
      const team = teams.find((t) => t.id === member?.teamId);
      const project = projects.find((p) => p.id === a.projectId);
      return [
        escapeCsv(member?.name ?? "Unknown"),
        escapeCsv(team?.name ?? ""),
        escapeCsv(member?.role ?? ""),
        escapeCsv(project?.name ?? "Unknown"),
        a.startDate,
        a.endDate,
      ].join(",");
    });
    const csv = [header, ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "schedule-export.csv";
    a.click();
    URL.revokeObjectURL(url);
  }, [assignments, members, teams, projects]);

  const autoInfo = csvPreview.length > 0 ? getAutoCreateInfo(csvPreview) : null;

  return (
    <>
      <input
        ref={fileInputRef}
        type="file"
        accept=".csv,text/csv"
        className="hidden"
        onChange={handleFileSelect}
      />
      <Button variant="outline" size="sm" className="h-8" onClick={handleExportCsv}>
        <Download className="h-3.5 w-3.5 mr-1" /> Export
      </Button>
      <Button variant="outline" size="sm" className="h-8" onClick={() => fileInputRef.current?.click()}>
        <Upload className="h-3.5 w-3.5 mr-1" /> Import
      </Button>

      <Dialog open={csvDialog} onOpenChange={setCsvDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Import Schedule from CSV</DialogTitle>
            <DialogDescription>
              Preview of {csvPreview.length} assignment{csvPreview.length !== 1 ? "s" : ""} from "{csvFileName}".
              Missing members, teams, and projects will be created automatically.
            </DialogDescription>
          </DialogHeader>

          {/* Auto-create summary */}
          {autoInfo && (autoInfo.newTeams.size > 0 || autoInfo.newMembers.size > 0 || autoInfo.newProjects.size > 0) && (
            <div className="bg-muted/40 rounded-md p-3 space-y-1.5 text-xs">
              <p className="font-medium text-sm text-foreground">Will be auto-created:</p>
              {autoInfo.newTeams.size > 0 && (
                <p className="text-muted-foreground">
                  Teams: {Array.from(autoInfo.newTeams).map((t) => (
                    <Badge key={t} variant="outline" className="text-[10px] mr-1 mb-0.5">{t}</Badge>
                  ))}
                </p>
              )}
              {autoInfo.newMembers.size > 0 && (
                <p className="text-muted-foreground">
                  Members: {Array.from(autoInfo.newMembers).map((m) => (
                    <Badge key={m} variant="outline" className="text-[10px] mr-1 mb-0.5">{m}</Badge>
                  ))}
                </p>
              )}
              {autoInfo.newProjects.size > 0 && (
                <p className="text-muted-foreground">
                  Projects: {Array.from(autoInfo.newProjects).map((p) => (
                    <Badge key={p} variant="outline" className="text-[10px] mr-1 mb-0.5">{p}</Badge>
                  ))}
                </p>
              )}
            </div>
          )}

          <div className="max-h-64 overflow-y-auto border rounded-md">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 sticky top-0">
                <tr>
                  <th className="text-left px-3 py-2 font-medium text-muted-foreground">Member</th>
                  <th className="text-left px-3 py-2 font-medium text-muted-foreground">Team</th>
                  <th className="text-left px-3 py-2 font-medium text-muted-foreground">Project</th>
                  <th className="text-left px-3 py-2 font-medium text-muted-foreground">Start</th>
                  <th className="text-left px-3 py-2 font-medium text-muted-foreground">End</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {csvPreview.map((row, i) => {
                  const isNewMember = !members.some((m) => m.name.toLowerCase() === row.member.toLowerCase());
                  const isNewProject = !projects.some((p) => p.name.toLowerCase() === row.project.toLowerCase());
                  return (
                    <tr key={i} className="hover:bg-muted/20">
                      <td className="px-3 py-2">
                        {row.member}
                        {isNewMember && <span className="ml-1 text-[10px] text-primary">(new)</span>}
                      </td>
                      <td className="px-3 py-2 text-muted-foreground">{row.team || "—"}</td>
                      <td className="px-3 py-2">
                        {row.project}
                        {isNewProject && <span className="ml-1 text-[10px] text-primary">(new)</span>}
                      </td>
                      <td className="px-3 py-2 text-muted-foreground font-mono text-xs">{row.startDate}</td>
                      <td className="px-3 py-2 text-muted-foreground font-mono text-xs">{row.endDate}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {csvPreview.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-4">
              No valid rows found. Expected columns: Member, Team, Role, Project, Start Date, End Date.
            </p>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setCsvDialog(false)}>Cancel</Button>
            <Button onClick={handleCsvImport} disabled={csvPreview.length === 0}>
              Import {csvPreview.length} Assignment{csvPreview.length !== 1 ? "s" : ""}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
