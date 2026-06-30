import {
  Recognition,
  GeometryDef,
  MaterialDef,
  AnimateType,
  SceneType,
  QualityLevel,
  ObjectDef,
  ParticleDef,
  SceneConfig,
  RecognitionCategory
} from "../types";

// ── hash & seeded random ──
function hash(str: string): number {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = (Math.imul(31, h) + str.charCodeAt(i)) | 0;
  return Math.abs(h);
}

function seededRandom(seed: number) {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) & 0xffffffff;
    return (s >>> 0) / 0x100000000;
  };
}

// ── lexicons ──
const SHAPE_LEXICON: [string, string, GeometryDef][] = [
  ["sph[eè]re|ball|orb|globe|plan[eè]te|boule|bubble|drop|ballon|balloon|balle|bulle|head|t[eê]te|cr[eâ]ne|skull|noyau|core|noix|nut|grain|pearl|perle|œil|eye|sun|soleil|moon|lune|planet|monde|world|atom|atome|noeud|node|bead|perle|pomme|apple|fruit|berry|baie", "sphere", { type: "sphere", args: [1.2, 32, 32] }],
  ["cube|box|block|bo[îi]te|crate|square|carr[eé]|caisse|chest|coffre|paquet|package|dice|d[eé]|brique|brick|pav[eé]|slab|plaque|tablet|carton|container|bloc|sac|bag|pack|reserve|r[eé]serve|storage|locker|armoire|cabinet|wardrobe|table|bureau|desk|shelf|[eé]tag[eè]re|bookshelf|biblioth[eè]que|trunk|malle|valise|suitcase", "cube", { type: "box", args: [2, 2, 2] }],
  ["monolith|obelisk|pilier|pillar|column|col[o]nne|poteau|post|m[eâ]t|beam|poutre|mur|wall|cloison|paroi|barri[eè]re|fence|cl[oô]ture|palissade|rempart|rampart|barrage|dam|dock|quai|jet[eé]|pieu|stake", "monolith", { type: "box", args: [0.8, 3.5, 0.5] }],
  ["torus knot|n[œo]ud|twisted ring|celtic knot|entrelac|infini|infinity|serpent|dragon knot", "torusKnot", { type: "torusKnot", args: [0.9, 0.3, 128, 12] }],
  ["knot|pretzel|knotted|entrelac[eé]|n[œo]ud coulant|boucle|loop knot", "knot", { type: "torusKnot", args: [0.8, 0.28, 128, 12, 2, 3] }],
  ["torus|ring|donut|anneau|hoop|portal|loop|cercle|wheel|roue|couronne|crown|bande|bracelet|collier|necklace|circonf[eé]rence|jante|rim|bordure|encadrement|frame|cadre|arch|arc|voute|v[oô]ute|arceau", "torus", { type: "torus", args: [1.2, 0.38, 16, 64] }],
  ["halo|nimbe|aur[eé]ole|aureola", "halo", { type: "torus", args: [1.6, 0.15, 16, 64] }],
  ["pyramid|pyramide|ziggurat|zigourat|temple maya|mastaba", "pyramid", { type: "cone", args: [1.4, 2.5, 4] }],
  ["cone|pic|peak|spike|pointe|aiguille|needle|clocher|steeple|fl[eè]che|tower tip|sommet|tip|t[uû]t|trompette|trumpet|corne|horn|bec|beak|dent|tooth|croc|fang|clou|nail|vis|screw|piquet|stalactite|stalagmite", "cone", { type: "cone", args: [1, 2.8, 24] }],
  ["mountain|mont|volcano|volcan|colline|hill|butte|mesa|dune|ridge|cr[eê]te|sommet alpin|aiguille montagne|massif", "mountain", { type: "cone", args: [2, 3.5, 6] }],
  ["cylinder|cylindre|barrel|pipe|tube|drum|tonneau|pilon|bolt|tuyau|conduit|chemin[eé]e|chimney|shaft|axe|axis|rod|tige|barre|bar|baton|b[aâ]ton|stick|canne|cane|crayon|pencil|column|pile|stack|tour|r[uû]leau|roller|bobine|spool|poutre cylindrique|log|b[uû]che|trunk tree|tronc|leg|jambe|bras|arm|doigt|finger|corps|body|neck|cou|tail|queue|tentacule|tentacle|serpent body|rope|corde|chaine|chain", "cylinder", { type: "cylinder", args: [0.8, 0.8, 2.5, 24] }],
  ["crystal|cristal|gem|joyau|jewel|gemstone|diamond|diamant|prism|prisme|shard|[eé]clat|fragment|amethyst|am[eé]thyste|saphir|sapphire|rubis|ruby|[eé]meraude|emerald|opale|opal|topaze|topaz|quartz|pierre pr[eé]cieuse|peridot|agate|onyx|turquoise|ambre|amber", "crystal", { type: "octahedron", args: [1.3, 0] }],
  ["octahedron|octa[eè]dre|double pyramid|bipyramide", "octahedron", { type: "octahedron", args: [1.4, 0] }],
  ["icosahedron|icosa[eè]dre|polyhedron|geodesic|g[eé]od[eé]sique|faceted|poly[eè]dre|d20|d[eé] 20|soccer ball", "icosahedron", { type: "icosahedron", args: [1.3, 1] }],
  ["dodecahedron|dod[eé]ca[eè]dre|d12|d[eé] 12", "dodecahedron", { type: "dodecahedron", args: [1.3, 0] }],
  ["tetrahedron|t[eé]tra[eè]dre|triangular|triangle 3d|pyramide triangle|d4|d[eé] 4", "tetrahedron", { type: "tetrahedron", args: [1.5, 0] }],
  ["capsule|pill|pilule|oval|ellipse|[œo]euf|egg|ovale|capsule spaciale|graine|seed|haricot|bean|pois|pea|olive", "capsule", { type: "capsule", args: [0.6, 1.2, 12, 24] }],
  ["disc|disk|disque|plate|assiette|shield|bouclier|panneau|panel|bouclier rond|frisbee|m[eé]daille|medal|pi[eè]ce|coin|jeton|token|bouton|button|couvercle", "disc", { type: "circle", args: [1.6, 32] }],
  ["plan(e|che)?|flat|surface|plancher|floor|sol|terrain|ground|prairie|champ|field|pré|meadow|tapis|carpet|rug|pont|bridge|plateforme|platform|stage|scène|écran|screen|flag|drapeau|bannière|banner|voile|sail|tente|page|feuille|leaf|papier|paper|carte|map|porte|door|portail|gate", "plane", { type: "plane", args: [3, 3] }],
  ["flat ring|anneau plat|cerceau|hula hoop|couronne plate|flat halo|jante plat|cercle ouvert|track|piste|orbite plane|washers|rondelle", "flatring", { type: "ring", args: [1.2, 0.6, 24] }]
];

type MaterialPreset = {
  metalness: number;
  roughness: number;
  emissiveMult: number;
  transparency?: boolean;
  transmission?: number;
  iridescence?: number;
  wireframe?: boolean;
  defaultColor?: string;
};

