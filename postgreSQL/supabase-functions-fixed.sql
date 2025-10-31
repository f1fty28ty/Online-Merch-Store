-- ============================================
-- Supabase RPC Functions for Online Merch Store
-- Fixed Parameter Ordering - All Required Params First
-- Generated on 2025-10-27
-- ============================================


-- =========================
-- 1. User and Customer Management
-- =========================


-- Create a new customer
CREATE OR REPLACE FUNCTION create_customer(
  p_email varchar,
  p_customerpasswd text,
  p_customerfname varchar DEFAULT NULL,
  p_customerlname varchar DEFAULT NULL,
  p_phonenum varchar DEFAULT NULL
) RETURNS uuid AS $$
DECLARE
  new_customer_id uuid;
BEGIN
  -- Insert new customer, ensure email is unique
  INSERT INTO public.customers (email, customerpasswd, customerfname, customerlname, phonenum)
  VALUES (p_email, p_customerpasswd, p_customerfname, p_customerlname, p_phonenum)
  RETURNING customerid INTO new_customer_id;

  RETURN new_customer_id;
EXCEPTION WHEN unique_violation THEN
  RAISE EXCEPTION 'Email already exists';
END;
$$ LANGUAGE plpgsql;


-- Update customer profile info
CREATE OR REPLACE FUNCTION update_customer_profile(
  p_customerid uuid,
  p_email varchar DEFAULT NULL,
  p_customerfname varchar DEFAULT NULL,
  p_customerlname varchar DEFAULT NULL,
  p_phonenum varchar DEFAULT NULL
) RETURNS void AS $$
BEGIN
  UPDATE public.customers
  SET
    email = COALESCE(p_email, email),
    customerfname = COALESCE(p_customerfname, customerfname),
    customerlname = COALESCE(p_customerlname, customerlname),
    phonenum = COALESCE(p_phonenum, phonenum),
    updated_at = NOW()
  WHERE customerid = p_customerid;
END;
$$ LANGUAGE plpgsql;


-- Update last login timestamp
CREATE OR REPLACE FUNCTION update_last_login(p_customerid uuid) RETURNS void AS $$
BEGIN
  UPDATE public.customers SET last_login = NOW() WHERE customerid = p_customerid;
END;
$$ LANGUAGE plpgsql;


-- Soft delete customer (mark deleted_at)
CREATE OR REPLACE FUNCTION soft_delete_customer(p_customerid uuid) RETURNS void AS $$
BEGIN
  UPDATE public.customers SET deleted_at = NOW() WHERE customerid = p_customerid;
END;
$$ LANGUAGE plpgsql;


-- =========================
-- 2. Product and Catalog Management
-- =========================


-- Create a new product with categories
-- FIXED: p_category_ids moved before optional params
CREATE OR REPLACE FUNCTION create_product_with_categories(
  p_name varchar,
  p_category_ids uuid[], -- array of category UUIDs (REQUIRED - moved up)
  p_description text DEFAULT NULL,
  p_price numeric DEFAULT 0,
  p_stockquantity int DEFAULT 0
) RETURNS uuid AS $$
DECLARE
  new_product_id uuid;
BEGIN
  INSERT INTO public.products (name, description, price, stockquantity, created_at, updated_at)
  VALUES (p_name, p_description, p_price, p_stockquantity, NOW(), NOW())
  RETURNING productid INTO new_product_id;
  
  -- Insert into productcategories
  IF array_length(p_category_ids,1) > 0 THEN
    INSERT INTO public.productcategories (productid, categoryid)
    SELECT new_product_id, unnest(p_category_ids);
  END IF;

  RETURN new_product_id;
END;
$$ LANGUAGE plpgsql;


-- Update product details
CREATE OR REPLACE FUNCTION update_product(
  p_productid uuid,
  p_name varchar DEFAULT NULL,
  p_description text DEFAULT NULL,
  p_price numeric DEFAULT NULL,
  p_stockquantity int DEFAULT NULL,
  p_categoryid uuid DEFAULT NULL
) RETURNS void AS $$
BEGIN
  UPDATE public.products
  SET
    name = COALESCE(p_name, name),
    description = COALESCE(p_description, description),
    price = COALESCE(p_price, price),
    stockquantity = COALESCE(p_stockquantity, stockquantity),
    updated_at = NOW()
  WHERE productid = p_productid;

  -- Update category if provided
  IF p_categoryid IS NOT NULL THEN
    UPDATE public.products SET categoryid = p_categoryid WHERE productid = p_productid;
  END IF;
