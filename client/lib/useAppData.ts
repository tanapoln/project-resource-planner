import { useState, useCallback } from "react";
import { Team, Member, Project, Assignment } from "./types";
import {
  getTeams,
  saveTeams,
  getMembers,
  saveMembers,
  getProjects,
  saveProjects,
  getAssignments,
  saveAssignments,
  generateId,
  findConflicts,
} from "./store";

export function useAppData() {
  const [teams, setTeams] = useState<Team[]>(getTeams);
  const [members, setMembers] = useState<Member[]>(getMembers);
  const [projects, setProjects] = useState<Project[]>(getProjects);
  const [assignments, setAssignments] = useState<Assignment[]>(getAssignments);

  // Teams
  const addTeam = useCallback((team: Omit<Team, "id">) => {
    const newTeam = { ...team, id: generateId() };
    setTeams((prev) => {
      const next = [...prev, newTeam];
      saveTeams(next);
      return next;
    });
    return newTeam;
  }, []);

  const updateTeam = useCallback((id: string, data: Partial<Team>) => {
    setTeams((prev) => {
      const next = prev.map((t) => (t.id === id ? { ...t, ...data } : t));
      saveTeams(next);
      return next;
    });
  }, []);

  const deleteTeam = useCallback((id: string) => {
    setTeams((prev) => {
      const next = prev.filter((t) => t.id !== id);
      saveTeams(next);
      return next;
    });
  }, []);

  const reorderTeams = useCallback((reordered: Team[]) => {
    setTeams(reordered);
    saveTeams(reordered);
  }, []);

  // Members
  const addMember = useCallback((member: Omit<Member, "id">) => {
    const newMember = { ...member, id: generateId() };
    setMembers((prev) => {
      const next = [...prev, newMember];
      saveMembers(next);
      return next;
    });
    return newMember;
  }, []);

  const updateMember = useCallback((id: string, data: Partial<Member>) => {
    setMembers((prev) => {
      const next = prev.map((m) => (m.id === id ? { ...m, ...data } : m));
      saveMembers(next);
      return next;
    });
  }, []);

  const deleteMember = useCallback((id: string) => {
    setMembers((prev) => {
      const next = prev.filter((m) => m.id !== id);
      saveMembers(next);
      return next;
    });
    // Also remove assignments for this member
    setAssignments((prev) => {
      const next = prev.filter((a) => a.memberId !== id);
      saveAssignments(next);
      return next;
    });
  }, []);

  // Projects
  const addProject = useCallback((project: Omit<Project, "id">) => {
    const newProject = { ...project, id: generateId() };
    setProjects((prev) => {
      const next = [...prev, newProject];
      saveProjects(next);
      return next;
    });
    return newProject;
  }, []);

  const updateProject = useCallback((id: string, data: Partial<Project>) => {
    setProjects((prev) => {
      const next = prev.map((p) => (p.id === id ? { ...p, ...data } : p));
      saveProjects(next);
      return next;
    });
  }, []);

  const deleteProject = useCallback((id: string) => {
    setProjects((prev) => {
      const next = prev.filter((p) => p.id !== id);
      saveProjects(next);
      return next;
    });
    // Also remove assignments for this project
    setAssignments((prev) => {
      const next = prev.filter((a) => a.projectId !== id);
      saveAssignments(next);
      return next;
    });
  }, []);

  // Assignments
  const addAssignment = useCallback(
    (
      assignment: Omit<Assignment, "id">,
    ): { success: boolean; conflicts: Assignment[] } => {
      const conflicts = findConflicts(
        assignment.memberId,
        assignment.startDate,
        assignment.endDate,
      );
      if (conflicts.length > 0) return { success: false, conflicts };
      const newAssignment = { ...assignment, id: generateId() };
      setAssignments((prev) => {
        const next = [...prev, newAssignment];
        saveAssignments(next);
        return next;
      });
      return { success: true, conflicts: [] };
    },
    [],
  );

  const updateAssignment = useCallback(
    (
      id: string,
      data: Partial<Assignment>,
    ): { success: boolean; conflicts: Assignment[] } => {
      // Get existing assignment to merge
      const existing = getAssignments().find((a) => a.id === id);
      if (!existing) return { success: false, conflicts: [] };
      const merged = { ...existing, ...data };
      const conflicts = findConflicts(
        merged.memberId,
        merged.startDate,
        merged.endDate,
        id,
      );
      if (conflicts.length > 0) return { success: false, conflicts };
      setAssignments((prev) => {
        const next = prev.map((a) => (a.id === id ? merged : a));
        saveAssignments(next);
        return next;
      });
      return { success: true, conflicts: [] };
    },
    [],
  );

  const deleteAssignment = useCallback((id: string) => {
    setAssignments((prev) => {
      const next = prev.filter((a) => a.id !== id);
      saveAssignments(next);
      return next;
    });
  }, []);

  return {
    teams,
    addTeam,
    updateTeam,
    deleteTeam,
    reorderTeams,
    members,
    addMember,
    updateMember,
    deleteMember,
    projects,
    addProject,
    updateProject,
    deleteProject,
    assignments,
    addAssignment,
    updateAssignment,
    deleteAssignment,
  };
}
