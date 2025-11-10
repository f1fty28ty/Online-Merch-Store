import { Dialog, DialogContent, DialogHeader, DialogTitle } from "./ui/dialog";
import { Button } from "./ui/button";
import { ShoppingCart, AlertCircle } from "lucide-react";
import type { Product } from "./types";
import { Badge } from "./ui/badge";
import { useState, useEffect } from "react";
import { ImageWithFallback } from "./figma/ImageWithFallback";
import { Alert, AlertDescription } from "./ui/alert";

interface ProductDetailProps {
  product: Product | null;
  open: boolean;
  onClose: () => void;
  onAddToCart: (product: Product, size?: string, color?: string) => void;
}

export function ProductDetail({ product, open, onClose, onAddToCart }: ProductDetailProps) {
  const [selectedSize, setSelectedSize] = useState<string>("");
  const [selectedColor, setSelectedColor] = useState<string>("");
  const [stockInfo, setStockInfo] = useState<{ available: boolean; quantity: number } | null>(null);

  useEffect(() => {
    if (product && open) {
      // Reset selections when product changes or modal opens
      setSelectedSize("");
      setSelectedColor("");
      setStockInfo(null);
    }
  }, [product, open]);

  useEffect(() => {
    // Update stock info when selections change
    if (!product) return;

    if (product.variants && product.variants.length > 0) {
      const variant = product.variants.find(v => {
        const sizeMatch = !selectedSize || v.size === selectedSize;
        const colorMatch = !selectedColor || v.color === selectedColor;
        return sizeMatch && colorMatch;
      });

      if (variant) {
        setStockInfo({
          available: variant.inStock,
          quantity: variant.stock
        });
      } else {
        setStockInfo(null);
      }
    } else {
      setStockInfo({ available: product.inStock, quantity: 999 });
    }
  }, [selectedSize, selectedColor, product]);

  if (!product) return null;

  const needsSize = product.sizes.length > 0;
  const needsColor = product.colors.length > 0;
  const canAddToCart = (!needsSize || selectedSize) && (!needsColor || selectedColor);

  const handleAddToCart = () => {
    if (!canAddToCart) {
      return;
    }
    onAddToCart(product, selectedSize, selectedColor);
    onClose();
  };

  // Get available colors for selected size
  const availableColors = selectedSize && product.variants
    ? Array.from(new Set(
        product.variants
          .filter(v => v.size === selectedSize && v.inStock)
          .map(v => v.color)
          .filter(Boolean)
      ))
    : product.colors;

  // Get available sizes for selected color
  const availableSizes = selectedColor && product.variants
    ? Array.from(new Set(
        product.variants
          .filter(v => v.color === selectedColor && v.inStock)
          .map(v => v.size)
          .filter(Boolean)
      ))
    : product.sizes;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{product.name}</DialogTitle>
        </DialogHeader>
        <div className="grid md:grid-cols-2 gap-6">
          <div className="aspect-square rounded-lg overflow-hidden bg-gray-100">
            <ImageWithFallback
              src={product.image}
              alt={product.name}
              className="w-full h-full object-cover"
            />
          </div>
          <div className="space-y-6">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="text-2xl font-bold text-gray-900">${product.price.toFixed(2)}</span>
                <Badge variant={product.inStock ? "default" : "secondary"}>
                  {product.inStock ? "In Stock" : "Out of Stock"}
                </Badge>
              </div>
              <Badge variant="outline">{product.category}</Badge>
            </div>

            <div>
              <h4 className="font-semibold mb-2">Description</h4>
              <p className="text-gray-600">{product.description}</p>
            </div>

            {needsSize && (
              <div>
                <h4 className="font-semibold mb-2">Size {needsSize && '*'}</h4>
                <div className="flex flex-wrap gap-2">
                  {availableSizes.map((size) => (
                    <Button
                      key={size}
                      variant={selectedSize === size ? "default" : "outline"}
                      size="sm"
                      onClick={() => setSelectedSize(size)}
                      disabled={!!(selectedColor && !availableSizes.includes(size))}
                    >
                      {size}
                    </Button>
                  ))}
                </div>
              </div>
            )}

            {needsColor && (
              <div>
                <h4 className="font-semibold mb-2">Color {needsColor && '*'}</h4>
                <div className="flex flex-wrap gap-2">
                  {availableColors.map((color) => (
                    <Button
                      key={color}
                      variant={selectedColor === color ? "default" : "outline"}
                      size="sm"
                      onClick={() => setSelectedColor(color)}
                      disabled={!!(selectedSize && !availableColors.includes(color))}
                    >
                      {color}
                    </Button>
                  ))}
                </div>
              </div>
            )}

            {stockInfo && canAddToCart && (
              <Alert variant={stockInfo.available ? "default" : "destructive"}>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  {stockInfo.available 
                    ? `${stockInfo.quantity} available in stock`
                    : 'This combination is out of stock'
                  }
                </AlertDescription>
              </Alert>
            )}

            {(needsSize || needsColor) && !canAddToCart && (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Please select {needsSize && !selectedSize ? 'a size' : ''}{needsSize && !selectedSize && needsColor && !selectedColor ? ' and ' : ''}{needsColor && !selectedColor ? 'a color' : ''}
                </AlertDescription>
              </Alert>
            )}

            <Button
              className="w-full"
              size="lg"
              onClick={handleAddToCart}
              disabled={!product.inStock || !canAddToCart || !!(stockInfo && !stockInfo.available)}
            >
              <ShoppingCart className="mr-2 h-4 w-4" />
              Add to Cart
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}