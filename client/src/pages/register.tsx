import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/lib/auth-context";
import { apiRequest } from "@/lib/queryClient";
import { markSellerLandedOnDashboard } from "@/lib/seller-landing";
import { TurnstileWidget } from "@/components/turnstile-widget";
import { insertUserSchema, type InsertUser, type AuthResponse } from "@shared/schema";
import { UtensilsCrossed, Eye, EyeOff, ArrowLeft, Home, Star, Truck, Clock, ShieldCheck, Mail } from "lucide-react";

type RegisterResponse = AuthResponse | { requiresOtp: true; email: string; message: string };

type RegisterFormData = InsertUser;

export default function Register() {
  const { toast } = useToast();
  const { login } = useAuth();
  const [, setLocation] = useLocation();
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
  const captchaConfigured = Boolean(import.meta.env.VITE_TURNSTILE_SITE_KEY);

  // ✅ NEW: after submitting the form we wait here for the email OTP
  // instead of creating the account straight away.
  const [otpStep, setOtpStep] = useState(false);
  const [pendingEmail, setPendingEmail] = useState("");
  const [otpValue, setOtpValue] = useState("");
  const [otpError, setOtpError] = useState<string | null>(null);

  const form = useForm<RegisterFormData>({
    resolver: zodResolver(insertUserSchema),
    defaultValues: {
      name: "",
      email: "",
      phone: "",
      password: "",
      role: "customer",
      address: "",
      city: "",
    },
  });

  const registerMutation = useMutation({
    mutationFn: async (data: RegisterFormData) => {
      setIsLoading(true);
      return await apiRequest<RegisterResponse>("POST", "/api/auth/register", {
        ...data,
        turnstileToken,
      });
    },
    onSuccess: (data) => {
      // ✅ Email verification step — account isn't created yet, an OTP was
      // just emailed to them. Switch the card over to the OTP form.
      if ("requiresOtp" in data && data.requiresOtp) {
        setPendingEmail(data.email);
        setOtpStep(true);
        toast({
          title: "Verify your email",
          description: `We've sent a 6-digit OTP to ${data.email}`,
        });
        return;
      }

      login(data);
      toast({
        title: "Account created!",
        description: "Welcome to Tiffo.",
      });

      if (data.user.role === "seller") {
        toast({
          title: "Seller account pending",
          description: "Your account is pending approval from admin.",
          variant: "default",
        });
        // ✅ See login.tsx / home.tsx — this marks the one-time dashboard
        // landing as done so the seller's own "Home" navbar link works
        // normally afterwards instead of bouncing them back every time.
        markSellerLandedOnDashboard();
        setLocation("/seller/dashboard");
      } else {
        setLocation("/");
      }
    },
    onError: (error: any) => {
      toast({
        title: "Registration failed",
        description: error.message || "Something went wrong. Please try again.",
        variant: "destructive",
      });
    },
    onSettled: () => {
      setIsLoading(false);
    },
  });

  const verifyOtpMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest<AuthResponse>("POST", "/api/auth/register/verify-otp", {
        email: pendingEmail,
        otp: otpValue,
      });
    },
    onSuccess: (data) => {
      setOtpError(null);
      login(data);
      toast({
        title: "Email verified! 🎉",
        description: "Welcome to Tiffo.",
      });

      if (data.user.role === "seller") {
        toast({
          title: "Seller account pending",
          description: "Your account is pending approval from admin.",
          variant: "default",
        });
        markSellerLandedOnDashboard();
        setLocation("/seller/dashboard");
      } else {
        setLocation("/");
      }
    },
    onError: (error: any) => {
      setOtpError(error.message || "Invalid OTP. Please try again.");
    },
  });

  const resendOtpMutation = useMutation({
    mutationFn: async () => apiRequest("POST", "/api/auth/register/resend-otp", { email: pendingEmail }),
    onSuccess: () => {
      setOtpValue("");
      setOtpError(null);
      toast({ title: "OTP resent", description: `Check ${pendingEmail} again.` });
    },
    onError: (error: any) => {
      toast({ title: "Couldn't resend OTP", description: error.message, variant: "destructive" });
    },
  });

  const onSubmit = (data: RegisterFormData) => {
    registerMutation.mutate(data);
  };

  const onVerifyOtp = () => {
    if (otpValue.length !== 6) {
      setOtpError("Enter the 6-digit OTP");
      return;
    }
    verifyOtpMutation.mutate();
  };

  const goBack = () => {
    window.history.back();
  };

  const goHome = () => {
    setLocation("/");
  };

  return (
    <div className="min-h-screen bg-white">
      {/* Custom Header with Back and Home buttons */}
      <div className="relative z-50">
        <div className="absolute top-6 left-6 flex gap-3">
          <Button
            onClick={goHome}
            variant="outline"
            size="sm"
            className="bg-white border-red-200 hover:bg-red-50 text-red-600 shadow-sm rounded-xl"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Home
          </Button>
        </div>
      </div>

      {/* Background decorative elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-red-100 rounded-full mix-blend-multiply filter blur-xl opacity-30"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-red-50 rounded-full mix-blend-multiply filter blur-xl opacity-30"></div>
      </div>

      <div className="relative flex items-center justify-center min-h-screen px-4 py-8">
        <div className="grid lg:grid-cols-2 gap-12 max-w-6xl w-full items-center">
          {/* Left side - Hero section */}
          <div className="hidden lg:block space-y-8">
            <div className="space-y-6">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 bg-red-600 rounded-2xl flex items-center justify-center shadow-lg">
                  <UtensilsCrossed className="w-8 h-8 text-white" />
                </div>
                <div>
                  <h1 className="text-4xl font-bold text-red-600">Tiffo</h1>
                  <p className="text-gray-600 mt-1">Fresh Food Delivery</p>
                </div>
              </div>
              
              <h2 className="text-5xl font-bold text-gray-900 leading-tight">
                Start your <span className="text-red-600">food</span> journey with us
              </h2>
              
              <p className="text-xl text-gray-600 leading-relaxed">
                Join thousands of food lovers and restaurant owners who trust us for delicious meals and business growth.
              </p>
            </div>

            {/* Features grid */}
            <div className="grid grid-cols-2 gap-4 mt-8">
              <div className="flex items-start gap-3 p-4 bg-red-50 rounded-2xl border border-red-100">
                <div className="w-10 h-10 bg-red-100 rounded-xl flex items-center justify-center">
                  <Truck className="w-5 h-5 text-red-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">Fast Delivery</h3>
                  <p className="text-sm text-gray-600 mt-1">30-min delivery guarantee</p>
                </div>
              </div>
              
              <div className="flex items-start gap-3 p-4 bg-red-50 rounded-2xl border border-red-100">
                <div className="w-10 h-10 bg-red-100 rounded-xl flex items-center justify-center">
                  <Star className="w-5 h-5 text-red-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">Premium Quality</h3>
                  <p className="text-sm text-gray-600 mt-1">Fresh ingredients daily</p>
                </div>
              </div>
              
              <div className="flex items-start gap-3 p-4 bg-red-50 rounded-2xl border border-red-100">
                <div className="w-10 h-10 bg-red-100 rounded-xl flex items-center justify-center">
                  <ShieldCheck className="w-5 h-5 text-red-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">Safe & Hygienic</h3>
                  <p className="text-sm text-gray-600 mt-1">Quality assured packaging</p>
                </div>
              </div>
              
              <div className="flex items-start gap-3 p-4 bg-red-50 rounded-2xl border border-red-100">
                <div className="w-10 h-10 bg-red-100 rounded-xl flex items-center justify-center">
                  <Clock className="w-5 h-5 text-red-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">24/7 Support</h3>
                  <p className="text-sm text-gray-600 mt-1">Always here to help</p>
                </div>
              </div>
            </div>
          </div>

          {/* Right side - Register card */}
          <div className="flex justify-center">
            <Card className="w-full max-w-md border-2 border-red-100 shadow-2xl bg-white rounded-3xl overflow-hidden">
              <div className="absolute top-0 left-0 right-0 h-2 bg-red-600"></div>
              
              <CardHeader className="text-center pb-4 pt-6">
                <div className="flex justify-center mb-3">
                  <div className="w-16 h-16 bg-red-600 rounded-2xl flex items-center justify-center shadow-lg">
                    <UtensilsCrossed className="w-8 h-8 text-white" />
                  </div>
                </div>
                <CardTitle className="font-bold text-2xl text-gray-900">
                  Create Account
                </CardTitle>
                <CardDescription className="text-gray-600">
                  Join Tiffo and start your journey
                </CardDescription>
              </CardHeader>
              
              <CardContent className="pb-6">
              {otpStep ? (
                <div className="space-y-5 text-center">
                  <div className="flex justify-center">
                    <div className="w-14 h-14 bg-red-100 rounded-2xl flex items-center justify-center">
                      <Mail className="w-7 h-7 text-red-600" />
                    </div>
                  </div>
                  <p className="text-gray-600 text-sm">
                    Enter the 6-digit OTP sent to<br />
                    <span className="font-semibold text-gray-900">{pendingEmail}</span>
                  </p>
                  <Input
                    inputMode="numeric"
                    maxLength={6}
                    placeholder="000000"
                    value={otpValue}
                    onChange={(e) => setOtpValue(e.target.value.replace(/\D/g, "").slice(0, 6))}
                    className="h-12 text-center text-2xl tracking-[0.5em] rounded-xl border-red-200 focus:ring-2 focus:ring-red-500 focus:border-red-500"
                  />
                  {otpError && <p className="text-sm text-red-600">{otpError}</p>}
                  <Button
                    onClick={onVerifyOtp}
                    disabled={verifyOtpMutation.isPending}
                    className="w-full h-11 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-xl"
                  >
                    {verifyOtpMutation.isPending ? "Verifying..." : "Verify & Create Account"}
                  </Button>
                  <button
                    type="button"
                    onClick={() => resendOtpMutation.mutate()}
                    disabled={resendOtpMutation.isPending}
                    className="text-sm text-red-600 hover:underline font-medium"
                  >
                    {resendOtpMutation.isPending ? "Resending..." : "Resend OTP"}
                  </button>
                  <div>
                    <button
                      type="button"
                      onClick={() => {
                        setOtpStep(false);
                        setTurnstileToken(null);
                      }}
                      className="text-xs text-gray-500 hover:underline"
                    >
                      ← Edit details
                    </button>
                  </div>
                </div>
              ) : (
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                    {/* Grid layout for compact form */}
                    <div className="grid grid-cols-2 gap-3">
                      {/* Name - Full width */}
                      <div className="col-span-2">
                        <FormField
                          control={form.control}
                          name="name"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-sm font-medium text-gray-700">Full Name</FormLabel>
                              <FormControl>
                                <Input
                                  placeholder="User"
                                  {...field}
                                  className="h-10 rounded-xl border-red-200 focus:ring-2 focus:ring-red-500 focus:border-red-500 bg-white"
                                />
                              </FormControl>
                              <FormMessage className="text-xs" />
                            </FormItem>
                          )}
                        />
                      </div>

                      {/* Email - Full width */}
                      <div className="col-span-2">
                        <FormField
                          control={form.control}
                          name="email"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-sm font-medium text-gray-700">Email</FormLabel>
                              <FormControl>
                                <Input
                                  placeholder="user@gmail.com"
                                  type="email"
                                  {...field}
                                  className="h-10 rounded-xl border-red-200 focus:ring-2 focus:ring-red-500 focus:border-red-500 bg-white"
                                />
                              </FormControl>
                              <FormMessage className="text-xs" />
                            </FormItem>
                          )}
                        />
                      </div>

                      {/* Phone and City side by side */}
                      <div className="col-span-1">
                        <FormField
                          control={form.control}
                          name="phone"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-sm font-medium text-gray-700">Phone</FormLabel>
                              <FormControl>
                                <Input
                                  placeholder="9876543210"
                                  {...field}
                                  className="h-10 rounded-xl border-red-200 focus:ring-2 focus:ring-red-500 focus:border-red-500 bg-white"
                                />
                              </FormControl>
                              <FormMessage className="text-xs" />
                            </FormItem>
                          )}
                        />
                      </div>

                      <div className="col-span-1">
                        <FormField
                          control={form.control}
                          name="city"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-sm font-medium text-gray-700">City</FormLabel>
                              <FormControl>
                                <Input 
                                  placeholder="City" 
                                  {...field}
                                  className="h-10 rounded-xl border-red-200 focus:ring-2 focus:ring-red-500 focus:border-red-500 bg-white"
                                />
                              </FormControl>
                              <FormMessage className="text-xs" />
                            </FormItem>
                          )}
                        />
                      </div>

                      {/* Address - Full width */}
                      <div className="col-span-2">
                        <FormField
                          control={form.control}
                          name="address"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-sm font-medium text-gray-700">Address</FormLabel>
                              <FormControl>
                                <Textarea
                                  placeholder="Enter your complete address"
                                  {...field}
                                  className="min-h-16 rounded-xl border-red-200 focus:ring-2 focus:ring-red-500 focus:border-red-500 bg-white resize-none text-sm"
                                />
                              </FormControl>
                              <FormMessage className="text-xs" />
                            </FormItem>
                          )}
                        />
                      </div>

                      {/* Password and Role side by side */}
                      <div className="col-span-1">
                        <FormField
                          control={form.control}
                          name="password"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-sm font-medium text-gray-700">Password</FormLabel>
                              <FormControl>
                                <div className="relative">
                                  <Input
                                    placeholder="Password"
                                    type={showPassword ? "text" : "password"}
                                    {...field}
                                    className="h-10 pr-10 rounded-xl border-red-200 focus:ring-2 focus:ring-red-500 focus:border-red-500 bg-white"
                                  />
                                  <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
                                  >
                                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                  </button>
                                </div>
                              </FormControl>
                              <FormMessage className="text-xs" />
                            </FormItem>
                          )}
                        />
                      </div>

                      <div className="col-span-1">
                        <FormField
                          control={form.control}
                          name="role"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-sm font-medium text-gray-700">Role</FormLabel>
                              <Select onValueChange={field.onChange} defaultValue={field.value}>
                                <FormControl>
                                  <SelectTrigger className="h-10 rounded-xl border-red-200 focus:ring-2 focus:ring-red-500 focus:border-red-500 bg-white">
                                    <SelectValue placeholder="Role" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  <SelectItem value="customer">Customer</SelectItem>
                                  <SelectItem value="seller">Seller</SelectItem>
                                </SelectContent>
                              </Select>
                              <FormMessage className="text-xs" />
                            </FormItem>
                          )}
                        />
                      </div>
                    </div>

                    <TurnstileWidget onVerify={setTurnstileToken} />

                    {/* Submit Button */}
                    <Button
                      type="submit"
                      className="w-full h-11 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-xl shadow-lg transition-all duration-200 transform hover:scale-[1.02] disabled:opacity-50 mt-4"
                      disabled={registerMutation.isPending || (captchaConfigured && !turnstileToken)}
                    >
                      {isLoading ? (
                        <div className="flex items-center gap-2">
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                          Creating account...
                        </div>
                      ) : (
                        "Create Account"
                      )}
                    </Button>
                  </form>
                </Form>
              )}

                <div className="text-center text-sm pt-4">
                  <span className="text-gray-600">Already have an account? </span>
                  <Link href="/login">
                    <a className="text-red-600 font-semibold hover:text-red-700 hover:underline transition-colors">
                      Sign in
                    </a>
                  </Link>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}