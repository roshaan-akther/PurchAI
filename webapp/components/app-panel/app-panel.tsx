"use client"

import { useEffect, useRef, useState } from "react"

import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable"
import { usePanel } from "@/components/homeshell"
import { useIsMobile } from "@/hooks/use-mobile"
import { X, ShoppingCart, Search, ArrowLeft, Package } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { toast } from "sonner"
import { Toaster } from "@/components/ui/sonner"

import { Product } from "./types"
import { StoreContent } from "./store-content"
import { ProductPage } from "./product-page"
import { CartPage } from "./cart-page"
import { CheckoutPage } from "./checkout-page"
import { PurchasesPage } from "./purchases-page"
import { getCurrentPage, navigateToPage, getProductIdFromHash, Page } from "./router"
import { 
  searchProducts, 
  getRecommendedProducts, 
  calculateCartTotal,
  getCategories
} from "./operations"
import { useAuth } from "@/lib/auth"

const PANEL_STATE_KEY = "purchai-panel-state"

export function AppPanel() {
  const { isPanelOpen, setPanelOpen } = usePanel()
  const { session } = useAuth()
  const hasInitialized = useRef(false)
  const isMobile = useIsMobile()
  const [currentPage, setCurrentPage] = useState<Page>("main")
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedCategory, setSelectedCategory] = useState("all")
  const [cart, setCart] = useState<Map<string, { product: Product; quantity: number }>>(new Map())
  const [favorites, setFavorites] = useState<Set<string>>(new Set())
  const [isLoading, setIsLoading] = useState(false)
  const [products, setProducts] = useState<Product[]>([])
  const [productsLoading, setProductsLoading] = useState(true)
  
  // Get categories dynamically from products
  const categories = getCategories(products)

  useEffect(() => {
    if (!hasInitialized.current) {
      const savedState = localStorage.getItem(PANEL_STATE_KEY)
      if (savedState === "open") {
        setPanelOpen(true)
      } else if (savedState === "closed") {
        setPanelOpen(false)
      }
      hasInitialized.current = true
    }
  }, [setPanelOpen])

  useEffect(() => {
    if (hasInitialized.current) {
      if (!isPanelOpen) {
        localStorage.setItem(PANEL_STATE_KEY, "closed")
      }
    }
  }, [isPanelOpen])

  useEffect(() => {
    const handleHashChange = () => {
      setCurrentPage(getCurrentPage())
    }
    window.addEventListener("hashchange", handleHashChange)
    return () => window.removeEventListener("hashchange", handleHashChange)
  }, [])

  // Fetch products from database
  useEffect(() => {
    const fetchProducts = async () => {
      setProductsLoading(true)
      try {
        const response = await fetch('/api/products')
        const data = await response.json()
        // Deduplicate products by _id or pid
        const uniqueProducts = Array.from(new Map((data.products || []).map((p: Product, i: number) => [p._id || p.pid || i, p])).values())
        setProducts(uniqueProducts as Product[])
      } catch (error) {
        console.error('Failed to fetch products:', error)
        setProducts([])
      } finally {
        setProductsLoading(false)
      }
    }

    fetchProducts()
  }, [])

  // Use unified search operation
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([])
  const [isSearching, setIsSearching] = useState(false)

  useEffect(() => {
    const performSearch = async () => {
      setIsSearching(true)
      try {
        const results = await searchProducts(products, searchQuery, selectedCategory)
        setFilteredProducts(results)
      } catch (error) {
        console.error('Search error:', error)
        toast.error('Search failed. Please try again.')
      } finally {
        setIsSearching(false)
      }
    }

    performSearch()
  }, [searchQuery, selectedCategory, products])

  const addToCart = (product: Product, quantity: number = 1) => {
    const productId = product._id || ""
    setCart(prev => {
      const newCart = new Map(prev)
      const existing = newCart.get(productId)
      if (existing) {
        newCart.set(productId, { product, quantity: existing.quantity + quantity })
      } else {
        newCart.set(productId, { product, quantity })
      }
      return newCart
    })
    toast.success(`${quantity}x ${product.title || "Product"} added to cart`)
  }

  const toggleFavorite = (productId: string) => {
    const newFavorites = new Set(favorites)
    if (newFavorites.has(productId)) {
      newFavorites.delete(productId)
      toast.info("Removed from favorites")
    } else {
      newFavorites.add(productId)
      toast.success("Added to favorites")
    }
    setFavorites(newFavorites)
  }

  const removeFromCart = (productId: string) => {
    setCart(prev => {
      const newCart = new Map(prev)
      newCart.delete(productId)
      return newCart
    })
  }

  const updateCartQuantity = (productId: string, delta: number) => {
    setCart(prev => {
      const newCart = new Map(prev)
      const existing = newCart.get(productId)
      if (existing) {
        const newQuantity = Math.max(1, existing.quantity + delta)
        newCart.set(productId, { product: existing.product, quantity: newQuantity })
      }
      return newCart
    })
  }

  // Use unified cart calculation operation
  const { total: cartTotal, quantity: cartTotalQuantity } = calculateCartTotal(cart)
  const cartItems = Array.from(cart.values())

  const handlePlaceOrder = async () => {
    if (session.authenticated && session.userId) {
      const purchaseItems = cartItems
        .map(item => ({
          product_id: item.product.pid || item.product._id || '',
          quantity: item.quantity,
        }))
        .filter(item => item.product_id !== '')

      if (purchaseItems.length > 0) {
        const response = await fetch('/api/purchases', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ items: purchaseItems }),
        })
        if (!response.ok) {
          const err = await response.json()
          toast.error(`Failed to record purchase: ${err.error || response.statusText}`)
          return
        }
      }
    }
    setCart(new Map())
    toast.success("Order placed successfully!")
    navigateToPage("main")
  }

  const currentProduct = currentPage === "product"
    ? products.find((p: Product) => {
        const hash = getProductIdFromHash()
        return p._id === hash || p.pid === hash
      })
    : null

  const handleProductClick = (product: Product) => {
    navigateToPage("product", product._id || "")
  }

  if (!isPanelOpen) {
    return null
  }

  if (isMobile) {
    return (
      <TooltipProvider>
        <div className="fixed inset-0 z-50 flex h-full w-full bg-background">
          <div className="flex flex-col h-full w-full">
            <div className="flex items-center gap-4 p-4 border-b border-border/25">
              <div className="flex items-center gap-2">
                {currentPage !== "main" && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => navigateToPage("main")}
                    className="h-8 w-8"
                  >
                    <ArrowLeft className="h-4 w-4" />
                  </Button>
                )}
                <h2 className="text-lg font-semibold">Store</h2>
              </div>
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search products..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 rounded-xl border-none"
                />
              </div>
              <div className="flex items-center gap-2">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => navigateToPage("cart")}
                      className="h-8 w-8 relative"
                    >
                      <ShoppingCart className="h-4 w-4" />
                      {cart.size > 0 && (
                        <Badge className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs">
                          {cart.size}
                        </Badge>
                      )}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>View Cart</TooltipContent>
                </Tooltip>
                {session.authenticated && (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => navigateToPage("purchases")}
                        className="h-8 w-8"
                      >
                        <Package className="h-4 w-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>My Purchases</TooltipContent>
                  </Tooltip>
                )}
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setPanelOpen(false)}
                  className="h-8 w-8"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto">
              {currentPage === "main" && (
                <StoreContent
                  selectedCategory={selectedCategory}
                  setSelectedCategory={setSelectedCategory}
                  categories={categories}
                  filteredProducts={filteredProducts}
                  addToCart={addToCart}
                  toggleFavorite={toggleFavorite}
                  favorites={favorites}
                  isLoading={productsLoading || isSearching}
                  onProductClick={handleProductClick}
                />
              )}
              {currentPage === "product" && currentProduct && (
                <ProductPage
                  product={currentProduct}
                  isFavorite={favorites.has(currentProduct._id || "")}
                  onToggleFavorite={() => toggleFavorite(currentProduct._id || "")}
                  onAddToCart={addToCart}
                  onProductClick={handleProductClick}
                />
              )}
              {currentPage === "cart" && (
                <CartPage
                  cart={cartItems}
                  removeFromCart={removeFromCart}
                  updateCartQuantity={updateCartQuantity}
                  cartTotal={cartTotal}
                  cartTotalQuantity={cartTotalQuantity}
                />
              )}
              {currentPage === "checkout" && (
                <CheckoutPage
                  cart={cartItems}
                  cartTotal={cartTotal}
                  cartTotalQuantity={cartTotalQuantity}
                  onPlaceOrder={handlePlaceOrder}
                  onBackToCart={() => navigateToPage("cart")}
                />
              )}
              {currentPage === "purchases" && (
                <PurchasesPage onProductClick={handleProductClick} />
              )}
            </div>
          </div>
        </div>
        <Toaster />
      </TooltipProvider>
    )
  }

  return (
    <TooltipProvider>
      <div className="fixed right-0 top-0 bottom-0 z-10 flex h-full w-[65vw]">
        <ResizablePanelGroup orientation="horizontal" className="h-full w-full">
          <ResizablePanel defaultSize={100} minSize={80} maxSize={100}>
            <div className="h-full w-full bg-background flex flex-col">
              <div className="flex items-center gap-4 p-4 border-b border-border/25">
                <div className="flex items-center gap-2">
                  {currentPage !== "main" && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => navigateToPage("main")}
                      className="h-8 w-8"
                    >
                      <ArrowLeft className="h-4 w-4" />
                    </Button>
                  )}
                  <h2 className="text-lg font-semibold">Store</h2>
                </div>
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search products..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10 rounded-xl border-none"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => navigateToPage("cart")}
                        className="h-8 w-8 relative"
                      >
                        <ShoppingCart className="h-4 w-4" />
                        {cart.size > 0 && (
                          <Badge className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs">
                            {cart.size}
                          </Badge>
                        )}
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>View Cart</TooltipContent>
                  </Tooltip>
                  {session.authenticated && (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => navigateToPage("purchases")}
                          className="h-8 w-8"
                        >
                          <Package className="h-4 w-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>My Purchases</TooltipContent>
                    </Tooltip>
                  )}
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setPanelOpen(false)}
                    className="h-8 w-8"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              <div className="flex-1 overflow-y-auto">
                {currentPage === "main" && (
                  <StoreContent
                    selectedCategory={selectedCategory}
                    setSelectedCategory={setSelectedCategory}
                    categories={categories}
                    filteredProducts={filteredProducts}
                    addToCart={addToCart}
                    toggleFavorite={toggleFavorite}
                    favorites={favorites}
                    isLoading={productsLoading || isSearching}
                    onProductClick={handleProductClick}
                  />
                )}
                {currentPage === "product" && currentProduct && (
                  <ProductPage
                    product={currentProduct}
                    isFavorite={favorites.has(currentProduct._id || "")}
                    onToggleFavorite={() => toggleFavorite(currentProduct._id || "")}
                    onAddToCart={addToCart}
                    onProductClick={handleProductClick}
                  />
                )}
                {currentPage === "cart" && (
                  <CartPage
                    cart={cartItems}
                    removeFromCart={removeFromCart}
                    updateCartQuantity={updateCartQuantity}
                    cartTotal={cartTotal}
                    cartTotalQuantity={cartTotalQuantity}
                  />
                )}
                {currentPage === "checkout" && (
                  <CheckoutPage
                    cart={cartItems}
                    cartTotal={cartTotal}
                    cartTotalQuantity={cartTotalQuantity}
                    onPlaceOrder={handlePlaceOrder}
                    onBackToCart={() => navigateToPage("cart")}
                  />
                )}
                {currentPage === "purchases" && (
                  <PurchasesPage onProductClick={handleProductClick} />
                )}
              </div>
            </div>
          </ResizablePanel>
        </ResizablePanelGroup>
      </div>
      <Toaster />
    </TooltipProvider>
  )
}
