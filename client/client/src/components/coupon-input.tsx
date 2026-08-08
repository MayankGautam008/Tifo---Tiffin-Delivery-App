// src/components/coupon-input.tsx
import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Check, X, Tag, IndianRupee, Percent } from "lucide-react";

interface CouponValidation {
  isValid: boolean;
  coupon?: {
    code: string;
    discountType: "fixed" | "percentage";
    discountValue: number;
    maxDiscountAmount?: number;
  };
  discountAmount: number;
  message: string;
}

interface CouponInputProps {
  onCouponApplied: (coupon: CouponValidation) => void;
  onCouponRemoved: () => void;
  totalAmount: number;
}

const apiRequest = async (method: string, url: string, data?: any) => {
  const token = localStorage.getItem("token");
  const response = await fetch(url, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(token && { Authorization: `Bearer ${token}` }),
    },
    ...(data && { body: JSON.stringify(data) }),
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
  }

  return await response.json();
};

export function CouponInput({ onCouponApplied, onCouponRemoved, totalAmount }: CouponInputProps) {
  const { toast } = useToast();
  const [couponCode, setCouponCode] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState<CouponValidation | null>(null);
  const [isApplying, setIsApplying] = useState(false);

  const validateMutation = useMutation({
    mutationFn: (data: { couponCode: string; totalAmount: number }) =>
      apiRequest("POST", "/api/coupons/validate", data),
    onSuccess: (data: CouponValidation) => {
      if (data.isValid) {
        setAppliedCoupon(data);
        onCouponApplied(data);
        toast({
          title: "Coupon Applied!",
          description: data.message,
        });
      } else {
        toast({
          title: "Invalid Coupon",
          description: data.message,
          variant: "destructive",
        });
      }
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
    onSettled: () => {
      setIsApplying(false);
    },
  });

  const handleApplyCoupon = () => {
    if (!couponCode.trim()) {
      toast({
        title: "Enter Coupon Code",
        description: "Please enter a coupon code",
        variant: "destructive",
      });
      return;
    }

    setIsApplying(true);
    validateMutation.mutate({
      couponCode: couponCode.trim(),
      totalAmount,
    });
  };

  const handleRemoveCoupon = () => {
    setAppliedCoupon(null);
    setCouponCode("");
    onCouponRemoved();
    toast({
      title: "Coupon Removed",
      description: "Coupon has been removed from your order",
    });
  };

  const getDiscountText = (coupon: CouponValidation) => {
    if (!coupon.coupon) return "";

    if (coupon.coupon.discountType === "fixed") {
      return `₹${coupon.coupon.discountValue} OFF`;
    } else {
      return `${coupon.coupon.discountValue}% OFF (Max ₹${coupon.coupon.maxDiscountAmount})`;
    }
  };

  return (
    <Card>
      <CardContent className="p-4">
        {appliedCoupon ? (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="flex items-center gap-1">
                  <Tag className="w-3 h-3" />
                  {appliedCoupon.coupon?.code}
                </Badge>
                <span className="text-sm text-green-600 font-medium">
                  {getDiscountText(appliedCoupon)}
                </span>
              </div>
              <Button variant="ghost" size="sm" onClick={handleRemoveCoupon}>
                <X className="w-4 h-4" />
              </Button>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span>Discount Applied:</span>
              <span className="text-green-600 font-semibold">
                -₹{appliedCoupon.discountAmount}
              </span>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Input
                placeholder="Enter coupon code"
                value={couponCode}
                onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                className="flex-1"
              />
              <Button
                onClick={handleApplyCoupon}
                disabled={isApplying || !couponCode.trim()}
                size="sm"
              >
                {isApplying ? "Applying..." : "Apply"}
              </Button>
            </div>
            <div className="text-xs text-muted-foreground">
              Enter your coupon code to get discounts on your order
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}