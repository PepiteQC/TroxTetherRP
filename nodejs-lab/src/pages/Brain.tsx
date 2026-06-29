import { useListAgents, getListAgentsQueryKey } from "@workspace/api-client-react";
import AgentNetwork from "@/components/3d/AgentNetwork";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PlusCircle, Loader2 } from "lucide-react";

export default function Brain() {
  const { data: agents, isLoading } = useListAgents({
    query: {
      queryKey: getListAgentsQueryKey(),
      refetchInterval: 5000,
    }
  });

  return (
    <div className="h-full w-full flex flex-col bg-black overflow-hidden font-mono">
      {/* Top half: 3D Visualization */}
      <div className="h-1/2 w-full border-b border-border bg-black relative">
        <AgentNetwork agents={agents || []} />
      </div>

      {/* Bottom half: Scrollable Agent Cards */}
      <div className="h-1/2 w-full overflow-auto p-6 bg-black/90">
        <div className="max-w-7xl mx-auto">
          <div className="flex justify-between items-end mb-6">
            <div>
              <h2 className="text-2xl text-primary font-bold tracking-widest uppercase">Agent Cluster</h2>
              <p className="text-muted-foreground text-sm uppercase">Active neural nodes in the network</p>
            </div>
          </div>

          {isLoading ? (
            <div className="flex justify-center p-12">
              <Loader2 className="w-8 h-8 text-primary animate-spin" />
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {agents?.map(agent => (
                <div key={agent.id} className="border border-border bg-card p-4 flex flex-col gap-4 relative overflow-hidden group">
                  <div className="absolute top-0 left-0 w-full h-1" style={{ backgroundColor: agent.color || '#00ff41' }} />
                  
                  <div className="flex justify-between items-start">
                    <div className="flex items-center gap-2">
                      <div 
                        className={`w-3 h-3 rounded-full ${agent.status === 'busy' ? 'animate-pulse' : ''}`} 
                        style={{ backgroundColor: agent.color || '#00ff41', boxShadow: `0 0 8px ${agent.color || '#00ff41'}` }} 
                      />
                      <h3 className="font-bold text-lg text-foreground tracking-wider uppercase">{agent.name}</h3>
                    </div>
                    <Badge variant="outline" className="uppercase text-[10px] tracking-widest" style={{ color: agent.color || '#00ff41', borderColor: `${agent.color}50` }}>
                      {agent.role}
                    </Badge>
                  </div>

                  <div className="flex items-center justify-between text-xs">
                    <Badge variant={agent.status === 'idle' ? 'secondary' : 'default'} className="uppercase">
                      {agent.status}
                    </Badge>
                    <div className="text-muted-foreground">
                      Tasks: <span className="text-primary">{agent.completedCount}/{agent.taskCount}</span>
                    </div>
                  </div>

                  <p className="text-sm text-muted-foreground line-clamp-2 h-10">
                    {agent.description}
                  </p>

                  <div className="pt-2 border-t border-border mt-auto">
                    <Link href={`/tasks?agent=${agent.id}`}>
                      <Button variant="outline" className="w-full text-xs font-mono uppercase tracking-widest hover:bg-primary hover:text-black hover:border-primary border-primary/50 text-primary transition-all">
                        <PlusCircle className="w-3 h-3 mr-2" />
                        New Task
                      </Button>
                    </Link>
                  </div>
                </div>
              ))}
              {(!agents || agents.length === 0) && (
                <div className="col-span-full text-center p-12 text-muted-foreground border border-dashed border-border uppercase">
                  No active agents detected in cluster.
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}