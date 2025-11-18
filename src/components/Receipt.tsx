import { useEffect, useState } from "react";
import { Check, Printer, ArrowLeft, Package, MapPin, Mail, Calendar } from "lucide-react";
import { Button } from "./ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Separator } from "./ui/separator";
import { Badge } from "./ui/badge";
import { supabase } from "../../lib/initSupabase";
import { toast } from "sonner";

interface ReceiptProps {
  orderId: string;
  onBackToStore: () => void;
}

interface OrderReceipt {
  orderid: string;
  ordertimestamp: string;
  status: string;
  customername: string;
  customeremail: string;
  shippingaddress: string;
  subtotal: number;
  shippingcost: number;
  totalamount: number;
}

interface OrderItem {
  productname: string;
  sizename: string | null;
  colorname: string | null;
  quantity: number;
  unitprice: number;
  subtotal: number;
}

export function Receipt({ orderId, onBackToStore }: ReceiptProps) {
  const [receipt, setReceipt] = useState<OrderReceipt | null>(null);
  const [items, setItems] = useState<OrderItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchOrderDetails();
  }, [orderId]);

  const fetchOrderDetails = async () => {
    try {
      setLoading(true);

      // Fetch order receipt
      const { data: receiptData, error: receiptError } = await supabase
        .rpc('get_order_receipt', { p_orderid: orderId });

      if (receiptError) {
        console.error('Receipt error:', receiptError);
        toast.error('Failed to load order details');
        return;
      }

      if (receiptData && receiptData.length > 0) {
        setReceipt(receiptData[0]);
      }

      // Fetch order items
      const { data: itemsData, error: itemsError } = await supabase
        .rpc('get_order_items_with_variants', { p_orderid: orderId });

      if (itemsError) {
        console.error('Items error:', itemsError);
        toast.error('Failed to load order items');
        return;
      }

      if (itemsData) {
        setItems(itemsData);
      }

    } catch (error) {
      console.error('Error fetching order:', error);
      toast.error('An error occurred while loading your receipt');
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'paid':
        return 'bg-green-100 text-green-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'processing':
        return 'bg-blue-100 text-blue-800';
      case 'shipped':
        return 'bg-purple-100 text-purple-800';
      case 'delivered':
        return 'bg-green-100 text-green-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-current border-r-transparent"></div>
          <p className="mt-4 text-gray-500">Loading your receipt...</p>
        </div>
      </div>
    );
  }

  if (!receipt) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-500">Order not found</p>
          <Button onClick={onBackToStore} className="mt-4">
            Back to Store
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header - Hide on print */}
      <header className="bg-white border-b print:hidden">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button variant="ghost" onClick={onBackToStore}>
                <ArrowLeft className="h-5 w-5 mr-2" />
                Back to Store
              </Button>
            </div>
            <Button variant="outline" onClick={handlePrint}>
              <Printer className="h-4 w-4 mr-2" />
              Print Receipt
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Success Message */}
        <div className="bg-white rounded-lg shadow-sm p-8 mb-6 text-center print:shadow-none">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Check className="h-8 w-8 text-green-600" />
          </div>
          <h1 className="text-3xl font-bold mb-2">Order Confirmed!</h1>
          <p className="text-gray-600 mb-4">
            Thank you for your purchase. Your order has been received and is being processed.
          </p>
          <div className="flex items-center justify-center gap-2 text-sm text-gray-500">
            <span>Order #:</span>
            <code className="bg-gray-100 px-2 py-1 rounded font-mono text-xs">
              {receipt.orderid.slice(0, 8).toUpperCase()}
            </code>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-6 mb-6">
          {/* Order Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5" />
                Order Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-start gap-3">
                <Calendar className="h-4 w-4 text-gray-400 mt-0.5" />
                <div>
                  <p className="text-sm text-gray-500">Order Date</p>
                  <p className="font-medium">{formatDate(receipt.ordertimestamp)}</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Package className="h-4 w-4 text-gray-400 mt-0.5" />
                <div>
                  <p className="text-sm text-gray-500">Status</p>
                  <Badge className={getStatusColor(receipt.status)}>
                    {receipt.status.charAt(0).toUpperCase() + receipt.status.slice(1)}
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Customer Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Mail className="h-5 w-5" />
                Customer Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-start gap-3">
                <Mail className="h-4 w-4 text-gray-400 mt-0.5" />
                <div>
                  <p className="text-sm text-gray-500">Name</p>
                  <p className="font-medium">{receipt.customername}</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Mail className="h-4 w-4 text-gray-400 mt-0.5" />
                <div>
                  <p className="text-sm text-gray-500">Email</p>
                  <p className="font-medium">{receipt.customeremail}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Shipping Address */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="h-5 w-5" />
              Shipping Address
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-700">{receipt.shippingaddress}</p>
          </CardContent>
        </Card>

        {/* Order Items */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Order Items</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {items.map((item, index) => (
                <div key={index} className="flex justify-between items-start pb-4 border-b last:border-b-0">
                  <div className="flex-1">
                    <p className="font-medium">{item.productname}</p>
                    <div className="flex gap-4 text-sm text-gray-500 mt-1">
                      {item.sizename && <span>Size: {item.sizename}</span>}
                      {item.colorname && <span>Color: {item.colorname}</span>}
                      <span>Qty: {item.quantity}</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-medium">${item.subtotal.toFixed(2)}</p>
                    <p className="text-sm text-gray-500">${item.unitprice.toFixed(2)} each</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Order Summary */}
        <Card>
          <CardHeader>
            <CardTitle>Order Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Subtotal</span>
                <span className="font-medium">${receipt.subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Shipping</span>
                <span className="font-medium text-green-600">
                  {receipt.shippingcost === 0 ? 'FREE' : `$${receipt.shippingcost.toFixed(2)}`}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Tax</span>
                <span className="font-medium">
                  ${(receipt.totalamount - receipt.subtotal - receipt.shippingcost).toFixed(2)}
                </span>
              </div>
              <Separator className="my-2" />
              <div className="flex justify-between text-lg font-bold">
                <span>Total</span>
                <span>${receipt.totalamount.toFixed(2)}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Footer Message */}
        <div className="mt-8 text-center text-gray-500 text-sm print:mt-4">
          <p>A confirmation email has been sent to {receipt.customeremail}</p>
          <p className="mt-2">
            If you have any questions, please contact our support team.
          </p>
        </div>
      </main>
    </div>
  );
}