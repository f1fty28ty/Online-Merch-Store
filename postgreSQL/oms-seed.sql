-- ============================================
-- Seed Products, Variants, Categories, and Images
-- Based on your hardcoded PRODUCTS array
-- Supabase-compatible format
-- ============================================

-- First, insert categories
INSERT INTO Categories (name) VALUES
    ('Apparel'),
    ('Accessories')
ON CONFLICT DO NOTHING;

-- Create a function to seed all products
CREATE OR REPLACE FUNCTION seed_products()
RETURNS void
LANGUAGE plpgsql
AS '
DECLARE
    product1_id UUID := gen_random_uuid();
    product2_id UUID := gen_random_uuid();
    product3_id UUID := gen_random_uuid();
    product4_id UUID := gen_random_uuid();
    product5_id UUID := gen_random_uuid();
    product6_id UUID := gen_random_uuid();
    
    apparel_cat_id UUID;
    accessories_cat_id UUID;
    
    black_id UUID;
    gray_id UUID;
    grey_id UUID;
    navy_id UUID;
    white_id UUID;
    cream_id UUID;
    natural_id UUID;
    red_id UUID;
    
    xs_id UUID;
    s_id UUID;
    m_id UUID;
    l_id UUID;
    xl_id UUID;
    xxl_id UUID;
    onesize_id UUID;
