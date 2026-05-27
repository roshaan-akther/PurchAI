"use client"

import { Info, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useState } from "react"

export function RolloutHeader() {
  const [isVisible, setIsVisible] = useState(true)

  // Don't show in development environment
  if (process.env.NODE_ENV === "development") return null

  if (!isVisible) return null

  return (
    <div className="fixed top-0 left-0 right-0 z-50 w-full bg-muted px-4 py-3 md:py-2 flex items-center justify-center md:justify-between text-[12px] md:text-sm font-medium">
      <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0">
        <Info className="h-3 w-3" />
      </Button>
      <span className="flex-1 text-center leading-tight">
        PurchAI - AI-Powered Shopping Assistant
      </span>
      <Button 
        variant="ghost" 
        size="icon" 
        className="h-6 w-6 shrink-0"
        onClick={() => setIsVisible(false)}
      >
        <X className="h-3 w-3" />
      </Button>
    </div>
  )
}
