import { useState, useEffect } from "react";
import { ProductCard } from "./components/ProductCard";
import type { Product, CartItem } from "./components/types";
import { ShoppingCartComponent } from "./components/ShoppingCart";
import { ProductDetail } from "./components/ProductDetail";
import { Checkout } from "./components/Checkout";
import { Input } from "./components/ui/input";
import { Search, Store } from "lucide-react";
import { Tabs, TabsList, TabsTrigger } from "./components/ui/tabs";
import { toast } from "sonner";
import { Toaster } from "./components/ui/sonner";
import { supabase } from "../lib/initSupabase";


export default function App() {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [isCheckoutView, setIsCheckoutView] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [categories, setCategories] = useState<string[]>(["All"]);

  // Fetch products from Supabase on mount
  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    try {
      setLoading(true);
      
      // Call the get_products_with_variants function
      const { data, error } = await supabase.rpc('get_products_with_variants');
      
      if (error) {
        console.error('Error fetching products:', error);
        toast.error('Failed to load products');
        return;
      }

      // Transform the data to match your Product type
      const transformedProducts: Product[] = data.map((item: any) => ({
        id: item.productid,
        name: item.name,
        price: parseFloat(item.baseprice),
        image: item.images?.[0] || '',
        category: item.categories?.[0] || 'Uncategorized',
        description: item.description || '',
        sizes: item.available_sizes?.map((s: any) => s.name) || [],
        colors: item.available_colors?.map((c: any) => c.name) || [],
        inStock: item.in_stock || false,
        variants: item.variants || [],
      }));

      setProducts(transformedProducts);

      // Extract unique categories
      const uniqueCategories = Array.from(
        new Set(transformedProducts.map(p => p.category))
      );
      setCategories(["All", ...uniqueCategories]);

    } catch (err) {
      console.error('Unexpected error:', err);
      toast.error('An error occurred while loading products');
    } finally {
      setLoading(false);
    }
  };

  const filteredProducts = products.filter((product) => {
    const matchesSearch = product.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === "All" || product.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const handleAddToCart = (product: Product, size?: string, color?: string) => {
    // Find the specific variant
    let variantId: string | undefined;
    let maxStock = 0;
    let variantPrice = product.price;

    if (product.variants && product.variants.length > 0) {
      const variant = product.variants.find(v => {
        const sizeMatch = !size || v.size === size;
        const colorMatch = !color || v.color === color;
        return sizeMatch && colorMatch;
      });

      if (variant) {
        variantId = variant.variantId;
        maxStock = variant.stock;
        variantPrice = variant.price;
      } else {
        toast.error('Selected variant not available');
        return;
      }

      // Check if variant is in stock
      if (maxStock === 0) {
        toast.error('This item is out of stock');
        return;
      }
    }

    // Check if item with same variant already exists in cart
    const existingItemIndex = cart.findIndex(
      (item) => item.id === product.id && item.variantId === variantId
    );

    if (existingItemIndex !== -1) {
      const existingItem = cart[existingItemIndex];
      
      // Check stock limit
      if (existingItem.quantity >= (maxStock || 999)) {
        toast.error('Maximum stock reached for this item');
        return;
      }

      setCart(cart.map((item, idx) =>
        idx === existingItemIndex
          ? { ...item, quantity: item.quantity + 1 }
          : item
      ));
    } else {
      const newItem: CartItem = {
        id: product.id,
        name: product.name,
        price: variantPrice,
        image: product.image,
        category: product.category,
        description: product.description,
        quantity: 1,
        selectedSize: size,
        selectedColor: color,
        variantId: variantId,
        maxStock: maxStock || 999,
      };
      setCart([...cart, newItem]);
    }

    toast.success(`${product.name} added to cart!`);
  };

  const handleUpdateQuantity = (cartItemIndex: number, delta: number) => {
    setCart(cart.map((item, idx) => {
      if (idx === cartItemIndex) {
        const newQuantity = item.quantity + delta;
        
        // Check bounds
        if (newQuantity <= 0) {
          return item;
        }
        
        if (item.maxStock && newQuantity > item.maxStock) {
          toast.error('Maximum stock reached');
          return item;
        }
        
        return { ...item, quantity: newQuantity };
      }
      return item;
    }).filter((item) => item.quantity > 0));
  };

  const handleRemoveItem = (cartItemIndex: number) => {
    setCart(cart.filter((_, idx) => idx !== cartItemIndex));
    toast.success("Item removed from cart");
  };

  const handleCheckout = () => {
    if (cart.length === 0) {
      toast.error("Your cart is empty");
      return;
    }
    setIsCheckoutView(true);
  };

  const handleOrderComplete = () => {
    setCart([]);
    setIsCheckoutView(false);
    // Refresh products to update stock
    fetchProducts();
  };

  // Show checkout view if user is checking out
  if (isCheckoutView) {
    return (
      <>
        <Toaster />
        <Checkout
          items={cart}
          onBack={() => setIsCheckoutView(false)}
          onOrderComplete={handleOrderComplete}
        />
      </>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Toaster />
      
      {/* Header */}
      <header className="bg-white border-b sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <Store className="h-6 w-6" />
              <h1 className="text-xl font-bold">Merch Store</h1>
            </div>
            
            <div className="flex-1 max-w-md hidden md:block">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search products..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>

            <ShoppingCartComponent
              items={cart}
              onUpdateQuantity={handleUpdateQuantity}
              onRemoveItem={handleRemoveItem}
              onCheckout={handleCheckout}
            />
          </div>

          {/* Mobile Search */}
          <div className="mt-4 md:hidden">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search products..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        {/* Category Filter */}
        <div className="mb-8">
          <Tabs value={selectedCategory} onValueChange={setSelectedCategory}>
            <TabsList>
              {categories.map((category) => (
                <TabsTrigger key={category} value={category}>
                  {category}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        </div>

        {/* Loading State */}
        {loading ? (
          <div className="text-center py-16">
            <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-current border-r-transparent"></div>
            <p className="mt-4 text-gray-500">Loading products...</p>
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="text-center py-16 text-gray-500">
            <p>No products found matching your search.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredProducts.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                onAddToCart={handleAddToCart}
                onViewDetails={setSelectedProduct}
              />
            ))}
          </div>
        )}
      </main>

      {/* Product Detail Modal */}
      <ProductDetail
        product={selectedProduct}
        open={selectedProduct !== null}
        onClose={() => setSelectedProduct(null)}
        onAddToCart={handleAddToCart}
      />
    </div>
  );
}