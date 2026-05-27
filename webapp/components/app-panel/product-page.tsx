import { Product } from "./types"
import { Button } from "@/components/ui/button"
import { Heart, Minus, Plus, Star } from "lucide-react"
import { useState, useEffect } from "react"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { useAuth } from "@/lib/auth"
import { getAlsoBoughtRecommendations, Product as RecProduct } from "@/lib/recommendation-api"

interface ProductPageProps {
  product: Product
  isFavorite: boolean
  onToggleFavorite: () => void
  onAddToCart: (product: Product, quantity: number) => void
  onProductClick: (product: Product) => void
}

export function ProductPage({
  product,
  isFavorite,
  onToggleFavorite,
  onAddToCart,
  onProductClick
}: ProductPageProps) {
  const { session } = useAuth()
  const [quantity, setQuantity] = useState(1)
  const [recommendedProducts, setRecommendedProducts] = useState<Product[]>([])
  const [loadingRecs, setLoadingRecs] = useState(false)

  // Fetch "also bought" recommendations
  useEffect(() => {
    const fetchAlsoBought = async () => {
      if (!session.authenticated || !session.userId || (!product.pid && !product._id)) {
        setRecommendedProducts([])
        return
      }

      setLoadingRecs(true)
      try {
        const response = await getAlsoBoughtRecommendations({
          user_id: session.userId,
          product_id: product.pid || product._id || '',
          k: 4
        })

        // Map API response to local Product format
        const mappedProducts: Product[] = response.recommendations.map(rec => ({
          _id: rec.product_id,
          pid: rec.product_id,
          title: rec.title,
          brand: rec.brand,
          category: rec.category,
          sub_category: rec.sub_category,
          selling_price: rec.price.toString(),
          average_rating: rec.rating.toString(),
          images: rec.image ? [rec.image] : [],
          description: `${rec.brand} - ${rec.category}`,
          out_of_stock: false,
          product_details: []
        }))

        setRecommendedProducts(mappedProducts)
      } catch (error) {
        console.error('Failed to fetch also bought recommendations:', error)
        setRecommendedProducts([])
      } finally {
        setLoadingRecs(false)
      }
    }

    fetchAlsoBought()
  }, [session.authenticated, session.userId, product._id])

  const handleAddToCart = () => {
    onAddToCart(product, quantity)
  }

  return (
    <div className="h-full bg-background">
      <div className="p-6">
        <div className="grid grid-cols-2 gap-8">
          {/* Left Column - Product Image */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span>Store</span>
              <span>/</span>
              <span className="text-foreground">{product.category || "All"}</span>
            </div>
            <div className="aspect-square bg-secondary/30 rounded-3xl flex items-center justify-center overflow-hidden">
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
            {/* Stock Info */}
            <div className="p-4 bg-secondary/30 rounded-xl space-y-2">
              <div className="flex items-center gap-2 text-sm">
                <div className={`w-2 h-2 rounded-full ${product.out_of_stock ? 'bg-red-500' : 'bg-green-500'}`} />
                <span>{product.out_of_stock ? 'Out of Stock' : 'In Stock'}</span>
              </div>
              {product.seller && (
                <p className="text-xs text-muted-foreground">
                  Sold by: {product.seller}
                </p>
              )}
            </div>
          </div>

          {/* Right Column - Product Details */}
          <div className="space-y-6">
            {/* Category Label */}
            <div className="flex justify-end">
              <Badge variant="secondary">{product.category || "General"}</Badge>
            </div>

            {/* Header */}
            <div className="space-y-2">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  {product.brand && (
                    <p className="text-sm text-muted-foreground mb-1">{product.brand}</p>
                  )}
                  <h1 className="text-4xl font-bold tracking-tight">{product.title || "Untitled Product"}</h1>
                </div>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={onToggleFavorite}
                  className="h-12 w-12 rounded-full"
                >
                  <Heart className={`h-5 w-5 ${isFavorite ? 'fill-red-500 text-red-500' : ''}`} />
                </Button>
              </div>

              {/* Rating */}
              <div className="flex items-center gap-2">
                <div className="flex items-center">
                  {[...Array(5)].map((_, i) => (
                    <Star
                      key={i}
                      className={`h-4 w-4 ${
                        product.average_rating && i < Math.floor(parseFloat(product.average_rating))
                          ? "fill-yellow-400 text-yellow-400"
                          : "text-muted-foreground"
                      }`}
                    />
                  ))}
                </div>
                <span className="text-sm font-medium">{product.average_rating || "N/A"}</span>
              </div>
            </div>

            <Separator />

            {/* Price and Quantity */}
            <div className="flex items-center justify-between gap-4">
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">Price</p>
                <div className="flex items-baseline gap-2">
                  <p className="text-3xl font-bold">Rs.{product.selling_price || "0"}</p>
                  {product.actual_price && (
                    <p className="text-sm text-muted-foreground line-through">Rs.{product.actual_price}</p>
                  )}
                </div>
                {product.discount && (
                  <p className="text-sm text-green-600">{product.discount}</p>
                )}
              </div>
              <div className="space-y-2">
                <p className="text-sm font-medium">Quantity</p>
                <div className="flex items-center border border-border rounded-xl">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    className="h-10 w-10 rounded-l-xl"
                    disabled={product.out_of_stock}
                  >
                    <Minus className="h-4 w-4" />
                  </Button>
                  <span className="w-12 text-center font-medium">{quantity}</span>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setQuantity(quantity + 1)}
                    className="h-10 w-10 rounded-r-xl"
                    disabled={product.out_of_stock}
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-4">
              <Button
                onClick={handleAddToCart}
                className="flex-1 h-14 text-base rounded-xl"
                size="lg"
                disabled={product.out_of_stock}
              >
                Add to Cart
              </Button>
              <Button
                variant="outline"
                className="flex-1 h-14 text-base rounded-xl"
                size="lg"
                disabled={product.out_of_stock}
              >
                Buy Now
              </Button>
            </div>

            {/* Description */}
            {product.description && (
              <div className="space-y-3">
                <h3 className="font-semibold">Description</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {product.description}
                </p>
              </div>
            )}

            {/* Product Details */}
            {product.product_details && product.product_details.length > 0 && (
              <div className="space-y-3">
                <h3 className="font-semibold">Product Details</h3>
                <div className="grid grid-cols-2 gap-2">
                  {product.product_details.map((detail, index) => {
                    const [key, value] = Object.entries(detail)[0]
                    return (
                      <div key={index} className="text-sm">
                        <span className="text-muted-foreground">{key}:</span>
                        <span className="ml-2">{value}</span>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Recommended Products */}
      {recommendedProducts.length > 0 && (
        <div className="border-t border-border/50">
          <div className="p-6">
            <h3 className="text-xl font-semibold mb-6">You May Also Like</h3>
            <div className="grid grid-cols-4 gap-4">
              {Array.from(new Map(recommendedProducts.map((p, i) => [p._id || p.pid || i, p])).values()).map((recProduct, index) => (
                <div
                  key={`also-bought-${recProduct._id || recProduct.pid || index}`}
                  className="cursor-pointer group"
                  onClick={() => onProductClick(recProduct)}
                >
                  <div className="aspect-square bg-secondary/30 rounded-2xl overflow-hidden mb-3 group-hover:shadow-lg transition-shadow">
                    {recProduct.images?.[0] ? (
                      <img
                        src={recProduct.images[0]}
                        alt={recProduct.title || "Product"}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-muted-foreground text-xs p-2 text-center">
                        {recProduct.title || "No Image"}
                      </div>
                    )}
                  </div>
                  <p className="text-sm font-medium line-clamp-1 mb-1">{recProduct.title || "Untitled Product"}</p>
                  <p className="text-sm font-bold">Rs.{recProduct.selling_price || "0"}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
