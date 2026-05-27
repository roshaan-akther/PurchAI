export type Page = "main" | "product" | "cart" | "checkout" | "purchases"

export function getCurrentPage(): Page {
  const hash = window.location.hash
  if (hash.includes("product")) return "product"
  if (hash.includes("checkout")) return "checkout"
  if (hash.includes("cart")) return "cart"
  if (hash.includes("purchases")) return "purchases"
  return "main"
}

export function navigateToPage(page: Page, productId?: string) {
  const baseUrl = "#store"
  switch (page) {
    case "main":
      window.location.hash = `${baseUrl}?page=main`
      break
    case "product":
      window.location.hash = `${baseUrl}?page=product&id=${productId}`
      break
    case "cart":
      window.location.hash = `${baseUrl}?page=cart`
      break
    case "checkout":
      window.location.hash = `${baseUrl}?page=checkout`
      break
    case "purchases":
      window.location.hash = `${baseUrl}?page=purchases`
      break
  }
}

export function getProductIdFromHash(): string | null {
  const hash = window.location.hash
  const match = hash.match(/id=([^&]+)/)
  return match ? match[1] : null
}
