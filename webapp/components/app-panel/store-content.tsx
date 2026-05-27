import { Product } from "./types"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { Empty, EmptyHeader, EmptyTitle, EmptyDescription, EmptyMedia } from "@/components/ui/empty"
import { Heart, Star, ShoppingCart } from "lucide-react"

interface StoreContentProps {
  selectedCategory: string
  setSelectedCategory: (category: string) => void
  categories: string[]
  filteredProducts: Product[]
  addToCart: (product: Product) => void
  toggleFavorite: (productId: string) => void
  favorites: Set<string>
  isLoading: boolean
  onProductClick: (product: Product) => void
}

export function StoreContent({
  selectedCategory,
  setSelectedCategory,
  categories,
  filteredProducts,
  addToCart,
  toggleFavorite,
  favorites,
  isLoading,
  onProductClick
}: StoreContentProps) {
  return (
    <div className="p-6 bg-background min-h-full">
      <div className="space-y-6">
        {/* Category Filters */}
        <div className="flex gap-2 flex-wrap">
          {categories.map((category) => (
            <Button
              key={category}
              variant={selectedCategory === category ? "default" : "outline"}
              size="sm"
              onClick={() => setSelectedCategory(category)}
              className="rounded-xl"
            >
              {category.charAt(0).toUpperCase() + category.slice(1)}
            </Button>
          ))}
        </div>

        {/* Product Grid */}
        {isLoading ? (
          <div className="grid grid-cols-3 gap-4">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="overflow-hidden">
                <div className="aspect-square rounded-3xl">
                  <Skeleton className="w-full h-full rounded-3xl" />
                </div>
                <div className="p-2 space-y-1">
                  <Skeleton className="h-4 w-3/4 rounded-lg" />
                  <div className="flex justify-between">
                    <Skeleton className="h-3 w-1/3 rounded-lg" />
                    <Skeleton className="h-3 w-1/4 rounded-lg" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-4">
            {Array.from(new Map(filteredProducts.map((p, i) => [p._id || p.pid || i, p])).values()).map((product, index) => (
              <div
                key={`prod-${product._id || product.pid || index}`}
                className="overflow-hidden hover:shadow-lg transition-all cursor-pointer group mb-4 animate-in fade-in animate-out fade-out duration-300 ease-out"
                style={{ animationDelay: `${index * 50}ms` }}
                onClick={() => onProductClick(product)}
              >
                <div className="relative aspect-square rounded-3xl overflow-hidden">
                  {product.images?.[0] ? (
                    <img
                      src={product.images[0]}
                      alt={product.title || "Product"}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-secondary/30 text-muted-foreground text-xs p-2 text-center">
                      {product.title || "No Image"}
                    </div>
                  )}
                  {product.out_of_stock && (
                    <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                      <span className="text-white font-semibold">Out of Stock</span>
                    </div>
                  )}
                  <Button
                    variant="ghost"
                    size="icon"
                    className="absolute top-3 right-3 h-9 w-9 bg-background/90 hover:bg-background backdrop-blur-sm rounded-full shadow-sm"
                    onClick={(e) => {
                      e.stopPropagation()
                      toggleFavorite(product._id || "")
                    }}
                  >
                    <Heart
                      className={`h-4 w-4 ${product._id && favorites.has(product._id) ? 'fill-red-500 text-red-500' : ''}`}
                    />
                  </Button>
                </div>
                <div className="p-3">
                  <h3 className="font-semibold text-sm mb-2 line-clamp-1">{product.title || "Untitled Product"}</h3>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-1">
                      <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                      <span className="text-xs text-muted-foreground">{product.average_rating || "N/A"}</span>
                    </div>
                    <div className="text-right">
                      <span className="font-bold text-sm">Rs.{product.selling_price || "0"}</span>
                      {product.discount && (
                        <span className="text-xs text-green-600 block">{product.discount}</span>
                      )}
                    </div>
                  </div>
                  <Button
                    className="w-full h-9 text-sm rounded-xl"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation()
                      addToCart(product)
                    }}
                    disabled={product.out_of_stock}
                  >
                    <ShoppingCart className="h-3 w-3 mr-2" />
                    Add to Cart
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}

        {!isLoading && filteredProducts.length === 0 && (
          <Empty>
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <ShoppingCart className="h-12 w-12" />
              </EmptyMedia>
              <EmptyTitle>No products found</EmptyTitle>
              <EmptyDescription>Try adjusting your search or filter criteria</EmptyDescription>
            </EmptyHeader>
          </Empty>
        )}
      </div>
    </div>
  )
}
