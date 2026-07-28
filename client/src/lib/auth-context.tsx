import { createContext, useContext, useState, useEffect } from "react";
import type { User, Seller, AuthResponse } from "@shared/schema";
import { clearSellerLandedOnDashboard } from "@/lib/seller-landing";

type AuthContextType = {
  user: User | null;
  seller: Seller | null;
  token: string | null;
  login: (data: AuthResponse) => void;
  logout: () => void;
  isAuthenticated: boolean;
  isAdmin: boolean;
  isSeller: boolean;
  isCustomer: boolean;
};

const AuthContext = createContext<AuthContextType | null>(null);

// ✅ Parsed defensively — a corrupted localStorage value should never
// crash the app or force a silent logout.
function readStoredUser(): User | null {
  try {
    const stored = localStorage.getItem("user");
    return stored ? JSON.parse(stored) : null;
  } catch {
    return null;
  }
}

function readStoredSeller(): Seller | null {
  try {
    const stored = localStorage.getItem("seller");
    return stored ? JSON.parse(stored) : null;
  } catch {
    return null;
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  // ✅ FIX: read localStorage synchronously via lazy useState initializers,
  // instead of the old pattern of starting at null and hydrating inside a
  // useEffect. React fires effects child-first on mount, so with the old
  // code, a protected page's own "redirect to /login if not authenticated"
  // effect ran BEFORE this provider's effect had a chance to load the real
  // session — meaning a logged-in user got bounced to /login on every
  // single page refresh. Reading here, during the first render itself,
  // closes that race completely.
  const [user, setUser] = useState<User | null>(readStoredUser);
  const [seller, setSeller] = useState<Seller | null>(readStoredSeller);
  const [token, setToken] = useState<string | null>(() => localStorage.getItem("token"));

  const login = (data: AuthResponse) => {
    setToken(data.token);
    setUser(data.user);
    setSeller(data.seller || null);

    localStorage.setItem("token", data.token);
    localStorage.setItem("user", JSON.stringify(data.user));
    // ✅ FIX: always resolve the seller key one way or the other. Previously
    // this only ever set it, never cleared it — so switching accounts
    // in-place (seller -> customer) without an explicit logout left the
    // old seller's data behind in localStorage and in memory.
    if (data.seller) {
      localStorage.setItem("seller", JSON.stringify(data.seller));
    } else {
      localStorage.removeItem("seller");
    }
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    setSeller(null);
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    localStorage.removeItem("seller");
    clearSellerLandedOnDashboard();
  };

  // ✅ Cross-tab session sync. If the account logs out — or a different
  // account logs in — in one tab, every other open tab for this browser
  // picks it up immediately, so "logout only happens on Logout click or
  // another account logging in" holds true browser-wide, not just in
  // whichever tab triggered it.
  useEffect(() => {
    function handleStorage(event: StorageEvent) {
      if (event.storageArea !== localStorage) return;
      if (event.key !== "token" && event.key !== "user" && event.key !== "seller") return;

      const storedToken = localStorage.getItem("token");
      setToken(storedToken);
      setUser(storedToken ? readStoredUser() : null);
      setSeller(storedToken ? readStoredSeller() : null);
    }

    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        seller,
        token,
        login,
        logout,
        isAuthenticated: !!token && !!user,
        isAdmin: user?.role === "admin",
        isSeller: user?.role === "seller",
        isCustomer: user?.role === "customer",
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
}
