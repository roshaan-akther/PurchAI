import { Product } from "./types"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { Empty, EmptyHeader, EmptyMedia, EmptyTitle, EmptyDescription } from "@/components/ui/empty"
import { ShoppingCart, Minus, Plus, Trash2 } from "lucide-react"

interface CartItem {
  product: Product
  quantity: number
}

interface CartPageProps {
  cart: CartItem[]
  removeFromCart: (productId: string) => void
  updateCartQuantity: (productId: string, delta: number) => void
  cartTotal: string
  cartTotalQuantity: number
}

export function CartPage({ cart, removeFromCart, updateCartQuantity, cartTotal, cartTotalQuantity }: CartPageProps) {
  if (cart.length === 0) {
    return (
      <div className="p-6 bg-background min-h-full">
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <ShoppingCart className="h-12 w-12" />
            </EmptyMedia>
            <EmptyTitle>Your cart is empty</EmptyTitle>
            <EmptyDescription>Add some products to get started</EmptyDescription>
          </EmptyHeader>
        </Empty>
      </div>
    )
  }

  return (
    <div className="p-6 bg-background min-h-full">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">Shopping Cart</h1>
          <span className="text-sm text-muted-foreground">{cartTotalQuantity} items</span>
        </div>

        {/* Cart Items */}
        <div className="space-y-4">
          {cart.map((item, index) => {
            const itemPrice = parseFloat((item.product.selling_price || "0").replace(/,/g, '')) * item.quantity
            return (
              <Card key={`cart-${item.product._id || item.product.pid || index}`} className="rounded-2xl overflow-hidden">
                <CardContent className="p-0">
                  <div className="flex gap-4 p-4">
                    {/* Product Image */}
                    <div className="w-24 h-24 flex-shrink-0 relative">
                      {item.product.images?.[0] ? (
                        <img
                          src={item.product.images[0]}
                          alt={item.product.title || "Product"}
                          className="w-full h-full object-cover rounded-xl"
                        />
                      ) : (
                        <div className="w-full h-full bg-secondary/30 rounded-xl flex items-center justify-center text-muted-foreground text-xs p-2 text-center">
                          {item.product.title || "No Image"}
                        </div>
                      )}
                      {item.quantity > 1 && (
                        <div className="absolute -top-2 -right-2 bg-primary text-primary-foreground text-xs font-bold w-6 h-6 rounded-full flex items-center justify-center">
                          {item.quantity}
                        </div>
                      )}
                    </div>

                    {/* Product Details */}
                    <div className="flex-1 min-w-0">
                      <h4 className="font-semibold text-sm mb-1 line-clamp-2">{item.product.title || "Untitled Product"}</h4>
                      {item.product.brand && (
                        <p className="text-xs text-muted-foreground mb-2">{item.product.brand}</p>
                      )}
                      <div className="flex items-center gap-2 mb-3">
                        <span className="text-lg font-bold">Rs.{item.product.selling_price || "0"}</span>
                        {item.product.actual_price && (
                          <span className="text-sm text-muted-foreground line-through">Rs.{item.product.actual_price}</span>
                        )}
                        {item.product.discount && (
                          <span className="text-xs text-green-600 bg-green-50 px-2 py-0.5 rounded-full">{item.product.discount}</span>
                        )}
                      </div>

                      {/* Quantity Control */}
                      <div className="flex items-center gap-3">
                        <div className="flex items-center border border-border rounded-lg">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => updateCartQuantity(item.product._id || "", -1)}
                            className="h-8 w-8 rounded-l-lg"
                          >
                            <Minus className="h-3 w-3" />
                          </Button>
                          <span className="w-8 text-center text-sm font-medium">{item.quantity}</span>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => updateCartQuantity(item.product._id || "", 1)}
                            className="h-8 w-8 rounded-r-lg"
                          >
                            <Plus className="h-3 w-3" />
                          </Button>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeFromCart(item.product._id || "")}
                          className="text-red-500 hover:text-red-600 hover:bg-red-50 h-8 px-3"
                        >
                          <Trash2 className="h-4 w-4 mr-1" />
                          Remove
                        </Button>
                      </div>
                    </div>

                    {/* Item Total */}
                    <div className="text-right">
                      <p className="text-lg font-bold">Rs.{itemPrice.toFixed(2)}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>

        <Separator />

        {/* Order Summary */}
        <div className="space-y-4">
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Subtotal</span>
              <span>Rs.{cartTotal}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Shipping</span>
              <span className="text-green-600">Free</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Tax</span>
              <span>Rs.0</span>
            </div>
          </div>
          <Separator />
          <div className="flex justify-between text-xl font-bold">
            <span>Total</span>
            <span>Rs.{cartTotal}</span>
          </div>
          <Button className="w-full h-14 rounded-xl text-base" size="lg" onClick={() => window.location.hash = "#store?page=checkout"}>
            Proceed to Checkout
          </Button>
          <p className="text-xs text-center text-muted-foreground">
            Secure checkout powered by Stripe
          </p>
        </div>
      </div>
    </div>
  )
}