END;
$$ LANGUAGE plpgsql;


-- Add product attribute
CREATE OR REPLACE FUNCTION add_product_attribute(
  p_name varchar
) RETURNS uuid AS $$
DECLARE
  new_attribute_id uuid;
BEGIN
  INSERT INTO public.productattributes (name)
  VALUES (p_name)
  RETURNING attributeid INTO new_attribute_id;
  RETURN new_attribute_id;
END;
$$ LANGUAGE plpgsql;


-- Add product SKU with attributes
-- FIXED: p_value moved before optional params
CREATE OR REPLACE FUNCTION add_product_sku(
  p_productid uuid,
  p_attributeid uuid,
  p_value varchar, -- REQUIRED - moved up
  p_price numeric DEFAULT NULL,
  p_stockquantity int DEFAULT NULL
) RETURNS uuid AS $$
DECLARE
  new_skuid uuid;
BEGIN
  INSERT INTO public.productskus (productid, attributeid, value, price, stockquantity, created_at)
  VALUES (p_productid, p_attributeid, p_value, p_price, p_stockquantity, NOW())
  RETURNING skuid INTO new_skuid;
  RETURN new_skuid;
END;
$$ LANGUAGE plpgsql;


-- Soft delete product
CREATE OR REPLACE FUNCTION soft_delete_product(p_productid uuid) RETURNS void AS $$
BEGIN
  UPDATE public.products SET deleted_at = NOW() WHERE productid = p_productid;
END;
$$ LANGUAGE plpgsql;


-- =========================
-- 3. Add Product Review
-- =========================


CREATE OR REPLACE FUNCTION add_product_review(
  p_productid uuid,
  p_customerid uuid,
  p_rating int,
  p_comment text DEFAULT NULL
) RETURNS void AS $$
BEGIN
  INSERT INTO public.reviews (productid, customerid, rating, comment, reviewtimestamp, created_at, updated_at)
  VALUES (p_productid, p_customerid, p_rating, p_comment, NOW(), NOW(), NOW());
END;
$$ LANGUAGE plpgsql;


-- =========================
-- 4. Orders and Transactions
-- =========================


-- Create an order with order items atomically
CREATE OR REPLACE FUNCTION create_order_with_items(
  p_customerid uuid,
  p_paymentmethodid uuid,
  p_items jsonb -- array of objects: [{productid, quantity, subtotal}]
) RETURNS uuid AS $$
DECLARE
  new_orderid uuid;
BEGIN
  -- Insert into orders
  INSERT INTO public.orders (customerid, ordertimestamp, status, paymentmethodid, created_at, updated_at)
  VALUES (p_customerid, NOW(), 'pending', p_paymentmethodid, NOW(), NOW())
  RETURNING orderid INTO new_orderid;
  
  -- Insert order items
  INSERT INTO public.orderitems (orderid, productid, quantity, subtotal, created_at, updated_at)
  SELECT new_orderid,
         (item->>'productid')::uuid,
         (item->>'quantity')::int,
         (item->>'subtotal')::numeric,
         NOW(),
         NOW()
  FROM jsonb_array_elements(p_items) AS items(item);
  
  RETURN new_orderid;
END;
$$ LANGUAGE plpgsql;


-- Update order status + add tracking info
CREATE OR REPLACE FUNCTION update_order_status_with_tracking(
  p_orderid uuid,
  p_status order_status,
  p_trackingnumber varchar,
  p_carrier varchar,
  p_status_desc varchar
) RETURNS void AS $$
BEGIN
  UPDATE public.orders
  SET status = p_status,
      updated_at = NOW()
  WHERE orderid = p_orderid;

  INSERT INTO public.tracking (orderid, trackingnumber, carrier, status, updated_at)
  VALUES (p_orderid, p_trackingnumber, p_carrier, p_status_desc, NOW());
END;
$$ LANGUAGE plpgsql;


-- Add refund entry
CREATE OR REPLACE FUNCTION add_refund(
  p_transactionid uuid,
  p_amount numeric,
  p_status varchar DEFAULT 'requested'
) RETURNS uuid AS $$
DECLARE
  new_refund_id uuid;
BEGIN
  INSERT INTO public.refunds (transactionid, amount, status, requested_at)
  VALUES (p_transactionid, p_amount, p_status, NOW())
  RETURNING refundid INTO new_refund_id;
  RETURN new_refund_id;
END;
$$ LANGUAGE plpgsql;


-- =========================
-- 5. Reviews & Feedback
-- =========================


