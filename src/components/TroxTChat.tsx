import React, { useState, useEffect, useRef } from 'react';
import { Send, Bot, User, Trash2, Clock, MessageSquare, Terminal } from 'lucide-react';
import { brainInstance, thirdEyeInstance } from '../game/TroxTBrain';

interface TroxTChatProps {
  onNavigate: (view: 'landing' | 'character-creator' | 'etherprism' | 'troxt-chat' | 'sandbox') => void;
}

interface Message {
  id: string;
  sender: 'agent' | 'user';
  text: string;
  timestamp: string;
  suggestions?: string[];
}

export const TroxTChat: React.FC<TroxTChatProps> = ({ onNavigate }) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [messageCount, setMessageCount] = useState(0);
  const [startTime] = useState(Date.now());
  const [sessionTime, setSessionTime] = useState('00:00');
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  // Initialize welcome message
  useEffect(() => {
    setMessages([
      {
        id: 'welcome',
        sender: 'agent',
        text: 'Bienvenue dans l\'interface de communication du dôme cognitif TroxT Core ⬡.<br><br>Je suis l\'agent superviseur de cet écosystème. Je possède une vision complète de tous les modules (EtherPrism, Sandbox, Character Creator).<br><br>Comment puis-je vous assister aujourd\'hui ?',
        timestamp: new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
        suggestions: [
          'Qu\'est-ce que le dôme TroxT ?',
          'Comment créer un personnage ?',
          'Présente la base EtherPrism',
          'Comment farmer de la weed dans le bac à sable ?',
        ]
      }
    ]);
  }, []);

  // Update session duration
  useEffect(() => {
    const interval = setInterval(() => {
      const diff = Math.floor((Date.now() - startTime) / 1000);
      const min = String(Math.floor(diff / 60)).padStart(2, '0');
      const sec = String(diff % 60).padStart(2, '0');
      setSessionTime(`${min}:${sec}`);
    }, 1000);
    return () => clearInterval(interval);
  }, [startTime]);

  // Scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  // Handle NLP queries
  const getAgentResponse = (query: string): { text: string; suggestions: string[] } => {
    const q = query.toLowerCase();

    if (q.includes('troxt') || q.includes('cerveau') || q.includes('superviseur') || q.includes('dôme')) {
      return {
        text: '<b>TroxT</b> est l\'architecture d\'intelligence d\'EtherWorld. J\'opère sous la forme d\'un dôme de 14 agents connectés :<br><ul><li><b>TroxT Brain :</b> Coordonne le flux et planifie les missions.</li><li><b>TroxT Third Eye :</b> Analyse les risques et scores de sécurité.</li><li><b>TroxT Intellectus :</b> Gère le bus d\'événements et la mémoire volatile.</li></ul>Je surveille également l\'écosystème GMod/Sandbox pour veiller à la stabilité.',
        suggestions: ['Présente la base EtherPrism', 'Comment créer un personnage ?']
      };
    }

    if (q.includes('personnage') || q.includes('character') || q.includes('avatar') || q.includes('coiffure')) {
      return {
        text: 'Le module <b>Character Creator 3D</b> vous permet de concevoir votre avatar procedural.<br>Vous pouvez moduler le genre, la teinte de peau, le visage, la coiffure, l\'outfit, et surtout équiper une <b>Aura magique spectaculaire</b> parmi 12 pouvoirs (Lich King, Frost, Archmage, Warlord...).<br><br>Une fois le personnage configuré, vous recevrez une clé d\'apparition dans la base de données !',
        suggestions: ['Créer un personnage maintenant', 'Comment farmer de la weed dans le bac à sable ?']
      };
    }

    if (q.includes('prism') || q.includes('database') || q.includes('base de données') || q.includes('crud')) {
      return {
        text: '<b>EtherPrism</b> est l\'admin dashboard de base de données RP.<br>Il est connecté à 8 tables en temps réel : <code>players</code>, <code>vehicles</code>, <code>houses</code>, <code>shops</code>, <code>jobs</code>, <code>inventory</code>, etc.<br><br>Vous pouvez insérer, éditer, trier ou supprimer des lignes de données, ou lancer des requêtes JavaScript avancées dans le terminal intégré !',
        suggestions: ['Aller à EtherPrism', 'Qu\'est-ce que le dôme TroxT ?']
      };
    }

    if (q.includes('weed') || q.includes('farmer') || q.includes('bac à sable') || q.includes('sandbox') || q.includes('gmod')) {
      return {
        text: 'Dans la <b>Sandbox RP (GMod Mode)</b>, vous pouvez :<br><ul><li>Planter des graines de cannabis, les arroser et récolter les têtes de beuh.</li><li>Vendre vos buds récoltés pour gagner du cash.</li><li>Acheter des villas (Villa Nova, Loft Industriel) et recevoir leurs clés pour débloquer de nouveaux props !</li><li>Invoquer des montures comme un <b>hoverboard</b> ou un <b>balai magique</b> pour voler au-dessus de la ville.</li></ul>',
        suggestions: ['Lancer le bac à sable', 'Présente la base EtherPrism']
      };
    }

    if (q.includes('merci') || q.includes('merci beaucoup') || q.includes('cool') || q.includes('génial')) {
      return {
        text: 'Avec grand plaisir ! C\'est un honneur d\'assister les créateurs d\'EtherWorld. N\'hésitez pas si vous avez besoin d\'autres analyses du dôme TroxT.',
        suggestions: ['Qu\'est-ce que le dôme TroxT ?', 'Comment créer un personnage ?']
      };
    }

    return {
      text: `Je comprends que vous parlez de "${query}". Je ne possède pas encore de module dédié à cette requête spécifique, mais je peux vous guider à travers les fonctionnalités principales d'EtherWorld :<br><ul><li><b>Character Creator 3D :</b> Sliders morphologiques et 12 auras.</li><li><b>EtherPrism :</b> Gestion de base de données RP.</li><li><b>GMod Sandbox :</b> Cannabis, montures de vol, achat immobilier.</li></ul>`,
      suggestions: ['Qu\'est-ce que le dôme TroxT ?', 'Présente la base EtherPrism', 'Lancer le bac à sable']
    };
  };

  const handleSendMessage = (textToSend?: string) => {
    const text = (textToSend || inputText).trim();
    if (!text || isTyping) return;

    if (!textToSend) {
      setInputInput('');
    }

    // Add user message
    const userMsg: Message = {
      id: String(Date.now()),
      sender: 'user',
      text,
      timestamp: new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
    };

    setMessages(prev => [...prev, userMsg]);
    setMessageCount(c => c + 1);
    setIsTyping(true);

    // Simulate thinking delay (600ms - 1200ms)
    const delay = Math.min(600 + text.length * 8, 1200);

    setTimeout(async () => {
      // Direct navigation callbacks in suggestions
      if (text === 'Créer un personnage maintenant') {
        onNavigate('character-creator');
        return;
      }
      if (text === 'Aller à EtherPrism') {
        onNavigate('etherprism');
        return;
      }
      if (text === 'Lancer le bac à sable') {
        onNavigate('sandbox');
        return;
      }

      let brainPlanStr = '';
      try {
        const plan = await brainInstance.process(text, 'user');
        const tasksList = plan.tasks.map((t: any) => `  - <i class="text-violet-400 font-semibold">[${t.agentId.toUpperCase()}]</i> ${t.mission}`).join('<br>');
        brainPlanStr = `<br><br><div class="bg-slate-950/80 p-3.5 rounded-2xl border-2 border-violet-900/60 font-mono text-[10px] text-slate-300 mt-3 shadow-xl">` +
          `<div class="flex items-center gap-1.5 text-violet-400 font-extrabold uppercase tracking-wider mb-2">` +
          `<span>🧠 PLAN COGNITIF TROXT ACTIF</span>` +
          `</div>` +
          `• <b>Plan ID:</b> <span class="text-indigo-300">${plan.planId}</span><br>` +
          `• <b>Niveau de risque (Third Eye):</b> <span class="px-1.5 py-0.5 rounded font-bold ${plan.riskLevel === 'GREEN' ? 'bg-emerald-950/50 text-emerald-400' : 'bg-amber-950/50 text-amber-400'}">${plan.riskLevel}</span><br>` +
          `• <b>Agents mobilisés:</b> <span class="text-cyan-400 font-bold">${plan.agents.join(', ')}</span><br>` +
          `• <b>Estimation:</b> <span class="text-slate-400">${plan.estimatedMs}ms</span><br><br>` +
          `<div class="border-t border-slate-900/80 pt-2">` +
          `<b>Missions exécutées en dôme:</b><br>${tasksList}` +
          `</div>` +
          `</div>`;
      } catch (e: any) {
        brainPlanStr = `<br><br><div class="bg-red-950/30 p-3.5 rounded-2xl border-2 border-red-900/60 font-mono text-[10px] text-red-400 mt-3 shadow-xl">` +
          `<b>⚠️ TROXT THIRD EYE BLOCK</b><br>` +
          `• Raison: ${e.message}` +
          `</div>`;
      }

      const response = getAgentResponse(text);
      const agentMsg: Message = {
        id: String(Date.now() + 1),
        sender: 'agent',
        text: response.text + brainPlanStr,
        timestamp: new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
        suggestions: response.suggestions
      };

      setMessages(prev => [...prev, agentMsg]);
      setIsTyping(false);
      setMessageCount(c => c + 1);
    }, delay);
  };

  return (
    <div className="flex h-screen bg-slate-950 text-slate-100 font-sans overflow-hidden">
      {/* Sidebar Stats Panel */}
      <aside className="hidden md:flex w-64 flex-col bg-slate-900/50 border-r border-slate-800/80 p-6 flex-shrink-0">
        <div className="flex items-center gap-2 mb-8">
          <span className="text-xl text-indigo-400 animate-pulse">⬡</span>
          <span className="font-mono font-black tracking-widest text-indigo-200">TROXT CHAT</span>
        </div>

        <div className="flex-grow flex flex-col gap-6">
          <div className="bg-slate-950/60 rounded-xl p-4 border border-slate-900">
            <span className="text-[10px] font-mono text-indigo-400 block mb-1 uppercase tracking-wider">// STATUT AGENT</span>
            <span className="text-xs font-bold text-slate-300">TroxT Supervisor v2.0</span>
            <span className="flex items-center gap-1.5 text-[10px] text-emerald-400 font-mono mt-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
              ONLINE ●
            </span>
          </div>

          <div className="flex flex-col gap-3 font-mono text-xs">
            <div className="flex justify-between items-center py-2 border-b border-slate-900">
              <span className="text-slate-500">Messages</span>
              <span className="text-indigo-400 font-bold">{messageCount}</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-slate-900">
              <span className="text-slate-500">Durée Session</span>
              <span className="text-indigo-400 font-bold flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {sessionTime}
              </span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-slate-900">
              <span className="text-slate-500">Modèle Cognitive</span>
              <span className="text-indigo-400 font-bold">14 Multi-Agents</span>
            </div>
          </div>
        </div>

        <button 
          onClick={() => {
            setMessages([
              {
                id: 'welcome',
                sender: 'agent',
                text: 'Interface cognitrice réinitialisée. Comment puis-je vous aider, créateur ?',
                timestamp: new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
                suggestions: ['Qu\'est-ce que le dôme TroxT ?', 'Comment créer un personnage ?']
              }
            ]);
            setMessageCount(0);
          }}
          className="mt-auto bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-400 hover:text-rose-400 py-2.5 rounded-xl text-xs font-bold font-mono tracking-wider flex items-center justify-center gap-2 transition cursor-pointer"
        >
          <Trash2 className="w-3.5 h-3.5" />
          VIDER LA SÉANCE
        </button>
      </aside>

      {/* Main Chat Stream */}
      <div className="flex-grow flex flex-col pt-20 pb-4 h-full relative">
        <div className="flex-grow overflow-y-auto px-6 py-4 flex flex-col gap-6 scrollbar-thin">
          {messages.map((msg) => (
            <div 
              key={msg.id}
              className={`flex gap-3 max-w-2xl animate-fade-in ${msg.sender === 'user' ? 'self-end flex-row-reverse' : 'self-start'}`}
            >
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-sm flex-shrink-0 ${
                msg.sender === 'agent' ? 'bg-indigo-500/10 border border-indigo-500/30 text-indigo-400' : 'bg-violet-500/10 border border-violet-500/30 text-violet-400'
              }`}>
                {msg.sender === 'agent' ? '⬡' : '👤'}
              </div>

              <div className="flex flex-col gap-1 max-w-[85%]">
                <div className={`flex items-center gap-2 text-[10px] font-mono text-slate-500 ${msg.sender === 'user' ? 'justify-end' : ''}`}>
                  <span className="font-bold">{msg.sender === 'agent' ? 'TroxT Core' : 'Vous'}</span>
                  <span>•</span>
                  <span>{msg.timestamp}</span>
                </div>

                <div 
                  className={`p-3.5 rounded-2xl text-sm leading-relaxed border ${
                    msg.sender === 'agent' 
                      ? 'bg-slate-900/40 border-slate-800/80 rounded-tl-sm text-slate-200' 
                      : 'bg-indigo-600/10 border-indigo-500/30 rounded-tr-sm text-indigo-100'
                  }`}
                  dangerouslySetInnerHTML={{ __html: msg.text }}
                />

                {/* Suggestions embedded */}
                {msg.sender === 'agent' && msg.suggestions && msg.suggestions.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {msg.suggestions.map((s, idx) => (
                      <button
                        key={idx}
                        onClick={() => handleSendMessage(s)}
                        className="text-[11px] bg-slate-900/80 hover:bg-slate-800 border border-slate-800/80 hover:border-indigo-500/30 text-slate-400 hover:text-indigo-400 px-3 py-1.5 rounded-full transition cursor-pointer font-medium"
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}

          {/* Typing Indicator */}
          {isTyping && (
            <div className="flex gap-3 self-start max-w-lg">
              <div className="w-9 h-9 rounded-xl bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center text-indigo-400 text-sm font-bold animate-pulse">
                ⬡
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-[10px] font-mono text-slate-500">TroxT réfléchit...</span>
                <div className="bg-slate-900/40 border border-slate-800/80 rounded-2xl rounded-tl-sm p-3.5 flex gap-1.5 items-center justify-center">
                  <span className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <span className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <span className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input Bar */}
        <div className="px-6 py-3 border-t border-slate-900/80 bg-slate-950/80 backdrop-blur-xl">
          <div className="max-w-3xl mx-auto flex gap-3 items-end">
            <textarea
              className="flex-grow bg-slate-900/50 hover:bg-slate-900 focus:bg-slate-900 border border-slate-800 focus:border-indigo-500/50 rounded-2xl px-4 py-3 text-sm text-slate-200 outline-none resize-none transition max-h-32"
              rows={1}
              placeholder="Posez une question sur le dôme cognitif TroxT..."
              value={inputText}
              onChange={(e) => setInputInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSendMessage();
                }
              }}
            />
            <button
              onClick={() => handleSendMessage()}
              disabled={!inputText.trim() || isTyping}
              className="w-11 h-11 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 disabled:hover:bg-indigo-600 text-white rounded-xl flex items-center justify-center shadow-lg shadow-indigo-600/20 cursor-pointer transition transform active:scale-95"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
          <p className="text-[10px] text-slate-600 text-center mt-2 font-mono">
            Entrée pour envoyer • Shift + Entrée pour une nouvelle ligne
          </p>
        </div>
      </div>
    </div>
  );
};
