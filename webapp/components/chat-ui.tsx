"use client"

import { useRef, useEffect, useState } from "react"
import React from "react"
import { Streamdown, TableCopyDropdown, TableDownloadDropdown, type IconMap } from "streamdown"
import { code } from "@streamdown/code"
import { mermaid } from "@streamdown/mermaid"
import { math } from "@streamdown/math"
import { cjk } from "@streamdown/cjk"
import { MessageBar } from "@/components/message-bar"
import { Copy, Check, Download, ZoomIn } from "lucide-react"
import { ToolCallBlock } from "@/components/tool-call-block"
import { ThinkingBlock } from "@/components/thinking-block"
import { ProductCard } from "@/components/product-card"
import { useAuth } from "@/lib/auth"
import Carousel3D from "@/components/carousel-3d"
import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from "@/components/ui/accordion"
import {
  Table,
  TableHeader,
  TableBody,
  TableFooter,
  TableHead,
  TableRow,
  TableCell,
  TableCaption,
} from "@/components/ui/table"

export interface ToolCall {
  id: string
  name: string
  arguments: Record<string, unknown>
  status: "pending" | "complete" | "error"
  result?: string
  isError?: boolean
}

export interface ThinkingSession {
  id: string
  content: string
}

export type MessageEvent =
  | { type: "thinking"; id: string; content: string; status?: "pending" | "complete" }
  | { type: "tool_call"; id: string; name: string; arguments: Record<string, unknown>; status: "pending" | "complete" | "error"; result?: string; isError?: boolean }
  | { type: "text"; content: string }
  | { type: "product_card"; productId: string; title?: string; price?: number; description?: string; imageUrl?: string }

export interface Message {
  id: string
  role: "user" | "assistant"
  content: string
  events?: MessageEvent[]
  timestamp?: Date
}

interface ChatUIProps {
  messages: Message[]
  onMessage: (message: string) => void
  isGenerating: boolean
  onStopGeneration: () => void
}

