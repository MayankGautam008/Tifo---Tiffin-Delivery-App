import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { forgotPasswordSchema, type ForgotPasswordData } from "@shared/schema";
import { ArrowLeft, Mail, UtensilsCrossed } from "lucide-react";

export default function ForgotPassword() {
  const { toast } = useToast();
  const [emailSent, setEmailSent] = useState(false);

  const form = useForm<ForgotPasswordData>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: {
      email: "",
    },
  });

  const forgotPasswordMutation = useMutation({
    mutationFn: async (data: ForgotPasswordData) => {
      return await apiRequest("POST", "/api/auth/forgot-password", data);
    },
    onSuccess: () => {
      setEmailSent(true);
      toast({
        title: "OTP Sent! 📧",
        description: "Check your email for the OTP code",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to send OTP",
        description: error.message || "Please try again",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: ForgotPasswordData) => {
    forgotPasswordMutation.mutate(data);
  };

  return (
    <div className="min-h-screen bg-white flex items-center justify-center px-4">
      <div className="absolute top-6 left-6">
        <Link href="/login">
          <Button variant="outline" size="sm" className="bg-white border-red-200 hover:bg-red-50 text-red-600">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Login
          </Button>
        </Link>
      </div>

      <Card className="w-full max-w-md border-2 border-red-100 shadow-2xl bg-white rounded-3xl overflow-hidden">
        <div className="absolute top-0 left-0 right-0 h-2 bg-red-600"></div>
        
        <CardHeader className="text-center pb-6 pt-8">
          <div className="flex justify-center mb-4">
            <div className="w-16 h-16 bg-red-600 rounded-2xl flex items-center justify-center shadow-lg">
              <Mail className="w-8 h-8 text-white" />
            </div>
          </div>
          <CardTitle className="font-bold text-2xl text-gray-900">
            Forgot Password
          </CardTitle>
          <CardDescription className="text-gray-600 mt-2">
            {emailSent 
              ? "Enter the OTP sent to your email" 
              : "Enter your email to receive OTP"
            }
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-6 pb-8">
          {!emailSent ? (
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
                        <Input
                          placeholder="yourgmail@example.com"
                          type="email"
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
                  className="w-full h-12 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-xl shadow-lg transition-all duration-200"
                  disabled={forgotPasswordMutation.isPending}
                >
                  {forgotPasswordMutation.isPending ? (
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      Sending OTP...
                    </div>
                  ) : (
                    "Send OTP"
                  )}
                </Button>
              </form>
            </Form>
          ) : (
            <div className="text-center space-y-4">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
                <Mail className="w-8 h-8 text-green-600" />
              </div>
              <p className="text-gray-600">
                OTP sent to <strong>{form.watch('email')}</strong>
              </p>
              <Link href={`/verify-otp?email=${encodeURIComponent(form.watch('email'))}`}>
                <Button className="w-full h-12 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-xl">
                  Verify OTP
                </Button>
              </Link>
              <Button
                variant="outline"
                onClick={() => setEmailSent(false)}
                className="w-full h-12 border-red-200 text-red-600 hover:bg-red-50"
              >
                Use Different Email
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}