import { Product } from "./types"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { Empty, EmptyHeader, EmptyMedia, EmptyTitle, EmptyDescription } from "@/components/ui/empty"
import { X, ShoppingCart } from "lucide-react"

interface CartContentProps {
  cart: Product[]
  removeFromCart: (index: number) => void
  cartTotal: number
}

export function CartContent({ cart, removeFromCart, cartTotal }: CartContentProps) {
  if (cart.length === 0) {
    return (
      <Empty>
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <ShoppingCart className="h-12 w-12" />
          </EmptyMedia>
          <EmptyTitle>Your cart is empty</EmptyTitle>
          <EmptyDescription>Add some products to get started</EmptyDescription>
        </EmptyHeader>
      </Empty>
    )
  }

  return (
    <div className="space-y-4">
      <ScrollArea className="h-[calc(100vh-350px)]">
        <div className="space-y-3">
          {cart.map((item, index) => (
            <Card key={`${item._id || item.pid || index}`}>
              <CardContent className="p-3">
                <div className="flex gap-3">
                  {item.images?.[0] && (
                    <img
                      src={item.images[0]}
                      alt={item.title}
                      className="w-16 h-16 object-cover rounded"
                    />
                  )}
                  <div className="flex-1">
                    <h4 className="font-semibold text-sm mb-1">{item.title}</h4>
                    <p className="text-sm font-bold">Rs.{item.selling_price}</p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => removeFromCart(index)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </ScrollArea>
      
      <Separator />
      
      <div className="space-y-2">
        <div className="flex justify-between text-lg font-semibold">
          <span>Total</span>
          <span>Rs.{cartTotal.toFixed(2)}</span>
        </div>
        <Button className="w-full" size="lg">
          Checkout
        </Button>
      </div>
    </div>
  )
}
