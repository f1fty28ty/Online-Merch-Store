// lib/supabaseClient.js
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

export const supabase = createClient(supabaseUrl, supabaseAnonKey)



// Usage
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
  5. Inserting a New Row
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
  6. Updating Row Data
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
  7. Deleting a Row
  ----------------------
  To delete a wishlist by wishlistid:
*/
/*
const { data: deletedWishlist, error } = await supabase
  .from('wishlist')
  .delete()
  .eq('wishlistid', 'uuid...');

*/