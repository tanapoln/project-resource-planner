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
  const hasHeader = headerLine.includes("name") || headerLine.includes("role") || headerLine.includes("team");
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