const MATERIAL_LEXICON: [string, string, MaterialPreset][] = [
  ["neon|néon|glow(ing)?|lumineux|fluorescent|luminous|radiant|emissive|luminescent|phosphorescent|brillant|éclatant|scintillant|éclat|rayonnant|incandescent|clignotant", "neon", { metalness: 0.0, roughness: 0.4, emissiveMult: 1.2 }],
  ["plasma|energy|énergie|éthéré|ethereal|ghost|spectr(al|e)|spirit|esprit|fantôme|ectoplasme|aura|champ de force|surge|électrique arc", "plasma", { metalness: 0.0, roughness: 0.2, emissiveMult: 1.5, transparency: true, transmission: 0.3 }],
  ["hologram|holographique|wireframe|grille|grid|digital|matrix|cyber|numérique|virtuel|pixelisé|scanned|projection|interface|hud|data|données|circuit|microchip", "hologram", { metalness: 0.0, roughness: 0.2, emissiveMult: 0.8, wireframe: true }],
  ["lava|lave|magma|molten|fondu|burning|brûlant|incandescent|coulée|volcanique", "lava", { metalness: 0.0, roughness: 0.6, emissiveMult: 1.4, defaultColor: "#ff3d00" }],
  ["ember|braise|brûlure|charbon|cendre chaude|tison|flamme|flame|fire|feu|combustion", "ember", { metalness: 0.0, roughness: 0.7, emissiveMult: 1.8, defaultColor: "#ff6600" }],
  ["glass|verre|transparent|translucent|translucide|clear|see-through|vitreux|cristallin|vitrocéramique|vitrail", "glass", { metalness: 0.0, roughness: 0.05, emissiveMult: 0.1, transparency: true, transmission: 0.95 }],
  ["crystal(line)?|prismat|refract|diaphane", "crystalline", { metalness: 0.1, roughness: 0.0, emissiveMult: 0.2, transparency: true, transmission: 0.7, iridescence: 0.8 }],
  ["ice|glace|frost|givre|frozen|gelé|congelé|glacé|glacial|polaire|arctique|hiver|winter|neige", "ice", { metalness: 0.0, roughness: 0.08, emissiveMult: 0.05, transparency: true, transmission: 0.6, defaultColor: "#c8e8ff" }],
  ["water|eau|liquid|liquide|flotte|fluide|aqueux|marine|océanique|marin|rivière|river|lac|lake|étang|pond|flaque|puddle|goutte|drop|fontaine|fountain|cascade|waterfall|vague|wave", "water", { metalness: 0.0, roughness: 0.02, emissiveMult: 0.0, transparency: true, transmission: 0.85, defaultColor: "#2080c0" }],
  ["gold(en)?|doré|gilded|brass|laiton|bronze|or|aurifère|dorure|feuille d'or", "gold", { metalness: 1.0, roughness: 0.2, emissiveMult: 0.0, defaultColor: "#ffd700" }],
  ["metal(lic)?|acier|steel|chrome|iron|fer|titanium|alumin|silver|argent|métal|ferreux|plomb|lead|cuivre|copper|inox|forgé|forged|trempé|tempered", "metallic", { metalness: 0.95, roughness: 0.08, emissiveMult: 0.0, defaultColor: "#b0c8d8" }],
  ["mirror|miroir|reflective|réfléchissant|polished mirror|chromé|chrome finish", "mirror", { metalness: 1.0, roughness: 0.0, emissiveMult: 0.0, defaultColor: "#e8f0f8" }],
  ["stone|pierre|rock|rocher|marble|marbre|granite|granit|rough|rugueux|cobble|pavé|calcaire|limestone|ardoise|slate|basalte|basalt|caillou|gravier|gravel|roche|rocallle|ruine|ruines|menhir|dolmen|stèle", "stone", { metalness: 0.0, roughness: 0.9, emissiveMult: 0.0, defaultColor: "#8a8070" }],
  ["wood|bois|wooden|timber|plank|planche|chêne|oak|pine|sapin|noyer|walnut|ébène|ebony|acajou|teck|teak|rondin|log|sculpté|carved|raboté|rustique bois|bois flotté|deadwood", "wood", { metalness: 0.0, roughness: 0.85, emissiveMult: 0.0, defaultColor: "#8b5a2b" }],
  ["brick|brique|maçonnerie|masonry|brique rouge|parpaing|cinder block|terracuite|mortier|mortar", "brick", { metalness: 0.0, roughness: 0.95, emissiveMult: 0.0, defaultColor: "#8b3a2a" }],
  ["clay|argile|mud|boue|earth|terre|limon|kaolin|fange|tourbe", "clay", { metalness: 0.0, roughness: 0.90, emissiveMult: 0.0, defaultColor: "#9a7050" }],
  ["bone|os|skull|crâne|ivory|ivoire|horn|dent|tooth|chitin|carapace|shell|coquille|coquillage|écaille|squelette|skeleton", "bone", { metalness: 0.0, roughness: 0.82, emissiveMult: 0.0, defaultColor: "#e8dcc0" }],
  ["plastic|plastique|polymer|résine|acrylic|acrylique|polycarbonate|nylon|pvc|abs|époxy|epoxy|polyester", "plastic", { metalness: 0.05, roughness: 0.3, emissiveMult: 0.0 }],
  ["ceramic|céramique|porcelain|porcelaine|émaillé|enamel coated|vernisé|glazed", "ceramic", { metalness: 0.0, roughness: 0.15, emissiveMult: 0.0, defaultColor: "#f0ede8" }]
];

const COLOR_LEXICON: [string, string, string][] = [
  ["red|rouge|crimson|cramoisi|scarlet|[eé]carlate|ruby|rubis|blood|sang|vermeil|carmin|carmine|grenat|tomate|cerise|cherry|framboise|vin rouge|bourgogne|bordeaux|maroon|brique|coquelicot", "red", "#ff1e3c"],
  ["orange|sunset|couchant|abricot|apricot|carotte|carrot|mandarine|safran|saffron|potiron|pumpkin|corail|coral|pêche|peach|mangue|mango", "orange", "#ff6600"],
  ["yellow|jaune|sun|soleil|lemon|citron|or clair|canari|canary|moutarde|mustard|beurre|butter|maïs|blé|paille|champagne|sable clair|doré clair|solar|solaire", "yellow", "#ffe000"],
  ["gold|golden|doré|amber|ambre|brass|or|cuivré|champagne or|miel doré", "gold", "#ffd700"],
  ["green|vert|emerald|[eé]meraude|jade|lime|forest|for[eê]t|prairie|herbe|grass|olive|mousse|moss|pomme|menthe|mint|pin|pine|sauge|sage|algue|chlorophylle|fougère", "green", "#00e676"],
  ["cyan|turquoise|aqua|teal|sarcelle|ice|glace|bleu canard|bleu sarcelle|pool|lagune|lagoon|glacier|aquamarine|aigue-marine", "cyan", "#00e5ff"],
  ["blue|bleu|navy|marine|cobalt|sapphire|saphir|ocean|sky|ciel|azure|azur|indigo clair|bleuet|bleu roi|royal blue|bleu nuit|midnight blue|outremer|bleu acier|slate blue|denim|jean", "blue", "#2979ff"],
  ["violet|purple|mauve|indigo|amethyst|am[eé]thyste|lavender|lavande|pourpre|prune|plum|parme|lilas|lilac|mûre|raisin|grape|glycine|orchidée|pourpre impérial", "violet", "#9c27b0"],
  ["pink|rose|magenta|fuchsia|bonbon|candy|barbe à papa|saumon|salmon|flamingo|pivoine|blush|rose vif", "pink", "#f50057"],
  ["white|blanc|snow|neige|ivory|ivoire|pearl|perle|silver|argent|crème|cream|blanc cassé|off-white|écru|albâtre|porcelaine|blanc de lait|pure white|coton|glacier white", "white", "#e8e8ff"],
  ["black|noir|shadow|ombre|void|néant|abyss|abîme|midnight|minuit|charbon|coal|encre|ink|obsidienne noire|noir de jais|jet black|noir mat|ébène|ebony|corbeau|sombre|obscur", "black", "#0a0015"],
  ["gray|grey|gris|slate|ardoise|ash|cendre|gris souris|gris fer|gris acier|gris perle|taupe|ciment gris|anthracite|charcoal|gris fumée", "gray", "#9e9e9e"],
  ["brown|marron|brun|châtain|chestnut|chocolat|chocolate|terre|sienna|sienne|sépia|sepia|acajou|noisette|cacao|café|espresso|caramel|toffee", "brown", "#8b4513"]
];

const ANIMATION_LEXICON: [string, AnimateType][] = [
  ["orbit(ing)?|revolv(ing)?|circling|tourne autour|en orbite|orbital|circulaire|rotation autour|satellit|en cercle|révolution", "orbit"],
  ["float(ing)?|hover(ing)?|levitat|flott|suspendu|en suspension|a[eé]rien|plane|planant|sans gravit[eé]|z[eé]ro g|apesanteur|antigrav|dans l'air", "float"],
  ["spin(ning)?|rotat(ing)?|whirl(ing)?|tourn|en rotation|rotatif|giratoire|sur lui-m[eê]me|pirouette|tournoyant|tourbillon|vortex|spiral|spirale", "spin"],
  ["puls(ing|e)?|throb(bing)?|beat(ing)?|heart|cœur|cardiaque|rythme|tempo|battant|palpitant|vibrant|vibrer|pulsion", "pulse"],
  ["wav(ing|e)?|undulat|rippl|fluid|flow(ing)?|flot|courant|ruisselant|ond[eé]|vaguelette|ondulant|serpentin|serpentant", "wave"],
  ["breath(ing|e)?|expand|contract|respir|inspir|expir|souffle|gonfl|d[eé]gonfl|respiration", "breathe"]
];

const SCENE_LEXICON: [string, SceneType][] = [
  ["galaxy|galaxie|cosmos|nebul|milky way|voie lact[eé]e|star field|univers|universe|constellation", "galaxy"],
  ["vortex|tornado|tornade|whirlpool|tourbillon|temp[eê]te|cyclone|ouragan|hurricane|maelstr[eö]m|maelström|vortex", "vortex"],
  ["orbit|solar system|plan[eè]tes|atom|[eé]lectron|molecul|syst[eè]me solaire|planetary|lunes|moons", "orbital"],
  ["helix|h[eé]lice|dna|adn|spiral column|colonne spirale|brin|strand|double h[eé]lice|ruban|ribbon|spire|vrille|twist", "helix"],
  ["grid|grille|lattice|r[eé]seau|array|matrix|field|champ|matrice|damier|damier|quadrillage|damier|checkerboard|pavage", "grid"],
  ["cluster|groupe|cave|cavern|caverne|field of|champ de|forest of|for[eê]t de|swarm|banc|amas|pile|tas|stack|collection|multitude|myriade|nu[eé]e|grotte", "cluster"],
  ["ring of|cercle de|halo of|circle of|couronne de|crown of|anneau de|ronde de|rond de|cercle magique|magic circle|cromlech", "ring"]
];