export function ChatUI({ messages, onMessage, isGenerating, onStopGeneration }: ChatUIProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const chatContainerRef = useRef<HTMLDivElement>(null)
  const [copiedMessageId, setCopiedMessageId] = useState<string | null>(null)
  const [isAtBottom, setIsAtBottom] = useState(true)
  const { session } = useAuth()

  // Detect if user is at bottom of chat
  const handleScroll = () => {
    if (chatContainerRef.current) {
      const { scrollTop, scrollHeight, clientHeight } = chatContainerRef.current
      const threshold = 50 // pixels from bottom to consider "at bottom"
      const atBottom = scrollHeight - (scrollTop + clientHeight) < threshold
      setIsAtBottom(atBottom)
    }
  }

  // Auto-scroll only when at bottom
  useEffect(() => {
    if (isAtBottom && chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight
    }
  }, [messages, isAtBottom])

  const handleCopy = (content: string, messageId: string) => {
    navigator.clipboard.writeText(content)
    setCopiedMessageId(messageId)
    setTimeout(() => setCopiedMessageId(null), 2000)
  }

  const customIcons: Partial<IconMap> = {
    CopyIcon: Copy,
    DownloadIcon: Download,
    ZoomInIcon: ZoomIn,
    CheckIcon: Check,
  }

  return (
    <div className="flex-1 flex flex-col relative overflow-hidden">
      <div ref={chatContainerRef} onScroll={handleScroll} className="flex-1 overflow-y-auto overflow-x-hidden">
        <div className="p-4 space-y-6 pb-32">
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full">
            </div>
          ) : (
            <div className="mx-auto max-w-2xl space-y-6">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex flex-col ${message.role === "user" ? "items-end" : "items-start"} animate-in fade-in slide-in-from-bottom-4 duration-300 ease-out`}
                >
                  <div
                    className={`${
                      message.role === "user"
                        ? "px-4 py-3 bg-muted text-foreground rounded-2xl w-fit"
                        : "p-0 bg-transparent w-full"
                    }`}
                  >
                    {message.role === "assistant" ? (
                      <div className="text-base leading-relaxed">
                        {message.events && message.events.length > 0 && (
                          <div className="space-y-1">
                            {message.events.map((event, index) => {
                              if (event.type === "thinking") {
                                return <ThinkingBlock key={`thinking-${event.id}-${index}`} thinking={event.content} isActive={event.status === "pending"} />
                              } else if (event.type === "tool_call") {
                                return <ToolCallBlock key={`tool-${event.id}`} toolCall={event} />
                              } else if (event.type === "product_card") {
                                return <ProductCard key={`product-${event.productId}-${index}`} productId={event.productId} title={event.title} price={event.price} description={event.description} imageUrl={event.imageUrl} />
                              }
                              return null
                            })}
                          </div>
                        )}
                        <Streamdown
                          icons={customIcons}
                          plugins={{ code: code, mermaid: mermaid, math: math, cjk: cjk }}
                          animated={true}
                          components={{
                            h1: ({ children, className }) => (
                              <h1 className={`mt-6 mb-4 font-bold text-[34px] ${className ?? ''}`}>{children}</h1>
                            ),
                            h2: ({ children, className }) => (
                              <h2 className={`mt-6 mb-3 font-semibold text-[28px] ${className ?? ''}`}>{children}</h2>
                            ),
                            h3: ({ children, className }) => (
                              <h3 className={`mt-5 mb-2 font-semibold text-[22px] ${className ?? ''}`}>{children}</h3>
                            ),
                            h4: ({ children, className }) => (
                              <h4 className={`mt-4 mb-2 font-semibold text-lg ${className ?? ''}`}>{children}</h4>
                            ),
                            h5: ({ children, className }) => (
                              <h5 className={`mt-4 mb-2 font-semibold text-base ${className ?? ''}`}>{children}</h5>
                            ),
                            h6: ({ children, className }) => (
                              <h6 className={`mt-3 mb-2 font-medium text-sm ${className ?? ''}`}>{children}</h6>
                            ),
                            p: ({ children, className }) => (
                              <p className={`mb-4 text-foreground/92 ${className ?? ''}`}>{children}</p>
                            ),
                            ul: ({ children, className }) => (
                              <ul className={`mb-4 ml-6 list-disc text-foreground/92 ${className ?? ''}`}>{children}</ul>
                            ),
                            ol: ({ children, className }) => (
                              <ol className={`mb-4 ml-6 list-decimal text-foreground/92 ${className ?? ''}`}>{children}</ol>
                            ),
                            li: ({ children, className }) => (
                              <li className={`mb-1 ${className ?? ''}`}>{children}</li>
                            ),
                            details: ({ children, ...props }) => {
                              const childrenArray = React.Children.toArray(children)
                              const summary = childrenArray.find(
                                (child: any) => React.isValidElement(child) && child.type === 'summary'
                              )
                              const content = childrenArray.filter(
                                (child: any) => !(React.isValidElement(child) && child.type === 'summary')
                              )
                              const title = React.isValidElement(summary) && typeof summary.props === 'object' && summary.props !== null && 'children' in summary.props ? summary.props.children as React.ReactNode : 'Expand'

                              return (
                                <div className="my-4">
                                  <Accordion type="single" collapsible className="w-full border-0">
                                    <AccordionItem value="item-1" className="border-0">
                                      <AccordionTrigger>{title}</AccordionTrigger>
                                      <AccordionContent>
                                        <div className="text-base leading-relaxed">{content}</div>
                                      </AccordionContent>
                                    </AccordionItem>
                                  </Accordion>
                                </div>
                              )
                            },
                            table: ({ children, className }) => (
                              <div data-streamdown="table-wrapper">
                                <div className="flex items-center justify-end gap-1">
                                  <TableCopyDropdown />
                                  <TableDownloadDropdown />
                                </div>
                                <Table className={className}>{children}</Table>
                              </div>
                            ),
                            thead: ({ children, className }) => (
                              <TableHeader className={className}>{children}</TableHeader>
                            ),
                            tbody: ({ children, className }) => (
                              <TableBody className={className}>{children}</TableBody>
                            ),
                            tr: ({ children, className }) => (
                              <TableRow className={className}>{children}</TableRow>
                            ),
                            th: ({ children, className }) => (
                              <TableHead className={className}>{children}</TableHead>
                            ),
                            td: ({ children, className }) => (
                              <TableCell className={className}>{children}</TableCell>
                            ),
                          }}
                        >
                          {message.content}
                        </Streamdown>
                      </div>
                    ) : (
                      <p className="text-sm leading-relaxed text-right">{message.content}</p>
                    )}
                  </div>
                  {message.role === "user" && (
                    <button
                      onClick={() => handleCopy(message.content, message.id)}
                      className="mt-1 flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {copiedMessageId === message.id ? (
                        <>
                          <Check className="w-3 h-3" />
                          Copied
                        </>
                      ) : (
                        <>
                          <Copy className="w-3 h-3" />
                          Copy
                        </>
                      )}
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
      </div>
      <div className={`absolute left-0 right-0 p-4 md:pb-4 md:px-6 transition-all duration-500 ease-in-out ${messages.length === 0 ? 'top-0 bottom-0 overflow-y-auto' : 'bottom-0'}`}>
        <div className={`mx-auto max-w-2xl ${messages.length === 0 ? 'flex flex-col min-h-full pt-32 pb-8' : ''}`}>
          {messages.length === 0 && (
            <p className="font-instrument-sans font-medium text-foreground/90 text-4xl mb-6 text-center">
              Hey, {session.user?.email?.split('@')[0] || 'there'}. I'm PurchAI.
            </p>
          )}
          <MessageBar onMessage={onMessage} isGenerating={isGenerating} onStopGeneration={onStopGeneration} />
          {messages.length === 0 && (
            <div className="mt-12">
              <Carousel3D key="chat-carousel" />
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
