import { useState } from "react";
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "@/components/ui/resizable";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import Scene from "@/components/3d/Scene";
import { Play, Save } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function Lab() {
  const [code, setCode] = useState('console.log("Hello TroxT!");');
  const [language, setLanguage] = useState("javascript");
  const [output, setOutput] = useState("");
  const { toast } = useToast();

  const handleRun = () => {
    try {
      const logs: string[] = [];
      const fakeConsole = { log: (...args: any[]) => logs.push(args.join(" ")) };
      new Function("console", code)(fakeConsole);
      setOutput(logs.join("\n") || "Execution finished.");
    } catch (e: any) {
      setOutput(`ERROR: ${e.message}`);
      toast({ title: "Execution Failed", description: e.message, variant: "destructive" });
    }
  };

  const handleSave = () => {
    const title = prompt("Snippet title:");
    if (!title) return;
    const snippets = JSON.parse(localStorage.getItem("troxt-snippets") || "[]");
    snippets.push({ id: Date.now().toString(), title, code, language });
    localStorage.setItem("troxt-snippets", JSON.stringify(snippets));
    toast({ title: "Snippet Saved" });
  };

  return (
    <ResizablePanelGroup direction="horizontal" className="w-full h-full rounded-none border-none">
      <ResizablePanel defaultSize={40} minSize={25} className="flex flex-col h-full bg-black">
        <div className="flex items-center justify-between p-2 border-b border-border bg-card">
          <Select value={language} onValueChange={setLanguage}>
            <SelectTrigger className="w-[180px] font-mono uppercase bg-black text-primary border-primary">
              <SelectValue placeholder="Language" />
            </SelectTrigger>
            <SelectContent className="font-mono bg-black border-primary">
              <SelectItem value="javascript">JAVASCRIPT</SelectItem>
              <SelectItem value="typescript">TYPESCRIPT</SelectItem>
            </SelectContent>
          </Select>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={handleSave}
              className="font-mono text-xs border-primary text-primary hover:bg-primary hover:text-black">
              <Save className="w-3 h-3 mr-2" /> SAVE
            </Button>
            <Button size="sm" onClick={handleRun}
              className="font-mono text-xs bg-primary text-black hover:bg-primary/80">
              <Play className="w-3 h-3 mr-2 fill-current" /> EXECUTE
            </Button>
          </div>
        </div>
        <Textarea value={code} onChange={(e) => setCode(e.target.value)}
          className="flex-1 resize-none bg-black text-primary font-mono text-sm border-none p-4 focus-visible:ring-0 rounded-none leading-relaxed"
          placeholder="// Enter your code..." spellCheck={false} />
        <div className="h-64 border-t border-border flex flex-col bg-black">
          <div className="px-3 py-1 bg-card border-b border-border text-xs font-mono text-muted-foreground uppercase">
            Terminal Output
          </div>
          <div className="flex-1 p-4 font-mono text-sm overflow-auto text-primary whitespace-pre-wrap">
            {output || "> Ready."}
          </div>
        </div>
      </ResizablePanel>
      <ResizableHandle className="w-1 bg-border hover:bg-primary transition-colors" />
      <ResizablePanel defaultSize={60}>
        <Scene executions={[]} />
      </ResizablePanel>
    </ResizablePanelGroup>
  );
}
