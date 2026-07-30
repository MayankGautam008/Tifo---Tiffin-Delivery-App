import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { Link, useSearch, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { verifyOTPSchema, type VerifyOTPData } from "@shared/schema";
import { ArrowLeft, Shield, UtensilsCrossed } from "lucide-react";

export default function VerifyOTP() {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const searchParams = new URLSearchParams(useSearch());
  const email = searchParams.get('email') || "";
  const [timer, setTimer] = useState(300); // 5 minutes
  const [canResend, setCanResend] = useState(false);

  // ✅ BUG FIX: previously, if this page was opened without ?email=, the
  // form's hidden email field failed zod validation silently — clicking
  // "Verify OTP" just did nothing with no visible error. Catch it here.
  useEffect(() => {
    if (!email) {
      toast({
        title: "Missing email",
        description: "Please restart the password reset process.",
        variant: "destructive",
      });
      setLocation("/forgot-password");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [email]);

  const form = useForm<VerifyOTPData>({
    resolver: zodResolver(verifyOTPSchema),
    defaultValues: {
      email: email,
      otp: "",
    },
  });

  // ✅ EFFICIENCY FIX: the old effect depended on [timer], so it tore down
  // and recreated a new setInterval every single second. One interval,
  // set up once for the page's lifetime, is enough — it just stops
  // decrementing once it reaches 0, so a later Resend (which resets timer
  // back to 300) keeps counting down correctly too.
  useEffect(() => {
    const interval = setInterval(() => {
      setTimer((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    setCanResend(timer === 0);
  }, [timer]);

  const verifyOTPMutation = useMutation({
    mutationFn: async (data: VerifyOTPData) => {
      return await apiRequest("POST", "/api/auth/verify-otp", data);
    },
    onSuccess: () => {
      toast({
        title: "OTP Verified! ✅",
        description: "You can now reset your password",
      });
      // Redirect to reset password page
      setLocation(`/reset-password?email=${encodeURIComponent(email)}&otp=${encodeURIComponent(form.watch('otp'))}`);
    },
    onError: (error: any) => {
      toast({
        title: "Invalid OTP",
        description: error.message || "Please check the OTP and try again",
        variant: "destructive",
      });
    },
  });

  const resendOTPMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest("POST", "/api/auth/forgot-password", { email });
    },
    onSuccess: () => {
      setTimer(300);
      setCanResend(false);
      toast({
        title: "OTP Resent! 📧",
        description: "New OTP sent to your email",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to resend OTP",
        description: error.message || "Please try again",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: VerifyOTPData) => {
    verifyOTPMutation.mutate(data);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="min-h-screen bg-white flex items-center justify-center px-4">
      <div className="absolute top-6 left-6">
        <Link href="/forgot-password">
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
              <Shield className="w-8 h-8 text-white" />
            </div>
          </div>
          <CardTitle className="font-bold text-2xl text-gray-900">
            Verify OTP
          </CardTitle>
          <CardDescription className="text-gray-600 mt-2">
            Enter the 6-digit OTP sent to <strong>{email}</strong>
          </CardDescription>
          <div className="text-sm text-red-600 font-medium mt-2">
            Time remaining: {formatTime(timer)}
          </div>
        </CardHeader>
        
        <CardContent className="space-y-6 pb-8">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="otp"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm font-medium text-gray-700">
                      6-Digit OTP
                    </FormLabel>
                    <FormControl>
                      <Input
                        placeholder="123456"
                        type="text"
                        maxLength={6}
                        {...field}
                        className="h-12 px-4 text-center text-lg font-mono rounded-xl border-red-200 focus:ring-2 focus:ring-red-500 focus:border-red-500 bg-white"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Button
                type="submit"
                className="w-full h-12 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-xl shadow-lg transition-all duration-200"
                disabled={verifyOTPMutation.isPending || timer === 0}
              >
                {verifyOTPMutation.isPending ? (
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    Verifying...
                  </div>
                ) : (
                  "Verify OTP"
                )}
              </Button>
            </form>
          </Form>

          <div className="text-center">
            <Button
              variant="outline"
              onClick={() => resendOTPMutation.mutate()}
              disabled={!canResend || resendOTPMutation.isPending}
              className="w-full h-12 border-red-200 text-red-600 hover:bg-red-50"
            >
              {resendOTPMutation.isPending ? "Sending..." : "Resend OTP"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}