import React, { createContext, useCallback, useEffect, useState } from 'react'
import type { KuboNodeConfig } from '@/lib/types'

const LOCAL_DEFAULT: KuboNodeConfig = {
  id: 'local-default',
  label: 'Local',
  apiUrl: 'http://127.0.0.1:5001',
  gatewayUrl: 'http://127.0.0.1:8080',
}

/** Hosted Kubo on Render — preferred default for MeshKit ops when local is unavailable. */
const RENDER_DEFAULT: KuboNodeConfig = {
  id: 'render-default',
  label: 'Render (kubo-render)',
  apiUrl: 'https://kubo-render.onrender.com',
  gatewayUrl: 'https://kubo-render.onrender.com',
}

const BUILTIN_NODES: KuboNodeConfig[] = [RENDER_DEFAULT, LOCAL_DEFAULT]

const STORAGE_KEY = 'toju:kubo-nodes'
const ACTIVE_KEY = 'toju:kubo-active'

function ensureBuiltinNodes(nodes: KuboNodeConfig[]): KuboNodeConfig[] {
  const byId = new Map(nodes.map((n) => [n.id, n]))
  // Keep built-in URLs/labels in sync with code; preserve user-added nodes.
  for (const builtin of BUILTIN_NODES) {
    byId.set(builtin.id, builtin)
  }
  const builtins = BUILTIN_NODES.map((b) => byId.get(b.id)!)
  const extras = nodes.filter((n) => !BUILTIN_NODES.some((b) => b.id === n.id))
  return [...builtins, ...extras]
}

function loadNodes(): KuboNodeConfig[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      return ensureBuiltinNodes(JSON.parse(raw) as KuboNodeConfig[])
    }
  } catch {}
  return [...BUILTIN_NODES]
}

function saveNodes(nodes: KuboNodeConfig[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(nodes))
}

function loadActiveId(): string {
  const stored = localStorage.getItem(ACTIVE_KEY)
  // Prefer Render when nothing chosen yet, or when still on the old
  // localhost-only default (common cause of failed MeshKit ops).
  if (!stored || stored === LOCAL_DEFAULT.id) {
    return RENDER_DEFAULT.id
  }
  return stored
}

function saveActiveId(id: string) {
  localStorage.setItem(ACTIVE_KEY, id)
}

interface NodeContextValues {
  nodes: KuboNodeConfig[]
  activeNode: KuboNodeConfig
  setActiveNode: (node: KuboNodeConfig) => void
  addNode: (node: Omit<KuboNodeConfig, 'id'>) => KuboNodeConfig
  removeNode: (id: string) => void
  updateNode: (id: string, updates: Partial<Omit<KuboNodeConfig, 'id'>>) => void
}

export const NodeContext = createContext<NodeContextValues | null>(null)

export const NodeProvider = ({ children }: { children: React.ReactNode }) => {
  const [nodes, setNodes] = useState<KuboNodeConfig[]>(() => loadNodes())

  const [activeId, setActiveId] = useState<string>(loadActiveId)

  const activeNode =
    nodes.find((n) => n.id === activeId) ?? nodes[0] ?? RENDER_DEFAULT

  useEffect(() => {
    saveNodes(nodes)
  }, [nodes])

  useEffect(() => {
    saveActiveId(activeId)
  }, [activeId])

  const setActiveNode = useCallback((node: KuboNodeConfig) => {
    setActiveId(node.id)
  }, [])

  const addNode = useCallback(
    (node: Omit<KuboNodeConfig, 'id'>): KuboNodeConfig => {
      const newNode: KuboNodeConfig = { ...node, id: `node-${Date.now()}` }
      setNodes((prev) => [...prev, newNode])
      return newNode
    },
    [],
  )

  const removeNode = useCallback((id: string) => {
    // cannot remove built-in defaults
    if (BUILTIN_NODES.some((b) => b.id === id)) return
    setNodes((prev) => prev.filter((n) => n.id !== id))
    setActiveId((prev) => (prev === id ? RENDER_DEFAULT.id : prev))
  }, [])

  const updateNode = useCallback(
    (id: string, updates: Partial<Omit<KuboNodeConfig, 'id'>>) => {
      setNodes((prev) =>
        prev.map((n) => (n.id === id ? { ...n, ...updates } : n)),
      )
    },
    [],
  )

  return (
    <NodeContext.Provider
      value={{
        nodes,
        activeNode,
        setActiveNode,
        addNode,
        removeNode,
        updateNode,
      }}
    >
      {children}
    </NodeContext.Provider>
  )
}
