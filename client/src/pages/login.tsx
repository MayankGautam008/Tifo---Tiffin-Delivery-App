import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/lib/auth-context";
import { apiRequest } from "@/lib/queryClient";
import { markSellerLandedOnDashboard } from "@/lib/seller-landing";
import { TurnstileWidget } from "@/components/turnstile-widget";
import { loginSchema, type LoginCredentials, type AuthResponse } from "@shared/schema";
import { Eye, EyeOff, ArrowLeft, Settings2, CalendarDays, ChefHat, ShieldCheck } from "lucide-react";

/**
 * TifoMark — the brand glyph: a tiffin bowl cradling a spoon, with a
 * leaf growing out of it. Reused everywhere instead of a generic
 * fork/knife icon so the auth screens carry the same identity as the logo.
 */
function TifoMark({ className = "w-8 h-8" }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" fill="none" className={className} aria-hidden="true">
      <path
        d="M10 22c0 8.837 6.268 16 14 16s14-7.163 14-16H10Z"
        fill="white"
        fillOpacity="0.95"
      />
      <path
        d="M8 22h32M12 22c0 8.837 5.373 16 12 16s12-7.163 12-16"
        stroke="currentColor"
        strokeWidth="2.6"
        strokeLinecap="round"
      />
      <path
        d="M24 22V9m0 0c-1.5-2.6-4-3.6-6.4-2.9"
        stroke="#6E9C3F"
        strokeWidth="2.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M24 12c1.6-2.2 3.8-3 6-2.4"
        stroke="#6E9C3F"
        strokeWidth="2.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M30 19c2.4-1.2 4.6-3 6.2-5.4"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
      />
    </svg>
  );
}

