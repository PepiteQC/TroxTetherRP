/**
 * AliasManager.ts
 * ----------------------------------------------------------------------------
 * Alias et macros pour la console admin.
 */

export interface Macro {
  name: string;
  /** Une ou plusieurs commandes. */
  commands: string[];
  description?: string;
}

export interface AliasState {
  macros: Macro[];
}

export class AliasManager {
  private macros = new Map<string, Macro>();
  private readonly maxDepth: number;

  constructor(options?: { maxDepth?: number }) {
    this.maxDepth = options?.maxDepth ?? 5;
  }

  // --------------------------------------------------------------------- //
  //  Définition
  // --------------------------------------------------------------------- //

  /** Définit un alias simple (1 commande). */
  setAlias(name: string, command: string, description?: string): void {
    this.macros.set(name.toLowerCase(), {
      name: name.toLowerCase(),
      commands: [command],
      description,
    });
  }

  /** Définit une macro multi-commandes. */
  setMacro(name: string, commands: string[], description?: string): void {
    this.macros.set(name.toLowerCase(), {
      name: name.toLowerCase(),
      commands: [...commands],
      description,
    });
  }

  remove(name: string): boolean {
    return this.macros.delete(name.toLowerCase());
  }

  has(name: string): boolean {
    return this.macros.has(name.toLowerCase());
  }

  get(name: string): Macro | undefined {
    return this.macros.get(name.toLowerCase());
  }

  list(): Macro[] {
    return Array.from(this.macros.values());
  }

  // --------------------------------------------------------------------- //
  //  Expansion
  // --------------------------------------------------------------------- //

  /** Substitue {0},{1},...,{*} dans un template avec les args fournis. */
  private substitute(template: string, args: string[]): string {
    return template
      .replace(/\{\*\}/g, args.join(" "))
      .replace(/\{(\d+)\}/g, (_, n) => args[Number(n)] ?? "");
  }

  /**
   * Étend une ligne brute en la (les) commande(s) finale(s).
   * Si le premier token n'est pas un alias/macro, retourne [raw] tel quel.
   */
  expand(raw: string, depth = 0): string[] {
    const trimmed = raw.trim().replace(/^\//, "");
    const tokens = trimmed.split(/\s+/);
    const name = (tokens[0] ?? "").toLowerCase();
    const args = tokens.slice(1);

    const macro = this.macros.get(name);
    if (!macro) return [trimmed].filter(Boolean);

    if (depth >= this.maxDepth) {
      throw new Error(
        `Expansion d'alias trop profonde (>${this.maxDepth}). Récursion ?`
      );
    }

    const out: string[] = [];
    for (const tpl of macro.commands) {
      const substituted = this.substitute(tpl, args);
      // Récursion : un alias peut en appeler un autre.
      out.push(...this.expand(substituted, depth + 1));
    }
    return out;
  }

  // --------------------------------------------------------------------- //
  //  Sérialisation
  // --------------------------------------------------------------------- //

  toState(): AliasState {
    return { macros: this.list().map((m) => ({ ...m, commands: [...m.commands] })) };
  }

  loadState(state: AliasState): void {
    this.macros.clear();
    for (const m of state.macros ?? []) this.macros.set(m.name.toLowerCase(), m);
  }
}

export default AliasManager;