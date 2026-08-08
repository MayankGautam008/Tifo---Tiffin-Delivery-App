import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "./lib/auth-context";
import Home from "@/pages/home";
import Login from "@/pages/login";
import Register from "@/pages/register";
import TiffinDetail from "@/pages/tiffin-detail";
import MyBookings from "@/pages/my-bookings";
import SellerDashboard from "@/pages/seller-dashboard";
import AdminPanel from "@/pages/admin-panel";
import NotFound from "@/pages/not-found";
import About from './pages/About';
import CookiePolicy from "./pages/cookie-policy";
import PrivacyPolicy from "./pages/privacy-policy";
import TermsConditions from "./pages/terms-conditions";
import HelpPage from "@/pages/help";

import ForgotPassword from "./pages/ForgotPassword";
import VerifyOTP from "./pages/VerifyOTP";
import ResetPassword from "./pages/ResetPassword";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/login" component={Login} />
      <Route path="/register" component={Register} />
      <Route path="/tiffin/:id" component={TiffinDetail} />
      <Route path="/my-bookings" component={MyBookings} />
      <Route path="/seller/dashboard" component={SellerDashboard} />
      <Route path="/admin" component={AdminPanel} />
      <Route path="/about" component={About} />
       <Route path="/cookie-policy" component={CookiePolicy} />
       <Route path="/privacy-policy" component={PrivacyPolicy} />
      <Route path="/terms-conditions" component={TermsConditions} />
      <Route path="/help" component={HelpPage} />
      <Route path="/forgot-password" component={ForgotPassword} />
<Route path="/verify-otp" component={VerifyOTP} />
<Route path="/reset-password" component={ResetPassword} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <AuthProvider>
          <Toaster />
          <Router />
        </AuthProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;








