import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "@/components/ui/resizable";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Plus, Trash2, CheckCircle2, XCircle, AlertTriangle } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import {
  useListAgents,
  useListTasks,
  useCreateTask,
  useUpdateTaskStatus,
  useDeleteTask,
  getListTasksQueryKey,
  getListAgentsQueryKey
} from "@troxt/api-client";
import { format } from "date-fns";

const taskSchema = z.object({
  agentId: z.string().min(1, "Agent is required"),
  title: z.string().min(3, "Title is required"),
  mission: z.string().min(1, "Mission is required"),
  context: z.string().optional(),
  input: z.string().optional(),
  expectedOutput: z.string().min(1, "Expected output is required"),
  rules: z.string().optional(),
  validation: z.string().optional(),
  priority: z.enum(["low", "normal", "high", "critical"]),
  dependencies: z.string().optional(),
});

export default function Tasks() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [filterAgent, setFilterAgent] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");

  const { data: agents } = useListAgents();
  const taskParams = { agentId: filterAgent !== "all" ? filterAgent : undefined, status: filterStatus !== "all" ? filterStatus as any : undefined };
  const { data: tasks, isLoading: tasksLoading } = useListTasks(
    taskParams,
    { query: { queryKey: getListTasksQueryKey(taskParams), refetchInterval: 5000 } }
  );

  const createTask = useCreateTask();
  const updateTask = useUpdateTaskStatus();
  const deleteTask = useDeleteTask();

  const form = useForm<z.infer<typeof taskSchema>>({
    resolver: zodResolver(taskSchema),
    defaultValues: {
      agentId: new URLSearchParams(window.location.search).get("agent") || "",
      title: "",
      mission: "",
      context: "",
      input: "",
      expectedOutput: "",
      rules: "",
      validation: "",
      priority: "normal",
      dependencies: "",
    },
  });

  function onSubmit(values: z.infer<typeof taskSchema>) {
    createTask.mutate(
      {
        data: {
          ...values,
          rules: values.rules ? values.rules.split("\n").map(r => r.trim()).filter(Boolean) : [],
          dependencies: values.dependencies ? values.dependencies.split(",").map(d => d.trim()).filter(Boolean) : [],
        } as any,
      },
      {
        onSuccess: () => {
          toast({ title: "Task Dispatched", description: "Task has been added to the queue." });
          form.reset();
          queryClient.invalidateQueries({ queryKey: getListTasksQueryKey() });
        },
        onError: (err: any) => {
          toast({ title: "Dispatch Failed", description: err.message, variant: "destructive" });
        }
      }
    );
  }

  const handleUpdateStatus = (id: string, status: string) => {
    updateTask.mutate(
      { id, data: { status: status as any } },
      {
        onSuccess: () => {
          toast({ title: "Status Updated", description: `Task status changed to ${status}.` });
          queryClient.invalidateQueries({ queryKey: getListTasksQueryKey() });
        }
      }
    );
  };

  const handleDelete = (id: string) => {
    if (!confirm("Delete this task?")) return;
    deleteTask.mutate(
      { id },
      {
        onSuccess: () => {
          toast({ title: "Task Deleted" });
          queryClient.invalidateQueries({ queryKey: getListTasksQueryKey() });
        }
      }
    );
  };

  return (
    <ResizablePanelGroup direction="horizontal" className="w-full h-full rounded-none border-none bg-black font-mono">
      <ResizablePanel defaultSize={40} minSize={30} className="flex flex-col h-full border-r border-border">
        <div className="p-4 border-b border-border bg-card">
          <h2 className="text-xl text-primary font-bold tracking-widest uppercase">Dispatch Task</h2>
        </div>
        
        <div className="flex-1 overflow-auto p-4 custom-scrollbar">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField control={form.control} name="agentId" render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-muted-foreground uppercase text-xs">Target Agent</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger className="bg-black border-primary/50 text-primary">
                        <SelectValue placeholder="Select an agent" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent className="bg-black border-primary text-primary font-mono">
                      {agents?.map((a: any) => (
                        <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />

              <FormField control={form.control} name="title" render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-muted-foreground uppercase text-xs">Title</FormLabel>
                  <FormControl>
                    <Input {...field} className="bg-black border-primary/50 text-primary placeholder:text-primary/30" placeholder="e.g. Analyze Codebase" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              <FormField control={form.control} name="priority" render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-muted-foreground uppercase text-xs">Priority</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger className="bg-black border-primary/50 text-primary">
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent className="bg-black border-primary text-primary font-mono uppercase text-xs">
                      <SelectItem value="low">Low</SelectItem>
                      <SelectItem value="normal">Normal</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                      <SelectItem value="critical">Critical</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />

              <FormField control={form.control} name="mission" render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-muted-foreground uppercase text-xs">Mission</FormLabel>
                  <FormControl>
                    <Textarea {...field} className="bg-black border-primary/50 text-primary resize-none h-20 placeholder:text-primary/30" placeholder="What the agent must do..." />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              <div className="grid grid-cols-2 gap-4">
                <FormField control={form.control} name="context" render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-muted-foreground uppercase text-xs">Context (Optional)</FormLabel>
                    <FormControl>
                      <Textarea {...field} className="bg-black border-primary/50 text-primary resize-none placeholder:text-primary/30" />
                    </FormControl>
                  </FormItem>
                )} />
                <FormField control={form.control} name="input" render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-muted-foreground uppercase text-xs">Input Data (Optional)</FormLabel>
                    <FormControl>
                      <Textarea {...field} className="bg-black border-primary/50 text-primary resize-none placeholder:text-primary/30" />
                    </FormControl>
                  </FormItem>
                )} />
              </div>

              <FormField control={form.control} name="expectedOutput" render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-muted-foreground uppercase text-xs">Expected Output</FormLabel>
                  <FormControl>
                    <Textarea {...field} className="bg-black border-primary/50 text-primary resize-none h-16 placeholder:text-primary/30" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              <FormField control={form.control} name="rules" render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-muted-foreground uppercase text-xs">Rules (One per line)</FormLabel>
                  <FormControl>
                    <Textarea {...field} className="bg-black border-primary/50 text-primary resize-none h-20 placeholder:text-primary/30" />
                  </FormControl>
                </FormItem>
              )} />

              <Button type="submit" disabled={createTask.isPending} className="w-full font-mono uppercase tracking-widest bg-primary text-black hover:bg-primary/80">
                {createTask.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Plus className="w-4 h-4 mr-2" />}
                Dispatch Task
              </Button>
            </form>
          </Form>
        </div>
      </ResizablePanel>

      <ResizableHandle className="w-1 bg-border hover:bg-primary transition-colors" />

      <ResizablePanel defaultSize={60} className="flex flex-col h-full">
        <div className="p-4 border-b border-border bg-card flex items-center justify-between gap-4">
          <h2 className="text-xl text-primary font-bold tracking-widest uppercase">Task Queue</h2>
          
          <div className="flex gap-2">
            <Select value={filterAgent} onValueChange={setFilterAgent}>
              <SelectTrigger className="w-[150px] bg-black border-primary/50 text-primary text-xs uppercase tracking-wider h-8">
                <SelectValue placeholder="All Agents" />
              </SelectTrigger>
              <SelectContent className="bg-black border-primary text-primary font-mono text-xs uppercase">
                <SelectItem value="all">All Agents</SelectItem>
                {agents?.map((a: any) => (
                  <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-[150px] bg-black border-primary/50 text-primary text-xs uppercase tracking-wider h-8">
                <SelectValue placeholder="All Statuses" />
              </SelectTrigger>
              <SelectContent className="bg-black border-primary text-primary font-mono text-xs uppercase">
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="in_progress">In Progress</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
                <SelectItem value="needs_correction">Needs Correction</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="flex-1 overflow-auto p-4 space-y-3 custom-scrollbar bg-black/90">
          {tasksLoading ? (
            <div className="flex justify-center p-12">
              <Loader2 className="w-8 h-8 text-primary animate-spin" />
            </div>
          ) : tasks?.length === 0 ? (
            <div className="text-center p-12 text-muted-foreground border border-dashed border-border uppercase">
              No tasks found in queue.
            </div>
          ) : (
            tasks?.map((task: any) => {
              const agentColor = agents?.find((a: any) => a.id === task.agentId)?.color || "#00ff41";
              
              const priorityColors = {
                low: "border-muted text-muted-foreground",
                normal: "border-blue-500 text-blue-500",
                high: "border-amber-500 text-amber-500",
                critical: "border-red-500 text-red-500 shadow-[0_0_8px_rgba(239,68,68,0.5)]"
              };
              
              const statusColors = {
                pending: "bg-muted text-muted-foreground animate-pulse",
                in_progress: "bg-blue-500/20 text-blue-500 border border-blue-500/50",
                completed: "bg-green-500/20 text-green-500 border border-green-500/50",
                rejected: "bg-red-500/20 text-red-500 border border-red-500/50",
                needs_correction: "bg-amber-500/20 text-amber-500 border border-amber-500/50",
              };

              return (
                <div key={task.id} className="border border-border bg-card p-4 flex flex-col gap-3 relative">
                  <div className="flex justify-between items-start">
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-2 px-2 py-1 bg-black/50 border border-border rounded">
                        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: agentColor }} />
                        <span className="text-xs uppercase tracking-wider" style={{ color: agentColor }}>{task.agentName}</span>
                      </div>
                      <Badge variant="outline" className={`uppercase text-[10px] ${priorityColors[task.priority as keyof typeof priorityColors]}`}>
                        {task.priority} Priority
                      </Badge>
                      <Badge className={`uppercase text-[10px] ${statusColors[task.status as keyof typeof statusColors]}`}>
                        {task.status.replace("_", " ")}
                      </Badge>
                    </div>
                    <div className="text-[10px] text-muted-foreground uppercase">
                      {format(new Date(task.createdAt), 'MMM dd, HH:mm:ss')}
                    </div>
                  </div>

                  <div>
                    <h3 className="text-lg font-bold text-foreground mb-1">{task.title}</h3>
                    <p className="text-sm text-muted-foreground line-clamp-2">{task.mission}</p>
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-2 border-t border-border/50">
                    {task.status !== 'completed' && (
                      <Button size="sm" variant="outline" onClick={() => handleUpdateStatus(task.id, 'completed')} className="h-7 text-[10px] uppercase border-green-500/50 text-green-500 hover:bg-green-500/20">
                        <CheckCircle2 className="w-3 h-3 mr-1" /> Complete
                      </Button>
                    )}
                    {task.status !== 'needs_correction' && task.status !== 'completed' && (
                      <Button size="sm" variant="outline" onClick={() => handleUpdateStatus(task.id, 'needs_correction')} className="h-7 text-[10px] uppercase border-amber-500/50 text-amber-500 hover:bg-amber-500/20">
                        <AlertTriangle className="w-3 h-3 mr-1" /> Needs Correction
                      </Button>
                    )}
                    {task.status !== 'rejected' && task.status !== 'completed' && (
                      <Button size="sm" variant="outline" onClick={() => handleUpdateStatus(task.id, 'rejected')} className="h-7 text-[10px] uppercase border-red-500/50 text-red-500 hover:bg-red-500/20">
                        <XCircle className="w-3 h-3 mr-1" /> Reject
                      </Button>
                    )}
                    <Button size="icon" variant="outline" onClick={() => handleDelete(task.id)} className="h-7 w-7 border-destructive/50 text-destructive hover:bg-destructive/20 ml-2">
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </ResizablePanel>
    </ResizablePanelGroup>
  );
}



