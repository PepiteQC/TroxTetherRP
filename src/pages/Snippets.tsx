import { useListSnippets, useDeleteSnippet } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@nodelab/components/ui/card";
import { Button } from "@nodelab/components/ui/button";
import { Trash2, TerminalSquare } from "lucide-react";
import { useLocation } from "wouter";
import { Badge } from "@nodelab/components/ui/badge";

export default function Snippets() {
  const { data: snippets, isLoading, refetch } = useListSnippets();
  const deleteSnippet = useDeleteSnippet();
  const [, setLocation] = useLocation();

  const handleDelete = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    deleteSnippet.mutate({ id }, { onSuccess: () => refetch() });
  };

  const loadSnippet = (id: string) => {
    setLocation(`/?id=${id}`);
  };

  return (
    <div className="p-8 h-full overflow-auto bg-background">
      <div className="max-w-6xl mx-auto space-y-6">
        <header className="space-y-2">
          <h1 className="text-3xl font-mono text-primary font-bold tracking-widest uppercase">Data Core / Snippets</h1>
          <p className="text-muted-foreground font-mono text-sm uppercase">Archived code sequences.</p>
        </header>

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
             {[...Array(6)].map((_, i) => (
                <div key={i} className="h-48 border border-border bg-card animate-pulse" />
             ))}
          </div>
        ) : snippets?.length === 0 ? (
          <div className="text-center py-20 border border-border border-dashed font-mono">
            <p className="text-muted-foreground uppercase">No data found in core.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {snippets?.map(snip => (
              <Card 
                key={snip.id} 
                className="bg-black border-border hover:border-primary transition-colors cursor-pointer group flex flex-col"
                onClick={() => loadSnippet(snip.id)}
              >
                <CardHeader className="pb-2 border-b border-border/50">
                  <div className="flex justify-between items-start">
                    <CardTitle className="font-mono text-primary truncate pr-4">{snip.title}</CardTitle>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-6 w-6 opacity-0 group-hover:opacity-100 text-destructive hover:text-destructive hover:bg-destructive/10"
                      onClick={(e) => handleDelete(snip.id, e)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="flex gap-2 pt-2">
                    <Badge variant="outline" className="text-[10px] font-mono border-primary/30 text-primary">{snip.language}</Badge>
                  </div>
                </CardHeader>
                <CardContent className="pt-4 flex-1">
                  <pre className="text-xs font-mono text-muted-foreground line-clamp-4 overflow-hidden">
                    {snip.code}
                  </pre>
                </CardContent>
                <CardFooter className="pt-0 pb-4 text-xs font-mono text-muted-foreground flex justify-between items-center opacity-0 group-hover:opacity-100 transition-opacity">
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
