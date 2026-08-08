import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/lib/auth-context";
import { apiRequest } from "@/lib/queryClient";
import { completeProfileSchema, type CompleteProfilePayload } from "@shared/schema";
import { MapPin, Phone, UtensilsCrossed } from "lucide-react";
import { useEffect } from "react";

export default function CompleteProfile() {
  const { toast } = useToast();
  const { user, token, updateUser } = useAuth();
  const [, setLocation] = useLocation();

  // If someone lands here without being logged in, send them to login
  useEffect(() => {
    if (!token) {
      setLocation("/login");
    }
  }, [token, setLocation]);

  const form = useForm<CompleteProfilePayload>({
    resolver: zodResolver(completeProfileSchema),
    defaultValues: {
      phone: "",
      address: "",
      city: "",
    },
  });

  const completeProfileMutation = useMutation({
    mutationFn: async (data: CompleteProfilePayload) => {
      return apiRequest<{ user: any; seller: any }>("POST", "/api/auth/complete-profile", data);
    },
    onSuccess: (data) => {
      updateUser(data.user, data.seller);
      toast({
        title: "Profile complete! 🎉",
        description: "You're all set. Enjoy ordering on Tiffo.",
      });
      setTimeout(() => {
        if (data.user.role === "seller") {
          setLocation("/seller/dashboard");
        } else {
          setLocation("/");
        }
      }, 100);
    },
    onError: (error: any) => {
      toast({
        title: "Something went wrong",
        description: error.message || "Please try again.",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: CompleteProfilePayload) => {
    completeProfileMutation.mutate(data);
  };

  return (
    <div className="min-h-screen bg-white flex items-center justify-center px-4 py-8">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-red-100 rounded-full mix-blend-multiply filter blur-xl opacity-30"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-red-50 rounded-full mix-blend-multiply filter blur-xl opacity-30"></div>
      </div>

      <Card className="relative w-full max-w-md border-2 border-red-100 shadow-2xl bg-white rounded-3xl overflow-hidden">
        <div className="absolute top-0 left-0 right-0 h-2 bg-red-600"></div>

        <CardHeader className="text-center pb-4 pt-8">
          <div className="flex justify-center mb-4">
            <div className="w-20 h-20 bg-red-600 rounded-2xl flex items-center justify-center shadow-lg">
              <UtensilsCrossed className="w-10 h-10 text-white" />
            </div>
          </div>
          <CardTitle className="font-bold text-2xl text-gray-900">
            Just one more step{user?.name ? `, ${user.name.split(" ")[0]}` : ""}
          </CardTitle>
          <CardDescription className="text-gray-600 mt-2">
            We need your delivery address and phone number to get your orders to you.
          </CardDescription>
        </CardHeader>

        <CardContent className="pb-8">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
              <FormField
                control={form.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm font-medium text-gray-700">Phone Number</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <Input
                          placeholder="98765 43210"
                          type="tel"
                          {...field}
                          className="h-12 pl-10 pr-4 rounded-xl border-red-200 focus:ring-2 focus:ring-red-500 focus:border-red-500 bg-white"
                        />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="address"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm font-medium text-gray-700">Delivery Address</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <MapPin className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
                        <Textarea
                          placeholder="House no, street, area, landmark"
                          {...field}
                          className="pl-10 pr-4 pt-3 rounded-xl border-red-200 focus:ring-2 focus:ring-red-500 focus:border-red-500 bg-white min-h-[90px]"
                        />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="city"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm font-medium text-gray-700">City</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Lucknow"
                        {...field}
                        className="h-12 px-4 rounded-xl border-red-200 focus:ring-2 focus:ring-red-500 focus:border-red-500 bg-white"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Button
                type="submit"
                className="w-full h-12 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-xl shadow-lg transition-all duration-200 transform hover:scale-[1.02] disabled:opacity-50"
                disabled={completeProfileMutation.isPending}
              >
                {completeProfileMutation.isPending ? (
                  <div className="flex items-center gap-2 justify-center">
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    Saving...
                  </div>
                ) : (
                  "Save & Continue"
                )}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
