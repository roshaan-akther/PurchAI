"use client"

import { Package, ChevronDown, ChevronRight } from "lucide-react"
import { useState } from "react"

interface ProductCardProps {
  productId: string
  title?: string
  price?: number
  description?: string
  imageUrl?: string
}

export function ProductCard({ productId, title, price, description, imageUrl }: ProductCardProps) {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <div className="my-3 rounded-xl overflow-hidden backdrop-blur-sm border border-border/50">
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className="w-full flex items-center gap-3 pl-3 pr-4 py-3 hover:bg-black/[0.02] dark:hover:bg-white/[0.02] transition-colors duration-200 text-left"
      >
        <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500/10 to-purple-500/10 flex items-center justify-center shrink-0">
          <Package className="w-5 h-5 text-blue-500" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-medium text-sm text-foreground/90 truncate">
            {title || `Product ${productId}`}
          </p>
          {price && (
            <p className="text-xs text-muted-foreground/70">
              ${(price / 100).toFixed(2)}
            </p>
          )}
        </div>
        <span className="shrink-0 ml-1">
          {isOpen ? (
            <ChevronDown className="w-4 h-4 text-muted-foreground/50 transition-transform duration-200" />
          ) : (
            <ChevronRight className="w-4 h-4 text-muted-foreground/50 transition-transform duration-200" />
          )}
        </span>
      </button>

      <div
        className={`overflow-hidden transition-all duration-300 ease-out ${
          isOpen ? "max-h-96 opacity-100" : "max-h-0 opacity-0"
        }`}
      >
        <div className="pr-4 py-3 space-y-3">
          {imageUrl && (
            <div className="w-full h-32 rounded-lg overflow-hidden bg-black/5 dark:bg-white/5">
              <img
                src={imageUrl}
                alt={title || `Product ${productId}`}
                className="w-full h-full object-cover"
              />
            </div>
          )}
          <div>
            <p className="text-[11px] text-muted-foreground/50 mb-1.5 font-medium uppercase tracking-wider">
              Product ID
            </p>
            <p className="text-xs font-mono rounded-lg p-2 bg-black/5 dark:bg-white/5">
              {productId}
            </p>
          </div>
          {description && (
            <div>
              <p className="text-[11px] text-muted-foreground/50 mb-1.5 font-medium uppercase tracking-wider">
                Description
              </p>
              <p className="text-sm text-foreground/80 leading-relaxed">
                {description}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
