import { useState, useCallback, useRef } from "react";
import * as THREE from "three";
import {
  Upload,
  RotateCw,
  Box,
  Eye,
  Video,
  Sun,
  Maximize2,
  Cpu,
  HelpCircle,
  FileCode,
  CheckCircle2,
  Compass,
  Zap,
} from "lucide-react";
import {
  FileModelViewer,
  ViewMode,
  EnvPreset,
  CameraPreset,
  CameraSettings,
  FileFormat,
  PRESET_POSITIONS,
} from "./FileModelViewer";

export function Import3DPanel() {
  const [fileUrl, setFileUrl] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [fileSize, setFileSize] = useState<string | null>(null);
  const [format, setFormat] = useState<FileFormat | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>("normal");
  const [targetPos, setTargetPos] = useState<THREE.Vector3 | null>(null);

  const [settings, setSettings] = useState<CameraSettings>({
    fov: 45,
    autoRotate: false,
    autoRotateSpeed: 1,
    damping: true,
    env: "sunset",
  });

  const controlsRef = useRef<any>(null);

  // File Upload handler
  const handleFileUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const extension = file.name.split(".").pop()?.toLowerCase();
    if (!extension || !["glb", "gltf", "obj", "stl"].includes(extension)) {
      alert("Format de fichier non supporté. Veuillez téléverser un fichier .glb, .gltf, .obj ou .stl");
      return;
    }

    // Revoke previous URL to prevent memory leak
    if (fileUrl) {
      URL.revokeObjectURL(fileUrl);
    }

    const url = URL.createObjectURL(file);
    setFileUrl(url);
    setFileName(file.name);
    setFormat(extension as FileFormat);

    // Format size for display
    const sizeInMB = (file.size / (1024 * 1024)).toFixed(2);
    setFileSize(`${sizeInMB} MB`);
    setTargetPos(null); // Reset target pos for new model
  }, [fileUrl]);

  // Handle Drag & Drop
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (!file) return;

    const extension = file.name.split(".").pop()?.toLowerCase();
    if (!extension || !["glb", "gltf", "obj", "stl"].includes(extension)) {
      alert("Format de fichier non supporté. Veuillez téléverser un fichier .glb, .gltf, .obj ou .stl");
      return;
    }

    if (fileUrl) {
      URL.revokeObjectURL(fileUrl);
    }

    const url = URL.createObjectURL(file);
    setFileUrl(url);
    setFileName(file.name);
    setFormat(extension as FileFormat);
    const sizeInMB = (file.size / (1024 * 1024)).toFixed(2);
    setFileSize(`${sizeInMB} MB`);
    setTargetPos(null);
  }, [fileUrl]);

  const triggerPreset = useCallback((preset: CameraPreset) => {
    const vec = PRESET_POSITIONS[preset];
    if (vec) {
      // Create a new clone to trigger the useEffect in CameraController
      setTargetPos(vec.clone());
    }
  }, []);

  const resetViewer = useCallback(() => {
    if (fileUrl) {
      URL.revokeObjectURL(fileUrl);
    }
    setFileUrl(null);
    setFileName(null);
    setFileSize(null);
    setFormat(null);
    setViewMode("normal");
    setTargetPos(null);
    setSettings({
      fov: 45,
      autoRotate: false,
      autoRotateSpeed: 1,
      damping: true,
      env: "sunset",
    });
  }, [fileUrl]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-fade-in">
      {/* Settings Panel & Bento Cards */}
      <div className="lg:col-span-1 space-y-6 flex flex-col justify-between h-full">
        <div className="space-y-6">
          {/* Main Upload Box */}
          <div
            onDragOver={handleDragOver}
            onDrop={handleDrop}
            className="rounded-2xl border border-white/10 bg-white/5 p-5 flex flex-col space-y-4 shadow-xl relative overflow-hidden backdrop-blur-md"
          >
            <div className="absolute top-0 right-0 w-32 h-32 bg-violet-500/5 rounded-full blur-2xl pointer-events-none" />

            <div className="flex items-center gap-2">
              <Upload className="text-violet-400 w-4 h-4" />
              <h2 className="font-bold text-xs uppercase tracking-widest text-violet-400">Importer un fichier 3D</h2>
            </div>

            <p className="text-xs text-slate-300/60 leading-relaxed font-sans">
              Glissez-déposez ou sélectionnez votre fichier 3D natif (.GLB, .GLTF, .OBJ ou .STL) pour le charger directement et en temps réel.
            </p>

            <label className="flex flex-col items-center justify-center w-full h-36 border border-dashed border-white/10 rounded-xl cursor-pointer hover:border-violet-500/50 hover:bg-white/5 transition-all bg-black/40">
              {fileUrl ? (
                <div className="text-center p-4 flex flex-col items-center gap-2">
                  <div className="w-10 h-10 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                    <CheckCircle2 className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-white max-w-[200px] truncate">{fileName}</p>
                    <p className="text-[10px] text-emerald-400 font-mono uppercase tracking-wider mt-0.5">
                      {format} · {fileSize}
                    </p>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center p-4">
                  <Box className="w-8 h-8 mb-2 text-white/30" />
                  <p className="text-[11px] text-white/50 text-center">
                    <span className="font-semibold text-violet-400">Cliquez pour chercher</span> ou glissez
                  </p>
                  <p className="text-[9px] text-white/30 font-mono uppercase tracking-wider mt-1">
                    GLB, GLTF, OBJ, STL jusqu'à 50 Mo
                  </p>
                </div>
              )}
              <input
                type="file"
                className="hidden"
                accept=".glb,.gltf,.obj,.stl"
                onChange={handleFileUpload}
              />
            </label>

            {fileUrl && (
              <button
                onClick={resetViewer}
                className="w-full py-2.5 rounded-lg border border-white/10 bg-white/5 hover:bg-white/10 text-white/40 hover:text-white transition-all text-[11px] font-bold uppercase tracking-wider cursor-pointer"
              >
                Retirer le fichier
              </button>
            )}
          </div>

          {/* Rendering Modes */}
          <div className="rounded-2xl border border-white/10 bg-white/5 p-5 space-y-4 shadow-xl backdrop-blur-md">
            <h3 className="font-bold text-xs uppercase tracking-widest text-fuchsia-400 flex items-center gap-2">
              <Eye className="w-4 h-4" />
              Mode de Rendu
            </h3>
            <div className="grid grid-cols-2 gap-2">
              {([
                { id: "normal", label: "Normal (PBR)", desc: "Textures d'origine" },
                { id: "wireframe", label: "Filaire", desc: "Squelette de polygones" },
                { id: "clay", label: "Argile", desc: "Ombres douces mates" },
                { id: "normals", label: "Normales", desc: "Orientation des faces" },
                { id: "xray", label: "Rayons-X", desc: "Translucide filaire" },
              ] as const).map((m) => (
                <button
                  key={m.id}
                  onClick={() => setViewMode(m.id)}
                  className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                    viewMode === m.id
                      ? "bg-violet-500/20 border-violet-500 text-violet-300 shadow-[0_0_10px_rgba(124,58,237,0.15)]"
                      : "bg-black/40 border-white/5 text-white/40 hover:text-white/80 hover:border-white/10"
                  }`}
                >
                  <span className="text-[10px] font-bold uppercase tracking-wider">{m.label}</span>
                  <span className="text-[8px] text-white/30 leading-tight mt-0.5">{m.desc}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Camera settings & Preset view points */}
          <div className="rounded-2xl border border-white/10 bg-white/5 p-5 space-y-4 shadow-xl backdrop-blur-md">
            <h3 className="font-bold text-xs uppercase tracking-widest text-cyan-400 flex items-center gap-2">
              <Video className="w-4 h-4" />
              Caméra & Environnement
            </h3>

            {/* Camera angle presets */}
            <div className="space-y-1.5">
              <label className="text-[9px] text-white/30 uppercase tracking-widest block font-mono">Préréglages de Vue</label>
              <div className="grid grid-cols-3 gap-1.5">
                {([
                  { id: "front", label: "Face" },
                  { id: "back", label: "Dos" },
                  { id: "top", label: "Dessus" },
                  { id: "right", label: "Droite" },
                  { id: "left", label: "Gauche" },
                  { id: "iso", label: "Iso" },
                ] as const).map((preset) => (
                  <button
                    key={preset.id}
                    onClick={() => triggerPreset(preset.id)}
                    className="py-1.5 rounded-lg bg-black/40 border border-white/5 hover:border-violet-500/40 text-[9px] font-bold uppercase tracking-wider text-white/50 hover:text-white transition-all cursor-pointer"
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
            </div>

            {/* AutoRotate Settings */}
            <div className="space-y-3 pt-2 border-t border-white/5">
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-white/60 uppercase tracking-wider font-mono">Rotation Auto</span>
                <input
                  type="checkbox"
                  checked={settings.autoRotate}
                  onChange={(e) => setSettings((prev) => ({ ...prev, autoRotate: e.target.checked }))}
                  className="w-4 h-4 accent-violet-500 cursor-pointer"
                />
              </div>

              {settings.autoRotate && (
                <div className="space-y-1">
                  <div className="flex justify-between text-[8px] font-mono text-white/30">
                    <span>VITESSE DE ROTATION</span>
                    <span>{settings.autoRotateSpeed}x</span>
                  </div>
                  <input
                    type="range"
                    min="0.1"
                    max="5"
                    step="0.1"
                    value={settings.autoRotateSpeed}
                    onChange={(e) =>
                      setSettings((prev) => ({ ...prev, autoRotateSpeed: parseFloat(e.target.value) }))
                    }
                    className="w-full accent-violet-500 cursor-pointer h-1 rounded bg-black/40"
                  />
                </div>
              )}

              {/* FOV Setting */}
              <div className="space-y-1">
                <div className="flex justify-between text-[8px] font-mono text-white/30">
                  <span>CHAMP DE VISION (FOV)</span>
                  <span>{settings.fov}°</span>
                </div>
                <input
                  type="range"
                  min="20"
                  max="100"
                  value={settings.fov}
                  onChange={(e) => setSettings((prev) => ({ ...prev, fov: parseInt(e.target.value) }))}
                  className="w-full accent-violet-500 cursor-pointer h-1 rounded bg-black/40"
                />
              </div>

              {/* Skybox Environment preset */}
              <div className="space-y-1.5">
                <span className="text-[9px] text-white/30 uppercase tracking-widest block font-mono">Ambiance Lumineuse</span>
                <div className="relative">
                  <select
                    value={settings.env}
                    onChange={(e) => setSettings((prev) => ({ ...prev, env: e.target.value as EnvPreset }))}
                    className="w-full bg-black/60 border border-white/10 rounded-lg p-2 text-[10px] text-white uppercase tracking-wider focus:border-violet-500 outline-none"
                  >
                    <option value="none">Aucun (Studio Noir)</option>
                    <option value="sunset">Sunset (Chaud)</option>
                    <option value="studio">Studio (Neutre)</option>
                    <option value="city">City (Urbain)</option>
                    <option value="dawn">Dawn (Aurore)</option>
                    <option value="forest">Forest (Vert)</option>
                    <option value="night">Night (Sombre)</option>
                    <option value="warehouse">Warehouse (Industriel)</option>
                  </select>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Viewport Card */}
      <div className="lg:col-span-2 flex flex-col min-h-[500px] lg:min-h-[640px] bg-[#06000c] border border-white/10 rounded-3xl overflow-hidden shadow-2xl relative">
        <div className="absolute top-4 left-4 z-10 flex gap-2">
          {format && (
            <div className="bg-black/80 border border-white/10 rounded-lg px-2.5 py-1 backdrop-blur-md flex items-center gap-1.5">
              <Cpu className="w-3.5 h-3.5 text-violet-400" />
              <span className="font-mono text-[9px] text-violet-300 uppercase tracking-widest font-bold">
                Moteur : R3F + {format.toUpperCase()}
              </span>
            </div>
          )}
        </div>

        <div className="flex-grow w-full h-full relative">
          <FileModelViewer
            fileUrl={fileUrl}
            format={format}
            viewMode={viewMode}
            settings={settings}
            targetPos={targetPos}
            controlsRef={controlsRef}
          />
        </div>

        {/* Viewport bottom info / status bar */}
        <div className="p-4 bg-black/60 border-t border-white/10 flex flex-wrap justify-between items-center gap-3 text-[10px] font-mono uppercase tracking-wider">
          <span className="text-white/30">
            {fileUrl
              ? `Aperçu Actif : ${fileName || "modèle"}`
              : "Aucun modèle chargé · Utilisez l'importateur à gauche"}
          </span>
          <span className="text-violet-400 font-bold">
            Pivoter : clic g. · Glisser : clic d. · Zoomer : molette
          </span>
        </div>
      </div>
    </div>
  );
}
