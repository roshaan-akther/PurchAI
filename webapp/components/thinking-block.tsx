"use client"

import { useState, useRef, useEffect } from "react"
import { Brain, ChevronDown, ChevronRight } from "lucide-react"
import ShinyText from "@/components/shiny-text"

interface Props {
  thinking: string
  isActive?: boolean
}

export function ThinkingBlock({ thinking, isActive = false }: Props) {
  const [isOpen, setIsOpen] = useState(false)
  const autoOpenedRef = useRef(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (isActive) {
      setIsOpen(true)
      autoOpenedRef.current = true
    } else if (!isActive && autoOpenedRef.current) {
      setIsOpen(false)
      autoOpenedRef.current = false
    }
  }, [isActive])

  useEffect(() => {
    if (isOpen && ref.current) {
      ref.current.scrollTop = ref.current.scrollHeight
    }
  }, [thinking, isOpen])

  return (
    <div className="mt-0 mb-2 rounded-xl overflow-hidden backdrop-blur-sm">
      <button
        type="button"
        onClick={() => setIsOpen(p => !p)}
        className="w-full flex items-center gap-2.5 pl-2 pr-4 py-2 hover:bg-black/[0.02] dark:hover:bg-white/[0.02] transition-colors duration-200 text-left"
      >
        <Brain className="w-3.5 h-3.5 text-muted-foreground/60 shrink-0" />
        <div className="flex-1 truncate">
          {isActive ? (
            <ShinyText text="Thinking" />
          ) : (
            <span className="font-medium text-sm text-muted-foreground/70 truncate">Thought</span>
          )}
        </div>
        <span className="shrink-0 ml-1">
          {isOpen ? (
            <ChevronDown className="w-3.5 h-3.5 text-muted-foreground/50 transition-transform duration-200" />
          ) : (
            <ChevronRight className="w-3.5 h-3.5 text-muted-foreground/50 transition-transform duration-200" />
          )}
        </span>
      </button>

      <div className={`overflow-hidden transition-all duration-300 ease-out ${isOpen ? "max-h-96 opacity-100" : "max-h-0 opacity-0"}`}>
        <div className="pr-4 py-3">
          <div ref={ref} className="text-xs rounded-lg p-2.5 overflow-x-auto overflow-y-auto whitespace-pre-wrap break-all leading-relaxed text-muted-foreground/80 max-h-80">
            {thinking}
          </div>
        </div>
      </div>
    </div>
  )
}
