import crypto from 'crypto';

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  cyan: '\x1b[36m',
  magenta: '\x1b[35m',
  blue: '\x1b[34m',
  white: '\x1b[37m',
  bold: '\x1b[1m',
};

function timestamp() {
  return new Date().toISOString().replace('T', ' ').substring(0, 19);
}

export const logger = {
  info:  (tag, msg) => console.log(`${colors.cyan}[INFO ]${colors.reset} ${colors.bold}[${tag}]${colors.reset} ${msg}`),
  ok:    (tag, msg) => console.log(`${colors.green}[  OK ]${colors.reset} ${colors.bold}[${tag}]${colors.reset} ${msg}`),
  warn:  (tag, msg) => console.log(`${colors.yellow}[WARN ]${colors.reset} ${colors.bold}[${tag}]${colors.reset} ${msg}`),
  error: (tag, msg) => console.log(`${colors.red}[ERROR]${colors.reset} ${colors.bold}[${tag}]${colors.reset} ${msg}`),
  brain: (tag, msg) => console.log(`${colors.magenta}[🧠   ]${colors.reset} ${colors.bold}[${tag}]${colors.reset} ${msg}`),
};

// ============================================================================
// DIAMOND IDENTITY v2.0 — Empreinte SHA-512 + HMAC + Sceau visuel
// ============================================================================
export function generateDiamondIdentity() {
  const session = crypto.randomBytes(8).toString('hex').toUpperCase();
  const ts = new Date().toISOString();
  const seed = `TROXT:${session}:${ts}:ETHERWORLD-DIAMOND`;
  const seal512 = crypto.createHash('sha512').update(seed).digest('hex').toUpperCase();
  const fp = crypto.createHash('md5').update(seal512).digest('hex').toUpperCase();
  const sig = crypto.createHmac('sha256', 'TROXT-SECRET-KEY').update(session).digest('hex').toUpperCase().substring(0, 24);
  const token = Buffer.from(`TROXT:${session}`).toString('base64');
  return { session, seal512, fp, sig, token, ts, valid: true };
}

