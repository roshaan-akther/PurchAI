"use client"

import * as React from "react"
import { useEffect, useRef } from "react"

import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  useSidebar,
} from "@/components/ui/sidebar"
import { PencilLineIcon } from "lucide-react"

const SIDEBAR_STATE_KEY = "purchai-sidebar-state"

function Navigation() {
  const { state, isMobile } = useSidebar()
  const isCollapsed = state === "collapsed" && !isMobile

  const handleNewChat = () => {
    window.location.href = "/"
  }

  return (
    <SidebarGroup className="py-1">
      <SidebarGroupContent>
        <SidebarMenu className="animate-in fade-in duration-300">
          <SidebarMenuItem>
            <SidebarMenuButton
              tooltip="New Chat"
              onClick={handleNewChat}
            >
              <PencilLineIcon />
              {!isCollapsed && <span>New Chat</span>}
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  )
}

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const { state, setOpen, isMobile, openMobile, setOpenMobile } = useSidebar()
  const hasInitialized = useRef(false)
  const isMobileRef = useRef(isMobile)
  const mobileInitialized = useRef(false)

  // Update ref when isMobile changes
  useEffect(() => {
    isMobileRef.current = isMobile
  }, [isMobile])

  useEffect(() => {
    // Load saved state from localStorage on mount (only once)
    // Only load saved state for desktop, not mobile
    if (!hasInitialized.current && !isMobileRef.current) {
      const savedState = localStorage.getItem(SIDEBAR_STATE_KEY)
      if (savedState === "collapsed") {
        setOpen(false)
      } else if (savedState === "expanded") {
        setOpen(true)
      }
      hasInitialized.current = true
    }
  }, [setOpen])

  useEffect(() => {
    // Save state to localStorage whenever it changes (after initialization)
    // Only save state for desktop, not mobile
    if (hasInitialized.current && !isMobileRef.current) {
      if (state === "collapsed") {
        localStorage.setItem(SIDEBAR_STATE_KEY, "collapsed")
      } else if (state === "expanded") {
        localStorage.setItem(SIDEBAR_STATE_KEY, "expanded")
      }
    }
  }, [state])

  // On mobile, only open sidebar once on initial mount, not on every state change
  useEffect(() => {
    if (isMobile && !mobileInitialized.current && !openMobile) {
      setOpenMobile(true)
      mobileInitialized.current = true
    }
  }, [isMobile, openMobile, setOpenMobile])

  // Mobile: use offcanvas (full sidebar), Desktop: use icon (icons only when collapsed)
  const collapsible = isMobile ? "offcanvas" : "icon"

  return (
    <Sidebar collapsible={collapsible} className="bg-background border-border/25" {...props}>
      <SidebarContent className="border-border/25">
        <Navigation />
      </SidebarContent>
      <SidebarRail className="border-border/25" />
    </Sidebar>
  )
}
