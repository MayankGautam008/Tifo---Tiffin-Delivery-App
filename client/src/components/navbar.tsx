import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ChefHat, User, LogOut, Menu, X, ShoppingCart, MapPin, ChevronDown, CalendarRange } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { useCart } from "@/lib/cart-context";
import { WalletButton } from "@/components/wallet-button";
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
  const { totalItems } = useCart();
  const [, setLocation] = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const CartButton = ({ onClick }: { onClick?: () => void } = {}) => (
    <Link href="/cart" onClick={onClick}>
      <button className="relative w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-gray-100 flex items-center justify-center hover:bg-gray-200 transition-colors">
        <ShoppingCart className="w-5 h-5 text-gray-700" />
        {totalItems > 0 && (
          <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-red-600 text-white text-[10px] font-bold flex items-center justify-center shadow-md">
            {totalItems > 99 ? "99+" : totalItems}
          </span>
        )}
      </button>
    </Link>
  );

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
    <nav className="sticky top-0 z-50 bg-white/95 backdrop-blur-sm border-b border-gray-200 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-14 sm:h-16">
          {/* Logo - Left Side */}
          <Link href="/">
            <div className="flex items-center gap-2 cursor-pointer">
              <div className="w-8 h-8 bg-red-500 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-sm">T</span>
              </div>
              <span className="text-xl font-bold text-gray-900">
                Tifo
              </span>
            </div>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-3">
            {(!isAuthenticated || user?.role === "customer") && <CartButton />}
            {isAuthenticated && user?.role === "customer" && <WalletButton />}
            
            {isAuthenticated ? (
              <>
                <Link href={getDashboardLink()}>
                  <Button className="bg-red-500 hover:bg-red-600 text-white rounded-full text-sm font-semibold shadow-md hover:shadow-lg transition-all">
                    Dashboard
                  </Button>
                </Link>
                
                {!isAdmin && (
                  <Link href="/admin">
                    <Button variant="outline" size="sm" className="rounded-full border-gray-300 text-gray-700 hover:bg-gray-50 text-sm">
                      Admin
                    </Button>
                  </Link>
                )}
                
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button className="w-9 h-9 sm:w-10 sm:h-10 rounded-full overflow-hidden border-2 border-orange-300 flex items-center justify-center bg-gray-100 hover:border-red-300 transition-colors">
                      <img
                        src="https://tse2.mm.bing.net/th/id/OIP.7voziSoXjbJfxit4O9xJZgHaHa?r=0&pid=Api&P=0&h=180"
                        alt="Profile"
                        className="w-full h-full object-cover"
                      />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56 mt-2 rounded-xl shadow-lg border border-gray-200">
                    <div className="px-3 py-2">
                      <p className="text-sm font-semibold text-gray-900">{user?.name}</p>
                      <p className="text-xs text-gray-500">{user?.email}</p>
                    </div>
                    {user?.role === "customer" && (
                      <DropdownMenuItem asChild className="cursor-pointer rounded-lg mx-1">
                        <Link href="/my-subscriptions">
                          <div className="flex items-center w-full">
                            <CalendarRange className="w-4 h-4 mr-2" />
                            My Subscriptions
                          </div>
                        </Link>
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuSeparator className="bg-gray-100" />
                    <DropdownMenuItem onClick={handleLogout} className="text-red-600 hover:bg-red-50 cursor-pointer rounded-lg mx-1">
                      <LogOut className="w-4 h-4 mr-2" />
                      Logout
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </>
            ) : (
              <>
                <Link href="/login">
                  <Button variant="ghost" className="text-gray-700 hover:text-gray-900 hover:bg-gray-100 rounded-full text-sm font-medium">
                    Login
                  </Button>
                </Link>
                <Link href="/register">
                  <Button className="bg-red-500 hover:bg-red-600 text-white rounded-full text-sm font-semibold shadow-md hover:shadow-lg transition-all">
                    Get Started
                  </Button>
                </Link>
                <Link href="/admin">
                  <Button variant="outline" size="sm" className="rounded-full border-gray-300 text-gray-700 hover:bg-gray-50 text-sm">
                    Admin
                  </Button>
                </Link>
              </>
            )}
          </div>

          {/* Mobile - Cart + Menu Toggle */}
          <div className="flex items-center gap-2 md:hidden">
            {(!isAuthenticated || user?.role === "customer") && <CartButton onClick={() => setMobileMenuOpen(false)} />}
            {isAuthenticated && user?.role === "customer" && <WalletButton />}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center hover:bg-gray-200 transition-colors"
            >
              {mobileMenuOpen ? <X className="w-5 h-5 text-gray-700" /> : <Menu className="w-5 h-5 text-gray-700" />}
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden py-4 border-t border-gray-200 animate-slide-down">
            {isAuthenticated ? (
              <div className="flex flex-col gap-1">
                <div className="px-4 py-3 mb-2 bg-gray-50 rounded-xl mx-2">
                  <p className="text-sm font-semibold text-gray-900">{user?.name}</p>
                  <p className="text-xs text-gray-500">{user?.email}</p>
                </div>
                
                <Link href={getDashboardLink()}>
                  <Button 
                    variant="ghost" 
                    className="w-full justify-start text-gray-700 hover:bg-gray-100 rounded-xl mx-2 w-auto"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    <ChefHat className="w-4 h-4 mr-2" />
                    Dashboard
                  </Button>
                </Link>
                
                {!isAdmin && (
                  <Link href="/admin">
                    <Button 
                      variant="ghost" 
                      className="w-full justify-start text-gray-700 hover:bg-gray-100 rounded-xl mx-2 w-auto"
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      Admin
                    </Button>
                  </Link>
                )}

                {user?.role === "customer" && (
                  <Link href="/my-subscriptions">
                    <Button
                      variant="ghost"
                      className="w-full justify-start text-gray-700 hover:bg-gray-100 rounded-xl mx-2 w-auto"
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      <CalendarRange className="w-4 h-4 mr-2" />
                      My Subscriptions
                    </Button>
                  </Link>
                )}
                
                <button
                  onClick={() => {
                    handleLogout();
                    setMobileMenuOpen(false);
                  }}
                  className="flex items-center gap-2 px-4 py-2 text-red-600 hover:bg-red-50 rounded-xl mx-2 text-sm font-medium transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                  Logout
                </button>
              </div>
            ) : (
              <div className="flex flex-col gap-2 px-2">
                <Link href="/login">
                  <Button 
                    variant="ghost" 
                    className="w-full justify-start text-gray-700 hover:bg-gray-100 rounded-xl"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    Login
                  </Button>
                </Link>
                <Link href="/register">
                  <Button 
                    className="w-full bg-red-500 hover:bg-red-600 text-white rounded-xl font-semibold"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    Get Started
                  </Button>
                </Link>
                <Link href="/admin">
                  <Button 
                    variant="outline" 
                    className="w-full border-gray-300 text-gray-700 rounded-xl"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    Admin
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