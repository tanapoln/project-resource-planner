export interface Team {
  id: string;
  name: string;
  color: string;
}

export interface Member {
  id: string;
  name: string;
  role: string;
  teamId: string;
  avatar?: string;
}

export interface Project {
  id: string;
  name: string;
  color: string;
  description: string;
}

export interface Assignment {
  id: string;
  memberId: string;
  projectId: string;
  startDate: string; // ISO date string YYYY-MM-DD
  endDate: string;   // ISO date string YYYY-MM-DD
}
