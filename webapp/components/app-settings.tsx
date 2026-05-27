"use client"

import * as React from "react"
import {
  Bell,
  Check,
  Globe,
  Home,
  Keyboard,
  Link,
  Lock,
  Menu,
  MessageCircle,
  Paintbrush,
  Settings,
  Video,
  Shield,
  User as UserIcon,
  Mail,
  CheckCircle2,
  XCircle,
  ShieldCheck,
  Sun,
  Moon,
  Monitor,
  Languages,
} from "lucide-react"

import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
} from "@/components/ui/sidebar"
import { useAuth } from "@/lib/auth"
import { useTheme } from "next-themes"
import { Switch } from "@/components/ui/switch"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Label } from "@/components/ui/label"

const data = {
  nav: [
    { name: "Home", icon: Home, id: "home" },
    { name: "Appearance", icon: Paintbrush, id: "appearance" },
    { name: "Language & region", icon: Globe, id: "language-region" },
    { name: "Connected accounts", icon: Link, id: "connected-accounts" },
    { name: "Privacy & visibility", icon: Lock, id: "privacy-visibility" },
  ],
}

interface SettingsPanelProps {
  open?: boolean
  onOpenChange?: (open: boolean) => void
  showTrigger?: boolean
}

export function SettingsPanel({ open: externalOpen, onOpenChange: externalOnOpenChange, showTrigger = true }: SettingsPanelProps) {
  const [internalOpen, setInternalOpen] = React.useState(false)
  const [activeSection, setActiveSection] = React.useState("home")
  const [sidebarOpen, setSidebarOpen] = React.useState(false)

  // Use external open state if provided, otherwise use internal state
  const open = externalOpen !== undefined ? externalOpen : internalOpen

  // Sync with URL hash on mount and hash changes
  React.useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash
      
      if (hash.startsWith("#settings")) {
        // Extract section from hash
        const sectionMatch = hash.match(/^#settings\/(.+)/)
        const sectionId = sectionMatch ? sectionMatch[1] : "home"
        
        // Validate section ID
        if (data.nav.find((item) => item.id === sectionId)) {
          setActiveSection(sectionId)
        } else {
          setActiveSection("home")
        }
        
        // Open dialog if hash is present (only if not externally controlled)
        if (externalOpen === undefined) {
          setInternalOpen(true)
        }
      } else {
        // Close dialog if no hash (only if not externally controlled)
        if (externalOpen === undefined) {
          setInternalOpen(false)
        }
      }
    }

    // Check initial hash on mount
    handleHashChange()
    
    // Listen for hash changes
    window.addEventListener("hashchange", handleHashChange)
    return () => window.removeEventListener("hashchange", handleHashChange)
  }, [externalOpen])

  const handleSectionChange = (sectionId: string) => {
    setActiveSection(sectionId)
    window.location.hash = `#settings/${sectionId}`
  }

  const handleOpenChange = (newOpen: boolean) => {
    // Call external onOpenChange if provided
    if (externalOnOpenChange) {
      externalOnOpenChange(newOpen)
    } else {
      setInternalOpen(newOpen)
    }
    
    if (newOpen) {
      // When opening, set hash if not already set
      if (!window.location.hash || !window.location.hash.startsWith("#settings")) {
        window.location.hash = `#settings/${activeSection}`
      }
    } else {
      // When closing, clear hash
      window.history.replaceState(null, "", " ")
    }
  }

  const activeItem = data.nav.find((item) => item.id === activeSection) || data.nav[0]
  const { session } = useAuth()
  const { theme, setTheme } = useTheme()

  const renderContent = () => {
    switch (activeSection) {
      case "home":
        return (
          <>
            <div className="space-y-4">
              <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center">
                <UserIcon className="w-8 h-8" />
              </div>
              <div>
                <h3 className="text-xl font-semibold">{session.user?.email || "User"}</h3>
                <p className="text-muted-foreground">{session.user?.email}</p>
              </div>
            </div>
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 rounded-lg">
                <div className="flex items-center gap-2">
                  <Mail className="w-4 h-4" />
                  <span>Email Verified</span>
                </div>
                {session.user?.email_verified ? (
                  <CheckCircle2 className="w-5 h-5 text-green-500" />
                ) : (
                  <XCircle className="w-5 h-5 text-red-500" />
                )}
              </div>
              <div className="flex items-center justify-between p-3 rounded-lg">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4" />
                  <span>Two-Factor Authentication</span>
                </div>
                <span className="text-sm text-muted-foreground">Off</span>
              </div>
            </div>
          </div>
          </>
        )
      case "appearance":
        return (
          <div className="space-y-4">
            <h2 className="text-2xl font-semibold">Appearance</h2>
            <p className="text-muted-foreground">Customize the look and feel of PurchAI.</p>
            <div className="flex items-center justify-between p-4 rounded-lg">
              <div>
                <h3 className="font-medium">Theme</h3>
                <p className="text-sm text-muted-foreground">Select your preferred theme</p>
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline">
                    {theme === "dark" ? (
                      <><Moon className="w-4 h-4 mr-2" />Dark</>
                    ) : theme === "light" ? (
                      <><Sun className="w-4 h-4 mr-2" />Light</>
                    ) : (
                      <><Monitor className="w-4 h-4 mr-2" />System</>
                    )}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => setTheme("light")}>
                    <Sun className="w-4 h-4 mr-2" />
                    Light
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setTheme("dark")}>
                    <Moon className="w-4 h-4 mr-2" />
                    Dark
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setTheme("system")}>
                    <Monitor className="w-4 h-4 mr-2" />
                    System
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        )
      case "privacy-visibility":
        return (
          <div className="space-y-4">
            <h2 className="text-2xl font-semibold">Privacy & Visibility</h2>
            <p className="text-muted-foreground">Control your privacy settings and data preferences.</p>
            <div className="p-4 rounded-lg">
              <div className="flex items-start gap-3">
                <Shield className="w-5 h-5 text-green-500 mt-0.5" />
                <div>
                  <h3 className="font-medium">No Data Collection</h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    We do not collect any data from your conversations. Your privacy is our priority.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )
      case "connected-accounts":
        return (
          <div className="space-y-4">
            <h2 className="text-2xl font-semibold">Connected Accounts</h2>
            <p className="text-muted-foreground">No connected accounts at this time.</p>
          </div>
        )
      case "language-region":
        return (
          <div className="space-y-4">
            <h2 className="text-2xl font-semibold">Language & Region</h2>
            <p className="text-muted-foreground">Set your language and regional preferences.</p>
            <div className="flex items-center justify-between p-4 rounded-lg">
              <div>
                <h3 className="font-medium">Language</h3>
                <p className="text-sm text-muted-foreground">Select your preferred language</p>
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline">
                    <Languages className="w-4 h-4 mr-2" />
                    English
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem>
                    <Languages className="w-4 h-4 mr-2" />
                    English
                  </DropdownMenuItem>
                  <DropdownMenuItem disabled className="opacity-50">
                    More languages coming soon...
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        )
      default:
        return null
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      {showTrigger && (
        <DialogTrigger asChild>
          <Button size="icon" variant="ghost">
            <div className="w-2 h-2 bg-muted-foreground rounded-full" />
          </Button>
        </DialogTrigger>
      )}
      <DialogContent className="overflow-hidden p-0 h-full w-full my-4 mx-0 rounded-t-2xl md:rounded-lg md:max-h-[500px] md:max-w-[700px] lg:max-w-[800px]">
        <DialogTitle className="sr-only">Settings</DialogTitle>
        <DialogDescription className="sr-only">
          Customize your settings here.
        </DialogDescription>
        <SidebarProvider className="items-start" open={sidebarOpen} onOpenChange={setSidebarOpen}>
          <Sidebar collapsible="offcanvas" className="md:hidden">
            <SidebarContent>
              <SidebarGroup className="pt-20">
                <SidebarGroupContent>
                  <SidebarMenu>
                    {data.nav.map((item) => (
                      <SidebarMenuItem key={item.id}>
                        <SidebarMenuButton
                          asChild
                          isActive={item.id === activeSection}
                        >
                          <button
                            type="button"
                            onClick={() => handleSectionChange(item.id)}
                          >
                            <item.icon />
                            <span>{item.name}</span>
                          </button>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    ))}
                  </SidebarMenu>
                </SidebarGroupContent>
              </SidebarGroup>
            </SidebarContent>
          </Sidebar>
          <Sidebar collapsible="none" className="hidden md:flex">
            <SidebarContent>
              <SidebarGroup>
                <SidebarGroupContent>
                  <SidebarMenu>
                    {data.nav.map((item) => (
                      <SidebarMenuItem key={item.id}>
                        <SidebarMenuButton
                          asChild
                          isActive={item.id === activeSection}
                        >
                          <button
                            type="button"
                            onClick={() => handleSectionChange(item.id)}
                          >
                            <item.icon />
                            <span>{item.name}</span>
                          </button>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    ))}
                  </SidebarMenu>
                </SidebarGroupContent>
              </SidebarGroup>
            </SidebarContent>
          </Sidebar>
          <main className="flex h-[480px] flex-1 flex-col overflow-hidden">
            <header className="flex h-16 shrink-0 items-center gap-2 transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12 md:hidden">
              <div className="flex items-center gap-2 px-4">
                <Button variant="ghost" size="icon" onClick={() => setSidebarOpen(true)}>
                  <Menu className="h-5 w-5" />
                </Button>
              </div>
            </header>
            <header className="hidden md:flex h-16 shrink-0 items-center gap-2 transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12">
              <div className="flex items-center gap-2 px-4">
                <Breadcrumb>
                  <BreadcrumbList>
                    <BreadcrumbItem className="hidden md:block">
                      <BreadcrumbLink href="#">Settings</BreadcrumbLink>
                    </BreadcrumbItem>
                    <BreadcrumbSeparator className="hidden md:block" />
                    <BreadcrumbItem>
                      <BreadcrumbPage>{activeItem.name}</BreadcrumbPage>
                    </BreadcrumbItem>
                  </BreadcrumbList>
                </Breadcrumb>
              </div>
            </header>
            <div className="flex flex-1 flex-col gap-4 overflow-y-auto p-4 pt-0">
              {renderContent()}
            </div>
          </main>
        </SidebarProvider>
      </DialogContent>
    </Dialog>
  )
}
