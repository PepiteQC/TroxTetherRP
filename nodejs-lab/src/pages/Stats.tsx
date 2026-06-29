import { useGetLabStats, getGetLabStatsQueryKey } from "@workspace/api-client-react";
import Scene from "@/components/3d/Scene";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Activity, Database, Clock, Percent } from "lucide-react";

export default function Stats() {
  const { data: stats } = useGetLabStats({
    query: {
      queryKey: getGetLabStatsQueryKey(),
      refetchInterval: 5000,
    }
  });

  return (
    <div className="relative h-full w-full bg-black overflow-hidden">
      {/* 3D Background */}
      <div className="absolute inset-0 opacity-40 mix-blend-screen pointer-events-none">
        <Scene executions={stats?.recentExecutions || []} />
      </div>

      <div className="relative z-10 p-8 h-full overflow-auto">
        <div className="max-w-6xl mx-auto space-y-8">
          <header className="space-y-2">
            <h1 className="text-3xl font-mono text-primary font-bold tracking-widest uppercase">System Telemetry</h1>
            <p className="text-muted-foreground font-mono text-sm uppercase">Global execution metrics.</p>
          </header>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <MetricCard 
              title="Total Sequences" 
              value={stats?.totalSnippets ?? "---"} 
              icon={<Database className="w-4 h-4" />} 
            />
            <MetricCard 
              title="Executions" 
              value={stats?.totalExecutions ?? "---"} 
              icon={<Activity className="w-4 h-4" />} 
            />
            <MetricCard 
              title="Success Rate" 
              value={stats ? `${stats.successRate}%` : "---"} 
              icon={<Percent className="w-4 h-4" />} 
            />
            <MetricCard 
              title="Avg Duration" 
              value={stats ? `${Math.round(stats.avgDuration)}ms` : "---"} 
              icon={<Clock className="w-4 h-4" />} 
            />
          </div>

          <div className="mt-12 space-y-4">
            <h2 className="text-xl font-mono text-primary uppercase border-b border-primary/20 pb-2">Recent Execution Log</h2>
            <div className="space-y-2 font-mono text-sm">
              {stats?.recentExecutions.map(exe => (
                <div key={exe.id} className="flex items-center gap-4 p-3 border border-border bg-card/80 backdrop-blur">
                  <div className={`w-2 h-2 rounded-full ${exe.success ? "bg-primary shadow-[0_0_8px_var(--primary)]" : "bg-destructive shadow-[0_0_8px_var(--destructive)]"}`} />
                  <div className="text-muted-foreground flex-1 truncate">{exe.id.slice(0, 8)}</div>
                  <div className="text-muted-foreground">{exe.duration}ms</div>
                  <div className={exe.success ? "text-primary" : "text-destructive"}>
                    {exe.success ? "SUCCESS" : "ERROR"}
                  </div>
                </div>
              ))}
              {(!stats?.recentExecutions || stats.recentExecutions.length === 0) && (
                <div className="text-muted-foreground uppercase text-center p-8 border border-dashed border-border">
                  No recent execution data.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function MetricCard({ title, value, icon }: { title: string, value: string | number, icon: React.ReactNode }) {
  return (
    <Card className="bg-black/60 backdrop-blur border-border/50">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-mono text-muted-foreground font-medium uppercase tracking-wider">
          {title}
        </CardTitle>
        <div className="text-primary opacity-50">{icon}</div>
      </CardHeader>
      <CardContent>
        <div className="text-3xl font-mono text-primary font-bold">{value}</div>
      </CardContent>
    </Card>
  );
}
