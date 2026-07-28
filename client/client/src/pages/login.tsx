import { useState, useEffect } from "react";
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
import { loginSchema, type LoginCredentials, type AuthResponse } from "@shared/schema";
import { UtensilsCrossed, Eye, EyeOff, ChefHat, Shield, User, ArrowLeft, Home, Star, Truck, Clock, ShieldCheck, RefreshCw } from "lucide-react";

// Turnstile types
declare global {
  interface Window {
    turnstile: {
      render: (container: string | HTMLElement, options: any) => string;
      remove: (widgetId: string) => void;
      reset: (widgetId: string) => void;
    };
  }
}

export default function Login() {
  const { toast } = useToast();
  const { login } = useAuth();
  const [, setLocation] = useLocation();
  const [showPassword, setShowPassword] = useState(false);
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
  const [turnstileWidgetId, setTurnstileWidgetId] = useState<string | null>(null);
  const [isTurnstileLoaded, setIsTurnstileLoaded] = useState(false);

  // Load Turnstile script
  useEffect(() => {
    const script = document.createElement("script");
    script.src = "https://challenges.cloudflare.com/turnstile/v0/api.js";
    script.async = true;
    script.defer = true;
    
    script.onload = () => {
      setIsTurnstileLoaded(true);
      initializeTurnstile();
    };

    document.head.appendChild(script);

    return () => {
      // Cleanup
      if (turnstileWidgetId && window.turnstile) {
        window.turnstile.remove(turnstileWidgetId);
      }
    };
  }, []);

  // Initialize Turnstile
  const initializeTurnstile = () => {
    if (window.turnstile) {
      const widgetId = window.turnstile.render("#turnstile-widget", {
        sitekey: import.meta.env.VITE_TURNSTILE_SITE_KEY || "1x00000000000000000000AA",
        callback: (token: string) => {
          setTurnstileToken(token);
        },
        "error-callback": () => {
          setTurnstileToken(null);
          toast({
            title: "Verification failed",
            description: "Please complete the security check",
            variant: "destructive",
          });
        },
        "expired-callback": () => {
          setTurnstileToken(null);
        },
      });
      setTurnstileWidgetId(widgetId);
    }
  };

  // Reset Turnstile
  const resetTurnstile = () => {
    if (turnstileWidgetId && window.turnstile) {
      window.turnstile.reset(turnstileWidgetId);
      setTurnstileToken(null);
    }
  };

  const form = useForm<LoginCredentials & { turnstileToken?: string }>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const loginMutation = useMutation({
    mutationFn: async (data: LoginCredentials & { turnstileToken?: string }) => {
      if (!turnstileToken) {
        throw new Error("Please complete the security verification");
      }
      
      const response = await apiRequest<AuthResponse>("POST", "/api/auth/login", {
        email: data.email,
        password: data.password,
        turnstileToken: turnstileToken
      });
      return response;
    },
    onSuccess: (data) => {
      // Pehle login function call karo
      login(data);
      
      // Toast dikhao
      toast({
        title: "Welcome back! 🎉",
        description: "You've successfully logged in.",
      });
      
      // Small delay dekar redirect karo taaki auth context properly update ho jaye
      setTimeout(() => {
        // Data se directly redirect karo - auth context par depend mat karo
        if (data.user.role === "admin") {
          setLocation("/admin");
        } else if (data.user.role === "seller") {
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
      // Reset Turnstile on error
      resetTurnstile();
    },
  });

  const onSubmit = (data: LoginCredentials) => {
    if (!turnstileToken) {
      toast({
        title: "Security verification required",
        description: "Please complete the security check",
        variant: "destructive",
      });
      return;
    }
    
    loginMutation.mutate({ ...data, turnstileToken });
  };

  const demoLogin = (role: "admin" | "seller" | "user") => {
    const demoCredentials = {
      admin: { email: "admin@demo.com", password: "admin123" },
      seller: { email: "seller@demo.com", password: "seller123" },
      user: { email: "user@demo.com", password: "user123" }
    };
    
    form.setValue("email", demoCredentials[role].email);
    form.setValue("password", demoCredentials[role].password);
    
    // For demo, we'll bypass Turnstile by setting a mock token
    const mockToken = "demo_turnstile_token_" + Date.now();
    setTurnstileToken(mockToken);
    
    // Submit after a small delay to ensure token is set
    setTimeout(() => {
      onSubmit(demoCredentials[role]);
    }, 100);
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
                  <h1 className="text-4xl font-bold text-red-600">Tifo</h1>
                  <p className="text-gray-600 mt-1">Fresh Food Delivery</p>
                </div>
              </div>
              
              <h2 className="text-5xl font-bold text-gray-900 leading-tight">
                Welcome back to your <span className="text-red-600">food</span> journey
              </h2>
              
              <p className="text-xl text-gray-600 leading-relaxed">
                Manage your restaurant, track orders, and grow your business with our powerful platform designed for food entrepreneurs.
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

          {/* Right side - Login card */}
          <div className="flex justify-center">
            <Card className="w-full max-w-md border-2 border-red-100 shadow-2xl bg-white rounded-3xl overflow-hidden">
              <div className="absolute top-0 left-0 right-0 h-2 bg-red-600"></div>
              
              <CardHeader className="text-center pb-6 pt-8">
                <div className="flex justify-center mb-4">
                  <div className="w-20 h-20 bg-red-600 rounded-2xl flex items-center justify-center shadow-lg">
                    <UtensilsCrossed className="w-10 h-10 text-white" />
                  </div>
                </div>
                <CardTitle className="font-bold text-3xl text-gray-900">
                  Welcome Back
                </CardTitle>
                <CardDescription className="text-lg text-gray-600 mt-2">
                  Sign in to continue to your dashboard
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
                          <FormLabel className="text-sm font-medium text-gray-700">
                            Email Address
                          </FormLabel>
                          <FormControl>
                            <div className="relative">
                              <Input
                                placeholder="user@gmail.com"
                                type="email"
                                {...field}
                                className="h-12 px-4 rounded-xl border-red-200 focus:ring-2 focus:ring-red-500 focus:border-red-500 bg-white"
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
                          <FormLabel className="text-sm font-medium text-gray-700">
                            Password
                          </FormLabel>
                          <FormControl>
                            <div className="relative">
                              <Input
                                placeholder="Enter your password"
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

                    {/* Cloudflare Turnstile - YAHI ADD KIYA HAI */}
                    <div className="space-y-3">
                      <FormLabel className="text-sm font-medium text-gray-700">
                        Security Verification
                      </FormLabel>
                      <div className="flex justify-center">
                        <div 
                          id="turnstile-widget" 
                          className="turnstile-widget"
                          style={{ 
                            minHeight: '65px',
                            display: 'flex',
                            justifyContent: 'center'
                          }}
                        />
                      </div>
                      {!isTurnstileLoaded && (
                        <div className="text-center py-4">
                          <div className="flex items-center justify-center gap-2 text-gray-500">
                            <RefreshCw className="w-4 h-4 animate-spin" />
                            Loading security check...
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="text-right">
                      <Link href="/forgot-password">
                        <a className="text-sm text-red-600 hover:text-red-700 font-medium hover:underline transition-colors">
                          Forgot your password?
                        </a>
                      </Link>
                    </div>

                    <Button
                      type="submit"
                      className="w-full h-12 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-xl shadow-lg transition-all duration-200 transform hover:scale-[1.02] disabled:opacity-50"
                      disabled={loginMutation.isPending || !turnstileToken}
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
                  <span className="text-gray-600">Don't have an account? </span>
                  <Link href="/register">
                    <a className="text-red-600 font-semibold hover:text-red-700 hover:underline transition-colors">
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