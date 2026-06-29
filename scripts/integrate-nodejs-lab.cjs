const fs = require("fs");
const path = "C:/troxtetherworld/src/App.tsx";
let content = fs.readFileSync(path, "utf8");

const importLine = "import NodeJSLab from './components/NodeJSLab';\nimport SceneCreator from './components/SceneCreator';";

if (content.includes("import NodeJSLab")) {
  console.log("Already integrated, skipping");
  process.exit(0);
}

// 1. Add import
content = content.replace("import SceneCreator from './components/SceneCreator';", importLine);

// 2. Add 'nodejs-lab' to view state type
content = content.replace(
  "'scene-creator'>('landing')",
  "'scene-creator' | 'nodejs-lab'>('landing')"
);

// 3. Add nav button after "Scene 3D" button
const navButton = [
  '',
  "            <button",
  "              onClick={() => setView('nodejs-lab')}",
  "              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer select-none flex items-center gap-1.5 ${",
  "                view === 'nodejs-lab' ? 'bg-[#00ff41] text-black shadow-lg shadow-[#00ff41]/20' : 'text-slate-400 hover:text-slate-200'",
  "              }`}",
  '            >',
  '              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>',
  "              Télémétrie",
  "            </button>"
].join("\n");

content = content.replace(
  "Scene 3D\n            </button>",
  "Scene 3D\n            </button>" + navButton
);

// 4. Add view rendering
const nodejsLabView = [
  "",
  "        {/* NODEJS-LAB TÉLÉMÉTRIE */}",
  "        {view === 'nodejs-lab' && (",
  '          <div className="w-full h-full pt-[62px]">',
  "            <NodeJSLab />",
  "          </div>",
  "        )}"
].join("\n");

content = content.replace(
  "{view === 'scene-creator' && (",
  nodejsLabView + "\n        {view === 'scene-creator' && ("
);

fs.writeFileSync(path, content, "utf8");
console.log("NodeJSLab integrated in App.tsx successfully");

