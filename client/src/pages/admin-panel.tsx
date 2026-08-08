// src/components/admin-panel.tsx
import { useEffect, useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/lib/auth-context";
import { useLocation } from "wouter";
import { queryClient } from "@/lib/queryClient";
import type { SellerWithUser, BookingWithDetails, AdminStats, WalletCustomer, WalletCoupon as WalletCouponItem, WalletTransaction as WalletTransactionItem, AdminWalletDetail } from "@shared/schema";
import {
  ArrowLeft,
  Users,
  UtensilsCrossed,
  Package,
  UserCheck,
  CheckCircle,
  XCircle,
  Star,
  AlertCircle,
  Search,
  Mail,
  Phone,
  IndianRupee,
  ChefHat,
  Trash2,
  MoreVertical,
  BarChart3,
  Shield,
  Tag,
  Plus,
  Edit,
  Copy,
  CheckCircle2,
  Percent,
  Calendar,
  Wallet,
  PlusCircle,
  MinusCircle,
  History,
  Bell,
  Send,
  Megaphone,
  Radio,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { format } from "date-fns";

// ---------------------------------------------------------------------------
// Shared helpers
// ---------------------------------------------------------------------------

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
    const error = await response.json();
    throw new Error(error.message || "Request failed");
  }

  return response.json();
};

interface StatCardProps {
  label: string;
  value: string | number;
  hint: string;
  icon: React.ElementType;
  tone?: "default" | "positive" | "negative" | "warning";
}

const toneClasses: Record<NonNullable<StatCardProps["tone"]>, string> = {
  default: "text-slate-900",
  positive: "text-emerald-700",
  negative: "text-rose-700",
  warning: "text-amber-700",
};

const iconToneClasses: Record<NonNullable<StatCardProps["tone"]>, string> = {
  default: "text-slate-400",
  positive: "text-emerald-500",
  negative: "text-rose-500",
  warning: "text-amber-500",
};

function StatCard({ label, value, hint, icon: Icon, tone = "default" }: StatCardProps) {
  return (
    <Card className="border-slate-200 shadow-sm">
      <CardContent className="p-4 sm:p-5">
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-medium uppercase tracking-wide text-slate-500">
            {label}
          </span>
          <Icon className={`h-4 w-4 ${iconToneClasses[tone]}`} />
        </div>
        <div className={`text-2xl font-semibold leading-none mb-1 ${toneClasses[tone]}`}>
          {value}
        </div>
        <p className="text-xs text-slate-500">{hint}</p>
      </CardContent>
    </Card>
  );
}

