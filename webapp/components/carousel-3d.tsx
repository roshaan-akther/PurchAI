"use client"

import { useEffect, useMemo, useRef, useState, startTransition } from "react"
import { motion, useInView } from "framer-motion"
import { ChevronLeft, ChevronRight, Package, ChevronDown, ChevronRight as ChevronRightIcon } from "lucide-react"
import { useAuth } from "@/lib/auth"
import { getRecommendations, getNewUserRecommendations, Product as RecProduct } from "@/lib/recommendation-api"

// Map recommendation API product to carousel card format
function mapRecProductToCard(product: RecProduct): Card {
  return {
    productId: product.product_id,
    title: product.title,
    price: product.price,
    description: `${product.brand} - ${product.category} / ${product.sub_category}`,
    image: product.image || "" // Return empty string if no image, will be handled in rendering
  }
}

function getOffset(idx: number, current: number, total: number) {
  let diff = idx - current
  if (diff > total / 2) diff -= total
  if (diff < -total / 2) diff += total
  return diff
}

interface Card {
  productId: string
  title: string
  price: number
  description: string
  image: string
}

interface Carousel3DProps {
  cards?: Card[]
  cardWidth?: number
  cardHeight?: number
  cardRadius?: number
  spacing?: number
  autoplay?: boolean
  autoplayDelay?: number
  pauseOnHover?: boolean
  perspective?: number
  rotateY?: number
  zDepth?: number
  scaleNear?: number
  scaleMid?: number
  scaleFar?: number
  opacityMid?: number
  opacityFar?: number
  showArrows?: boolean
  showDots?: boolean
  backgroundColor?: string
  borderRadius?: number
  paddingY?: number
  overlayOpacity?: number
  labelColor?: string
  labelAlign?: "left" | "center" | "right"
  labelSize?: number
  arrowBackground?: string
  arrowBorder?: string
  arrowColor?: string
  dotActive?: string
  dotInactive?: string
  responsive?: boolean
  responsiveBaseWidth?: number
  responsiveMinScale?: number
  responsiveMaxScale?: number
  style?: React.CSSProperties
}