export function printDiamond(port, brainState, identity) {
  const L = console.log.bind(console);
  const c = colors;
  L('');
  L(`${c.magenta}${c.bold}  ╔${'═'.repeat(96)}╗${c.reset}`);
  L(`${c.magenta}  ║  ██████╗ ██╗ █████╗ ███╗   ███╗ ██████╗ ███╗   ██╗██████╗     ██╗██████╗         ║${c.reset}`);
  L(`${c.magenta}  ║  ██╔══██╗██║██╔══██╗████╗ ████║██╔═══██╗████╗  ██║██╔══██╗    ██║██╔══██╗        ║${c.reset}`);
  L(`${c.magenta}  ║  ██║  ██║██║███████║██╔████╔██║██║   ██║██╔██╗ ██║██║  ██║    ██║██║  ██║        ║${c.reset}`);
  L(`${c.magenta}  ║  ██████╔╝██║██║  ██║██║╚═╝ ██║╚██████╔╝██║ ╚████║██████╔╝    ██║██████╔╝        ║${c.reset}`);
  L(`${c.magenta}  ║  ╚═════╝ ╚═╝╚═╝  ╚═╝╚═╝   ╚═╝ ╚═════╝ ╚═╝  ╚═══╝╚═════╝     ╚═╝╚═════╝         ║${c.reset}`);
  L(`${c.cyan}  ║  ${'─'.repeat(30)} 💎 ETHERWORLD — DIAMOND IDENTITY CREST ${'─'.repeat(23)}║${c.reset}`);
  L(`${c.magenta}${c.bold}  ╚${'═'.repeat(96)}╝${c.reset}`);
  L('');
  L(`${c.cyan}                    ╔══════════════════╗${c.reset}`);
  L(`${c.cyan}                   ╱████████████████████╲${c.reset}`);
  L(`${c.cyan}      ◈ CORE ◈   ╱██✦████◆████✦██╲  ⬡ GUARD ⬡${c.reset}`);
  L(`${c.cyan}                  ╱████║████████████║████╲${c.reset}`);
  L(`${c.cyan}      ⚡ FORGE    ╱██║  ╔══════════╗  ║██╲   🔍 LENS${c.reset}`);
  L(`${c.cyan}                 ╱███║ ╔╝          ╚╗ ║███╲${c.reset}`);
  L(`${c.cyan}                ╱████║╔╝  ╔════════╗  ╚╗║████╲${c.reset}`);
  L(`${c.cyan}    ◇ PRISM    ╱██║║ ╔╝  ╔════╗  ╚╗ ║║██╲  ◎ WEAVE${c.reset}`);
  L(`${c.cyan}              ╱████║║ ║ 🧠 BRAIN ║ ║║████╲${c.reset}`);
  L(`${c.cyan}              ╲████║║ ║ v4.0.0  ║ ║║████╱${c.reset}`);
  L(`${c.cyan}    ▣ UI      ╲██║║ ╚╗  ╚════╝  ╔╝ ║║██╱   ◌ SIM${c.reset}`);
  L(`${c.cyan}               ╲███║ ╚╗          ╔╝ ║███╱${c.reset}`);
  L(`${c.cyan}                ╲████╚════════════╝████╱${c.reset}`);
  L(`${c.cyan}                         ◆  ← POINTE DE VÉRITÉ${c.reset}`);
  L('');
  L(`${c.bold}${c.green}  ╔══════════════════════════════════════════════════════════════════════════════╗${c.reset}`);
  L(`${c.green}  ║  💎 TROXT ETHERWORLD — DIAMOND IDENTITY SEAL                              ║${c.reset}`);
  L(`${c.green}  ║                                                                            ║${c.reset}`);
  L(`${c.green}  ║  SEAL-512  ► ${identity.seal512.substring(0,64)}  ║${c.reset}`);
  L(`${c.green}  ║             ${identity.seal512.substring(64)}  ║${c.reset}`);
  L(`${c.green}  ║                                                                            ║${c.reset}`);
  L(`${c.green}  ║  FINGERPRINT ► ${identity.fp.padEnd(32)}  SIGNATURE ► ${identity.sig}  ║${c.reset}`);
  L(`${c.green}  ║  TOKEN       ► ${identity.token.padEnd(32)}  VALID    ► ✅ YES  ║${c.reset}`);
  L(`${c.green}  ║  SESSION     ► ${identity.session.padEnd(20)}             TIME  ► ${identity.ts}  ║${c.reset}`);
  L(`${c.bold}${c.green}  ╚══════════════════════════════════════════════════════════════════════════════╝${c.reset}`);
  L('');
  L(`${c.bold}${c.magenta}  ╔══════════════════════════════════════════════════════════════════════════════╗${c.reset}`);
  L(`${c.magenta}  ║  🛡  TROXT ETHERWORLD — DIAMOND IDENTITY CREST v4.0.0                    ║${c.reset}`);
  L(`${c.magenta}  ║                                                                            ║${c.reset}`);
  L(`${c.magenta}  ║  💎 DIAMANT ACTIF   ⚡ 16 AGENTS   🧠 ${brainState.padEnd(10)}  🔐 SCEAU VALIDE   ║${c.reset}`);
  L(`${c.magenta}  ║  🚀 Port: ${String(port).padEnd(5)}   🌐 http://localhost:${port}   🔌 WebSocket: ACTIF  ║${c.reset}`);
  L(`${c.bold}${c.magenta}  ╚══════════════════════════════════════════════════════════════════════════════╝${c.reset}`);
  L('');
  L(`${c.yellow}  ✦ "Chaque facette est un agent. Ensemble, ils forment le diamant indestructible." ✦${c.reset}`);
  L(`${c.yellow}  💎 TroxT EtherWorld — L'identité qui ne ment pas, la protection qui ne cède pas. 💎${c.reset}`);
  L('');
}
