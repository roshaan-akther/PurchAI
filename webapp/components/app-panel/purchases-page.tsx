"use client"

import { useEffect, useState } from "react"
import { Package } from "lucide-react"
import { ProductCard } from "@/components/product-card"
import { Skeleton } from "@/components/ui/skeleton"
import { toast } from "sonner"
import { Product } from "./types"

interface Purchase {
  product_id: string
  timestamp: string
  quantity: number
  event_type: string
}

interface PurchasesPageProps {
  onProductClick?: (product: Product) => void
}

export function PurchasesPage({ onProductClick }: PurchasesPageProps) {
  const [purchases, setPurchases] = useState<Purchase[]>([])
  const [products, setProducts] = useState<Map<string, Product>>(new Map())
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchPurchaseHistory = async () => {
      try {
        const response = await fetch('/api/purchases/history')
        if (!response.ok) {
          throw new Error('Failed to fetch purchase history')
        }
        const data = await response.json() as { purchases: Purchase[] }
        setPurchases(data.purchases || [])

        // Fetch product details for each purchase
        const productIds: string[] = [...new Set(data.purchases.map((p: Purchase) => p.product_id))]
        const productMap = new Map<string, Product>()

        await Promise.all(
          productIds.map(async (productId: string) => {
            try {
              const productResp = await fetch(`/api/products/by-id/${productId}`)
              if (productResp.ok) {
                const productData = await productResp.json() as { product: any }
                if (productData.product) {
                  // Convert selling_price from number to string to match Product type
                  const product: Product = {
                    ...productData.product,
                    selling_price: productData.product.selling_price?.toString() || '0'
                  }
                  productMap.set(productId, product)
                }
              }
            } catch (e) {
              console.error(`Failed to fetch product ${productId}:`, e)
            }
          })
        )

        setProducts(productMap)
      } catch (error) {
        console.error('Failed to fetch purchase history:', error)
        toast.error('Failed to load purchase history')
      } finally {
        setLoading(false)
      }
    }

    fetchPurchaseHistory()
  }, [])

  if (loading) {
    return (
      <div className="p-6 space-y-4">
        <div className="flex items-center gap-2 mb-6">
          <Package className="h-5 w-5" />
          <h2 className="text-lg font-semibold">My Purchases</h2>
        </div>
        {[...Array(3)].map((_, i) => (
          <div key={i} className="p-4 border border-border/25 rounded-xl">
            <Skeleton className="h-4 w-3/4 mb-2" />
            <Skeleton className="h-3 w-1/2" />
          </div>
        ))}
      </div>
    )
  }

  if (purchases.length === 0) {
    return (
      <div className="p-6 text-center">
        <Package className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
        <h3 className="text-lg font-medium mb-2">No purchases yet</h3>
        <p className="text-sm text-muted-foreground">
          Your purchase history will appear here after you place orders.
        </p>
      </div>
    )
  }

  // Group purchases by product_id and sum quantities
  const groupedPurchases = purchases.reduce((acc, purchase) => {
    const existing = acc.get(purchase.product_id)
    if (existing) {
      acc.set(purchase.product_id, {
        ...existing,
        quantity: existing.quantity + purchase.quantity,
        timestamps: [...existing.timestamps, purchase.timestamp]
      })
    } else {
      acc.set(purchase.product_id, {
        ...purchase,
        timestamps: [purchase.timestamp]
      })
    }
    return acc
  }, new Map<string, Purchase & { timestamps: string[] }>())

  // Sort by most recent purchase
  const sortedPurchases = Array.from(groupedPurchases.values()).sort((a, b) => {
    const latestA = new Date(Math.max(...a.timestamps.map(t => new Date(t).getTime())))
    const latestB = new Date(Math.max(...b.timestamps.map(t => new Date(t).getTime())))
    return latestB.getTime() - latestA.getTime()
  })

  return (
    <div className="p-6">
      <div className="flex items-center gap-2 mb-6">
        <Package className="h-5 w-5" />
        <h2 className="text-lg font-semibold">My Purchases</h2>
        <span className="text-sm text-muted-foreground">({sortedPurchases.length} items)</span>
      </div>

      <div className="grid grid-cols-4 gap-4">
        {sortedPurchases.map((purchase) => {
          const product = products.get(purchase.product_id)
          if (!product) return null

          return (
            <div
              key={purchase.product_id}
              className="group"
            >
              <div className="aspect-square bg-secondary/30 rounded-2xl overflow-hidden mb-3">
                {product.images?.[0] ? (
                  <img
                    src={product.images[0]}
                    alt={product.title || "Product"}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-muted-foreground text-xs p-2 text-center">
                    {product.title || "No Image"}
                  </div>
                )}
              </div>
              <p className="text-sm font-medium line-clamp-1 mb-1">{product.title || "Untitled Product"}</p>
              <p className="text-sm font-bold">Rs.{product.selling_price || "0"}</p>
              {purchase.quantity > 1 && (
                <p className="text-xs text-muted-foreground">Qty: {purchase.quantity}</p>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
