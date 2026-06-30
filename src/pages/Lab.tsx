import { useState, useEffect } from "react";
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "@nodelab/components/ui/resizable";
import { Button } from "@nodelab/components/ui/button";
import { Textarea } from "@nodelab/components/ui/textarea";
import { useExecuteCode, useCreateSnippet, useGetSnippet, getGetSnippetQueryKey, type ExecuteResult } from "@workspace/api-client-react";
import Scene from "@nodelab/components/3d/Scene";
import { Play, Save, Loader2 } from "lucide-react";
import { useToast } from "@nodelab/hooks/use-toast";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@nodelab/components/ui/select";

export default function Lab() {
  const [code, setCode] = useState("console.log('Hello, Cyberpunk World!');");
  const [language, setLanguage] = useState<"javascript" | "typescript">("javascript");
  const [output, setOutput] = useState("");
  const [history, setHistory] = useState<ExecuteResult[]>([]);
  const { toast } = useToast();

  const executeCode = useExecuteCode();
  const createSnippet = useCreateSnippet();

  const snippetId = new URLSearchParams(window.location.search).get("id");
  const { data: snippetData } = useGetSnippet(snippetId || "", {
    query: {
      enabled: !!snippetId,
      queryKey: getGetSnippetQueryKey(snippetId || "")
    }
  });

  useEffect(() => {
    if (snippetData) {
      setCode(snippetData.code);
      setLanguage(snippetData.language as "javascript" | "typescript");
    } else {
      const params = new URLSearchParams(window.location.search);
      const snipCode = params.get("code");
      const snipLang = params.get("lang");
      if (snipCode) setCode(decodeURIComponent(snipCode));
      if (snipLang) setLanguage(snipLang as any);
    }
  }, [snippetData]);

  const handleRun = () => {
    executeCode.mutate(
      { data: { code, language, timeout: 5000 } },
      {
        onSuccess: (res) => {
          setOutput(res.output || res.error || "Execution finished.");
          setHistory(prev => [...prev, res].slice(-20)); // Keep last 20
        },
        onError: (err: any) => {
          setOutput(`SYSTEM ERROR: ${err.message}`);
          toast({ title: "Execution Failed", description: err.message, variant: "destructive" });
        }
      }
    );
  };

  const handleSave = () => {
    const title = prompt("Enter snippet title:", "Neon Routine");
    if (!title) return;
    createSnippet.mutate(
      { data: { title, code, language, tags: ["lab"] } },
      {
        onSuccess: () => toast({ title: "Snippet Saved", description: "Archived to data core." }),
        onError: () => toast({ title: "Save Failed", variant: "destructive" })
      }
    );
  };

  return (
    <ResizablePanelGroup direction="horizontal" className="w-full h-full rounded-none border-none">
      <ResizablePanel defaultSize={40} minSize={25} className="flex flex-col h-full bg-black">
        <div className="flex items-center justify-between p-2 border-b border-border bg-card">
          <Select value={language} onValueChange={(v: any) => setLanguage(v)}>
            <SelectTrigger className="w-[180px] font-mono uppercase bg-black text-primary border-primary">
              <SelectValue placeholder="Language" />
            </SelectTrigger>
            <SelectContent className="font-mono bg-black border-primary">
              <SelectItem value="javascript">JAVASCRIPT</SelectItem>
              <SelectItem value="typescript">TYPESCRIPT</SelectItem>
            </SelectContent>
          </Select>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={handleSave} disabled={createSnippet.isPending} className="font-mono text-xs border-primary text-primary hover:bg-primary hover:text-black">
              <Save className="w-3 h-3 mr-2" /> SAVE
            </Button>
            <Button size="sm" onClick={handleRun} disabled={executeCode.isPending} className="font-mono text-xs bg-primary text-black hover:bg-primary/80">
              {executeCode.isPending ? <Loader2 className="w-3 h-3 mr-2 animate-spin" /> : <Play className="w-3 h-3 mr-2 fill-current" />}
              EXECUTE
            </Button>
          </div>
        </div>
        
        <Textarea 
          value={code}
          onChange={(e) => setCode(e.target.value)}
          className="flex-1 resize-none bg-black text-primary font-mono text-sm border-none p-4 focus-visible:ring-0 focus-visible:ring-offset-0 rounded-none leading-relaxed"
          placeholder="// Enter your code sequence..."
          spellCheck={false}
        />

        <div className="h-64 border-t border-border flex flex-col bg-black">
          <div className="px-3 py-1 bg-card border-b border-border text-xs font-mono text-muted-foreground uppercase tracking-widest">
            Terminal Output
          </div>
          <div className="flex-1 p-4 font-mono text-sm overflow-auto text-primary whitespace-pre-wrap">
            {output || "> Ready."}
          </div>
        </div>
      </ResizablePanel>

      <ResizableHandle className="w-1 bg-border hover:bg-primary transition-colors" />

      <ResizablePanel defaultSize={60}>
        <Scene executions={history} />
      </ResizablePanel>
    </ResizablePanelGroup>
  );
}
