export interface ExecuteResult {
    id: string;
    agentId: string;
    status: "pending" | "running" | "completed" | "failed";
    result?: unknown;
    error?: string;
    success: boolean;
    duration: number;
    createdAt: string;
    updatedAt: string;
}

export interface Agent {
    id: string;
    name: string;
    color: string;
    status: "idle" | "active" | "error";
    type: string;
    health?: number;
}

export interface Task {
    id: string;
    agentId: string;
    description: string;
    status: "pending" | "running" | "completed" | "failed";
    priority: "CRITIQUE" | "HAUTE" | "NORMALE" | "BASSE";
    createdAt: string;
}

export function useListAgents(params?: any, options?: any) { return { data: [], isLoading: false } as any; }
export function useListTasks(params?: any, options?: any) { return { data: [], isLoading: false } as any; }
export function useCreateTask() { return { mutate: (t: any) => {} } as any; }
export function useUpdateTaskStatus() { return { mutate: (id: string, s: any) => {} } as any; }
export function useDeleteTask() { return { mutate: (id: string) => {} } as any; }
export function getListTasksQueryKey(params?: any) { return ['tasks', params] as any; }
export function getListAgentsQueryKey(params?: any) { return ['agents', params] as any; }

export function createClient(config: { baseUrl: string }): {
    executeAgent(agentId: string, task: string): Promise<ExecuteResult>;
    getAgents(): Promise<Agent[]>;
    getTasks(): Promise<Task[]>;
};
