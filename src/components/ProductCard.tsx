import { ShoppingCart } from "lucide-react";
import { Button } from "./ui/button";
import { Card, CardContent, CardFooter } from "./ui/card";
import { Badge } from "./ui/badge";
import { ImageWithFallback } from "./figma/ImageWithFallback";
import type { Product } from "../types";

interface ProductCardProps {
  product: Product;
  onAddToCart: (product: Product, size?: string, color?: string) => void;
  onViewDetails: (product: Product) => void;
}

export function ProductCard({ product, onAddToCart, onViewDetails }: ProductCardProps) {
  const handleQuickAdd = (e: React.MouseEvent) => {
    e.stopPropagation();
    
    // For products with variants, open detail view to select
    if (product.sizes.length > 0 || product.colors.length > 0) {
      onViewDetails(product);
    } else {
      // For products without variants, add directly
      onAddToCart(product);
    }
  };

  return (
    <Card className="overflow-hidden hover:shadow-lg transition-shadow cursor-pointer group">
      <div onClick={() => onViewDetails(product)} className="relative aspect-square overflow-hidden bg-gray-100">
        <ImageWithFallback
          src={product.image}
          alt={product.name}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
        />
        {!product.inStock && (
          <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
            <Badge variant="secondary" className="text-white bg-black/70">Out of Stock</Badge>
          </div>
        )}
        {product.inStock && (
          <Badge className="absolute top-2 right-2" variant="secondary">
            {product.category}
          </Badge>
        )}
      </div>
      <CardContent className="p-4" onClick={() => onViewDetails(product)}>
        <h3 className="font-semibold text-lg mb-1">{product.name}</h3>
        <p className="text-gray-600">${product.price.toFixed(2)}</p>
        {(product.sizes.length > 0 || product.colors.length > 0) && (
          <p className="text-xs text-gray-500 mt-1">
            {product.sizes.length > 0 && `${product.sizes.length} sizes`}
            {product.sizes.length > 0 && product.colors.length > 0 && ' • '}
            {product.colors.length > 0 && `${product.colors.length} colors`}
          </p>
        )}
      </CardContent>
      <CardFooter className="p-4 pt-0">
        <Button
          className="w-full"
          onClick={handleQuickAdd}
          disabled={!product.inStock}
        >
          <ShoppingCart className="mr-2 h-4 w-4" />
          {(product.sizes.length > 0 || product.colors.length > 0) ? 'Select Options' : 'Add to Cart'}
        </Button>
      </CardFooter>
    </Card>
  );
}