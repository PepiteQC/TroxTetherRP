/**
 * AdminConsoleUI.tsx
 * ----------------------------------------------------------------------------
 * Interface terminal sombre pour la console admin (React + Tailwind).
 */

import React, {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";

export type ConsoleLineType =
  | "input"
  | "success"
  | "error"
  | "warn"
  | "info"
  | "system";

export interface ConsoleLine {
  id: number;
  type: ConsoleLineType;
  text: string;
  time: number;
}

/** Fonction d'exécution attendue (fournie par le jeu / manager). */
export type CommandExecutor = (
  raw: string
) => Promise<{ success: boolean; message: string }>;

export interface UseAdminConsoleOptions {
  onCommand: CommandExecutor;
  /** Navigation historique (optionnelle). */
  getHistoryPrevious?: () => string | null;
  getHistoryNext?: () => string | null;
  /**
   * Autocomplétion (TAB). Reçoit l'entrée courante, retourne la nouvelle
   * entrée + d'éventuelles suggestions à afficher.
   */
  onComplete?: (input: string) => {
    input: string;
    suggestions: string[];
    hint: string;
  };
  /** Lignes de bienvenue. */
  welcome?: string[];
}

let _lineSeq = 0;

/** Hook gérant l'état de la console (ouverture, sortie, exécution). */
export function useAdminConsole(options: UseAdminConsoleOptions) {
  const { onCommand, getHistoryPrevious, getHistoryNext, onComplete, welcome } = options;

  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [lines, setLines] = useState<ConsoleLine[]>(() =>
    (welcome ?? [
      "╔══════════════════════════════════╗",
      "║   CONSOLE ADMIN — EtherWorld      ║",
      "╚══════════════════════════════════╝",
      'Tapez "help" pour la liste des commandes.',
    ]).map((text) => ({
      id: _lineSeq++,
      type: "system" as ConsoleLineType,
      text,
      time: Date.now(),
    }))
  );
  const [commandCount, setCommandCount] = useState(0);

  const pushLine = useCallback((type: ConsoleLineType, text: string) => {
    setLines((prev) => [
      ...prev,
      ...text.split("\n").map((t) => ({
        id: _lineSeq++,
        type,
        text: t,
        time: Date.now(),
      })),
    ]);
  }, []);

  const open = useCallback(() => {
    setIsOpen(true);
    setIsMinimized(false);
  }, []);
  const close = useCallback(() => setIsOpen(false), []);
  const toggle = useCallback(() => setIsOpen((v) => !v), []);
  const clear = useCallback(() => setLines([]), []);

  const run = useCallback(
    async (raw: string) => {
      const value = raw.trim();
      if (!value) return;
      pushLine("input", `> ${value}`);
      setCommandCount((c) => c + 1);

      // Commandes locales rapides.
      if (value === "clear" || value === "cls") {
        clear();
        return;
      }

      try {
        const res = await onCommand(value);
        pushLine(res.success ? "success" : "error", res.message);
      } catch (err) {
        pushLine("error", err instanceof Error ? err.message : "Erreur inconnue.");
      }
    },
    [onCommand, pushLine, clear]
  );

  return {
    isOpen,
    isMinimized,
    lines,
    commandCount,
    open,
    close,
    toggle,
    clear,
    run,
    pushLine,
    setIsMinimized,
    getHistoryPrevious,
    getHistoryNext,
    onComplete,
  };
}

const LINE_COLORS: Record<ConsoleLineType, string> = {
  input: "text-cyan-300",
  success: "text-green-400",
  error: "text-red-400",
  warn: "text-yellow-400",
  info: "text-blue-300",
  system: "text-zinc-500",
};

export interface AdminConsoleUIProps {
  console: ReturnType<typeof useAdminConsole>;
  /** Touche(s) globales d'ouverture déjà gérées en amont ? */
  title?: string;
}

/** Composant d'affichage de la console. */
export const AdminConsoleUI: React.FC<AdminConsoleUIProps> = ({
  console: c,
  title = "ADMIN CONSOLE",
}) => {
  const [input, setInput] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const outputRef = useRef<HTMLDivElement>(null);

  // Auto-scroll vers le bas à chaque nouvelle ligne.
  useEffect(() => {
    if (outputRef.current) {
      outputRef.current.scrollTop = outputRef.current.scrollHeight;
    }
  }, [c.lines]);

  // Auto-focus à l'ouverture.
  useEffect(() => {
    if (c.isOpen && !c.isMinimized) {
      const t = setTimeout(() => inputRef.current?.focus(), 50);
      return () => clearTimeout(t);
    }
  }, [c.isOpen, c.isMinimized]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    switch (e.key) {
      case "Enter": {
        e.preventDefault();
        const value = input;
        setInput("");
        void c.run(value);
        break;
      }
      case "Escape": {
        e.preventDefault();
        c.close();
        break;
      }
      case "ArrowUp": {
        e.preventDefault();
        const prev = c.getHistoryPrevious?.();
        if (prev != null) setInput(prev);
        break;
      }
      case "ArrowDown": {
        e.preventDefault();
        const next = c.getHistoryNext?.();
        if (next != null) setInput(next);
        break;
      }
      case "Tab": {
        e.preventDefault();
        if (c.onComplete) {
          const res = c.onComplete(input);
          setInput(res.input);
          // Affiche les suggestions multiples + le hint dans la sortie.
          if (res.suggestions.length > 1) {
            c.pushLine("system", res.suggestions.join("   "));
          }
          if (res.hint) c.pushLine("info", res.hint);
        }
        break;
      }
    }
  };

  if (!c.isOpen) return null;

  return (
    <div
      className="fixed bottom-4 right-4 z-[9999] flex flex-col overflow-hidden rounded-xl border border-zinc-700 bg-zinc-950/95 font-mono text-sm shadow-2xl shadow-black/60 backdrop-blur"
      style={{
        width: c.isMinimized ? 280 : 640,
        height: c.isMinimized ? 44 : 420,
        transition: "width 0.15s ease, height 0.15s ease",
      }}
    >
      {/* Barre de titre */}
      <div className="flex items-center justify-between border-b border-zinc-800 bg-zinc-900 px-3 py-2 select-none">
        <div className="flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-full bg-green-500 shadow-[0_0_6px] shadow-green-500" />
          <span className="font-semibold tracking-wider text-zinc-200">
            {title}
          </span>
          <span className="ml-2 rounded bg-zinc-800 px-1.5 py-0.5 text-[10px] text-zinc-400">
            {c.commandCount} cmd
          </span>
        </div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => c.setIsMinimized(!c.isMinimized)}
            className="flex h-6 w-6 items-center justify-center rounded text-zinc-400 hover:bg-zinc-700 hover:text-white"
            title={c.isMinimized ? "Maximiser" : "Minimiser"}
          >
            {c.isMinimized ? "▢" : "—"}
          </button>
          <button
            type="button"
            onClick={c.close}
            className="flex h-6 w-6 items-center justify-center rounded text-zinc-400 hover:bg-red-600 hover:text-white"
            title="Fermer (ESC)"
          >
            ✕
          </button>
        </div>
      </div>

      {!c.isMinimized && (
        <>
          {/* Sortie */}
          <div
            ref={outputRef}
            className="flex-1 space-y-0.5 overflow-y-auto px-3 py-2 leading-relaxed"
          >
            {c.lines.map((line) => (
              <div
                key={line.id}
                className={`whitespace-pre-wrap break-words ${LINE_COLORS[line.type]}`}
              >
                {line.text}
              </div>
            ))}
          </div>

          {/* Saisie */}
          <div className="flex items-center gap-2 border-t border-zinc-800 bg-zinc-900 px-3 py-2">
            <span className="text-green-400">$</span>
            <input
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              spellCheck={false}
              autoComplete="off"
              placeholder="Tapez une commande... (help)"
              className="flex-1 bg-transparent text-zinc-100 placeholder-zinc-600 outline-none"
            />
          </div>
        </>
      )}
    </div>
  );
};

export default AdminConsoleUI;