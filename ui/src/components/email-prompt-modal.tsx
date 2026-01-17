import {
  Button,
  FormControl,
  FormHelperText,
  FormLabel,
  Input,
  VStack,
} from '@chakra-ui/react'
import { EnvelopeIcon } from '@phosphor-icons/react'
import { useState } from 'react'
import { ModalLayout } from '../layouts/modal-layout/modal'

interface EmailPromptModalProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: (email: string) => void
}

export const EmailPromptModal = ({
  isOpen,
  onClose,
  onSubmit,
}: EmailPromptModalProps) => {
  const [email, setEmail] = useState('')
  const [error, setError] = useState('')

  const validateEmail = (value: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return emailRegex.test(value)
  }

  const handleSubmit = () => {
    if (!email.trim()) {
      setError('Email is required')
      return
    }

    if (!validateEmail(email)) {
      setError('Please enter a valid email address')
      return
    }

    setError('')
    onSubmit(email)
    onClose()
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSubmit()
    }
  }

  return (
    <ModalLayout
      title="Email Required"
      subTitle="We'll send you reminders before your storage expires"
      isOpen={isOpen}
      onClose={onClose}
      size="sm"
      px="1.5em"
      radius="1em"
      autoClose={false}
    >
      <VStack spacing="1.5em" align="stretch" pb="1em">
        <FormControl isInvalid={!!error}>
          <FormLabel
            fontSize="var(--font-size-sm)"
            color="var(--text-muted)"
            fontWeight="var(--font-weight-medium)"
          >
            Email Address
          </FormLabel>
          <Input
            type="email"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value)
              if (error) setError('')
            }}
            onKeyDown={handleKeyDown}
            placeholder="your.email@example.com"
            size="lg"
            bg="var(--bg-dark)"
            border="1px solid var(--border-hover)"
            borderRadius="var(--radius-md)"
            color="var(--text-inverse)"
            _placeholder={{ color: 'var(--text-tertiary)' }}
            _hover={{ borderColor: 'var(--border-hover)' }}
            _focus={{
              borderColor: 'var(--primary-500)',
              boxShadow: '0 0 0 1px var(--primary-500)',
            }}
          />
          {error ? (
            <FormHelperText color="var(--error)" fontSize="var(--font-size-xs)">
              {error}
            </FormHelperText>
          ) : (
            <FormHelperText
              color="var(--text-tertiary)"
              fontSize="var(--font-size-xs)"
            >
              Your email will only be used for storage expiration reminders
            </FormHelperText>
          )}
        </FormControl>

        <Button
          onClick={handleSubmit}
          size="lg"
          height="48px"
          fontSize="var(--font-size-base)"
          fontWeight="var(--font-weight-semibold)"
          bg="var(--text-inverse)"
          color="var(--eerie-black)"
          borderRadius="var(--radius-lg)"
          leftIcon={<EnvelopeIcon size={20} weight="bold" />}
          transition="all 0.2s ease"
          _hover={{
            transform: 'translateY(-1px)',
            boxShadow:
              '0 4px 12px rgba(24, 24, 23, 0.4), 0 0 20px rgba(249, 115, 22, 0.2)',
          }}
          _active={{
            transform: 'translateY(0)',
          }}
        >
          Continue to Upload
        </Button>
      </VStack>
    </ModalLayout>
  )
}
