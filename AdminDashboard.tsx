import { useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, LogOut, Settings, Trash2, Copy, Eye, EyeOff } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

export default function AdminDashboard() {
  const [, navigate] = useLocation();
  const [showNewProjectDialog, setShowNewProjectDialog] = useState(false);
  const [projectName, setProjectName] = useState("");
  const [projectDescription, setProjectDescription] = useState("");
  const [showApiKeys, setShowApiKeys] = useState<{ [key: number]: boolean }>({});

  // Queries
  const { data: projects = [], isLoading: projectsLoading, refetch: refetchProjects } = trpc.projects.list.useQuery();
  const { data: adminInfo } = trpc.admin.getAdminInfo.useQuery();

  // Mutations
  const createProjectMutation = trpc.projects.create.useMutation();
  const deleteProjectMutation = trpc.projects.delete.useMutation();
  const logoutMutation = trpc.admin.adminLogout.useMutation();

  const handleCreateProject = async () => {
    if (!projectName.trim()) {
      toast.error("Project name is required");
      return;
    }

    try {
      await createProjectMutation.mutateAsync({
        name: projectName,
        description: projectDescription,
      });
      toast.success("Project created successfully!");
      setProjectName("");
      setProjectDescription("");
      setShowNewProjectDialog(false);
      refetchProjects();
    } catch (error: any) {
      toast.error(error.message || "Failed to create project");
    }
  };

  const handleDeleteProject = async (projectId: number) => {
    if (!confirm("Are you sure you want to delete this project?")) return;

    try {
      await deleteProjectMutation.mutateAsync({ projectId });
      toast.success("Project deleted successfully!");
      refetchProjects();
    } catch (error: any) {
      toast.error(error.message || "Failed to delete project");
    }
  };

  const handleLogout = async () => {
    try {
      await logoutMutation.mutateAsync();
      toast.success("Logged out successfully!");
      navigate("/", { replace: true });
    } catch (error: any) {
      toast.error(error.message || "Logout failed");
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Copied to clipboard!");
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Jigar Database System</h1>
            <p className="text-sm text-muted-foreground">Admin Dashboard</p>
          </div>
          <div className="flex items-center gap-4">
            {adminInfo && (
              <div className="text-right">
                <p className="text-sm font-medium text-foreground">{adminInfo.name || adminInfo.email}</p>
                <p className="text-xs text-muted-foreground">{adminInfo.email}</p>
              </div>
            )}
            <Button
              onClick={handleLogout}
              variant="outline"
              className="border-border text-foreground hover:bg-card"
            >
              <LogOut className="w-4 h-4 mr-2" />
              Logout
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        {/* Top Section */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-3xl font-bold text-foreground mb-2">Your Projects</h2>
            <p className="text-muted-foreground">Create and manage your database projects</p>
          </div>
          <Dialog open={showNewProjectDialog} onOpenChange={setShowNewProjectDialog}>
            <DialogTrigger asChild>
              <Button className="bg-accent text-accent-foreground hover:bg-accent/90">
                <Plus className="w-4 h-4 mr-2" />
                New Project
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-card border-border">
              <DialogHeader>
                <DialogTitle className="text-foreground">Create New Project</DialogTitle>
                <DialogDescription className="text-muted-foreground">
                  Create a new database project to store and manage your data
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-foreground">Project Name</label>
                  <Input
                    placeholder="My Social Media Project"
                    value={projectName}
                    onChange={(e) => setProjectName(e.target.value)}
                    className="bg-input border-border text-foreground placeholder:text-muted-foreground mt-1"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-foreground">Description</label>
                  <Textarea
                    placeholder="Project description..."
                    value={projectDescription}
                    onChange={(e) => setProjectDescription(e.target.value)}
                    className="bg-input border-border text-foreground placeholder:text-muted-foreground mt-1"
                    rows={3}
                  />
                </div>
                <Button
                  onClick={handleCreateProject}
                  disabled={createProjectMutation.isPending}
                  className="w-full bg-accent text-accent-foreground hover:bg-accent/90"
                >
                  {createProjectMutation.isPending ? "Creating..." : "Create Project"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Projects Grid */}
        {projectsLoading ? (
          <div className="flex items-center justify-center py-12">
            <p className="text-muted-foreground">Loading projects...</p>
          </div>
        ) : projects.length === 0 ? (
          <Card className="bg-card border-border">
            <CardContent className="py-12 text-center">
              <p className="text-muted-foreground mb-4">No projects yet. Create your first project to get started!</p>
              <Button className="bg-accent text-accent-foreground hover:bg-accent/90">
                <Plus className="w-4 h-4 mr-2" />
                Create First Project
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {projects.map((project) => (
              <Card key={project.id} className="bg-card border-border hover:border-accent/50 transition-colors">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-foreground">{project.name}</CardTitle>
                      <CardDescription className="text-muted-foreground mt-1">
                        {project.description || "No description"}
                      </CardDescription>
                    </div>
                    <Button
                      onClick={() => handleDeleteProject(project.id)}
                      variant="ghost"
                      size="sm"
                      className="text-destructive hover:bg-destructive/10"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Project Stats */}
                  <div className="grid grid-cols-2 gap-2">
                    <div className="bg-background rounded p-2">
                      <p className="text-xs text-muted-foreground">Created</p>
                      <p className="text-sm font-semibold text-foreground">
                        {new Date(project.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="bg-background rounded p-2">
                      <p className="text-xs text-muted-foreground">Status</p>
                      <p className="text-sm font-semibold text-accent">
                        {project.isActive ? "Active" : "Inactive"}
                      </p>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex gap-2">
                    <Button
                      onClick={() => navigate(`/project/${project.id}`)}
                      className="flex-1 bg-accent text-accent-foreground hover:bg-accent/90"
                      size="sm"
                    >
                      <Settings className="w-4 h-4 mr-1" />
                      Manage
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
