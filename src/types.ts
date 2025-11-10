// types.ts - Shared types for the application
export interface ProductVariant {
    variantId: string;
    sku: string;
    size: string | null;
    color: string | null;
    price: number;
    stock: number;
    inStock: boolean;
  }
  
  export interface Product {
    id: string; // Changed from number to string (UUID)
    name: string;
    price: number;
    image: string;
    category: string;
    description: string;
    sizes: string[];
    colors: string[];
    inStock: boolean;
    variants: ProductVariant[];
  }
  
  export interface CartItem {
    id: string; // Product ID
    name: string;
    price: number;
    image: string;
    category: string;
    description: string;
    quantity: number;
    selectedSize?: string;
    selectedColor?: string;
    variantId?: string; // Added to track which variant was selected
    maxStock?: number; // Added to validate quantity
  }
  
  export interface OrderItem {
    variantId: string;
    quantity: number;
  }
  
  export interface CustomerInfo {
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
  }
  
  export interface ShippingInfo {
    address: string;
    city: string;
    state: string;
    zipCode: string;
    country: string;
  }