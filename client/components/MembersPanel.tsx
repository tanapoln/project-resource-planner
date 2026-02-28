import { useState, useRef, useCallback } from "react";
import { Team, Member } from "@/lib/types";
import { parseMemberCsv } from "@/lib/csvImport";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import {
  Plus,
  Pencil,
  Trash2,
  Users,
  UserPlus,
  Upload,
  GripVertical,
  Download,
} from "lucide-react";

interface Props {
  teams: Team[];
  members: Member[];
  addTeam: (t: Omit<Team, "id">) => Team;
  updateTeam: (id: string, data: Partial<Team>) => void;
  deleteTeam: (id: string) => void;
  addMember: (m: Omit<Member, "id">) => Member;
  updateMember: (id: string, data: Partial<Member>) => void;
  deleteMember: (id: string) => void;
  reorderTeams: (teams: Team[]) => void;
}

const TEAM_COLORS = [
  "#6366f1",
  "#06b6d4",
  "#f43f5e",
  "#f59e0b",
  "#10b981",
  "#8b5cf6",
  "#ec4899",
  "#14b8a6",
];

export default function MembersPanel({
  teams,
  members,
  addTeam,
  updateTeam,
  deleteTeam,
  addMember,
  updateMember,
  deleteMember,
  reorderTeams,
}: Props) {
  const [teamDialog, setTeamDialog] = useState(false);
  const [memberDialog, setMemberDialog] = useState(false);
  const [editingTeam, setEditingTeam] = useState<Team | null>(null);
  const [editingMember, setEditingMember] = useState<Member | null>(null);
  const [csvDialog, setCsvDialog] = useState(false);
  const [csvPreview, setCsvPreview] = useState<
    { name: string; role: string; team: string }[]
  >([]);
  const [csvFileName, setCsvFileName] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Member drag state
  const [dragMemberId, setDragMemberId] = useState<string | null>(null);
  const [dropTargetTeamId, setDropTargetTeamId] = useState<string | null>(null);

  // Team drag state
  const [dragTeamId, setDragTeamId] = useState<string | null>(null);
  const [dropTargetTeamIdx, setDropTargetTeamIdx] = useState<number | null>(
    null,
  );

  // Team form state
  const [teamName, setTeamName] = useState("");
  const [teamColor, setTeamColor] = useState(TEAM_COLORS[0]);

  // Member form state
  const [memberName, setMemberName] = useState("");
  const [memberRole, setMemberRole] = useState("");
  const [memberTeamId, setMemberTeamId] = useState("");

  const openTeamDialog = (team?: Team) => {
    if (team) {
      setEditingTeam(team);
      setTeamName(team.name);
      setTeamColor(team.color);
    } else {
      setEditingTeam(null);
      setTeamName("");
      setTeamColor(TEAM_COLORS[teams.length % TEAM_COLORS.length]);
    }
    setTeamDialog(true);
  };

  const openMemberDialog = (member?: Member) => {
    if (member) {
      setEditingMember(member);
      setMemberName(member.name);
      setMemberRole(member.role);
      setMemberTeamId(member.teamId);
    } else {
      setEditingMember(null);
      setMemberName("");
      setMemberRole("");
      setMemberTeamId(teams[0]?.id ?? "");
    }
    setMemberDialog(true);
  };

  const handleSaveTeam = () => {
    if (!teamName.trim()) return;
    if (editingTeam) {
      updateTeam(editingTeam.id, { name: teamName, color: teamColor });
    } else {
      addTeam({ name: teamName, color: teamColor });
    }
    setTeamDialog(false);
  };

  const handleSaveMember = () => {
    if (!memberName.trim() || !memberTeamId) return;
    if (editingMember) {
      updateMember(editingMember.id, {
        name: memberName,
        role: memberRole,
        teamId: memberTeamId,
      });
    } else {
      addMember({ name: memberName, role: memberRole, teamId: memberTeamId });
    }
    setMemberDialog(false);
  };

  // --- CSV Import ---
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setCsvFileName(file.name);
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      const rows = parseMemberCsv(text);
      setCsvPreview(rows);
      setCsvDialog(true);
    };
    reader.readAsText(file);
    // Reset so same file can be picked again
    e.target.value = "";
  };

  const handleCsvImport = () => {
    const teamMap = new Map<string, string>();
    for (const t of teams) teamMap.set(t.name.toLowerCase(), t.id);
    let teamColorIdx = teams.length;

    for (const row of csvPreview) {
      let teamId = "";
      if (row.team) {
        const key = row.team.toLowerCase();
        if (teamMap.has(key)) {
          teamId = teamMap.get(key)!;
        } else {
          const newTeam = addTeam({
            name: row.team,
            color: TEAM_COLORS[teamColorIdx % TEAM_COLORS.length],
          });
          teamId = newTeam.id;
          teamMap.set(key, teamId);
          teamColorIdx++;
        }
      } else {
        teamId = teams[0]?.id ?? "";
      }
      if (teamId) {
        addMember({ name: row.name, role: row.role, teamId });
      }
    }
    setCsvDialog(false);
    setCsvPreview([]);
  };

  // --- Member Drag and Drop (move between teams) ---
  const handleMemberDragStart = useCallback(
    (e: React.DragEvent, memberId: string) => {
      setDragMemberId(memberId);
      e.dataTransfer.effectAllowed = "move";
      e.dataTransfer.setData("application/member-id", memberId);
    },
    [],
  );

  const handleMemberDragOver = useCallback(
    (e: React.DragEvent, teamId: string) => {
      if (dragTeamId) return; // don't handle if dragging a team
      e.preventDefault();
      e.dataTransfer.dropEffect = "move";
      setDropTargetTeamId(teamId);
    },
    [dragTeamId],
  );

  const handleMemberDragLeave = useCallback(() => {
    setDropTargetTeamId(null);
  }, []);

  const handleMemberDrop = useCallback(
    (e: React.DragEvent, teamId: string) => {
      if (dragTeamId) return; // don't handle if dragging a team
      e.preventDefault();
      const memberId = e.dataTransfer.getData("application/member-id");
      if (memberId) {
        updateMember(memberId, { teamId });
      }
      setDragMemberId(null);
      setDropTargetTeamId(null);
    },
    [updateMember, dragTeamId],
  );

  const handleMemberDragEnd = useCallback(() => {
    setDragMemberId(null);
    setDropTargetTeamId(null);
  }, []);

  // --- Team Drag and Drop (reorder teams) ---
  const handleTeamDragStart = useCallback(
    (e: React.DragEvent, teamId: string) => {
      setDragTeamId(teamId);
      e.dataTransfer.effectAllowed = "move";
      e.dataTransfer.setData("application/team-id", teamId);
    },
    [],
  );

  const handleTeamDragOver = useCallback(
    (e: React.DragEvent, idx: number) => {
      if (!dragTeamId) return;
      e.preventDefault();
      e.dataTransfer.dropEffect = "move";
      setDropTargetTeamIdx(idx);
    },
    [dragTeamId],
  );

  const handleTeamDragLeave = useCallback(() => {
    setDropTargetTeamIdx(null);
  }, []);

  const handleTeamDrop = useCallback(
    (e: React.DragEvent, targetIdx: number) => {
      e.preventDefault();
      const teamId = e.dataTransfer.getData("application/team-id");
      if (!teamId) return;
      const fromIdx = teams.findIndex((t) => t.id === teamId);
      if (fromIdx === -1 || fromIdx === targetIdx) return;
      const reordered = [...teams];
      const [moved] = reordered.splice(fromIdx, 1);
      reordered.splice(targetIdx, 0, moved);
      reorderTeams(reordered);
      setDragTeamId(null);
      setDropTargetTeamIdx(null);
    },
    [teams, reorderTeams],
  );

  const handleTeamDragEnd = useCallback(() => {
    setDragTeamId(null);
    setDropTargetTeamIdx(null);
  }, []);

  const handleExportCsv = useCallback(() => {
    const header = "Name,Role,Team";
    const rows = members.map((m) => {
      const team = teams.find((t) => t.id === m.teamId);
      const escapeCsv = (v: string) =>
        v.includes(",") || v.includes('"') ? `"${v.replace(/"/g, '""')}"` : v;
      return `${escapeCsv(m.name)},${escapeCsv(m.role)},${escapeCsv(team?.name ?? "")}`;
    });
    const csv = [header, ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "members-export.csv";
    a.click();
    URL.revokeObjectURL(url);
  }, [members, teams]);

  const membersByTeam = teams.map((t) => ({
    team: t,
    members: members.filter((m) => m.teamId === t.id),
  }));
  const unassigned = members.filter(
    (m) => !teams.some((t) => t.id === m.teamId),
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h2 className="text-xl font-semibold text-foreground">
            Teams & Members
          </h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            {teams.length} teams, {members.length} members
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,text/csv"
            className="hidden"
            onChange={handleFileSelect}
          />
          <Button variant="outline" size="sm" onClick={handleExportCsv}>
            <Download className="h-4 w-4 mr-1" /> Export CSV
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => fileInputRef.current?.click()}
          >
            <Upload className="h-4 w-4 mr-1" /> Import CSV
          </Button>
          <Button variant="outline" size="sm" onClick={() => openTeamDialog()}>
            <Users className="h-4 w-4 mr-1" /> Add Team
          </Button>
          <Button size="sm" onClick={() => openMemberDialog()}>
            <UserPlus className="h-4 w-4 mr-1" /> Add Member
          </Button>
        </div>
      </div>

      {/* Team groups */}
      <div className="space-y-4">
        {membersByTeam.map(({ team, members: teamMembers }, teamIdx) => {
          const isDropTarget = dropTargetTeamId === team.id;
          const isTeamDropTarget =
            dropTargetTeamIdx === teamIdx && dragTeamId !== null;
          const isTeamDragging = dragTeamId === team.id;
          return (
            <div
              key={team.id}
              className={`bg-card rounded-lg border overflow-hidden transition-all ${
                isDropTarget
                  ? "ring-2 ring-primary border-primary shadow-md"
                  : ""
              } ${isTeamDropTarget ? "border-t-4 border-t-primary" : ""} ${
                isTeamDragging ? "opacity-40" : ""
              }`}
              onDragOver={(e) => {
                handleMemberDragOver(e, team.id);
                handleTeamDragOver(e, teamIdx);
              }}
              onDragLeave={() => {
                handleMemberDragLeave();
                handleTeamDragLeave();
              }}
              onDrop={(e) => {
                handleMemberDrop(e, team.id);
                handleTeamDrop(e, teamIdx);
              }}
            >
              <div
                className="flex items-center justify-between px-4 py-3 border-b bg-muted/30 cursor-grab active:cursor-grabbing"
                draggable
                onDragStart={(e) => handleTeamDragStart(e, team.id)}
                onDragEnd={handleTeamDragEnd}
              >
                <div className="flex items-center gap-2">
                  <GripVertical className="h-4 w-4 text-muted-foreground/40 shrink-0" />
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: team.color }}
                  />
                  <span className="font-medium text-sm">{team.name}</span>
                  <Badge variant="secondary" className="text-xs">
                    {teamMembers.length}
                  </Badge>
                </div>
                <div className="flex gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={() => openTeamDialog(team)}
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-destructive"
                    onClick={() => deleteTeam(team.id)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
              {teamMembers.length === 0 ? (
                <div
                  className={`px-4 py-6 text-center text-sm transition-colors ${
                    isDropTarget
                      ? "text-primary bg-primary/5"
                      : "text-muted-foreground"
                  }`}
                >
                  {isDropTarget
                    ? "Drop here to move to this team"
                    : "No members in this team yet. Drag members here."}
                </div>
              ) : (
                <div className="divide-y">
                  {teamMembers.map((member) => (
                    <MemberRow
                      key={member.id}
                      member={member}
                      team={team}
                      isDragging={dragMemberId === member.id}
                      onEdit={() => openMemberDialog(member)}
                      onDelete={() => deleteMember(member.id)}
                      onDragStart={(e) => handleMemberDragStart(e, member.id)}
                      onDragEnd={handleMemberDragEnd}
                    />
                  ))}
                </div>
              )}
            </div>
          );
        })}

        {unassigned.length > 0 && (
          <div className="bg-card rounded-lg border overflow-hidden">
            <div className="px-4 py-3 border-b bg-muted/30">
              <span className="font-medium text-sm text-muted-foreground">
                Unassigned
              </span>
            </div>
            <div className="divide-y">
              {unassigned.map((member) => (
                <MemberRow
                  key={member.id}
                  member={member}
                  isDragging={dragMemberId === member.id}
                  onEdit={() => openMemberDialog(member)}
                  onDelete={() => deleteMember(member.id)}
                  onDragStart={(e) => handleMemberDragStart(e, member.id)}
                  onDragEnd={handleMemberDragEnd}
                />
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Team Dialog */}
      <Dialog open={teamDialog} onOpenChange={setTeamDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingTeam ? "Edit Team" : "Add Team"}</DialogTitle>
            <DialogDescription>
              {editingTeam ? "Update the team details." : "Create a new team."}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-1.5 block">
                Team Name
              </label>
              <Input
                value={teamName}
                onChange={(e) => setTeamName(e.target.value)}
                placeholder="e.g. Frontend"
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-1.5 block">Color</label>
              <div className="flex gap-2 flex-wrap">
                {TEAM_COLORS.map((c) => (
                  <button
                    key={c}
                    className={`w-8 h-8 rounded-full border-2 transition-all ${teamColor === c ? "border-foreground scale-110" : "border-transparent"}`}
                    style={{ backgroundColor: c }}
                    onClick={() => setTeamColor(c)}
                  />
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setTeamDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveTeam}>
              {editingTeam ? "Update" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Member Dialog */}
      <Dialog open={memberDialog} onOpenChange={setMemberDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingMember ? "Edit Member" : "Add Member"}
            </DialogTitle>
            <DialogDescription>
              {editingMember
                ? "Update member details."
                : "Add a new team member."}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-1.5 block">Name</label>
              <Input
                value={memberName}
                onChange={(e) => setMemberName(e.target.value)}
                placeholder="e.g. John Doe"
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-1.5 block">Role</label>
              <Input
                value={memberRole}
                onChange={(e) => setMemberRole(e.target.value)}
                placeholder="e.g. Senior Engineer"
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-1.5 block">Team</label>
              <Select value={memberTeamId} onValueChange={setMemberTeamId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a team" />
                </SelectTrigger>
                <SelectContent>
                  {teams.map((t) => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setMemberDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveMember}>
              {editingMember ? "Update" : "Add"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* CSV Import Preview Dialog */}
      <Dialog open={csvDialog} onOpenChange={setCsvDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Import Members from CSV</DialogTitle>
            <DialogDescription>
              Preview of {csvPreview.length} member
              {csvPreview.length !== 1 ? "s" : ""} from "{csvFileName}". Members
              will be added to existing or new teams.
            </DialogDescription>
          </DialogHeader>
          <div className="max-h-64 overflow-y-auto border rounded-md">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 sticky top-0">
                <tr>
                  <th className="text-left px-3 py-2 font-medium text-muted-foreground">
                    Name
                  </th>
                  <th className="text-left px-3 py-2 font-medium text-muted-foreground">
                    Role
                  </th>
                  <th className="text-left px-3 py-2 font-medium text-muted-foreground">
                    Team
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {csvPreview.map((row, i) => (
                  <tr key={i} className="hover:bg-muted/20">
                    <td className="px-3 py-2">{row.name}</td>
                    <td className="px-3 py-2 text-muted-foreground">
                      {row.role || "—"}
                    </td>
                    <td className="px-3 py-2">
                      {row.team ? (
                        <Badge
                          variant={
                            teams.some(
                              (t) =>
                                t.name.toLowerCase() === row.team.toLowerCase(),
                            )
                              ? "secondary"
                              : "outline"
                          }
                          className="text-xs"
                        >
                          {row.team}
                          {!teams.some(
                            (t) =>
                              t.name.toLowerCase() === row.team.toLowerCase(),
                          ) && (
                            <span className="ml-1 text-[10px] text-muted-foreground">
                              (new)
                            </span>
                          )}
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground text-xs">
                          Default
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {csvPreview.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-4">
              No valid rows found. Make sure the CSV has columns: Name, Role,
              Team.
            </p>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setCsvDialog(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleCsvImport}
              disabled={csvPreview.length === 0}
            >
              Import {csvPreview.length} Member
              {csvPreview.length !== 1 ? "s" : ""}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function MemberRow({
  member,
  team,
  isDragging,
  onEdit,
  onDelete,
  onDragStart,
  onDragEnd,
}: {
  member: Member;
  team?: Team;
  isDragging: boolean;
  onEdit: () => void;
  onDelete: () => void;
  onDragStart: (e: React.DragEvent) => void;
  onDragEnd: () => void;
}) {
  const initials = member.name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <div
      className={`flex items-center justify-between px-4 py-3 hover:bg-muted/20 transition-all ${
        isDragging ? "opacity-40 bg-muted/30" : ""
      }`}
      draggable
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
    >
      <div className="flex items-center gap-3">
        <GripVertical className="h-4 w-4 text-muted-foreground/40 cursor-grab active:cursor-grabbing shrink-0" />
        <div
          className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold text-white"
          style={{ backgroundColor: team?.color ?? "#94a3b8" }}
        >
          {initials}
        </div>
        <div>
          <p className="text-sm font-medium">{member.name}</p>
          <p className="text-xs text-muted-foreground">{member.role}</p>
        </div>
      </div>
      <div className="flex gap-1">
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          onClick={onEdit}
        >
          <Pencil className="h-3.5 w-3.5" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 text-destructive"
          onClick={onDelete}
        >
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
}
