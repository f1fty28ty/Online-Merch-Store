-- Categories
CREATE TABLE Categories (
    categoryId UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Customers with cycling metadata
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
    is_active BOOLEAN DEFAULT TRUE -- currently in rotation
);

-- Add index for cycling queries
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

-- Payment Methods
CREATE TABLE PaymentMethods (
    paymentMethodId UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customerId UUID NOT NULL,
    cardNumber VARCHAR(20), -- Store encrypted/tokenized
    expirationDate DATE,
    cvv VARCHAR(4), -- Never store in production!
    cardholderName VARCHAR(255),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    deleted_at TIMESTAMP,
    FOREIGN KEY (customerId) REFERENCES Customers(customerId)
);

-- Order Status Enum
CREATE TYPE order_status AS ENUM ('pending', 'paid', 'processing', 'shipped', 'delivered', 'cancelled', 'refunded');

-- Orders
CREATE TABLE Orders (
    orderId UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customerId UUID NOT NULL,
    orderTimestamp TIMESTAMP DEFAULT NOW(),
    status order_status DEFAULT 'pending',
    paymentMethodId UUID,
    totalAmount DECIMAL(10,2),
    shippingMethodId UUID,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    deleted_at TIMESTAMP,
    FOREIGN KEY (customerId) REFERENCES Customers(customerId),
    FOREIGN KEY (paymentMethodId) REFERENCES PaymentMethods(paymentMethodId)
);

-- Order Items
CREATE TABLE OrderItems (
    orderItemId UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    orderId UUID NOT NULL,
    productId UUID NOT NULL,
    quantity INT NOT NULL CHECK (quantity > 0),
    unitPrice DECIMAL(10,2) NOT NULL,
    subtotal DECIMAL(10,2) NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    deleted_at TIMESTAMP,
    FOREIGN KEY (orderId) REFERENCES Orders(orderId) ON DELETE CASCADE,
    FOREIGN KEY (productId) REFERENCES Products(productId)
);

-- Shopping Cart
CREATE TABLE ShoppingCart (
    customerId UUID NOT NULL,
    productId UUID NOT NULL,
    quantity INT NOT NULL CHECK (quantity > 0),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    PRIMARY KEY (customerId, productId),
    FOREIGN KEY (customerId) REFERENCES Customers(customerId) ON DELETE CASCADE,
    FOREIGN KEY (productId) REFERENCES Products(productId) ON DELETE CASCADE
);

-- Transactions (payment records)
CREATE TABLE Transactions (
    transactionId UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    orderId UUID NOT NULL,
    paymentProcessor VARCHAR(100), -- e.g., 'stripe', 'paypal'
    processorTransactionId VARCHAR(255),
    amount DECIMAL(10,2) NOT NULL,
    status VARCHAR(50), -- 'success', 'failed', 'pending'
    processed_at TIMESTAMP DEFAULT NOW(),
    FOREIGN KEY (orderId) REFERENCES Orders(orderId)
);

-- Refunds
CREATE TABLE Refunds (
    refundId UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    transactionId UUID NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    reason TEXT,
    status VARCHAR(50), -- 'requested', 'approved', 'denied', 'completed'
    requested_at TIMESTAMP DEFAULT NOW(),
    resolved_at TIMESTAMP,
    FOREIGN KEY (transactionId) REFERENCES Transactions(transactionId)
);