export default function Carousel3D({
  cards: propCards,
  cardWidth = 380,
  cardHeight = 500,
  cardRadius = 22,
  spacing = 280,
  autoplay = true,
  autoplayDelay = 2000,
  pauseOnHover = true,
  perspective = 1500,
  rotateY = 16,
  zDepth = 110,
  scaleNear = 0.82,
  scaleMid = 0.68,
  scaleFar = 0.55,
  opacityMid = 0.45,
  opacityFar = 0,
  showArrows = true,
  showDots = true,
  backgroundColor = "#0a0a0a",
  borderRadius = 22,
  paddingY = 68,
  overlayOpacity = 0.72,
  labelColor = "#FFFFFF",
  labelAlign = "left",
  labelSize = 19,
  arrowBackground = "rgba(255,255,255,0.1)",
  arrowBorder = "rgba(255,255,255,0.15)",
  arrowColor = "#FFFFFF",
  dotActive = "rgba(255,255,255,0.9)",
  dotInactive = "rgba(255,255,255,0.25)",
  responsive = true,
  responsiveBaseWidth = 900,
  responsiveMinScale = 0.7,
  responsiveMaxScale = 1.15,
  style
}: Carousel3DProps) {
  const { session, loading: authLoading } = useAuth()
  const [cards, setCards] = useState<Card[]>(propCards || [])
  const [loading, setLoading] = useState(false)
  const isFixedHeight = !!style && style.height === "100%"
  const n = Math.max(1, cards.length)
  const rootRef = useRef<HTMLDivElement>(null)
  const inView = useInView(rootRef, { margin: "-10% 0px -10% 0px" })
  const [containerWidth, setContainerWidth] = useState(0)

  // Fetch recommendations based on auth state
  useEffect(() => {
    const fetchRecommendations = async () => {
      if (authLoading) return
      
      setLoading(true)
      try {
        let response: any
        if (session.authenticated && session.userId) {
          // Authenticated: get personalized recommendations
          response = await getRecommendations(session.userId, 5)
        } else {
          // Unauthenticated: get new user recommendations
          response = await getNewUserRecommendations({
            primary_category: "Clothing and Accessories",
            primary_sub_category: "Topwear",
            preferred_brands: [],
            price_range_preference: "medium",
            k: 5
          })
        }
        
        // Enrich with images from MongoDB if API returns null
        const enrichedRecommendations = await Promise.all(
          response.recommendations.map(async (rec: RecProduct) => {
            if (rec.image) return rec
            try {
              const productResp = await fetch(`/api/products/by-id/${rec.product_id}`)
              if (productResp.ok) {
                const productData = await productResp.json()
                return { ...rec, image: productData.product?.images?.[0] || null }
              }
            } catch (e) {
              console.error('Failed to fetch product image:', e)
            }
            return rec
          })
        )
        
        const mappedCards = enrichedRecommendations.map(mapRecProductToCard)
        // Deduplicate by productId with fallback to title and index
        const seenIds = new Set<string>()
        const uniqueCards: Card[] = []
        for (const card of mappedCards) {
          const id = card.productId || card.title || Math.random().toString()
          if (!seenIds.has(id)) {
            seenIds.add(id)
            uniqueCards.push(card)
          }
        }
        setCards(uniqueCards)
      } catch (error) {
        console.error('Failed to fetch recommendations:', error)
        setCards([])
      } finally {
        setLoading(false)
      }
    }

    fetchRecommendations()
  }, [session.authenticated, session.userId, authLoading])

  useEffect(() => {
    if (typeof window === "undefined") return
    const el = rootRef.current
    if (!el || typeof ResizeObserver === "undefined") return
    const ro = new ResizeObserver((entries) => {
      const w = entries?.[0]?.contentRect?.width
      if (typeof w !== "number" || !Number.isFinite(w)) return
      startTransition(() => setContainerWidth(w))
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  const responsiveScale = useMemo(() => {
    if (!responsive) return 1
    if (!containerWidth || !responsiveBaseWidth) return 1
    const s = containerWidth / responsiveBaseWidth
    return Math.max(responsiveMinScale, Math.min(responsiveMaxScale, s))
  }, [responsive, containerWidth, responsiveBaseWidth, responsiveMinScale, responsiveMaxScale])

  const cardW = Math.round(cardWidth * responsiveScale)
  const cardH = Math.round(cardHeight * responsiveScale)
  const spacingX = spacing * responsiveScale
  const perspectivePx = perspective * responsiveScale
  const zDepthPx = zDepth * responsiveScale
  const labelPx = Math.max(1, Math.round(labelSize * responsiveScale))

  const [current, setCurrent] = useState(Math.min(2, n - 1))
  const [expandedCard, setExpandedCard] = useState<string | null>(null)

  useEffect(() => {
    startTransition(() => setCurrent((c) => Math.min(c, n - 1)))
  }, [n])

  const autoplayRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const stopAutoplay = () => {
    if (autoplayRef.current === null) return
    if (typeof window !== "undefined") window.clearInterval(autoplayRef.current)
    autoplayRef.current = null
  }

  const startAutoplay = () => {
    stopAutoplay()
    if (!autoplay || !inView) return
    if (typeof window === "undefined") return
    autoplayRef.current = setInterval(() => {
      startTransition(() => setCurrent((c) => (c + 1) % n))
    }, Math.max(200, autoplayDelay)) as unknown as ReturnType<typeof setInterval>
  }

  useEffect(() => {
    startAutoplay()
    return () => stopAutoplay()
  }, [autoplay, autoplayDelay, inView, n])

  const getCardProps = (pos: number) => {
    const abs = Math.abs(pos)
    const scale = abs === 0 ? 1 : abs === 1 ? scaleNear : abs === 2 ? scaleMid : scaleFar
    const opacity = abs > 2 ? opacityFar : abs === 2 ? opacityMid : abs === 1 ? 0.75 : 1
    return {
      x: pos * spacingX,
      z: -abs * zDepthPx,
      rotateY: pos * rotateY,
      scale,
      opacity,
      brightness: abs === 0 ? 1 : abs === 1 ? 0.6 : 0.35,
      zIndex: 10 - abs
    }
  }

  return (
    <div
      ref={rootRef}
      style={{
        background: backgroundColor,
        width: "100%",
        minHeight: 420,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: `${paddingY}px 0 32px`,
        borderRadius,
        overflow: "hidden",
        position: "relative",
        ...style
      }}
      onMouseEnter={pauseOnHover ? stopAutoplay : undefined}
      onMouseLeave={pauseOnHover ? startAutoplay : undefined}
    >
      <div
        style={{
          position: "relative",
          width: "100%",
          height: isFixedHeight ? "100%" : cardH + 60,
          flex: isFixedHeight ? 1 : undefined,
          minHeight: 0,
          perspective: perspectivePx,
          display: "flex",
          alignItems: "center",
          justifyContent: "center"
        }}
      >
        {showArrows && (
          <>
            <button
              aria-label="Previous"
              onClick={() => startTransition(() => setCurrent((c) => (c - 1 + n) % n))}
              style={{
                position: "absolute",
                left: 0,
                top: 0,
                bottom: 0,
                zIndex: 100,
                width: 100,
                background: "transparent",
                color: arrowColor,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                border: "none",
                transition: "background 0.2s ease"
              }}
              type="button"
              onMouseEnter={(e) => e.currentTarget.style.background = "transparent"}
              onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}
            >
              <ChevronLeft size={32} />
            </button>
            <button
              aria-label="Next"
              onClick={() => startTransition(() => setCurrent((c) => (c + 1) % n))}
              style={{
                position: "absolute",
                right: 0,
                top: 0,
                bottom: 0,
                zIndex: 100,
                width: 100,
                background: "transparent",
                color: arrowColor,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                border: "none",
                transition: "background 0.2s ease"
              }}
              type="button"
              onMouseEnter={(e) => e.currentTarget.style.background = "transparent"}
              onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}
            >
              <ChevronRight size={32} />
            </button>
          </>
        )}
        {Array.from(new Map(cards.map((c, i) => [c.productId || c.title || i, c])).values()).map((card, i) => {
          const originalIndex = cards.findIndex(c => c.productId === card.productId)
          const pos = getOffset(originalIndex, current, n)
          const p = getCardProps(pos)
          const isOpen = expandedCard === card.productId
          return (
            <motion.div
              key={card.productId || card.title || i}
              role="button"
              aria-label={card.title}
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  startTransition(() => setCurrent(originalIndex))
                }
              }}
              onClick={() => startTransition(() => setCurrent(originalIndex))}
              animate={{
                x: p.x,
                z: p.z,
                rotateY: p.rotateY,
                scale: p.scale,
                opacity: p.opacity
              }}
              transition={{ type: "spring", stiffness: 280, damping: 30 }}
              style={{
                position: "absolute",
                width: cardW,
                height: isFixedHeight ? "100%" : cardH,
                borderRadius: cardRadius,
                overflow: "hidden",
                cursor: "pointer",
                zIndex: p.zIndex,
                filter: `brightness(${p.brightness})`,
                pointerEvents: Math.abs(pos) <= 1 ? "auto" : "none",
                transformStyle: "preserve-3d",
                outline: "none",
                background: backgroundColor
              }}
            >
              <div className="h-full flex flex-col">
                {card.image ? (
                  <img
                    src={card.image}
                    alt={card.title}
                    className="w-full h-48 object-cover rounded-xl"
                  />
                ) : (
                  <div className="w-full h-48 bg-secondary/30 rounded-xl flex items-center justify-center text-muted-foreground text-xs p-2 text-center">
                    {card.title}
                  </div>
                )}
                <div className="flex-1 flex flex-col p-4">
                  <div className="flex-1">
                    <p className="font-medium text-base text-foreground/90 truncate mb-1" style={{ color: labelColor }}>
                      {card.title}
                    </p>
                    <p className="text-sm text-muted-foreground/70 mb-2" style={{ color: labelColor, opacity: 0.7 }}>
                      Rs.{card.price}
                    </p>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      setExpandedCard(isOpen ? null : card.productId)
                    }}
                    className="w-full flex items-center justify-center gap-2 py-2 rounded-lg bg-white/5 hover:bg-white/10 transition-colors"
                    style={{ color: labelColor, opacity: 0.7 }}
                  >
                    {isOpen ? (
                      <>
                        <ChevronDown className="w-4 h-4" />
                        <span className="text-xs">Show Less</span>
                      </>
                    ) : (
                      <>
                        <ChevronRightIcon className="w-4 h-4" />
                        <span className="text-xs">Show More</span>
                      </>
                    )}
                  </button>
                  <div
                    className={`overflow-hidden transition-all duration-300 ease-out ${
                      isOpen ? "max-h-32 opacity-100 mt-3" : "max-h-0 opacity-0"
                    }`}
                  >
                    <div className="space-y-2">
                      <div>
                        <p className="text-[11px] text-muted-foreground/50 mb-1 font-medium uppercase tracking-wider" style={{ color: labelColor, opacity: 0.5 }}>
                          Product ID
                        </p>
                        <p className="text-xs font-mono rounded-lg p-2 bg-black/5 dark:bg-white/5" style={{ color: labelColor }}>
                          {card.productId}
                        </p>
                      </div>
                      <div>
                        <p className="text-[11px] text-muted-foreground/50 mb-1 font-medium uppercase tracking-wider" style={{ color: labelColor, opacity: 0.5 }}>
                          Description
                        </p>
                        <p className="text-sm text-foreground/80 leading-relaxed" style={{ color: labelColor, opacity: 0.8 }}>
                          {card.description}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          )
        })}
      </div>
      {showDots && (
        <div style={{ display: "flex", gap: 8, marginTop: 28 }}>
          {cards.map((_, i) => (
            <div
              key={i}
              role="button"
              aria-label={`Go to slide ${i + 1}`}
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  startTransition(() => setCurrent(i))
                }
              }}
              onClick={() => startTransition(() => setCurrent(i))}
              style={{
                width: 6,
                height: 6,
                borderRadius: "50%",
                background: i === current ? dotActive : dotInactive,
                transform: i === current ? "scale(1.4)" : "scale(1)",
                transition: "all 0.3s",
                cursor: "pointer"
              }}
            />
          ))}
        </div>
      )}
    </div>
  )
}
