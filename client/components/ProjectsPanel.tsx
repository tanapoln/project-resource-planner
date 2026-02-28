import { useState, useRef, useCallback } from "react";
import { Project } from "@/lib/types";
import { parseProjectCsv, escapeCsv } from "@/lib/csvImport";
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
  Plus,
  Pencil,
  Trash2,
  FolderKanban,
  Upload,
  Download,
} from "lucide-react";

interface Props {
  projects: Project[];
  addProject: (p: Omit<Project, "id">) => Project;
  updateProject: (id: string, data: Partial<Project>) => void;
  deleteProject: (id: string) => void;
}

const PROJECT_COLORS = [
  "#8b5cf6",
  "#f59e0b",
  "#10b981",
  "#ef4444",
  "#3b82f6",
  "#ec4899",
  "#14b8a6",
  "#f97316",
  "#6366f1",
  "#84cc16",
];

export default function ProjectsPanel({
  projects,
  addProject,
  updateProject,
  deleteProject,
}: Props) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Project | null>(null);
  const [csvDialog, setCsvDialog] = useState(false);
  const [csvPreview, setCsvPreview] = useState<
    { name: string; description: string; color: string }[]
  >([]);
  const [csvFileName, setCsvFileName] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [color, setColor] = useState(PROJECT_COLORS[0]);

  const openDialog = (project?: Project) => {
    if (project) {
      setEditing(project);
      setName(project.name);
      setDescription(project.description);
      setColor(project.color);
    } else {
      setEditing(null);
      setName("");
      setDescription("");
      setColor(PROJECT_COLORS[projects.length % PROJECT_COLORS.length]);
    }
    setDialogOpen(true);
  };

  const handleSave = () => {
    if (!name.trim()) return;
    if (editing) {
      updateProject(editing.id, { name, description, color });
    } else {
      addProject({ name, description, color });
    }
    setDialogOpen(false);
  };

  // --- CSV Import ---
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setCsvFileName(file.name);
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      const rows = parseProjectCsv(text);
      setCsvPreview(rows);
      setCsvDialog(true);
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  const handleCsvImport = () => {
    for (const row of csvPreview) {
      const projectColor =
        row.color && /^#[0-9a-fA-F]{6}$/.test(row.color)
          ? row.color
          : PROJECT_COLORS[
              (projects.length + csvPreview.indexOf(row)) %
                PROJECT_COLORS.length
            ];
      addProject({
        name: row.name,
        description: row.description,
        color: projectColor,
      });
    }
    setCsvDialog(false);
    setCsvPreview([]);
  };

  // --- CSV Export ---
  const handleExportCsv = useCallback(() => {
    const header = "Name,Description,Color";
    const rows = projects.map(
      (p) =>
        `${escapeCsv(p.name)},${escapeCsv(p.description)},${escapeCsv(p.color)}`,
    );
    const csv = [header, ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "projects-export.csv";
    a.click();
    URL.revokeObjectURL(url);
  }, [projects]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h2 className="text-xl font-semibold text-foreground">Projects</h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            {projects.length} project{projects.length !== 1 ? "s" : ""}
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
          <Button size="sm" onClick={() => openDialog()}>
            <Plus className="h-4 w-4 mr-1" /> Add Project
          </Button>
        </div>
      </div>

      {projects.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-3">
            <FolderKanban className="h-6 w-6 text-muted-foreground" />
          </div>
          <p className="text-sm text-muted-foreground">
            No projects yet. Create one to get started.
          </p>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {projects.map((project) => (
            <ProjectCard
              key={project.id}
              project={project}
              onEdit={() => openDialog(project)}
              onDelete={() => deleteProject(project.id)}
            />
          ))}
        </div>
      )}

      {/* Project CRUD Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editing ? "Edit Project" : "New Project"}
            </DialogTitle>
            <DialogDescription>
              {editing ? "Update project details." : "Create a new project."}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-1.5 block">
                Project Name
              </label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Website Redesign"
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-1.5 block">
                Description
              </label>
              <Input
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Short description"
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-1.5 block">Color</label>
              <div className="flex gap-2 flex-wrap">
                {PROJECT_COLORS.map((c) => (
                  <button
                    key={c}
                    className={`w-8 h-8 rounded-full border-2 transition-all ${color === c ? "border-foreground scale-110" : "border-transparent"}`}
                    style={{ backgroundColor: c }}
                    onClick={() => setColor(c)}
                  />
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave}>
              {editing ? "Update" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* CSV Import Preview Dialog */}
      <Dialog open={csvDialog} onOpenChange={setCsvDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Import Projects from CSV</DialogTitle>
            <DialogDescription>
              Preview of {csvPreview.length} project
              {csvPreview.length !== 1 ? "s" : ""} from "{csvFileName}".
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
                    Description
                  </th>
                  <th className="text-left px-3 py-2 font-medium text-muted-foreground">
                    Color
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {csvPreview.map((row, i) => (
                  <tr key={i} className="hover:bg-muted/20">
                    <td className="px-3 py-2">{row.name}</td>
                    <td className="px-3 py-2 text-muted-foreground">
                      {row.description || "—"}
                    </td>
                    <td className="px-3 py-2">
                      {row.color && /^#[0-9a-fA-F]{6}$/.test(row.color) ? (
                        <div className="flex items-center gap-1.5">
                          <div
                            className="w-3 h-3 rounded-full"
                            style={{ backgroundColor: row.color }}
                          />
                          <span className="text-xs text-muted-foreground">
                            {row.color}
                          </span>
                        </div>
                      ) : (
                        <Badge variant="outline" className="text-[10px]">
                          Auto
                        </Badge>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {csvPreview.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-4">
              No valid rows found. Make sure the CSV has columns: Name,
              Description, Color.
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
              Import {csvPreview.length} Project
              {csvPreview.length !== 1 ? "s" : ""}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function ProjectCard({
  project,
  onEdit,
  onDelete,
}: {
  project: Project;
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <div className="bg-card border rounded-lg p-4 hover:shadow-md transition-shadow group">
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-2">
          <div
            className="w-3 h-3 rounded-full shrink-0"
            style={{ backgroundColor: project.color }}
          />
          <h3 className="font-medium text-sm">{project.name}</h3>
        </div>
        <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
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
      {project.description && (
        <p className="text-xs text-muted-foreground line-clamp-2">
          {project.description}
        </p>
      )}
    </div>
  );
}