-- Shipping Methods
CREATE TABLE ShippingMethods (
    shippingMethodId UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    cost DECIMAL(10,2) NOT NULL,
    estimatedDays INT,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Tracking Info
CREATE TABLE Tracking (
    trackingId UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    orderId UUID NOT NULL,
    trackingNumber VARCHAR(100) NOT NULL,
    carrier VARCHAR(50),
    status VARCHAR(50),
    updated_at TIMESTAMP DEFAULT NOW(),
    FOREIGN KEY (orderId) REFERENCES Orders(orderId)
);

-- ============================================
-- FIFO Customer Cycling Functions
-- ============================================

-- Function to add a new customer with FIFO logic
CREATE OR REPLACE FUNCTION add_customer_with_cycling(
  p_email varchar,
  p_customerpasswd text,
  p_customername varchar DEFAULT NULL,
  p_phonenum varchar DEFAULT NULL
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
    
    -- Soft delete oldest customer and their cart
    UPDATE customers SET is_active = FALSE, deleted_at = NOW() 
    WHERE customerid = oldest_customer_id;
    
    DELETE FROM shoppingcart WHERE customerid = oldest_customer_id;
    
    -- Shift all positions down
    UPDATE customers 
    SET cycle_position = cycle_position - 1
    WHERE is_active = TRUE AND deleted_at IS NULL;
  END IF;
  
  -- Insert new customer at position 10 (or current_count + 1 if less than 10)
  INSERT INTO customers (email, customerpasswd, customername, phonenum, cycle_position, is_active)
  VALUES (p_email, p_customerpasswd, p_customername, p_phonenum, 
          LEAST(current_count + 1, 10), TRUE)
  RETURNING customerid INTO new_customer_id;
  
  RETURN new_customer_id;
END;
$$ LANGUAGE plpgsql;

-- Function to get active customers
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
-- Essential Helper Functions
-- ============================================

-- Add to cart with upsert
CREATE OR REPLACE FUNCTION add_to_cart(
  p_customerid uuid,
  p_productid uuid,
  p_quantity int
) RETURNS void AS $$
BEGIN
  INSERT INTO shoppingcart (customerid, productid, quantity, created_at, updated_at)
  VALUES (p_customerid, p_productid, p_quantity, NOW(), NOW())
  ON CONFLICT (customerid, productid) 
  DO UPDATE SET 
    quantity = shoppingcart.quantity + EXCLUDED.quantity,
    updated_at = NOW();
END;
$$ LANGUAGE plpgsql;

-- Update cart quantity
CREATE OR REPLACE FUNCTION update_cart_quantity(
  p_customerid uuid,
  p_productid uuid,
  p_quantity int
) RETURNS void AS $$
BEGIN
  UPDATE shoppingcart
  SET quantity = p_quantity, updated_at = NOW()
  WHERE customerid = p_customerid AND productid = p_productid;
END;
$$ LANGUAGE plpgsql;

-- Remove from cart
CREATE OR REPLACE FUNCTION remove_from_cart(
  p_customerid uuid,
  p_productid uuid
) RETURNS void AS $$
BEGIN
  DELETE FROM shoppingcart 
  WHERE customerid = p_customerid AND productid = p_productid;
END;
$$ LANGUAGE plpgsql;

-- Create order from cart
CREATE OR REPLACE FUNCTION create_order_from_cart(
  p_customerid uuid,
  p_paymentmethodid uuid,
  p_shippingmethodid uuid
) RETURNS uuid AS $$
DECLARE
  new_orderid uuid;
  total_amt numeric;
  shipping_cost numeric;
BEGIN
  -- Calculate cart total
  SELECT SUM(sc.quantity * p.price) INTO total_amt
  FROM shoppingcart sc
  JOIN products p ON sc.productid = p.productid
  WHERE sc.customerid = p_customerid;
  
  -- Get shipping cost
  SELECT cost INTO shipping_cost
  FROM shippingmethods
  WHERE shippingmethodid = p_shippingmethodid;
  
  -- Add shipping to total
  total_amt := total_amt + COALESCE(shipping_cost, 0);
  
  -- Create order
  INSERT INTO orders (customerid, paymentmethodid, shippingmethodid, totalamount, status)
  VALUES (p_customerid, p_paymentmethodid, p_shippingmethodid, total_amt, 'pending')
  RETURNING orderid INTO new_orderid;
  
  -- Insert order items from cart
  INSERT INTO orderitems (orderid, productid, quantity, unitprice, subtotal)
  SELECT new_orderid, sc.productid, sc.quantity, p.price, (sc.quantity * p.price)
  FROM shoppingcart sc
  JOIN products p ON sc.productid = p.productid
  WHERE sc.customerid = p_customerid;
  
  -- Update product stock
  UPDATE products p
  SET stockquantity = stockquantity - sc.quantity
  FROM shoppingcart sc
  WHERE p.productid = sc.productid AND sc.customerid = p_customerid;
  
  -- Clear cart
  DELETE FROM shoppingcart WHERE customerid = p_customerid;
  
  RETURN new_orderid;
END;
$$ LANGUAGE plpgsql;

-- Update order status
CREATE OR REPLACE FUNCTION update_order_status(
  p_orderid uuid,
  p_status order_status
) RETURNS void AS $$
BEGIN
  UPDATE orders SET status = p_status, updated_at = NOW()
  WHERE orderid = p_orderid;
END;
$$ LANGUAGE plpgsql;

-- Get order details for receipt
CREATE OR REPLACE FUNCTION get_order_receipt(p_orderid uuid)
RETURNS TABLE (
  orderid uuid,
  ordertimestamp timestamp,
  status order_status,
  totalamount numeric,
  customername varchar,
  customeremail varchar,
  shippingaddress text,
  shippingmethod varchar,
  shippingcost numeric
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    o.orderid,
    o.ordertimestamp,
    o.status,
    o.totalamount,
    c.customername,
    c.email,
    c.shippingaddress,
    sm.name,
    sm.cost
  FROM orders o
  JOIN customers c ON o.customerid = c.customerid
  LEFT JOIN shippingmethods sm ON o.shippingmethodid = sm.shippingmethodid
  WHERE o.orderid = p_orderid;
END;
$$ LANGUAGE plpgsql;

-- Get order items for receipt
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
    p.name,
    oi.quantity,
    oi.unitprice,
    oi.subtotal
  FROM orderitems oi
  JOIN products p ON oi.productid = p.productid
  WHERE oi.orderid = p_orderid;
END;
$$ LANGUAGE plpgsql;