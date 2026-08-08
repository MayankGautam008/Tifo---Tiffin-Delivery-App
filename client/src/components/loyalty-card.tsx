import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Star, Gift, TrendingUp, Award, ChevronRight, Coins } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useAuth } from "@/lib/auth-context";

interface LoyaltyInfo {
  availablePoints: number;
  totalPoints: number;
  lifetimeEarned: number;
  tier: string;
  nextTierPoints?: number;
  redemptionRate: number; // points per rupee
}

const TIER_CONFIG: Record<string, { color: string; bg: string; icon: string; label: string }> = {
  Bronze: { color: "text-amber-700", bg: "bg-amber-50 border-amber-200", icon: "🥉", label: "Bronze" },
  Silver: { color: "text-slate-600", bg: "bg-slate-50 border-slate-200", icon: "🥈", label: "Silver" },
  Gold: { color: "text-yellow-700", bg: "bg-yellow-50 border-yellow-200", icon: "🥇", label: "Gold" },
  Platinum: { color: "text-purple-700", bg: "bg-purple-50 border-purple-200", icon: "💎", label: "Platinum" },
};

export function LoyaltyCard({ onRedeem }: { onRedeem?: (discount: number) => void }) {
  const { isAuthenticated, isCustomer } = useAuth();
  const { toast } = useToast();
  const [redeemPoints, setRedeemPoints] = useState("");
  const [showRedeem, setShowRedeem] = useState(false);

  const { data: loyalty, isLoading } = useQuery<LoyaltyInfo>({
    queryKey: ["/api/loyalty"],
    enabled: isAuthenticated && isCustomer,
  });

  const redeemMutation = useMutation({
    mutationFn: (points: number) =>
      apiRequest("POST", "/api/loyalty/redeem", { points }),
    onSuccess: (data: any) => {
      toast({
        title: "Points Redeemed! 🎁",
        description: `₹${data.discountAmount} discount applied to your order`,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/loyalty"] });
      if (onRedeem) onRedeem(data.discountAmount);
      setRedeemPoints("");
      setShowRedeem(false);
    },
    onError: (err: any) => {
      toast({
        title: "Redemption Failed",
        description: err.message,
        variant: "destructive",
      });
    },
  });

  if (!isAuthenticated || !isCustomer) return null;
  if (isLoading) {
    return (
      <Card className="animate-pulse border-yellow-200">
        <CardContent className="p-4">
          <div className="h-4 bg-yellow-100 rounded w-1/2 mb-2" />
          <div className="h-8 bg-yellow-100 rounded w-1/3" />
        </CardContent>
      </Card>
    );
  }
  if (!loyalty) return null;

  const tier = TIER_CONFIG[loyalty.tier] ?? TIER_CONFIG.Bronze;
  const progressPercent = loyalty.nextTierPoints
    ? Math.min(
        100,
        Math.round(
          ((loyalty.totalPoints) / (loyalty.totalPoints + loyalty.nextTierPoints)) * 100
        )
      )
    : 100;

  const handleRedeem = () => {
    const pts = parseInt(redeemPoints);
    if (!pts || pts <= 0) {
      toast({ title: "Enter valid points", variant: "destructive" });
      return;
    }
    if (pts > loyalty.availablePoints) {
      toast({ title: "Not enough points", variant: "destructive" });
      return;
    }
    redeemMutation.mutate(pts);
  };

  return (
    <Card className={`border ${tier.bg} shadow-sm`}>
      <CardHeader className="pb-2 pt-4 px-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xl">{tier.icon}</span>
            <div>
              <CardTitle className={`text-sm font-bold ${tier.color}`}>
                {tier.label} Member
              </CardTitle>
              <p className="text-xs text-gray-500">{loyalty.lifetimeEarned} lifetime points</p>
            </div>
          </div>
          <Badge className={`${tier.bg} ${tier.color} border text-xs font-semibold`}>
            {loyalty.availablePoints} pts
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="px-4 pb-4 space-y-3">
        {/* Points display */}
        <div className="flex items-center justify-between bg-white rounded-xl p-3 border border-gray-100">
          <div className="flex items-center gap-2">
            <Star className="w-4 h-4 text-yellow-500 fill-yellow-400" />
            <span className="text-sm font-medium text-gray-700">Available Points</span>
          </div>
          <span className="text-lg font-bold text-gray-900">{loyalty.availablePoints}</span>
        </div>

        {/* Progress to next tier */}
        {loyalty.nextTierPoints && (
          <div>
            <div className="flex justify-between text-xs text-gray-500 mb-1">
              <span>Progress to next tier</span>
              <span>{loyalty.nextTierPoints} pts needed</span>
            </div>
            <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-yellow-400 to-yellow-600 rounded-full transition-all duration-500"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>
        )}

        {/* Redeem section */}
        {loyalty.availablePoints > 0 && (
          <div>
            {!showRedeem ? (
              <Button
                variant="outline"
                size="sm"
                className="w-full border-yellow-300 text-yellow-700 hover:bg-yellow-50 text-xs"
                onClick={() => setShowRedeem(true)}
              >
                <Gift className="w-3.5 h-3.5 mr-1.5" />
                Redeem Points for Discount
                <ChevronRight className="w-3.5 h-3.5 ml-auto" />
              </Button>
            ) : (
              <div className="space-y-2">
                <p className="text-xs text-gray-500">
                  10 points = ₹1 discount. Max: ₹{Math.floor(loyalty.availablePoints / 10)}
                </p>
                <div className="flex gap-2">
                  <Input
                    type="number"
                    placeholder="Points to redeem"
                    value={redeemPoints}
                    onChange={(e) => setRedeemPoints(e.target.value)}
                    className="h-8 text-xs"
                    max={loyalty.availablePoints}
                    min={10}
                  />
                  <Button
                    size="sm"
                    className="h-8 bg-yellow-500 hover:bg-yellow-600 text-white text-xs px-3"
                    onClick={handleRedeem}
                    disabled={redeemMutation.isPending}
                  >
                    {redeemMutation.isPending ? "..." : "Apply"}
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-8 text-xs px-2"
                    onClick={() => setShowRedeem(false)}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}

        <p className="text-[10px] text-gray-400 text-center">
          Earn 1 point for every ₹10 spent
        </p>
      </CardContent>
    </Card>
  );
}
