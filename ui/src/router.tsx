import { createRootRoute, createRoute, createRouter, Outlet } from '@tanstack/react-router'
import { Overview } from './pages/Overview'
import { Streams } from './pages/Streams'
import { StreamDetail } from './pages/StreamDetail'
import { DLQ } from './pages/DLQ'
import { Layout } from './components/layout/Layout'

const rootRoute = createRootRoute({
  component: () => (
    <Layout>
      <Outlet />
    </Layout>
  ),
})

const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/',
  component: Overview,
})

const streamsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/streams',
  component: Streams,
})

const streamDetailRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/streams/$name',
  component: StreamDetail,
})

const dlqRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/dlq',
  component: DLQ,
})

const routeTree = rootRoute.addChildren([indexRoute, streamsRoute, streamDetailRoute, dlqRoute])

export const router = createRouter({ routeTree })

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router
  }
}