const SPECIAL_EFFECT_LEXICON: [string, string][] = [
  ["glue|colle|adh[eé]sif|visqueux|viscous|slime|slimy|goo|gluant|glu|gummies|gummy|jelly|gel[eé]e|gelatin|g[eé]latine|pate|paste|dough|p[aâ]te|marshmallow|chewing-gum|bubble-gum|nuggets", "glue"],
  ["fluid|liquide|liquid|flow|coulant|ruisselant|streaming|courant|flux|jet|gicl[eé]e|vapeur|steam", "fluid"],
  ["pixel|pixelated|pixelis[eé]|voxel|voxelized|8bit|8-bit|retro|r[eé]tro|arcade|nes|snes|gameboy|sprite|bitmap|bitmapped|dot matrix|fusion", "pixel-fusion"],
  ["smog|brouillard|fog|brume|mist|haze|smog urbain|urban smog|pollution atmosph[eé]rique|toxic fog", "smog"],
  ["thunder|tonnerre|foudre|lightning|[eé]clair|storm|temp[eê]te|orage|thunderstorm|orageux|blizzard|hail|pluie|rain|diluvien|deluge|d[eé]luge", "thunder"],
  ["ice|glace|frozen|gel[eé]|congel[eé]|glacial|frost|givre|blizzard|glacier|iceberg|banquise|ice field|verglac[eé]|verglas|crystal ice|cristal de glace|stalactite", "ice"],
  ["root|racine|roots|racines|vine|liane|vines|lianes|overgrown|envahi|nature|natural|forest|for[eê]t|jungle|vegetation|druid|druide|ent|yggdrasil", "roots"],
  ["lunar|lunaire|moon|lune|moonlight|claire de lune|moonbeam|selene|s[eé]l[eé]n[eé]|croissant de lune|full moon|pleine lune|new moon|eclipse|[eé]clipse|blood moon|supermoon", "lunar"],
  ["astral|cosmic|cosmique|celestial|c[eé]leste|stellar|stellaire|star|[eé]toile|stars|nebula|n[eé]buleuse|galaxy|galaxie|univers|universe|wormhole|black hole|trou noir|space|deep space|void|n[eé]ant|supernova", "astral"],
  ["azeroth|warcraft|world of warcraft|wow|horde|alliance|orc|orcs|human|humain|elf|elfe|undead|lich king|arthas|sylvanas|thrall|jaina|illidan", "azeroth"],
  ["illidan|demon|d[eé]mon|demonic|fel|fel energy|[eé]nergie gangren[eé]e|fel magic|fel fire|burning legion|l[eé]gion ardente|sargeras|pit lord|succubus|soul magic|shadow magic", "illidan"],
  ["psychic|psychique|mind|esprit|mental|t[eé]l[eé]pathie|telepathy|telekinesis|clairvoyance|pr[eé]monition|prophecy|proph[eé]tie|chakra|aura|chi|qi|mana|spell|sort|incantation", "psychic"],
  ["boomyphizz|explosive|explosif|explosion|d[eé]tonation|blast|shockwave|onde de choc|bang|boom|kaboom|firework|rocket|fus[eé]e|missile|bomb|bombe|grenade|dynamite|tnt", "boomyphizz"],
  ["thouquilis|ethereal|[eé]th[eé]r[eé]|whisper|murmure|ghost|fant[oô]me|spectre|spirit|apparition|phantom|shade|shadow|resonance|r[eé]sonance", "thouquilis"],
  ["poukartaniko|chaotic|chaotique|chaos|d[eé]sordre|entropy|entropie|random|al[eé]atoire|turbulence|fracture|shatter|debris|ruins|decay", "poukartaniko"],
  ["raticopacotille|scattered|[eé]parpill[eé]|dispersed|spread|disseminated|playful|joueur|mischief|mischievous|trickster|trick|tour|prank|farce|joke|illusion", "raticopacotille"],
  ["mangerai|macoquille|feast|festin|banquet|repas|meal|dinner|lunch|pastry|g[aâ]teau|cake|pie|tarte|cookie|bread|pain|sandwich|burger|pizza|pasta|p[aâ]tes|sushi|ramen|rice|riz|wine|vin|beer|bi[eè]re|coffee|caf[eé]|tea|th[eé]|chocolate|chocolat|fruit|vegetable|cheese|fromage", "mangerai"]
];

const MODIFIER_LEXICON: [string, string][] = [
  ["giant|huge|enormous|massive|grand|gigantesque|immense|colossal|titanesque|m[eé]ga|g[eé]ant|g[eé]ante|monstrueux|tr[eè]s grand|extra large|titan|titanique", "giant"],
  ["tiny|micro|mini|small|petit|minuscule|little|petite|nain|compact|menu|infime|microscopique|minim|r[eé]duit|petite taille|fin", "tiny"],
  ["many|multiple|plusieurs|countless|innombrable|myriad|myriade|lots of|beaucoup|abondant|profusion|multitude|innombrables|exub[eé]rant", "many"],
  ["sharp|pointy|jagged|ac[eé]r[eé]|angulaire|[eé]pineux|spiky|spiked|tranchant|coupant|rasoir|razor|couteau|lame|affil[eé]|dentel[eé]|[eé]pines", "sharp"],
  ["smooth|poli|soft|doux|sleek|lisse|polished|soyeux|silk-smooth|velout[eé]|velvety|glissant|satin[eé]|r[eé]gulier|uniforme|liss[eé]", "smooth"],
  ["dark|sombre|obscur|ominous|sinister|evil|noir|shadowy|t[eé]n[eé]breux|macabre|lugubre|funeste|mal[eé]fique|sinistre|inquiet|inqui[eé]tante|terrifiant|gothique", "dark"],
  ["ancient|ancien|mystical|mystique|arcane|archa[iï]que|ruined|ruines|antique|v[eé]n[eé]rable|mill[eé]naire|pr[eé]historique|v[eé]tuste|d[eé]labr[eé]|m[eé]di[eé]val|m[eé]di[eé]vale|celte|viking", "ancient"],
  ["futuristic|futuriste|cyber|sci-fi|tech|digital|num[eé]rique|hightech|high-tech|quantique|nanotech|cyberpunk|andro[iï]de|clone|ia|ai|neural|network|quantum", "futuristic"],
  ["electric|[eé]lectrique|lightning|foudre|volt|voltaique|amp[eè]re|courant|[eé]tincelle|spark|[eé]lectrique statique|tesla|ion|ionique|magn[eé]tique", "electric"],
  ["magical|magique|enchant[eé]|ensorcel[eé]|bewitched|maudit|cursed|divin|divine|sacr[eé]|b[eé]nit|blessed|profane|arcanique|runique|mystique|occulte|surnaturel|c[eé]leste|infernal|d[eé]moniaque|sorcellerie|spell|rituel|grimoire|potion|art[eé]fact|artifact", "magical"],
  ["burning|br[uû]lant|incandescent|en feu|on fire|combustion|ardent|calcin[eé]|carbonis[eé]|bouillant|volcanique|magma|lave|lava|braise|ember|brasier|blaze", "burning"],
  ["frozen|gel[eé]|congel[eé]|glac[eé]|glacial|hivernal|frigide|cryog[eé]nique|permafrost|polaire|arctique|neigeux|givr[eé]|givre|verglas|ice crystal|iceberg", "frozen"],
  ["rotting|pourrissant|d[eé]compos[eé]|n[eé]crotique|putride|pourri|moisi|moldy|champignon|fungus|fongique|myc[e9]lium|spores|corrod[e9]|oxyd[e9]", "rotting"],
  ["holy|sacr[e9]|divin|b[e9]ni|consacr[e9]|pri[e8]re|psalm|ang[e9]lique|seraphin|divinit[e9]|paladin|templar|cathedral|cathédrale|basilique|sanctuaire|autel|altar", "holy"]
];

interface BpPart {
  geo: GeometryDef;
  matKey: string;
  color?: string;
  pos: [number, number, number];
  rot?: [number, number, number];
  scl?: [number, number, number];
  colorable?: boolean;
  emissive?: string;
  minQuality?: "balanced" | "high";
}

interface Blueprint {
  label: string;
  parts: BpPart[];
  fastParts?: number;
  lightColor?: string;
  lightColor2?: string;
  ambientColor?: string;
  background?: string;
}

