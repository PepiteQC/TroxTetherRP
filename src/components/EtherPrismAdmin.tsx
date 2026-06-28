import React, { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import {
  Activity,
  AlertTriangle,
  ArrowLeft,
  ArrowUpDown,
  BarChart3,
  ChevronDown,
  ChevronRight,
  ChevronUp,
  Clock,
  Copy,
  Database,
  Download,
  Edit,
  Eye,
  Filter,
  HelpCircle,
  History,
  Layers,
  Pencil,
  PlayCircle,
  Plus,
  RefreshCw,
  Save,
  Search,
  Sparkles,
  Terminal,
  Trash2,
  TrendingUp,
  Upload,
  X,
  Zap,
  CheckCircle,
  XCircle,
  Info,
  Globe,
  Cpu,
  HardDrive,
  Wifi,
} from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────

type AppView = 'landing' | 'character-creator' | 'etherprism' | 'troxt-chat' | 'sandbox';

interface EtherPrismAdminProps {
  onNavigate?: (view: AppView) => void;
}

type TableId = 'players' | 'vehicles' | 'houses' | 'shops' | 'factions' | 'jobs' | 'inventory';
type RowValue = string | number | boolean | null;
type EtherPrismRow = Record<string, RowValue>;
type SortDir = 'asc' | 'desc' | null;
type ToastType = 'success' | 'error' | 'info' | 'warning';

interface Toast {
  id: string;
  type: ToastType;
  message: string;
  timestamp: number;
}

interface QueryHistoryEntry {
  id: string;
  query: string;
  result: string;
  timestamp: number;
  success: boolean;
  duration: number;
}

interface TableMeta {
  id: TableId;
  name: string;
  title: string;
  emoji: string;
  description: string;
  color: string;
  accentColor: string;
}

interface ColumnFilter {
  column: string;
  operator: '$eq' | '$gt' | '$lt' | '$gte' | '$lte' | '$contains';
  value: string;
}

interface SystemStats {
  cpu: number;
  memory: number;
  uptime: number;
  connections: number;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const STORAGE_PREFIX = 'etherprism_v2_table_';
const HISTORY_KEY = 'etherprism_query_history';

const TABLES: TableMeta[] = [
  { id: 'players',   name: 'players',   title: 'Citoyens',    emoji: '👤', description: 'Profils RP, argent, banque, aura, métier et statut.',      color: 'from-violet-600/20 to-indigo-600/10', accentColor: 'violet' },
  { id: 'vehicles',  name: 'vehicles',  title: 'Véhicules',   emoji: '🚘', description: 'Propriétaires, plaques, carburant, garage et valeur.',     color: 'from-cyan-600/20 to-blue-600/10',     accentColor: 'cyan'   },
  { id: 'houses',    name: 'houses',    title: 'Propriétés',  emoji: '🏠', description: 'Adresses, propriétaires, prix, clés et occupation.',       color: 'from-amber-600/20 to-orange-600/10',  accentColor: 'amber'  },
  { id: 'shops',     name: 'shops',     title: 'Commerces',   emoji: '🏪', description: 'Boutiques, revenus, inventaire et caisses.',               color: 'from-emerald-600/20 to-teal-600/10',  accentColor: 'emerald'},
  { id: 'factions',  name: 'factions',  title: 'Factions',    emoji: '🛡️', description: 'Groupes RP officiels, budget, membres et base.',          color: 'from-rose-600/20 to-pink-600/10',     accentColor: 'rose'   },
  { id: 'jobs',      name: 'jobs',      title: 'Métiers',     emoji: '💼', description: 'Jobs RP, salaire, permissions et département.',            color: 'from-blue-600/20 to-indigo-600/10',   accentColor: 'blue'   },
  { id: 'inventory', name: 'inventory', title: 'Inventaire',  emoji: '🎒', description: 'Objets joueurs, quantité, rareté et état.',                color: 'from-fuchsia-600/20 to-purple-600/10',accentColor: 'fuchsia'},
];

const RARITY_COLORS: Record<string, string> = {
  Legendary: 'text-amber-300 bg-amber-500/10 border-amber-500/30',
  Epic:      'text-purple-300 bg-purple-500/10 border-purple-500/30',
  Rare:      'text-blue-300 bg-blue-500/10 border-blue-500/30',
  Common:    'text-slate-300 bg-slate-500/10 border-slate-500/30',
};

const STATUS_COLORS: Record<string, string> = {
  Actif:    'text-emerald-300 bg-emerald-500/10 border-emerald-500/30',
  Service:  'text-blue-300 bg-blue-500/10 border-blue-500/30',
  Inactif:  'text-red-300 bg-red-500/10 border-red-500/30',
  Occupé:   'text-amber-300 bg-amber-500/10 border-amber-500/30',
  Libre:    'text-emerald-300 bg-emerald-500/10 border-emerald-500/30',
  Officiel: 'text-indigo-300 bg-indigo-500/10 border-indigo-500/30',
};

const DEFAULT_TABLE_DATA: Record<TableId, EtherPrismRow[]> = {
  players: [
    { id: 1, name: 'Maitre Ether',   gender: 'Masculin', job: 'Fondateur',   cash: 5000, bank: 75000, aura: 'ETHER', status: 'Actif',    level: 99, xp: 999999, warned: false },
    { id: 2, name: 'Nova Clarke',    gender: 'Féminin',  job: 'Architecte',  cash: 2800, bank: 34000, aura: 'PRISM', status: 'Actif',    level: 42, xp: 185000, warned: false },
    { id: 3, name: 'Axel Moreau',   gender: 'Masculin', job: 'Mécanicien',  cash: 1250, bank: 12200, aura: 'EMBER', status: 'Service',  level: 18, xp: 42000,  warned: false },
    { id: 4, name: 'Lina Tremblay', gender: 'Féminin',  job: 'Urgentiste',  cash: 1900, bank: 26400, aura: 'FROST', status: 'Actif',    level: 27, xp: 98000,  warned: false },
    { id: 5, name: 'Ryzen Voss',    gender: 'Masculin', job: 'Policier',    cash: 3100, bank: 41000, aura: 'STORM', status: 'Actif',    level: 35, xp: 143000, warned: true  },
    { id: 6, name: 'Zara Vex',      gender: 'Féminin',  job: 'Médecin',     cash: 2200, bank: 58000, aura: 'VOID',  status: 'Inactif',  level: 56, xp: 310000, warned: false },
  ],
  vehicles: [
    { id: 1, owner_id: 1, model: 'TroxT Cruiser',     plate: 'ETHER01', color: 'Noir Cosmos',    fuel: 92, price: 85000, garage: 'Central',    condition: 'Excellent', insurance: true  },
    { id: 2, owner_id: 2, model: 'Nova Compact',      plate: 'NOVA22',  color: 'Bleu Glacier',   fuel: 76, price: 32000, garage: 'Nord',        condition: 'Bon',       insurance: true  },
    { id: 3, owner_id: 3, model: 'Forge Pickup',      plate: 'FORGE7',  color: 'Gris Acier',     fuel: 58, price: 45000, garage: 'Garage Est',  condition: 'Usé',       insurance: false },
    { id: 4, owner_id: 5, model: 'Storm Interceptor', plate: 'STORM9',  color: 'Blanc Arctique', fuel: 88, price: 67000, garage: 'Poste PD',   condition: 'Excellent', insurance: true  },
  ],
  houses: [
    { id: 1, owner_id: 1, address: 'Penthouse Ether — Tour Centrale', price: 1200000, interior_type: 'Ultra Luxe', keys_shared: 'Admin',  status: 'Occupé', rooms: 8, garage_slots: 4 },
    { id: 2, owner_id: 2, address: 'Maison Nova — Rue du Fleuve',     price: 320000,  interior_type: 'Moderne',    keys_shared: 'Aucun',  status: 'Occupé', rooms: 4, garage_slots: 2 },
    { id: 3, owner_id: 0, address: 'Loft Forge — District Industriel',price: 210000,  interior_type: 'Loft',       keys_shared: 'Aucun',  status: 'Libre',  rooms: 2, garage_slots: 1 },
    { id: 4, owner_id: 6, address: 'Villa Vex — Colline Ouest',       price: 780000,  interior_type: 'Villa',      keys_shared: 'Aucun',  status: 'Occupé', rooms: 6, garage_slots: 3 },
  ],
  shops: [
    { id: 1, name: "Dépanneur Éther",     type: 'Dépanneur', owner_id: 1, revenue: 14500, stocked_items: 240, cash_register: 4200, open: true,  rating: 4.8 },
    { id: 2, name: 'Garage Forge',        type: 'Garage',    owner_id: 3, revenue: 38200, stocked_items: 64,  cash_register: 9300, open: true,  rating: 4.5 },
    { id: 3, name: 'Boutique Nova',       type: 'Vêtements', owner_id: 2, revenue: 22600, stocked_items: 118, cash_register: 6800, open: false, rating: 4.9 },
    { id: 4, name: 'Pharmacie Tremblay', type: 'Médical',   owner_id: 4, revenue: 31000, stocked_items: 95,  cash_register: 7500, open: true,  rating: 4.7 },
  ],
  factions: [
    { id: 1, name: 'Police EtherWorld',  budget: 850000, members_count: 14, base_coords: 'Quartier Central', status: 'Officiel', leader_id: 5, founded: '2024-01-15' },
    { id: 2, name: 'Services Médicaux', budget: 620000, members_count: 9,  base_coords: 'Hôpital Nord',     status: 'Officiel', leader_id: 4, founded: '2024-02-01' },
    { id: 3, name: 'Bureau Civil',      budget: 410000, members_count: 7,  base_coords: 'Hôtel de Ville',   status: 'Officiel', leader_id: 1, founded: '2024-01-01' },
  ],
  jobs: [
    { id: 1, name: 'Fondateur',   department: 'Administration', salary: 5000, rank_required: 100, can_manage_players: true,  status: 'Actif', max_slots: 1  },
    { id: 2, name: 'Policier',    department: 'Sécurité',       salary: 1200, rank_required: 10,  can_manage_players: false, status: 'Actif', max_slots: 30 },
    { id: 3, name: 'Mécanicien', department: 'Garage',         salary: 900,  rank_required: 1,   can_manage_players: false, status: 'Actif', max_slots: 15 },
    { id: 4, name: 'Architecte', department: 'Construction',   salary: 1100, rank_required: 5,   can_manage_players: false, status: 'Actif', max_slots: 10 },
    { id: 5, name: 'Médecin',    department: 'Santé',          salary: 1400, rank_required: 8,   can_manage_players: false, status: 'Actif', max_slots: 20 },
  ],
  inventory: [
    { id: 1, player_id: 1, item_id: 'keycard_admin',  label: 'Carte Admin',         quantity: 1, rarity: 'Legendary', durability: 100, weight: 0.1 },
    { id: 2, player_id: 2, item_id: 'tool_architect', label: 'Outil Architecte',    quantity: 1, rarity: 'Epic',      durability: 96,  weight: 1.5 },
    { id: 3, player_id: 3, item_id: 'repair_kit',     label: 'Kit de Réparation',   quantity: 4, rarity: 'Common',    durability: 100, weight: 2.0 },
    { id: 4, player_id: 5, item_id: 'handcuffs',      label: 'Menottes',            quantity: 2, rarity: 'Rare',      durability: 88,  weight: 0.5 },
    { id: 5, player_id: 4, item_id: 'medkit_pro',     label: 'Kit Médical Pro',     quantity: 3, rarity: 'Epic',      durability: 100, weight: 1.2 },
  ],
};

// ─── Utilities ────────────────────────────────────────────────────────────────

const getStorageKey = (table: TableId) => `${STORAGE_PREFIX}${table}`;
const isTableId = (v: string): v is TableId => TABLES.some(t => t.id === v);
const cloneRows = (rows: EtherPrismRow[]) => rows.map(r => ({ ...r }));
const uid = () => Math.random().toString(36).slice(2, 10);

function safeParseRows(raw: string | null): EtherPrismRow[] | null {
  if (!raw) return null;
  try { const p = JSON.parse(raw); return Array.isArray(p) ? p.filter(r => r && typeof r === 'object') : null; }
  catch { return null; }
}

function loadRows(table: TableId): EtherPrismRow[] {
  if (typeof window === 'undefined') return cloneRows(DEFAULT_TABLE_DATA[table]);
  const existing = safeParseRows(window.localStorage.getItem(getStorageKey(table)));
  if (existing) return existing;
  const seeded = cloneRows(DEFAULT_TABLE_DATA[table]);
  window.localStorage.setItem(getStorageKey(table), JSON.stringify(seeded));
  return seeded;
}

function saveRows(table: TableId, rows: EtherPrismRow[]) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(getStorageKey(table), JSON.stringify(rows));
}

function loadHistory(): QueryHistoryEntry[] {
  try { const raw = window.localStorage.getItem(HISTORY_KEY); return raw ? JSON.parse(raw) : []; }
  catch { return []; }
}

function saveHistory(entries: QueryHistoryEntry[]) {
  window.localStorage.setItem(HISTORY_KEY, JSON.stringify(entries.slice(0, 50)));
}

function getNextId(rows: EtherPrismRow[]) {
  const ids = rows.map(r => Number(r.id)).filter(Number.isFinite);
  return ids.length > 0 ? Math.max(...ids) + 1 : 1;
}

function createEmptyRow(table: TableId, rows: EtherPrismRow[]): EtherPrismRow {
  const src = rows[0] ?? DEFAULT_TABLE_DATA[table][0] ?? { id: 1 };
  return Object.fromEntries(
    Object.entries(src).map(([k, v]) => [k, k === 'id' ? getNextId(rows) : typeof v === 'number' ? 0 : typeof v === 'boolean' ? false : ''])
  );
}

function formatCell(value: RowValue): string {
  if (value === null) return 'null';
  if (typeof value === 'boolean') return value ? 'true' : 'false';
  return String(value);
}

function coerceInputValue(raw: string, current: RowValue): RowValue {
  if (typeof current === 'number') { const n = Number(raw); return Number.isFinite(n) ? n : 0; }
  if (typeof current === 'boolean') return raw === 'true';
  return raw;
}

function normalizeSearch(row: EtherPrismRow) {
  return Object.values(row).map(formatCell).join(' ').toLowerCase();
}

function downloadJson(name: string, data: unknown) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a'); a.href = url; a.download = name; a.click();
  URL.revokeObjectURL(url);
}

