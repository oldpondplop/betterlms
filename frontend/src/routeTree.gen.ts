/* prettier-ignore-start */

/* eslint-disable */

// @ts-nocheck

// noinspection JSUnusedGlobalSymbols

// This file is auto-generated by TanStack Router

// Import Routes

import { Route as rootRoute } from './routes/__root'
import { Route as SignupImport } from './routes/signup'
import { Route as ResetPasswordImport } from './routes/reset-password'
import { Route as RecoverPasswordImport } from './routes/recover-password'
import { Route as LoginImport } from './routes/login'
import { Route as LayoutImport } from './routes/_layout'
import { Route as LayoutIndexImport } from './routes/_layout/index'
import { Route as LayoutSettingsImport } from './routes/_layout/settings'
import { Route as LayoutRoleImport } from './routes/_layout/role'
import { Route as LayoutQuizImport } from './routes/_layout/quiz'
import { Route as LayoutMycourseImport } from './routes/_layout/mycourse'
import { Route as LayoutCourseImport } from './routes/_layout/course'
import { Route as LayoutAnalyticsImport } from './routes/_layout/analytics'
import { Route as LayoutAdminImport } from './routes/_layout/admin'

// Create/Update Routes

const SignupRoute = SignupImport.update({
  path: '/signup',
  getParentRoute: () => rootRoute,
} as any)

const ResetPasswordRoute = ResetPasswordImport.update({
  path: '/reset-password',
  getParentRoute: () => rootRoute,
} as any)

const RecoverPasswordRoute = RecoverPasswordImport.update({
  path: '/recover-password',
  getParentRoute: () => rootRoute,
} as any)

const LoginRoute = LoginImport.update({
  path: '/login',
  getParentRoute: () => rootRoute,
} as any)

const LayoutRoute = LayoutImport.update({
  id: '/_layout',
  getParentRoute: () => rootRoute,
} as any)

const LayoutIndexRoute = LayoutIndexImport.update({
  path: '/',
  getParentRoute: () => LayoutRoute,
} as any)

const LayoutSettingsRoute = LayoutSettingsImport.update({
  path: '/settings',
  getParentRoute: () => LayoutRoute,
} as any)

const LayoutRoleRoute = LayoutRoleImport.update({
  path: '/role',
  getParentRoute: () => LayoutRoute,
} as any)

const LayoutQuizRoute = LayoutQuizImport.update({
  path: '/quiz',
  getParentRoute: () => LayoutRoute,
} as any)

const LayoutMycourseRoute = LayoutMycourseImport.update({
  path: '/mycourse',
  getParentRoute: () => LayoutRoute,
} as any)

const LayoutCourseRoute = LayoutCourseImport.update({
  path: '/course',
  getParentRoute: () => LayoutRoute,
} as any)

const LayoutAnalyticsRoute = LayoutAnalyticsImport.update({
  path: '/analytics',
  getParentRoute: () => LayoutRoute,
} as any)

const LayoutAdminRoute = LayoutAdminImport.update({
  path: '/admin',
  getParentRoute: () => LayoutRoute,
} as any)

// Populate the FileRoutesByPath interface

declare module '@tanstack/react-router' {
  interface FileRoutesByPath {
    '/_layout': {
      preLoaderRoute: typeof LayoutImport
      parentRoute: typeof rootRoute
    }
    '/login': {
      preLoaderRoute: typeof LoginImport
      parentRoute: typeof rootRoute
    }
    '/recover-password': {
      preLoaderRoute: typeof RecoverPasswordImport
      parentRoute: typeof rootRoute
    }
    '/reset-password': {
      preLoaderRoute: typeof ResetPasswordImport
      parentRoute: typeof rootRoute
    }
    '/signup': {
      preLoaderRoute: typeof SignupImport
      parentRoute: typeof rootRoute
    }
    '/_layout/admin': {
      preLoaderRoute: typeof LayoutAdminImport
      parentRoute: typeof LayoutImport
    }
    '/_layout/analytics': {
      preLoaderRoute: typeof LayoutAnalyticsImport
      parentRoute: typeof LayoutImport
    }
    '/_layout/course': {
      preLoaderRoute: typeof LayoutCourseImport
      parentRoute: typeof LayoutImport
    }
    '/_layout/mycourse': {
      preLoaderRoute: typeof LayoutMycourseImport
      parentRoute: typeof LayoutImport
    }
    '/_layout/quiz': {
      preLoaderRoute: typeof LayoutQuizImport
      parentRoute: typeof LayoutImport
    }
    '/_layout/role': {
      preLoaderRoute: typeof LayoutRoleImport
      parentRoute: typeof LayoutImport
    }
    '/_layout/settings': {
      preLoaderRoute: typeof LayoutSettingsImport
      parentRoute: typeof LayoutImport
    }
    '/_layout/': {
      preLoaderRoute: typeof LayoutIndexImport
      parentRoute: typeof LayoutImport
    }
  }
}

// Create and export the route tree

export const routeTree = rootRoute.addChildren([
  LayoutRoute.addChildren([
    LayoutAdminRoute,
    LayoutAnalyticsRoute,
    LayoutCourseRoute,
    LayoutMycourseRoute,
    LayoutQuizRoute,
    LayoutRoleRoute,
    LayoutSettingsRoute,
    LayoutIndexRoute,
  ]),
  LoginRoute,
  RecoverPasswordRoute,
  ResetPasswordRoute,
  SignupRoute,
])

/* prettier-ignore-end */
