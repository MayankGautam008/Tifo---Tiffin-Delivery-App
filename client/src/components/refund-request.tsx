import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import {
  RefreshCw,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  IndianRupee,
} from "lucide-react";

interface RefundRequest {
  _id: string;
  bookingId: any;
  amount: number;
  reason: string;
  status: "pending" | "approved" | "rejected" | "processed";
  refundMethod: string;
  adminNote?: string;
  createdAt: string;
  processedAt?: string;
}

const statusConfig = {
  pending: {
    label: "Under Review",
    color: "bg-orange-50 text-orange-700 border-orange-200",
    icon: <Clock className="w-3 h-3" />,
  },
  approved: {
    label: "Approved",
    color: "bg-green-50 text-green-700 border-green-200",
    icon: <CheckCircle2 className="w-3 h-3" />,
  },
  rejected: {
    label: "Rejected",
    color: "bg-red-50 text-red-700 border-red-200",
    icon: <XCircle className="w-3 h-3" />,
  },
  processed: {
    label: "Processed",
    color: "bg-blue-50 text-blue-700 border-blue-200",
    icon: <CheckCircle2 className="w-3 h-3" />,
  },
};

export function RefundRequestButton({
  bookingId,
  amount,
  disabled,
}: {
  bookingId: string;
  amount: number;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [refundMethod, setRefundMethod] = useState("original");
  const { toast } = useToast();

  const mutation = useMutation({
    mutationFn: () =>
      apiRequest("POST", "/api/refunds", { bookingId, reason, refundMethod }),
    onSuccess: () => {
      toast({
        title: "Refund Requested ✅",
        description: "Your refund request has been submitted for review.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/refunds/my"] });
      setOpen(false);
      setReason("");
    },
    onError: (err: any) => {
      toast({
        title: "Request Failed",
        description: err.message,
        variant: "destructive",
      });
    },
  });

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        disabled={disabled}
        onClick={() => setOpen(true)}
        className="w-full border-purple-200 text-purple-700 hover:bg-purple-50 text-xs mt-2"
      >
        <RefreshCw className="w-3 h-3 mr-1.5" />
        Request Refund
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base flex items-center gap-2">
              <RefreshCw className="w-4 h-4 text-purple-600" />
              Request Refund
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="flex items-center justify-between p-3 bg-purple-50 rounded-xl border border-purple-200">
              <span className="text-sm text-gray-600">Refund Amount</span>
              <span className="font-bold text-purple-700 flex items-center gap-1">
                <IndianRupee className="w-4 h-4" />
                {amount}
              </span>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-gray-700">
                Reason for Refund *
              </Label>
              <Textarea
                placeholder="Please describe why you're requesting a refund..."
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="min-h-[80px] text-sm resize-none"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-gray-700">
                Refund Method
              </Label>
              <Select value={refundMethod} onValueChange={setRefundMethod}>
                <SelectTrigger className="h-9 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="original">Original Payment Method</SelectItem>
                  <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                  <SelectItem value="wallet">Wallet Credits</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-start gap-2 p-3 bg-amber-50 rounded-xl border border-amber-200">
              <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-amber-700">
                Refund requests are reviewed within 2–3 business days. You'll receive
                a notification with the decision.
              </p>
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" size="sm" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button
              size="sm"
              className="bg-purple-600 hover:bg-purple-700 text-white"
              onClick={() => mutation.mutate()}
              disabled={!reason.trim() || mutation.isPending}
            >
              {mutation.isPending ? "Submitting..." : "Submit Request"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

export function MyRefunds() {
  const { data: refunds = [], isLoading } = useQuery<RefundRequest[]>({
    queryKey: ["/api/refunds/my"],
  });

  if (isLoading) {
    return (
      <div className="space-y-2">
        {[1, 2].map((i) => (
          <div key={i} className="h-16 bg-gray-100 rounded-xl animate-pulse" />
        ))}
      </div>
    );
  }

  if (refunds.length === 0) {
    return (
      <div className="py-8 text-center">
        <RefreshCw className="w-8 h-8 text-gray-300 mx-auto mb-2" />
        <p className="text-sm text-gray-500">No refund requests</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {refunds.map((r) => {
        const cfg = statusConfig[r.status];
        return (
          <div
            key={r._id}
            className="border border-gray-200 rounded-xl p-3 bg-white"
          >
            <div className="flex items-start justify-between gap-2 mb-2">
              <div>
                <p className="text-xs font-semibold text-gray-800">
                  Refund #{r._id.slice(-6).toUpperCase()}
                </p>
                <p className="text-xs text-gray-500 mt-0.5">{r.reason}</p>
              </div>
              <Badge className={`${cfg.color} border text-xs flex items-center gap-1`}>
                {cfg.icon}
                {cfg.label}
              </Badge>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-sm font-bold text-purple-700">₹{r.amount}</span>
              <span className="text-[10px] text-gray-400">
                {new Date(r.createdAt).toLocaleDateString("en-IN")}
              </span>
            </div>

            {r.adminNote && (
              <p className="text-xs text-gray-600 mt-2 p-2 bg-gray-50 rounded-lg">
                Admin: {r.adminNote}
              </p>
            )}
          </div>
        );
      })}
    </div>
  );
}
