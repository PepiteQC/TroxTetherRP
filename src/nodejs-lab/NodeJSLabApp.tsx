import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@nodelab/components/ui/toaster";
import { TooltipProvider } from "@nodelab/components/ui/tooltip";
import NotFound from "@nodelab/pages/not-found";
import AppLayout from "@nodelab/components/layout/AppLayout";
import Lab from "@nodelab/pages/Lab";
import Snippets from "@nodelab/pages/Snippets";
import Stats from "@nodelab/pages/Stats";
import Brain from "@nodelab/pages/Brain";
import Tasks from "@nodelab/pages/Tasks";

const queryClient = new QueryClient();

function Router() {
  return (
    <AppLayout>
      <Switch>
        <Route path="/" component={Lab} />
        <Route path="/snippets" component={Snippets} />
        <Route path="/brain" component={Brain} />
        <Route path="/tasks" component={Tasks} />
        <Route path="/stats" component={Stats} />
        <Route component={NotFound} />
      </Switch>
    </AppLayout>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <Router />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
