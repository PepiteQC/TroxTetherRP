import { Link, useLocation } from "wouter";
import { Terminal, Library, Activity, Network, ListTodo } from "lucide-react";
import { useHealthCheck } from "@workspace/api-client-react";

export function Sidebar() {
  const [location] = useLocation();
  const { data: health } = useHealthCheck();

  const links = [
    { href: "/", label: "Lab Workspace", icon: Terminal },
    { href: "/snippets", label: "Snippets", icon: Library },
    { href: "/brain", label: "Brain Network", icon: Network },
    { href: "/tasks", label: "Task Queue", icon: ListTodo },
    { href: "/stats", label: "Stats & Metrics", icon: Activity },
  ];

  return (
    <div className="w-64 border-r border-border bg-sidebar flex flex-col h-full">
      <div className="p-4 border-b border-border flex items-center gap-2 text-primary font-mono">
        <Network className="w-6 h-6 animate-pulse" />
        <span className="font-bold tracking-wider">TROXT.BRAIN</span>
      </div>
      
      <nav className="flex-1 p-4 space-y-2">
        {links.map((link) => {
          const active = location === link.href;
          return (
            <Link key={link.href} href={link.href} className={`flex items-center gap-3 px-3 py-2 text-sm font-mono uppercase tracking-wider transition-colors duration-200 border ${active ? "bg-primary text-primary-foreground border-primary" : "text-muted-foreground border-transparent hover:border-primary/50 hover:text-primary"}`}>
              <link.icon className="w-4 h-4" />
              {link.label}
            </Link>
          );
        })}
      </nav>

      <div className="p-4 border-t border-border text-xs font-mono">
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground">SYS.STATUS</span>
          <span className={health ? "text-primary" : "text-destructive animate-pulse"}>
            {health ? "ONLINE" : "OFFLINE"}
          </span>
        </div>
      </div>
    </div>
  );
}