function compareValue(rv: RowValue, cond: unknown): boolean {
  if (cond && typeof cond === 'object' && !Array.isArray(cond)) {
    const c = cond as Record<string, unknown>;
    if ('$gt' in c) return Number(rv) > Number(c.$gt);
    if ('$gte' in c) return Number(rv) >= Number(c.$gte);
    if ('$lt' in c) return Number(rv) < Number(c.$lt);
    if ('$lte' in c) return Number(rv) <= Number(c.$lte);
    if ('$contains' in c) return String(rv).toLowerCase().includes(String(c.$contains).toLowerCase());
    if ('$ne' in c) return rv !== c.$ne;
  }
  return rv === cond;
}

function applyWhere(rows: EtherPrismRow[], where: Record<string, unknown>) {
  return rows.filter(row => Object.entries(where).every(([k, cond]) => compareValue(row[k] ?? null, cond)));
}

function executeSafeQuery(query: string): unknown {
  const t = query.trim();
  if (/^ep\.tables\(\s*\)$/i.test(t)) return TABLES.map(x => x.id);
  const schemaM = t.match(/^ep\.schema\(\s*["']([a-z_]+)["']\s*\)$/i);
  if (schemaM) { const tbl = schemaM[1]; if (!isTableId(tbl)) throw new Error(`Table inconnue: ${tbl}`); const rows = loadRows(tbl); if (!rows.length) return {}; return Object.fromEntries(Object.entries(rows[0]).map(([k, v]) => [k, typeof v])); }
  const countM = t.match(/^ep\.count\(\s*["']([a-z_]+)["']\s*\)$/i);
  if (countM) { const tbl = countM[1]; if (!isTableId(tbl)) throw new Error(`Table inconnue: ${tbl}`); return loadRows(tbl).length; }
  const sumM = t.match(/^ep\.sum\(\s*["']([a-z_]+)["']\s*,\s*["']([a-zA-Z0-9_]+)["']\s*\)$/i);
  if (sumM) { const tbl = sumM[1]; const col = sumM[2]; if (!isTableId(tbl)) throw new Error(`Table inconnue: ${tbl}`); return loadRows(tbl).reduce((a, r) => a + (Number(r[col]) || 0), 0); }
  const avgM = t.match(/^ep\.avg\(\s*["']([a-z_]+)["']\s*,\s*["']([a-zA-Z0-9_]+)["']\s*\)$/i);
  if (avgM) { const tbl = avgM[1]; const col = avgM[2]; if (!isTableId(tbl)) throw new Error(`Table inconnue: ${tbl}`); const rows = loadRows(tbl); if (!rows.length) return 0; return rows.reduce((a, r) => a + (Number(r[col]) || 0), 0) / rows.length; }
  const maxM = t.match(/^ep\.(max|min)\(\s*["']([a-z_]+)["']\s*,\s*["']([a-zA-Z0-9_]+)["']\s*\)$/i);
  if (maxM) { const fn = maxM[1]; const tbl = maxM[2]; const col = maxM[3]; if (!isTableId(tbl)) throw new Error(`Table inconnue: ${tbl}`); const vals = loadRows(tbl).map(r => Number(r[col])).filter(Number.isFinite); return fn === 'max' ? Math.max(...vals) : Math.min(...vals); }
  const distM = t.match(/^ep\.distinct\(\s*["']([a-z_]+)["']\s*,\s*["']([a-zA-Z0-9_]+)["']\s*\)$/i);
  if (distM) { const tbl = distM[1]; const col = distM[2]; if (!isTableId(tbl)) throw new Error(`Table inconnue: ${tbl}`); return [...new Set(loadRows(tbl).map(r => r[col]))]; }
  const findM = t.match(/^ep\.find\(\s*["']([a-z_]+)["']\s*(?:,\s*([\s\S]*))?\)$/i);
  if (findM) {
    const tbl = findM[1]; const optsRaw = findM[2];
    if (!isTableId(tbl)) throw new Error(`Table inconnue: ${tbl}`);
    let rows = loadRows(tbl);
    if (optsRaw) {
      let opts: unknown;
      try { opts = JSON.parse(optsRaw); } catch { throw new Error('JSON invalide dans les options.'); }
      if (opts && typeof opts === 'object') {
        const o = opts as Record<string, unknown>;
        if (o.where && typeof o.where === 'object') rows = applyWhere(rows, o.where as Record<string, unknown>);
        if (typeof o.limit === 'number') rows = rows.slice(0, o.limit);
        if (typeof o.orderBy === 'string') { const col = o.orderBy; const dir = o.order === 'desc' ? -1 : 1; rows = [...rows].sort((a, b) => { const av = a[col] ?? ''; const bv = b[col] ?? ''; return (av < bv ? -1 : av > bv ? 1 : 0) * dir; }); }
        if (Array.isArray(o.select)) { const keys = o.select as string[]; rows = rows.map(r => Object.fromEntries(keys.map(k => [k, r[k] ?? null]))); }
      }
    }
    return rows;
  }
  throw new Error('Syntaxe inconnue.\n\nDisponible:\n• ep.tables()\n• ep.count("table")\n• ep.sum("table","col")\n• ep.avg("table","col")\n• ep.max("table","col")\n• ep.min("table","col")\n• ep.distinct("table","col")\n• ep.schema("table")\n• ep.find("table", {"where":{...},"limit":N,"orderBy":"col","order":"asc|desc","select":["col",...]})');
}

// ─── Sub-components ───────────────────────────────────────────────────────────

const MiniBarChart: React.FC<{ values: number[]; color: string }> = ({ values, color }) => {
  if (!values.length) return null;
  const max = Math.max(...values, 1);
  return (
    <div className="flex items-end gap-0.5 h-8">
      {values.map((v, i) => (
        <div key={i} style={{ height: `${Math.max(4, (v / max) * 100)}%`, backgroundColor: color, opacity: 0.6 + (i / values.length) * 0.4 }} className="flex-1 rounded-sm transition-all duration-500" />
      ))}
    </div>
  );
};

const Sparkline: React.FC<{ data: number[]; color: string; width?: number; height?: number }> = ({ data, color, width = 80, height = 28 }) => {
  if (data.length < 2) return null;
  const max = Math.max(...data); const min = Math.min(...data); const range = max - min || 1;
  const pts = data.map((v, i) => `${(i / (data.length - 1)) * width},${height - ((v - min) / range) * (height - 4) - 2}`).join(' ');
  const last = pts.split(' ').pop()!.split(',');
  return (
    <svg width={width} height={height} className="overflow-visible">
      <polyline points={pts} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" opacity="0.8" />
      <circle cx={parseFloat(last[0])} cy={parseFloat(last[1])} r="2.5" fill={color} />
    </svg>
  );
};

const ToastContainer: React.FC<{ toasts: Toast[]; onRemove: (id: string) => void }> = ({ toasts, onRemove }) => (
  <div className="fixed top-4 right-4 z-[200] flex flex-col gap-2 pointer-events-none">
    {toasts.map(toast => {
      const icons: Record<ToastType, React.ReactNode> = { success: <CheckCircle className="w-4 h-4" />, error: <XCircle className="w-4 h-4" />, info: <Info className="w-4 h-4" />, warning: <AlertTriangle className="w-4 h-4" /> };
      const colors: Record<ToastType, string> = { success: 'border-emerald-500/50 bg-emerald-950/90 text-emerald-300', error: 'border-red-500/50 bg-red-950/90 text-red-300', info: 'border-indigo-500/50 bg-indigo-950/90 text-indigo-300', warning: 'border-amber-500/50 bg-amber-950/90 text-amber-300' };
      return (
        <div key={toast.id} className={`pointer-events-auto flex items-center gap-3 px-4 py-3 rounded-xl border backdrop-blur-xl shadow-2xl text-sm font-bold ${colors[toast.type]}`}>
          {icons[toast.type]}
          <span className="flex-1">{toast.message}</span>
          <button onClick={() => onRemove(toast.id)} className="opacity-60 hover:opacity-100 transition ml-2"><X className="w-3 h-3" /></button>
        </div>
      );
    })}
  </div>
);

const SystemStatusBar: React.FC<{ stats: SystemStats }> = ({ stats }) => (
  <div className="flex items-center gap-4 text-[10px] font-mono text-slate-500">
    <span className="flex items-center gap-1"><Cpu className="w-3 h-3 text-cyan-500" />{Math.round(stats.cpu)}%</span>
    <span className="flex items-center gap-1"><HardDrive className="w-3 h-3 text-violet-500" />{Math.round(stats.memory)}MB</span>
    <span className="flex items-center gap-1"><Wifi className="w-3 h-3 text-emerald-500" />{stats.connections}</span>
    <span className="flex items-center gap-1"><Clock className="w-3 h-3 text-amber-500" />{Math.floor(stats.uptime / 60)}m</span>
  </div>
);

// ─── Main Component ───────────────────────────────────────────────────────────

export const EtherPrismAdmin: React.FC<EtherPrismAdminProps> = ({ onNavigate }) => {
  const [activeTable, setActiveTable] = useState<TableId>('players');
  const [searchQuery, setSearchQuery] = useState('');
  const [tableData, setTableData] = useState<EtherPrismRow[]>([]);
  const [queryCount, setQueryCount] = useState(0);

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isViewOpen, setIsViewOpen] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [currentRow, setCurrentRow] = useState<EtherPrismRow | null>(null);

  const [sortColumn, setSortColumn] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<SortDir>(null);
  const [columnFilters, setColumnFilters] = useState<ColumnFilter[]>([]);
  const [hiddenColumns, setHiddenColumns] = useState<Set<string>>(new Set());
  const [selectedRows, setSelectedRows] = useState<Set<number>>(new Set());

  const [queryInput, setQueryInput] = useState('ep.find("players", {"where":{"cash":{"$gt":1000}},"orderBy":"bank","order":"desc"})');
  const [queryResult, setQueryResult] = useState('// Lance une requête EtherPrism Quantum.');
  const [queryDuration, setQueryDuration] = useState<number | null>(null);
  const [queryHistory, setQueryHistory] = useState<QueryHistoryEntry[]>([]);
  const [isQueryRunning, setIsQueryRunning] = useState(false);

  const [toasts, setToasts] = useState<Toast[]>([]);
  const [activeTab, setActiveTab] = useState<'table' | 'analytics' | 'terminal'>('table');
  const [systemStats, setSystemStats] = useState<SystemStats>({ cpu: 12, memory: 248, uptime: 0, connections: 3 });
  const [sparkData, setSparkData] = useState<number[]>([4, 7, 5, 9, 6, 8, 11, 7, 9, 12, 8, 14]);

  const [page, setPage] = useState(1);
  const pageSize = 10;
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setTableData(loadRows(activeTable));
    setSearchQuery(''); setSortColumn(null); setSortDir(null);
    setSelectedRows(new Set()); setPage(1); setColumnFilters([]);
  }, [activeTable]);

  useEffect(() => { setQueryHistory(loadHistory()); }, []);

  useEffect(() => {
    const i = setInterval(() => {
      setSystemStats(p => ({ cpu: Math.max(5, Math.min(90, p.cpu + (Math.random() - 0.5) * 8)), memory: Math.max(200, Math.min(512, p.memory + (Math.random() - 0.5) * 10)), uptime: p.uptime + 3, connections: Math.max(1, Math.min(20, p.connections + (Math.random() > 0.8 ? (Math.random() > 0.5 ? 1 : -1) : 0))) }));
      setSparkData(p => [...p.slice(1), Math.floor(Math.random() * 20) + 3]);
    }, 3000);
    return () => clearInterval(i);
  }, []);

  useEffect(() => {
    if (!toasts.length) return;
    const t = setTimeout(() => setToasts(p => p.slice(1)), 3500);
    return () => clearTimeout(t);
  }, [toasts]);

  const addToast = useCallback((type: ToastType, message: string) => {
    setToasts(p => [...p.slice(-4), { id: uid(), type, message, timestamp: Date.now() }]);
  }, []);

  const removeToast = useCallback((id: string) => setToasts(p => p.filter(t => t.id !== id)), []);
  const activeMeta = useMemo(() => TABLES.find(t => t.id === activeTable) ?? TABLES[0], [activeTable]);

  const columns = useMemo(() => {
    const keys = new Set<string>();
    tableData.forEach(r => Object.keys(r).forEach(k => keys.add(k)));
    return [...keys].sort((a, b) => a === 'id' ? -1 : b === 'id' ? 1 : a.localeCompare(b));
  }, [tableData]);

  const visibleColumns = useMemo(() => columns.filter(c => !hiddenColumns.has(c)), [columns, hiddenColumns]);

  const filteredData = useMemo(() => {
    let data = tableData;
    const q = searchQuery.trim().toLowerCase();
    if (q) data = data.filter(r => normalizeSearch(r).includes(q));
    columnFilters.forEach(f => { data = data.filter(r => compareValue(r[f.column] ?? null, { [f.operator]: f.value })); });
    if (sortColumn && sortDir) {
      data = [...data].sort((a, b) => {
        const av = a[sortColumn] ?? ''; const bv = b[sortColumn] ?? '';
        return (av < bv ? -1 : av > bv ? 1 : 0) * (sortDir === 'asc' ? 1 : -1);
      });
    }
    return data;
  }, [tableData, searchQuery, columnFilters, sortColumn, sortDir]);

  const paginatedData = useMemo(() => filteredData.slice((page - 1) * pageSize, page * pageSize), [filteredData, page]);
  const totalPages = Math.max(1, Math.ceil(filteredData.length / pageSize));

  const numericSums = useMemo(() => {
    const s: Record<string, number> = {};
    columns.forEach(c => { const vals = tableData.map(r => r[c]).filter(v => typeof v === 'number') as number[]; if (vals.length) s[c] = vals.reduce((a, b) => a + b, 0); });
    return s;
  }, [tableData, columns]);

  const totalNumeric = useMemo(() => Object.values(numericSums).reduce((a, b) => a + b, 0), [numericSums]);

  const analyticsData = useMemo(() => {
    return columns.filter(col => tableData.some(r => typeof r[col] === 'number')).slice(0, 4).map(col => {
      const vals = tableData.map(r => Number(r[col]) || 0);
      const sum = vals.reduce((a, b) => a + b, 0);
      return { col, sum, avg: vals.length ? sum / vals.length : 0, max: Math.max(...vals), vals };
    });
  }, [tableData, columns]);

  const tableCounts = useMemo(() => TABLES.map(t => ({ id: t.id, name: t.title, emoji: t.emoji, count: loadRows(t.id).length })), [queryCount]);

  const saveActiveRows = useCallback((rows: EtherPrismRow[]) => {
    saveRows(activeTable, rows); setTableData(rows); setQueryCount(c => c + 1);
  }, [activeTable]);

  const handleSeedAll = () => {
    TABLES.forEach(t => saveRows(t.id, cloneRows(DEFAULT_TABLE_DATA[t.id])));
    setTableData(loadRows(activeTable)); setQueryCount(c => c + 1);
    addToast('success', 'Toutes les tables restaurées !');
  };

  const handleResetActiveTable = () => { saveActiveRows(cloneRows(DEFAULT_TABLE_DATA[activeTable])); addToast('info', `Table "${activeTable}" réinitialisée.`); };
  const handleExportActiveTable = () => { downloadJson(`etherprism_${activeTable}_${Date.now()}.json`, tableData); addToast('success', `Export "${activeTable}" téléchargé.`); };
  const handleExportAll = () => { const all: Record<string, EtherPrismRow[]> = {}; TABLES.forEach(t => { all[t.id] = loadRows(t.id); }); downloadJson(`etherprism_backup_${Date.now()}.json`, all); addToast('success', 'Backup complet exporté !'); };

  const handleImportJson = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => { try { const p = JSON.parse(ev.target?.result as string); if (Array.isArray(p)) { saveActiveRows(p); addToast('success', `Importé ${p.length} lignes.`); } else addToast('error', 'Format invalide.'); } catch { addToast('error', 'Erreur JSON.'); } };
    reader.readAsText(file); e.target.value = '';
  };

  const handleSort = (col: string) => {
    if (sortColumn === col) { setSortDir(d => d === 'asc' ? 'desc' : d === 'desc' ? null : 'asc'); if (sortDir === 'desc') setSortColumn(null); }
    else { setSortColumn(col); setSortDir('asc'); }
    setPage(1);
  };

  const handleSelectAll = () => {
    if (selectedRows.size === paginatedData.length) setSelectedRows(new Set());
    else setSelectedRows(new Set(paginatedData.map(r => Number(r.id))));
  };

  const handleToggleRow = (id: number) => setSelectedRows(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const handleBulkDelete = () => { if (!selectedRows.size) return; saveActiveRows(tableData.filter(r => !selectedRows.has(Number(r.id)))); addToast('warning', `${selectedRows.size} ligne(s) supprimée(s).`); setSelectedRows(new Set()); };
  const handleOpenCreate = () => { setCurrentRow(createEmptyRow(activeTable, tableData)); setIsCreateOpen(true); };
  const handleConfirmCreate = () => { if (!currentRow) return; saveActiveRows([...tableData, { ...currentRow, id: getNextId(tableData) }]); setIsCreateOpen(false); setCurrentRow(null); addToast('success', 'Ligne créée !'); };
  const handleOpenEdit = (row: EtherPrismRow) => { setCurrentRow({ ...row }); setIsEditOpen(true); };
  const handleOpenView = (row: EtherPrismRow) => { setCurrentRow({ ...row }); setIsViewOpen(true); };
  const handleConfirmEdit = () => { if (!currentRow) return; const id = Number(currentRow.id); saveActiveRows(tableData.map(r => Number(r.id) === id ? { ...currentRow } : r)); setIsEditOpen(false); setCurrentRow(null); addToast('success', 'Ligne modifiée !'); };
  const handleDeleteRow = (id: RowValue) => { saveActiveRows(tableData.filter(r => Number(r.id) !== Number(id))); addToast('warning', `Ligne #${id} supprimée.`); };
  const handleDuplicateRow = (row: EtherPrismRow) => { const dup = { ...row, id: getNextId(tableData) }; saveActiveRows([...tableData, dup]); addToast('info', `Ligne dupliquée → #${dup.id}.`); };
  const handleUpdateCurrentRow = (key: string, value: string) => { if (!currentRow) return; setCurrentRow({ ...currentRow, [key]: coerceInputValue(value, currentRow[key]) }); };
  const handleCopyResult = () => { navigator.clipboard.writeText(queryResult).then(() => addToast('info', 'Résultat copié !')); };

  const handleExecuteQuery = () => {
    setIsQueryRunning(true);
    const start = performance.now();
    setQueryCount(c => c + 1);
    setTimeout(() => {
      const duration = Math.round(performance.now() - start);
      setQueryDuration(duration);
      let result = ''; let success = true;
      try { result = JSON.stringify(executeSafeQuery(queryInput), null, 2); addToast('success', `Requête OK en ${duration}ms`); }
      catch (err) { result = `// ❌ ${err instanceof Error ? err.message : String(err)}`; success = false; addToast('error', 'Erreur dans la requête !'); }
      setQueryResult(result);
      setIsQueryRunning(false);
      const entry: QueryHistoryEntry = { id: uid(), query: queryInput, result, timestamp: Date.now(), success, duration };
      setQueryHistory(prev => { const next = [entry, ...prev.slice(0, 49)]; saveHistory(next); return next; });
    }, 120 + Math.random() * 80);
  };

  const renderCellValue = (col: string, value: RowValue) => {
    const str = formatCell(value);
    if (col === 'id') return <span className="text-indigo-300 font-mono font-black text-xs">#{str}</span>;
    if (col === 'rarity' && RARITY_COLORS[str]) return <span className={`text-xs font-bold px-2 py-0.5 rounded-full border ${RARITY_COLORS[str]}`}>{str}</span>;
    if (col === 'status' && STATUS_COLORS[str]) return <span className={`text-xs font-bold px-2 py-0.5 rounded-full border ${STATUS_COLORS[str]}`}>{str}</span>;
    if (typeof value === 'boolean') return <span className={`text-xs font-bold px-2 py-0.5 rounded-full border ${value ? 'text-emerald-300 bg-emerald-500/10 border-emerald-500/30' : 'text-red-300 bg-red-500/10 border-red-500/30'}`}>{str}</span>;
    if (typeof value === 'number') {
      if (col.includes('fuel') || col.includes('durability')) {
        const pct = Math.min(100, Math.max(0, value));
        const c = pct > 60 ? 'bg-emerald-500' : pct > 30 ? 'bg-amber-500' : 'bg-red-500';
        return <div className="flex items-center gap-2 min-w-[80px]"><div className="flex-1 h-1.5 bg-slate-800 rounded-full overflow-hidden"><div className={`h-full ${c} rounded-full`} style={{ width: `${pct}%` }} /></div><span className="text-xs text-slate-400 font-mono">{pct}%</span></div>;
      }
      if (['cash','bank','price','budget','revenue','salary'].some(k => col.includes(k))) return <span className="text-emerald-300 font-mono font-bold text-xs">${value.toLocaleString('fr-CA')}</span>;
      return <span className="text-cyan-300 font-mono text-xs">{value.toLocaleString('fr-CA')}</span>;
    }
    if (col.includes('aura')) return <span className="text-xs font-black tracking-widest" style={{ background: 'linear-gradient(90deg,#a78bfa,#38bdf8,#f472b6)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>{str}</span>;
    if (col.includes('plate')) return <span className="font-mono text-xs bg-amber-500/10 border border-amber-500/30 text-amber-300 px-2 py-0.5 rounded">{str}</span>;
    if (str === '') return <span className="text-slate-700 text-xs italic">—</span>;
    return <span className="text-slate-300 text-xs">{str}</span>;
  };

  return (
    <div className="h-screen bg-[#060818] text-slate-100 font-sans flex overflow-hidden pt-[62px]">
      <style>{`
        @keyframes ep-fade { from{opacity:0;transform:translateY(-6px)}to{opacity:1;transform:translateY(0)} }
        @keyframes ep-up   { from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:translateY(0)} }
        .ep-fade { animation: ep-fade 0.22s ease-out; }
        .ep-up   { animation: ep-up 0.28s ease-out; }
        .ep-grid { background-image:linear-gradient(rgba(99,102,241,.04)1px,transparent 1px),linear-gradient(90deg,rgba(99,102,241,.04)1px,transparent 1px);background-size:32px 32px; }
        .ep-row:hover { background:linear-gradient(90deg,rgba(99,102,241,.04),transparent); }
        .ep-scroll::-webkit-scrollbar{width:4px;height:4px} .ep-scroll::-webkit-scrollbar-track{background:transparent} .ep-scroll::-webkit-scrollbar-thumb{background:rgba(99,102,241,.3);border-radius:2px}
      `}</style>

      <ToastContainer toasts={toasts} onRemove={removeToast} />

      {/* SIDEBAR */}
      <aside className="w-64 bg-[#080b1a] border-r border-slate-800/60 flex flex-col ep-grid flex-shrink-0">
        <div className="p-4 border-b border-slate-800/60">
          <div className="flex items-center gap-3 mb-4">
            <div className="relative w-9 h-9 rounded-xl bg-gradient-to-br from-violet-600 to-indigo-700 flex items-center justify-center shadow-lg">
              <Database className="w-4 h-4 text-white" />
              <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-emerald-500 rounded-full border-2 border-[#080b1a] animate-pulse" />
            </div>
            <div>
              <div className="text-white font-black text-sm leading-none">EtherPrism</div>
              <div className="text-[9px] text-indigo-400 font-mono tracking-[.15em] mt-0.5">QUANTUM DB v2</div>
            </div>
          </div>
          {onNavigate && (
            <button onClick={() => onNavigate('landing')} className="w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-slate-900/80 hover:bg-slate-800 border border-slate-800/60 text-[11px] font-bold text-slate-400 hover:text-white transition">
              <ArrowLeft className="w-3 h-3" />Retour Modules
            </button>
          )}
        </div>

        <div className="flex-1 overflow-y-auto ep-scroll p-3">
          <div className="text-[9px] text-slate-700 uppercase tracking-[.2em] font-black mb-2">Tables</div>
          <div className="flex flex-col gap-1">
            {TABLES.map(table => {
              const isActive = activeTable === table.id;
              const count = tableCounts.find(t => t.id === table.id)?.count ?? 0;
              return (
                <button key={table.id} onClick={() => setActiveTable(table.id)} className={`relative w-full text-left p-2.5 rounded-xl border transition-all group overflow-hidden ${isActive ? 'bg-gradient-to-r from-indigo-600/20 to-violet-600/10 border-indigo-500/40 text-white' : 'bg-slate-900/30 border-slate-800/40 text-slate-500 hover:text-slate-300 hover:border-slate-700/60'}`}>
                  {isActive && <div className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 bg-indigo-400 rounded-r" />}
                  <div className="flex items-center gap-2 pl-1">
                    <span className="text-base">{table.emoji}</span>
                    <span className="flex-1 min-w-0">
                      <span className={`block text-[11px] font-black ${isActive ? 'text-white' : ''}`}>{table.name}</span>
                    </span>
                    <span className={`text-[9px] font-mono px-1.5 py-0.5 rounded ${isActive ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30' : 'bg-slate-950 border border-slate-800/60 text-slate-600'}`}>{count}</span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        <div className="p-3 border-t border-slate-800/60">
          <div className="flex items-center gap-1.5 text-[9px] font-mono mb-2">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-emerald-400 font-black tracking-wider">STORAGE ONLINE</span>
          </div>
          <SystemStatusBar stats={systemStats} />
        </div>
      </aside>

      {/* MAIN */}
      <main className="flex-1 min-w-0 overflow-y-auto ep-scroll bg-[#060818] flex flex-col">

        {/* HEADER */}
        <header className="sticky top-0 z-30 bg-[#060818]/95 backdrop-blur-xl border-b border-slate-800/60 flex-shrink-0">
          <div className="px-5 py-3 flex flex-wrap gap-3 items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${activeMeta.color} border border-slate-700/40 flex items-center justify-center text-xl`}>{activeMeta.emoji}</div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-base font-black text-white">{activeMeta.title}</h2>
                  <span className="text-[9px] font-mono px-2 py-0.5 bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 rounded-full uppercase tracking-widest">{activeTable}</span>
                </div>
                <p className="text-[10px] text-slate-600 mt-0.5">{activeMeta.description}</p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-1.5">
              {selectedRows.size > 0 && (
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-red-950/50 border border-red-500/30 text-[11px] text-red-300 font-bold">
                  {selectedRows.size} sél.
                  <button onClick={handleBulkDelete} className="flex items-center gap-1 hover:text-red-200"><Trash2 className="w-3 h-3" /></button>
                </div>
              )}
              {[
                { label: 'Ajouter', icon: <Plus className="w-3 h-3" />, action: handleOpenCreate, style: 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white shadow-lg shadow-emerald-900/30' },
                { label: 'Filtres', icon: <Filter className="w-3 h-3" />, action: () => setIsFilterOpen(o => !o), style: isFilterOpen ? 'bg-indigo-600/20 border-indigo-500/40 text-indigo-300' : 'bg-slate-900/60 border-slate-800/60 text-slate-400 hover:text-white' },
                { label: 'Export',  icon: <Download className="w-3 h-3" />, action: handleExportActiveTable, style: 'bg-slate-900/60 border-slate-800/60 text-slate-400 hover:text-white' },
                { label: 'Import',  icon: <Upload className="w-3 h-3" />, action: () => fileInputRef.current?.click(), style: 'bg-slate-900/60 border-slate-800/60 text-slate-400 hover:text-white' },
                { label: 'Reset',   icon: <RefreshCw className="w-3 h-3" />, action: handleResetActiveTable, style: 'bg-slate-900/60 border-slate-800/60 text-slate-400 hover:text-white' },
                { label: 'Seed All', icon: <Sparkles className="w-3 h-3" />, action: handleSeedAll, style: 'bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white shadow-lg shadow-indigo-900/30' },
              ].map(btn => (
                <button key={btn.label} onClick={btn.action} className={`px-3 py-2 rounded-lg border text-[11px] font-black flex items-center gap-1.5 transition ${btn.style}`}>
                  {btn.icon}{btn.label}
                </button>
              ))}
              <input ref={fileInputRef} type="file" accept=".json" onChange={handleImportJson} className="hidden" />
            </div>
          </div>

          {/* TAB BAR */}
          <div className="px-5 flex gap-0 border-t border-slate-800/40">
            {(['table', 'analytics', 'terminal'] as const).map(tab => (
              <button key={tab} onClick={() => setActiveTab(tab)} className={`px-4 py-2.5 text-[11px] font-black uppercase tracking-widest border-b-2 transition-all ${activeTab === tab ? 'border-indigo-500 text-indigo-300' : 'border-transparent text-slate-600 hover:text-slate-400'}`}>
                {tab === 'table' ? '📊 Table' : tab === 'analytics' ? '📈 Analytics' : '⚡ Terminal'}
              </button>
            ))}
          </div>
        </header>

        {/* STATS CARDS */}
        <section className="px-5 py-4 grid grid-cols-2 lg:grid-cols-4 gap-3 flex-shrink-0">
          {[
            { label: 'Lignes', value: tableData.length, sub: `${filteredData.length} vis.`, icon: <Layers className="w-4 h-4 text-indigo-400" />, color: '#818cf8', data: [2,4,3,6,5,tableData.length] },
            { label: 'Queries', value: queryCount, sub: 'session', icon: <Terminal className="w-4 h-4 text-emerald-400" />, color: '#34d399', data: sparkData },
            { label: 'Colonnes', value: columns.length, sub: `${visibleColumns.length} vis.`, icon: <Database className="w-4 h-4 text-cyan-400" />, color: '#22d3ee', data: [3,4,4,5,5,columns.length] },
            { label: 'Σ Num.', value: totalNumeric.toLocaleString('fr-CA'), sub: 'audit', icon: <TrendingUp className="w-4 h-4 text-amber-400" />, color: '#fbbf24', data: [10,20,18,32,28,40] },
          ].map(card => (
            <div key={card.label} className="bg-[#0c1024]/80 border border-slate-800/60 rounded-2xl p-4 group hover:border-slate-700/60 transition-all">
              <div className="flex items-start justify-between mb-3">
                <div className="p-1.5 rounded-lg bg-slate-900/80 border border-slate-800/60">{card.icon}</div>
                <Sparkline data={card.data} color={card.color} />
              </div>
              <div className="text-xl font-black text-white">{card.value}</div>
              <div className="flex justify-between mt-1">
                <span className="text-[9px] text-slate-600 uppercase tracking-widest font-black">{card.label}</span>
                <span className="text-[9px] text-slate-700 font-mono">{card.sub}</span>
              </div>
            </div>
          ))}
        </section>

        {/* ── TABLE TAB ─── */}
        {activeTab === 'table' && (
          <section className="px-5 pb-4 flex flex-col gap-3 flex-1 min-h-0">
            {/* Filter Panel */}
            {isFilterOpen && (
              <div className="bg-[#0c1024]/80 border border-indigo-500/20 rounded-2xl p-4 ep-fade flex-shrink-0">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-black text-indigo-300 flex items-center gap-2"><Filter className="w-3.5 h-3.5" />Filtres avancés</span>
                  <button onClick={() => setColumnFilters(p => [...p, { column: columns[0] ?? 'id', operator: '$eq', value: '' }])} className="text-[10px] font-black text-emerald-400 hover:text-emerald-300 flex items-center gap-1 transition"><Plus className="w-3 h-3" />Ajouter</button>
                </div>
                <div className="flex flex-wrap gap-1.5 mb-3">
                  {columns.map(col => (
                    <button key={col} onClick={() => setHiddenColumns(p => { const n = new Set(p); n.has(col) ? n.delete(col) : n.add(col); return n; })} className={`text-[10px] font-bold px-2 py-1 rounded-lg border transition ${hiddenColumns.has(col) ? 'bg-slate-900 border-slate-700 text-slate-600 line-through' : 'bg-indigo-500/10 border-indigo-500/30 text-indigo-300'}`}>{col}</button>
                  ))}
                </div>
                {columnFilters.map((f, i) => (
                  <div key={i} className="flex items-center gap-2 mb-2 flex-wrap">
                    <select value={f.column} onChange={e => setColumnFilters(p => p.map((x, xi) => xi === i ? { ...x, column: e.target.value } : x))} className="bg-slate-900 border border-slate-800 rounded-lg px-2 py-1.5 text-xs text-slate-300 outline-none">
                      {columns.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                    <select value={f.operator} onChange={e => setColumnFilters(p => p.map((x, xi) => xi === i ? { ...x, operator: e.target.value as ColumnFilter['operator'] } : x))} className="bg-slate-900 border border-slate-800 rounded-lg px-2 py-1.5 text-xs text-slate-300 outline-none">
                      {['$eq','$gt','$lt','$gte','$lte','$contains'].map(op => <option key={op} value={op}>{op}</option>)}
                    </select>
                    <input value={f.value} onChange={e => setColumnFilters(p => p.map((x, xi) => xi === i ? { ...x, value: e.target.value } : x))} placeholder="valeur..." className="bg-slate-900 border border-slate-800 rounded-lg px-2 py-1.5 text-xs text-white outline-none w-28" />
                    <button onClick={() => setColumnFilters(p => p.filter((_, xi) => xi !== i))} className="p-1.5 rounded-lg bg-red-900/30 border border-red-500/20 text-red-400"><X className="w-3 h-3" /></button>
                  </div>
                ))}
              </div>
            )}

            {/* Table container */}
            <div className="bg-[#0c1024]/80 border border-slate-800/60 rounded-2xl overflow-hidden flex flex-col flex-1 min-h-0">
              {/* Search */}
              <div className="p-4 border-b border-slate-800/60 flex gap-3 items-center flex-shrink-0">
                <div className="relative flex-1 max-w-sm">
                  <Search className="w-3.5 h-3.5 text-slate-600 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input value={searchQuery} onChange={e => { setSearchQuery(e.target.value); setPage(1); }} placeholder={`Rechercher dans ${activeTable}...`} className="w-full bg-slate-950/60 border border-slate-800/60 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-200 placeholder:text-slate-700 outline-none focus:border-indigo-500/60 transition" />
                </div>
                <span className="text-[10px] text-slate-600 font-mono">{filteredData.length}/{tableData.length}</span>
                <button onClick={handleExportAll} className="text-[10px] text-indigo-400 hover:text-indigo-300 flex items-center gap-1 font-bold transition"><Globe className="w-3 h-3" />Export All</button>
              </div>

              {/* Table */}
              <div className="overflow-auto ep-scroll flex-1">
                <table className="w-full">
                  <thead className="bg-slate-950/60 border-b border-slate-800/60 sticky top-0 z-10">
                    <tr>
                      <th className="px-4 py-3 w-8"><input type="checkbox" checked={selectedRows.size === paginatedData.length && paginatedData.length > 0} onChange={handleSelectAll} className="accent-indigo-500 w-3.5 h-3.5 cursor-pointer" /></th>
                      {visibleColumns.map(col => (
                        <th key={col} className="px-4 py-3 text-left whitespace-nowrap">
                          <button onClick={() => handleSort(col)} className="flex items-center gap-1.5 text-[9px] uppercase tracking-[.15em] text-slate-600 hover:text-slate-400 font-black transition group">
                            {col}
                            <span className="opacity-0 group-hover:opacity-60 transition">
                              {sortColumn === col ? (sortDir === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />) : <ArrowUpDown className="w-3 h-3" />}
                            </span>
                          </button>
                        </th>
                      ))}
                      <th className="px-4 py-3 text-right text-[9px] uppercase tracking-[.15em] text-slate-600 font-black">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedData.length === 0 ? (
                      <tr><td colSpan={visibleColumns.length + 2} className="px-4 py-16 text-center">
                        <div className="flex flex-col items-center gap-2"><Database className="w-8 h-8 text-slate-800" /><div className="text-slate-600 text-xs">Aucune donnée trouvée.</div><button onClick={handleOpenCreate} className="text-[10px] text-indigo-400 hover:text-indigo-300 font-bold transition">+ Ajouter une ligne</button></div>
                      </td></tr>
                    ) : paginatedData.map(row => (
                      <tr key={String(row.id)} className={`border-b border-slate-800/40 ep-row transition-all cursor-pointer ${selectedRows.has(Number(row.id)) ? 'bg-indigo-500/5 border-l-2 border-l-indigo-500' : ''}`}>
                        <td className="px-4 py-3"><input type="checkbox" checked={selectedRows.has(Number(row.id))} onChange={() => handleToggleRow(Number(row.id))} onClick={e => e.stopPropagation()} className="accent-indigo-500 w-3.5 h-3.5 cursor-pointer" /></td>
                        {visibleColumns.map(col => (
                          <td key={col} className="px-4 py-3 whitespace-nowrap" onClick={() => handleOpenView(row)}>{renderCellValue(col, row[col] ?? null)}</td>
                        ))}
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-end gap-1">
                            {[
                              { icon: <Eye className="w-3.5 h-3.5" />, action: () => handleOpenView(row), hover: 'hover:bg-slate-700/60', title: 'Voir' },
                              { icon: <Edit className="w-3.5 h-3.5" />, action: () => handleOpenEdit(row), hover: 'hover:bg-indigo-600/60', title: 'Modifier' },
                              { icon: <Copy className="w-3.5 h-3.5" />, action: () => handleDuplicateRow(row), hover: 'hover:bg-cyan-600/60', title: 'Dupliquer' },
                              { icon: <Trash2 className="w-3.5 h-3.5" />, action: () => handleDeleteRow(row.id), hover: 'hover:bg-red-600/60', title: 'Supprimer' },
                            ].map((btn, bi) => (
                              <button key={bi} onClick={e => { e.stopPropagation(); btn.action(); }} title={btn.title} className={`p-1.5 rounded-lg bg-slate-900/60 ${btn.hover} text-slate-500 hover:text-white transition`}>{btn.icon}</button>
                            ))}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="p-4 border-t border-slate-800/60 flex items-center justify-between flex-shrink-0">
                  <span className="text-[10px] text-slate-600 font-mono">Page {page}/{totalPages} — {filteredData.length} résultats</span>
                  <div className="flex items-center gap-1.5">
                    {['«','‹'].map((lbl, i) => <button key={lbl} onClick={() => setPage(i === 0 ? 1 : p => Math.max(1, p - 1))} disabled={page === 1} className="px-2 py-1 rounded-lg text-[10px] font-bold bg-slate-900 border border-slate-800 text-slate-500 hover:text-white disabled:opacity-30 transition">{lbl}</button>)}
                    {Array.from({ length: Math.min(5, totalPages) }, (_, i) => { const p = Math.max(1, Math.min(totalPages - 4, page - 2)) + i; return <button key={p} onClick={() => setPage(p)} className={`px-2.5 py-1 rounded-lg text-[10px] font-bold border transition ${page === p ? 'bg-indigo-600 border-indigo-500 text-white' : 'bg-slate-900 border-slate-800 text-slate-500 hover:text-white'}`}>{p}</button>; })}
                    {['›','»'].map((lbl, i) => <button key={lbl} onClick={() => setPage(i === 0 ? p => Math.min(totalPages, p + 1) : totalPages)} disabled={page === totalPages} className="px-2 py-1 rounded-lg text-[10px] font-bold bg-slate-900 border border-slate-800 text-slate-500 hover:text-white disabled:opacity-30 transition">{lbl}</button>)}
                  </div>
                </div>
              )}
            </div>
          </section>
        )}

        {/* ── ANALYTICS TAB ─── */}
        {activeTab === 'analytics' && (
          <section className="px-5 pb-6 ep-up flex flex-col gap-4">
            <div className="bg-[#0c1024]/80 border border-slate-800/60 rounded-2xl p-5">
              <div className="flex items-center gap-2 mb-4"><BarChart3 className="w-4 h-4 text-indigo-400" /><h3 className="text-sm font-black text-white">Distribution des tables</h3></div>
              <div className="flex flex-col gap-3">
                {tableCounts.map(t => {
                  const max = Math.max(...tableCounts.map(x => x.count), 1);
                  return (
                    <div key={t.id} className="flex items-center gap-3">
                      <span className="text-base w-6">{t.emoji}</span>
                      <span className="text-xs text-slate-400 font-bold w-20 shrink-0">{t.name}</span>
                      <div className="flex-1 h-2 bg-slate-900 rounded-full overflow-hidden">
                        <div className="h-full bg-gradient-to-r from-indigo-500 to-violet-500 rounded-full transition-all duration-700" style={{ width: `${(t.count / max) * 100}%` }} />
                      </div>
                      <span className="text-xs text-slate-500 font-mono w-6 text-right">{t.count}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {analyticsData.length === 0
                ? <div className="col-span-2 bg-[#0c1024]/80 border border-slate-800/60 rounded-2xl p-8 text-center text-slate-600 text-sm">Aucune colonne numérique.</div>
                : analyticsData.map(item => (
                  <div key={item.col} className="bg-[#0c1024]/80 border border-slate-800/60 rounded-2xl p-5 hover:border-slate-700/60 transition-all">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-xs font-black text-slate-400 uppercase tracking-widest">{item.col}</span>
                      <Activity className="w-3.5 h-3.5 text-indigo-400" />
                    </div>
                    <MiniBarChart values={item.vals} color="#818cf8" />
                    <div className="grid grid-cols-3 gap-2 mt-3">
                      {[{ label: 'Total', value: item.sum.toLocaleString('fr-CA') }, { label: 'Moy.', value: Math.round(item.avg).toLocaleString('fr-CA') }, { label: 'Max', value: item.max.toLocaleString('fr-CA') }].map(s => (
                        <div key={s.label} className="bg-slate-950/50 rounded-xl p-2 text-center">
                          <div className="text-sm font-black text-white">{s.value}</div>
                          <div className="text-[9px] text-slate-600 uppercase tracking-widest">{s.label}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))
              }
            </div>

            <div className="bg-[#0c1024]/80 border border-slate-800/60 rounded-2xl p-5">
              <div className="flex items-center gap-2 mb-4"><TrendingUp className="w-4 h-4 text-emerald-400" /><h3 className="text-sm font-black text-white">Vue globale</h3></div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {TABLES.map(t => {
                  const rows = loadRows(t.id);
                  const total = rows.reduce((sum: number, r) => sum + Object.values(r).reduce((s: number, v) => s + (typeof v === 'number' ? v : 0), 0), 0);
                  return (
                    <button key={t.id} onClick={() => { setActiveTable(t.id); setActiveTab('table'); }} className="bg-slate-950/60 border border-slate-800/60 hover:border-slate-700 rounded-xl p-3 text-left transition-all group">
                      <div className="text-xl mb-1">{t.emoji}</div>
                      <div className="text-xs font-black text-slate-400 group-hover:text-white transition">{t.name}</div>
                      <div className="text-[9px] text-slate-600 font-mono">{rows.length} rows</div>
                      <div className="text-[9px] text-indigo-400 font-mono">Σ {total.toLocaleString('fr-CA')}</div>
                    </button>
                  );
                })}
              </div>
            </div>
          </section>
        )}

        {/* ── TERMINAL TAB ─── */}
        {activeTab === 'terminal' && (
          <section className="px-5 pb-6 ep-up flex-1 grid grid-cols-1 xl:grid-cols-5 gap-4 min-h-0">
            {/* Editor */}
            <div className="xl:col-span-3 bg-[#0c1024]/80 border border-slate-800/60 rounded-2xl overflow-hidden flex flex-col">
              <div className="px-4 py-3 border-b border-slate-800/60 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="flex gap-1.5"><div className="w-2.5 h-2.5 rounded-full bg-red-500/60" /><div className="w-2.5 h-2.5 rounded-full bg-amber-500/60" /><div className="w-2.5 h-2.5 rounded-full bg-emerald-500/60" /></div>
                  <span className="text-xs font-black text-slate-400 ml-2">EtherPrism Quantum Terminal</span>
                </div>
                <div className="flex items-center gap-2">{queryDuration !== null && <span className="text-[9px] font-mono text-emerald-400">{queryDuration}ms</span>}<Zap className="w-3.5 h-3.5 text-amber-400" /></div>
              </div>
              <div className="p-4 flex flex-col gap-3 flex-1">
                <textarea value={queryInput} onChange={e => setQueryInput(e.target.value)} onKeyDown={e => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) handleExecuteQuery(); }} rows={6} className="w-full bg-slate-950/80 border border-slate-800/60 rounded-xl p-3 text-sm text-emerald-300 font-mono outline-none focus:border-emerald-500/60 resize-none transition ep-scroll" spellCheck={false} />
                <div className="flex flex-wrap gap-2">
                  <button onClick={handleExecuteQuery} disabled={isQueryRunning} className="px-4 py-2 rounded-lg bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 disabled:opacity-50 text-white text-xs font-black flex items-center gap-2 transition shadow-lg shadow-emerald-900/20">
                    {isQueryRunning ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <PlayCircle className="w-3.5 h-3.5" />}
                    {isQueryRunning ? 'Exécution...' : 'Exécuter (Ctrl+↵)'}
                  </button>
                  <button onClick={() => setIsHistoryOpen(o => !o)} className="px-3 py-2 rounded-lg bg-slate-950/60 border border-slate-800/60 hover:border-slate-700 text-slate-400 hover:text-white text-xs font-bold flex items-center gap-1.5 transition">
                    <History className="w-3.5 h-3.5" />Historique
                  </button>
                </div>
                <div>
                  <div className="text-[9px] text-slate-700 uppercase tracking-widest font-black mb-2">Templates rapides</div>
                  <div className="flex flex-wrap gap-1.5">
                    {[
                      ['tables()', 'ep.tables()'],
                      ['count', `ep.count("${activeTable}")`],
                      ['find all', `ep.find("${activeTable}")`],
                      ['find filter', `ep.find("${activeTable}", {"where":{"status":"Actif"},"limit":5})`],
                      ['sum cash', `ep.sum("${activeTable}","cash")`],
                      ['avg bank', `ep.avg("${activeTable}","bank")`],
                      ['max price', `ep.max("${activeTable}","price")`],
                      ['distinct', `ep.distinct("${activeTable}","status")`],
                      ['schema', `ep.schema("${activeTable}")`],
                      ['select', `ep.find("${activeTable}", {"select":["id","name","status"]})`],
                      ['order', `ep.find("${activeTable}", {"orderBy":"id","order":"desc","limit":3})`],
                    ].map(([lbl, q]) => (
                      <button key={lbl} onClick={() => setQueryInput(q)} className="px-2.5 py-1 rounded-lg bg-slate-950/60 border border-slate-800/60 hover:border-indigo-500/40 hover:text-indigo-300 text-slate-500 text-[10px] font-bold transition">{lbl}</button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Result + History */}
            <div className="xl:col-span-2 flex flex-col gap-4 min-h-0">
              <div className="bg-[#060c1e] border border-slate-800/60 rounded-2xl overflow-hidden flex-1 flex flex-col">
                <div className="px-4 py-3 border-b border-slate-800/60 flex items-center justify-between flex-shrink-0">
                  <div className="flex items-center gap-2"><ChevronRight className="w-3.5 h-3.5 text-indigo-400" /><span className="text-xs font-black text-white">Résultat</span></div>
                  <button onClick={handleCopyResult} className="text-[9px] text-slate-600 hover:text-slate-400 flex items-center gap-1 font-bold transition"><Copy className="w-3 h-3" />Copier</button>
                </div>
                <pre className="p-4 text-[11px] text-slate-300 font-mono overflow-auto ep-scroll whitespace-pre-wrap leading-relaxed flex-1">{queryResult}</pre>
              </div>

              {isHistoryOpen && (
                <div className="bg-[#0c1024]/80 border border-slate-800/60 rounded-2xl overflow-hidden ep-up flex-shrink-0">
                  <div className="px-4 py-3 border-b border-slate-800/60 flex items-center justify-between">
                    <span className="text-xs font-black text-white flex items-center gap-2"><History className="w-3.5 h-3.5 text-indigo-400" />Historique</span>
                    <button onClick={() => { setQueryHistory([]); saveHistory([]); addToast('info', 'Historique effacé.'); }} className="text-[9px] text-red-500 hover:text-red-400 font-bold transition">Effacer</button>
                  </div>
                  <div className="overflow-y-auto max-h-52 ep-scroll">
                    {queryHistory.length === 0
                      ? <p className="p-4 text-[10px] text-slate-700 italic">Aucun historique.</p>
                      : queryHistory.map(e => (
                        <button key={e.id} onClick={() => setQueryInput(e.query)} className="w-full text-left px-4 py-2.5 border-b border-slate-800/40 hover:bg-slate-900/40 transition">
                          <div className="flex items-center gap-2">
                            {e.success ? <CheckCircle className="w-3 h-3 text-emerald-500 shrink-0" /> : <XCircle className="w-3 h-3 text-red-500 shrink-0" />}
                            <span className="text-[10px] font-mono text-slate-400 truncate flex-1">{e.query}</span>
                            <span className="text-[9px] text-slate-700 shrink-0">{e.duration}ms</span>
                          </div>
                        </button>
                      ))
                    }
                  </div>
                </div>
              )}

              <div className="bg-indigo-950/20 border border-indigo-500/15 rounded-2xl p-4 flex gap-3 flex-shrink-0">
                <HelpCircle className="w-4 h-4 shrink-0 text-indigo-400 mt-0.5" />
                <div className="text-[10px] text-indigo-300/70 leading-relaxed font-mono">
                  <span className="text-indigo-300 font-black">EtherPrism Quantum:</span>{' '}
                  ep.tables() · ep.count/sum/avg/max/min/distinct("t","col") · ep.schema("t") · ep.find("t", opts) · <span className="text-amber-400">Ctrl+↵</span>
                </div>
              </div>
            </div>
          </section>
        )}
      </main>

      {/* ─── MODALS ─── */}
      {(isCreateOpen || isEditOpen) && currentRow && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="w-full max-w-2xl bg-[#0c1024] border border-slate-800/80 rounded-2xl shadow-2xl overflow-hidden ep-up">
            <div className="px-6 py-4 border-b border-slate-800/60 flex items-center justify-between bg-gradient-to-r from-indigo-600/10 to-transparent">
              <div>
                <h3 className="text-base font-black text-white flex items-center gap-2">
                  {isCreateOpen ? <><Plus className="w-4 h-4 text-emerald-400" />Nouvelle ligne</> : <><Pencil className="w-4 h-4 text-indigo-400" />Modifier #{currentRow.id}</>}
                </h3>
                <p className="text-[10px] text-slate-600 font-mono">table: {activeTable}</p>
              </div>
              <button onClick={() => { setIsCreateOpen(false); setIsEditOpen(false); setCurrentRow(null); }} className="p-2 rounded-xl bg-slate-900/60 hover:bg-slate-800 text-slate-500 hover:text-white transition"><X className="w-4 h-4" /></button>
            </div>
            <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4 max-h-[55vh] overflow-y-auto ep-scroll">
              {Object.entries(currentRow).map(([key, value]) => (
                <label key={key} className="flex flex-col gap-1.5">
                  <span className="text-[9px] uppercase tracking-[.2em] font-black text-slate-600">{key}</span>
                  {typeof value === 'boolean'
                    ? <select value={String(value)} onChange={e => handleUpdateCurrentRow(key, e.target.value)} className="bg-slate-900/80 border border-slate-800/60 rounded-xl px-3 py-2 text-sm text-white outline-none focus:border-indigo-500/60 transition"><option value="true">✓ true</option><option value="false">✗ false</option></select>
                    : <input value={formatCell(value)} disabled={key === 'id' && isEditOpen} type={typeof value === 'number' ? 'number' : 'text'} onChange={e => handleUpdateCurrentRow(key, e.target.value)} className="bg-slate-900/80 border border-slate-800/60 rounded-xl px-3 py-2 text-sm text-white outline-none focus:border-indigo-500/60 disabled:opacity-40 disabled:cursor-not-allowed transition" />
                  }
                </label>
              ))}
            </div>
            <div className="px-6 py-4 border-t border-slate-800/60 flex items-center justify-end gap-3 bg-slate-950/30">
              <button onClick={() => { setIsCreateOpen(false); setIsEditOpen(false); setCurrentRow(null); }} className="px-4 py-2 rounded-xl bg-slate-900/60 hover:bg-slate-800 border border-slate-800/60 text-slate-400 text-xs font-bold transition">Annuler</button>
              <button onClick={isCreateOpen ? handleConfirmCreate : handleConfirmEdit} className="px-4 py-2 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white text-xs font-black flex items-center gap-2 transition shadow-lg shadow-indigo-900/30">
                <Save className="w-3.5 h-3.5" />Sauvegarder
              </button>
            </div>
          </div>
        </div>
      )}

      {isViewOpen && currentRow && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-[#0c1024] border border-slate-800/80 rounded-2xl shadow-2xl overflow-hidden ep-up">
            <div className="px-6 py-4 border-b border-slate-800/60 flex items-center justify-between bg-gradient-to-r from-violet-600/10 to-transparent">
              <h3 className="text-base font-black text-white flex items-center gap-2"><Eye className="w-4 h-4 text-violet-400" />Détails — #{currentRow.id}</h3>
              <button onClick={() => { setIsViewOpen(false); setCurrentRow(null); }} className="p-2 rounded-xl bg-slate-900/60 hover:bg-slate-800 text-slate-500 hover:text-white transition"><X className="w-4 h-4" /></button>
            </div>
            <div className="p-6 max-h-[60vh] overflow-y-auto ep-scroll flex flex-col gap-3">
              {Object.entries(currentRow).map(([key, value]) => (
                <div key={key} className="flex items-start justify-between py-2 border-b border-slate-800/40">
                  <span className="text-[10px] uppercase tracking-widest text-slate-600 font-black w-1/3">{key}</span>
                  <div className="w-2/3 text-right">{renderCellValue(key, value)}</div>
                </div>
              ))}
            </div>
            <div className="px-6 py-4 border-t border-slate-800/60 flex gap-3 justify-end">
              <button onClick={() => { setIsViewOpen(false); handleOpenEdit(currentRow); }} className="px-4 py-2 rounded-xl bg-indigo-600/20 hover:bg-indigo-600/30 border border-indigo-500/30 text-indigo-300 text-xs font-bold flex items-center gap-2 transition"><Edit className="w-3.5 h-3.5" />Modifier</button>
              <button onClick={() => { setIsViewOpen(false); setCurrentRow(null); }} className="px-4 py-2 rounded-xl bg-slate-900/60 hover:bg-slate-800 border border-slate-800/60 text-slate-400 text-xs font-bold transition">Fermer</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
