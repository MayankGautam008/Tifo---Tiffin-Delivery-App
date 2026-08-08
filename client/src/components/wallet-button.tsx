import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Wallet, Copy, CheckCircle2, IndianRupee, Percent, Gift } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import type { WalletData } from "@shared/schema";

const SEEN_BALANCE_KEY = "wallet_seen_balance";
const SEEN_COUPONS_KEY = "wallet_seen_coupon_ids";

function getSeenBalance(): number {
  const raw = localStorage.getItem(SEEN_BALANCE_KEY);
  return raw ? Number(raw) : 0;
}

function getSeenCouponIds(): string[] {
  try {
    const raw = localStorage.getItem(SEEN_COUPONS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function WalletButton() {
  const [open, setOpen] = useState(false);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const { toast } = useToast();

  // Poll every 30s so the badge can pick up admin changes without a manual refresh.
  const { data, isLoading } = useQuery<WalletData>({
    queryKey: ["/api/wallet"],
    refetchInterval: 30000,
  });

  const [unseenCount, setUnseenCount] = useState(0);

  useEffect(() => {
    if (!data) return;
    const seenBalance = getSeenBalance();
    const seenCouponIds = getSeenCouponIds();

    let count = 0;
    if (data.balance > seenBalance) count += 1; // new money added
    const newCoupons = (data.coupons || []).filter((c) => !seenCouponIds.includes(c._id));
    count += newCoupons.length;

    setUnseenCount(count);
  }, [data]);

  const markAllSeen = () => {
    if (!data) return;
    localStorage.setItem(SEEN_BALANCE_KEY, String(data.balance));
    localStorage.setItem(SEEN_COUPONS_KEY, JSON.stringify((data.coupons || []).map((c) => c._id)));
    setUnseenCount(0);
  };

  const copyToClipboard = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    toast({ title: "Copied", description: "Coupon code copied to clipboard." });
    setTimeout(() => setCopiedCode(null), 2000);
  };

  return (
    <>
      <button
        onClick={() => {
          setOpen(true);
          markAllSeen();
        }}
        className="relative w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-gray-100 flex items-center justify-center hover:bg-gray-200 transition-colors"
        aria-label="My wallet"
      >
        <Wallet className="w-5 h-5 text-gray-700" />
        {unseenCount > 0 && (
          <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-red-600 text-white text-[10px] font-bold flex items-center justify-center shadow-md">
            {unseenCount > 9 ? "9+" : unseenCount}
          </span>
        )}
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="w-[88%] max-w-sm mx-auto rounded-2xl p-5">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Wallet className="w-5 h-5 text-red-500" />
              My Wallet
            </DialogTitle>
            <DialogDescription>Your balance and any offers from us.</DialogDescription>
          </DialogHeader>

          {isLoading ? (
            <div className="py-10 text-center text-sm text-slate-400">Loading wallet…</div>
          ) : (
            <div className="space-y-5">
              <div className="rounded-2xl bg-gradient-to-br from-red-500 to-orange-500 p-5 text-white shadow-md">
                <p className="text-xs uppercase tracking-wide text-white/80">Wallet balance</p>
                <p className="text-3xl font-bold flex items-center gap-1 mt-1">
                  <IndianRupee className="w-6 h-6" />
                  {(data?.balance ?? 0).toFixed(2)}
                </p>
              </div>

              <div>
                <p className="text-sm font-semibold text-slate-900 mb-2 flex items-center gap-2">
                  <Gift className="w-4 h-4 text-red-500" />
                  Offers for you
                </p>

                {!data?.coupons || data.coupons.length === 0 ? (
                  <p className="text-sm text-slate-400 rounded-xl border border-dashed border-slate-200 p-4 text-center">
                    Nothing here right now. Check back later!
                  </p>
                ) : (
                  <div className="space-y-2">
                    {data.coupons.map((c) => (
                      <div
                        key={c._id}
                        className="flex items-center justify-between rounded-xl border border-slate-200 p-3"
                      >
                        <div>
                          <div className="flex items-center gap-2">
                            <code className="rounded bg-slate-100 px-2 py-1 font-mono text-xs font-semibold text-slate-700">
                              {c.code}
                            </code>
                            <Badge variant="default" className="text-[10px]">
                              {c.discountType === "fixed" ? (
                                <span className="flex items-center gap-0.5">
                                  <IndianRupee className="w-3 h-3" />
                                  {c.discountValue} off
                                </span>
                              ) : (
                                <span className="flex items-center gap-0.5">
                                  <Percent className="w-3 h-3" />
                                  {c.discountValue} off
                                </span>
                              )}
                            </Badge>
                          </div>
                          {c.description && (
                            <p className="text-xs text-slate-500 mt-1">{c.description}</p>
                          )}
                        </div>
                        <button
                          onClick={() => copyToClipboard(c.code)}
                          className="h-8 w-8 flex items-center justify-center rounded-lg border border-slate-200 hover:bg-slate-50"
                          aria-label="Copy coupon code"
                        >
                          {copiedCode === c.code ? (
                            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                          ) : (
                            <Copy className="h-3.5 w-3.5 text-slate-500" />
                          )}
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
