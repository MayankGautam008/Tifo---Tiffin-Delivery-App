import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { MapPin, Plus, Pencil, Trash2, Check, Home, Briefcase } from "lucide-react";
import type { Address } from "@shared/schema";

interface AddressBookDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  // Optional "picker" mode: shows a select control and calls onSelect when the
  // user confirms which address to use (used from the cart at checkout).
  selectable?: boolean;
  selectedAddressId?: string | null;
  onSelect?: (address: Address) => void;
}

const emptyForm = {
  label: "Home",
  recipientName: "",
  recipientPhone: "",
  addressLine: "",
  city: "",
  isForSomeoneElse: false,
};

export function AddressBookDialog({
  open,
  onOpenChange,
  selectable = false,
  selectedAddressId = null,
  onSelect,
}: AddressBookDialogProps) {
  const { toast } = useToast();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [pickedId, setPickedId] = useState<string | null>(selectedAddressId);

  const { data: addresses = [], isLoading } = useQuery<Address[]>({
    queryKey: ["/api/addresses"],
    enabled: open,
  });

  const saveMutation = useMutation({
    mutationFn: (data: typeof emptyForm & { id?: string }) => {
      const { id, ...payload } = data;
      return id
        ? apiRequest("PUT", `/api/addresses/${id}`, payload)
        : apiRequest("POST", "/api/addresses", payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/addresses"] });
      toast({ title: editingId ? "Address updated" : "Address saved" });
      setIsFormOpen(false);
      setEditingId(null);
      setForm(emptyForm);
    },
    onError: (error: Error) => {
      toast({ title: "Couldn't save address", description: error.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/addresses/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/addresses"] });
      toast({ title: "Address removed" });
    },
  });

  const setDefaultMutation = useMutation({
    mutationFn: (id: string) => apiRequest("PATCH", `/api/addresses/${id}/default`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/addresses"] });
    },
  });

  const openAddForm = () => {
    setEditingId(null);
    setForm(emptyForm);
    setIsFormOpen(true);
  };

  const openEditForm = (address: Address) => {
    setEditingId(address._id);
    setForm({
      label: address.label,
      recipientName: address.recipientName,
      recipientPhone: address.recipientPhone,
      addressLine: address.addressLine,
      city: address.city,
      isForSomeoneElse: address.isForSomeoneElse,
    });
    setIsFormOpen(true);
  };

  const handleSubmit = () => {
    if (!form.recipientName.trim() || !form.recipientPhone.trim() || !form.addressLine.trim() || !form.city.trim()) {
      toast({ title: "Fill all fields", description: "Name, phone, address and city are required", variant: "destructive" });
      return;
    }
    saveMutation.mutate({ ...form, id: editingId || undefined });
  };

  const labelIcon = (label: string) => {
    if (label.toLowerCase() === "home") return <Home className="w-4 h-4" />;
    if (label.toLowerCase() === "work") return <Briefcase className="w-4 h-4" />;
    return <MapPin className="w-4 h-4" />;
  };

  const handleConfirmSelection = () => {
    const chosen = addresses.find((a) => a._id === pickedId);
    if (chosen && onSelect) onSelect(chosen);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isFormOpen ? (editingId ? "Edit Address" : "Add New Address") : "Manage Addresses"}</DialogTitle>
        </DialogHeader>

        {!isFormOpen ? (
          <div className="space-y-3">
            {isLoading && <p className="text-sm text-muted-foreground">Loading addresses...</p>}

            {!isLoading && addresses.length === 0 && (
              <p className="text-sm text-muted-foreground">No saved addresses yet. Add one to get started.</p>
            )}

            {selectable ? (
              <RadioGroup value={pickedId || ""} onValueChange={setPickedId}>
                {addresses.map((address) => (
                  <div key={address._id} className="flex items-start gap-3 border rounded-lg p-3">
                    <RadioGroupItem value={address._id} id={address._id} className="mt-1" />
                    <Label htmlFor={address._id} className="flex-1 cursor-pointer">
                      <AddressRow address={address} labelIcon={labelIcon} />
                    </Label>
                    <Button variant="ghost" size="icon" onClick={() => openEditForm(address)} data-testid={`button-edit-address-${address._id}`}>
                      <Pencil className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
              </RadioGroup>
            ) : (
              addresses.map((address) => (
                <div key={address._id} className="flex items-start gap-3 border rounded-lg p-3">
                  <div className="flex-1">
                    <AddressRow address={address} labelIcon={labelIcon} />
                  </div>
                  <div className="flex flex-col gap-1 items-end">
                    {!address.isDefault && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-xs h-7"
                        onClick={() => setDefaultMutation.mutate(address._id)}
                      >
                        Set default
                      </Button>
                    )}
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEditForm(address)} data-testid={`button-edit-address-${address._id}`}>
                        <Pencil className="w-3.5 h-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-destructive"
                        onClick={() => deleteMutation.mutate(address._id)}
                        data-testid={`button-delete-address-${address._id}`}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))
            )}

            <Button variant="outline" className="w-full" onClick={openAddForm} data-testid="button-add-address">
              <Plus className="w-4 h-4 mr-2" />
              Add New Address
            </Button>

            {selectable && (
              <Button className="w-full" disabled={!pickedId} onClick={handleConfirmSelection} data-testid="button-confirm-address">
                <Check className="w-4 h-4 mr-2" />
                Deliver to this address
              </Button>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            <div>
              <Label>Label</Label>
              <div className="flex gap-2 mt-1">
                {["Home", "Work", "Other"].map((l) => (
                  <Button
                    key={l}
                    type="button"
                    size="sm"
                    variant={form.label === l ? "default" : "outline"}
                    onClick={() => setForm((f) => ({ ...f, label: l }))}
                  >
                    {l}
                  </Button>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-between border rounded-lg p-3">
              <div>
                <p className="text-sm font-medium">Order for someone else</p>
                <p className="text-xs text-muted-foreground">Use a different name & phone number for this address</p>
              </div>
              <Switch
                checked={form.isForSomeoneElse}
                onCheckedChange={(checked) => setForm((f) => ({ ...f, isForSomeoneElse: checked }))}
                data-testid="switch-for-someone-else"
              />
            </div>

            <div>
              <Label htmlFor="recipientName">{form.isForSomeoneElse ? "Recipient's Name" : "Your Name"}</Label>
              <Input
                id="recipientName"
                value={form.recipientName}
                onChange={(e) => setForm((f) => ({ ...f, recipientName: e.target.value }))}
                placeholder="Full name"
                data-testid="input-recipient-name"
              />
            </div>

            <div>
              <Label htmlFor="recipientPhone">{form.isForSomeoneElse ? "Recipient's Phone" : "Your Phone"}</Label>
              <Input
                id="recipientPhone"
                value={form.recipientPhone}
                onChange={(e) => setForm((f) => ({ ...f, recipientPhone: e.target.value }))}
                placeholder="10-digit phone number"
                data-testid="input-recipient-phone"
              />
            </div>

            <div>
              <Label htmlFor="addressLine">Address</Label>
              <Input
                id="addressLine"
                value={form.addressLine}
                onChange={(e) => setForm((f) => ({ ...f, addressLine: e.target.value }))}
                placeholder="House no., street, area"
                data-testid="input-address-line"
              />
            </div>

            <div>
              <Label htmlFor="city">City</Label>
              <Input
                id="city"
                value={form.city}
                onChange={(e) => setForm((f) => ({ ...f, city: e.target.value }))}
                placeholder="City"
                data-testid="input-address-city"
              />
            </div>

            <div className="flex gap-2 pt-2">
              <Button variant="outline" className="flex-1" onClick={() => setIsFormOpen(false)}>
                Cancel
              </Button>
              <Button className="flex-1" onClick={handleSubmit} disabled={saveMutation.isPending} data-testid="button-save-address">
                {saveMutation.isPending ? "Saving..." : "Save Address"}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function AddressRow({ address, labelIcon }: { address: Address; labelIcon: (l: string) => JSX.Element }) {
  return (
    <div>
      <div className="flex items-center gap-2 flex-wrap">
        {labelIcon(address.label)}
        <span className="font-medium text-sm">{address.label}</span>
        {address.isDefault && <Badge variant="secondary" className="text-xs">Default</Badge>}
        {address.isForSomeoneElse && <Badge variant="outline" className="text-xs">For someone else</Badge>}
      </div>
      <p className="text-sm text-muted-foreground mt-1">{address.addressLine}, {address.city}</p>
      <p className="text-xs text-muted-foreground mt-0.5">{address.recipientName} • {address.recipientPhone}</p>
    </div>
  );
}
