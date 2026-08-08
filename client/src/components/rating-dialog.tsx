import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Star, Copy, Check } from "lucide-react";

interface RatingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  booking: any;
  seller: any;
}

export function RatingDialog({ open, onOpenChange, booking, seller }: RatingDialogProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [comment, setComment] = useState("");
  const [showCoupon, setShowCoupon] = useState(false);
  const [copied, setCopied] = useState(false);

  // ✅ FIX: Safe seller data access
  const sellerName = seller?.shopName || "Seller";
  const orderId = booking?._id ? booking._id.slice(-8) : "Unknown";
  const couponCode = "SHASHANK50";

  const submitRatingMutation = useMutation({
    mutationFn: async (data: any) => {
      // ✅ FIX: Check if seller exists before submitting
      if (!seller?._id) {
        throw new Error("Seller information not available");
      }

      const response = await fetch("/api/reviews", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
        body: JSON.stringify(data),
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message);
      }
      
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Rating Submitted",
        description: "Thank you for your feedback!",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/bookings/customer"] });
      queryClient.invalidateQueries({ queryKey: ["/api/reviews/my-reviews"] });
      
      // Show coupon after successful rating submission
      setShowCoupon(true);
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to submit rating",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleSubmit = () => {
    if (rating === 0) {
      toast({
        title: "Please select a rating",
        variant: "destructive",
      });
      return;
    }

    // ✅ FIX: Check if seller exists
    if (!seller?._id) {
      toast({
        title: "Error",
        description: "Seller information not available",
        variant: "destructive",
      });
      return;
    }

    submitRatingMutation.mutate({
      sellerId: seller._id,
      bookingId: booking?._id,
      rating,
      comment: comment.trim() || undefined,
    });
  };

  const copyCouponCode = () => {
    navigator.clipboard.writeText(couponCode);
    setCopied(true);
    toast({
      title: "Coupon Copied!",
      description: "SHASHANK50 has been copied to clipboard",
    });
    
    setTimeout(() => {
      setCopied(false);
    }, 2000);
  };

  const handleClose = () => {
    setShowCoupon(false);
    setRating(0);
    setComment("");
    setCopied(false);
    onOpenChange(false);
  };

  const StarRating = () => {
    return (
      <div className="flex gap-1 justify-center my-4">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            className="focus:outline-none transition-transform hover:scale-110"
            onClick={() => setRating(star)}
            onMouseEnter={() => setHoverRating(star)}
            onMouseLeave={() => setHoverRating(0)}
          >
            <Star
              className={`w-10 h-10 ${
                star <= (hoverRating || rating)
                  ? "text-yellow-400 fill-yellow-400"
                  : "text-gray-300"
              } transition-colors`}
            />
          </button>
        ))}
      </div>
    );
  };

  const getRatingText = (rating: number) => {
    switch (rating) {
      case 1: return "Poor";
      case 2: return "Fair";
      case 3: return "Good";
      case 4: return "Very Good";
      case 5: return "Excellent";
      default: return "Tap a star to rate";
    }
  };

  const CouponSection = () => (
    <div className="bg-gradient-to-r from-yellow-50 to-orange-50 border-2 border-dashed border-yellow-300 rounded-lg p-4 mt-4">
      <div className="text-center">
        <h3 className="font-bold text-lg text-green-600 mb-2">🎉 Thank You for Your Feedback!</h3>
        <p className="text-sm text-gray-600 mb-3">
          As a token of appreciation, here's a special discount for your next order
        </p>
        
        <div className="bg-white border-2 border-yellow-400 rounded-lg p-3 mb-3">
          <div className="flex items-center justify-between">
            <span className="font-mono text-lg font-bold text-gray-800">{couponCode}</span>
            <Button
              variant="outline"
              size="sm"
              onClick={copyCouponCode}
              className="ml-2"
            >
              {copied ? <Check className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4" />}
            </Button>
          </div>
        </div>
        
        <p className="text-xs text-gray-500">
          Use this code at checkout to get discount on your next order
        </p>
      </div>
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-center">
            {showCoupon ? "Special Offer For You!" : "Rate Your Experience"}
          </DialogTitle>
        </DialogHeader>
        
        {showCoupon ? (
          <CouponSection />
        ) : (
          <div className="text-center space-y-4">
            <div>
              {/* ✅ FIX: Safe seller name access */}
              <h3 className="font-semibold text-lg">{sellerName}</h3>
              <p className="text-sm text-muted-foreground">
                Order #{orderId}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                How was your experience with this seller?
              </p>
            </div>

            <StarRating />

            <div className="text-lg font-semibold text-yellow-600">
              {getRatingText(rating)}
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Optional Feedback</label>
              <Textarea
                placeholder="Share your experience (optional)..."
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                className="resize-none"
                rows={3}
              />
            </div>

            <div className="flex gap-2 pt-2">
              <Button
                variant="outline"
                onClick={handleClose}
                className="flex-1"
                disabled={submitRatingMutation.isPending}
              >
                Cancel
              </Button>
              <Button
                onClick={handleSubmit}
                className="flex-1 bg-yellow-500 hover:bg-yellow-600"
                disabled={submitRatingMutation.isPending || rating === 0}
              >
                {submitRatingMutation.isPending ? "Submitting..." : "Submit Rating"}
              </Button>
            </div>
          </div>
        )}

        {showCoupon && (
          <div className="flex justify-center pt-2">
            <Button
              onClick={handleClose}
              className="bg-green-600 hover:bg-green-700"
            >
              Continue Shopping
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}