const BLUEPRINTS: Record<string, Blueprint> = {
  house: {
    label: "House",
    fastParts: 2,
    ambientColor: "#0a0500", lightColor: "#ff9933", lightColor2: "#4422ff", background: "#080005",
    parts: [
      { geo: { type: "box", args: [2.0, 1.5, 1.6] }, matKey: "stone", color: "#9a8878", pos: [0, 0, 0], colorable: true },
      { geo: { type: "cone", args: [1.38, 1.0, 4] }, matKey: "clay", pos: [0, 1.25, 0], rot: [0, Math.PI / 4, 0] },
      { geo: { type: "cylinder", args: [0.12, 0.12, 0.65, 8] }, matKey: "stone", color: "#807060", pos: [0.52, 1.72, 0.25], minQuality: "balanced" },
      { geo: { type: "box", args: [0.38, 0.58, 0.07] }, matKey: "wood", color: "#6b3a18", pos: [0, -0.46, 0.84], minQuality: "balanced" },
      { geo: { type: "box", args: [0.32, 0.32, 0.05] }, matKey: "glass", pos: [-0.56, 0.12, 0.84], minQuality: "balanced" },
      { geo: { type: "box", args: [0.32, 0.32, 0.05] }, matKey: "glass", pos: [0.56, 0.12, 0.84], minQuality: "balanced" }
    ]
  },
  tree: {
    label: "Tree",
    fastParts: 2,
    ambientColor: "#010a02", lightColor: "#44ff88", lightColor2: "#2244ff", background: "#030908",
    parts: [
      { geo: { type: "cylinder", args: [0.22, 0.28, 1.6, 12] }, matKey: "wood", color: "#5a3010", pos: [0, -1.0, 0] },
      { geo: { type: "sphere", args: [1.1, 16, 16] }, matKey: "green", pos: [0, 0.2, 0], scl: [1.0, 0.85, 1.0] },
      { geo: { type: "sphere", args: [0.85, 16, 16] }, matKey: "green", color: "#1a8c20", pos: [0, 1.0, 0], minQuality: "balanced" },
      { geo: { type: "sphere", args: [0.55, 12, 12] }, matKey: "darkgreen", pos: [0, 1.65, 0], minQuality: "balanced" }
    ]
  },
  rocket: {
    label: "Rocket",
    fastParts: 2,
    ambientColor: "#000008", lightColor: "#ff6600", lightColor2: "#4488ff", background: "#020008",
    parts: [
      { geo: { type: "cylinder", args: [0.5, 0.5, 2.6, 16] }, matKey: "metal", color: "#c0d0e0", pos: [0, 0, 0], colorable: true },
      { geo: { type: "cone", args: [0.5, 1.0, 16] }, matKey: "metal", color: "#d0e0f0", pos: [0, 1.8, 0] },
      { geo: { type: "box", args: [0.6, 0.65, 0.06] }, matKey: "dark-metal", pos: [-0.52, -1.05, 0], rot: [0, 0, 0.22], minQuality: "balanced" },
      { geo: { type: "box", args: [0.6, 0.65, 0.06] }, matKey: "dark-metal", pos: [0.52, -1.05, 0], rot: [0, 0, -0.22], minQuality: "balanced" },
      { geo: { type: "box", args: [0.06, 0.65, 0.6] }, matKey: "dark-metal", pos: [0, -1.05, 0.52], rot: [0.22, 0, 0], minQuality: "balanced" },
      { geo: { type: "sphere", args: [0.18, 16, 16] }, matKey: "glass", pos: [0, 0.4, 0.52], minQuality: "balanced" }
    ]
  },
  sword: {
    label: "Sword",
    fastParts: 2,
    ambientColor: "#050005", lightColor: "#aabbff", lightColor2: "#ffaa22", background: "#040008",
    parts: [
      { geo: { type: "box", args: [0.09, 2.55, 0.016] }, matKey: "metal", color: "#c8d8e8", pos: [0, 1.1, 0], colorable: true },
      { geo: { type: "box", args: [1.05, 0.1, 0.14] }, matKey: "gold", pos: [0, -0.16, 0] },
      { geo: { type: "cylinder", args: [0.07, 0.07, 0.95, 12] }, matKey: "leather", color: "#4a2510", pos: [0, -0.75, 0], minQuality: "balanced" },
      { geo: { type: "sphere", args: [0.18, 16, 16] }, matKey: "gold", pos: [0, -1.28, 0], minQuality: "balanced" }
    ]
  },
  tower: {
    label: "Tower",
    fastParts: 3,
    ambientColor: "#02000a", lightColor: "#6644aa", lightColor2: "#224488", background: "#040008",
    parts: [
      { geo: { type: "cylinder", args: [1.05, 1.05, 2.1, 10] }, matKey: "stone", color: "#7a7060", pos: [0, -1.2, 0] },
      { geo: { type: "cylinder", args: [0.9, 1.05, 1.9, 10] }, matKey: "stone", color: "#706a58", pos: [0, 0.75, 0] },
      { geo: { type: "cone", args: [0.96, 1.1, 10] }, matKey: "dark-metal", pos: [0, 2.3, 0] },
      { geo: { type: "torus", args: [0.95, 0.08, 8, 32] }, matKey: "stone", color: "#807868", pos: [0, 1.75, 0], minQuality: "balanced" }
    ]
  },
  mushroom: {
    label: "Mushroom",
    fastParts: 2,
    ambientColor: "#030a02", lightColor: "#88ffaa", lightColor2: "#ff44aa", background: "#040808",
    parts: [
      { geo: { type: "cylinder", args: [0.28, 0.36, 1.25, 12] }, matKey: "white", color: "#f0ede8", pos: [0, -0.82, 0] },
      { geo: { type: "sphere", args: [1.05, 16, 16] }, matKey: "red", pos: [0, 0.55, 0], scl: [1.3, 0.7, 1.3], colorable: true },
      { geo: { type: "cylinder", args: [0.88, 0.28, 0.12, 16] }, matKey: "white", color: "#e8e4de", pos: [0, 0.08, 0], minQuality: "balanced" },
      { geo: { type: "sphere", args: [0.11, 8, 8] }, matKey: "white", pos: [0.55, 0.82, 0.55], minQuality: "balanced" },
      { geo: { type: "sphere", args: [0.09, 8, 8] }, matKey: "white", pos: [-0.5, 0.9, 0.3], minQuality: "balanced" }
    ]
  },
  robot: {
    label: "Robot",
    fastParts: 6,
    ambientColor: "#000508", lightColor: "#00ffcc", lightColor2: "#ff4400", background: "#020408",
    parts: [
      { geo: { type: "box", args: [0.9, 1.1, 0.6] }, matKey: "metal", color: "#3a4a5a", pos: [0, 0.4, 0], colorable: true },
      { geo: { type: "box", args: [0.62, 0.62, 0.62] }, matKey: "metal", color: "#3a4a5a", pos: [0, 1.62, 0] },
      { geo: { type: "cylinder", args: [0.17, 0.17, 1.05, 12] }, matKey: "metal", color: "#2a3a4a", pos: [-0.65, 0.38, 0] },
      { geo: { type: "cylinder", args: [0.17, 0.17, 1.05, 12] }, matKey: "metal", color: "#2a3a4a", pos: [0.65, 0.38, 0] },
      { geo: { type: "cylinder", args: [0.2, 0.2, 1.12, 12] }, matKey: "metal", color: "#2a3a4a", pos: [-0.28, -0.85, 0] },
      { geo: { type: "cylinder", args: [0.2, 0.2, 1.12, 12] }, matKey: "metal", color: "#2a3a4a", pos: [0.28, -0.85, 0] },
      { geo: { type: "sphere", args: [0.085, 8, 8] }, matKey: "neon", color: "#00ffcc", pos: [-0.17, 1.66, 0.32], emissive: "#00ffcc", minQuality: "balanced" },
      { geo: { type: "sphere", args: [0.085, 8, 8] }, matKey: "neon", color: "#00ffcc", pos: [0.17, 1.66, 0.32], emissive: "#00ffcc", minQuality: "balanced" }
    ]
  },
  lamp: {
    label: "Lamp",
    fastParts: 4,
    ambientColor: "#060400", lightColor: "#ffcc44", lightColor2: "#4488ff", background: "#060402",
    parts: [
      { geo: { type: "cylinder", args: [0.52, 0.38, 0.18, 16] }, matKey: "metal", color: "#403020", pos: [0, -1.82, 0] },
      { geo: { type: "cylinder", args: [0.045, 0.045, 3.1, 10] }, matKey: "metal", color: "#504030", pos: [0, 0.15, 0] },
      { geo: { type: "cone", args: [0.72, 0.62, 16] }, matKey: "ceramic", color: "#f0ebe0", pos: [0, 1.55, 0], rot: [Math.PI, 0, 0] },
      { geo: { type: "sphere", args: [0.18, 12, 12] }, matKey: "neon", color: "#ffe880", pos: [0, 1.35, 0], emissive: "#ffe880" }
    ]
  },
  car: {
    label: "Car",
    fastParts: 6,
    ambientColor: "#020005", lightColor: "#ffffff", lightColor2: "#4466ff", background: "#020005",
    parts: [
      { geo: { type: "box", args: [2.1, 0.52, 1.0] }, matKey: "metal", color: "#cc2200", pos: [0, -0.06, 0], colorable: true },
      { geo: { type: "box", args: [1.28, 0.44, 0.92] }, matKey: "metal", color: "#aa1a00", pos: [0, 0.46, 0] },
      { geo: { type: "torus", args: [0.27, 0.12, 10, 24] }, matKey: "rubber", color: "#141414", pos: [-0.74, -0.34, 0.52], rot: [Math.PI / 2, 0, 0] },
      { geo: { type: "torus", args: [0.27, 0.12, 10, 24] }, matKey: "rubber", color: "#141414", pos: [0.74, -0.34, 0.52], rot: [Math.PI / 2, 0, 0] },
      { geo: { type: "torus", args: [0.27, 0.12, 10, 24] }, matKey: "rubber", color: "#141414", pos: [-0.74, -0.34, -0.52], rot: [Math.PI / 2, 0, 0] },
      { geo: { type: "torus", args: [0.27, 0.12, 10, 24] }, matKey: "rubber", color: "#141414", pos: [0.74, -0.34, -0.52], rot: [Math.PI / 2, 0, 0] }
    ]
  },
  crystals: {
    label: "Crystal Formation",
    fastParts: 3,
    ambientColor: "#020010", lightColor: "#aa44ff", lightColor2: "#00ffcc", background: "#020010",
    parts: [
      { geo: { type: "octahedron", args: [0.9, 0] }, matKey: "crystal", color: "#c044ff", pos: [0, 0.2, 0], scl: [1, 1.6, 1], emissive: "#8800ff" },
      { geo: { type: "octahedron", args: [0.55, 0] }, matKey: "crystal", color: "#44aaff", pos: [0.92, -0.4, 0.3], scl: [0.7, 1.4, 0.7], emissive: "#0066ff" },
      { geo: { type: "octahedron", args: [0.45, 0] }, matKey: "crystal", color: "#ff44aa", pos: [-0.8, -0.5, 0.5], scl: [0.6, 1.3, 0.6], emissive: "#cc0066" }
    ]
  },
  lantern: {
    label: "Lantern",
    fastParts: 6,
    ambientColor: "#050300", lightColor: "#ffaa22", lightColor2: "#ff4400", background: "#060402",
    parts: [
      { geo: { type: "cylinder", args: [0.025, 0.025, 0.85, 8] }, matKey: "metal", color: "#402a10", pos: [0.28, 0, 0.28] },
      { geo: { type: "cylinder", args: [0.025, 0.025, 0.85, 8] }, matKey: "metal", color: "#402a10", pos: [-0.28, 0, 0.28] },
      { geo: { type: "cylinder", args: [0.025, 0.025, 0.85, 8] }, matKey: "metal", color: "#402a10", pos: [0.28, 0, -0.28] },
      { geo: { type: "cylinder", args: [0.025, 0.025, 0.85, 8] }, matKey: "metal", color: "#402a10", pos: [-0.28, 0, -0.28] },
      { geo: { type: "cone", args: [0.38, 0.34, 4] }, matKey: "metal", color: "#402a10", pos: [0, 0.58, 0], rot: [0, Math.PI / 4, 0] },
      { geo: { type: "sphere", args: [0.12, 12, 12] }, matKey: "neon", color: "#ffaa22", pos: [0, -0.12, 0], emissive: "#ff8800" }
    ]
  },
  skull: {
    label: "Skull",
    fastParts: 4,
    ambientColor: "#050001", lightColor: "#aa4400", lightColor2: "#440088", background: "#050001",
    parts: [
      { geo: { type: "sphere", args: [0.72, 16, 16] }, matKey: "bone", pos: [0, 0.18, 0], scl: [1, 1.05, 0.95] },
      { geo: { type: "sphere", args: [0.62, 16, 16] }, matKey: "bone", color: "#ddd0b0", pos: [0, -0.38, 0.1], scl: [1.0, 0.5, 0.95] },
      { geo: { type: "sphere", args: [0.2, 12, 12] }, matKey: "void", pos: [-0.28, 0.15, 0.6] },
      { geo: { type: "sphere", args: [0.2, 12, 12] }, matKey: "void", pos: [0.28, 0.15, 0.6] }
    ]
  },
  shield: {
    label: "Shield",
    fastParts: 2,
    ambientColor: "#050005", lightColor: "#aabbff", lightColor2: "#ffaa22", background: "#040008",
    parts: [
      { geo: { type: "circle", args: [1.2, 24] }, matKey: "metal", color: "#a0a8b0", pos: [0, 0, 0], rot: [0, 0, 0], colorable: true },
      { geo: { type: "sphere", args: [0.25, 12, 12] }, matKey: "gold", pos: [0, 0, 0.1], scl: [1, 1, 0.4] },
      { geo: { type: "torus", args: [1.18, 0.06, 8, 32] }, matKey: "metal", color: "#808890", pos: [0, 0, 0.03], minQuality: "balanced" }
    ]
  },
  axe: {
    label: "Axe",
    fastParts: 2,
    ambientColor: "#050005", lightColor: "#aabbff", lightColor2: "#ffaa22", background: "#040008",
    parts: [
      { geo: { type: "cylinder", args: [0.06, 0.06, 2.2, 12] }, matKey: "wood", color: "#5a3010", pos: [0, 0, 0] },
      { geo: { type: "box", args: [1.2, 0.6, 0.08] }, matKey: "metal", color: "#b0b8c0", pos: [0.35, 0.9, 0], colorable: true },
      { geo: { type: "box", args: [1.2, 0.02, 0.02] }, matKey: "metal", color: "#e8f4ff", pos: [0.35, 1.2, 0], minQuality: "balanced" }
    ]
  },
  throne: {
    label: "Throne",
    fastParts: 4,
    ambientColor: "#050005", lightColor: "#ffaa44", lightColor2: "#4422aa", background: "#060008",
    parts: [
      { geo: { type: "box", args: [1.2, 0.18, 1.0] }, matKey: "gold", pos: [0, 0, 0] },
      { geo: { type: "box", args: [1.2, 1.8, 0.15] }, matKey: "gold", pos: [0, 0.9, -0.42] },
      { geo: { type: "box", args: [0.15, 0.6, 1.0] }, matKey: "gold", pos: [-0.52, 0.3, 0] },
      { geo: { type: "box", args: [0.15, 0.6, 1.0] }, matKey: "gold", pos: [0.52, 0.3, 0] }
    ]
  },
  bridge: {
    label: "Bridge",
    fastParts: 4,
    ambientColor: "#050400", lightColor: "#ff9933", lightColor2: "#4488ff", background: "#040006",
    parts: [
      { geo: { type: "box", args: [5.0, 0.12, 1.2] }, matKey: "stone", color: "#807060", pos: [0, 0, 0] },
      { geo: { type: "box", args: [5.0, 0.35, 0.08] }, matKey: "stone", color: "#706858", pos: [0, 0.22, 0.56] },
      { geo: { type: "box", args: [5.0, 0.35, 0.08] }, matKey: "stone", color: "#706858", pos: [0, 0.22, -0.56] },
      { geo: { type: "cylinder", args: [0.2, 0.25, 1.2, 8] }, matKey: "stone", color: "#706858", pos: [-1.8, -0.55, 0.5] }
    ]
  },
  chest: {
    label: "Chest",
    fastParts: 3,
    ambientColor: "#050300", lightColor: "#ffaa22", lightColor2: "#4488ff", background: "#060402",
    parts: [
      { geo: { type: "box", args: [1.4, 0.75, 0.85] }, matKey: "wood", color: "#6b3a18", pos: [0, 0, 0], colorable: true },
      { geo: { type: "box", args: [1.42, 0.15, 0.87] }, matKey: "wood", color: "#7a4520", pos: [0, 0.45, 0] },
      { geo: { type: "cylinder", args: [0.42, 0.42, 1.38, 12] }, matKey: "wood", color: "#7a4520", pos: [0, 0.52, 0], rot: [0, 0, Math.PI / 2], minQuality: "balanced" }
    ]
  },
  potion: {
    label: "Potion",
    fastParts: 3,
    ambientColor: "#020010", lightColor: "#44aaff", lightColor2: "#ff44aa", background: "#030010",
    parts: [
      { geo: { type: "sphere", args: [0.5, 24, 24] }, matKey: "glass", pos: [0, -0.2, 0], scl: [1, 1.3, 1] },
      { geo: { type: "cylinder", args: [0.12, 0.18, 0.5, 12] }, matKey: "glass", pos: [0, 0.6, 0] },
      { geo: { type: "cylinder", args: [0.14, 0.12, 0.12, 8] }, matKey: "wood", color: "#8a6a40", pos: [0, 0.9, 0], minQuality: "balanced" }
    ]
  },
  key: {
    label: "Key",
    fastParts: 3,
    ambientColor: "#050005", lightColor: "#ffd700", lightColor2: "#4488ff", background: "#040008",
    parts: [
      { geo: { type: "torus", args: [0.3, 0.06, 12, 24] }, matKey: "gold", pos: [0, 0.6, 0] },
      { geo: { type: "cylinder", args: [0.04, 0.04, 1.4, 8] }, matKey: "gold", color: "#c09020", pos: [0, -0.2, 0] },
      { geo: { type: "box", args: [0.35, 0.08, 0.04] }, matKey: "gold", color: "#c09020", pos: [0.15, -0.85, 0], minQuality: "balanced" }
    ]
  },
  crown: {
    label: "Crown",
    fastParts: 4,
    ambientColor: "#050300", lightColor: "#ffd700", lightColor2: "#ff44aa", background: "#060404",
    parts: [
      { geo: { type: "torus", args: [0.65, 0.1, 12, 48] }, matKey: "gold", pos: [0, 0, 0] },
      { geo: { type: "cone", args: [0.08, 0.5, 4] }, matKey: "gold", pos: [0, 0.35, 0.6] },
      { geo: { type: "cone", args: [0.06, 0.4, 4] }, matKey: "gold", pos: [-0.55, 0.3, 0.3], minQuality: "balanced" },
      { geo: { type: "cone", args: [0.06, 0.4, 4] }, matKey: "gold", pos: [0.55, 0.3, 0.3], minQuality: "balanced" }
    ]
  },
  wand: {
    label: "Wand",
    fastParts: 3,
    ambientColor: "#020010", lightColor: "#cc00ff", lightColor2: "#00ffcc", background: "#030010",
    parts: [
      { geo: { type: "cylinder", args: [0.035, 0.05, 2.2, 8] }, matKey: "wood", color: "#4a2a10", pos: [0, 0, 0] },
      { geo: { type: "cylinder", args: [0.06, 0.06, 0.6, 8] }, matKey: "leather", color: "#3a1808", pos: [0, -0.7, 0], minQuality: "balanced" },
      { geo: { type: "octahedron", args: [0.12, 0] }, matKey: "crystal", color: "#cc44ff", pos: [0, 1.18, 0], emissive: "#9900cc", colorable: true }
    ]
  },
  schoolBench: {
    label: "School Bench",
    fastParts: 3,
    parts: [
      { geo: { type: "box", args: [1.8, 0.1, 0.6] }, matKey: "wood", color: "#8b5a2b", pos: [0, 0.5, -0.3] },
      { geo: { type: "box", args: [1.8, 0.08, 0.35] }, matKey: "wood", color: "#7a4a20", pos: [0, 0.05, 0.45] },
      { geo: { type: "cylinder", args: [0.04, 0.04, 1.0, 8] }, matKey: "metallic", color: "#1a1a1a", pos: [-0.85, 0, -0.3] },
      { geo: { type: "cylinder", args: [0.04, 0.04, 1.0, 8] }, matKey: "metallic", color: "#1a1a1a", pos: [0.85, 0, -0.3] }
    ]
  },
  parkBench: {
    label: "Park Bench",
    fastParts: 3,
    parts: [
      { geo: { type: "box", args: [2.0, 0.08, 0.5] }, matKey: "wood", color: "#6b3a20", pos: [0, 0, 0] },
      { geo: { type: "box", args: [2.0, 0.5, 0.08] }, matKey: "wood", color: "#6b3a20", pos: [0, 0.28, -0.24] },
      { geo: { type: "box", args: [0.1, 0.6, 0.6] }, matKey: "metallic", color: "#222222", pos: [-0.95, -0.05, -0.05] },
      { geo: { type: "box", args: [0.1, 0.6, 0.6] }, matKey: "metallic", color: "#222222", pos: [0.95, -0.05, -0.05] }
    ]
  },
  mallDisplayCase: {
    label: "Mall Display Case",
    fastParts: 3,
    parts: [
      { geo: { type: "box", args: [1.2, 0.8, 1.2] }, matKey: "glass", pos: [0, 0.4, 0] },
      { geo: { type: "box", args: [1.25, 0.4, 1.25] }, matKey: "ceramic", color: "#f5f5f5", pos: [0, -0.2, 0] },
      { geo: { type: "box", args: [1.25, 0.08, 1.25] }, matKey: "metal", color: "#333333", pos: [0, 0.82, 0] }
    ]
  }
};