-- Update a review (if editing allowed)
CREATE OR REPLACE FUNCTION update_review(
  p_reviewid uuid,
  p_rating int DEFAULT NULL,
  p_comment text DEFAULT NULL
) RETURNS void AS $$
BEGIN
  UPDATE public.reviews
  SET
    rating = COALESCE(p_rating, rating),
    comment = COALESCE(p_comment, comment),
    updated_at = NOW()
  WHERE reviewid = p_reviewid;
END;
$$ LANGUAGE plpgsql;


-- Soft delete review
CREATE OR REPLACE FUNCTION soft_delete_review(p_reviewid uuid) RETURNS void AS $$
BEGIN
  UPDATE public.reviews SET deleted_at = NOW() WHERE reviewid = p_reviewid;
END;
$$ LANGUAGE plpgsql;


-- =========================
-- 6. Wishlist & Shopping Cart
-- =========================


-- Add item to wishlist
CREATE OR REPLACE FUNCTION add_to_wishlist(p_customerid uuid, p_productid uuid) RETURNS void AS $$
BEGIN
  INSERT INTO public.wishlist (customerid, productid, created_at)
  VALUES (p_customerid, p_productid, NOW())
  ON CONFLICT (customerid, productid) DO NOTHING;
END;
$$ LANGUAGE plpgsql;


-- Remove from wishlist
CREATE OR REPLACE FUNCTION remove_from_wishlist(p_customerid uuid, p_productid uuid) RETURNS void AS $$
BEGIN
  DELETE FROM public.wishlist WHERE customerid = p_customerid AND productid = p_productid;
END;
$$ LANGUAGE plpgsql;


-- Add item to shopping cart
CREATE OR REPLACE FUNCTION add_to_cart(
  p_customerid uuid,
  p_productid uuid,
  p_quantity int
) RETURNS void AS $$
BEGIN
  INSERT INTO public.shoppingcart (customerid, productid, quantity, created_at, updated_at)
  VALUES (p_customerid, p_productid, p_quantity, NOW(), NOW())
  ON CONFLICT (customerid, productid) DO UPDATE
  SET quantity = shoppingcart.quantity + EXCLUDED.quantity,
      updated_at = NOW();
END;
$$ LANGUAGE plpgsql;


-- Update cart item quantity
CREATE OR REPLACE FUNCTION update_cart_quantity(
  p_customerid uuid,
  p_productid uuid,
  p_quantity int
) RETURNS void AS $$
BEGIN
  UPDATE public.shoppingcart
  SET quantity = p_quantity,
      updated_at = NOW()
  WHERE customerid = p_customerid AND productid = p_productid;
END;
$$ LANGUAGE plpgsql;


-- Remove item from cart
CREATE OR REPLACE FUNCTION remove_from_cart(p_customerid uuid, p_productid uuid) RETURNS void AS $$
BEGIN
  DELETE FROM public.shoppingcart WHERE customerid = p_customerid AND productid = p_productid;
END;
$$ LANGUAGE plpgsql;


-- =========================
-- 7. Notifications & Messaging
-- =========================


-- Add notification
CREATE OR REPLACE FUNCTION add_notification(
  p_customerid uuid,
  p_type varchar,
  p_message text
) RETURNS uuid AS $$
DECLARE
  new_notification_id uuid;
BEGIN
  INSERT INTO public.notifications (customerid, type, message, isread, created_at)
  VALUES (p_customerid, p_type, p_message, false, NOW())
  RETURNING notificationid INTO new_notification_id;
  RETURN new_notification_id;
END;
$$ LANGUAGE plpgsql;


-- Mark notification as read
CREATE OR REPLACE FUNCTION mark_notification_read(p_notificationid uuid) RETURNS void AS $$
BEGIN
  UPDATE public.notifications SET isread = true WHERE notificationid = p_notificationid;
END;
$$ LANGUAGE plpgsql;


-- Send message between customers
-- FIXED: p_content moved before optional p_orderid
CREATE OR REPLACE FUNCTION send_message(
  p_senderid uuid,
  p_receiverid uuid,
  p_content text, -- REQUIRED - moved up
  p_orderid uuid DEFAULT NULL
) RETURNS uuid AS $$
DECLARE
  new_message_id uuid;
BEGIN
  INSERT INTO public.messages (senderid, receiverid, orderid, content, sent_at, read)
  VALUES (p_senderid, p_receiverid, p_orderid, p_content, NOW(), false)
  RETURNING messageid INTO new_message_id;
  RETURN new_message_id;
END;
$$ LANGUAGE plpgsql;


