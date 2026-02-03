import React from 'react'
import { AuthContext } from '@/context/auth-provider'

export const useAuthContext = () => {
  const context = React.useContext(AuthContext)

  if (context === null) {
    throw new Error(
      'Auth context is missing. You probably forgot to wrap the component depending on toast in <AuthProvider />',
    )
  }

  return context
}
