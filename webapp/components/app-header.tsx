"use client"

import * as React from "react"

import {
  SidebarTrigger,
} from "@/components/ui/sidebar"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useAuth } from "@/lib/auth"
import { MoreHorizontal, LayoutDashboard, Store, User, Settings, SquareMousePointer } from "lucide-react"
import { Skeleton } from "@/components/ui/skeleton"
import { SettingsPanel } from "@/components/app-settings"
import { usePanel } from "@/components/homeshell"

export function AppHeader() {
  const { session, loading, login, logout } = useAuth()
  const [settingsOpen, setSettingsOpen] = React.useState(false)
  const { isPanelOpen, setPanelOpen } = usePanel()

  if (loading) {
    return (
      <header className="absolute top-0 left-0 right-0 h-14 flex shrink-0 items-center justify-between px-4 z-10 bg-background md:bg-transparent">
        <Skeleton className="h-8 w-20" />
      </header>
    )
  }

  return (
    <header className={`absolute top-0 left-0 right-0 h-14 flex shrink-0 items-center justify-between px-4 z-10 ${isPanelOpen ? 'bg-background' : 'bg-background md:bg-transparent'}`}>
      {session.authenticated && (
        <span className="text-sm text-muted-foreground animate-in fade-in duration-300">
          {session.user?.email}
        </span>
      )}
      <div className="flex gap-2 animate-in fade-in duration-300">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setPanelOpen(!isPanelOpen)}
        >
          <Store className="h-4 w-4 mr-2" />
          Open Store
        </Button>
        {session.authenticated ? (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="size-8">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem onClick={() => {
                setSettingsOpen(true)
              }}>
                <Settings className="mr-2 h-4 w-4" />
                Settings
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={logout} className="text-destructive">
                Sign out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ) : (
          <>
            <Button variant="default" size="sm" onClick={login}>
              Sign in
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => {
                window.location.href = '/register';
              }}
            >
              Sign up
            </Button>
          </>
        )}
      </div>
      <SettingsPanel open={settingsOpen} onOpenChange={setSettingsOpen} showTrigger={false} />
    </header>
  )
}
