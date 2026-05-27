import dbConnect from '../lib/db';
import User from '../models/User';
import Product from '../models/Product';
import fs from 'fs';
import path from 'path';

interface SyntheticUser {
  user_id: string;
  primary_category: string;
  primary_sub_category: string;
  preferred_brands: string[];
  price_range_preference: 'low' | 'medium' | 'high';
  brand_loyalty: number;
  category_affinity: number;
  purchase_frequency: 'low' | 'medium' | 'high';
}

interface SyntheticPurchase {
  user_id: string;
  purchases: Array<{
    product_id: string;
    timestamp: string;
    quantity: number;
    event_type: string;
  }>;
}

interface FlipkartProduct {
  _id: string;
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
}

async function importSyntheticUsers() {
  console.log('Importing synthetic users...');
  
  const filePath = path.join(process.cwd(), '../backend/recommendation_system/v2/datasets/synthetic_users.json');
  const fileContent = fs.readFileSync(filePath, 'utf-8');
  const syntheticUsers: SyntheticUser[] = JSON.parse(fileContent);
  
  let imported = 0;
  let skipped = 0;
  
  for (const syntheticUser of syntheticUsers) {
    // Check if user already exists
    const existingUser = await User.findById(syntheticUser.user_id);
    
    if (existingUser) {
      // Update preferences if user exists
      await User.findByIdAndUpdate(syntheticUser.user_id, {
        preferences: {
          primary_category: syntheticUser.primary_category,
          primary_sub_category: syntheticUser.primary_sub_category,
          preferred_brands: syntheticUser.preferred_brands.filter(b => b !== ''),
          price_range_preference: syntheticUser.price_range_preference,
          brand_loyalty: syntheticUser.brand_loyalty,
          category_affinity: syntheticUser.category_affinity,
          purchase_frequency: syntheticUser.purchase_frequency,
        },
      });
      skipped++;
    } else {
      // Create new user with preferences (no auth data yet)
      await User.create({
        _id: syntheticUser.user_id,
        email: `${syntheticUser.user_id}@example.com`, // Placeholder email
        email_verified: false,
        roles: ['user'],
        failed_login_attempts: 0,
        locked_until: null,
        preferences: {
          primary_category: syntheticUser.primary_category,
          primary_sub_category: syntheticUser.primary_sub_category,
          preferred_brands: syntheticUser.preferred_brands.filter(b => b !== ''),
          price_range_preference: syntheticUser.price_range_preference,
          brand_loyalty: syntheticUser.brand_loyalty,
          category_affinity: syntheticUser.category_affinity,
          purchase_frequency: syntheticUser.purchase_frequency,
        },
      });
      imported++;
    }
  }
  
  console.log(`Synthetic users: ${imported} imported, ${skipped} updated`);
}

async function importSyntheticPurchases() {
  console.log('Importing synthetic purchases...');
  
  const filePath = path.join(process.cwd(), '../backend/recommendation_system/v2/datasets/synthetic_purchases.json');
  const fileContent = fs.readFileSync(filePath, 'utf-8');
  const syntheticPurchases: SyntheticPurchase[] = JSON.parse(fileContent);
  
  let updated = 0;
  
  for (const userPurchase of syntheticPurchases) {
    const purchaseHistory = userPurchase.purchases.map(p => ({
      product_id: p.product_id,
      timestamp: new Date(p.timestamp),
      quantity: p.quantity,
      event_type: p.event_type,
    }));
    
    await User.findByIdAndUpdate(userPurchase.user_id, {
      purchase_history: purchaseHistory,
    });
    
    updated++;
  }
  
  console.log(`Purchase history updated for ${updated} users`);
}

async function importProducts() {
  console.log('Importing products...');
  
  const filePath = path.join(process.cwd(), '../backend/recommendation_system/v2/datasets/flipkart_fashion_products_dataset.json');
  const fileContent = fs.readFileSync(filePath, 'utf-8');
  const products: FlipkartProduct[] = JSON.parse(fileContent);
  
  let imported = 0;
  let skipped = 0;
  
  // Process in batches to avoid memory issues
  const batchSize = 100;
  for (let i = 0; i < products.length; i += batchSize) {
    const batch = products.slice(i, i + batchSize);
    
    for (const product of batch) {
      // Parse selling price to number for numeric queries
      const sellingPriceNum = parseFloat(product.selling_price.replace(/,/g, ''));
      
      try {
        await Product.create({
          _id: product.pid,
          actual_price: product.actual_price,
          average_rating: product.average_rating,
          brand: product.brand,
          category: product.category,
          crawled_at: product.crawled_at,
          description: product.description,
          discount: product.discount,
          images: product.images,
          out_of_stock: product.out_of_stock,
          pid: product.pid,
          product_details: product.product_details,
          seller: product.seller,
          selling_price: product.selling_price,
          sub_category: product.sub_category,
          title: product.title,
          url: product.url,
          selling_price_num: isNaN(sellingPriceNum) ? 0 : sellingPriceNum,
        });
        imported++;
      } catch (error: any) {
        if (error.code === 11000) {
          // Duplicate key error - product already exists
          skipped++;
        } else {
          console.error(`Error importing product ${product.pid}:`, error.message);
        }
      }
    }
    
    console.log(`Processed ${Math.min(i + batchSize, products.length)} / ${products.length} products`);
  }
  
  console.log(`Products: ${imported} imported, ${skipped} skipped (duplicates)`);
}

async function main() {
  try {
    await dbConnect();
    console.log('Connected to MongoDB');
    
    // Clear existing data
    console.log('Clearing existing data...');
    await User.deleteMany({});
    await Product.deleteMany({});
    console.log('Data cleared');
    
    // Import data
    await importSyntheticUsers();
    await importSyntheticPurchases();
    await importProducts();
    
    console.log('Migration completed successfully!');
    
    // Print statistics
    const userCount = await User.countDocuments();
    const productCount = await Product.countDocuments();
    console.log(`\nFinal statistics:`);
    console.log(`- Users: ${userCount}`);
    console.log(`- Products: ${productCount}`);
    
    process.exit(0);
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

main();