const BLUEPRINT_LEXICON: [string, string][] = [
  ["maison|house|home|cottage|cabin|cabane|villa|chalet|manoir|manor|logis|hutte|hut|b[aâ]timent|building|demeure|residence|r[eé]sidence|facade", "house"],
  ["arbre|tree|ch[eê]ne|oak|pine|sapin|grand arbre|saule|willow|bouleau|birch|c[eè]dre|cedar|sapin de no[eê]l|palm tree|cocotier", "tree"],
  ["fus[eé]e|rocket|missile|navette|vaisseau|spacecraft|spaceship|shuttle", "rocket"],
  ["[eé]p[eé]e|sword|dagger|blade|lame|saber|sabre|glaive|katana|longsword|shortsword|broadsword|claymore|scimitar|cimeterre", "sword"],
  ["tour|tower|ch[aâ]teau|castle|fort|fortress|donjon|wizard tower|mage tower|clock tower|phare|lighthouse", "tower"],
  ["champignon|mushroom|fungus|toadstool|amanite|bolet|chanterelle|fantasy mushroom", "mushroom"],
  ["robot|andro[iï]de|android|droid|mech|automate|golem|automaton|drone|sentinelle", "robot"],
  ["lampe|lamp|lantern|light|lumi[eè]re|chandelier|sconce|applique|lampadaire", "lamp"],
  ["voiture|car|auto|vehicle|automobile|sports car|truck|camion|van|jeep|sedan", "car"],
  ["cristaux?|crystals?|crystal formation|cluster de cristaux|geode|mine de cristal", "crystals"],
  ["lanterne|lantern|fanal|lampion|chinese lantern|floating lantern", "lantern"],
  ["cr[aâ]ne|skull|death head|t[eê]te de mort|human skull|demon skull", "skull"],
  ["bouclier|shield|[eé]cu|pavise|buckler|round shield|viking shield|champ de force", "shield"],
  ["hache|axe|tomahawk|hachette|war axe|battle axe|double axe|hallebarde", "axe"],
  ["tr[oô]ne|throne|king seat|royal throne|dragon throne|imperial throne", "throne"],
  ["pont|bridge|viaduc|viaduct|passerelle|rope bridge|stone bridge|drawbridge|bifrost", "bridge"],
  ["coffre|chest|treasure chest|strongbox|pirate chest|loot chest", "chest"],
  ["potion|philtre|[eé]lixir|elixir|fiole|flacon|vial|magic potion", "potion"],
  ["cl[eé]|key|clef|golden key|skeleton key|master key|chest key", "key"],
  ["couronne|crown|diad[eè]me|diadem|tiara|tiare|laurel wreath", "crown"],
  ["baguette|wand|b[aâ]ton magique|magic staff|sceptre|scepter|wizard staff|orb", "wand"],
  ["banc d'[eé]cole|school bench|pupitre|bureau d'[eé]colier|student desk|school desk", "schoolBench"],
  ["banc de parc|park bench|banc public|banc de jardin|garden bench", "parkBench"],
  ["vitrine|display case|vitrine de centre commercial|mall display case|store display", "mallDisplayCase"]
];

