import React from "react";
import { useParams, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, XCircle, Loader2, ArrowLeft, ShieldCheck, Store, User, Receipt, Calendar, CreditCard } from "lucide-react";

export default function InvoiceVerifyPage() {
  const params = useParams<{ token: string }>();
  const token = params.token;
  const [, setLocation] = useLocation();

  const { data, isLoading, error } = useQuery({
    queryKey: ["/api/invoices/verify", token],
    queryFn: async () => {
      const res = await fetch(`/api/invoices/verify/${token}`);
      if (!res.ok) {
        throw new Error("Invalid or unverified invoice token");
      }
      return res.json();
    },
    enabled: !!token,
  });

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center items-center p-4">
      <div className="max-w-md w-full">
        {/* Logo / Header */}
        <div className="text-center mb-6">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setLocation("/")}
            className="mb-4 text-xs text-gray-500 hover:text-gray-900"
          >
            <ArrowLeft className="w-3.5 h-3.5 mr-1" /> Return to TIFO Home
          </Button>
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-red-100 text-red-600 mb-2">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <h1 className="text-2xl font-black text-gray-900 tracking-tight">TIFO Verification</h1>
          <p className="text-xs text-gray-500">Official Invoice Authenticity Portal</p>
        </div>

        {isLoading ? (
          <Card className="p-8 text-center bg-white shadow-sm border-gray-200">
            <Loader2 className="w-8 h-8 text-red-600 animate-spin mx-auto mb-3" />
            <p className="text-sm font-semibold text-gray-700">Verifying Invoice Signature...</p>
          </Card>
        ) : error || !data?.authentic ? (
          <Card className="bg-white border-red-200 shadow-sm text-center p-6">
            <XCircle className="w-12 h-12 text-red-500 mx-auto mb-3" />
            <h2 className="text-lg font-bold text-gray-900 mb-1">Invoice Unverified</h2>
            <p className="text-xs text-gray-500 mb-4">
              This invoice token is invalid, expired, or does not exist in the official TIFO ledger.
            </p>
            <Badge variant="outline" className="border-red-200 text-red-700 bg-red-50 text-xs">
              TOKEN: {token?.slice(0, 16)}...
            </Badge>
          </Card>
        ) : (
          <Card className="bg-white border-emerald-200 shadow-md overflow-hidden">
            {/* Authenticity Banner */}
            <div className="bg-emerald-600 text-white p-4 text-center">
              <CheckCircle2 className="w-10 h-10 mx-auto mb-1 text-white" />
              <h2 className="text-base font-bold uppercase tracking-wider">Authentic Invoice Verified</h2>
              <p className="text-xs text-emerald-100">Issued & Verified by TIFO India</p>
            </div>

            <CardContent className="p-5 space-y-4 text-xs">
              {/* Invoice Numbers */}
              <div className="bg-gray-50 p-3 rounded-lg border flex justify-between items-center">
                <div>
                  <span className="text-[10px] text-gray-400 font-bold uppercase">Invoice No</span>
                  <p className="font-bold text-sm text-gray-900">{data.invoiceNumber}</p>
                </div>
                <div className="text-right">
                  <span className="text-[10px] text-gray-400 font-bold uppercase">Order ID</span>
                  <p className="font-semibold text-gray-700">#{data.orderId}</p>
                </div>
              </div>

              {/* Parties */}
              <div className="grid grid-cols-2 gap-3 border-b pb-3">
                <div>
                  <span className="text-[10px] text-red-700 font-bold uppercase flex items-center gap-1 mb-0.5">
                    <Store className="w-3 h-3" /> Seller Kitchen
                  </span>
                  <p className="font-bold text-gray-800">{data.shopName}</p>
                </div>
                <div>
                  <span className="text-[10px] text-red-700 font-bold uppercase flex items-center gap-1 mb-0.5">
                    <User className="w-3 h-3" /> Customer
                  </span>
                  <p className="font-bold text-gray-800">{data.customerName}</p>
                </div>
              </div>

              {/* Items & Payment */}
              <div className="space-y-2">
                <div className="flex justify-between items-center text-gray-700">
                  <span className="font-semibold text-gray-900">{data.tiffinTitle}</span>
                  <span>Qty: {data.quantity}</span>
                </div>

                <div className="flex justify-between items-center border-t pt-2 text-sm font-bold text-gray-900">
                  <span>Grand Total</span>
                  <span className="text-red-700 text-base">₹{data.totalPrice}</span>
                </div>

                <div className="flex justify-between items-center pt-1 text-[11px] text-gray-500">
                  <span className="flex items-center gap-1">
                    <CreditCard className="w-3 h-3" /> Payment Method:
                  </span>
                  <Badge className="bg-emerald-100 text-emerald-800 hover:bg-emerald-100 border-emerald-200">
                    {data.paymentMethod?.toUpperCase()} ({data.paymentStatus})
                  </Badge>
                </div>

                <div className="flex justify-between items-center text-[10px] text-gray-400 pt-1">
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3 h-3" /> Issued Date:
                  </span>
                  <span>{new Date(data.issuedAt).toLocaleString("en-IN")}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        <div className="text-center mt-6 text-[10px] text-gray-400">
          © {new Date().getFullYear()} TIFO Delivery Services. All rights reserved.
        </div>
      </div>
    </div>
  );
}
