import { useQuery } from "@tanstack/react-query";
import Scene from "@/components/3d/Scene";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Activity, Database, Clock, Percent } from "lucide-react";

function useServerStats() {
  return useQuery({
    queryKey: ["server-stats"],
    queryFn: async () => {
      const [health, metrics] = await Promise.all([
        fetch("http://localhost:5000/api/health").then(r => r.json()),
        fetch("http://localhost:5000/api/admin/metrics").then(r => r.json()),
      ]);
      return {
        players:   health.players ?? 0,
        entities:  metrics.entities ?? 0,
        uptime:    metrics.uptime ?? 0,
        world:     health.world?.name ?? "TroxT City",
      };
    },
    refetchInterval: 5000,
  });
}

export default function Stats() {
  const { data: stats } = useServerStats();

  const uptimeStr = stats
    ? `${Math.floor(stats.uptime / 60000)}m`
    : "---";

  return (
    <div className="relative h-full w-full bg-black overflow-hidden">
      <div className="absolute inset-0 opacity-40 mix-blend-screen pointer-events-none">
        <Scene executions={[]} />
      </div>
      <div className="relative z-10 p-8 h-full overflow-auto">
        <div className="max-w-6xl mx-auto space-y-8">
          <header className="space-y-2">
            <h1 className="text-3xl font-mono text-primary font-bold tracking-widest uppercase">System Telemetry</h1>
            <p className="text-muted-foreground font-mono text-sm uppercase">TroxT Server metrics — live.</p>
          </header>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <MetricCard title="World"     value={stats?.world    ?? "---"} icon={<Database className="w-4 h-4" />} />
            <MetricCard title="Players"   value={stats?.players  ?? "---"} icon={<Activity  className="w-4 h-4" />} />
            <MetricCard title="Entities"  value={stats?.entities ?? "---"} icon={<Percent   className="w-4 h-4" />} />
            <MetricCard title="Uptime"    value={uptimeStr}                icon={<Clock     className="w-4 h-4" />} />
          </div>
          <div className="mt-12 border border-border/50 p-6 font-mono text-sm text-muted-foreground">
            <p className="text-primary mb-2 uppercase tracking-wider">// Serveur TroxT RP</p>
            <p>→ HTTP  : http://localhost:5000</p>
            <p>→ WS    : ws://localhost:5000</p>
            <p>→ Brain : /api/brain/status</p>
            <p>→ Eye   : /api/brain/thirdeye</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function MetricCard({ title, value, icon }: { title: string; value: string | number; icon: React.ReactNode }) {
  return (
    <Card className="bg-black/60 backdrop-blur border-border/50">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-mono text-muted-foreground font-medium uppercase tracking-wider">{title}</CardTitle>
        <div className="text-primary opacity-50">{icon}</div>
      </CardHeader>
      <CardContent>
        <div className="text-3xl font-mono text-primary font-bold">{value}</div>
      </CardContent>
    </Card>
  );
}
