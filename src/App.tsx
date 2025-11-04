import { useState } from "react";
import { ProductCard, Product } from "./components/ProductCard";
import { ShoppingCartComponent, CartItem } from "./components/ShoppingCart";
import { ProductDetail } from "./components/ProductDetail";
import { Checkout } from "./components/Checkout";
import { Button } from "./components/ui/button";
import { Input } from "./components/ui/input";
import { Search, Store } from "lucide-react";
import { Tabs, TabsList, TabsTrigger } from "./components/ui/tabs";
import { toast } from "sonner@2.0.3";
import { Toaster } from "./components/ui/sonner";

const PRODUCTS: Product[] = [
  {
    id: 1,
    name: "Classic Black Hoodie",
    price: 49.99,
    image: "ttps://images.unsplash.com/photo-1647797819874-f51a8a8fc5c0?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxibGFjayUyMGhvb2RpZXxlbnwxfHx8fDE3NjExNTI1MDV8MA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral",
    category: "Apparel",
    description: "Premium quality cotton blend hoodie with a comfortable fit. Perfect for everyday wear.",
    sizes: ["S", "M", "L", "XL", "XXL"],
    colors: ["Black", "Gray", "Navy"],
    inStock: true,
  },
  {
    id: 2,
    name: "Essential White Tee",
    price: 24.99,
    image: "ttps://images.unsplash.com/photo-1574180566232-aaad1b5b8450?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHx3aGl0ZSUyMHQtc2hpcnR8ZW58MXx8fHwxNzYxMTM1OTI5fDA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral",
    category: "Apparel",
    description: "100% organic cotton t-shirt with a relaxed fit. A wardrobe essential.",
    sizes: ["XS", "S", "M", "L", "XL"],
    colors: ["White", "Black", "Cream"],
    inStock: true,
  },
  {
    id: 3,
    name: "Vintage Baseball Cap",
    price: 29.99,
    image: "ttps://images.unsplash.com/photo-1691256676359-20e5c6d4bc92?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxiYXNlYmFsbCUyMGNhcHxlbnwxfHx8fDE3NjExODY5Mzd8MA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral",
    category: "Accessories",
    description: "Adjustable cotton baseball cap with embroidered logo. Classic vintage style.",
    sizes: ["One Size"],
    colors: ["Black", "Navy", "White", "Red"],
    inStock: true,
  },
  {
    id: 4,
    name: "Canvas Tote Bag",
    price: 19.99,
    image: "ttps://images.unsplash.com/photo-1574365569389-a10d488ca3fb?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHx0b3RlJTIwYmFnfGVufDF8fHx8MTc2MTA2OTEwNXww&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral",
    category: "Accessories",
    description: "Durable canvas tote bag perfect for shopping or daily use. Eco-friendly and stylish.",
    sizes: [],
    colors: ["Natural", "Black"],
    inStock: true,
  },
  {
    id: 5,
    name: "Limited Edition Graphic Tee",
    price: 34.99,
    image: "https://images.unsplash.com/photo-1525393839361-867d646aea41?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxncmFwaGljJTIwdGVlfGVufDF8fHx8MTc2MTE4NjkzN3ww&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral",
    category: "Apparel",
    description: "Exclusive graphic design on premium cotton. Limited edition print available while stocks last.",
    sizes: ["S", "M", "L", "XL"],
    colors: ["Black", "White"],
    inStock: false,
  },
  {
    id: 6,
    name: "Premium Snapback",
    price: 34.99,
    image: "https://images.unsplash.com/photo-1556306535-0f09a537f0a3?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxzbmFwYmFjayUyMGhhdHxlbnwxfHx8fDE3NjExODY5Mzh8MA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral",
    category: "Accessories",
    description: "High-quality snapback with structured crown and flat brim. Perfect for streetwear enthusiasts.",
    sizes: ["One Size"],
    colors: ["Black", "Navy", "Gray"],
    inStock: true,
  },
];

export default function App() {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [isCheckoutView, setIsCheckoutView] = useState(false);

  const categories = ["All", ...Array.from(new Set(PRODUCTS.map((p) => p.category)))];

  const filteredProducts = PRODUCTS.filter((product) => {
    const matchesSearch = product.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === "All" || product.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const handleAddToCart = (product: Product, size?: string, color?: string) => {
    const existingItem = cart.find((item) => item.id === product.id);

    if (existingItem) {
      setCart(cart.map((item) =>
        item.id === product.id
          ? { ...item, quantity: item.quantity + 1 }
          : item
      ));
    } else {
      setCart([...cart, { ...product, quantity: 1, selectedSize: size, selectedColor: color }]);
    }

    toast.success(`${product.name} added to cart!`);
  };

  const handleUpdateQuantity = (id: number, delta: number) => {
    setCart(cart.map((item) => {
      if (item.id === id) {
        const newQuantity = item.quantity + delta;
        if (newQuantity <= 0) {
          return item;
        }
        return { ...item, quantity: newQuantity };
      }
      return item;
    }).filter((item) => item.quantity > 0));
  };

  const handleRemoveItem = (id: number) => {
    setCart(cart.filter((item) => item.id !== id));
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
    toast.success("Thank you for your order!");
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
              <h1>Merch Store</h1>
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

        {/* Product Grid */}
        {filteredProducts.length === 0 ? (
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
