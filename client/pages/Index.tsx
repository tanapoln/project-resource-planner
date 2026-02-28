import { useState } from "react";
import { useAppData } from "@/lib/useAppData";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import MembersPanel from "@/components/MembersPanel";
import ProjectsPanel from "@/components/ProjectsPanel";
import ScheduleView from "@/components/schedule/ScheduleView";
import { CalendarDays, Users, FolderKanban, LayoutGrid } from "lucide-react";

export default function Index() {
  const data = useAppData();
  const [tab, setTab] = useState("schedule");

  return (
    <div className="min-h-screen bg-background">
      {/* Top bar */}
      <header className="sticky top-0 z-30 bg-card/80 backdrop-blur-md border-b">
        <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between h-14">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
              <LayoutGrid className="h-4 w-4 text-primary-foreground" />
            </div>
            <span className="font-semibold text-base tracking-tight">
              ResourceHub
            </span>
          </div>
          <div className="text-xs text-muted-foreground hidden sm:block">
            {data.members.length} members &middot; {data.projects.length}{" "}
            projects &middot; {data.assignments.length} assignments
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <Tabs value={tab} onValueChange={setTab}>
          <TabsList className="mb-6">
            <TabsTrigger value="schedule" className="gap-1.5">
              <CalendarDays className="h-4 w-4" />
              <span className="hidden sm:inline">Schedule</span>
            </TabsTrigger>
            <TabsTrigger value="members" className="gap-1.5">
              <Users className="h-4 w-4" />
              <span className="hidden sm:inline">Members</span>
            </TabsTrigger>
            <TabsTrigger value="projects" className="gap-1.5">
              <FolderKanban className="h-4 w-4" />
              <span className="hidden sm:inline">Projects</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="schedule">
            <ScheduleView
              teams={data.teams}
              members={data.members}
              projects={data.projects}
              assignments={data.assignments}
              addTeam={data.addTeam}
              addMember={data.addMember}
              addProject={data.addProject}
              addAssignment={data.addAssignment}
              updateAssignment={data.updateAssignment}
              deleteAssignment={data.deleteAssignment}
            />
          </TabsContent>

          <TabsContent value="members">
            <MembersPanel
              teams={data.teams}
              members={data.members}
              addTeam={data.addTeam}
              updateTeam={data.updateTeam}
              deleteTeam={data.deleteTeam}
              reorderTeams={data.reorderTeams}
              addMember={data.addMember}
              updateMember={data.updateMember}
              deleteMember={data.deleteMember}
            />
          </TabsContent>

          <TabsContent value="projects">
            <ProjectsPanel
              projects={data.projects}
              addProject={data.addProject}
              updateProject={data.updateProject}
              deleteProject={data.deleteProject}
            />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
