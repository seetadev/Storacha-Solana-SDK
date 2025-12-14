import {
  Outlet,
  createFileRoute,
  redirect,
  useRouterState,
} from '@tanstack/react-router'
import { AppLayout } from '@/layouts/app'
// import { TOKEN_KEY } from '@/lib/constants'

export const Route = createFileRoute('/_layout')({
  // beforeLoad: async ({ context, location }) => {
  //   if (!hasCookie(TOKEN_KEY)) {
  //     throw redirect({
  //       to: '/auth/login',
  //       search: {
  //         redirect: location.href,
  //       },
  //     })
  //   }

  //   const auth = context.auth
  //   if (auth?.isAuthenticated && auth?.user) {
  //     if (!auth.user.onboarding.completed) {
  //       throw redirect({
  //         to: '/auth/onboarding',
  //         search: {
  //           reason: 'incomplete',
  //         },
  //       })
  //     }
  //   }
  // },
  component: RouteComponent,
})

function RouteComponent() {
  const routerState = useRouterState()
  const context = routerState.matches[routerState.matches.length - 1]
    ?.context as { pageTitle?: string; pageDescription?: string } | undefined

  return (
    <AppLayout
      pageTitle={context?.pageTitle}
      pageDescription={context?.pageDescription}
    >
      <Outlet />
    </AppLayout>
  )
}
