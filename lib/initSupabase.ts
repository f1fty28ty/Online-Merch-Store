// lib/initSupabase.ts
import { createClient, type SupabaseClient } from '@supabase/supabase-js'

// Vite uses import.meta.env, not process.env
// And Vite requires VITE_ prefix, not NEXT_PUBLIC_
// Support both VITE_ and NEXT_PUBLIC_ prefixes for compatibility
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || import.meta.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || import.meta.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl) {
  throw new Error('Missing env.VITE_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_URL')
}

if (!supabaseAnonKey) {
  throw new Error('Missing env.VITE_SUPABASE_ANON_KEY or NEXT_PUBLIC_SUPABASE_ANON_KEY')
}

export const supabase: SupabaseClient = createClient(supabaseUrl, supabaseAnonKey)

// Usage Examples
// Example usage of Supabase client to access your tables.

/*
  1. Fetch All Rows From a Table
  --------------------------------
  Use .from('tablename').select() to get all data from a table.
  This example fetches all categories:
*/
/*
const { data: categories, error } = await supabase
  .from('categories')
  .select('*');
*/

/*
  2. Filter Rows With a Condition
  --------------------------------
  To fetch products belonging to a specific category:
*/
/*
const categoryId = 'uuid...'; // Replace with your categoryid.
const { data: products, error } = await supabase
  .from('products')
  .select('*')
  .eq('categoryid', categoryId);
*/

/*
  3. Fetch a Specific Row by Primary Key
  --------------------------------------
  To fetch a customer by customerid:
*/
/*
const customerId = 'uuid...'; // Replace with your customerid.
const { data: customer, error } = await supabase
  .from('customers')
  .select('*')
  .eq('customerid', customerId)
  .single();
*/

/*
  4. Joining Related Tables
  -------------------------
  Supabase can fetch related tables with .select('*,relTable(*)').
  For example, pulling products and their images:
*/
/*
const { data: productsWithImages, error } = await supabase
  .from('products')
  .select(`
    *,
    images(*)
  `);
*/

/*
  5. Calling Postgres Functions
  ------------------------------
  To call the get_products_with_variants() function:
*/
/*
const { data: products, error } = await supabase
  .rpc('get_products_with_variants');
*/

/*
  6. Inserting a New Row
  ----------------------
  To insert a new order:
*/
/*
const newOrder = {
  customerid: 'uuid...',
  ordertimestamp: new Date().toISOString(),
  // other fields...
};
const { data: insertedOrder, error } = await supabase
  .from('orders')
  .insert([newOrder]);
*/

/*
  7. Updating Row Data
  ----------------------
  To update a customer's last_login timestamp:
*/
/*
const { data: updatedCustomer, error } = await supabase
  .from('customers')
  .update({ last_login: new Date().toISOString() })
  .eq('customerid', customerId);
*/

/*
  8. Deleting a Row
  ----------------------
  To delete a wishlist by wishlistid:
*/
/*
const { data: deletedWishlist, error } = await supabase
  .from('wishlist')
  .delete()
  .eq('wishlistid', 'uuid...');
*/

