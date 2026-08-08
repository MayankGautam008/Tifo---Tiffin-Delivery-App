// src/components/coupon-management.tsx
import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";
import { Plus, Edit, Trash2, Calendar, IndianRupee, Percent, Users, Copy, CheckCircle2 } from "lucide-react";
import { format } from "date-fns";

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

export function CouponManagement() {
  const { toast } = useToast();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedCoupon, setSelectedCoupon] = useState<Coupon | null>(null);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  const { data: coupons = [], isLoading } = useQuery<Coupon[]>({
    queryKey: ["/api/coupons"],
  });

  const createMutation = useMutation({
    mutationFn: (data: CreateCouponData) => apiRequest("POST", "/api/coupons", data),
    onSuccess: () => {
      toast({
        title: "Coupon Created",
        description: "Coupon has been created successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/coupons"] });
      setIsCreateDialogOpen(false);
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to create coupon",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Coupon> }) =>
      apiRequest("PUT", `/api/coupons/${id}`, data),
    onSuccess: () => {
      toast({
        title: "Coupon Updated",
        description: "Coupon has been updated successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/coupons"] });
      setIsEditDialogOpen(false);
      setSelectedCoupon(null);
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to update coupon",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/coupons/${id}`),
    onSuccess: () => {
      toast({
        title: "Coupon Deleted",
        description: "Coupon has been deleted successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/coupons"] });
      setIsDeleteDialogOpen(false);
      setSelectedCoupon(null);
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to delete coupon",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const copyToClipboard = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    toast({
      title: "Copied!",
      description: "Coupon code copied to clipboard",
    });
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const getDiscountText = (coupon: Coupon) => {
    if (coupon.discountType === "fixed") {
      return `₹${coupon.discountValue} OFF`;
    } else {
      return `${coupon.discountValue}% OFF`;
    }
  };

  const getStatusBadge = (coupon: Coupon) => {
    const now = new Date();
    const validUntil = new Date(coupon.validUntil);
    const validFrom = new Date(coupon.validFrom);

    if (!coupon.isActive) {
      return <Badge variant="secondary">Inactive</Badge>;
    }

    if (now < validFrom) {
      return <Badge variant="outline">Upcoming</Badge>;
    }

    if (now > validUntil) {
      return <Badge variant="destructive">Expired</Badge>;
    }

    if (coupon.usedCount >= coupon.usageLimit) {
      return <Badge variant="destructive">Limit Reached</Badge>;
    }

    return <Badge variant="default">Active</Badge>;
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="h-8 bg-muted rounded w-1/3 animate-pulse"></div>
        <div className="grid gap-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-16 bg-muted rounded animate-pulse"></div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Coupon Management</h2>
          <p className="text-muted-foreground">
            Create and manage discount coupons for your customers
          </p>
        </div>
        <Button onClick={() => setIsCreateDialogOpen(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Create Coupon
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Coupons</CardTitle>
            <Copy className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{coupons.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Coupons</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {coupons.filter(c => c.isActive && new Date(c.validUntil) > new Date() && c.usedCount < c.usageLimit).length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Usage</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {coupons.reduce((sum, coupon) => sum + coupon.usedCount, 0)}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Expired Coupons</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {coupons.filter(c => new Date(c.validUntil) < new Date()).length}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Coupons Table */}
      <Card>
        <CardHeader>
          <CardTitle>All Coupons</CardTitle>
          <CardDescription>
            Manage your discount coupons and track their usage
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Code</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Discount</TableHead>
                <TableHead>Min Order</TableHead>
                <TableHead>Usage</TableHead>
                <TableHead>Valid Until</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {coupons.map((coupon) => (
                <TableRow key={coupon._id}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <code className="relative rounded bg-muted px-[0.3rem] py-[0.2rem] font-mono text-sm font-semibold">
                        {coupon.code}
                      </code>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => copyToClipboard(coupon.code)}
                      >
                        {copiedCode === coupon.code ? (
                          <CheckCircle2 className="h-3 w-3 text-green-600" />
                        ) : (
                          <Copy className="h-3 w-3" />
                        )}
                      </Button>
                    </div>
                  </TableCell>
                  <TableCell className="max-w-[200px] truncate">
                    {coupon.description}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      {coupon.discountType === "fixed" ? (
                        <IndianRupee className="h-3 w-3" />
                      ) : (
                        <Percent className="h-3 w-3" />
                      )}
                      <span className="font-medium">{getDiscountText(coupon)}</span>
                    </div>
                    {coupon.discountType === "percentage" && coupon.maxDiscountAmount && (
                      <div className="text-xs text-muted-foreground">
                        Max ₹{coupon.maxDiscountAmount}
                      </div>
                    )}
                  </TableCell>
                  <TableCell>₹{coupon.minOrderAmount}</TableCell>
                  <TableCell>
                    <div className="text-sm">
                      {coupon.usedCount} / {coupon.usageLimit}
                    </div>
                  </TableCell>
                  <TableCell>
                    {format(new Date(coupon.validUntil), "MMM dd, yyyy")}
                  </TableCell>
                  <TableCell>{getStatusBadge(coupon)}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setSelectedCoupon(coupon);
                          setIsEditDialogOpen(true);
                        }}
                      >
                        <Edit className="h-3 w-3" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setSelectedCoupon(coupon);
                          setIsDeleteDialogOpen(true);
                        }}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Create Coupon Dialog */}
      <CreateCouponDialog
        open={isCreateDialogOpen}
        onOpenChange={setIsCreateDialogOpen}
        onSubmit={createMutation.mutate}
        isLoading={createMutation.isPending}
      />

      {/* Edit Coupon Dialog */}
      {selectedCoupon && (
        <EditCouponDialog
          open={isEditDialogOpen}
          onOpenChange={setIsEditDialogOpen}
          coupon={selectedCoupon}
          onSubmit={(data) => updateMutation.mutate({ id: selectedCoupon._id, data })}
          isLoading={updateMutation.isPending}
        />
      )}

      {/* Delete Confirmation Dialog */}
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

// Create Coupon Dialog Component
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
          <DialogTitle>Create New Coupon</DialogTitle>
          <DialogDescription>
            Create a new discount coupon for your customers.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="code">Coupon Code *</Label>
              <Input
                id="code"
                value={formData.code}
                onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                placeholder="SUMMER2024"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="discountType">Discount Type *</Label>
              <Select
                value={formData.discountType}
                onValueChange={(value: "fixed" | "percentage") =>
                  setFormData({ ...formData, discountType: value })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="fixed">Fixed Amount</SelectItem>
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
                Discount Value *{" "}
                {formData.discountType === "fixed" ? "(₹)" : "(%)"}
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
              <Label htmlFor="minOrderAmount">Minimum Order Amount (₹) *</Label>
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
              <Label htmlFor="maxDiscountAmount">Maximum Discount Amount (₹)</Label>
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
              <Label htmlFor="validFrom">Valid From *</Label>
              <Input
                id="validFrom"
                type="date"
                value={formData.validFrom}
                onChange={(e) => setFormData({ ...formData, validFrom: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="validUntil">Valid Until *</Label>
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
            <Label htmlFor="usageLimit">Usage Limit *</Label>
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
              {isLoading ? "Creating..." : "Create Coupon"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// Edit Coupon Dialog Component
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
  const [formData, setFormData] = useState<Partial<Coupon>>({
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
          <DialogTitle>Edit Coupon</DialogTitle>
          <DialogDescription>
            Update the coupon details and settings.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="edit-code">Coupon Code *</Label>
              <Input
                id="edit-code"
                value={formData.code}
                onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-discountType">Discount Type *</Label>
              <Select
                value={formData.discountType}
                onValueChange={(value: "fixed" | "percentage") =>
                  setFormData({ ...formData, discountType: value })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="fixed">Fixed Amount</SelectItem>
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
                Discount Value *{" "}
                {formData.discountType === "fixed" ? "(₹)" : "(%)"}
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
              <Label htmlFor="edit-minOrderAmount">Minimum Order Amount (₹) *</Label>
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
              <Label htmlFor="edit-maxDiscountAmount">Maximum Discount Amount (₹)</Label>
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
              <Label htmlFor="edit-validFrom">Valid From *</Label>
              <Input
                id="edit-validFrom"
                type="date"
                value={formData.validFrom}
                onChange={(e) => setFormData({ ...formData, validFrom: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-validUntil">Valid Until *</Label>
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
              <Label htmlFor="edit-usageLimit">Usage Limit *</Label>
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
                onValueChange={(value) =>
                  setFormData({ ...formData, isActive: value === "active" })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="bg-muted p-3 rounded-lg">
            <div className="text-sm font-medium">Current Usage</div>
            <div className="text-sm text-muted-foreground">
              {coupon.usedCount} out of {coupon.usageLimit} times used
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? "Updating..." : "Update Coupon"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// Delete Coupon Dialog Component
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
          <DialogTitle>Delete Coupon</DialogTitle>
          <DialogDescription>
            Are you sure you want to delete the coupon <strong>{coupon.code}</strong>? 
            This action cannot be undone.
          </DialogDescription>
        </DialogHeader>
        <div className="bg-muted p-3 rounded-lg">
          <div className="text-sm">
            <strong>Code:</strong> {coupon.code}
          </div>
          <div className="text-sm">
            <strong>Description:</strong> {coupon.description}
          </div>
          <div className="text-sm">
            <strong>Usage:</strong> {coupon.usedCount} / {coupon.usageLimit}
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button variant="destructive" onClick={onConfirm} disabled={isLoading}>
            {isLoading ? "Deleting..." : "Delete Coupon"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}