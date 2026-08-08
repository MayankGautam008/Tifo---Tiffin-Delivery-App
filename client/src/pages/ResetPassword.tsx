import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { Link, useSearch } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { resetPasswordSchema, type ResetPasswordData } from "@shared/schema";
import { ArrowLeft, Eye, EyeOff, CheckCircle, UtensilsCrossed } from "lucide-react";
import { z } from "zod"; // ✅ ADD THIS IMPORT

// ✅ Create extended schema with confirmPassword
const resetPasswordWithConfirmSchema = resetPasswordSchema.extend({
  confirmPassword: z.string().min(6, "Confirm password is required")
});

export default function ResetPassword() {
  const { toast } = useToast();
  const searchParams = new URLSearchParams(useSearch());
  const email = searchParams.get('email') || "";
  const otp = searchParams.get('otp') || "";
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [passwordReset, setPasswordReset] = useState(false);

  const form = useForm<ResetPasswordData & { confirmPassword: string }>({
    resolver: zodResolver(resetPasswordWithConfirmSchema), // ✅ USE THE NEW SCHEMA
    defaultValues: {
      email: email,
      otp: otp,
      newPassword: "",
      confirmPassword: "",
    },
  });

  const resetPasswordMutation = useMutation({
    mutationFn: async (data: ResetPasswordData) => {
      return await apiRequest("POST", "/api/auth/reset-password", data);
    },
    onSuccess: () => {
      setPasswordReset(true);
      toast({
        title: "Password Reset! ✅",
        description: "Your password has been reset successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to reset password",
        description: error.message || "Please try again",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: ResetPasswordData & { confirmPassword: string }) => {
    if (data.newPassword !== data.confirmPassword) {
      toast({
        title: "Passwords don't match",
        description: "Please make sure both passwords match",
        variant: "destructive",
      });
      return;
    }

    resetPasswordMutation.mutate({
      email: data.email,
      otp: data.otp,
      newPassword: data.newPassword
    });
  };

  if (passwordReset) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center px-4">
        <Card className="w-full max-w-md border-2 border-green-100 shadow-2xl bg-white rounded-3xl overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-2 bg-green-600"></div>
          
          <CardHeader className="text-center pb-6 pt-8">
            <div className="flex justify-center mb-4">
              <div className="w-16 h-16 bg-green-600 rounded-2xl flex items-center justify-center shadow-lg">
                <CheckCircle className="w-8 h-8 text-white" />
              </div>
            </div>
            <CardTitle className="font-bold text-2xl text-gray-900">
              Password Reset!
            </CardTitle>
            <CardDescription className="text-gray-600 mt-2">
              Your password has been reset successfully
            </CardDescription>
          </CardHeader>
          
          <CardContent className="space-y-6 pb-8 text-center">
            <p className="text-gray-600">
              You can now login with your new password
            </p>
            <Link href="/login">
              <Button className="w-full h-12 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-xl">
                Go to Login
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white flex items-center justify-center px-4">
      <div className="absolute top-6 left-6">
        <Link href="/verify-otp">
          <Button variant="outline" size="sm" className="bg-white border-red-200 hover:bg-red-50 text-red-600">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
        </Link>
      </div>

      <Card className="w-full max-w-md border-2 border-red-100 shadow-2xl bg-white rounded-3xl overflow-hidden">
        <div className="absolute top-0 left-0 right-0 h-2 bg-red-600"></div>
        
        <CardHeader className="text-center pb-6 pt-8">
          <div className="flex justify-center mb-4">
            <div className="w-16 h-16 bg-red-600 rounded-2xl flex items-center justify-center shadow-lg">
              <UtensilsCrossed className="w-8 h-8 text-white" />
            </div>
          </div>
          <CardTitle className="font-bold text-2xl text-gray-900">
            Reset Password
          </CardTitle>
          <CardDescription className="text-gray-600 mt-2">
            Enter your new password for <strong>{email}</strong>
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-6 pb-8">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="newPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm font-medium text-gray-700">
                      New Password
                    </FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Input
                          placeholder="Enter new password"
                          type={showPassword ? "text" : "password"}
                          {...field}
                          className="h-12 px-4 pr-12 rounded-xl border-red-200 focus:ring-2 focus:ring-red-500 focus:border-red-500 bg-white"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
                        >
                          {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                        </button>
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="confirmPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm font-medium text-gray-700">
                      Confirm Password
                    </FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Input
                          placeholder="Confirm new password"
                          type={showConfirmPassword ? "text" : "password"}
                          {...field}
                          className="h-12 px-4 pr-12 rounded-xl border-red-200 focus:ring-2 focus:ring-red-500 focus:border-red-500 bg-white"
                        />
                        <button
                          type="button"
                          onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                          className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
                        >
                          {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                        </button>
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Button
                type="submit"
                className="w-full h-12 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-xl shadow-lg transition-all duration-200"
                disabled={resetPasswordMutation.isPending}
              >
                {resetPasswordMutation.isPending ? (
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    Resetting...
                  </div>
                ) : (
                  "Reset Password"
                )}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}