import { Container } from '@chakra-ui/react'
import { createFileRoute } from '@tanstack/react-router'
import ReactMarkdown from 'react-markdown'
import termsContent from '@/content/terms.md?raw'
import { HomeLayout } from '@/layouts/home'

export const Route = createFileRoute('/terms')({
  component: TermsPage,
})

function TermsPage() {
  return (
    <HomeLayout>
      <Container maxW="container.md" py="4em">
        <article className="markdown-content">
          <ReactMarkdown>{termsContent}</ReactMarkdown>
        </article>
      </Container>
    </HomeLayout>
  )
}
