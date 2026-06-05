'use client'

import Link from 'next/link'
import { useAuth, UserButton } from '@clerk/nextjs'
import {
  LayoutDashboard,
  FolderKanban,
  Users,
  BarChart3,
  MessageSquareText,
  GitFork,
  ArrowRight,
} from 'lucide-react'

const features = [
  {
    icon: LayoutDashboard,
    title: 'Project Dashboards',
    description: 'Real-time overview of all your projects with customizable views and widgets.',
  },
  {
    icon: FolderKanban,
    title: 'Issue Tracking',
    description: 'Track, prioritize, and resolve issues with powerful kanban boards and lists.',
  },
  {
    icon: GitFork,
    title: 'Sprint Planning',
    description: 'Plan and manage sprints effortlessly with timeline views and velocity tracking.',
  },
  {
    icon: Users,
    title: 'Team Collaboration',
    description: 'Work together with built-in chat, mentions, and real-time notifications.',
  },
  {
    icon: MessageSquareText,
    title: 'Team Chat',
    description: 'Channel-based messaging to keep conversations organized and searchable.',
  },
  {
    icon: BarChart3,
    title: 'Analytics & Reports',
    description: 'Data-driven insights with custom reports and burndown charts.',
  },
]

export default function LandingPage() {
  const { isSignedIn } = useAuth()

  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b bg-background/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <Link href="/" className="flex items-center gap-2">
            <div className="bg-primary flex size-8 items-center justify-center rounded-lg">
              <span className="text-primary-foreground text-sm font-bold">S</span>
            </div>
            <span className="text-xl font-bold">Sprintix</span>
          </Link>
          <nav className="flex items-center gap-4">
            {isSignedIn ? (
              <>
                <Link
                  href="/onboarding"
                  className="inline-flex h-9 items-center justify-center rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
                >
                  <LayoutDashboard className="mr-1.5 size-4" />
                  Dashboard
                </Link>
                <UserButton />
              </>
            ) : (
              <>
                <Link
                  href="/sign-in"
                  className="text-muted-foreground hover:text-foreground text-sm font-medium transition-colors"
                >
                  Sign in
                </Link>
                <Link
                  href="/sign-up"
                  className="inline-flex h-9 items-center justify-center rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
                >
                  Get Started
                  <ArrowRight className="ml-1.5 size-4" />
                </Link>
              </>
            )}
          </nav>
        </div>
      </header>

      <main className="flex-1">
        <section className="mx-auto max-w-7xl px-4 pt-24 pb-16 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-3xl text-center">
            <h1 className="text-4xl font-bold tracking-tight sm:text-6xl">
              Ship faster with{' '}
              <span className="text-primary">Sprintix</span>
            </h1>
            <p className="text-muted-foreground mt-6 text-lg leading-8">
              The project management platform that helps teams plan, track, and deliver
              amazing work. From sprints to shipping, everything in one place.
            </p>
            <div className="mt-10 flex items-center justify-center gap-4">
              {isSignedIn ? (
                <Link
                  href="/onboarding"
                  className="inline-flex h-11 items-center justify-center rounded-lg bg-primary px-8 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
                >
                  Go to Dashboard
                  <ArrowRight className="ml-2 size-4" />
                </Link>
              ) : (
                <>
                  <Link
                    href="/sign-up"
                    className="inline-flex h-11 items-center justify-center rounded-lg bg-primary px-8 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
                  >
                    Start Free Trial
                    <ArrowRight className="ml-2 size-4" />
                  </Link>
                  <Link
                    href="/sign-in"
                    className="inline-flex h-11 items-center justify-center rounded-lg border border-border bg-background px-8 text-sm font-medium transition-colors hover:bg-muted"
                  >
                    Sign In
                  </Link>
                </>
              )}
            </div>
          </div>
        </section>

        <section className="border-t bg-muted/30 py-20">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="mx-auto max-w-2xl text-center">
              <h2 className="text-3xl font-bold tracking-tight">
                Everything your team needs
              </h2>
              <p className="text-muted-foreground mt-4 text-lg">
                Powerful features to keep your projects on track and your team aligned.
              </p>
            </div>
            <div className="mt-16 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {features.map((feature) => {
                const Icon = feature.icon
                return (
                  <div
                    key={feature.title}
                    className="group relative rounded-lg border border-border bg-card p-6 transition-colors hover:border-border/80"
                  >
                    <div className="bg-primary/10 mb-4 flex size-10 items-center justify-center rounded-lg">
                      <Icon className="text-primary size-5" />
                    </div>
                    <h3 className="font-semibold">{feature.title}</h3>
                    <p className="text-muted-foreground mt-2 text-sm leading-6">
                      {feature.description}
                    </p>
                  </div>
                )
              })}
            </div>
          </div>
        </section>

        <section className="py-20">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="mx-auto max-w-2xl text-center">
              <h2 className="text-3xl font-bold tracking-tight">
                Ready to get started?
              </h2>
              <p className="text-muted-foreground mt-4 text-lg">
                Join thousands of teams already shipping faster with Sprintix.
              </p>
              <div className="mt-8">
                {isSignedIn ? (
                  <Link
                    href="/onboarding"
                    className="inline-flex h-11 items-center justify-center rounded-lg bg-primary px-8 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
                  >
                    Go to Dashboard
                    <ArrowRight className="ml-2 size-4" />
                  </Link>
                ) : (
                  <Link
                    href="/sign-up"
                    className="inline-flex h-11 items-center justify-center rounded-lg bg-primary px-8 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
                  >
                    Get Started Free
                    <ArrowRight className="ml-2 size-4" />
                  </Link>
                )}
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t py-8">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-2">
            <div className="bg-primary flex size-6 items-center justify-center rounded">
              <span className="text-primary-foreground text-[10px] font-bold">S</span>
            </div>
            <span className="text-muted-foreground text-sm">Sprintix</span>
          </div>
          <p className="text-muted-foreground text-xs">
            &copy; {new Date().getFullYear()} Sprintix. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  )
}
