import { useState } from "react";
import { useLocation, useRoute } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Copy, Trash2, Eye, EyeOff, ArrowLeft, Key, Database } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

export default function ProjectDetails() {
  const [, navigate] = useLocation();
  const [match, params] = useRoute("/project/:projectId");
  const projectId = params?.projectId ? parseInt(params.projectId) : null;

  const [showNewApiKeyDialog, setShowNewApiKeyDialog] = useState(false);
  const [apiKeyName, setApiKeyName] = useState("");
  const [showApiKeys, setShowApiKeys] = useState<{ [key: number]: boolean }>({});
  const [newDataDialog, setNewDataDialog] = useState(false);
  const [dataJson, setDataJson] = useState("{}");

  // Queries
  const { data: project, isLoading: projectLoading } = trpc.projects.get.useQuery(
    { projectId: projectId || 0 },
    { enabled: !!projectId }
  );
  const { data: apiKeys = [], refetch: refetchApiKeys } = trpc.apiKeys.list.useQuery(
    { projectId: projectId || 0 },
    { enabled: !!projectId }
  );
  const { data: dataList = [], refetch: refetchData } = trpc.data.list.useQuery(
    { projectId: projectId || 0, limit: 50 },
    { enabled: !!projectId }
  );

  // Mutations
  const createApiKeyMutation = trpc.apiKeys.create.useMutation();
  const revokeApiKeyMutation = trpc.apiKeys.revoke.useMutation();
  const insertDataMutation = trpc.data.create.useMutation();
  const deleteDataMutation = trpc.data.delete.useMutation();

  if (!projectId) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Invalid project ID</p>
      </div>
    );
  }

  if (projectLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Loading project...</p>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Project not found</p>
      </div>
    );
  }

  const handleCreateApiKey = async () => {
    if (!apiKeyName.trim()) {
      toast.error("API key name is required");
      return;
    }

    try {
      await createApiKeyMutation.mutateAsync({
        projectId,
        name: apiKeyName,
      });
      toast.success("API key created successfully!");
      setApiKeyName("");
      setShowNewApiKeyDialog(false);
      refetchApiKeys();
    } catch (error: any) {
      toast.error(error.message || "Failed to create API key");
    }
  };

  const handleRevokeApiKey = async (apiKeyId: number) => {
    if (!confirm("Are you sure you want to revoke this API key?")) return;

    try {
      await revokeApiKeyMutation.mutateAsync({ apiKeyId });
      toast.success("API key revoked successfully!");
      refetchApiKeys();
    } catch (error: any) {
      toast.error(error.message || "Failed to revoke API key");
    }
  };

  const handleInsertData = async () => {
    try {
      const parsedData = JSON.parse(dataJson);
      await insertDataMutation.mutateAsync({
        projectId,
        data: parsedData,
      });
      toast.success("Data inserted successfully!");
      setDataJson("{}");
      setNewDataDialog(false);
      refetchData();
    } catch (error: any) {
      if (error instanceof SyntaxError) {
        toast.error("Invalid JSON format");
      } else {
        toast.error(error.message || "Failed to insert data");
      }
    }
  };

  const handleDeleteData = async (dataId: bigint) => {
    if (!confirm("Are you sure you want to delete this data?")) return;

    try {
      await deleteDataMutation.mutateAsync({ dataId });
      toast.success("Data deleted successfully!");
      refetchData();
    } catch (error: any) {
      toast.error(error.message || "Failed to delete data");
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
        <div className="container mx-auto px-4 py-4 flex items-center gap-4">
          <Button
            onClick={() => navigate("/dashboard")}
            variant="ghost"
            className="text-foreground hover:bg-card"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-foreground">{project.name}</h1>
            <p className="text-sm text-muted-foreground">{project.description}</p>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        <Tabs defaultValue="api-keys" className="w-full">
          <TabsList className="bg-card border-border">
            <TabsTrigger value="api-keys" className="text-foreground">
              <Key className="w-4 h-4 mr-2" />
              API Keys
            </TabsTrigger>
            <TabsTrigger value="data" className="text-foreground">
              <Database className="w-4 h-4 mr-2" />
              Data
            </TabsTrigger>
          </TabsList>

          {/* API Keys Tab */}
          <TabsContent value="api-keys" className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold text-foreground mb-2">API Keys</h2>
                <p className="text-muted-foreground">Manage API keys for this project</p>
              </div>
              <Dialog open={showNewApiKeyDialog} onOpenChange={setShowNewApiKeyDialog}>
                <DialogTrigger asChild>
                  <Button className="bg-accent text-accent-foreground hover:bg-accent/90">
                    <Plus className="w-4 h-4 mr-2" />
                    New API Key
                  </Button>
                </DialogTrigger>
                <DialogContent className="bg-card border-border">
                  <DialogHeader>
                    <DialogTitle className="text-foreground">Create New API Key</DialogTitle>
                    <DialogDescription className="text-muted-foreground">
                      Generate a new API key for external integrations
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <label className="text-sm font-medium text-foreground">API Key Name</label>
                      <Input
                        placeholder="e.g., Mobile App, Web Frontend"
                        value={apiKeyName}
                        onChange={(e) => setApiKeyName(e.target.value)}
                        className="bg-input border-border text-foreground placeholder:text-muted-foreground mt-1"
                      />
                    </div>
                    <Button
                      onClick={handleCreateApiKey}
                      disabled={createApiKeyMutation.isPending}
                      className="w-full bg-accent text-accent-foreground hover:bg-accent/90"
                    >
                      {createApiKeyMutation.isPending ? "Creating..." : "Create API Key"}
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>

            {apiKeys.length === 0 ? (
              <Card className="bg-card border-border">
                <CardContent className="py-8 text-center">
                  <p className="text-muted-foreground">No API keys yet. Create one to get started!</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {apiKeys.map((apiKey) => (
                  <Card key={apiKey.id} className="bg-card border-border">
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div>
                          <CardTitle className="text-foreground">{apiKey.name}</CardTitle>
                          <CardDescription className="text-muted-foreground mt-1">
                            Created {new Date(apiKey.createdAt).toLocaleDateString()}
                          </CardDescription>
                        </div>
                        <Button
                          onClick={() => handleRevokeApiKey(apiKey.id)}
                          variant="ghost"
                          size="sm"
                          className="text-destructive hover:bg-destructive/10"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center gap-2">
                        <code className="flex-1 bg-background text-foreground px-3 py-2 rounded text-sm font-mono break-all">
                          {showApiKeys[apiKey.id] ? apiKey.key : "•".repeat(20)}
                        </code>
                        <Button
                          onClick={() =>
                            setShowApiKeys({
                              ...showApiKeys,
                              [apiKey.id]: !showApiKeys[apiKey.id],
                            })
                          }
                          variant="ghost"
                          size="sm"
                          className="text-foreground"
                        >
                          {showApiKeys[apiKey.id] ? (
                            <EyeOff className="w-4 h-4" />
                          ) : (
                            <Eye className="w-4 h-4" />
                          )}
                        </Button>
                        <Button
                          onClick={() => copyToClipboard(apiKey.key)}
                          variant="ghost"
                          size="sm"
                          className="text-foreground"
                        >
                          <Copy className="w-4 h-4" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Data Tab */}
          <TabsContent value="data" className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold text-foreground mb-2">Data</h2>
                <p className="text-muted-foreground">Manage project data</p>
              </div>
              <Dialog open={newDataDialog} onOpenChange={setNewDataDialog}>
                <DialogTrigger asChild>
                  <Button className="bg-accent text-accent-foreground hover:bg-accent/90">
                    <Plus className="w-4 h-4 mr-2" />
                    Add Data
                  </Button>
                </DialogTrigger>
                <DialogContent className="bg-card border-border max-w-2xl">
                  <DialogHeader>
                    <DialogTitle className="text-foreground">Add New Data</DialogTitle>
                    <DialogDescription className="text-muted-foreground">
                      Enter JSON data to store in this project
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <label className="text-sm font-medium text-foreground">JSON Data</label>
                      <Textarea
                        placeholder='{"name": "John", "email": "john@example.com"}'
                        value={dataJson}
                        onChange={(e) => setDataJson(e.target.value)}
                        className="bg-input border-border text-foreground placeholder:text-muted-foreground mt-1 font-mono"
                        rows={8}
                      />
                    </div>
                    <Button
                      onClick={handleInsertData}
                      disabled={insertDataMutation.isPending}
                      className="w-full bg-accent text-accent-foreground hover:bg-accent/90"
                    >
                      {insertDataMutation.isPending ? "Adding..." : "Add Data"}
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>

            {dataList.length === 0 ? (
              <Card className="bg-card border-border">
                <CardContent className="py-8 text-center">
                  <p className="text-muted-foreground">No data yet. Add your first entry!</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {dataList.map((data) => (
                  <Card key={data.id.toString()} className="bg-card border-border">
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <CardDescription className="text-muted-foreground">
                            ID: {data.id.toString()} | {new Date(data.createdAt).toLocaleString()}
                          </CardDescription>
                        </div>
                        <Button
                          onClick={() => handleDeleteData(data.id)}
                          variant="ghost"
                          size="sm"
                          className="text-destructive hover:bg-destructive/10"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <pre className="bg-background text-foreground p-4 rounded overflow-auto text-sm font-mono">
                        {JSON.stringify(data.data, null, 2)}
                      </pre>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
