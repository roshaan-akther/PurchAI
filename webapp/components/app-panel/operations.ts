import { Product } from "./types"
import { searchProducts as semanticSearch, SearchResult } from "@/lib/search-api"

/**
 * Search and filter products based on query and category
 * Uses semantic search API when query is provided
 */
export async function searchProducts(
  products: Product[],
  searchQuery: string,
  selectedCategory: string
): Promise<Product[]> {
  if (!searchQuery.trim()) {
    // Return all products if no query, filtered by category
    return selectedCategory === "all" 
      ? products 
      : products.filter(p => p.category === selectedCategory)
  }

  try {
    // Use semantic search API
    const searchResults = await semanticSearch(searchQuery, 20, 0, 20)
    
    // Deduplicate search results by pid before processing
    const seenPids = new Set<string>()
    const uniqueResults = searchResults.results.filter(result => {
      if (seenPids.has(result.pid)) {
        return false
      }
      seenPids.add(result.pid)
      return true
    })
    
    // Map search results to local products using pid (from search API) to _id (from database)
    const productMap = new Map(products.map(p => [p.pid || p._id || "", p]))
    const titleMap = new Map(products.map(p => [p.title || "", p]))
    const matchedProductsSet = new Set<string>()
    const matchedProducts: Product[] = []
    
    for (const result of uniqueResults) {
      // Try to match by pid first
      let product = productMap.get(result.pid)
      // If not found, try to match by title
      if (!product) {
        product = titleMap.get(result.title)
      }
      if (product) {
        // Filter by category if specified
        if (selectedCategory === "all" || product.category === selectedCategory) {
          const productId = product._id || product.pid || ""
          // Only add if not already added (deduplicate)
          if (!matchedProductsSet.has(productId)) {
            matchedProductsSet.add(productId)
            matchedProducts.push(product)
          }
        }
      }
    }
    
    return matchedProducts
  } catch (error) {
    console.error('Semantic search failed:', error)
    throw error
  }
}

/**
 * Get recommended products based on current product
 * This is the recommendation algorithm - replace with advanced recommendation logic here
 */
export function getRecommendedProducts(
  products: Product[],
  currentProduct: Product,
  limit: number = 3
): Product[] {
  if (!currentProduct) return []
  
  // Basic category-based recommendation - replace with advanced algorithm
  return products
    .filter(p => p._id !== currentProduct._id && p.category === currentProduct.category)
    .slice(0, limit)
}

/**
 * Get product by ID
 */
export function getProductById(products: Product[], productId: string): Product | undefined {
  return products.find(p => p._id === productId)
}

/**
 * Get all unique categories from products
 */
export function getCategories(products: Product[]): string[] {
  const categories = new Set(products.map(p => p.category).filter((c): c is string => Boolean(c)))
  return ["all", ...Array.from(categories)]
}

/**
 * Calculate cart total
 */
export function calculateCartTotal(
  cart: Map<string, { product: Product; quantity: number }>
): { total: string; quantity: number } {
  const cartItems = Array.from(cart.values())
  const totalQuantity = cartItems.reduce((sum, item) => sum + item.quantity, 0)
  const total = cartItems.reduce((sum, item) => {
    const price = item.product.selling_price ? parseFloat(item.product.selling_price.replace(/,/g, '')) : 0
    return sum + (price * item.quantity)
  }, 0).toFixed(2)
  
  return { total, quantity: totalQuantity }
}

