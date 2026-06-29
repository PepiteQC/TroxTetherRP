import { lazy, Suspense } from "react";

const NodeJSLabApp = lazy(() => import("@nodelab/NodeJSLabApp"));

export default function NodeJSLab() {
  return (
    <div className="w-full h-full flex flex-col bg-background">
      <Suspense
        fallback={
          <div className="flex-1 flex items-center justify-center bg-black">
            <div className="text-center space-y-4">
              <div className="w-8 h-8 border-2 border-[#00ff41] border-t-transparent rounded-full animate-spin mx-auto" />
              <p className="text-[10px] font-mono text-[#00ff41]/60 uppercase tracking-widest">
                Initialisation NodeJS Lab...
              </p>
            </div>
          </div>
        }
      >
        <NodeJSLabApp />
      </Suspense>
    </div>
  );
}
