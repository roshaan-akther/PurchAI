import mongoose, { Schema, Model } from 'mongoose';

interface IProductDetail {
  [key: string]: string;
}

interface IProduct {
  _id: string; // Using pid as _id
  actual_price: string;
  average_rating: string;
  brand: string;
  category: string;
  crawled_at: string;
  description: string;
  discount: string;
  images: string[];
  out_of_stock: boolean;
  pid: string;
  product_details: Record<string, string>[];
  seller: string;
  selling_price: string;
  sub_category: string;
  title: string;
  url: string;
  selling_price_num?: number; // Computed field for numeric price queries
}

const ProductSchema = new Schema<IProduct>(
  {
    _id: {
      type: String,
      required: true,
      unique: true,
    },
    actual_price: { type: String, required: false, default: '' },
    average_rating: { type: String, required: false, default: '0' },
    brand: { type: String, required: false, default: '' },
    category: { type: String, required: false, default: '' },
    crawled_at: { type: String, required: false, default: '' },
    description: { type: String, required: false, default: '' },
    discount: { type: String, required: false, default: '' },
    images: { type: [String], default: [] },
    out_of_stock: { type: Boolean, required: false, default: false },
    pid: { type: String, required: false, default: '' },
    product_details: Schema.Types.Mixed,
    seller: { type: String, required: false, default: '' },
    selling_price: { type: String, required: false, default: '' },
    sub_category: { type: String, required: false, default: '' },
    title: { type: String, required: false, default: '' },
    url: { type: String, required: false, default: '' },
    selling_price_num: { type: Number },
  },
  {
    timestamps: false,
  }
);

// Indexes for performance
ProductSchema.index({ category: 1 });
ProductSchema.index({ sub_category: 1 });
ProductSchema.index({ brand: 1 });
ProductSchema.index({ title: "text", description: "text" });
ProductSchema.index({ selling_price_num: 1 });
ProductSchema.index({ average_rating: -1 });
ProductSchema.index({ category: 1, brand: 1 });
ProductSchema.index({ category: 1, sub_category: 1 });

// Prevent model recompilation during hot reloads in development
const Product: Model<IProduct> = mongoose.models.Product || mongoose.model<IProduct>('Product', ProductSchema);

export default Product;
