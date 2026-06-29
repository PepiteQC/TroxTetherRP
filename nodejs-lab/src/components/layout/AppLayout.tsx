import { ReactNode } from "react";
import { Sidebar } from "../Sidebar";

export default function AppLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex h-screen w-full overflow-hidden bg-background text-foreground font-sans">
      <Sidebar />
      <main className="flex-1 relative overflow-hidden flex flex-col">
        {children}
      </main>
    </div>
  );
}
