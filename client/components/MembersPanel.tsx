import { useState } from "react";
import { Team, Member } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
} from "@/components/ui/select";
import { Plus, Pencil, Trash2, Users, UserPlus } from "lucide-react";

interface Props {
  teams: Team[];
  members: Member[];
  addTeam: (t: Omit<Team, "id">) => Team;
  updateTeam: (id: string, data: Partial<Team>) => void;
  deleteTeam: (id: string) => void;
  addMember: (m: Omit<Member, "id">) => Member;
  updateMember: (id: string, data: Partial<Member>) => void;
  deleteMember: (id: string) => void;
}

const TEAM_COLORS = ["#6366f1", "#06b6d4", "#f43f5e", "#f59e0b", "#10b981", "#8b5cf6", "#ec4899", "#14b8a6"];

export default function MembersPanel({
  teams, members, addTeam, updateTeam, deleteTeam,
  addMember, updateMember, deleteMember,
}: Props) {
  const [teamDialog, setTeamDialog] = useState(false);
  const [memberDialog, setMemberDialog] = useState(false);
  const [editingTeam, setEditingTeam] = useState<Team | null>(null);
  const [editingMember, setEditingMember] = useState<Member | null>(null);

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
      updateMember(editingMember.id, { name: memberName, role: memberRole, teamId: memberTeamId });
    } else {
      addMember({ name: memberName, role: memberRole, teamId: memberTeamId });
    }
    setMemberDialog(false);
  };

  const getTeam = (id: string) => teams.find((t) => t.id === id);
  const membersByTeam = teams.map((t) => ({
    team: t,
    members: members.filter((m) => m.teamId === t.id),
  }));
  const unassigned = members.filter((m) => !teams.some((t) => t.id === m.teamId));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-foreground">Teams & Members</h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            {teams.length} teams, {members.length} members
          </p>
        </div>
        <div className="flex gap-2">
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
        {membersByTeam.map(({ team, members: teamMembers }) => (
          <div key={team.id} className="bg-card rounded-lg border overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b bg-muted/30">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: team.color }} />
                <span className="font-medium text-sm">{team.name}</span>
                <Badge variant="secondary" className="text-xs">{teamMembers.length}</Badge>
              </div>
              <div className="flex gap-1">
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openTeamDialog(team)}>
                  <Pencil className="h-3.5 w-3.5" />
                </Button>
                <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => deleteTeam(team.id)}>
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
            {teamMembers.length === 0 ? (
              <div className="px-4 py-6 text-center text-sm text-muted-foreground">
                No members in this team yet.
              </div>
            ) : (
              <div className="divide-y">
                {teamMembers.map((member) => (
                  <MemberRow
                    key={member.id}
                    member={member}
                    team={team}
                    onEdit={() => openMemberDialog(member)}
                    onDelete={() => deleteMember(member.id)}
                  />
                ))}
              </div>
            )}
          </div>
        ))}

        {unassigned.length > 0 && (
          <div className="bg-card rounded-lg border overflow-hidden">
            <div className="px-4 py-3 border-b bg-muted/30">
              <span className="font-medium text-sm text-muted-foreground">Unassigned</span>
            </div>
            <div className="divide-y">
              {unassigned.map((member) => (
                <MemberRow
                  key={member.id}
                  member={member}
                  onEdit={() => openMemberDialog(member)}
                  onDelete={() => deleteMember(member.id)}
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
              <label className="text-sm font-medium mb-1.5 block">Team Name</label>
              <Input value={teamName} onChange={(e) => setTeamName(e.target.value)} placeholder="e.g. Frontend" />
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
            <Button variant="outline" onClick={() => setTeamDialog(false)}>Cancel</Button>
            <Button onClick={handleSaveTeam}>{editingTeam ? "Update" : "Create"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Member Dialog */}
      <Dialog open={memberDialog} onOpenChange={setMemberDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingMember ? "Edit Member" : "Add Member"}</DialogTitle>
            <DialogDescription>
              {editingMember ? "Update member details." : "Add a new team member."}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-1.5 block">Name</label>
              <Input value={memberName} onChange={(e) => setMemberName(e.target.value)} placeholder="e.g. John Doe" />
            </div>
            <div>
              <label className="text-sm font-medium mb-1.5 block">Role</label>
              <Input value={memberRole} onChange={(e) => setMemberRole(e.target.value)} placeholder="e.g. Senior Engineer" />
            </div>
            <div>
              <label className="text-sm font-medium mb-1.5 block">Team</label>
              <Select value={memberTeamId} onValueChange={setMemberTeamId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a team" />
                </SelectTrigger>
                <SelectContent>
                  {teams.map((t) => (
                    <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setMemberDialog(false)}>Cancel</Button>
            <Button onClick={handleSaveMember}>{editingMember ? "Update" : "Add"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function MemberRow({
  member,
  team,
  onEdit,
  onDelete,
}: {
  member: Member;
  team?: Team;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const initials = member.name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <div className="flex items-center justify-between px-4 py-3 hover:bg-muted/20 transition-colors">
      <div className="flex items-center gap-3">
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
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onEdit}>
          <Pencil className="h-3.5 w-3.5" />
        </Button>
        <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={onDelete}>
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
}