-- =========================
-- 8. Analytics & Logging
-- =========================


-- Log product view
CREATE OR REPLACE FUNCTION log_product_view(
  p_customerid uuid,
  p_productid uuid
) RETURNS void AS $$
BEGIN
  INSERT INTO public.productviews (customerid, productid, viewtimestamp)
  VALUES (p_customerid, p_productid, NOW());
END;
$$ LANGUAGE plpgsql;


-- Record search query
CREATE OR REPLACE FUNCTION record_search_history(
  p_customerid uuid,
  p_query text
) RETURNS void AS $$
BEGIN
  INSERT INTO public.searchhistory (customerid, query, searched_at)
  VALUES (p_customerid, p_query, NOW());
END;
$$ LANGUAGE plpgsql;


-- =========================
-- 9. Payment Methods
-- =========================


-- Add a payment method
CREATE OR REPLACE FUNCTION add_payment_method(
  p_customerid uuid,
  p_cardnumber varchar,
  p_expirationtime time,
  p_cvv varchar
) RETURNS uuid AS $$
DECLARE
  new_paymentid uuid;
BEGIN
  INSERT INTO public.paymentmethods (customerid, cardnumber, expirationtime, cvv, created_at)
  VALUES (p_customerid, p_cardnumber, p_expirationtime, p_cvv, NOW())
  RETURNING paymentmethodid INTO new_paymentid;
  RETURN new_paymentid;
END;
$$ LANGUAGE plpgsql;


-- Update payment method
CREATE OR REPLACE FUNCTION update_payment_method(
  p_paymentmethodid uuid,
  p_cardnumber varchar DEFAULT NULL,
  p_expirationtime time DEFAULT NULL,
  p_cvv varchar DEFAULT NULL
) RETURNS void AS $$
BEGIN
  UPDATE public.paymentmethods
  SET
    cardnumber = COALESCE(p_cardnumber, cardnumber),
    expirationtime = COALESCE(p_expirationtime, expirationtime),
    cvv = COALESCE(p_cvv, cvv),
    updated_at = NOW()
  WHERE paymentmethodid = p_paymentmethodid;
END;
$$ LANGUAGE plpgsql;


-- Soft delete payment method
CREATE OR REPLACE FUNCTION soft_delete_payment_method(p_paymentmethodid uuid) RETURNS void AS $$
BEGIN
  UPDATE public.paymentmethods SET deleted_at = NOW() WHERE paymentmethodid = p_paymentmethodid;
END;
$$ LANGUAGE plpgsql;


-- =========================
-- 10. Shipping & Tracking
-- =========================


-- Add shipping method
CREATE OR REPLACE FUNCTION add_shipping_method(
  p_name varchar,
  p_cost numeric,
  p_estimateddays int
) RETURNS uuid AS $$
DECLARE
  new_shippingid uuid;
BEGIN
  INSERT INTO public.shippingmethods (name, cost, estimateddays, created_at)
  VALUES (p_name, p_cost, p_estimateddays, NOW())
  RETURNING shippingmethodid INTO new_shippingid;
  RETURN new_shippingid;
END;
$$ LANGUAGE plpgsql;


-- Update shipping method
CREATE OR REPLACE FUNCTION update_shipping_method(
  p_shippingid uuid,
  p_name varchar DEFAULT NULL,
  p_cost numeric DEFAULT NULL,
  p_estimateddays int DEFAULT NULL
) RETURNS void AS $$
BEGIN
  UPDATE public.shippingmethods
  SET
    name = COALESCE(p_name, name),
    cost = COALESCE(p_cost, cost),
    estimateddays = COALESCE(p_estimateddays, estimateddays)
  WHERE shippingmethodid = p_shippingid;
END;
$$ LANGUAGE plpgsql;


-- Add tracking info
-- FIXED: p_trackingnumber moved before optional params
CREATE OR REPLACE FUNCTION add_tracking(
  p_orderid uuid,
  p_trackingnumber varchar, -- REQUIRED - kept before optionals
  p_carrier varchar DEFAULT NULL,
  p_status varchar DEFAULT NULL
) RETURNS uuid AS $$
DECLARE
  new_trackingid uuid;
BEGIN
  INSERT INTO public.tracking (orderid, trackingnumber, carrier, status, updated_at)
  VALUES (p_orderid, p_trackingnumber, p_carrier, p_status, NOW())
  RETURNING trackingid INTO new_trackingid;
  RETURN new_trackingid;
END;
$$ LANGUAGE plpgsql;


-- =========================
-- End of all functions
-- =========================
