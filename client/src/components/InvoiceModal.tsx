import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { apiRequest } from "@/lib/queryClient";
import {
  Printer,
  Download,
  Receipt,
  FileText,
  CheckCircle2,
  AlertCircle,
  Loader2,
  QrCode,
  Store,
  User,
  Calendar,
  CreditCard,
} from "lucide-react";

interface InvoiceModalProps {
  bookingId: string;
  isOpen: boolean;
  onClose: () => void;
  defaultTab?: "a4" | "thermal";
}

export function InvoiceModal({
  bookingId,
  isOpen,
  onClose,
  defaultTab = "a4",
}: InvoiceModalProps) {
  const [activeTab, setActiveTab] = useState<"a4" | "thermal">(defaultTab);
  const [thermalWidth, setThermalWidth] = useState<"58mm" | "80mm">("80mm");
  const [isDownloading, setIsDownloading] = useState(false);

  // Fetch invoice details
  const { data: invoice, isLoading, error } = useQuery({
    queryKey: ["/api/invoices/booking", bookingId],
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/invoices/booking/${bookingId}`);
      return res.json();
    },
    enabled: isOpen && !!bookingId,
  });

  const handleDownloadPDF = async () => {
    if (!invoice?._id) return;
    try {
      setIsDownloading(true);
      const token = localStorage.getItem("token"); // or token from auth
      const response = await fetch(`/api/invoices/${invoice._id}/pdf`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) throw new Error("Failed to download PDF");

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `Invoice_${invoice.invoiceNumber}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error("PDF Download error:", err);
      alert("Failed to download PDF. Please try again.");
    } finally {
      setIsDownloading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto p-4 sm:p-6 printable-dialog">
        <DialogHeader className="no-print">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b pb-3">
            <div>
              <DialogTitle className="text-xl font-bold flex items-center gap-2">
                <Receipt className="w-5 h-5 text-red-600" />
                Tax Invoice & Bill
              </DialogTitle>
              <DialogDescription className="text-xs text-gray-500">
                Official computer-generated invoice for Order #{invoice?.orderId || bookingId.slice(-8)}
              </DialogDescription>
            </div>
            {invoice && (
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleDownloadPDF}
                  disabled={isDownloading}
                  className="text-xs gap-1.5"
                >
                  {isDownloading ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Download className="w-3.5 h-3.5 text-blue-600" />
                  )}
                  Download PDF
                </Button>
                <Button
                  size="sm"
                  onClick={handlePrint}
                  className="bg-red-600 hover:bg-red-700 text-white text-xs gap-1.5"
                >
                  <Printer className="w-3.5 h-3.5" />
                  Print {activeTab === "thermal" ? "Parchi" : "Invoice"}
                </Button>
              </div>
            )}
          </div>
        </DialogHeader>

        {isLoading ? (
          <div className="py-12 flex flex-col items-center justify-center gap-3">
            <Loader2 className="w-8 h-8 text-red-600 animate-spin" />
            <p className="text-sm text-gray-500 font-medium">Generating & fetching invoice details...</p>
          </div>
        ) : error || !invoice ? (
          <div className="py-8 flex flex-col items-center justify-center gap-2 text-center">
            <AlertCircle className="w-10 h-10 text-amber-500" />
            <p className="text-base font-semibold text-gray-800">Invoice Unavailable</p>
            <p className="text-xs text-gray-500 max-w-md">
              {(error as Error)?.message || "Invoice is generated after the seller confirms your order."}
            </p>
          </div>
        ) : (
          <div>
            {/* View Selector & Thermal Size Switcher */}
            <div className="no-print mb-4 flex flex-wrap items-center justify-between gap-3 bg-gray-50 p-2.5 rounded-lg border">
              <Tabs
                value={activeTab}
                onValueChange={(v) => setActiveTab(v as "a4" | "thermal")}
                className="w-full sm:w-auto"
              >
                <TabsList className="grid grid-cols-2 text-xs">
                  <TabsTrigger value="a4" className="gap-1.5 text-xs">
                    <FileText className="w-3.5 h-3.5" /> Standard A4 Invoice
                  </TabsTrigger>
                  <TabsTrigger value="thermal" className="gap-1.5 text-xs">
                    <Receipt className="w-3.5 h-3.5" /> Thermal Receipt (Parchi)
                  </TabsTrigger>
                </TabsList>
              </Tabs>

              {activeTab === "thermal" && (
                <div className="flex items-center gap-2 text-xs">
                  <span className="text-gray-500 font-medium">Paper Width:</span>
                  <div className="inline-flex rounded-md shadow-sm border bg-white p-0.5">
                    <button
                      onClick={() => setThermalWidth("58mm")}
                      className={`px-2 py-1 text-xs rounded font-medium transition-colors ${
                        thermalWidth === "58mm"
                          ? "bg-red-600 text-white"
                          : "text-gray-600 hover:bg-gray-100"
                      }`}
                    >
                      58mm (2 inch)
                    </button>
                    <button
                      onClick={() => setThermalWidth("80mm")}
                      className={`px-2 py-1 text-xs rounded font-medium transition-colors ${
                        thermalWidth === "80mm"
                          ? "bg-red-600 text-white"
                          : "text-gray-600 hover:bg-gray-100"
                      }`}
                    >
                      80mm (3 inch)
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* TAB CONTENT: Standard A4 Invoice */}
            {activeTab === "a4" && (
              <div id="printable-a4-area" className="printable-area bg-white p-4 sm:p-6 border rounded-xl shadow-sm text-gray-800">
                {/* Header */}
                <div className="flex flex-col sm:flex-row justify-between items-start border-b pb-4 gap-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-2xl font-black tracking-tight text-red-600">TIFO</span>
                      <Badge variant="outline" className="text-[10px] uppercase border-red-200 text-red-700 bg-red-50">
                        TAX INVOICE
                      </Badge>
                    </div>
                    <p className="text-xs text-gray-500 mt-1 font-medium">Fresh Homemade Meals Delivered Daily</p>
                    <p className="text-xs text-gray-400">www.tifoindia.com</p>
                  </div>

                  <div className="text-left sm:text-right">
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Invoice No</p>
                    <p className="text-sm font-bold text-gray-900">{invoice.invoiceNumber}</p>
                    <div className="mt-1 flex flex-wrap items-center gap-2 sm:justify-end text-xs text-gray-500">
                      <span>Date: {new Date(invoice.issuedAt).toLocaleDateString("en-IN", { day: '2-digit', month: 'short', year: 'numeric' })}</span>
                      <span>•</span>
                      <span>Order #{invoice.orderId}</span>
                    </div>
                    <div className="mt-1.5">
                      <Badge className={invoice.paymentStatus === "Paid" ? "bg-emerald-600 text-white" : "bg-amber-500 text-white"}>
                        {invoice.paymentMethod.toUpperCase()} — {invoice.paymentStatus}
                      </Badge>
                    </div>
                  </div>
                </div>

                {/* Seller & Customer Details Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 my-4 p-3 bg-gray-50 rounded-lg border text-xs">
                  {/* Seller Details */}
                  <div className="space-y-1">
                    <div className="flex items-center gap-1.5 text-red-700 font-bold uppercase tracking-wider text-[11px]">
                      <Store className="w-3.5 h-3.5" /> Seller / Kitchen Details
                    </div>
                    <p className="font-bold text-gray-900 text-sm">{invoice.shopName}</p>
                    <p className="text-gray-600">Phone: {invoice.sellerPhone}</p>
                    <p className="text-gray-600">Address: {invoice.sellerAddress}</p>
                    <p className="text-gray-600">City: {invoice.sellerCity}</p>
                  </div>

                  {/* Customer Details */}
                  <div className="space-y-1 sm:border-l sm:pl-4">
                    <div className="flex items-center gap-1.5 text-red-700 font-bold uppercase tracking-wider text-[11px]">
                      <User className="w-3.5 h-3.5" /> Customer Billed To
                    </div>
                    <p className="font-bold text-gray-900 text-sm">{invoice.customerName}</p>
                    <p className="text-gray-600">Email: {invoice.customerEmail}</p>
                    <p className="text-gray-600">Phone: {invoice.customerPhone}</p>
                    <p className="text-gray-600">Address: {invoice.customerAddress}, {invoice.customerCity}</p>
                  </div>
                </div>

                {/* Items Table */}
                <div className="overflow-x-auto my-4">
                  <table className="w-full text-xs text-left border-collapse">
                    <thead>
                      <tr className="bg-red-600 text-white font-semibold uppercase text-[11px]">
                        <th className="p-2.5 rounded-tl-md">Item Description</th>
                        <th className="p-2.5">Booking Type</th>
                        <th className="p-2.5 text-center">Qty</th>
                        <th className="p-2.5 text-right">Unit Price</th>
                        <th className="p-2.5 text-right rounded-tr-md">Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y border-b">
                      {/* Main Item */}
                      <tr className="bg-white">
                        <td className="p-2.5 font-bold text-gray-900">
                          {invoice.tiffinTitle}
                          {invoice.tiffinSlotType && (
                            <span className="block text-[10px] font-normal text-gray-500 capitalize">
                              Slot: {invoice.tiffinSlotType} ({invoice.slot})
                            </span>
                          )}
                        </td>
                        <td className="p-2.5 text-gray-600 capitalize">{invoice.bookingType}</td>
                        <td className="p-2.5 text-center font-medium text-gray-800">{invoice.quantity}</td>
                        <td className="p-2.5 text-right text-gray-600">₹{invoice.pricingBreakdown.basePrice}</td>
                        <td className="p-2.5 text-right font-bold text-gray-900">₹{invoice.pricingBreakdown.basePrice}</td>
                      </tr>

                      {/* Add-ons */}
                      {invoice.addOns?.map((addOn: any, idx: number) => (
                        <tr key={`addon-${idx}`} className="bg-gray-50 text-[11px]">
                          <td className="p-2 pl-4 text-gray-700">Add-on: {addOn.name}</td>
                          <td className="p-2 text-gray-500">Extra Item</td>
                          <td className="p-2 text-center text-gray-700">{addOn.quantity}</td>
                          <td className="p-2 text-right text-gray-600">₹{addOn.price}</td>
                          <td className="p-2 text-right font-medium text-gray-900">₹{addOn.price * addOn.quantity}</td>
                        </tr>
                      ))}

                      {/* Customizations */}
                      {invoice.weeklyCustomizations?.map((custom: any, idx: number) => (
                        <tr key={`custom-${idx}`} className="bg-gray-50 text-[11px]">
                          <td className="p-2 pl-4 text-gray-700">
                            Customization: {custom.name} ({custom.days?.join(", ")})
                          </td>
                          <td className="p-2 text-gray-500">Weekly Add-on</td>
                          <td className="p-2 text-center text-gray-700">{custom.days?.length || 1} days</td>
                          <td className="p-2 text-right text-gray-600">₹{custom.price}</td>
                          <td className="p-2 text-right font-medium text-gray-900">₹{custom.price * (custom.days?.length || 1)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Special Instructions & Price Summary Footer */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-6 items-start">
                  {/* QR Code & Notes */}
                  <div className="space-y-3">
                    {invoice.customization && (
                      <div className="p-2.5 bg-amber-50 border border-amber-200 rounded-md text-xs">
                        <span className="font-bold text-amber-900">Customer Note:</span>
                        <p className="text-amber-800 italic mt-0.5">"{invoice.customization}"</p>
                      </div>
                    )}

                    <div className="flex items-center gap-3 p-2 bg-gray-50 border rounded-lg max-w-xs">
                      <div className="p-1 bg-white border rounded">
                        <QrCode className="w-12 h-12 text-gray-800" />
                      </div>
                      <div className="text-[10px] text-gray-500">
                        <p className="font-bold text-gray-700">Scan to Verify Invoice</p>
                        <p className="text-gray-400">Token: {invoice.qrVerificationToken?.slice(0, 12)}...</p>
                        <a
                          href={`/invoice/verify/${invoice.qrVerificationToken}`}
                          target="_blank"
                          rel="noreferrer"
                          className="text-red-600 font-semibold underline mt-0.5 block"
                        >
                          Public Verification Link
                        </a>
                      </div>
                    </div>
                  </div>

                  {/* Financial Breakdown Table */}
                  <div className="space-y-1.5 text-xs bg-gray-50 p-3 rounded-lg border">
                    <div className="flex justify-between text-gray-600 py-0.5">
                      <span>Base Items Subtotal:</span>
                      <span className="font-medium text-gray-800">
                        ₹{invoice.pricingBreakdown.subtotal - invoice.pricingBreakdown.deliveryCharge + invoice.pricingBreakdown.discountAmount}
                      </span>
                    </div>

                    {invoice.pricingBreakdown.addOnsTotal > 0 && (
                      <div className="flex justify-between text-gray-600 py-0.5">
                        <span>Add-ons Total:</span>
                        <span className="font-medium text-gray-800">+ ₹{invoice.pricingBreakdown.addOnsTotal}</span>
                      </div>
                    )}

                    {invoice.pricingBreakdown.customizationsTotal > 0 && (
                      <div className="flex justify-between text-gray-600 py-0.5">
                        <span>Customizations Total:</span>
                        <span className="font-medium text-gray-800">+ ₹{invoice.pricingBreakdown.customizationsTotal}</span>
                      </div>
                    )}

                    <div className="flex justify-between text-gray-600 py-0.5">
                      <span>Delivery Charge:</span>
                      <span className="font-medium text-gray-800">+ ₹{invoice.pricingBreakdown.deliveryCharge}</span>
                    </div>

                    {invoice.pricingBreakdown.discountAmount > 0 && (
                      <div className="flex justify-between text-emerald-600 font-medium py-0.5">
                        <span>Discount {invoice.pricingBreakdown.couponCode ? `(${invoice.pricingBreakdown.couponCode})` : ""}:</span>
                        <span>- ₹{invoice.pricingBreakdown.discountAmount}</span>
                      </div>
                    )}

                    <div className="border-t pt-2 mt-2 flex justify-between items-center text-sm font-bold text-gray-900">
                      <span className="text-red-700">Grand Total:</span>
                      <span className="text-base text-red-700">₹{invoice.pricingBreakdown.totalPrice}</span>
                    </div>
                  </div>
                </div>

                {/* Footer terms */}
                <div className="border-t mt-6 pt-3 text-center text-[10px] text-gray-400">
                  This is a computer-generated tax invoice and bill copy issued by TIFO India.
                </div>
              </div>
            )}

            {/* TAB CONTENT: Compact Thermal Receipt (58mm / 80mm Parchi) */}
            {activeTab === "thermal" && (
              <div className="flex justify-center my-2">
                <div
                  id="printable-thermal-area"
                  className={`printable-area thermal-receipt bg-white border border-dashed border-gray-400 p-3 font-mono text-[11px] leading-tight text-black shadow-sm ${
                    thermalWidth === "58mm" ? "w-[58mm] max-w-[58mm]" : "w-[80mm] max-w-[80mm]"
                  }`}
                >
                  <div className="text-center border-b border-black pb-2 mb-2">
                    <p className="font-black text-sm uppercase">*** {invoice.shopName} ***</p>
                    <p className="text-[10px]">TIFO KITCHEN PARTNER</p>
                    <p className="text-[10px]">Phone: {invoice.sellerPhone}</p>
                    <p className="text-[10px]">{invoice.sellerCity}</p>
                  </div>

                  <div className="text-center border-b border-black pb-1 mb-2">
                    <p className="font-bold text-xs">ORDER KOT / PARCHI</p>
                    <p className="text-[10px]">Inv: #{invoice.invoiceNumber}</p>
                    <p className="text-[10px]">Order: #{invoice.orderId}</p>
                    <p className="text-[10px]">
                      Date: {new Date(invoice.issuedAt).toLocaleTimeString("en-IN", { hour: '2-digit', minute: '2-digit' })} ({new Date(invoice.issuedAt).toLocaleDateString()})
                    </p>
                  </div>

                  {/* Customer Info */}
                  <div className="border-b border-black pb-2 mb-2">
                    <p className="font-bold">CUSTOMER:</p>
                    <p className="font-bold text-xs">{invoice.customerName}</p>
                    <p>Ph: {invoice.customerPhone}</p>
                    <p className="text-[10px]">Addr: {invoice.customerAddress}</p>
                  </div>

                  {/* Items list */}
                  <div className="border-b border-black pb-2 mb-2">
                    <div className="flex justify-between font-bold border-b border-dashed border-black pb-1 mb-1">
                      <span>ITEM</span>
                      <span>QTY x AMT</span>
                    </div>

                    <div className="flex justify-between items-start font-bold">
                      <span className="max-w-[70%]">{invoice.tiffinTitle}</span>
                      <span>{invoice.quantity}x ₹{invoice.pricingBreakdown.basePrice}</span>
                    </div>
                    {invoice.tiffinSlotType && (
                      <p className="text-[10px] italic">Slot: {invoice.tiffinSlotType} ({invoice.slot})</p>
                    )}

                    {invoice.addOns?.map((a: any, i: number) => (
                      <div key={i} className="flex justify-between text-[10px] pl-1">
                        <span>+ {a.name}</span>
                        <span>{a.quantity}x ₹{a.price}</span>
                      </div>
                    ))}

                    {invoice.weeklyCustomizations?.map((c: any, i: number) => (
                      <div key={i} className="flex justify-between text-[10px] pl-1">
                        <span>+ {c.name}</span>
                        <span>₹{c.price * (c.days?.length || 1)}</span>
                      </div>
                    ))}
                  </div>

                  {invoice.customization && (
                    <div className="border-b border-black pb-1 mb-2 font-bold bg-gray-100 p-1">
                      <p className="text-[10px] uppercase">NOTE:</p>
                      <p className="text-[10px] italic">"{invoice.customization}"</p>
                    </div>
                  )}

                  {/* Totals */}
                  <div className="space-y-0.5 border-b border-black pb-2 mb-2">
                    <div className="flex justify-between">
                      <span>Subtotal:</span>
                      <span>₹{invoice.pricingBreakdown.subtotal}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Delivery:</span>
                      <span>₹{invoice.pricingBreakdown.deliveryCharge}</span>
                    </div>
                    {invoice.pricingBreakdown.discountAmount > 0 && (
                      <div className="flex justify-between">
                        <span>Discount:</span>
                        <span>-₹{invoice.pricingBreakdown.discountAmount}</span>
                      </div>
                    )}
                    <div className="flex justify-between font-bold text-xs border-t border-black pt-1 mt-1">
                      <span>TOTAL AMT:</span>
                      <span>₹{invoice.pricingBreakdown.totalPrice}</span>
                    </div>
                    <div className="text-center font-bold mt-1 bg-black text-white py-0.5 text-[10px]">
                      PAYMENT: {invoice.paymentMethod.toUpperCase()} ({invoice.paymentStatus.toUpperCase()})
                    </div>
                  </div>

                  <div className="text-center text-[9px]">
                    <p>*** THANK YOU ***</p>
                    <p>Powered by TIFO Delivery</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </DialogContent>

      {/* Print Media CSS Styles */}
      <style>{`
        @media print {
          body * {
            visibility: hidden !important;
          }
          .printable-dialog,
          .printable-dialog * {
            visibility: visible !important;
          }
          .no-print {
            display: none !important;
          }
          .printable-dialog {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            max-width: 100% !important;
            height: auto !important;
            margin: 0 !important;
            padding: 0 !important;
            box-shadow: none !important;
            border: none !important;
            background: white !important;
          }
          .printable-area {
            border: none !important;
            box-shadow: none !important;
          }
        }
      `}</style>
    </Dialog>
  );
}
