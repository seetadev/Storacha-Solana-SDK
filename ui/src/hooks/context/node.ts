import React from 'react'
import { NodeContext } from '@/context/node-provider'

export const useNodeContext = () => {
  const context = React.useContext(NodeContext)
  if (context === null) {
    throw new Error(
      'NodeContext is missing. Wrap the component tree in <NodeProvider />',
    )
  }
  return context
}
