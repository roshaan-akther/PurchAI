export interface Product {
  _id?: string
  actual_price?: string
  average_rating?: string
  brand?: string
  category?: string
  crawled_at?: string
  description?: string
  discount?: string
  images?: string[]
  out_of_stock?: boolean
  pid?: string
  product_details?: Record<string, string>[]
  seller?: string
  selling_price?: string
  sub_category?: string
  title?: string
  url?: string
}