BEGIN
    -- Get category IDs
    SELECT categoryId INTO apparel_cat_id FROM Categories WHERE name = ''Apparel'';
    SELECT categoryId INTO accessories_cat_id FROM Categories WHERE name = ''Accessories'';
    
    -- Get color IDs
    SELECT colorId INTO black_id FROM Colors WHERE colorName = ''Black'';
    SELECT colorId INTO gray_id FROM Colors WHERE colorName = ''Gray'';
    SELECT colorId INTO grey_id FROM Colors WHERE colorName = ''Grey'';
    SELECT colorId INTO navy_id FROM Colors WHERE colorName = ''Navy'';
    SELECT colorId INTO white_id FROM Colors WHERE colorName = ''White'';
    SELECT colorId INTO cream_id FROM Colors WHERE colorName = ''Cream'';
    SELECT colorId INTO natural_id FROM Colors WHERE colorName = ''Natural'';
    SELECT colorId INTO red_id FROM Colors WHERE colorName = ''Red'';
    
    -- Get size IDs
    SELECT sizeId INTO xs_id FROM Sizes WHERE sizeName = ''XS'';
    SELECT sizeId INTO s_id FROM Sizes WHERE sizeName = ''S'';
    SELECT sizeId INTO m_id FROM Sizes WHERE sizeName = ''M'';
    SELECT sizeId INTO l_id FROM Sizes WHERE sizeName = ''L'';
    SELECT sizeId INTO xl_id FROM Sizes WHERE sizeName = ''XL'';
    SELECT sizeId INTO xxl_id FROM Sizes WHERE sizeName = ''XXL'';
    SELECT sizeId INTO onesize_id FROM Sizes WHERE sizeName = ''One Size'';

    -- Product 1: Classic Black Hoodie
    INSERT INTO Products (productId, name, description, basePrice, categoryName)
    VALUES (product1_id, ''Classic Black Hoodie'', 
            ''Premium quality cotton blend hoodie with a comfortable fit. Perfect for everyday wear.'',
            49.99, ''Apparel'');
    
    INSERT INTO ProductCategories (productId, categoryId) VALUES (product1_id, apparel_cat_id);
    
    INSERT INTO Images (productId, url, displayOrder) VALUES 
        (product1_id, ''https://images.unsplash.com/photo-1647797819874-f51a8a8fc5c0?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxibGFjayUyMGhvb2RpZXxlbnwxfHx8fDE3NjExNTI1MDV8MA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral'', 0);
    
    -- Variants: Sizes (S, M, L, XL, XXL) x Colors (Black, Gray, Navy)
    INSERT INTO ProductVariants (productId, sizeId, colorId, sku, stockQuantity) VALUES
        (product1_id, s_id, black_id, ''HOODIE-BLK-S'', 10),
        (product1_id, m_id, black_id, ''HOODIE-BLK-M'', 15),
        (product1_id, l_id, black_id, ''HOODIE-BLK-L'', 12),
        (product1_id, xl_id, black_id, ''HOODIE-BLK-XL'', 8),
        (product1_id, xxl_id, black_id, ''HOODIE-BLK-XXL'', 5),
        (product1_id, s_id, gray_id, ''HOODIE-GRAY-S'', 10),
        (product1_id, m_id, gray_id, ''HOODIE-GRAY-M'', 15),
        (product1_id, l_id, gray_id, ''HOODIE-GRAY-L'', 12),
        (product1_id, xl_id, gray_id, ''HOODIE-GRAY-XL'', 8),
        (product1_id, xxl_id, gray_id, ''HOODIE-GRAY-XXL'', 5),
        (product1_id, s_id, navy_id, ''HOODIE-NAVY-S'', 10),
        (product1_id, m_id, navy_id, ''HOODIE-NAVY-M'', 15),
        (product1_id, l_id, navy_id, ''HOODIE-NAVY-L'', 12),
        (product1_id, xl_id, navy_id, ''HOODIE-NAVY-XL'', 8),
        (product1_id, xxl_id, navy_id, ''HOODIE-NAVY-XXL'', 5);

    -- Product 2: Essential White Tee
    INSERT INTO Products (productId, name, description, basePrice, categoryName)
    VALUES (product2_id, ''Essential White Tee'',
            ''100% organic cotton t-shirt with a relaxed fit. A wardrobe essential.'',
            24.99, ''Apparel'');
    
    INSERT INTO ProductCategories (productId, categoryId) VALUES (product2_id, apparel_cat_id);
    
    INSERT INTO Images (productId, url, displayOrder) VALUES 
        (product2_id, ''https://images.unsplash.com/photo-1574180566232-aaad1b5b8450?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHx3aGl0ZSUyMHQtc2hpcnR8ZW58MXx8fHwxNzYxMTM1OTI5fDA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral'', 0);
    
    -- Variants: Sizes (XS, S, M, L, XL) x Colors (White, Black, Cream)
    INSERT INTO ProductVariants (productId, sizeId, colorId, sku, stockQuantity) VALUES
        (product2_id, xs_id, white_id, ''TEE-WHT-XS'', 20),
        (product2_id, s_id, white_id, ''TEE-WHT-S'', 25),
        (product2_id, m_id, white_id, ''TEE-WHT-M'', 30),
        (product2_id, l_id, white_id, ''TEE-WHT-L'', 25),
        (product2_id, xl_id, white_id, ''TEE-WHT-XL'', 15),
        (product2_id, xs_id, black_id, ''TEE-BLK-XS'', 20),
        (product2_id, s_id, black_id, ''TEE-BLK-S'', 25),
        (product2_id, m_id, black_id, ''TEE-BLK-M'', 30),
        (product2_id, l_id, black_id, ''TEE-BLK-L'', 25),
        (product2_id, xl_id, black_id, ''TEE-BLK-XL'', 15),
        (product2_id, xs_id, cream_id, ''TEE-CREAM-XS'', 20),
        (product2_id, s_id, cream_id, ''TEE-CREAM-S'', 25),
        (product2_id, m_id, cream_id, ''TEE-CREAM-M'', 30),
        (product2_id, l_id, cream_id, ''TEE-CREAM-L'', 25),
        (product2_id, xl_id, cream_id, ''TEE-CREAM-XL'', 15);

    -- Product 3: Vintage Baseball Cap
    INSERT INTO Products (productId, name, description, basePrice, categoryName)
    VALUES (product3_id, ''Vintage Baseball Cap'',
            ''Adjustable cotton baseball cap with embroidered logo. Classic vintage style.'',
            29.99, ''Accessories'');
    
    INSERT INTO ProductCategories (productId, categoryId) VALUES (product3_id, accessories_cat_id);
    
    INSERT INTO Images (productId, url, displayOrder) VALUES 
        (product3_id, ''https://images.unsplash.com/photo-1691256676359-20e5c6d4bc92?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxiYXNlYmFsbCUyMGNhcHxlbnwxfHx8fDE3NjExODY5Mzd8MA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral'', 0);
    
    -- Variants: One Size x Colors (Black, Navy, White, Red)
    INSERT INTO ProductVariants (productId, sizeId, colorId, sku, stockQuantity) VALUES
        (product3_id, onesize_id, black_id, ''CAP-BLK-OS'', 50),
        (product3_id, onesize_id, navy_id, ''CAP-NAVY-OS'', 50),
        (product3_id, onesize_id, white_id, ''CAP-WHT-OS'', 50),
        (product3_id, onesize_id, red_id, ''CAP-RED-OS'', 50);

    -- Product 4: Canvas Tote Bag
    INSERT INTO Products (productId, name, description, basePrice, categoryName)
    VALUES (product4_id, ''Canvas Tote Bag'',
            ''Durable canvas tote bag perfect for shopping or daily use. Eco-friendly and stylish.'',
            19.99, ''Accessories'');
    
    INSERT INTO ProductCategories (productId, categoryId) VALUES (product4_id, accessories_cat_id);
    
    INSERT INTO Images (productId, url, displayOrder) VALUES 
        (product4_id, ''https://images.unsplash.com/photo-1574365569389-a10d488ca3fb?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHx0b3RlJTIwYmFnfGVufDF8fHx8MTc2MTA2OTEwNXww&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral'', 0);
    
    -- Variants: No size x Colors (Natural, Black)
    INSERT INTO ProductVariants (productId, colorId, sku, stockQuantity) VALUES
        (product4_id, natural_id, ''TOTE-NAT'', 100),
        (product4_id, black_id, ''TOTE-BLK'', 100);

    -- Product 5: Limited Edition Graphic Tee (OUT OF STOCK)
    INSERT INTO Products (productId, name, description, basePrice, categoryName)
    VALUES (product5_id, ''Limited Edition Graphic Tee'',
            ''Exclusive graphic design on premium cotton. Limited edition print available while stocks last.'',
            34.99, ''Apparel'');
    
    INSERT INTO ProductCategories (productId, categoryId) VALUES (product5_id, apparel_cat_id);
    
    INSERT INTO Images (productId, url, displayOrder) VALUES 
        (product5_id, ''https://images.unsplash.com/photo-1525393839361-867d646aea41?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxncmFwaGljJTIwdGVlfGVufDF8fHx8MTc2MTE4NjkzN3ww&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral'', 0);
    
    -- Variants: Sizes (S, M, L, XL) x Colors (Black, White) - ALL OUT OF STOCK
    INSERT INTO ProductVariants (productId, sizeId, colorId, sku, stockQuantity) VALUES
        (product5_id, s_id, black_id, ''GRAPHIC-BLK-S'', 0),
        (product5_id, m_id, black_id, ''GRAPHIC-BLK-M'', 0),
        (product5_id, l_id, black_id, ''GRAPHIC-BLK-L'', 0),
        (product5_id, xl_id, black_id, ''GRAPHIC-BLK-XL'', 0),
        (product5_id, s_id, white_id, ''GRAPHIC-WHT-S'', 0),
        (product5_id, m_id, white_id, ''GRAPHIC-WHT-M'', 0),
        (product5_id, l_id, white_id, ''GRAPHIC-WHT-L'', 0),
        (product5_id, xl_id, white_id, ''GRAPHIC-WHT-XL'', 0);

    -- Product 6: Premium Snapback
    INSERT INTO Products (productId, name, description, basePrice, categoryName)
    VALUES (product6_id, ''Premium Snapback'',
            ''High-quality snapback with structured crown and flat brim. Perfect for streetwear enthusiasts.'',
            34.99, ''Accessories'');
    
    INSERT INTO ProductCategories (productId, categoryId) VALUES (product6_id, accessories_cat_id);
    
    INSERT INTO Images (productId, url, displayOrder) VALUES 
        (product6_id, ''https://images.unsplash.com/photo-1556306535-0f09a537f0a3?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxzbmFwYmFjayUyMGhhdHxlbnwxfHx8fDE3NjExODY5Mzh8MA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral'', 0);
    
    -- Variants: One Size x Colors (Black, Navy, Gray)
    INSERT INTO ProductVariants (productId, sizeId, colorId, sku, stockQuantity) VALUES
        (product6_id, onesize_id, black_id, ''SNAP-BLK-OS'', 40),
        (product6_id, onesize_id, navy_id, ''SNAP-NAVY-OS'', 40),
        (product6_id, onesize_id, gray_id, ''SNAP-GRAY-OS'', 40);

END;
';

-- Run the seed function
SELECT seed_products();