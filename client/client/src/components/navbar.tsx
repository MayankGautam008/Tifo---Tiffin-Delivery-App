import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { UtensilsCrossed, User, LogOut, Menu, X } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { useState } from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";

export function Navbar() {
  const { user, logout, isAuthenticated, isAdmin } = useAuth();
  const [, setLocation] = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleLogout = () => {
    logout();
    setLocation("/");
  };

  const getDashboardLink = () => {
    if (user?.role === "admin") return "/admin";
    if (user?.role === "seller") return "/seller/dashboard";
    if (user?.role === "customer") return "/my-bookings";
    return "/";
  };

  return (
    <nav className="sticky top-0 z-50 bg-card border-b border-card-border backdrop-blur-sm bg-card/95">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <Link href="/" data-testid="link-home">
            <div className="flex items-center gap-2 hover-elevate active-elevate-2 rounded-md px-3 py-2 transition-all cursor-pointer">
              <UtensilsCrossed className="w-6 h-6 text-primary" />
              <span className="text-xl font-bold font-[family-name:var(--font-sans)] bg-gradient-to-r from-primary to-chart-2 bg-clip-text text-transparent">
                Tifo
              </span>
            </div>
          </Link>

          <div className="hidden md:flex items-center gap-4">
            {isAuthenticated ? (
              <>
                <Link href={getDashboardLink()} data-testid="link-dashboard">
                  <Button variant="ghost" className="hover-elevate active-elevate-2">
                    Dashboard
                  </Button>
                </Link>
                {!isAdmin && (
                  <Link href="/admin" data-testid="link-admin-access">
                    <Button variant="outline" size="sm" className="hover-elevate active-elevate-2">
                      Admin
                    </Button>
                  </Link>
                )}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="rounded-full" data-testid="button-user-menu">
                      <User className="w-5 h-5" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56">
                    <div className="px-2 py-1.5">
                      <p className="text-sm font-medium">{user?.name}</p>
                      <p className="text-xs text-muted-foreground">{user?.email}</p>
                    </div>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={handleLogout} data-testid="button-logout">
                      <LogOut className="w-4 h-4 mr-2" />
                      Logout
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </>
            ) : (
              <>
                <Link href="/login" data-testid="link-login">
                  <Button variant="ghost" className="hover-elevate active-elevate-2">
                    Login
                  </Button>
                </Link>
                <Link href="/register" data-testid="link-register">
                  <Button data-testid="button-register">Get Started</Button>
                </Link>
                <Link href="/admin" data-testid="link-admin-public">
                  <Button variant="outline" size="sm" className="hover-elevate active-elevate-2">
                    Admin
                  </Button>
                </Link>
              </>
            )}
          </div>

          <Button
            variant="ghost"
            size="icon"
            className="md:hidden"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            data-testid="button-mobile-menu"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </Button>
        </div>

        {mobileMenuOpen && (
          <div className="md:hidden py-4 border-t border-card-border">
            {isAuthenticated ? (
              <div className="flex flex-col gap-2">
                <div className="px-4 py-2 border-b border-card-border">
                  <p className="text-sm font-medium">{user?.name}</p>
                  <p className="text-xs text-muted-foreground">{user?.email}</p>
                </div>
                <Link href={getDashboardLink()} data-testid="link-mobile-dashboard">
                  <Button variant="ghost" className="w-full justify-start" onClick={() => setMobileMenuOpen(false)}>
                    Dashboard
                  </Button>
                </Link>
                <Button
                  variant="ghost"
                  className="w-full justify-start"
                  onClick={() => {
                    handleLogout();
                    setMobileMenuOpen(false);
                  }}
                  data-testid="button-mobile-logout"
                >
                  <LogOut className="w-4 h-4 mr-2" />
                  Logout
                </Button>
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                <Link href="/login" data-testid="link-mobile-login">
                  <Button variant="ghost" className="w-full justify-start" onClick={() => setMobileMenuOpen(false)}>
                    Login
                  </Button>
                </Link>
                <Link href="/register" data-testid="link-mobile-register">
                  <Button className="w-full" onClick={() => setMobileMenuOpen(false)}>
                    Get Started
                  </Button>
                </Link>
              </div>
            )}
          </div>
        )}
      </div>
    </nav>
  );
}