const QUALITY_ORDER: Record<QualityLevel, number> = { fast: 0, balanced: 1, high: 2 };

export function applyQualityToGeo(geo: GeometryDef, quality: QualityLevel): GeometryDef {
  if (quality === "balanced") return geo;
  const factor = quality === "high" ? 1.6 : 0.35;
  const sc = (n: number, min: number): number => Math.max(min, Math.round(n * factor));
  switch (geo.type) {
    case "sphere": {
      const [r, w, h] = geo.args as [number, number, number];
      return { type: "sphere", args: [r, sc(w, 8), sc(h, 6)] };
    }
    case "cylinder": {
      const [rt, rb, h, s] = geo.args as [number, number, number, number];
      return { type: "cylinder", args: [rt, rb, h, sc(s, 5)] };
    }
    case "cone": {
      const [r, h, s] = geo.args as [number, number, number];
      return { type: "cone", args: [r, h, Math.max(3, sc(s, 3))] };
    }
    case "torus": {
      const [r, t, s1, s2] = geo.args as [number, number, number, number];
      return { type: "torus", args: [r, t, sc(s1, 5), sc(s2, 12)] };
    }
    case "torusKnot": {
      const [r, t, s1, s2, p, q] = geo.args;
      return { type: "torusKnot", args: [r, t, sc(s1, 24), sc(s2, 6), p, q].filter(v => v !== undefined) };
    }
    case "capsule": {
      const [r, l, c, s] = geo.args as [number, number, number, number];
      return { type: "capsule", args: [r, l, sc(c, 3), sc(s, 8)] };
    }
    case "ring": {
      const [ri, ro, s] = geo.args as [number, number, number];
      return { type: "ring", args: [ri, ro, sc(s, 8)] };
    }
    default:
      return geo;
  }
}

function makeBpMat(key: string, color: string, emissiveOverride?: string): MaterialDef {
  const e = emissiveOverride ?? color;
  const dark = "#000000";
  switch (key) {
    case "stone": return { color, emissive: "#0d0c0a", emissiveIntensity: 0, metalness: 0, roughness: 0.92, wireframe: false, transparent: false, opacity: 1 };
    case "brick": return { color: "#8b3a2a", emissive: "#0d0400", emissiveIntensity: 0, metalness: 0, roughness: 0.95, wireframe: false, transparent: false, opacity: 1 };
    case "wood": return { color, emissive: "#050200", emissiveIntensity: 0, metalness: 0, roughness: 0.85, wireframe: false, transparent: false, opacity: 1 };
    case "glass": return { color: "#a8d8f0", emissive: "#001020", emissiveIntensity: 0.05, metalness: 0, roughness: 0.05, wireframe: false, transparent: true, opacity: 0.5, transmission: 0.92, thickness: 1.5 };
    case "metal": return { color, emissive: dark, emissiveIntensity: 0, metalness: 0.95, roughness: 0.08, wireframe: false, transparent: false, opacity: 1 };
    case "dark-metal": return { color: "#1a2030", emissive: dark, emissiveIntensity: 0, metalness: 0.95, roughness: 0.25, wireframe: false, transparent: false, opacity: 1 };
    case "gold": return { color: "#ffd700", emissive: "#3d2800", emissiveIntensity: 0, metalness: 1.0, roughness: 0.2, wireframe: false, transparent: false, opacity: 1 };
    case "neon": return { color: e, emissive: e, emissiveIntensity: 2.2, metalness: 0, roughness: 0.4, wireframe: false, transparent: true, opacity: 0.9 };
    case "fire": return { color: "#ff4400", emissive: "#ff2200", emissiveIntensity: 2.5, metalness: 0, roughness: 0.5, wireframe: false, transparent: true, opacity: 0.8 };
    case "rubber": return { color, emissive: dark, emissiveIntensity: 0, metalness: 0, roughness: 0.92, wireframe: false, transparent: false, opacity: 1 };
    case "ceramic": return { color, emissive: "#060606", emissiveIntensity: 0, metalness: 0, roughness: 0.15, wireframe: false, transparent: false, opacity: 1 };
    case "leather": return { color, emissive: "#040200", emissiveIntensity: 0, metalness: 0, roughness: 0.75, wireframe: false, transparent: false, opacity: 1 };
    case "clay": return { color: "#c2613a", emissive: "#080200", emissiveIntensity: 0, metalness: 0, roughness: 0.88, wireframe: false, transparent: false, opacity: 1 };
    case "crystal": return { color, emissive: e, emissiveIntensity: 0.35, metalness: 0.1, roughness: 0.0, wireframe: false, transparent: true, opacity: 0.8, transmission: 0.72, iridescence: 0.6, thickness: 1.0 };
    case "bone": return { color: "#e8dcc0", emissive: "#0d0c08", emissiveIntensity: 0, metalness: 0, roughness: 0.82, wireframe: false, transparent: false, opacity: 1 };
    case "void": return { color: "#040008", emissive: dark, emissiveIntensity: 0, metalness: 0.0, roughness: 0.95, wireframe: false, transparent: false, opacity: 1 };
    case "green": return { color: "#1a7a20", emissive: "#011002", emissiveIntensity: 0, metalness: 0, roughness: 0.72, wireframe: false, transparent: false, opacity: 1 };
    case "darkgreen": return { color: "#0d4a12", emissive: "#010802", emissiveIntensity: 0, metalness: 0, roughness: 0.78, wireframe: false, transparent: false, opacity: 1 };
    case "red": return { color: "#cc2200", emissive: "#200400", emissiveIntensity: 0, metalness: 0, roughness: 0.7, wireframe: false, transparent: false, opacity: 1 };
    case "white": return { color: "#f0f0f0", emissive: "#050505", emissiveIntensity: 0, metalness: 0, roughness: 0.4, wireframe: false, transparent: false, opacity: 1 };
    default: return { color, emissive: dark, emissiveIntensity: 0, metalness: 0.1, roughness: 0.6, wireframe: false, transparent: false, opacity: 1 };
  }
}

