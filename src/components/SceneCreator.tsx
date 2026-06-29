import { lazy, Suspense } from 'react';

import "@scene/scene.css";
const SceneCreatorApp = lazy(() => import('@scene/SceneCreatorApp'));

export default function SceneCreator() {
  return (
    <div className="w-full h-full">
      <Suspense fallback={
        <div className="w-full h-full flex items-center justify-center bg-[#08080e]">
          <div className="text-center space-y-4">
            <div className="w-8 h-8 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest">
              Chargement Scene-Creator...
            </p>
          </div>
        </div>
      }>
        <SceneCreatorApp />
      </Suspense>
    </div>
  );
}
