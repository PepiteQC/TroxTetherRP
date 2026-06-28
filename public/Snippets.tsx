import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Trash2, TerminalSquare } from "lucide-react";
import { useLocation } from "wouter";
import { Badge } from "@/components/ui/badge";

interface Snippet {
  id: string;
  title: string;
  code: string;
  language: string;
  createdAt: string;
}

export default function Snippets() {
  const [snippets, setSnippets] = useState<Snippet[]>([]);
  const [, setLocation] = useLocation();

  useEffect(() => {
    const stored = JSON.parse(localStorage.getItem("troxt-snippets") || "[]");
    setSnippets(stored);
  }, []);

  const handleDelete = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = snippets.filter(s => s.id !== id);
    setSnippets(updated);
    localStorage.setItem("troxt-snippets", JSON.stringify(updated));
  };

  return (
    <div className="p-8 h-full overflow-auto bg-background">
      <div className="max-w-6xl mx-auto space-y-6">
        <header className="space-y-2">
          <h1 className="text-3xl font-mono text-primary font-bold tracking-widest uppercase">Data Core / Snippets</h1>
          <p className="text-muted-foreground font-mono text-sm uppercase">Archived code sequences.</p>
        </header>
        {snippets.length === 0 ? (
          <div className="text-center py-20 border border-border border-dashed font-mono">
            <p className="text-muted-foreground uppercase">No data found in core.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {snippets.map(snip => (
              <Card key={snip.id}
                className="bg-black border-border hover:border-primary transition-colors cursor-pointer group flex flex-col"
                onClick={() => setLocation(`/?id=${snip.id}`)}>
                <CardHeader className="pb-2 border-b border-border/50">
                  <div className="flex justify-between items-start">
                    <CardTitle className="font-mono text-primary truncate pr-4">{snip.title}</CardTitle>
                    <Button variant="ghost" size="icon"
                      className="h-6 w-6 opacity-0 group-hover:opacity-100 text-destructive"
                      onClick={(e) => handleDelete(snip.id, e)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="flex gap-2 pt-2">
                    <Badge variant="outline" className="text-[10px] font-mono border-primary/30 text-primary">
                      {snip.language}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="pt-4 flex-1">
                  <pre className="text-xs font-mono text-muted-foreground line-clamp-4">{snip.code}</pre>
                </CardContent>
                <CardFooter className="pb-4 text-xs font-mono text-muted-foreground flex justify-between opacity-0 group-hover:opacity-100 transition-opacity">
                  <span>LOAD SEQUENCE</span>
                  <TerminalSquare className="w-4 h-4 text-primary" />
                </CardFooter>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
