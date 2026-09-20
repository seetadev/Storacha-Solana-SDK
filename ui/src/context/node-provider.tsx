import React, { createContext, useCallback, useEffect, useState } from 'react'
import type { KuboNodeConfig } from '@/lib/types'

const LOCAL_DEFAULT: KuboNodeConfig = {
  id: 'local-default',
  label: 'Local',
  apiUrl: 'http://127.0.0.1:5001',
  gatewayUrl: 'http://127.0.0.1:8080',
}

const STORAGE_KEY = 'toju:kubo-nodes'
const ACTIVE_KEY = 'toju:kubo-active'

function loadNodes(): KuboNodeConfig[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) return JSON.parse(raw) as KuboNodeConfig[]
  } catch {}
  return [LOCAL_DEFAULT]
}

function saveNodes(nodes: KuboNodeConfig[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(nodes))
}

function loadActiveId(): string {
  return localStorage.getItem(ACTIVE_KEY) ?? LOCAL_DEFAULT.id
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
  const [nodes, setNodes] = useState<KuboNodeConfig[]>(() => {
    const stored = loadNodes()
    // always ensure local-default is present
    const hasDefault = stored.some((n) => n.id === LOCAL_DEFAULT.id)
    return hasDefault ? stored : [LOCAL_DEFAULT, ...stored]
  })

  const [activeId, setActiveId] = useState<string>(loadActiveId)

  const activeNode =
    nodes.find((n) => n.id === activeId) ?? nodes[0] ?? LOCAL_DEFAULT

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
    if (id === LOCAL_DEFAULT.id) return // cannot remove the built-in default
    setNodes((prev) => prev.filter((n) => n.id !== id))
    setActiveId((prev) => (prev === id ? LOCAL_DEFAULT.id : prev))
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