function resolveBlueprint(
  bp: Blueprint,
  userColor: string | null,
  matOverride: MaterialPreset | null,
  quality: QualityLevel
): ObjectDef[] {
  const qv = QUALITY_ORDER[quality];
  let parts = bp.parts;
  if (quality === "fast") {
    const n = bp.fastParts ?? 2;
    parts = parts.filter(p => !p.minQuality);
    parts = parts.slice(0, n);
  } else {
    parts = parts.filter(p => {
      if (!p.minQuality) return true;
      return qv >= QUALITY_ORDER[p.minQuality];
    });
  }

  return parts.map((part): ObjectDef => {
    let partColor = part.color ?? "#aaaaaa";
    if (part.colorable && userColor) partColor = userColor;
    const mat = makeBpMat(part.matKey, partColor, part.emissive);
    if (matOverride && part.colorable) {
      mat.metalness = matOverride.metalness;
      mat.roughness = matOverride.roughness;
      mat.emissiveIntensity = matOverride.emissiveMult * 0.6;
      if (matOverride.transmission) {
        mat.transmission = matOverride.transmission;
        mat.transparent = true;
      }
    }
    if (quality === "high" && !["glass", "crystal", "neon", "fire", "void"].includes(part.matKey)) {
      mat.textureKey = part.matKey;
    }
    return {
      geometry: applyQualityToGeo(part.geo, quality),
      material: mat,
      position: part.pos,
      rotation: part.rot ?? [0, 0, 0],
      scale: 1,
      scaleXYZ: part.scl,
      animate: "none",
      animSpeed: 0
    };
  });
}

