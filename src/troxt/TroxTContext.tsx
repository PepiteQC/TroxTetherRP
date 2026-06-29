// ============================================================
//  TROXTCONTEXT.tsx — Provider React Global pour TroxT
//  Expose le brain, le chat, l'état cognitif, et le loop.
//  Accessible via useTroxT() dans n'importe quel composant.
// ============================================================

import React, { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react'
import type { TroxTBrain, CognitiveState } from './TroxTBrain'
import type { SkillResult } from './skills/SkillRegistry'

export interface ChatMessage {
  id: string
  role: 'user' | 'troxt' | 'system' | 'thought'
  text: string
  timestamp: number
  meta?: {
    skillId?: string
    confidence?: number
    chainId?: string
    latencyMs?: number
  }
}

export interface TroxTContextValue {
  brain: TroxTBrain | null
  state: CognitiveState | null
  messages: ChatMessage[]
  isOnline: boolean
  isThinking: boolean
  sendMessage: (text: string) => Promise<void>
  runSkill: (skillId: string, params: Record<string, unknown>) => Promise<SkillResult>
  consciousnessLevel: number
  setConsciousnessLevel: (lvl: number) => void
  clearChat: () => void
  exportMemory: () => string
}

const TroxTContext = createContext<TroxTContextValue | null>(null)

export const TroxTProvider: React.FC<{
  brain: TroxTBrain
  children: React.ReactNode
}> = ({ brain, children }) => {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [cognitiveState, setCognitiveState] = useState<CognitiveState | null>(null)
  const [isThinking, setIsThinking] = useState(false)
  const [isOnline, setIsOnline] = useState(false)
  const msgRef = useRef<ChatMessage[]>([])
  const brainRef = useRef(brain)
  brainRef.current = brain

  useEffect(() => {
    brain.initialize().then(() => {
      setIsOnline(true)
      setCognitiveState(brain.getState())
    })

    const interval = setInterval(() => {
      setCognitiveState(brain.getState())
    }, 1000)

    return () => {
      clearInterval(interval)
      brain.shutdown()
    }
  }, [brain])

  const pushMsg = useCallback((msg: ChatMessage) => {
    msgRef.current = [...msgRef.current.slice(-200), msg]
    setMessages(msgRef.current)
  }, [])

  const sendMessage = useCallback(async (text: string) => {
    if (!brainRef.current) return
    const userMsg: ChatMessage = {
      id: `u_${Date.now()}`,
      role: 'user',
      text,
      timestamp: Date.now()
    }
    pushMsg(userMsg)
    setIsThinking(true)
    const start = Date.now()

    try {
      const reply = await brainRef.current.chat(text)
      const latency = Date.now() - start
      pushMsg({
        id: `t_${Date.now()}`,
        role: 'troxt',
        text: reply,
        timestamp: Date.now(),
        meta: { latencyMs: latency }
      })
    } catch (e) {
      pushMsg({
        id: `e_${Date.now()}`,
        role: 'system',
        text: `❌ Erreur : ${String(e)}`,
        timestamp: Date.now()
      })
    } finally {
      setIsThinking(false)
      setCognitiveState(brainRef.current.getState())
    }
  }, [pushMsg])

  const runSkill = useCallback(async (skillId: string, params: Record<string, unknown>) => {
    if (!brainRef.current) return { success: false, summary: 'Brain offline', detail: null }
    const start = Date.now()
    const result = await brainRef.current.runSkill(skillId, params)
    const latency = Date.now() - start
    pushMsg({
      id: `s_${Date.now()}`,
      role: 'system',
      text: result.success ? `✅ ${result.summary}` : `⚠️ ${result.summary}`,
      timestamp: Date.now(),
      meta: { skillId, latencyMs: latency }
    })
    return result
  }, [pushMsg])

  const setConsciousnessLevel = useCallback((lvl: number) => {
    brainRef.current?.setConsciousnessLevel(lvl)
    setCognitiveState(brainRef.current?.getState() || null)
  }, [])

  const clearChat = useCallback(() => {
    msgRef.current = []
    setMessages([])
  }, [])

  const exportMemory = useCallback(() => {
    return JSON.stringify({
      messages: msgRef.current,
      state: brainRef.current?.getState()
    }, null, 2)
  }, [])

  const value: TroxTContextValue = {
    brain,
    state: cognitiveState,
    messages,
    isOnline,
    isThinking,
    sendMessage,
    runSkill,
    consciousnessLevel: cognitiveState?.consciousnessLevel || 5,
    setConsciousnessLevel,
    clearChat,
    exportMemory
  }

  return <TroxTContext.Provider value={value}>{children}</TroxTContext.Provider>
}

export function useTroxT(): TroxTContextValue {
  const ctx = useContext(TroxTContext)
  if (!ctx) throw new Error('useTroxT must be inside TroxTProvider')
  return ctx
}

export default TroxTContext
