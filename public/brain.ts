import { Router, type IRouter } from "express";
import { randomUUID } from "crypto";
import { db, agentsTable, taskPacketsTable } from "@workspace/db";
import { eq, desc, count, and } from "drizzle-orm";
import {
  GetAgentParams,
  GetAgentResponse,
  ListAgentsResponse,
  CreateTaskBody,
  UpdateTaskStatusBody,
  GetTaskParams,
  DeleteTaskParams,
  UpdateTaskStatusParams,
  ListTasksQueryParams,
  GetTaskResponse,
  ListTasksResponse,
  GetBrainStatsResponse,
} from "@workspace/api-zod";

const router: IRouter = Router();

// ─── Agents ────────────────────────────────────────────────────────────────

router.get("/brain/agents", async (_req, res): Promise<void> => {
  const agents = await db.select().from(agentsTable).orderBy(agentsTable.name);
  res.json(ListAgentsResponse.parse(agents));
});

router.get("/brain/agents/:id", async (req, res): Promise<void> => {
  const params = GetAgentParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ message: params.error.message });
    return;
  }
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const [agent] = await db.select().from(agentsTable).where(eq(agentsTable.id, raw));
  if (!agent) {
    res.status(404).json({ message: "Agent not found" });
    return;
  }
  res.json(GetAgentResponse.parse(agent));
});

// ─── Tasks ─────────────────────────────────────────────────────────────────

router.get("/brain/tasks", async (req, res): Promise<void> => {
  const query = ListTasksQueryParams.safeParse(req.query);
  if (!query.success) {
    res.status(400).json({ message: query.error.message });
    return;
  }

  const { agentId, status } = query.data;

  const conditions = [];
  if (agentId) conditions.push(eq(taskPacketsTable.agentId, agentId));
  if (status) conditions.push(eq(taskPacketsTable.status, status as any));

  const tasks = await db
    .select()
    .from(taskPacketsTable)
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(desc(taskPacketsTable.createdAt));

  res.json(ListTasksResponse.parse(tasks));
});

router.post("/brain/tasks", async (req, res): Promise<void> => {
  const parsed = CreateTaskBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ message: parsed.error.message });
    return;
  }

  const [agent] = await db
    .select()
    .from(agentsTable)
    .where(eq(agentsTable.id, parsed.data.agentId));

  if (!agent) {
    res.status(404).json({ message: "Agent not found" });
    return;
  }

  const id = randomUUID();
  const now = new Date();

  const [task] = await db
    .insert(taskPacketsTable)
    .values({
      id,
      title: parsed.data.title,
      agentId: parsed.data.agentId,
      agentName: agent.name,
      mission: parsed.data.mission,
      context: parsed.data.context,
      input: parsed.data.input,
      expectedOutput: parsed.data.expectedOutput,
      rules: parsed.data.rules ?? [],
      validation: parsed.data.validation ?? "",
      priority: (parsed.data.priority ?? "normal") as any,
      dependencies: parsed.data.dependencies ?? [],
      status: "pending",
      createdAt: now,
      updatedAt: now,
    })
    .returning();

  await db
    .update(agentsTable)
    .set({ taskCount: agent.taskCount + 1, status: "busy" })
    .where(eq(agentsTable.id, agent.id));

  res.status(201).json(GetTaskResponse.parse(task));
});

router.get("/brain/tasks/:id", async (req, res): Promise<void> => {
  const params = GetTaskParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ message: params.error.message });
    return;
  }
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const [task] = await db
    .select()
    .from(taskPacketsTable)
    .where(eq(taskPacketsTable.id, raw));
  if (!task) {
    res.status(404).json({ message: "Task not found" });
    return;
  }
  res.json(GetTaskResponse.parse(task));
});

router.patch("/brain/tasks/:id", async (req, res): Promise<void> => {
  const params = UpdateTaskStatusParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ message: params.error.message });
    return;
  }
  const body = UpdateTaskStatusBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ message: body.error.message });
    return;
  }
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;

  const [existing] = await db
    .select()
    .from(taskPacketsTable)
    .where(eq(taskPacketsTable.id, raw));

  if (!existing) {
    res.status(404).json({ message: "Task not found" });
    return;
  }

  const updates: Record<string, any> = { updatedAt: new Date() };
  if (body.data.status) updates.status = body.data.status;
  if (body.data.result !== undefined) updates.result = body.data.result;
  if (body.data.correctionNote !== undefined) updates.correctionNote = body.data.correctionNote;

  const [updated] = await db
    .update(taskPacketsTable)
    .set(updates)
    .where(eq(taskPacketsTable.id, raw))
    .returning();

  // Update agent status if task completed
  if (body.data.status === "completed") {
    const [agent] = await db
      .select()
      .from(agentsTable)
      .where(eq(agentsTable.id, existing.agentId));
    if (agent) {
      const remaining = await db
        .select()
        .from(taskPacketsTable)
        .where(
          and(
            eq(taskPacketsTable.agentId, agent.id),
            eq(taskPacketsTable.status, "pending")
          )
        );
      await db
        .update(agentsTable)
        .set({
          completedCount: agent.completedCount + 1,
          status: remaining.length === 0 ? "idle" : "busy",
        })
        .where(eq(agentsTable.id, agent.id));
    }
  }

  res.json(GetTaskResponse.parse(updated));
});

router.delete("/brain/tasks/:id", async (req, res): Promise<void> => {
  const params = DeleteTaskParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ message: params.error.message });
    return;
  }
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const [deleted] = await db
    .delete(taskPacketsTable)
    .where(eq(taskPacketsTable.id, raw))
    .returning();
  if (!deleted) {
    res.status(404).json({ message: "Task not found" });
    return;
  }
  res.sendStatus(204);
});

// ─── Stats ─────────────────────────────────────────────────────────────────

router.get("/brain/stats", async (_req, res): Promise<void> => {
  const [totalAgents] = await db.select({ count: count() }).from(agentsTable);
  const [busyAgents] = await db
    .select({ count: count() })
    .from(agentsTable)
    .where(eq(agentsTable.status, "busy"));
  const [totalTasks] = await db.select({ count: count() }).from(taskPacketsTable);
  const [pending] = await db
    .select({ count: count() })
    .from(taskPacketsTable)
    .where(eq(taskPacketsTable.status, "pending"));
  const [completed] = await db
    .select({ count: count() })
    .from(taskPacketsTable)
    .where(eq(taskPacketsTable.status, "completed"));
  const [rejected] = await db
    .select({ count: count() })
    .from(taskPacketsTable)
    .where(eq(taskPacketsTable.status, "rejected"));

  const agents = await db.select().from(agentsTable);
  const tasksByAgent = agents.map((a) => ({
    agentId: a.id,
    agentName: a.name,
    count: a.taskCount,
  }));

  res.json(
    GetBrainStatsResponse.parse({
      totalAgents: totalAgents?.count ?? 0,
      activeAgents: busyAgents?.count ?? 0,
      totalTasks: totalTasks?.count ?? 0,
      pendingTasks: pending?.count ?? 0,
      completedTasks: completed?.count ?? 0,
      rejectedTasks: rejected?.count ?? 0,
      tasksByAgent,
    })
  );
});

export default router;