export function parsePrompt(prompt: string, quality: QualityLevel = "balanced"): SceneConfig {
  const lower = prompt.toLowerCase();
  const rng = seededRandom(hash(prompt));
  const recognitions: Recognition[] = [];

  // Blueprints early check
  let matchedBpKey: string | null = null;
  for (const [pattern, bpKey] of BLUEPRINT_LEXICON) {
    const rx = new RegExp(`\\b(${pattern})\\b`, "i");
    const m = lower.match(rx);
    if (m) {
      matchedBpKey = bpKey;
      recognitions.push({ token: m[1], label: bpKey, category: "shape" });
      break;
    }
  }

  // Scene archetype
  let sceneTypeRaw: SceneType | null = null;
  for (const [pattern, sType] of SCENE_LEXICON) {
    const rx = new RegExp(`\\b(${pattern})\\b`, "i");
    const m = lower.match(rx);
    if (m) {
      sceneTypeRaw = sType;
      recognitions.push({ token: m[1], label: sType, category: "scene" });
      break;
    }
  }

  // Geometry
  let geoDef: GeometryDef | null = null;
  for (const [pattern, label, gDef] of SHAPE_LEXICON) {
    const rx = new RegExp(`\\b(${pattern})\\b`, "i");
    const m = lower.match(rx);
    if (m) {
      geoDef = gDef;
      recognitions.push({ token: m[1], label, category: "shape" });
      break;
    }
  }

  // Material
  let matPreset: MaterialPreset | null = null;
  for (const [pattern, label, preset] of MATERIAL_LEXICON) {
    const rx = new RegExp(`\\b(${pattern})\\b`, "i");
    const m = lower.match(rx);
    if (m) {
      matPreset = preset;
      recognitions.push({ token: m[1], label, category: "material" });
      break;
    }
  }

  // Colors (multi-match)
  let detectedColor: string | null = null;
  for (const [pattern, label, hex] of COLOR_LEXICON) {
    const rx = new RegExp(`\\b(${pattern})\\b`, "i");
    const m = lower.match(rx);
    if (m) {
      recognitions.push({ token: m[1], label, category: "color", hex });
      if (!detectedColor) detectedColor = hex;
    }
  }

  // Animation
  let animType: AnimateType = "float";
  for (const [pattern, aType] of ANIMATION_LEXICON) {
    const rx = new RegExp(`\\b(${pattern})\\b`, "i");
    const m = lower.match(rx);
    if (m) {
      animType = aType;
      recognitions.push({ token: m[1], label: aType, category: "animation" });
      break;
    }
  }

  // Modifiers
  const modifiers: string[] = [];
  for (const [pattern, label] of MODIFIER_LEXICON) {
    const rx = new RegExp(`\\b(${pattern})\\b`, "i");
    const m = lower.match(rx);
    if (m) {
      recognitions.push({ token: m[1], label, category: "modifier" });
      modifiers.push(label);
    }
  }

  // Special effects
  for (const [pattern, label] of SPECIAL_EFFECT_LEXICON) {
    const rx = new RegExp(`\\b(${pattern})\\b`, "i");
    const m = lower.match(rx);
    if (m) {
      recognitions.push({ token: m[1], label, category: "effect" });
    }
  }

  const isMany = /\b(many|plusieurs|cluster|field of|group of|lots of|beaucoup|myriad|innombrable|countless)\b/i.test(lower);
  const isFew = /\b(few|quelques|couple|pair|several)\b/i.test(lower);
  if (isMany) recognitions.push({ token: "many", label: "many", category: "count" });
  if (isFew) recognitions.push({ token: "few", label: "few", category: "count" });

  const isDark = modifiers.includes("dark");
  const isFuturistic = modifiers.includes("futuristic");
  const isAncient = modifiers.includes("ancient");
  const isElectric = modifiers.includes("electric");
  const isMagical = modifiers.includes("magical");
  const isGiant = modifiers.includes("giant");
  const isTiny = modifiers.includes("tiny");
  const isSharp = modifiers.includes("sharp");
  const isBurning = modifiers.includes("burning");
  const isFrozen = modifiers.includes("frozen");
  const isRotting = modifiers.includes("rotting");
  const isHoly = modifiers.includes("holy");
  const baseScale = isGiant ? 1.7 : isTiny ? 0.5 : 1.0;

  const isNeon = matPreset ? /neon|plasma|lava|ember/.test(recognitions.find(r => r.category === "material")?.label ?? "") : false;
  const isGlass = matPreset?.transmission != null && matPreset.transmission > 0.5;
  const isWireframe = matPreset?.wireframe === true;

  const PALETTE = ["#7c3aed", "#06b6d4", "#10b981", "#f59e0b", "#ef4444", "#ec4899", "#8b5cf6", "#14b8a6"];
  const fallbackColor = PALETTE[hash(prompt) % PALETTE.length];
  const color = detectedColor ?? (
    matPreset?.defaultColor ?? (
      isBurning ? "#ff4400" :
      isFrozen ? "#88ccff" :
      isHoly ? "#ffd700" :
      isRotting ? "#4a6a2a" :
      isElectric ? "#00e5ff" :
      isMagical ? "#c026d3" :
      isFuturistic ? "#00e676" :
      isAncient ? "#ffd700" : fallbackColor
    )
  );

  const effectiveColor = recognitions.some(r => r.label === "lava") ? "#ff3d00" :
                         recognitions.some(r => r.label === "ember") ? "#ff6600" : color;

  // Blueprint Early Exit
  if (matchedBpKey && BLUEPRINTS[matchedBpKey]) {
    const bp = BLUEPRINTS[matchedBpKey];
    const bpObjects = resolveBlueprint(bp, detectedColor, matPreset, quality);
    const isWarm = /warm|chaud|sun|feu|lava|gold|amber|orange|rust|rouille/i.test(lower);
    const isCool = /cool|froid|ice|ocean|space|winter|frost|cold|void|bleu/i.test(lower);

    return {
      sceneType: "single",
      objects: bpObjects,
      particles: null,
      fogColor: null,
      ambientColor: bp.ambientColor ?? (isDark ? "#0a0015" : isWarm ? "#2a0a00" : isCool ? "#000a1a" : "#0d001a"),
      lightColor: bp.lightColor ?? (isWarm ? "#ff8833" : isCool ? "#33aaff" : "#9955ff"),
      lightColor2: bp.lightColor2 ?? (isWarm ? "#ff5500" : isCool ? "#0055ff" : "#4400cc"),
      background: bp.background ?? (isDark ? "#030008" : "#070010"),
      recognitions,
      isBlueprint: true,
      blueprintLabel: bp.label
    };
  }

  // Standard material build
  const emissiveBase = isDark ? "#1a0033" : effectiveColor;
  const emissiveIntensity = matPreset ?
    (isNeon || isElectric || isMagical || isBurning || isHoly ? matPreset.emissiveMult * 1.2 : matPreset.emissiveMult * 0.4) :
    (isElectric || isMagical || isBurning ? 0.6 : isHoly ? 0.4 : 0.0);

  const material: MaterialDef = {
    color: isDark && !isWireframe ? "#0d0020" : effectiveColor,
    emissive: emissiveBase,
    emissiveIntensity,
    metalness: matPreset?.metalness ?? 0.15,
    roughness: matPreset?.roughness ?? (isSharp ? 0.1 : 0.4),
    wireframe: isWireframe,
    transparent: (matPreset?.transparency ?? false) || isWireframe,
    opacity: isWireframe ? 0.55 : (matPreset?.transparency ? 0.4 : 1.0),
    transmission: matPreset?.transmission,
    iridescence: matPreset?.iridescence,
    thickness: matPreset?.transmission ? 1.5 : undefined
  };

  const defaultGeos: GeometryDef[] = [
    { type: "icosahedron", args: [1.3, 0] },
    { type: "torusKnot", args: [0.9, 0.3, 64, 8] },
    { type: "sphere", args: [1.2, 32, 32] },
    { type: "octahedron", args: [1.4, 0] },
    { type: "torus", args: [1.2, 0.38, 16, 48] }
  ];
  const geo = applyQualityToGeo(geoDef ?? defaultGeos[hash(prompt) % defaultGeos.length], quality);

  const sceneType: SceneType = sceneTypeRaw ?? (
    isMany ? "cluster" : isFew ? "ring" : "single"
  );

  const objects: ObjectDef[] = [];
  const animSpeed = 0.35 + rng() * 0.5;

  function makeObj(
    g: GeometryDef,
    m: MaterialDef,
    pos: [number, number, number],
    rot: [number, number, number],
    scale: number,
    anim: AnimateType,
    speed: number
  ): ObjectDef {
    return { geometry: g, material: m, position: pos, rotation: rot, scale, animate: anim, animSpeed: speed };
  }

  switch (sceneType) {
    case "single": {
      objects.push(makeObj(geo, material, [0, 0, 0], [rng() * Math.PI, rng() * Math.PI, 0], baseScale, animType, animSpeed));
      break;
    }
    case "cluster": {
      const n = isMany ? 12 : 6;
      for (let i = 0; i < n; i++) {
        const r = 1.4 + rng() * 2.2;
        const theta = rng() * Math.PI * 2;
        const phi = (rng() - 0.5) * Math.PI;
        objects.push(makeObj(
          geo, material,
          [r * Math.cos(theta) * Math.cos(phi), r * Math.sin(phi), r * Math.sin(theta) * Math.cos(phi)],
          [rng() * Math.PI, rng() * Math.PI, 0],
          baseScale * (0.3 + rng() * 0.5),
          animType, 0.2 + rng() * 0.6
        ));
      }
      break;
    }
    case "orbital": {
      objects.push(makeObj(geo, material, [0, 0, 0], [rng() * Math.PI, 0, 0], baseScale, "spin", animSpeed));
      const moons = 3;
      const moonGeo: GeometryDef = { type: "sphere", args: [0.6, 16, 16] };
      for (let i = 0; i < moons; i++) {
        const radius = 2.2 + i * 0.9;
        const angle = (i / moons) * Math.PI * 2;
        objects.push(makeObj(
          moonGeo, { ...material, emissiveIntensity: material.emissiveIntensity * 0.6 },
          [Math.cos(angle) * radius, (rng() - 0.5) * 0.6, Math.sin(angle) * radius],
          [0, 0, 0],
          baseScale * (0.2 + rng() * 0.2),
          "orbit", 0.15 + rng() * 0.25
        ));
      }
      break;
    }
    case "ring": {
      const n = 6;
      for (let i = 0; i < n; i++) {
        const angle = (i / n) * Math.PI * 2;
        const radius = 2.4;
        objects.push(makeObj(
          geo, material,
          [Math.cos(angle) * radius, 0, Math.sin(angle) * radius],
          [rng() * Math.PI, rng() * Math.PI, 0],
          baseScale * 0.55,
          "orbit", 0.2 + rng() * 0.25
        ));
      }
      break;
    }
    case "helix": {
      const n = 12;
      for (let i = 0; i < n; i++) {
        const t = (i / n) * Math.PI * 4;
        const radius = 1.5;
        const yStep = (i / n) * 4 - 2;
        for (const flip of [1, -1]) {
          objects.push(makeObj(
            { type: "sphere", args: [0.22, 12, 12] },
            { ...material, emissiveIntensity: material.emissiveIntensity * 0.8 },
            [Math.cos(t + flip * Math.PI) * radius, yStep, Math.sin(t + flip * Math.PI) * radius],
            [0, 0, 0],
            baseScale * 0.35,
            "float", 0.15 + rng() * 0.15
          ));
        }
      }
      break;
    }
    case "grid": {
      const dim = 3;
      const spacing = 1.6;
      for (let x = 0; x < dim; x++) {
        for (let z = 0; z < dim; z++) {
          objects.push(makeObj(
            geo, material,
            [(x - 1) * spacing, (rng() - 0.5) * 0.4, (z - 1) * spacing],
            [rng() * Math.PI, rng() * Math.PI, 0],
            baseScale * (0.4 + rng() * 0.3),
            animType, 0.25 + rng() * 0.35
          ));
        }
      }
      break;
    }
    case "vortex": {
      const n = 16;
      for (let i = 0; i < n; i++) {
        const t = (i / n);
        const angle = t * Math.PI * 6;
        const radius = 0.5 + t * 2.5;
        objects.push(makeObj(
          geo, material,
          [Math.cos(angle) * radius, t * 4 - 2, Math.sin(angle) * radius],
          [rng() * Math.PI, rng() * Math.PI, 0],
          baseScale * (0.15 + t * 0.35),
          "orbit", 0.4 - t * 0.25
        ));
      }
      break;
    }
    case "galaxy": {
      const n = 5;
      for (let i = 0; i < n; i++) {
        const r = 1.5 + rng() * 3;
        const a = rng() * Math.PI * 2;
        objects.push(makeObj(
          { type: "sphere", args: [0.35, 12, 12] },
          { ...material, emissiveIntensity: 0.8 + rng() * 0.6 },
          [Math.cos(a) * r, (rng() - 0.5) * 0.8, Math.sin(a) * r],
          [0, 0, 0],
          baseScale * (0.4 + rng() * 0.4),
          "float", 0.12 + rng() * 0.2
        ));
      }
      break;
    }
  }

  const needsParticles = sceneType === "galaxy" || sceneType === "vortex" || isNeon || isMagical || isElectric ||
    /star|space|cosmos|magic|dust|ether|fairy/i.test(lower);

  const particles: ParticleDef | null = needsParticles ? {
    count: sceneType === "galaxy" ? 1800 : 800,
    color: effectiveColor,
    size: sceneType === "galaxy" ? 0.02 : 0.03,
    spread: sceneType === "galaxy" ? 12 : 8,
    mode: sceneType === "galaxy" ? "galaxy" : sceneType === "vortex" ? "vortex" : "ambient"
  } : null;

  const isWarm = /warm|chaud|sun|feu|lava|gold|amber|orange/i.test(lower);
  const isCool = /cool|froid|ice|ocean|space|winter|frost|cold|void/i.test(lower);

  const ambientColor = isDark ? "#0a0015" : isBurning ? "#2a0500" : isHoly ? "#1a1000" : isWarm ? "#2a0a00" : isCool ? "#000a1a" : "#0d001a";
  const lightColor = isBurning ? "#ff6600" : isHoly ? "#ffeecc" : isFrozen ? "#88ccff" : isWarm ? "#ff8833" : isCool ? "#33aaff" : "#9955ff";
  const lightColor2 = isBurning ? "#ff2200" : isHoly ? "#ffd700" : isFrozen ? "#4488ff" : isWarm ? "#ff5500" : isCool ? "#0055ff" : "#4400cc";
  const background = isDark ? "#030008" : "#070010";

  return {
    sceneType,
    objects,
    particles,
    fogColor: isDark || sceneType === "galaxy" ? background : null,
    ambientColor,
    lightColor,
    lightColor2,
    background,
    recognitions
  };
}
