export interface CsvMemberRow {
  name: string;
  role: string;
  team: string; // may be empty
}

/**
 * Parse a CSV string with columns: Name, Role, Team (optional).
 * Handles quoted fields and trims whitespace.
 */
export function parseMemberCsv(text: string): CsvMemberRow[] {
  const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length === 0) return [];

  // Detect header row
  const headerLine = lines[0].toLowerCase();
  const hasHeader =
    headerLine.includes("name") ||
    headerLine.includes("role") ||
    headerLine.includes("team");
  const dataLines = hasHeader ? lines.slice(1) : lines;

  // Parse header to find column indices
  let nameIdx = 0;
  let roleIdx = 1;
  let teamIdx = 2;

  if (hasHeader) {
    const headers = splitCsvLine(lines[0]).map((h) => h.toLowerCase().trim());
    nameIdx = headers.findIndex((h) => h === "name");
    roleIdx = headers.findIndex((h) => h === "role");
    teamIdx = headers.findIndex((h) => h === "team");
    if (nameIdx === -1) nameIdx = 0;
    if (roleIdx === -1) roleIdx = 1;
  }

  const rows: CsvMemberRow[] = [];
  for (const line of dataLines) {
    const cols = splitCsvLine(line);
    const name = (cols[nameIdx] ?? "").trim();
    if (!name) continue; // skip empty name rows
    const role = (cols[roleIdx] ?? "").trim();
    const team = teamIdx >= 0 ? (cols[teamIdx] ?? "").trim() : "";
    rows.push({ name, role, team });
  }

  return rows;
}

// --- Project CSV ---

export interface CsvProjectRow {
  name: string;
  description: string;
  color: string;
}

export function parseProjectCsv(text: string): CsvProjectRow[] {
  const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length === 0) return [];

  const headerLine = lines[0].toLowerCase();
  const hasHeader =
    headerLine.includes("name") ||
    headerLine.includes("description") ||
    headerLine.includes("color");
  const dataLines = hasHeader ? lines.slice(1) : lines;

  let nameIdx = 0;
  let descIdx = 1;
  let colorIdx = 2;

  if (hasHeader) {
    const headers = splitCsvLine(lines[0]).map((h) => h.toLowerCase().trim());
    nameIdx = headers.findIndex((h) => h === "name");
    descIdx = headers.findIndex((h) => h === "description");
    colorIdx = headers.findIndex((h) => h === "color");
    if (nameIdx === -1) nameIdx = 0;
  }

  const rows: CsvProjectRow[] = [];
  for (const line of dataLines) {
    const cols = splitCsvLine(line);
    const name = (cols[nameIdx] ?? "").trim();
    if (!name) continue;
    const description = descIdx >= 0 ? (cols[descIdx] ?? "").trim() : "";
    const color = colorIdx >= 0 ? (cols[colorIdx] ?? "").trim() : "";
    rows.push({ name, description, color });
  }
  return rows;
}

// --- Schedule CSV ---

export interface CsvScheduleRow {
  member: string;
  team: string;
  role: string;
  project: string;
  startDate: string;
  endDate: string;
}

export function parseScheduleCsv(text: string): CsvScheduleRow[] {
  const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length === 0) return [];

  const headerLine = lines[0].toLowerCase();
  const hasHeader =
    headerLine.includes("member") ||
    headerLine.includes("project") ||
    headerLine.includes("start");
  const dataLines = hasHeader ? lines.slice(1) : lines;

  let memberIdx = 0,
    teamIdx = 1,
    roleIdx = 2,
    projectIdx = 3,
    startIdx = 4,
    endIdx = 5;

  if (hasHeader) {
    const headers = splitCsvLine(lines[0]).map((h) => h.toLowerCase().trim());
    memberIdx = headers.findIndex((h) => h === "member");
    teamIdx = headers.findIndex((h) => h === "team");
    roleIdx = headers.findIndex((h) => h === "role");
    projectIdx = headers.findIndex((h) => h === "project");
    startIdx = headers.findIndex(
      (h) => h === "start date" || h === "startdate" || h === "start",
    );
    endIdx = headers.findIndex(
      (h) => h === "end date" || h === "enddate" || h === "end",
    );
    if (memberIdx === -1) memberIdx = 0;
    if (projectIdx === -1) projectIdx = 3;
    if (startIdx === -1) startIdx = 4;
    if (endIdx === -1) endIdx = 5;
  }

  const rows: CsvScheduleRow[] = [];
  for (const line of dataLines) {
    const cols = splitCsvLine(line);
    const member = (cols[memberIdx] ?? "").trim();
    const project = (cols[projectIdx] ?? "").trim();
    const startDate = (cols[startIdx] ?? "").trim();
    const endDate = (cols[endIdx] ?? "").trim();
    if (!member || !project || !startDate || !endDate) continue;
    const team = teamIdx >= 0 ? (cols[teamIdx] ?? "").trim() : "";
    const role = roleIdx >= 0 ? (cols[roleIdx] ?? "").trim() : "";
    rows.push({ member, team, role, project, startDate, endDate });
  }
  return rows;
}

// --- Shared CSV helpers ---

export function escapeCsv(v: string): string {
  return v.includes(",") || v.includes('"') ? `"${v.replace(/"/g, '""')}"` : v;
}

/** Simple CSV line splitter that handles quoted fields */
function splitCsvLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === "," && !inQuotes) {
      result.push(current);
      current = "";
    } else {
      current += ch;
    }
  }
  result.push(current);
  return result;
}