function SectionHeading({ title, description }: { title: string; description: string }) {
  return (
    <div>
      <h2 className="text-xl font-semibold text-slate-900">{title}</h2>
      <p className="text-sm text-slate-500 mt-0.5">{description}</p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Coupon Management
// ---------------------------------------------------------------------------

interface Coupon {
  _id: string;
  code: string;
  description: string;
  discountType: "fixed" | "percentage";
  discountValue: number;
  minOrderAmount: number;
  maxDiscountAmount?: number;
  validFrom: string;
  validUntil: string;
  usageLimit: number;
  usedCount: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

interface CreateCouponData {
  code: string;
  description: string;
  discountType: "fixed" | "percentage";
  discountValue: number;
  minOrderAmount: number;
  maxDiscountAmount?: number;
  validFrom: string;
  validUntil: string;
  usageLimit: number;
}

function getCouponStatus(coupon: Coupon): { label: string; variant: "default" | "secondary" | "outline" | "destructive" } {
  const now = new Date();
  const validUntil = new Date(coupon.validUntil);
  const validFrom = new Date(coupon.validFrom);

  if (!coupon.isActive) return { label: "Inactive", variant: "secondary" };
  if (now < validFrom) return { label: "Upcoming", variant: "outline" };
  if (now > validUntil) return { label: "Expired", variant: "destructive" };
  if (coupon.usedCount >= coupon.usageLimit) return { label: "Limit reached", variant: "destructive" };
  return { label: "Active", variant: "default" };
}

function getDiscountText(coupon: Coupon) {
  return coupon.discountType === "fixed"
    ? `₹${coupon.discountValue} off`
    : `${coupon.discountValue}% off`;
}

// ---------------------------------------------------------------------------
// Wallet management (admin)
// ---------------------------------------------------------------------------

function WalletManagement() {
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCustomer, setSelectedCustomer] = useState<WalletCustomer | null>(null);
  const [isAdjustOpen, setIsAdjustOpen] = useState(false);
  const [isCouponOpen, setIsCouponOpen] = useState(false);
  const [adjustType, setAdjustType] = useState<"credit" | "debit">("credit");
  const [adjustAmount, setAdjustAmount] = useState("");
  const [adjustReason, setAdjustReason] = useState("");
  const [couponForm, setCouponForm] = useState({
    code: "",
    description: "",
    discountType: "fixed" as "fixed" | "percentage",
    discountValue: "",
  });

  const { data: customers = [], isLoading } = useQuery<WalletCustomer[]>({
    queryKey: ["/api/admin/wallet/customers", searchTerm],
    queryFn: () =>
      apiRequest("GET", `/api/admin/wallet/customers${searchTerm ? `?search=${encodeURIComponent(searchTerm)}` : ""}`),
  });

  const { data: detail, isLoading: detailLoading } = useQuery<AdminWalletDetail>({
    queryKey: [`/api/admin/wallet/${selectedCustomer?._id}`],
    enabled: !!selectedCustomer,
  });

  const adjustMutation = useMutation({
    mutationFn: (data: { type: "credit" | "debit"; amount: number; reason: string }) =>
      apiRequest("PATCH", `/api/admin/wallet/${selectedCustomer?._id}`, data),
    onSuccess: () => {
      toast({ title: "Wallet updated", description: "Balance has been adjusted." });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/wallet/customers"] });
      queryClient.invalidateQueries({ queryKey: [`/api/admin/wallet/${selectedCustomer?._id}`] });
      setIsAdjustOpen(false);
      setAdjustAmount("");
      setAdjustReason("");
    },
    onError: (error: Error) => {
      toast({ title: "Couldn't update wallet", description: error.message, variant: "destructive" });
    },
  });

  const createCouponMutation = useMutation({
    mutationFn: (data: any) =>
      apiRequest("POST", `/api/admin/wallet/${selectedCustomer?._id}/coupon`, data),
    onSuccess: () => {
      toast({ title: "Coupon created", description: "It stays hidden until you activate it." });
      queryClient.invalidateQueries({ queryKey: [`/api/admin/wallet/${selectedCustomer?._id}`] });
      setIsCouponOpen(false);
      setCouponForm({ code: "", description: "", discountType: "fixed", discountValue: "" });
    },
    onError: (error: Error) => {
      toast({ title: "Couldn't create coupon", description: error.message, variant: "destructive" });
    },
  });

  const toggleCouponMutation = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      apiRequest("PATCH", `/api/admin/wallet/coupon/${id}`, { isActive }),
    onSuccess: () => {
      toast({ title: "Coupon updated" });
      queryClient.invalidateQueries({ queryKey: [`/api/admin/wallet/${selectedCustomer?._id}`] });
    },
    onError: (error: Error) => {
      toast({ title: "Couldn't update coupon", description: error.message, variant: "destructive" });
    },
  });

  const deleteCouponMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/admin/wallet/coupon/${id}`),
    onSuccess: () => {
      toast({ title: "Coupon deleted" });
      queryClient.invalidateQueries({ queryKey: [`/api/admin/wallet/${selectedCustomer?._id}`] });
    },
    onError: (error: Error) => {
      toast({ title: "Couldn't delete coupon", description: error.message, variant: "destructive" });
    },
  });

  const totalWalletValue = customers.reduce((sum, c) => sum + (c.walletBalance || 0), 0);

  return (
    <div className="space-y-6">
      <SectionHeading
        title="Customer wallets"
        description="Adjust wallet balance for any customer and set coupon codes that appear on their wallet."
      />

      <div className="grid gap-4 grid-cols-2 lg:grid-cols-3">
        <StatCard label="Total customers" value={customers.length} hint="With a wallet" icon={Users} />
        <StatCard label="Total wallet value" value={`₹${totalWalletValue.toFixed(0)}`} hint="Across all customers" icon={Wallet} tone="positive" />
        <StatCard label="Selected" value={selectedCustomer ? selectedCustomer.name : "—"} hint="Currently managing" icon={UserCheck} />
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        <Card className="border-slate-200 shadow-sm">
          <CardHeader className="border-b border-slate-100 pb-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <CardTitle className="text-base">Customers</CardTitle>
              <div className="relative sm:w-56">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 h-4 w-4" />
                <Input
                  placeholder="Search name, email, phone"
                  className="pl-9"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="max-h-[420px] overflow-y-auto">
              {isLoading && <p className="px-4 py-10 text-center text-slate-400 text-sm">Loading customers…</p>}
              {!isLoading && customers.length === 0 && (
                <p className="px-4 py-10 text-center text-slate-400 text-sm">No customers found.</p>
              )}
              {customers.map((c) => (
                <button
                  key={c._id}
                  onClick={() => setSelectedCustomer(c)}
                  className={`w-full text-left px-4 py-3 border-b border-slate-100 last:border-0 hover:bg-slate-50 transition-colors ${
                    selectedCustomer?._id === c._id ? "bg-red-50" : ""
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-slate-900">{c.name}</p>
                      <p className="text-xs text-slate-500">{c.email}</p>
                    </div>
                    <Badge variant="secondary" className="flex items-center gap-1">
                      <IndianRupee className="h-3 w-3" />
                      {(c.walletBalance || 0).toFixed(0)}
                    </Badge>
                  </div>
                </button>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200 shadow-sm">
          <CardHeader className="border-b border-slate-100 pb-4">
            <CardTitle className="text-base">
              {selectedCustomer ? selectedCustomer.name : "Select a customer"}
            </CardTitle>
            <CardDescription>
              {selectedCustomer ? selectedCustomer.email : "Pick a customer from the list to manage their wallet."}
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-4">
            {!selectedCustomer && (
              <p className="text-sm text-slate-400 text-center py-10">No customer selected.</p>
            )}

            {selectedCustomer && (
              <div className="space-y-5">
                <div className="rounded-xl bg-slate-50 border border-slate-100 p-4 flex items-center justify-between">
                  <div>
                    <p className="text-xs text-slate-500">Current balance</p>
                    <p className="text-2xl font-bold text-slate-900 flex items-center gap-1">
                      <IndianRupee className="h-5 w-5 text-slate-400" />
                      {(detail?.customer?.walletBalance ?? selectedCustomer.walletBalance ?? 0).toFixed(2)}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      className="bg-emerald-600 hover:bg-emerald-700"
                      onClick={() => {
                        setAdjustType("credit");
                        setIsAdjustOpen(true);
                      }}
                    >
                      <PlusCircle className="w-4 h-4 mr-1" /> Add
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="border-rose-200 text-rose-600 hover:bg-rose-50"
                      onClick={() => {
                        setAdjustType("debit");
                        setIsAdjustOpen(true);
                      }}
                    >
                      <MinusCircle className="w-4 h-4 mr-1" /> Deduct
                    </Button>
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm font-semibold text-slate-900">Wallet coupons</p>
                    <Button size="sm" variant="outline" onClick={() => setIsCouponOpen(true)}>
                      <Plus className="w-3.5 h-3.5 mr-1" /> New coupon
                    </Button>
                  </div>
                  {detailLoading && <p className="text-sm text-slate-400">Loading…</p>}
                  {!detailLoading && (!detail?.coupons || detail.coupons.length === 0) && (
                    <p className="text-sm text-slate-400 rounded-xl border border-dashed border-slate-200 p-4 text-center">
                      No coupon set for this customer yet.
                    </p>
                  )}
                  <div className="space-y-2">
                    {detail?.coupons?.map((coupon) => (
                      <div
                        key={coupon._id}
                        className="flex items-center justify-between rounded-xl border border-slate-200 p-3"
                      >
                        <div>
                          <div className="flex items-center gap-2">
                            <code className="rounded bg-slate-100 px-2 py-1 font-mono text-xs font-semibold text-slate-700">
                              {coupon.code}
                            </code>
                            <Badge variant={coupon.isActive ? "default" : "secondary"}>
                              {coupon.isActive ? "Visible to customer" : "Hidden"}
                            </Badge>
                          </div>
                          <p className="text-xs text-slate-500 mt-1">
                            {coupon.discountType === "fixed" ? `₹${coupon.discountValue} off` : `${coupon.discountValue}% off`}
                            {coupon.description ? ` — ${coupon.description}` : ""}
                          </p>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() =>
                              toggleCouponMutation.mutate({ id: coupon._id, isActive: !coupon.isActive })
                            }
                          >
                            {coupon.isActive ? "Deactivate" : "Activate"}
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-rose-600 hover:bg-rose-50"
                            onClick={() => deleteCouponMutation.mutate(coupon._id)}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {detail?.transactions && detail.transactions.length > 0 && (
                  <div>
                    <p className="text-sm font-semibold text-slate-900 mb-2 flex items-center gap-2">
                      <History className="w-4 h-4" /> Recent activity
                    </p>
                    <div className="space-y-1 max-h-40 overflow-y-auto">
                      {detail.transactions.map((t) => (
                        <div key={t._id} className="flex items-center justify-between text-xs text-slate-500 border-b border-slate-100 py-1.5">
                          <span>
                            {t.type === "credit" ? "+" : "-"}₹{t.amount} {t.reason ? `(${t.reason})` : ""}
                          </span>
                          <span>{t.createdAt ? format(new Date(t.createdAt), "MMM d, HH:mm") : ""}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Adjust balance dialog */}
      <Dialog open={isAdjustOpen} onOpenChange={setIsAdjustOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{adjustType === "credit" ? "Add money to wallet" : "Deduct money from wallet"}</DialogTitle>
            <DialogDescription>
              {selectedCustomer?.name} — current balance ₹{(detail?.customer?.walletBalance ?? 0).toFixed(2)}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Amount (₹)</Label>
              <Input
                type="number"
                min="1"
                value={adjustAmount}
                onChange={(e) => setAdjustAmount(e.target.value)}
                placeholder="e.g. 100"
              />
            </div>
            <div>
              <Label>Reason (optional)</Label>
              <Input
                value={adjustReason}
                onChange={(e) => setAdjustReason(e.target.value)}
                placeholder="e.g. Refund, promo credit"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAdjustOpen(false)}>
              Cancel
            </Button>
            <Button
              disabled={!adjustAmount || Number(adjustAmount) <= 0 || adjustMutation.isPending}
              onClick={() =>
                adjustMutation.mutate({
                  type: adjustType,
                  amount: Number(adjustAmount),
                  reason: adjustReason,
                })
              }
            >
              {adjustMutation.isPending ? "Saving…" : "Confirm"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create wallet coupon dialog */}
      <Dialog open={isCouponOpen} onOpenChange={setIsCouponOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New coupon for {selectedCustomer?.name}</DialogTitle>
            <DialogDescription>
              It's created hidden. Use "Activate" afterwards to make it show up on the customer's wallet.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Coupon code</Label>
              <Input
                value={couponForm.code}
                onChange={(e) => setCouponForm({ ...couponForm, code: e.target.value.toUpperCase() })}
                placeholder="e.g. WELCOME50"
              />
            </div>
            <div>
              <Label>Description (optional)</Label>
              <Input
                value={couponForm.description}
                onChange={(e) => setCouponForm({ ...couponForm, description: e.target.value })}
                placeholder="e.g. Loyalty reward"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Discount type</Label>
                <Select
                  value={couponForm.discountType}
                  onValueChange={(v: "fixed" | "percentage") => setCouponForm({ ...couponForm, discountType: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="fixed">Fixed (₹)</SelectItem>
                    <SelectItem value="percentage">Percentage (%)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Value</Label>
                <Input
                  type="number"
                  min="1"
                  value={couponForm.discountValue}
                  onChange={(e) => setCouponForm({ ...couponForm, discountValue: e.target.value })}
                  placeholder="e.g. 50"
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCouponOpen(false)}>
              Cancel
            </Button>
            <Button
              disabled={!couponForm.code || !couponForm.discountValue || createCouponMutation.isPending}
              onClick={() =>
                createCouponMutation.mutate({
                  ...couponForm,
                  discountValue: Number(couponForm.discountValue),
                })
              }
            >
              {createCouponMutation.isPending ? "Creating…" : "Create coupon"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function CouponManagement() {
  const { toast } = useToast();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedCoupon, setSelectedCoupon] = useState<Coupon | null>(null);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");

  const { data: coupons = [], isLoading } = useQuery<Coupon[]>({
    queryKey: ["/api/coupons"],
  });

  const createMutation = useMutation({
    mutationFn: (data: CreateCouponData) => apiRequest("POST", "/api/coupons", data),
    onSuccess: () => {
      toast({ title: "Coupon created", description: "The coupon is now available." });
      queryClient.invalidateQueries({ queryKey: ["/api/coupons"] });
      setIsCreateDialogOpen(false);
    },
    onError: (error: Error) => {
      toast({ title: "Couldn't create coupon", description: error.message, variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Coupon> }) =>
      apiRequest("PUT", `/api/coupons/${id}`, data),
    onSuccess: () => {
      toast({ title: "Coupon updated", description: "Changes have been saved." });
      queryClient.invalidateQueries({ queryKey: ["/api/coupons"] });
      setIsEditDialogOpen(false);
      setSelectedCoupon(null);
    },
    onError: (error: Error) => {
      toast({ title: "Couldn't update coupon", description: error.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/coupons/${id}`),
    onSuccess: () => {
      toast({ title: "Coupon deleted", description: "The coupon has been removed." });
      queryClient.invalidateQueries({ queryKey: ["/api/coupons"] });
      setIsDeleteDialogOpen(false);
      setSelectedCoupon(null);
    },
    onError: (error: Error) => {
      toast({ title: "Couldn't delete coupon", description: error.message, variant: "destructive" });
    },
  });

  const copyToClipboard = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    toast({ title: "Copied", description: "Coupon code copied to clipboard." });
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const filteredCoupons = coupons.filter(
    (c) =>
      c.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.description.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const activeCount = coupons.filter(
    (c) => c.isActive && new Date(c.validUntil) > new Date() && c.usedCount < c.usageLimit
  ).length;
  const expiredCount = coupons.filter((c) => new Date(c.validUntil) < new Date()).length;
  const totalUsage = coupons.reduce((sum, c) => sum + c.usedCount, 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <SectionHeading
          title="Coupon management"
          description="Create and manage discount coupons for customers."
        />
        <Button onClick={() => setIsCreateDialogOpen(true)} className="sm:w-auto w-full">
          <Plus className="w-4 h-4 mr-2" />
          New coupon
        </Button>
      </div>

      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        <StatCard label="Total coupons" value={coupons.length} hint="All time" icon={Copy} />
        <StatCard label="Active" value={activeCount} hint="Currently redeemable" icon={CheckCircle2} tone="positive" />
        <StatCard label="Redemptions" value={totalUsage} hint="Total uses" icon={Users} />
        <StatCard label="Expired" value={expiredCount} hint="Past valid date" icon={Calendar} tone="negative" />
      </div>

      <Card className="border-slate-200 shadow-sm">
        <CardHeader className="border-b border-slate-100 pb-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <CardTitle className="text-base">All coupons</CardTitle>
              <CardDescription>Track validity, limits, and usage at a glance.</CardDescription>
            </div>
            <div className="relative sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 h-4 w-4" />
              <Input
                placeholder="Search coupons"
                className="pl-9"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/60">
                  <th className="h-11 px-4 text-left font-medium text-slate-500">Code</th>
                  <th className="h-11 px-4 text-left font-medium text-slate-500">Description</th>
                  <th className="h-11 px-4 text-left font-medium text-slate-500">Discount</th>
                  <th className="h-11 px-4 text-left font-medium text-slate-500">Min. order</th>
                  <th className="h-11 px-4 text-left font-medium text-slate-500">Usage</th>
                  <th className="h-11 px-4 text-left font-medium text-slate-500">Valid until</th>
                  <th className="h-11 px-4 text-left font-medium text-slate-500">Status</th>
                  <th className="h-11 px-4 text-right font-medium text-slate-500">Actions</th>
                </tr>
              </thead>
              <tbody>
                {isLoading && (
                  <tr>
                    <td colSpan={8} className="px-4 py-10 text-center text-slate-400">
                      Loading coupons…
                    </td>
                  </tr>
                )}

                {!isLoading && filteredCoupons.length === 0 && (
                  <tr>
                    <td colSpan={8} className="px-4 py-10 text-center text-slate-400">
                      No coupons match your search.
                    </td>
                  </tr>
                )}

                {filteredCoupons.map((coupon) => {
                  const status = getCouponStatus(coupon);
                  return (
                    <tr key={coupon._id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50/60">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <code className="rounded bg-slate-100 px-2 py-1 font-mono text-xs font-semibold text-slate-700">
                            {coupon.code}
                          </code>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 w-7 p-0"
                            onClick={() => copyToClipboard(coupon.code)}
                            aria-label="Copy coupon code"
                          >
                            {copiedCode === coupon.code ? (
                              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                            ) : (
                              <Copy className="h-3.5 w-3.5 text-slate-500" />
                            )}
                          </Button>
                        </div>
                      </td>
                      <td className="px-4 py-3 max-w-[220px] truncate text-slate-600">
                        {coupon.description}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1 text-slate-700 font-medium">
                          {coupon.discountType === "fixed" ? (
                            <IndianRupee className="h-3.5 w-3.5 text-slate-400" />
                          ) : (
                            <Percent className="h-3.5 w-3.5 text-slate-400" />
                          )}
                          {getDiscountText(coupon)}
                        </div>
                        {coupon.discountType === "percentage" && coupon.maxDiscountAmount && (
                          <div className="text-xs text-slate-400">Up to ₹{coupon.maxDiscountAmount}</div>
                        )}
                      </td>
                      <td className="px-4 py-3 text-slate-600">₹{coupon.minOrderAmount}</td>
                      <td className="px-4 py-3 text-slate-600">
                        {coupon.usedCount} / {coupon.usageLimit}
                      </td>
                      <td className="px-4 py-3 text-slate-600">
                        {format(new Date(coupon.validUntil), "MMM d, yyyy")}
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant={status.variant}>{status.label}</Badge>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-8 w-8 p-0"
                            onClick={() => {
                              setSelectedCoupon(coupon);
                              setIsEditDialogOpen(true);
                            }}
                            aria-label="Edit coupon"
                          >
                            <Edit className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-8 w-8 p-0 text-rose-600 hover:bg-rose-50 hover:text-rose-700"
                            onClick={() => {
                              setSelectedCoupon(coupon);
                              setIsDeleteDialogOpen(true);
                            }}
                            aria-label="Delete coupon"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <CreateCouponDialog
        open={isCreateDialogOpen}
        onOpenChange={setIsCreateDialogOpen}
        onSubmit={createMutation.mutate}
        isLoading={createMutation.isPending}
      />

      {selectedCoupon && (
        <EditCouponDialog
          open={isEditDialogOpen}
          onOpenChange={setIsEditDialogOpen}
          coupon={selectedCoupon}
          onSubmit={(data) => updateMutation.mutate({ id: selectedCoupon._id, data })}
          isLoading={updateMutation.isPending}
        />
      )}

      {selectedCoupon && (
        <DeleteCouponDialog
          open={isDeleteDialogOpen}
          onOpenChange={setIsDeleteDialogOpen}
          coupon={selectedCoupon}
          onConfirm={() => deleteMutation.mutate(selectedCoupon._id)}
          isLoading={deleteMutation.isPending}
        />
      )}
    </div>
  );
}

function CreateCouponDialog({
  open,
  onOpenChange,
  onSubmit,
  isLoading,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: CreateCouponData) => void;
  isLoading: boolean;
}) {
  const [formData, setFormData] = useState<CreateCouponData>({
    code: "",
    description: "",
    discountType: "fixed",
    discountValue: 0,
    minOrderAmount: 0,
    maxDiscountAmount: undefined,
    validFrom: new Date().toISOString().split("T")[0],
    validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
    usageLimit: 100,
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Create coupon</DialogTitle>
          <DialogDescription>Set up a new discount code for customers.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="code">Coupon code *</Label>
              <Input
                id="code"
                value={formData.code}
                onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                placeholder="SUMMER2024"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="discountType">Discount type *</Label>
              <Select
                value={formData.discountType}
                onValueChange={(value: "fixed" | "percentage") =>
                  setFormData({ ...formData, discountType: value })
                }
              >
                <SelectTrigger id="discountType">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="fixed">Fixed amount</SelectItem>
                  <SelectItem value="percentage">Percentage</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description *</Label>
            <Input
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Summer special discount"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="discountValue">
                Discount value * {formData.discountType === "fixed" ? "(₹)" : "(%)"}
              </Label>
              <Input
                id="discountValue"
                type="number"
                value={formData.discountValue}
                onChange={(e) => setFormData({ ...formData, discountValue: Number(e.target.value) })}
                required
                min="0"
                step={formData.discountType === "percentage" ? "1" : "10"}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="minOrderAmount">Minimum order (₹) *</Label>
              <Input
                id="minOrderAmount"
                type="number"
                value={formData.minOrderAmount}
                onChange={(e) => setFormData({ ...formData, minOrderAmount: Number(e.target.value) })}
                required
                min="0"
                step="50"
              />
            </div>
          </div>

          {formData.discountType === "percentage" && (
            <div className="space-y-2">
              <Label htmlFor="maxDiscountAmount">Maximum discount (₹)</Label>
              <Input
                id="maxDiscountAmount"
                type="number"
                value={formData.maxDiscountAmount || ""}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    maxDiscountAmount: e.target.value ? Number(e.target.value) : undefined,
                  })
                }
                min="0"
                step="50"
              />
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="validFrom">Valid from *</Label>
              <Input
                id="validFrom"
                type="date"
                value={formData.validFrom}
                onChange={(e) => setFormData({ ...formData, validFrom: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="validUntil">Valid until *</Label>
              <Input
                id="validUntil"
                type="date"
                value={formData.validUntil}
                onChange={(e) => setFormData({ ...formData, validUntil: e.target.value })}
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="usageLimit">Usage limit *</Label>
            <Input
              id="usageLimit"
              type="number"
              value={formData.usageLimit}
              onChange={(e) => setFormData({ ...formData, usageLimit: Number(e.target.value) })}
              required
              min="1"
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? "Creating…" : "Create coupon"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function EditCouponDialog({
  open,
  onOpenChange,
  coupon,
  onSubmit,
  isLoading,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  coupon: Coupon;
  onSubmit: (data: Partial<Coupon>) => void;
  isLoading: boolean;
}) {
  const [formData, setFormData] = useState({
    code: coupon.code,
    description: coupon.description,
    discountType: coupon.discountType,
    discountValue: coupon.discountValue,
    minOrderAmount: coupon.minOrderAmount,
    maxDiscountAmount: coupon.maxDiscountAmount,
    validFrom: coupon.validFrom.split("T")[0],
    validUntil: coupon.validUntil.split("T")[0],
    usageLimit: coupon.usageLimit,
    isActive: coupon.isActive,
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Edit coupon</DialogTitle>
          <DialogDescription>Update the coupon details and status.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="edit-code">Coupon code *</Label>
              <Input
                id="edit-code"
                value={formData.code}
                onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-discountType">Discount type *</Label>
              <Select
                value={formData.discountType}
                onValueChange={(value: "fixed" | "percentage") =>
                  setFormData({ ...formData, discountType: value })
                }
              >
                <SelectTrigger id="edit-discountType">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="fixed">Fixed amount</SelectItem>
                  <SelectItem value="percentage">Percentage</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-description">Description *</Label>
            <Input
              id="edit-description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="edit-discountValue">
                Discount value * {formData.discountType === "fixed" ? "(₹)" : "(%)"}
              </Label>
              <Input
                id="edit-discountValue"
                type="number"
                value={formData.discountValue}
                onChange={(e) => setFormData({ ...formData, discountValue: Number(e.target.value) })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-minOrderAmount">Minimum order (₹) *</Label>
              <Input
                id="edit-minOrderAmount"
                type="number"
                value={formData.minOrderAmount}
                onChange={(e) => setFormData({ ...formData, minOrderAmount: Number(e.target.value) })}
                required
              />
            </div>
          </div>

          {formData.discountType === "percentage" && (
            <div className="space-y-2">
              <Label htmlFor="edit-maxDiscountAmount">Maximum discount (₹)</Label>
              <Input
                id="edit-maxDiscountAmount"
                type="number"
                value={formData.maxDiscountAmount || ""}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    maxDiscountAmount: e.target.value ? Number(e.target.value) : undefined,
                  })
                }
              />
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="edit-validFrom">Valid from *</Label>
              <Input
                id="edit-validFrom"
                type="date"
                value={formData.validFrom}
                onChange={(e) => setFormData({ ...formData, validFrom: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-validUntil">Valid until *</Label>
              <Input
                id="edit-validUntil"
                type="date"
                value={formData.validUntil}
                onChange={(e) => setFormData({ ...formData, validUntil: e.target.value })}
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="edit-usageLimit">Usage limit *</Label>
              <Input
                id="edit-usageLimit"
                type="number"
                value={formData.usageLimit}
                onChange={(e) => setFormData({ ...formData, usageLimit: Number(e.target.value) })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-isActive">Status</Label>
              <Select
                value={formData.isActive ? "active" : "inactive"}
                onValueChange={(value) => setFormData({ ...formData, isActive: value === "active" })}
              >
                <SelectTrigger id="edit-isActive">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="bg-slate-50 border border-slate-100 p-3 rounded-md">
            <div className="text-sm font-medium text-slate-700">Current usage</div>
            <div className="text-sm text-slate-500">
              {coupon.usedCount} of {coupon.usageLimit} redemptions used
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? "Saving…" : "Save changes"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function DeleteCouponDialog({
  open,
  onOpenChange,
  coupon,
  onConfirm,
  isLoading,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  coupon: Coupon;
  onConfirm: () => void;
  isLoading: boolean;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete coupon</DialogTitle>
          <DialogDescription>
            This will permanently remove <strong>{coupon.code}</strong>. This action cannot be undone.
          </DialogDescription>
        </DialogHeader>
        <div className="bg-slate-50 border border-slate-100 p-3 rounded-md space-y-1 text-sm">
          <div>
            <span className="text-slate-500">Code:</span>{" "}
            <span className="font-medium text-slate-800">{coupon.code}</span>
          </div>
          <div>
            <span className="text-slate-500">Description:</span>{" "}
            <span className="font-medium text-slate-800">{coupon.description}</span>
          </div>
          <div>
            <span className="text-slate-500">Usage:</span>{" "}
            <span className="font-medium text-slate-800">
              {coupon.usedCount} / {coupon.usageLimit}
            </span>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button variant="destructive" onClick={onConfirm} disabled={isLoading}>
            {isLoading ? "Deleting…" : "Delete coupon"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ---------------------------------------------------------------------------
// Seller Management
// ---------------------------------------------------------------------------

const sellerStatusVariant: Record<string, "default" | "secondary" | "destructive"> = {
  active: "default",
  suspended: "destructive",
  pending: "secondary",
};

function SellerManagement() {
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  const [activeSellerTab, setActiveSellerTab] = useState("all");
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [selectedSellerId, setSelectedSellerId] = useState<string | null>(null);

  const { data: sellers = [] } = useQuery<SellerWithUser[]>({
    queryKey: ["/api/admin/sellers"],
  });

  const { data: bookings = [] } = useQuery<BookingWithDetails[]>({
    queryKey: ["/api/admin/bookings"],
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ sellerId, status }: { sellerId: string; status: string }) =>
      apiRequest("PUT", `/api/admin/sellers/${sellerId}/status`, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/sellers"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/stats"] });
      queryClient.invalidateQueries({ queryKey: ["/api/tiffins"] });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const toggleTopRatedMutation = useMutation({
    mutationFn: async ({ sellerId, isTopRated }: { sellerId: string; isTopRated: boolean }) =>
      apiRequest("PUT", `/api/admin/sellers/${sellerId}/top-rated`, { isTopRated }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/sellers"] });
      queryClient.invalidateQueries({ queryKey: ["/api/top-rated-sellers"] });
      toast({ title: "Updated", description: "Featured status has been updated." });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const deleteSellerMutation = useMutation({
    mutationFn: async (sellerId: string) => apiRequest("DELETE", `/api/admin/sellers/${sellerId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/sellers"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/stats"] });
      queryClient.invalidateQueries({ queryKey: ["/api/top-rated-sellers"] });
      setDeleteConfirm(null);
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const sellersWithStats = sellers.map((seller) => {
    const sellerBookings = bookings.filter((booking) => booking.seller?._id === seller._id);
    const pendingBookings = sellerBookings.filter((booking) => booking.status === "Pending");
    const totalRevenue = sellerBookings.reduce((sum, booking) => sum + (booking.totalPrice || 0), 0);
    const couponBookings = sellerBookings.filter((booking) => (booking.discountAmount || 0) > 0);
    const totalCouponDiscount = couponBookings.reduce((sum, booking) => sum + (booking.discountAmount || 0), 0);
    return {
      ...seller,
      stats: {
        totalBookings: sellerBookings.length,
        pendingCount: pendingBookings.length,
        totalRevenue,
        totalCouponDiscount,
        couponOrdersCount: couponBookings.length,
      },
      pendingBookings,
      bookings: sellerBookings,
    };
  });

  const filteredSellers = sellersWithStats.filter((seller) => {
    const matchesSearch =
      seller.shopName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      seller.user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      seller.user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      seller.contactNumber.includes(searchTerm);

    let matchesTab = true;
    if (activeSellerTab === "all") {
      matchesTab = seller.status !== "suspended";
    } else if (activeSellerTab === "with-pending") {
      matchesTab = seller.stats.pendingCount > 0;
    } else {
      matchesTab = seller.status === activeSellerTab;
    }

    return matchesSearch && matchesTab;
  });

  const counts = {
    all: sellersWithStats.filter((s) => s.status !== "suspended").length,
    active: sellersWithStats.filter((s) => s.status === "active").length,
    "with-pending": sellersWithStats.filter((s) => s.stats.pendingCount > 0).length,
    suspended: sellersWithStats.filter((s) => s.status === "suspended").length,
    pending: sellersWithStats.filter((s) => s.status === "pending").length,
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <SectionHeading title="Seller management" description="Review, approve, and manage sellers on the platform." />
        <div className="relative sm:w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 h-4 w-4" />
          <Input
            placeholder="Search sellers"
            className="pl-9"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1 border-b border-slate-100">
        {(["all", "active", "with-pending", "suspended", "pending"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveSellerTab(tab)}
            className={`flex-shrink-0 px-3 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeSellerTab === tab
                ? "border-slate-900 text-slate-900"
                : "border-transparent text-slate-500 hover:text-slate-700"
            }`}
          >
            {tab === "with-pending" ? "Has Pending Orders" : tab.charAt(0).toUpperCase() + tab.slice(1)}
            <span className={`ml-1.5 text-xs ${tab === "with-pending" && counts[tab] > 0 ? "text-amber-700 font-bold" : "text-slate-400"}`}>
              ({counts[tab]})
            </span>
          </button>
        ))}
      </div>

      <div className="space-y-3">
        {filteredSellers.map((seller) => (
          <Card
            key={seller._id}
            className="border-slate-200 shadow-sm cursor-pointer hover:shadow-md hover:border-slate-300 transition-all"
            onClick={() => setSelectedSellerId(seller._id)}
          >
            <CardContent className="p-4">
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2 mb-1">
                    <h3 className="font-semibold text-sm text-slate-900">{seller.shopName}</h3>
                    <Badge variant={sellerStatusVariant[seller.status] ?? "secondary"} className="text-xs capitalize">
                      {seller.status}
                    </Badge>
                    {seller.isTopRated && (
                      <Badge variant="outline" className="text-xs border-amber-300 text-amber-700 bg-amber-50">
                        <Star className="h-3 w-3 mr-1 fill-amber-500 text-amber-500" />
                        Featured
                      </Badge>
                    )}
                    {seller.stats.pendingCount > 0 && (
                      <Badge variant="outline" className="text-xs border-amber-400 text-amber-900 bg-amber-100 font-bold animate-pulse">
                        <AlertCircle className="h-3 w-3 mr-1 text-amber-700" />
                        {seller.stats.pendingCount} Pending Order{seller.stats.pendingCount > 1 ? "s" : ""}
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-slate-500">Owner: {seller.user.name}</p>

                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2 text-xs text-slate-500">
                    <span className="flex items-center gap-1">
                      <Mail className="h-3 w-3" />
                      {seller.user.email}
                    </span>
                    <span className="flex items-center gap-1">
                      <Phone className="h-3 w-3" />
                      {seller.contactNumber}
                    </span>
                    {seller.ratingStats && seller.ratingStats.totalRatings > 0 && (
                      <span className="flex items-center gap-1">
                        <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                        {seller.ratingStats.averageRating} ({seller.ratingStats.totalRatings})
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-4 sm:gap-6 shrink-0" onClick={(e) => e.stopPropagation()}>
                  {seller.stats.pendingCount > 0 && (
                    <div className="text-right bg-amber-50 border border-amber-300 px-2.5 py-1 rounded-md">
                      <div className="text-sm font-extrabold text-amber-800 flex items-center justify-end gap-1">
                        <AlertCircle className="h-3.5 w-3.5 text-amber-600 animate-bounce" />
                        {seller.stats.pendingCount}
                      </div>
                      <div className="text-[10px] font-bold text-amber-700 uppercase tracking-wide">Pending</div>
                    </div>
                  )}
                  <div className="text-right">
                    <div className="text-sm font-semibold text-slate-900">{seller.stats.totalBookings}</div>
                    <div className="text-[11px] text-slate-500 uppercase tracking-wide">Orders</div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-semibold text-slate-900">₹{seller.stats.totalRevenue}</div>
                    <div className="text-[11px] text-slate-500 uppercase tracking-wide">Revenue</div>
                  </div>
                  {seller.stats.totalCouponDiscount > 0 && (
                    <div className="text-right">
                      <div className="text-sm font-semibold text-rose-600">₹{seller.stats.totalCouponDiscount}</div>
                      <div className="text-[11px] text-slate-500 uppercase tracking-wide">Coupon diff.</div>
                    </div>
                  )}

                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-48">
                      {seller.status === "pending" && (
                        <DropdownMenuItem
                          onClick={() => updateStatusMutation.mutate({ sellerId: seller._id, status: "active" })}
                        >
                          <CheckCircle className="h-4 w-4 mr-2" />
                          Approve seller
                        </DropdownMenuItem>
                      )}
                      {seller.status === "active" && (
                        <DropdownMenuItem
                          onClick={() => updateStatusMutation.mutate({ sellerId: seller._id, status: "suspended" })}
                        >
                          <XCircle className="h-4 w-4 mr-2" />
                          Suspend seller
                        </DropdownMenuItem>
                      )}
                      {seller.status === "suspended" && (
                        <DropdownMenuItem
                          onClick={() => updateStatusMutation.mutate({ sellerId: seller._id, status: "active" })}
                        >
                          <CheckCircle className="h-4 w-4 mr-2" />
                          Reactivate seller
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuItem
                        onClick={() =>
                          toggleTopRatedMutation.mutate({ sellerId: seller._id, isTopRated: !seller.isTopRated })
                        }
                        disabled={toggleTopRatedMutation.isPending}
                      >
                        <Star className="h-4 w-4 mr-2" />
                        {seller.isTopRated ? "Remove from featured" : "Add to featured"}
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        onClick={() => setDeleteConfirm(seller._id)}
                        className="text-rose-600 focus:text-rose-700"
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete seller
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>

              {deleteConfirm === seller._id && (
                <>
                  <Separator className="my-3" />
                  <div
                    className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-rose-50 border border-rose-100 rounded-md p-3"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <p className="text-xs font-medium text-rose-800">
                      Delete <span className="font-semibold">{seller.shopName}</span>? This cannot be undone.
                    </p>
                    <div className="flex gap-2 shrink-0">
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-7 text-xs"
                        onClick={() => setDeleteConfirm(null)}
                      >
                        Cancel
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        className="h-7 text-xs"
                        onClick={() => deleteSellerMutation.mutate(seller._id)}
                        disabled={deleteSellerMutation.isPending}
                      >
                        {deleteSellerMutation.isPending ? "Deleting…" : "Confirm delete"}
                      </Button>
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        ))}

        {filteredSellers.length === 0 && (
          <Card className="border-slate-200 border-dashed">
            <CardContent className="p-8 text-center">
              <Users className="h-6 w-6 mx-auto text-slate-300 mb-2" />
              <p className="text-sm text-slate-500">No sellers match this filter.</p>
            </CardContent>
          </Card>
        )}
      </div>

      <SellerDetailDialog
        seller={sellersWithStats.find((s) => s._id === selectedSellerId) ?? null}
        open={!!selectedSellerId}
        onOpenChange={(open) => {
          if (!open) setSelectedSellerId(null);
        }}
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Seller Detail Dialog — full seller profile + coupon-discount breakdown.
// The "coupon diff." amount is what the admin owes/pays out of pocket:
// customers paid the discounted totalPrice, but the seller is still owed
// the full pre-discount amount, so discountAmount is the platform's cost.
// ---------------------------------------------------------------------------
function SellerDetailDialog({
  seller,
  open,
  onOpenChange,
}: {
  seller:
    | (SellerWithUser & {
        stats: { totalBookings: number; pendingCount: number; totalRevenue: number; totalCouponDiscount: number; couponOrdersCount: number };
        pendingBookings: BookingWithDetails[];
        bookings: BookingWithDetails[];
      })
    | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  if (!seller) return null;

  const sortedBookings = [...seller.bookings].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
  const pendingBookings = sortedBookings.filter((b) => b.status === "Pending");
  const couponBookings = sortedBookings.filter((b) => (b.discountAmount || 0) > 0);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex flex-wrap items-center gap-2">
            {seller.shopName}
            <Badge variant={sellerStatusVariant[seller.status] ?? "secondary"} className="text-xs capitalize">
              {seller.status}
            </Badge>
            {seller.isTopRated && (
              <Badge variant="outline" className="text-xs border-amber-300 text-amber-700 bg-amber-50">
                <Star className="h-3 w-3 mr-1 fill-amber-500 text-amber-500" />
                Featured
              </Badge>
            )}
            {pendingBookings.length > 0 && (
              <Badge variant="outline" className="text-xs border-amber-400 text-amber-900 bg-amber-100 font-bold">
                <AlertCircle className="h-3 w-3 mr-1 text-amber-700 animate-pulse" />
                {pendingBookings.length} Pending Order{pendingBookings.length > 1 ? "s" : ""}
              </Badge>
            )}
          </DialogTitle>
          <DialogDescription>Full seller profile, pending orders, revenue, and coupon breakdown.</DialogDescription>
        </DialogHeader>

        {/* Owner & contact info */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm bg-slate-50 border border-slate-100 rounded-md p-3">
          <div>
            <span className="text-slate-500">Owner:</span>{" "}
            <span className="font-medium text-slate-800">{seller.user.name}</span>
          </div>
          <div className="flex items-center gap-1">
            <Mail className="h-3.5 w-3.5 text-slate-400" />
            <span className="font-medium text-slate-800">{seller.user.email}</span>
          </div>
          <div className="flex items-center gap-1">
            <Phone className="h-3.5 w-3.5 text-slate-400" />
            <span className="font-medium text-slate-800">{seller.contactNumber}</span>
          </div>
          <div>
            <span className="text-slate-500">Address:</span>{" "}
            <span className="font-medium text-slate-800">
              {seller.address}, {seller.city}
            </span>
          </div>
          {seller.ratingStats && seller.ratingStats.totalRatings > 0 && (
            <div className="flex items-center gap-1">
              <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
              <span className="font-medium text-slate-800">
                {seller.ratingStats.averageRating} average ({seller.ratingStats.totalRatings} ratings)
              </span>
            </div>
          )}
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
          <div className="rounded-md border border-slate-200 p-2.5 text-center">
            <div className="text-base font-bold text-slate-900">{seller.stats.totalBookings}</div>
            <div className="text-[10px] text-slate-500 uppercase tracking-wide">Total Orders</div>
          </div>
          <div className={`rounded-md border p-2.5 text-center ${pendingBookings.length > 0 ? "border-amber-300 bg-amber-50" : "border-slate-200"}`}>
            <div className={`text-base font-bold ${pendingBookings.length > 0 ? "text-amber-800 flex items-center justify-center gap-1" : "text-slate-900"}`}>
              {pendingBookings.length > 0 && <AlertCircle className="h-4 w-4 text-amber-600 animate-pulse" />}
              {pendingBookings.length}
            </div>
            <div className={`text-[10px] uppercase tracking-wide font-bold ${pendingBookings.length > 0 ? "text-amber-700" : "text-slate-500"}`}>Pending Unconfirmed</div>
          </div>
          <div className="rounded-md border border-slate-200 p-2.5 text-center">
            <div className="text-base font-bold text-slate-900">₹{seller.stats.totalRevenue}</div>
            <div className="text-[10px] text-slate-500 uppercase tracking-wide">Customer Paid</div>
          </div>
          <div className="rounded-md border border-rose-200 bg-rose-50 p-2.5 text-center">
            <div className="text-base font-bold text-rose-600">₹{seller.stats.totalCouponDiscount}</div>
            <div className="text-[10px] text-rose-500 uppercase tracking-wide">Coupon Diff</div>
          </div>
          <div className="rounded-md border border-slate-200 p-2.5 text-center">
            <div className="text-base font-bold text-slate-900">{seller.stats.couponOrdersCount}</div>
            <div className="text-[10px] text-slate-500 uppercase tracking-wide">Coupon Orders</div>
          </div>
        </div>

        {/* ⏳ Pending Unconfirmed Orders Section */}
        {pendingBookings.length > 0 && (
          <div className="border border-amber-200 bg-amber-50/60 rounded-lg p-3 space-y-2.5">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-bold text-amber-900 flex items-center gap-1.5">
                <AlertCircle className="h-4 w-4 text-amber-600 animate-pulse" />
                Pending Unconfirmed Orders ({pendingBookings.length})
              </h4>
              <Badge className="bg-amber-600 text-white text-[11px]">
                Awaiting Seller Confirmation
              </Badge>
            </div>

            <div className="space-y-2.5 max-h-72 overflow-y-auto pr-1">
              {pendingBookings.map((booking) => (
                <div key={booking._id} className="bg-white border border-amber-200 rounded-md p-3 text-xs space-y-2 shadow-xs">
                  <div className="flex justify-between items-start border-b border-slate-100 pb-2">
                    <div>
                      <span className="font-bold text-slate-900 text-sm">{booking.tiffin?.title || "Tiffin Order"}</span>
                      <span className="text-slate-500 text-[11px] block">
                        Order ID: <code className="bg-slate-100 px-1 py-0.5 rounded text-slate-800 font-mono text-[11px]">{booking._id}</code> • {format(new Date(booking.createdAt), "dd MMM yyyy, hh:mm a")}
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="text-sm font-bold text-slate-900">₹{booking.totalPrice}</span>
                      <Badge variant="outline" className="text-[10px] capitalize block ml-auto mt-0.5 border-amber-300 bg-amber-50 text-amber-800">
                        {booking.paymentMethod?.toUpperCase() || "COD"} ({booking.paymentStatus || "Pending"})
                      </Badge>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-slate-700 bg-slate-50 p-2.5 rounded border border-slate-200">
                    <div>
                      <p className="font-bold text-slate-900 text-xs mb-0.5">👤 Customer Details:</p>
                      <p className="font-medium text-slate-800">{booking.customerName}</p>
                      <p className="text-slate-600 flex items-center gap-1">
                        <Phone className="h-3 w-3 text-slate-400" /> {booking.customerPhone}
                      </p>
                      <p className="text-slate-600 flex items-center gap-1">
                        <Mail className="h-3 w-3 text-slate-400" /> {booking.customerEmail}
                      </p>
                    </div>
                    <div>
                      <p className="font-bold text-slate-900 text-xs mb-0.5">📦 Order Details:</p>
                      <p className="text-slate-600">
                        <span className="font-medium text-slate-800">Address:</span> {booking.customerAddress || (booking as any).deliveryAddress || "N/A"}, {booking.customerCity}
                      </p>
                      <p className="text-slate-600">
                        <span className="font-medium text-slate-800">Slot & Type:</span> {booking.slot} ({booking.bookingType})
                      </p>
                      <p className="text-slate-600">
                        <span className="font-medium text-slate-800">Quantity:</span> {booking.quantity || 1}
                      </p>
                    </div>
                  </div>

                  {booking.addOns && booking.addOns.length > 0 && (
                    <div className="text-[11px] text-slate-600">
                      <span className="font-semibold text-slate-800">Add-ons:</span> {booking.addOns.map(a => `${a.name} (x${a.quantity})`).join(", ")}
                    </div>
                  )}

                  {booking.customization && (
                    <div className="text-[11px] text-amber-900 bg-amber-50 p-1.5 rounded border border-amber-200">
                      <span className="font-bold">Instructions:</span> "{booking.customization}"
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Coupon-discounted orders */}
        {couponBookings.length > 0 && (
          <div>
            <h4 className="text-sm font-semibold text-slate-800 mb-2">
              Coupon-discounted orders — difference amount owed to seller
            </h4>
            <div className="border border-slate-200 rounded-md overflow-hidden">
              <div className="max-h-64 overflow-y-auto divide-y divide-slate-100">
                {couponBookings.map((booking) => {
                  const actualPrice = (booking.totalPrice || 0) + (booking.discountAmount || 0);
                  return (
                    <div key={booking._id} className="p-2.5 text-xs sm:text-sm flex flex-wrap items-center justify-between gap-2">
                      <div className="min-w-0">
                        <div className="font-medium text-slate-800 truncate">{booking.tiffin?.title || "Item"}</div>
                        <div className="text-slate-500">
                          {booking.customerName} · {format(new Date(booking.createdAt), "dd MMM yyyy, hh:mm a")}
                        </div>
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        {booking.couponCode && (
                          <Badge variant="outline" className="text-[10px]">
                            <Tag className="h-3 w-3 mr-1" />
                            {booking.couponCode}
                          </Badge>
                        )}
                        <span className="text-slate-400 line-through">₹{actualPrice}</span>
                        <span className="font-semibold text-slate-800">₹{booking.totalPrice}</span>
                        <span className="font-semibold text-rose-600">-₹{booking.discountAmount}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* All orders */}
        <div>
          <h4 className="text-sm font-semibold text-slate-800 mb-2">All orders ({sortedBookings.length})</h4>
          {sortedBookings.length === 0 ? (
            <p className="text-sm text-slate-500">No orders yet for this seller.</p>
          ) : (
            <div className="border border-slate-200 rounded-md overflow-hidden">
              <div className="max-h-72 overflow-y-auto divide-y divide-slate-100">
                {sortedBookings.map((booking) => (
                  <div key={booking._id} className="p-2.5 text-xs sm:text-sm flex flex-wrap items-center justify-between gap-2">
                    <div className="min-w-0">
                      <div className="font-medium text-slate-800 truncate">{booking.tiffin?.title || "Item"}</div>
                      <div className="text-slate-500">
                        {booking.customerName} · {format(new Date(booking.createdAt), "dd MMM yyyy, hh:mm a")}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Badge variant="outline" className="text-[10px] capitalize">
                        {booking.bookingType}
                      </Badge>
                      <Badge
                        variant={
                          booking.status === "Delivered"
                            ? "default"
                            : booking.status === "Cancelled"
                            ? "destructive"
                            : "secondary"
                        }
                        className="text-[10px]"
                      >
                        {booking.status}
                      </Badge>
                      <span className="font-semibold text-slate-800">₹{booking.totalPrice}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ---------------------------------------------------------------------------
// Broadcast Notification Management Component
// ---------------------------------------------------------------------------

interface BroadcastItem {
  _id: string;
  title: string;
  message: string;
  type: string;
  targetAudience: string;
  createdAt: string;
  recipientCount: number;
}

function NotificationBroadcastManagement() {
  const { toast } = useToast();
  const [form, setForm] = useState({
    targetAudience: "all",
    targetUserId: "",
    title: "",
    message: "",
    type: "announcement",
    link: "",
  });

  const { data: historyData, isLoading } = useQuery<{ history: BroadcastItem[] }>({
    queryKey: ["/api/admin/notifications/broadcast-history"],
    queryFn: () => apiRequest("GET", "/api/admin/notifications/broadcast-history"),
  });

  const broadcastMutation = useMutation({
    mutationFn: (data: typeof form) =>
      apiRequest("POST", "/api/admin/notifications/broadcast", data),
    onSuccess: (res: any) => {
      toast({
        title: "Notification Broadcasted!",
        description: res.message || "Notification sent successfully.",
      });
      setForm({
        targetAudience: "all",
        targetUserId: "",
        title: "",
        message: "",
        type: "announcement",
        link: "",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/notifications/broadcast-history"] });
    },
    onError: (err: Error) => {
      toast({
        title: "Broadcast Failed",
        description: err.message,
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim() || !form.message.trim()) {
      toast({
        title: "Validation Error",
        description: "Title and message are required.",
        variant: "destructive",
      });
      return;
    }
    broadcastMutation.mutate(form);
  };

  return (
    <div className="space-y-6">
      <SectionHeading
        title="Broadcast Notifications"
        description="Send live messages and announcements to Customers, Sellers, or All Users."
      />

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Send Broadcast Form */}
        <Card className="border-slate-200 shadow-sm">
          <CardHeader className="border-b border-slate-100 pb-4">
            <div className="flex items-center gap-2">
              <Megaphone className="h-5 w-5 text-red-500" />
              <div>
                <CardTitle className="text-base">Send New Notification</CardTitle>
                <CardDescription>Target specific user groups or broadcast to everyone.</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-6">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label className="text-slate-700 font-medium">Target Audience</Label>
                <Select
                  value={form.targetAudience}
                  onValueChange={(val) => setForm({ ...form, targetAudience: val })}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Select target audience" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">👥 All Users (Customers & Sellers)</SelectItem>
                    <SelectItem value="customer">🛒 Customers Only</SelectItem>
                    <SelectItem value="seller">🧑‍🍳 Sellers Only</SelectItem>
                    <SelectItem value="user">👤 Specific User ID</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {form.targetAudience === "user" && (
                <div>
                  <Label className="text-slate-700 font-medium">User ID</Label>
                  <Input
                    placeholder="Enter user's MongoDB ObjectId"
                    value={form.targetUserId}
                    onChange={(e) => setForm({ ...form, targetUserId: e.target.value })}
                    className="mt-1"
                  />
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-slate-700 font-medium">Category / Type</Label>
                  <Select
                    value={form.type}
                    onValueChange={(val) => setForm({ ...form, type: val })}
                  >
                    <SelectTrigger className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="announcement">📢 Announcement</SelectItem>
                      <SelectItem value="promo">🎁 Promotion / Offer</SelectItem>
                      <SelectItem value="urgent">⚠️ Urgent Alert</SelectItem>
                      <SelectItem value="system">🔔 System Info</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label className="text-slate-700 font-medium">Target Link (Optional)</Label>
                  <Input
                    placeholder="e.g. /my-bookings or /seller/dashboard"
                    value={form.link}
                    onChange={(e) => setForm({ ...form, link: e.target.value })}
                    className="mt-1"
                  />
                </div>
              </div>

              <div>
                <Label className="text-slate-700 font-medium">Notification Title *</Label>
                <Input
                  placeholder="e.g. 🎉 Special Weekend Offer On Tiffins!"
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  className="mt-1 font-medium"
                  required
                />
              </div>

              <div>
                <Label className="text-slate-700 font-medium">Message Body *</Label>
                <textarea
                  rows={4}
                  placeholder="Write message details for your customers/sellers..."
                  value={form.message}
                  onChange={(e) => setForm({ ...form, message: e.target.value })}
                  className="w-full mt-1 p-3 text-sm rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500"
                  required
                />
              </div>

              <Button
                type="submit"
                disabled={broadcastMutation.isPending}
                className="w-full bg-red-600 hover:bg-red-700 text-white font-medium shadow-sm hover:shadow transition-all"
              >
                {broadcastMutation.isPending ? (
                  "Broadcasting..."
                ) : (
                  <>
                    <Send className="w-4 h-4 mr-2" />
                    Broadcast Notification
                  </>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Broadcast History */}
        <Card className="border-slate-200 shadow-sm flex flex-col">
          <CardHeader className="border-b border-slate-100 pb-4">
            <div className="flex items-center gap-2">
              <History className="h-5 w-5 text-slate-500" />
              <div>
                <CardTitle className="text-base">Sent History</CardTitle>
                <CardDescription>Recent notifications broadcasted by admins.</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0 flex-1 overflow-y-auto">
            {isLoading ? (
              <div className="p-8 text-center text-sm text-slate-400">Loading broadcast history...</div>
            ) : !historyData?.history || historyData.history.length === 0 ? (
              <div className="p-8 text-center text-sm text-slate-400">No broadcast history yet.</div>
            ) : (
              <div className="divide-y divide-slate-100">
                {historyData.history.map((item, idx) => (
                  <div key={idx} className="p-4 hover:bg-slate-50 transition-colors space-y-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-semibold text-slate-900 text-sm">{item.title}</span>
                      <Badge variant="outline" className="text-[10px] uppercase font-bold text-[#C1440E] border-[#C1440E]/20 bg-[#C1440E]/5">
                        {item.targetAudience || "all"}
                      </Badge>
                    </div>
                    <p className="text-xs text-slate-600 leading-relaxed">{item.message}</p>
                    <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1">
                      <span>Recipients: {item.recipientCount} user(s)</span>
                      <span>{format(new Date(item.createdAt), "MMM d, yyyy h:mm a")}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Admin Panel (root)
// ---------------------------------------------------------------------------

export default function AdminPanel() {
  const { user, isAuthenticated } = useAuth();
  const [, setLocation] = useLocation();
  const [activeTab, setActiveTab] = useState("sellers");

  useEffect(() => {
    if (!isAuthenticated || user?.role !== "admin") {
      setLocation("/login");
    }
  }, [isAuthenticated, user, setLocation]);

  const { data: stats } = useQuery<AdminStats>({
    queryKey: ["/api/admin/stats"],
    enabled: isAuthenticated && user?.role === "admin",
    refetchInterval: 30000,
  });

  if (!isAuthenticated || user?.role !== "admin") {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="text-center">
          <Shield className="h-12 w-12 mx-auto mb-4 text-slate-300" />
          <h1 className="text-xl font-semibold text-slate-900 mb-1">Access denied</h1>
          <p className="text-sm text-slate-500">You don't have permission to view this page.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button
              onClick={() => setLocation("/")}
              variant="outline"
              size="sm"
              className="border-slate-200"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
            <Separator orientation="vertical" className="h-6" />
            <div>
              <h1 className="text-lg font-semibold text-slate-900 leading-tight">Admin dashboard</h1>
              <p className="text-xs text-slate-500">Manage sellers, coupons, and platform operations</p>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
          <StatCard label="Total sellers" value={stats?.totalSellers ?? 0} hint="All registered" icon={Users} />
          <StatCard label="Active" value={stats?.activeSellers ?? 0} hint="Currently active" icon={UserCheck} tone="positive" />
          <StatCard label="Suspended" value={stats?.suspendedSellers ?? 0} hint="Disabled" icon={XCircle} tone="negative" />
          <StatCard label="Pending" value={stats?.pendingSellers ?? 0} hint="Awaiting approval" icon={AlertCircle} tone="warning" />
          <StatCard label="Total tiffins" value={stats?.totalTiffins ?? 0} hint="Available listings" icon={UtensilsCrossed} />
          <StatCard label="Total bookings" value={stats?.totalBookings ?? 0} hint="All orders" icon={Package} />
          <StatCard label="Total revenue" value={`₹${stats?.totalRevenue ?? 0}`} hint="Platform earnings" icon={BarChart3} tone="positive" />
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-4 sm:w-auto sm:inline-grid">
            <TabsTrigger value="sellers" className="flex items-center gap-2">
              <ChefHat className="h-4 w-4" />
              Sellers
            </TabsTrigger>
            <TabsTrigger value="coupons" className="flex items-center gap-2">
              <Tag className="h-4 w-4" />
              Coupons
            </TabsTrigger>
            <TabsTrigger value="wallets" className="flex items-center gap-2">
              <Wallet className="h-4 w-4" />
              Wallets
            </TabsTrigger>
            <TabsTrigger value="notifications" className="flex items-center gap-2">
              <Bell className="h-4 w-4" />
              Send Notifications
            </TabsTrigger>
          </TabsList>

          <TabsContent value="sellers">
            <SellerManagement />
          </TabsContent>

          <TabsContent value="coupons">
            <CouponManagement />
          </TabsContent>

          <TabsContent value="wallets">
            <WalletManagement />
          </TabsContent>

          <TabsContent value="notifications">
            <NotificationBroadcastManagement />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}