export default function Login() {
  const { toast } = useToast();
  const { login } = useAuth();
  const [, setLocation] = useLocation();
  const [showPassword, setShowPassword] = useState(false);
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
  const captchaConfigured = Boolean(import.meta.env.VITE_TURNSTILE_SITE_KEY);

  const form = useForm<LoginCredentials>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const loginMutation = useMutation({
    mutationFn: async (data: LoginCredentials) => {
      const response = await apiRequest<AuthResponse>("POST", "/api/auth/login", {
        email: data.email,
        password: data.password,
        turnstileToken,
      });
      return response;
    },
    onSuccess: (data) => {
      // Pehle login function call karo
      login(data);

      // Toast dikhao
      toast({
        title: "Welcome back! 🎉",
        description: "Your tiffin, your way — good to see you again.",
      });

      // Small delay dekar redirect karo taaki auth context properly update ho jaye
      setTimeout(() => {
        // Data se directly redirect karo - auth context par depend mat karo
        if (data.user.role === "admin") {
          setLocation("/admin");
        } else if (data.user.role === "seller") {
          // ✅ This login already sends the seller to their Dashboard, so
          // mark it done for this browser session — otherwise the first
          // time they click "Home" from the navbar, Home's own redirect
          // (see home.tsx) would immediately bounce them right back.
          markSellerLandedOnDashboard();
          setLocation("/seller/dashboard");
        } else {
          setLocation("/");
        }
      }, 100);
    },
    onError: (error: any) => {
      toast({
        title: "Login failed",
        description: error.message || "Invalid credentials. Please try again.",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: LoginCredentials) => {
    loginMutation.mutate(data);
  };

  const demoLogin = (role: "admin" | "seller" | "user") => {
    const demoCredentials = {
      admin: { email: "admin@demo.com", password: "admin123" },
      seller: { email: "seller@demo.com", password: "seller123" },
      user: { email: "user@demo.com", password: "user123" }
    };

    form.setValue("email", demoCredentials[role].email);
    form.setValue("password", demoCredentials[role].password);

    // Submit after a small delay to ensure values are set
    setTimeout(() => {
      onSubmit(demoCredentials[role]);
    }, 100);
  };

  const goHome = () => {
    setLocation("/");
  };

  return (
    <div className="min-h-screen bg-[#FBF3E7]">
      {/* Custom Header with Home button */}
      <div className="relative z-50">
        <div className="absolute top-6 left-6 flex gap-3">
          <Button
            onClick={goHome}
            variant="outline"
            size="sm"
            className="bg-[#FBF3E7] border-[#E7D2AE] hover:bg-[#F3E3CC] text-[#C1552E] shadow-sm rounded-xl"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Home
          </Button>
        </div>
      </div>

      {/* Background decorative elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-[#F3E3CC] rounded-full mix-blend-multiply filter blur-xl opacity-60"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-[#E7D2AE] rounded-full mix-blend-multiply filter blur-xl opacity-50"></div>
      </div>

      <div className="relative flex items-center justify-center min-h-screen px-4 py-8">
        <div className="grid lg:grid-cols-2 gap-12 max-w-6xl w-full items-center">
          {/* Left side - Hero section */}
          <div className="hidden lg:block space-y-8">
            <div className="space-y-6">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 bg-[#C1552E] rounded-2xl flex items-center justify-center shadow-lg text-white">
                  <TifoMark className="w-9 h-9" />
                </div>
                <div>
                  <h1 className="text-4xl font-serif font-bold text-[#C1552E] tracking-tight">tifo</h1>
                  <p className="text-[#7A6A58] mt-1 text-sm tracking-wide">the right food, right person, right time</p>
                </div>
              </div>

              <h2 className="text-5xl font-serif font-bold text-[#2B2118] leading-tight">
                Welcome back to your <span className="text-[#C1552E]">tiffin</span>
              </h2>

              <p className="text-xl text-[#7A6A58] leading-relaxed">
                Manage your weekly meal plan, tweak tomorrow's thali, or run your kitchen's
                orders — sign in to pick up right where you left off.
              </p>
            </div>

            {/* Features grid */}
            <div className="grid grid-cols-2 gap-4 mt-8">
              <div className="flex items-start gap-3 p-4 bg-[#F3E3CC] rounded-2xl border border-[#E7D2AE]">
                <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center">
                  <Settings2 className="w-5 h-5 text-[#C1552E]" />
                </div>
                <div>
                  <h3 className="font-semibold text-[#2B2118]">Customize Your Thali</h3>
                  <p className="text-sm text-[#7A6A58] mt-1">Swap sabzis, adjust spice, skip what you don't eat</p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-4 bg-[#F3E3CC] rounded-2xl border border-[#E7D2AE]">
                <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center">
                  <CalendarDays className="w-5 h-5 text-[#C1552E]" />
                </div>
                <div>
                  <h3 className="font-semibold text-[#2B2118]">Flexible Tiffin Plans</h3>
                  <p className="text-sm text-[#7A6A58] mt-1">Pause, skip a day, or switch weekly — anytime</p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-4 bg-[#F3E3CC] rounded-2xl border border-[#E7D2AE]">
                <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center">
                  <ChefHat className="w-5 h-5 text-[#C1552E]" />
                </div>
                <div>
                  <h3 className="font-semibold text-[#2B2118]">Real Home Kitchens</h3>
                  <p className="text-sm text-[#7A6A58] mt-1">Ghar-jaisa khana, made fresh every day</p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-4 bg-[#F3E3CC] rounded-2xl border border-[#E7D2AE]">
                <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center">
                  <ShieldCheck className="w-5 h-5 text-[#C1552E]" />
                </div>
                <div>
                  <h3 className="font-semibold text-[#2B2118]">Hygiene Verified</h3>
                  <p className="text-sm text-[#7A6A58] mt-1">Every kitchen checked before it's listed</p>
                </div>
              </div>
            </div>
          </div>

          {/* Right side - Login card */}
          <div className="flex justify-center">
            <Card className="relative w-full max-w-md border-2 border-[#E7D2AE] shadow-2xl bg-white rounded-3xl overflow-hidden">
              <div className="absolute top-0 left-0 right-0 h-2 bg-[#C1552E]"></div>
              <div className="absolute top-5 -right-11 rotate-45 bg-[#6E9C3F] text-white text-[10px] font-semibold tracking-wide px-12 py-1 shadow-md">
                CUSTOM TIFFIN, DAILY
              </div>

              <CardHeader className="text-center pb-6 pt-8">
                <div className="flex justify-center mb-4">
                  <div className="w-20 h-20 bg-[#C1552E] rounded-2xl flex items-center justify-center shadow-lg text-white">
                    <TifoMark className="w-11 h-11" />
                  </div>
                </div>
                <CardTitle className="font-serif font-bold text-3xl text-[#2B2118]">
                  Welcome Back
                </CardTitle>
                <CardDescription className="text-lg text-[#7A6A58] mt-2">
                  Sign in to manage your tiffin
                </CardDescription>
              </CardHeader>

              <CardContent className="space-y-6 pb-8">
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                    <FormField
                      control={form.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-sm font-medium text-[#2B2118]">
                            Email Address
                          </FormLabel>
                          <FormControl>
                            <div className="relative">
                              <Input
                                placeholder="user@gmail.com"
                                type="email"
                                {...field}
                                className="h-12 px-4 rounded-xl border-[#E7D2AE] focus:ring-2 focus:ring-[#C1552E] focus:border-[#C1552E] bg-white"
                              />
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="password"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-sm font-medium text-[#2B2118]">
                            Password
                          </FormLabel>
                          <FormControl>
                            <div className="relative">
                              <Input
                                placeholder="Enter your password"
                                type={showPassword ? "text" : "password"}
                                {...field}
                                className="h-12 px-4 pr-12 rounded-xl border-[#E7D2AE] focus:ring-2 focus:ring-[#C1552E] focus:border-[#C1552E] bg-white"
                              />
                              <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-[#7A6A58] hover:text-[#2B2118]"
                              >
                                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                              </button>
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="text-right">
                      <Link href="/forgot-password">
                        <a className="text-sm text-[#C1552E] hover:text-[#9C4322] font-medium hover:underline transition-colors">
                          Forgot your password?
                        </a>
                      </Link>
                    </div>

                    <TurnstileWidget onVerify={setTurnstileToken} />

                    <Button
                      type="submit"
                      className="w-full h-12 bg-[#C1552E] hover:bg-[#9C4322] text-white font-semibold rounded-xl shadow-lg transition-all duration-200 transform hover:scale-[1.02] disabled:opacity-50"
                      disabled={loginMutation.isPending || (captchaConfigured && !turnstileToken)}
                    >
                      {loginMutation.isPending ? (
                        <div className="flex items-center gap-2">
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                          Signing in...
                        </div>
                      ) : (
                        "Sign In to Dashboard"
                      )}
                    </Button>
                  </form>
                </Form>

                <div className="text-center text-sm">
                  <span className="text-[#7A6A58]">Don't have an account? </span>
                  <Link href="/register">
                    <a className="text-[#C1552E] font-semibold hover:text-[#9C4322] hover:underline transition-colors">
                      Create account
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
