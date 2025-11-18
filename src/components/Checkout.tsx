import { useState } from "react";
import { ArrowLeft, CreditCard, MapPin, User, Check, Loader2 } from "lucide-react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Separator } from "./ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { RadioGroup, RadioGroupItem } from "./ui/radio-group";
import type { CartItem } from "../types";
import { ImageWithFallback } from "./figma/ImageWithFallback";
import { toast } from "sonner";
import { supabase } from "../../lib/initSupabase";

interface CheckoutProps {
  items: CartItem[];
  onBack: () => void;
  onOrderComplete: () => void;
}

export function Checkout({ items, onBack, onOrderComplete }: CheckoutProps) {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [paymentMethod, setPaymentMethod] = useState("card");
  const [isProcessing, setIsProcessing] = useState(false);

  const [customerInfo, setCustomerInfo] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
  });

  const [shippingInfo, setShippingInfo] = useState({
    address: "",
    city: "",
    state: "",
    zipCode: "",
    country: "United States",
  });

  const [paymentInfo, setPaymentInfo] = useState({
    cardNumber: "",
    cardName: "",
    expiryDate: "",
    cvv: "",
  });

  const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const shipping: number = 0;
  const tax = subtotal * 0.08;
  const total = subtotal + shipping + tax;

  const handleSubmitCustomerInfo = () => {
    if (!customerInfo.firstName || !customerInfo.lastName || !customerInfo.email) {
      toast.error("Please fill in all required fields");
      return;
    }
    setStep(2);
  };

  const handleSubmitShippingInfo = () => {
    if (!shippingInfo.address || !shippingInfo.city || !shippingInfo.state || !shippingInfo.zipCode) {
      toast.error("Please fill in all required fields");
      return;
    }
    setStep(3);
  };


  const validateStock = async () => {
    try {
      for (const item of items) {
        if (!item.variantId) {
          return { valid: false, message: `${item.name} is missing variant information` };
        }
  
        // Use lowercase table name for Supabase
        const { data, error } = await supabase
          .from('productvariants')  // ✅ Changed to lowercase
          .select('stockquantity, instock')  // ✅ Changed to lowercase columns
          .eq('variantid', item.variantId)  // ✅ Changed to lowercase
          .single();
  
        if (error) {
          console.error('Stock validation error:', error);
          return { valid: false, message: `Could not verify stock for ${item.name}` };
        }
  
        if (!data) {
          return { valid: false, message: `Variant not found for ${item.name}` };
        }
  
        if (!data.instock || data.stockquantity < item.quantity) {
          return { 
            valid: false, 
            message: `${item.name} only has ${data.stockquantity} available (you requested ${item.quantity})` 
          };
        }
      }
  
      return { valid: true };
    } catch (error) {
      console.error('Stock validation error:', error);
      return { valid: false, message: 'Failed to validate stock' };
    }
  };

  const createCustomer = async () => {
    try {
      const fullName = `${customerInfo.firstName} ${customerInfo.lastName}`;
      const shippingAddress = `${shippingInfo.address}, ${shippingInfo.city}, ${shippingInfo.state} ${shippingInfo.zipCode}, ${shippingInfo.country}`;
      
      const tempPassword = 'temp_' + Math.random().toString(36).substring(7);

      const { data, error } = await supabase
        .rpc('add_customer_with_cycling', {
          p_email: customerInfo.email,
          p_customerpasswd: tempPassword,
          p_customername: fullName,
          p_phonenum: customerInfo.phone || null,
          p_shippingaddress: shippingAddress,
          p_billingaddress: shippingAddress,
        });

      if (error) {
        console.error('Customer creation error:', error);
        return null;
      }

      return data;
    } catch (error) {
      console.error('Customer creation error:', error);
      return null;
    }
  };

  const createOrder = async (customerId: string) => {
    try {
      const shippingAddress = `${shippingInfo.address}, ${shippingInfo.city}, ${shippingInfo.state} ${shippingInfo.zipCode}, ${shippingInfo.country}`;
      
      const orderItems = items.map(item => ({
        variantId: item.variantId,
        quantity: item.quantity,
      }));

      const { data, error } = await supabase
        .rpc('create_order_with_variants', {
          p_customerid: customerId,
          p_items: orderItems,
          p_shipping_address: shippingAddress,
          p_shipping_cost: shipping,
        });

      if (error) {
        console.error('Order creation error:', error);
        return null;
      }

      if (data) {
        await supabase.rpc('update_order_status', {
          p_orderid: data,
          p_status: 'paid',
        });
      }

      return data;
    } catch (error) {
      console.error('Order creation error:', error);
      return null;
    }
  };

  const handleSubmitPayment = async () => {
    if (paymentMethod === "card" && (!paymentInfo.cardNumber || !paymentInfo.cardName || !paymentInfo.expiryDate || !paymentInfo.cvv)) {
      toast.error("Please fill in all payment details");
      return;
    }

    setIsProcessing(true);

    try {
      const stockValidation = await validateStock();
      if (!stockValidation.valid) {
        toast.error(stockValidation.message || "Some items are out of stock");
        setIsProcessing(false);
        return;
      }

      const customerId = await createCustomer();
      if (!customerId) {
        toast.error("Failed to create customer account");
        setIsProcessing(false);
        return;
      }

      const orderId = await createOrder(customerId);
      if (!orderId) {
        toast.error("Failed to create order");
        setIsProcessing(false);
        return;
      }

      toast.success("Order placed successfully!");
      setTimeout(() => {
        onOrderComplete();
      }, 1500);

    } catch (error) {
      console.error("Checkout error:", error);
      toast.error("An error occurred while processing your order");
      setIsProcessing(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <Button variant="ghost" onClick={onBack} disabled={isProcessing}>
              <ArrowLeft className="h-5 w-5 mr-2" />
              Back to Store
            </Button>
            <h1 className="text-xl font-bold">Checkout</h1>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="grid lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            <div className="flex items-center justify-between mb-8">
              {[
                { num: 1, label: "Information", icon: User },
                { num: 2, label: "Shipping", icon: MapPin },
                { num: 3, label: "Payment", icon: CreditCard },
              ].map((s, idx) => (
                <div key={s.num} className="flex items-center flex-1">
                  <div className="flex flex-col items-center flex-1">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center mb-2 transition-colors ${step >= s.num ? "bg-black text-white" : "bg-gray-200 text-gray-400"}`}>
                      {step > s.num ? <Check className="h-5 w-5" /> : <s.icon className="h-5 w-5" />}
                    </div>
                    <span className="text-xs text-center hidden sm:block">{s.label}</span>
                  </div>
                  {idx < 2 && <div className={`h-0.5 flex-1 mx-2 transition-colors ${step > s.num ? "bg-black" : "bg-gray-200"}`} />}
                </div>
              ))}
            </div>

            {step === 1 && (
              <Card>
                <CardHeader>
                  <CardTitle>Contact Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="firstName">First Name *</Label>
                      <Input id="firstName" value={customerInfo.firstName} onChange={(e) => setCustomerInfo({ ...customerInfo, firstName: e.target.value })} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="lastName">Last Name *</Label>
                      <Input id="lastName" value={customerInfo.lastName} onChange={(e) => setCustomerInfo({ ...customerInfo, lastName: e.target.value })} />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">Email Address *</Label>
                    <Input id="email" type="email" value={customerInfo.email} onChange={(e) => setCustomerInfo({ ...customerInfo, email: e.target.value })} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="phone">Phone Number</Label>
                    <Input id="phone" type="tel" value={customerInfo.phone} onChange={(e) => setCustomerInfo({ ...customerInfo, phone: e.target.value })} />
                  </div>
                  <Button onClick={handleSubmitCustomerInfo} className="w-full" size="lg">Continue to Shipping</Button>
                </CardContent>
              </Card>
            )}

            {step === 2 && (
              <Card>
                <CardHeader>
                  <CardTitle>Shipping Address</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="address">Street Address *</Label>
                    <Input id="address" value={shippingInfo.address} onChange={(e) => setShippingInfo({ ...shippingInfo, address: e.target.value })} />
                  </div>
                  <div className="grid sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="city">City *</Label>
                      <Input id="city" value={shippingInfo.city} onChange={(e) => setShippingInfo({ ...shippingInfo, city: e.target.value })} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="state">State *</Label>
                      <Input id="state" value={shippingInfo.state} onChange={(e) => setShippingInfo({ ...shippingInfo, state: e.target.value })} />
                    </div>
                  </div>
                  <div className="grid sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="zipCode">ZIP Code *</Label>
                      <Input id="zipCode" value={shippingInfo.zipCode} onChange={(e) => setShippingInfo({ ...shippingInfo, zipCode: e.target.value })} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="country">Country *</Label>
                      <Select value={shippingInfo.country} onValueChange={(value: string) => setShippingInfo({ ...shippingInfo, country: value })}>
                        <SelectTrigger id="country">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="United States">United States</SelectItem>
                          <SelectItem value="Canada">Canada</SelectItem>
                          <SelectItem value="United Kingdom">United Kingdom</SelectItem>
                          <SelectItem value="Australia">Australia</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="flex gap-4">
                    <Button variant="outline" className="flex-1" onClick={() => setStep(1)}>Back</Button>
                    <Button onClick={handleSubmitShippingInfo} className="flex-1" size="lg">Continue to Payment</Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {step === 3 && (
              <Card>
                <CardHeader>
                  <CardTitle>Payment Method</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <RadioGroup value={paymentMethod} onValueChange={setPaymentMethod}>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="card" id="card" />
                      <Label htmlFor="card" className="cursor-pointer">Credit/Debit Card</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="paypal" id="paypal" />
                      <Label htmlFor="paypal" className="cursor-pointer">PayPal</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="apple-pay" id="apple-pay" />
                      <Label htmlFor="apple-pay" className="cursor-pointer">Apple Pay</Label>
                    </div>
                  </RadioGroup>

                  {paymentMethod === "card" && (
                    <div className="space-y-4 pt-4">
                      <div className="space-y-2">
                        <Label htmlFor="cardNumber">Card Number *</Label>
                        <Input id="cardNumber" placeholder="1234 5678 9012 3456" value={paymentInfo.cardNumber} onChange={(e) => setPaymentInfo({ ...paymentInfo, cardNumber: e.target.value })} maxLength={19} />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="cardName">Cardholder Name *</Label>
                        <Input id="cardName" placeholder="John Doe" value={paymentInfo.cardName} onChange={(e) => setPaymentInfo({ ...paymentInfo, cardName: e.target.value })} />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="expiryDate">Expiry Date *</Label>
                          <Input id="expiryDate" placeholder="MM/YY" value={paymentInfo.expiryDate} onChange={(e) => setPaymentInfo({ ...paymentInfo, expiryDate: e.target.value })} maxLength={5} />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="cvv">CVV *</Label>
                          <Input id="cvv" placeholder="123" value={paymentInfo.cvv} onChange={(e) => setPaymentInfo({ ...paymentInfo, cvv: e.target.value })} maxLength={4} />
                        </div>
                      </div>
                    </div>
                  )}

                  {paymentMethod === "paypal" && (
                    <div className="bg-gray-50 p-4 rounded-lg text-center">
                      <p className="text-sm text-gray-600">You will be redirected to PayPal to complete your purchase.</p>
                    </div>
                  )}

                  {paymentMethod === "apple-pay" && (
                    <div className="bg-gray-50 p-4 rounded-lg text-center">
                      <p className="text-sm text-gray-600">You will be prompted to authorize payment with Apple Pay.</p>
                    </div>
                  )}

                  <div className="flex gap-4 pt-4">
                    <Button variant="outline" className="flex-1" onClick={() => setStep(2)} disabled={isProcessing}>Back</Button>
                    <Button onClick={handleSubmitPayment} className="flex-1" size="lg" disabled={isProcessing}>
                      {isProcessing ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Processing...
                        </>
                      ) : (
                        `Place Order $${total.toFixed(2)}`
                      )}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          <div className="lg:col-span-1">
            <Card className="sticky top-24">
              <CardHeader>
                <CardTitle>Order Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  {items.map((item, idx) => (
                    <div key={`${item.id}-${item.variantId}-${idx}`} className="flex gap-3">
                      <div className="relative w-16 h-16 rounded-md overflow-hidden bg-gray-100 flex-shrink-0">
                        <ImageWithFallback src={item.image} alt={item.name} className="w-full h-full object-cover" />
                        <div className="absolute -top-2 -right-2 bg-gray-800 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">{item.quantity}</div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{item.name}</p>
                        {item.selectedSize && <p className="text-xs text-gray-500">Size: {item.selectedSize}</p>}
                        {item.selectedColor && <p className="text-xs text-gray-500">Color: {item.selectedColor}</p>}
                        <p className="text-sm font-semibold mt-1">${(item.price * item.quantity).toFixed(2)}</p>
                      </div>
                    </div>
                  ))}
                </div>

                <Separator />

                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Subtotal</span>
                    <span className="font-medium">${subtotal.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Shipping</span>
                    <span className="font-medium text-green-600">{shipping === 0 ? "FREE" : `$${shipping.toFixed(2)}`}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Tax</span>
                    <span className="font-medium">${tax.toFixed(2)}</span>
                  </div>
                  <Separator />
                  <div className="flex justify-between text-lg font-bold">
                    <span>Total</span>
                    <span>${total.toFixed(2)}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}