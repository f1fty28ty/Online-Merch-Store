-- ============================================
-- Minimal OMS Schema with FIFO Customer Cycling
-- Optimized for client-side cart management
-- Only persists to DB on order confirmation
-- All sales final - no refunds
-- ============================================

-- Categories
CREATE TABLE Categories (
    categoryId UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Customers with FIFO cycling
CREATE TABLE Customers (
    customerId UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customerName VARCHAR(255),
    email VARCHAR(255) UNIQUE NOT NULL,
    phoneNum VARCHAR(20),
    shippingAddress TEXT,
    billingAddress TEXT,
    customerPasswd TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    last_login TIMESTAMP,
    deleted_at TIMESTAMP,
    -- FIFO cycling fields
    cycle_position INT, -- 1-10 position in queue
    is_active BOOLEAN DEFAULT TRUE
);

CREATE INDEX idx_customers_cycle ON Customers(cycle_position, is_active) WHERE deleted_at IS NULL;

-- Products
CREATE TABLE Products (
    productId UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    price DECIMAL(10,2) NOT NULL,
    stockQuantity INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    deleted_at TIMESTAMP
);

-- Product-Category junction (many-to-many)
CREATE TABLE ProductCategories (
    productId UUID NOT NULL,
    categoryId UUID NOT NULL,
    PRIMARY KEY (productId, categoryId),
    FOREIGN KEY (productId) REFERENCES Products(productId) ON DELETE CASCADE,
    FOREIGN KEY (categoryId) REFERENCES Categories(categoryId) ON DELETE CASCADE
);

-- Product Images
CREATE TABLE Images (
    imageId UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    productId UUID NOT NULL,
    url TEXT NOT NULL,
    displayOrder INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW(),
    FOREIGN KEY (productId) REFERENCES Products(productId) ON DELETE CASCADE
);

-- Payment Methods (optional - can also pass card info directly at checkout)
CREATE TABLE PaymentMethods (
    paymentMethodId UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customerId UUID NOT NULL,
    cardholderName VARCHAR(255),
    last4Digits VARCHAR(4), -- Only store last 4 digits
    cardBrand VARCHAR(50), -- 'visa', 'mastercard', etc.
    expirationDate DATE,
    created_at TIMESTAMP DEFAULT NOW(),
    FOREIGN KEY (customerId) REFERENCES Customers(customerId)
);

-- Order Status Enum
CREATE TYPE order_status AS ENUM ('pending', 'paid', 'processing', 'shipped', 'delivered', 'cancelled');

-- Orders
CREATE TABLE Orders (
    orderId UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customerId UUID NOT NULL,
    orderTimestamp TIMESTAMP DEFAULT NOW(),
    status order_status DEFAULT 'pending',
    subtotal DECIMAL(10,2) NOT NULL,
    shippingCost DECIMAL(10,2) DEFAULT 0,
    totalAmount DECIMAL(10,2) NOT NULL,
    shippingAddress TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    FOREIGN KEY (customerId) REFERENCES Customers(customerId)
);

-- Order Items (cart items saved on order confirmation)
CREATE TABLE OrderItems (
    orderItemId UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    orderId UUID NOT NULL,
    productId UUID NOT NULL,
    productName VARCHAR(255), -- Store name in case product deleted later
    quantity INT NOT NULL CHECK (quantity > 0),
    unitPrice DECIMAL(10,2) NOT NULL,
    subtotal DECIMAL(10,2) NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    FOREIGN KEY (orderId) REFERENCES Orders(orderId) ON DELETE CASCADE,
    FOREIGN KEY (productId) REFERENCES Products(productId)
);

-- ============================================
-- FIFO Customer Cycling Functions
-- ============================================

CREATE OR REPLACE FUNCTION add_customer_with_cycling(
  p_email varchar,
  p_customerpasswd text,
  p_customername varchar DEFAULT NULL,
  p_phonenum varchar DEFAULT NULL,
  p_shippingaddress text DEFAULT NULL,
  p_billingaddress text DEFAULT NULL
) RETURNS uuid AS $$
DECLARE
  new_customer_id uuid;
  current_count int;
  oldest_customer_id uuid;
BEGIN
  -- Count active customers
  SELECT COUNT(*) INTO current_count 
  FROM customers 
  WHERE is_active = TRUE AND deleted_at IS NULL;
  
  -- If we have 10 customers, cycle out the oldest
  IF current_count >= 10 THEN
    -- Find oldest customer by cycle_position = 1
    SELECT customerid INTO oldest_customer_id
    FROM customers
    WHERE is_active = TRUE AND deleted_at IS NULL
    ORDER BY cycle_position ASC
    LIMIT 1;
    
    -- Soft delete oldest customer
    UPDATE customers SET is_active = FALSE, deleted_at = NOW() 
    WHERE customerid = oldest_customer_id;
    
    -- Shift all positions down
    UPDATE customers 
    SET cycle_position = cycle_position - 1
    WHERE is_active = TRUE AND deleted_at IS NULL;
  END IF;
  
  -- Insert new customer at end of queue
  INSERT INTO customers (
    email, customerpasswd, customername, phonenum, 
    shippingaddress, billingaddress, cycle_position, is_active
  )
  VALUES (
    p_email, p_customerpasswd, p_customername, p_phonenum,
    p_shippingaddress, p_billingaddress,
    LEAST(current_count + 1, 10), TRUE
  )
  RETURNING customerid INTO new_customer_id;
  
  RETURN new_customer_id;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION get_active_customers()
RETURNS TABLE (
  customerid uuid,
  customername varchar,
  email varchar,
  cycle_position int
) AS $$
BEGIN
  RETURN QUERY
  SELECT c.customerid, c.customername, c.email, c.cycle_position
  FROM customers c
  WHERE c.is_active = TRUE AND c.deleted_at IS NULL
  ORDER BY c.cycle_position ASC;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- Order Creation (Cart -> Order)
-- ============================================

-- Create order with items from client-side cart
-- Pass cart items as JSON: [{productId, quantity, unitPrice}]
CREATE OR REPLACE FUNCTION create_order(
  p_customerid uuid,
  p_items jsonb, -- [{productId, quantity, unitPrice}]
  p_shipping_address text,
  p_shipping_cost numeric DEFAULT 0
) RETURNS uuid AS $$
DECLARE
  new_orderid uuid;
  subtotal_amt numeric := 0;
  total_amt numeric;
  item jsonb;
  prod_name varchar;
BEGIN
  -- Calculate subtotal from items
  FOR item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    subtotal_amt := subtotal_amt + ((item->>'quantity')::int * (item->>'unitPrice')::numeric);
  END LOOP;
  
  -- Calculate total
  total_amt := subtotal_amt + p_shipping_cost;
  
  -- Create order
  INSERT INTO orders (
    customerid, subtotal, shippingcost, totalamount, 
    shippingaddress, status
  )
  VALUES (
    p_customerid, subtotal_amt, p_shipping_cost, total_amt,
    p_shipping_address, 'pending'
  )
  RETURNING orderid INTO new_orderid;
  
  -- Insert order items
  FOR item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    -- Get product name
    SELECT name INTO prod_name 
    FROM products 
    WHERE productid = (item->>'productId')::uuid;
    
    -- Insert order item
    INSERT INTO orderitems (
      orderid, productid, productname, quantity, unitprice, subtotal
    )
    VALUES (
      new_orderid,
      (item->>'productId')::uuid,
      prod_name,
      (item->>'quantity')::int,
      (item->>'unitPrice')::numeric,
      ((item->>'quantity')::int * (item->>'unitPrice')::numeric)
    );
    
    -- Update product stock
    UPDATE products 
    SET stockquantity = stockquantity - (item->>'quantity')::int
    WHERE productid = (item->>'productId')::uuid;
  END LOOP;
  
  RETURN new_orderid;
END;
$$ LANGUAGE plpgsql;

-- Update order status
CREATE OR REPLACE FUNCTION update_order_status(
  p_orderid uuid,
  p_status order_status
) RETURNS void AS $$
BEGIN
  UPDATE orders 
  SET status = p_status, updated_at = NOW()
  WHERE orderid = p_orderid;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- Receipt Page Queries
-- ============================================

-- Get complete order details for receipt
CREATE OR REPLACE FUNCTION get_order_receipt(p_orderid uuid)
RETURNS TABLE (
  orderid uuid,
  ordertimestamp timestamp,
  status order_status,
  customername varchar,
  customeremail varchar,
  shippingaddress text,
  subtotal numeric,
  shippingcost numeric,
  totalamount numeric
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    o.orderid,
    o.ordertimestamp,
    o.status,
    c.customername,
    c.email,
    o.shippingaddress,
    o.subtotal,
    o.shippingcost,
    o.totalamount
  FROM orders o
  JOIN customers c ON o.customerid = c.customerid
  WHERE o.orderid = p_orderid;
END;
$$ LANGUAGE plpgsql;

-- Get order line items for receipt
CREATE OR REPLACE FUNCTION get_order_items(p_orderid uuid)
RETURNS TABLE (
  productname varchar,
  quantity int,
  unitprice numeric,
  subtotal numeric
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    oi.productname,
    oi.quantity,
    oi.unitprice,
    oi.subtotal
  FROM orderitems oi
  WHERE oi.orderid = p_orderid;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- Product Management
-- ============================================

-- Get all products with categories and images
CREATE OR REPLACE FUNCTION get_products()
RETURNS TABLE (
  productid uuid,
  name varchar,
  description text,
  price numeric,
  stockquantity int,
  categories text[], -- array of category names
  images text[] -- array of image URLs
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.productid,
    p.name,
    p.description,
    p.price,
    p.stockquantity,
    ARRAY_AGG(DISTINCT c.name) FILTER (WHERE c.name IS NOT NULL) as categories,
    ARRAY_AGG(DISTINCT i.url ORDER BY i.displayorder) FILTER (WHERE i.url IS NOT NULL) as images
  FROM products p
  LEFT JOIN productcategories pc ON p.productid = pc.productid
  LEFT JOIN categories c ON pc.categoryid = c.categoryid
  LEFT JOIN images i ON p.productid = i.productid
  WHERE p.deleted_at IS NULL
  GROUP BY p.productid;
END;
$$ LANGUAGE plpgsql;