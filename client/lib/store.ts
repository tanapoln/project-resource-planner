import { Team, Member, Project, Assignment } from "./types";

const KEYS = {
  teams: "erp_teams",
  members: "erp_members",
  projects: "erp_projects",
  assignments: "erp_assignments",
} as const;

function load<T>(key: string, fallback: T[]): T[] {
  try {
    const raw = localStorage.getItem(key);
    if (raw) return JSON.parse(raw) as T[];
  } catch {
    /* ignore */
  }
  return fallback;
}

function save<T>(key: string, data: T[]) {
  localStorage.setItem(key, JSON.stringify(data));
}

// --- Default seed data ---
const DEFAULT_TEAMS: Team[] = [
  { id: "team-1", name: "Frontend", color: "#6366f1" },
  { id: "team-2", name: "Backend", color: "#06b6d4" },
  { id: "team-3", name: "Design", color: "#f43f5e" },
];

const DEFAULT_MEMBERS: Member[] = [
  { id: "m-1", name: "Alice Chen", role: "Senior Engineer", teamId: "team-1" },
  { id: "m-2", name: "Bob Park", role: "Engineer", teamId: "team-1" },
  { id: "m-3", name: "Carol Liu", role: "Tech Lead", teamId: "team-2" },
  { id: "m-4", name: "David Kim", role: "Engineer", teamId: "team-2" },
  { id: "m-5", name: "Eva Santos", role: "Designer", teamId: "team-3" },
  { id: "m-6", name: "Frank Wu", role: "UX Lead", teamId: "team-3" },
];

const DEFAULT_PROJECTS: Project[] = [
  {
    id: "p-1",
    name: "Website Redesign",
    color: "#8b5cf6",
    description: "Revamp the company website",
  },
  {
    id: "p-2",
    name: "Mobile App v2",
    color: "#f59e0b",
    description: "Next major version of mobile app",
  },
  {
    id: "p-3",
    name: "API Gateway",
    color: "#10b981",
    description: "Build the new API gateway service",
  },
];

const DEFAULT_ASSIGNMENTS: Assignment[] = [
  {
    id: "a-1",
    memberId: "m-1",
    projectId: "p-1",
    startDate: getRelativeDate(0),
    endDate: getRelativeDate(14),
  },
  {
    id: "a-2",
    memberId: "m-3",
    projectId: "p-3",
    startDate: getRelativeDate(2),
    endDate: getRelativeDate(20),
  },
  {
    id: "a-3",
    memberId: "m-5",
    projectId: "p-1",
    startDate: getRelativeDate(0),
    endDate: getRelativeDate(10),
  },
];

function getRelativeDate(daysFromNow: number): string {
  const d = new Date();
  d.setDate(d.getDate() + daysFromNow);
  return d.toISOString().split("T")[0];
}

// --- CRUD helpers ---
export function getTeams(): Team[] {
  return load<Team>(KEYS.teams, DEFAULT_TEAMS);
}
export function saveTeams(teams: Team[]) {
  save(KEYS.teams, teams);
}

export function getMembers(): Member[] {
  return load<Member>(KEYS.members, DEFAULT_MEMBERS);
}
export function saveMembers(members: Member[]) {
  save(KEYS.members, members);
}

export function getProjects(): Project[] {
  return load<Project>(KEYS.projects, DEFAULT_PROJECTS);
}
export function saveProjects(projects: Project[]) {
  save(KEYS.projects, projects);
}

export function getAssignments(): Assignment[] {
  return load<Assignment>(KEYS.assignments, DEFAULT_ASSIGNMENTS);
}
export function saveAssignments(assignments: Assignment[]) {
  save(KEYS.assignments, assignments);
}

export function generateId(): string {
  return crypto.randomUUID();
}

// Conflict detection: returns conflicting assignments for a member in a date range, excluding a given assignment id
export function findConflicts(
  memberId: string,
  startDate: string,
  endDate: string,
  excludeAssignmentId?: string,
): Assignment[] {
  const assignments = getAssignments();
  return assignments.filter((a) => {
    if (a.memberId !== memberId) return false;
    if (excludeAssignmentId && a.id === excludeAssignmentId) return false;
    // Overlap check: two ranges overlap if start1 <= end2 AND start2 <= end1
    return a.startDate <= endDate && startDate <= a.endDate;
  });
}
