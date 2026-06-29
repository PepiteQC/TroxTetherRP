import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

const API = "/api";

export type ExecuteResult = {
  id: string;
  code: string;
  language: string;
  output: string;
  error?: string;
  success: boolean;
  duration: number;
  timestamp: number;
};

export type Agent = {
  id: string;
  name: string;
  role: string;
  status: "idle" | "busy" | "error";
  color: string;
  description: string;
  completedCount: number;
  taskCount: number;
};

export type Snippet = {
  id: string;
  title: string;
  code: string;
  language: string;
  tags: string[];
  createdAt: string;
};

export type Task = {
  id: string;
  agentId: string;
  agentName?: string;
  title: string;
  mission: string;
  priority: "low" | "normal" | "high" | "critical";
  status: "pending" | "in_progress" | "completed" | "rejected" | "needs_correction";
  context?: string;
  input?: string;
  expectedOutput?: string;
  rules?: string[];
  dependencies?: string[];
  createdAt: string;
  updatedAt: string;
};

export type LabStats = {
  totalSnippets: number;
  totalExecutions: number;
  successRate: number;
  avgDuration: number;
  recentExecutions: ExecuteResult[];
};

async function apiFetch<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(API + url, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || "HTTP " + res.status);
  }
  return res.json();
}

export function useHealthCheck() {
  return useQuery({
    queryKey: ["health"],
    queryFn: () => apiFetch<{ status: string }>("/health"),
    refetchInterval: 15000,
  });
}

export function useListAgents(options?: { query?: Record<string, unknown> }) {
  return useQuery({
    queryKey: ["agents"],
    queryFn: async () => {
      const data = await apiFetch<any>("/brain/status");
      if (data.agents) return data.agents as Agent[];
      if (data.agentList) return data.agentList as Agent[];
      const agentData = await apiFetch<any>("/agent");
      if (agentData.agents) return agentData.agents as Agent[];
      return [];
    },
    refetchInterval: 5000,
    ...(options?.query || {}),
  });
}

export function getListAgentsQueryKey() {
  return ["agents"];
}

export function useExecuteCode() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (vars: { data: { code: string; language: string; timeout?: number } }) =>
      apiFetch<ExecuteResult>("/lab/execute", {
        method: "POST",
        body: JSON.stringify(vars.data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["lab-stats"] });
    },
  });
}

export function useListSnippets() {
  return useQuery({
    queryKey: ["snippets"],
    queryFn: () => apiFetch<Snippet[]>("/snippets"),
    refetchInterval: 10000,
  });
}

export function useGetSnippet(id: string, options?: { query?: { enabled: boolean; queryKey: string[] } }) {
  return useQuery({
    queryKey: ["snippet", id],
    queryFn: () => apiFetch<Snippet>("/snippets/" + id),
    enabled: !!id && (options?.query?.enabled ?? true),
    ...(options?.query || {}),
  });
}

export function getGetSnippetQueryKey(id: string) {
  return ["snippet", id];
}

export function useCreateSnippet() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (vars: { data: { title: string; code: string; language: string; tags: string[] } }) =>
      apiFetch<Snippet>("/snippets", {
        method: "POST",
        body: JSON.stringify(vars.data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["snippets"] });
    },
  });
}

export function useDeleteSnippet() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (vars: { id: string }) =>
      apiFetch("/snippets/" + vars.id, { method: "DELETE" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["snippets"] });
    },
  });
}

export function useListTasks(filters?: { agent?: string; status?: string }) {
  const params = new URLSearchParams();
  if (filters?.agent && filters.agent !== "all") params.set("agent", filters.agent);
  if (filters?.status && filters.status !== "all") params.set("status", filters.status);
  const qs = params.toString();
  return useQuery({
    queryKey: ["tasks", filters?.agent || "all", filters?.status || "all"],
    queryFn: () => apiFetch<Task[]>("/tasks" + (qs ? "?" + qs : "")),
    refetchInterval: 5000,
  });
}

export function getListTasksQueryKey(options?: { agent?: string; status?: string }) {
  return ["tasks", options?.agent || "all", options?.status || "all"];
}

export function useCreateTask() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (vars: { data: Partial<Task> }) =>
      apiFetch<Task>("/tasks", {
        method: "POST",
        body: JSON.stringify(vars.data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
    },
  });
}

export function useUpdateTask() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (vars: { id: string; data: Partial<Task> }) =>
      apiFetch<Task>("/tasks/" + vars.id, {
        method: "PATCH",
        body: JSON.stringify(vars.data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
    },
  });
}

export function useDeleteTask() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (vars: { id: string }) =>
      apiFetch("/tasks/" + vars.id, { method: "DELETE" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
    },
  });
}

export function useGetLabStats(options?: { query?: Record<string, unknown> }) {
  return useQuery({
    queryKey: ["lab-stats"],
    queryFn: () => apiFetch<LabStats>("/lab/stats"),
    refetchInterval: 5000,
    ...(options?.query || {}),
  });
}

export function getGetLabStatsQueryKey() {
  return ["lab-stats"];
}
// ✅ ADD THIS at the bottom of index.ts
export function useUpdateTaskStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (vars: { id: string; status: Task["status"] }) =>
      apiFetch<Task>("/tasks/" + vars.id, {
        method: "PATCH",
        body: JSON.stringify({ status: vars.status }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
    },
  });
}
// ✅ Added missing export
