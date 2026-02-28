import { Assignment } from "./types";

/**
 * Assigns each assignment to a lane (0-indexed) so that overlapping
 * assignments within the same row are placed on separate lines.
 * Returns a Map from assignment.id to lane index, plus the total lane count.
 */
export function assignLanes(assignments: Assignment[]): {
  lanes: Map<string, number>;
  laneCount: number;
} {
  if (assignments.length === 0) {
    return { lanes: new Map(), laneCount: 1 };
  }

  // Sort by start date, then by end date (shorter first)
  const sorted = [...assignments].sort((a, b) => {
    if (a.startDate !== b.startDate) return a.startDate < b.startDate ? -1 : 1;
    return a.endDate < b.endDate ? -1 : 1;
  });

  const lanes = new Map<string, number>();
  // Track the end date of the last assignment placed in each lane
  const laneEnds: string[] = [];

  for (const assignment of sorted) {
    // Find the first lane where this assignment doesn't overlap
    let placed = false;
    for (let i = 0; i < laneEnds.length; i++) {
      // No overlap if this assignment starts after the lane's last end
      if (assignment.startDate > laneEnds[i]) {
        lanes.set(assignment.id, i);
        laneEnds[i] = assignment.endDate;
        placed = true;
        break;
      }
    }
    if (!placed) {
      // Need a new lane
      lanes.set(assignment.id, laneEnds.length);
      laneEnds.push(assignment.endDate);
    }
  }

  return { lanes, laneCount: Math.max(laneEnds.length, 1) };
}
