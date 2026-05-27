import { Product } from "./types"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Badge } from "@/components/ui/badge"
import { Heart, Star, ShoppingCart } from "lucide-react"

interface ProductDetailDialogProps {
  product: Product | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onAddToCart: (product: Product) => void
  isFavorite: boolean
  onToggleFavorite: () => void
}

export function ProductDetailDialog({ 
  product, 
  open, 
  onOpenChange, 
  onAddToCart,
  isFavorite,
  onToggleFavorite
}: ProductDetailDialogProps) {
  if (!product) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="text-2xl">{product.title}</DialogTitle>
        </DialogHeader>
        <ScrollArea className="h-[70vh]">
          <div className="space-y-6">
            <div className="relative aspect-video">
              {product.images?.[0] && (
                <img
                  src={product.images[0]}
                  alt={product.title}
                  className="w-full h-full object-cover rounded-lg"
                />
              )}
            </div>
            
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Star className="h-5 w-5 fill-yellow-400 text-yellow-400" />
                  <span className="font-semibold">{product.average_rating}</span>
                </div>
                <Badge variant="secondary" className="text-sm">{product.category}</Badge>
              </div>
              
              <p className="text-muted-foreground text-lg">{product.description}</p>
              
              <div className="flex items-center justify-between">
                <span className="text-3xl font-bold">Rs.{product.selling_price}</span>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="lg"
                    onClick={onToggleFavorite}
                  >
                    <Heart className={`h-5 w-5 mr-2 ${isFavorite ? 'fill-red-500 text-red-500' : ''}`} />
                    {isFavorite ? 'Favorited' : 'Favorite'}
                  </Button>
                  <Button
                    size="lg"
                    onClick={() => onAddToCart(product)}
                  >
                    <ShoppingCart className="h-5 w-5 mr-2" />
                    Add to Cart
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  )
}
