import { useState, useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import CookieConsent from "@/components/cookie-consent";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { 
  Search, 
  Gift,
  MapPin, 
  Clock, 
  BadgePercent,
  Tag,
  IndianRupee, 
  Star,
  Shield,
  Truck,
  Clock4,
  Heart,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Filter,
  Navigation,
  Phone,
  Mail,
  Facebook,
  Twitter,
  Instagram,
  User,
  LogIn,
  ChefHat,
  Crown,
  BookOpen,
  Menu,
  X,
  Download,
  Users,
  ExternalLink,
  Zap,
  Code,
  Cpu,
  Sparkles,
  Award,
  GitBranch,
  Globe,
  Upload,
  Image,
  Utensils,
  Pizza,
  Coffee,
  IceCream,
  ShoppingCart,
  Mic,
  Bookmark,
  CalendarCheck,
  UtensilsCrossed,
  PlusCircle,
  PackageCheck,
  ArrowRight,
  LogOut,
  LayoutDashboard
} from "lucide-react";
import { Link, useLocation } from "wouter";
import type { TiffinWithSeller } from "@shared/schema";
import { useAuth } from "@/lib/auth-context";
import { WalletButton } from "@/components/wallet-button";
import { useCart } from "@/lib/cart-context";
import { hasSellerLandedOnDashboard, markSellerLandedOnDashboard } from "@/lib/seller-landing";

interface TopRatedSeller {
  _id: string;
  shopName: string;
  city: string;
  ratingStats?: {
    averageRating: number;
    totalRatings: number;
  };
  user?: {
    name: string;
    email: string;
  };
}

// Fallback images
const categoryImages: Record<string, string> = {
  Veg: "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=800&q=80",
  "Non-Veg": "https://images.unsplash.com/photo-1631515243349-e0cb75fb8d3a?auto=format&fit=crop&w=800&q=80",
};

// Scroll animation component with 3D effect - Mobile Optimized
const ScrollAnimation3D = ({ children, delay = 0, className = "" }: { children: React.ReactNode; delay?: number; className?: string }) => {
  const [isVisible, setIsVisible] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setTimeout(() => setIsVisible(true), delay);
        }
      },
      { threshold: 0.1 }
    );

    if (ref.current) {
      observer.observe(ref.current);
    }

    return () => {
      if (ref.current) {
        observer.unobserve(ref.current);
      }
    };
  }, [delay]);

  return (
    <div
      ref={ref}
      className={`transition-all duration-700 transform ${
        isVisible
          ? "translate-y-0 opacity-100 rotate-0 scale-100"
          : "translate-y-8 opacity-0 rotate-1 scale-95"
      } ${className}`}
      style={{
        transformStyle: 'preserve-3d',
      }}
    >
      {children}
    </div>
  );
};

// Image Upload Component
const ImageUpload = ({ onImageUpload }: { onImageUpload: (url: string) => void }) => {
  const [imageUrl, setImageUrl] = useState("");
  const [isUploading, setIsUploading] = useState(false);

  const handleUrlSubmit = () => {
    if (imageUrl.trim()) {
      setIsUploading(true);
      setTimeout(() => {
        onImageUpload(imageUrl);
        setIsUploading(false);
      }, 1000);
    }
  };

  return (
    <div className="bg-white rounded-2xl shadow-lg p-4 sm:p-6 max-w-md w-full mx-auto">
      <div className="flex items-center gap-3 mb-4">
        <Image className="w-6 h-6 text-red-500" />
        <h3 className="text-lg font-semibold text-gray-800">Upload Image</h3>
      </div>
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Image URL</label>
          <Input type="url" placeholder="https://example.com/image.jpg" value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} className="w-full" />
          <p className="text-xs text-gray-500 mt-1">Paste the URL of your image (JPG, PNG, WebP supported)</p>
        </div>
        <Button onClick={handleUrlSubmit} disabled={!imageUrl.trim() || isUploading} className="w-full bg-red-500 hover:bg-red-600 text-white">
          {isUploading ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
              Uploading...
            </>
          ) : (
            <>
              <Upload className="w-4 h-4 mr-2" />
              Upload Image
            </>
          )}
        </Button>
      </div>
    </div>
  );
};

// Location Picker Modal
const LocationPickerModal = ({
  isOpen,
  onClose,
  onConfirm,
  initialCoords,
}: {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (
    loc: { address: string; city: string; lat: number; lng: number },
    forWhom: "self" | "other",
    recipient?: { name: string; phone: string }
  ) => void;
  initialCoords?: { lat: number; lng: number };
}) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const leafletMapRef = useRef<any>(null);
  const markerRef = useRef<any>(null);

  const [mapLoaded, setMapLoaded] = useState(false);
  const [forWhom, setForWhom] = useState<"self" | "other">("self");
  const [recipientName, setRecipientName] = useState("");
  const [recipientPhone, setRecipientPhone] = useState("");
  const [phoneError, setPhoneError] = useState("");

  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  const [selectedAddress, setSelectedAddress] = useState("");
  const [selectedCity, setSelectedCity] = useState("");
  const [selectedCoords, setSelectedCoords] = useState<{ lat: number; lng: number } | null>(
    initialCoords || null
  );
  const [isLoadingAddress, setIsLoadingAddress] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setForWhom("self");
      setRecipientName("");
      setRecipientPhone("");
      setPhoneError("");
      setSearchQuery("");
      setSearchResults([]);
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    if ((window as any).L) {
      setMapLoaded(true);
      return;
    }
    if (!document.getElementById("leaflet-css")) {
      const link = document.createElement("link");
      link.id = "leaflet-css";
      link.rel = "stylesheet";
      link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
      document.head.appendChild(link);
    }
    const existingScript = document.getElementById("leaflet-js") as HTMLScriptElement | null;
    if (existingScript) {
      existingScript.addEventListener("load", () => setMapLoaded(true));
      return;
    }
    const script = document.createElement("script");
    script.id = "leaflet-js";
    script.src = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
    script.onload = () => setMapLoaded(true);
    document.body.appendChild(script);
  }, [isOpen]);

  const reverseGeocode = async (lat: number, lng: number) => {
    setIsLoadingAddress(true);
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&addressdetails=1`
      );
      const data = await res.json();
      const addr = data.address || {};
      const city = addr.city || addr.town || addr.village || addr.county || addr.state_district || "";
      setSelectedAddress(data.display_name || `${lat.toFixed(5)}, ${lng.toFixed(5)}`);
      setSelectedCity(city);
      setSelectedCoords({ lat, lng });
    } catch (err) {
      console.error("Reverse geocode error", err);
      setSelectedAddress(`${lat.toFixed(5)}, ${lng.toFixed(5)}`);
      setSelectedCoords({ lat, lng });
    } finally {
      setIsLoadingAddress(false);
    }
  };

  useEffect(() => {
    if (!isOpen || !mapLoaded || !mapRef.current) return;
    const L = (window as any).L;
    if (leafletMapRef.current) {
      setTimeout(() => leafletMapRef.current.invalidateSize(), 100);
      return;
    }
    const start = initialCoords || { lat: 26.8467, lng: 80.9462 };
    const map = L.map(mapRef.current).setView([start.lat, start.lng], 15);
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "&copy; OpenStreetMap contributors",
      maxZoom: 19,
    }).addTo(map);
    const marker = L.marker([start.lat, start.lng], { draggable: true }).addTo(map);
    marker.on("dragend", () => {
      const pos = marker.getLatLng();
      reverseGeocode(pos.lat, pos.lng);
    });
    map.on("click", (e: any) => {
      marker.setLatLng(e.latlng);
      reverseGeocode(e.latlng.lat, e.latlng.lng);
    });
    leafletMapRef.current = map;
    markerRef.current = marker;
    reverseGeocode(start.lat, start.lng);
    setTimeout(() => map.invalidateSize(), 150);
  }, [isOpen, mapLoaded]);

  useEffect(() => {
    if (!isOpen && leafletMapRef.current) {
      leafletMapRef.current.remove();
      leafletMapRef.current = null;
      markerRef.current = null;
      setMapLoaded(false);
    }
  }, [isOpen]);

  const moveMarkerTo = (lat: number, lng: number, zoom = 16) => {
    if (leafletMapRef.current && markerRef.current) {
      leafletMapRef.current.setView([lat, lng], zoom);
      markerRef.current.setLatLng([lat, lng]);
    }
  };

  const handleSearchChange = async (value: string) => {
    setSearchQuery(value);
    if (value.trim().length < 3) {
      setSearchResults([]);
      return;
    }
    setIsSearching(true);
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
          value
        )}&countrycodes=in&limit=5&addressdetails=1`
      );
      const data = await res.json();
      setSearchResults(data);
    } catch (err) {
      console.error("Search error", err);
    } finally {
      setIsSearching(false);
    }
  };

  const handleSelectSearchResult = (result: any) => {
    const lat = parseFloat(result.lat);
    const lng = parseFloat(result.lon);
    moveMarkerTo(lat, lng);
    const addr = result.address || {};
    setSelectedAddress(result.display_name);
    setSelectedCity(addr.city || addr.town || addr.village || "");
    setSelectedCoords({ lat, lng });
    setSearchResults([]);
    setSearchQuery(result.display_name);
  };

  const handleUseCurrentLocation = () => {
    if (!navigator.geolocation) {
      alert("Geolocation is not supported by your browser. Map par pin drag karke location set karein.");
      return;
    }
    setIsLoadingAddress(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        moveMarkerTo(latitude, longitude);
        reverseGeocode(latitude, longitude);
      },
      (error) => {
        console.error("Geolocation error", error);
        setIsLoadingAddress(false);
        alert("Location access nahi mil paya. Kripya map par pin drag karke ya search karke location set karein.");
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const validatePhone = (phone: string) => /^[6-9]\d{9}$/.test(phone.trim());

  const handleConfirm = () => {
    if (!selectedCoords) return;
    if (forWhom === "other") {
      if (!recipientName.trim()) {
        setPhoneError("Naam daalna zaroori hai");
        return;
      }
      if (!validatePhone(recipientPhone)) {
        setPhoneError("Sahi 10-digit phone number daalein");
        return;
      }
    }
    setPhoneError("");
    onConfirm(
      { address: selectedAddress, city: selectedCity, lat: selectedCoords.lat, lng: selectedCoords.lng },
      forWhom,
      forWhom === "other" ? { name: recipientName.trim(), phone: recipientPhone.trim() } : undefined
    );
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-[60] p-0 sm:p-4">
      <div className="bg-white rounded-t-2xl sm:rounded-2xl w-full sm:max-w-lg md:max-w-xl max-h-[92vh] sm:max-h-[85vh] flex flex-col shadow-2xl">
        <div className="flex items-center justify-between p-4 border-b border-gray-100 flex-shrink-0">
          <div className="flex items-center gap-2">
            <MapPin className="w-5 h-5 text-red-500" />
            <h2 className="text-lg font-bold text-gray-800">Set Delivery Location</h2>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded-full">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>
        <div className="overflow-y-auto flex-1">
          <div className="p-4 border-b border-gray-100">
            <div className="flex bg-gray-100 rounded-xl p-1">
              <button onClick={() => setForWhom("self")} className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-semibold transition-all ${forWhom === "self" ? "bg-white text-red-500 shadow" : "text-gray-500"}`}>
                <User className="w-4 h-4" />
                Order for Myself
              </button>
              <button onClick={() => setForWhom("other")} className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-semibold transition-all ${forWhom === "other" ? "bg-white text-red-500 shadow" : "text-gray-500"}`}>
                <Gift className="w-4 h-4" />
                Order for Someone Else
              </button>
            </div>
            {forWhom === "other" && (
              <div className="mt-3 space-y-2 sm:flex sm:gap-2 sm:space-y-0">
                <Input placeholder="Recipient's full name" value={recipientName} onChange={(e) => setRecipientName(e.target.value)} className="sm:flex-1" />
                <Input type="tel" placeholder="Recipient's phone number" value={recipientPhone} maxLength={10} onChange={(e) => setRecipientPhone(e.target.value.replace(/\D/g, ""))} className="sm:flex-1" />
                {phoneError && <p className="text-xs text-red-500 sm:basis-full">{phoneError}</p>}
              </div>
            )}
          </div>
          <div className="p-4 border-b border-gray-100 relative">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input placeholder="Search for area, street, landmark..." value={searchQuery} onChange={(e) => handleSearchChange(e.target.value)} className="pl-9" />
            </div>
            {searchResults.length > 0 && (
              <div className="absolute left-4 right-4 top-full mt-1 bg-white rounded-lg shadow-lg border border-gray-200 z-10 max-h-56 overflow-y-auto">
                {searchResults.map((result, idx) => (
                  <button key={idx} onClick={() => handleSelectSearchResult(result)} className="w-full text-left px-3 py-2 hover:bg-gray-50 border-b border-gray-100 last:border-0 text-sm text-gray-700 flex items-start gap-2">
                    <MapPin className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                    <span className="line-clamp-2">{result.display_name}</span>
                  </button>
                ))}
              </div>
            )}
            {isSearching && <p className="text-xs text-gray-400 mt-1">Searching...</p>}
            <button onClick={handleUseCurrentLocation} className="flex items-center gap-2 mt-3 text-sm font-semibold text-red-500 hover:text-red-600">
              <Navigation className="w-4 h-4" />
              Use my real (current) location
            </button>
          </div>
          <div className="relative h-[280px] sm:h-[340px] md:h-[380px]">
            <div ref={mapRef} className="w-full h-full" />
            {!mapLoaded && (
              <div className="absolute inset-0 flex items-center justify-center bg-gray-50">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-500"></div>
              </div>
            )}
            <div className="absolute bottom-3 left-3 right-3 bg-white/95 backdrop-blur rounded-lg px-3 py-2 shadow-md text-xs text-gray-600 flex items-center gap-2">
              <MapPin className="w-3.5 h-3.5 text-red-500 flex-shrink-0" />
              Drag the pin or tap on the map to set exact location
            </div>
          </div>
          <div className="p-4">
            <div className="bg-gray-50 rounded-lg p-3 mb-3 min-h-[54px]">
              {isLoadingAddress ? (
                <div className="flex items-center gap-2 text-sm text-gray-500">
                  <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-red-500"></div>
                  Fetching address...
                </div>
              ) : (
                <>
                  <p className="text-sm font-medium text-gray-800 line-clamp-2">{selectedAddress || "Select a location on the map"}</p>
                  {selectedCity && <p className="text-xs text-gray-500 mt-1">{selectedCity}</p>}
                </>
              )}
            </div>
          </div>
        </div>
        <div className="p-4 border-t border-gray-100 flex-shrink-0">
          <Button onClick={handleConfirm} disabled={!selectedCoords || isLoadingAddress} className="w-full bg-red-500 hover:bg-red-600 text-white py-5 rounded-xl font-semibold">
            Confirm {forWhom === "other" ? "Recipient's" : "My"} Location
          </Button>
        </div>
      </div>
    </div>
  );
};

// Tiffin Subscription Overlay
const TiffinOverlay = ({
  isOpen,
  onClose,
  tiffins,
  isLoading,
  onTiffinClick,
}: {
  isOpen: boolean;
  onClose: () => void;
  tiffins: any[];
  isLoading: boolean;
  onTiffinClick: (tiffin: any) => void;
}) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  if (!isOpen) return null;

  const categories = ["Veg", "Non-Veg"];
  const filteredTiffins = tiffins.filter((tiffin: any) => {
    const matchesSearch = !searchQuery || tiffin.title.toLowerCase().includes(searchQuery.toLowerCase()) || tiffin.seller?.shopName?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = !selectedCategory || tiffin.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-lg bg-white rounded-t-[28px] shadow-2xl animate-slide-up max-h-[90vh] flex flex-col">
        <div className="sticky top-0 bg-white rounded-t-[28px] z-20">
          <div className="flex justify-center pt-3 pb-1">
            <div className="w-12 h-1.5 bg-gray-300 rounded-full" />
          </div>
          <div className="px-5 pb-3">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h2 className="text-xl font-bold text-gray-900">Tiffin Subscription</h2>
                <p className="text-sm text-gray-500">Choose your plan & order now</p>
              </div>
              <button onClick={onClose} className="w-9 h-9 bg-gray-100 rounded-full flex items-center justify-center hover:bg-gray-200 transition-colors">
                <X className="w-5 h-5 text-gray-600" />
              </button>
            </div>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input placeholder="Search tiffins..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-9 py-5 bg-gray-50 border-gray-100 rounded-xl text-sm" />
            </div>
            <div className="flex gap-2 mt-3 overflow-x-auto hide-scrollbar">
              {categories.map((cat) => (
                <button key={cat} onClick={() => setSelectedCategory(selectedCategory === cat ? null : cat)} className={`flex-shrink-0 px-4 py-1.5 rounded-full text-xs font-semibold border transition-all ${selectedCategory === cat ? 'bg-red-500 text-white border-red-500' : 'bg-white text-gray-600 border-gray-200'}`}>
                  {cat === "Veg" ? "🟢 Veg" : "🔴 Non-Veg"}
                </button>
              ))}
            </div>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto px-5 pb-8">
          {isLoading ? (
            <div className="space-y-3 mt-3">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="bg-gray-50 rounded-2xl p-4 animate-pulse">
                  <div className="flex gap-4">
                    <div className="w-24 h-24 bg-gray-200 rounded-xl flex-shrink-0" />
                    <div className="flex-1 space-y-3">
                      <div className="h-4 bg-gray-200 rounded w-3/4" />
                      <div className="h-3 bg-gray-200 rounded w-1/2" />
                      <div className="flex gap-2">
                        <div className="h-8 bg-gray-200 rounded-lg flex-1" />
                        <div className="h-8 bg-gray-200 rounded-lg flex-1" />
                        <div className="h-8 bg-gray-200 rounded-lg flex-1" />
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : filteredTiffins.length === 0 ? (
            <div className="text-center py-12">
              <Search className="w-16 h-16 text-gray-200 mx-auto mb-4" />
              <p className="text-gray-500">No tiffins found</p>
            </div>
          ) : (
            <div className="space-y-3 mt-3">
              {filteredTiffins.map((tiffin: any) => {
                const trialPrice = tiffin.trialPrice || Math.round(tiffin.price * 0.85);
                const weeklyPrice = tiffin.weeklyPrice || trialPrice * 7;
                const monthlyPrice = tiffin.monthlyPrice || trialPrice * 28;
                return (
                  <div key={tiffin._id} onClick={() => onTiffinClick(tiffin)} className="bg-white border border-gray-100 rounded-2xl p-4 shadow-sm hover:shadow-md transition-all cursor-pointer active:scale-[0.98]">
                    <div className="flex gap-4">
                      <div className="w-24 h-24 rounded-xl overflow-hidden flex-shrink-0 bg-gray-100">
                        <img src={categoryImages[tiffin.category] || "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=200&h=200&fit=crop"} alt={tiffin.title} className="w-full h-full object-cover" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <h3 className="font-bold text-gray-900 text-sm line-clamp-1">{tiffin.title}</h3>
                            <p className="text-xs text-gray-500 mt-0.5">{tiffin.seller?.shopName || "Tiffin Kitchen"}</p>
                          </div>
                          <div className="flex items-center gap-1 bg-green-600 text-white px-1.5 py-0.5 rounded text-[10px] font-semibold flex-shrink-0">
                            <Star className="w-2.5 h-2.5 fill-white" />
                            4.5
                          </div>
                        </div>
                        <p className="text-[11px] text-gray-400 mt-1 line-clamp-1">{tiffin.description}</p>
                        <div className="grid grid-cols-3 gap-1.5 mt-2.5">
                          <div className="bg-blue-50 rounded-lg p-2 text-center border border-blue-100">
                            <p className="text-[9px] font-semibold text-blue-600 mb-0.5">🧪 Trial</p>
                            <p className="text-xs font-bold text-blue-700">₹{trialPrice}</p>
                            <p className="text-[8px] text-blue-500">1 day</p>
                          </div>
                          <div className="bg-green-50 rounded-lg p-2 text-center border border-green-100 relative">
                            <span className="absolute -top-1.5 left-1/2 -translate-x-1/2 bg-orange-500 text-white text-[7px] font-bold px-1.5 py-0.5 rounded-full">BEST</span>
                            <p className="text-[9px] font-semibold text-green-600 mb-0.5 mt-0.5">📅 Weekly</p>
                            <p className="text-xs font-bold text-green-700">₹{weeklyPrice}</p>
                            <p className="text-[8px] text-green-500">7 days</p>
                          </div>
                          <div className="bg-purple-50 rounded-lg p-2 text-center border border-purple-100">
                            <p className="text-[9px] font-semibold text-purple-600 mb-0.5">📦 Monthly</p>
                            <p className="text-xs font-bold text-purple-700">₹{monthlyPrice}</p>
                            <p className="text-[8px] text-purple-500">28 days</p>
                          </div>
                        </div>
                        <div className="flex items-center justify-end gap-1 mt-2 text-xs font-semibold text-red-500">
                          <span>View Details</span>
                          <ArrowRight className="w-3 h-3" />
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
        <div className="h-5 bg-white" />
      </div>
    </div>
  );
};

// Main Home Component
export default function Home() {
  const { data: topRatedSellers = [] } = useQuery<TopRatedSeller[]>({
    queryKey: ["/api/top-rated-sellers"],
  });

  const { isAuthenticated, user, logout } = useAuth();
  // Home page only browses meals/sellers — adding to cart happens on the
  // seller's own menu page, so we only need the cart badge count here.
  const { totalItems } = useCart();

  
  const [hasSearched, setHasSearched] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedCity, setSelectedCity] = useState<string | null>(null);
  const [selectedFoodCategory, setSelectedFoodCategory] = useState<string | null>(null);
  const [showCityDropdown, setShowCityDropdown] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [activeTab, setActiveTab] = useState("all");
  const [showLoginPopup, setShowLoginPopup] = useState(false);
  const [userType, setUserType] = useState<"customer" | "seller" | "admin" | null>(null);
  const [scrollProgress, setScrollProgress] = useState(0);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [location, setLocation] = useLocation();
  const [showImageUpload, setShowImageUpload] = useState(false);
  const [showComingSoon, setShowComingSoon] = useState(false);
  const [heroImageUrl, setHeroImageUrl] = useState("https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=800&q=80");
  const [bannerImageUrl, setBannerImageUrl] = useState("https://image2url.com/images/1763986721956-7bc4c565-ef21-4771-9eaa-0dd94be72037.jpeg");
  const [showSearchInput, setShowSearchInput] = useState(false);

  const [selectedPriceRange, setSelectedPriceRange] = useState<string | null>(null);
  const [showMoreFilters, setShowMoreFilters] = useState(false);

  const [currentPlaceholder, setCurrentPlaceholder] = useState('');
  const [placeholderIndex, setPlaceholderIndex] = useState(0);
  const [charIndex, setCharIndex] = useState(0);
  const [isDeleting, setIsDeleting] = useState(false);

  const [userLocation, setUserLocation] = useState({ city: "Lucknow", address: "Sector J, Jankipuram", lat: 26.8896 as number | null, lng: 80.9548 as number | null });
  const [deliverFor, setDeliverFor] = useState<"self" | "other">("self");
  const [recipientDetails, setRecipientDetails] = useState({ name: "", phone: "", address: "", city: "", lat: null as number | null, lng: null as number | null });
  const [showLocationPicker, setShowLocationPicker] = useState(false);
  const [showTiffinOverlay, setShowTiffinOverlay] = useState(false);
  const recommendedScrollRef = useRef<HTMLDivElement>(null);

  // --- VEG MODE STATE (Default ON i.e. true) ---
  const [vegMode, setVegMode] = useState(true);

  const scrollRecommended = (direction: "left" | "right") => {
    const el = recommendedScrollRef.current;
    if (!el) return;
    const amount = el.clientWidth * 0.7;
    el.scrollBy({ left: direction === "left" ? -amount : amount, behavior: "smooth" });
  };

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const token = localStorage.getItem('token');
        if (token) {
          const response = await fetch('/api/user/profile', { headers: { 'Authorization': `Bearer ${token}` } });
          if (response.ok) {
            const userData = await response.json();
            if (userData.city && userData.address) {
              setUserLocation((prev) => ({ ...prev, city: userData.city, address: userData.address, lat: userData.lat ?? prev.lat, lng: userData.lng ?? prev.lng }));
            }
          }
        }
      } catch (error) { console.error('Error fetching user data:', error); }
    };
    fetchUserData();
  }, []);

  const handleLocationConfirm = ( loc: { address: string; city: string; lat: number; lng: number }, forWhom: "self" | "other", recipient?: { name: string; phone: string } ) => {
    if (forWhom === "self") {
      setUserLocation({ city: loc.city || "Lucknow", address: loc.address, lat: loc.lat, lng: loc.lng });
      setDeliverFor("self");
    } else {
      setRecipientDetails({ name: recipient?.name || "", phone: recipient?.phone || "", address: loc.address, city: loc.city || "", lat: loc.lat, lng: loc.lng });
      setDeliverFor("other");
    }
  };

  const searchTerms = ["kadhai paneer..", "butter chicken..", "biryani..", "tiffin services..", "home cooked meals..", "daily lunch..", "healthy food..", "veg thali..", "chole bhature..", "north indian food..", "south indian food..", "paneer butter masala..", "dal makhani..", "rajma chawal.."];

  useEffect(() => {
    const currentTerm = searchTerms[placeholderIndex];
    const baseText = "Search for ";
    const timeout = setTimeout(() => {
      if (!isDeleting) {
        if (charIndex < currentTerm.length) {
          setCurrentPlaceholder(baseText + currentTerm.substring(0, charIndex + 1));
          setCharIndex(charIndex + 1);
        } else {
          setTimeout(() => setIsDeleting(true), 1500);
        }
      } else {
        if (charIndex > 0) {
          setCurrentPlaceholder(baseText + currentTerm.substring(0, charIndex - 1));
          setCharIndex(charIndex - 1);
        } else {
          setIsDeleting(false);
          setPlaceholderIndex((placeholderIndex + 1) % searchTerms.length);
        }
      }
    }, isDeleting ? 50 : 100);
    return () => clearTimeout(timeout);
  }, [charIndex, isDeleting, placeholderIndex]);

  const { data: allItems = [], isLoading } = useQuery<TiffinWithSeller[]>({ queryKey: ["/api/tiffins"] });

  // Unique list of sellers/cafes derived from all live items, used for the
  // "Cafes & Sellers" row on the home page — clicking a card opens that
  // seller's full menu at /seller/:id.
  const sellerCards = (() => {
    const map = new Map<string, { _id: string; shopName: string; city?: string; image: string; rating: number; itemCount: number; isPureVeg: boolean }>();
    for (const item of allItems as TiffinWithSeller[]) {
      const seller = (item as any).seller;
      if (!seller?._id) continue;
      const existing = map.get(seller._id);
      if (existing) {
        existing.itemCount += 1;
        if (item.category === "Non-Veg") existing.isPureVeg = false;
        if (!existing.image && item.imageUrl) existing.image = item.imageUrl;
      } else {
        map.set(seller._id, {
          _id: seller._id,
          shopName: seller.shopName,
          city: seller.city,
          image: item.imageUrl || "",
          rating: seller.ratingStats?.averageRating || 0,
          itemCount: 1,
          isPureVeg: item.category !== "Non-Veg",
        });
      }
    }
    return Array.from(map.values());
  })();

  const meals = allItems.filter((i: any) => i.serviceType !== "tiffin" || !i.serviceType);
  const tiffinsData = allItems.filter((i: any) => i.serviceType === "tiffin").map((i: any) => {
    const trialPrice = i.trialPrice || Math.round(i.price * 0.85);
    return { ...i, trialPrice, weeklyPrice: i.weeklyPrice || trialPrice * 7, monthlyPrice: i.monthlyPrice || trialPrice * 28 };
  });

  useEffect(() => {
    const handleScroll = () => {
      const scrolled = window.scrollY > 20;
      setIsScrolled(scrolled);
      const winHeight = window.innerHeight;
      const docHeight = document.documentElement.scrollHeight;
      const scrollTop = window.pageYOffset;
      const trackLength = docHeight - winHeight;
      const progress = Math.floor((scrollTop / trackLength) * 100);
      setScrollProgress(progress);
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    if (userType === "seller") { window.location.href = "/seller/dashboard"; } 
    else if (userType === "admin") { window.location.href = "/admin"; } 
    else if (userType === "customer") { window.location.href = "/my-bookings"; }
  }, [userType]);

  // ✅ A seller's Dashboard should be what they land on — not the customer
  // Home page — whenever the app opens fresh with a session already saved
  // (e.g. reopening a bookmark/tab, or a browser refresh landing on "/").
  // This only fires once per browser session: after it redirects once (or
  // after login/register already sent them to the Dashboard directly), the
  // "Home" link in the navbar works normally, so the seller can still
  // browse Home on purpose without being bounced back on every visit.
  useEffect(() => {
    if (isAuthenticated && user?.role === "seller" && !hasSellerLandedOnDashboard()) {
      markSellerLandedOnDashboard();
      setLocation("/seller/dashboard");
    }
  }, [isAuthenticated, user, setLocation]);

  const categories = ["Veg", "Non-Veg"];
  const priceRanges = [
    { label: "Under ₹100", value: "0-100", min: 0, max: 100 },
    { label: "₹100 - ₹200", value: "100-200", min: 100, max: 200 },
    { label: "₹200 - ₹300", value: "200-300", min: 200, max: 300 },
    { label: "₹300 - ₹400", value: "300-400", min: 300, max: 400 },
    { label: "₹400 - ₹500", value: "400-500", min: 400, max: 500 },
    { label: "Above ₹500", value: "500+", min: 500, max: Infinity }
  ];

  // Filtered meals
  // Note: the dish-type filter below matches purely against whatever text
  // is typed in a category's `label` (see `dishCategories` further down) —
  // so renaming a chip's label (e.g. "Burger" -> "Momos") automatically
  // changes what it fetches, with no separate keyword list to keep in sync.
  const filteredTiffins = meals.filter((tiffin) => {
    const matchesSearch = !searchQuery || tiffin.title.toLowerCase().includes(searchQuery.toLowerCase()) || tiffin.seller.shopName.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = !selectedCategory || tiffin.category === selectedCategory;
    const matchesFoodCategory = !selectedFoodCategory || tiffin.title.toLowerCase().includes(selectedFoodCategory.toLowerCase());
    const matchesPrice = !selectedPriceRange || (() => {
      const range = priceRanges.find(r => r.value === selectedPriceRange);
      if (!range) return true;
      if (range.value === "500+") { return tiffin.price >= range.min; }
      return tiffin.price >= range.min && tiffin.price <= range.max;
    })();

    // ✅ VEG MODE FILTER LOGIC (Default true => shows Veg. Click => shows Non-Veg)
    const matchesVegMode = vegMode ? tiffin.category === "Veg" : tiffin.category === "Non-Veg";
    
    return matchesSearch && matchesCategory && matchesFoodCategory && matchesPrice && matchesVegMode;
  });


  const popularTiffins = filteredTiffins.slice(0, 6);

  const handleLogin = (type: "customer" | "seller" | "admin") => { setUserType(type); setShowLoginPopup(false); };

  // ✅ Logout button available from the profile icon itself — so a seller
  // who wants to log in with a different id, or a customer who wants to
  // switch accounts, can log out in one tap and land back on "/". Hitting
  // "Login" after that opens the normal login/register page again, where
  // they (or anyone) can create a fresh account.
  const handleProfileLogout = () => {
    logout();
    setLocation("/");
  };

  const getProfileDashboardLink = () => {
    if (user?.role === "seller") return "/seller/dashboard";
    if (user?.role === "admin") return "/admin";
    return "/my-bookings";
  };
  const handleImageUpload = (url: string, type: 'hero' | 'banner') => { if (type === 'hero') { setHeroImageUrl(url); } else { setBannerImageUrl(url); } setShowImageUpload(false); };
  const handleFoodCategoryClick = (categoryName: string) => { setSelectedFoodCategory(selectedFoodCategory === categoryName ? null : categoryName); setSearchQuery(categoryName); };

  const handleRecommendedClick = (itemTitle: string) => {
    const normalize = (s: string) => s.toLowerCase().trim();
    const target = normalize(itemTitle);
    const exactMatch = meals.find((m) => normalize(m.title) === target);
    const partialMatch = exactMatch || meals.find((m) => normalize(m.title).includes(target) || target.includes(normalize(m.title)));
    if (partialMatch) { setLocation(`/tiffin/${partialMatch._id}`); } else { setSearchQuery(itemTitle); }
  };

  const handleTiffinClick = (tiffin: any) => { setShowTiffinOverlay(false); setLocation(`/tiffin/${tiffin._id}`); };
  const scrollToTop = () => { window.scrollTo({ top: 0, behavior: 'smooth' }); };

  // Dish-type shortcuts shown in the sticky category bar above "Best Food
  // Near You" — tapping one jumps straight to that dish type using the
  // existing food-category filter.
  const dishCategories = [
    { label: "All", img: "https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=100&h=100&fit=crop" },
    { label: "Thali", img: "https://images.unsplash.com/photo-1601050690597-df0568f70950?w=100&h=100&fit=crop" },
    { label: "Pizza", img: "https://images.unsplash.com/photo-1513104890138-7c749659a591?w=100&h=100&fit=crop" },
    { label: "Biryani", img: "https://images.unsplash.com/photo-1633945274405-b6c8069047b0?w=100&h=100&fit=crop" },
    { label: "Burger", img: "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=100&h=100&fit=crop" },
    { label: "Chinese", img: "https://images.unsplash.com/photo-1585032226651-759b368d7246?w=100&h=100&fit=crop" },
    { label: "South Indian", img: "https://images.unsplash.com/photo-1589301760014-d929f3979dbc?w=100&h=100&fit=crop" },
    { label: "Dessert", img: "https://images.unsplash.com/photo-1551024506-0bccd828d307?w=100&h=100&fit=crop" },
    { label: "Beverages", img: "https://images.unsplash.com/photo-1544145945-f90425340c7e?w=100&h=100&fit=crop" },
  ];
  const handleDishCategoryClick = (label: string) => {
    // Manage the filter directly (instead of routing through
    // handleFoodCategoryClick) so we can always clear the search box too —
    // otherwise a leftover search term (e.g. "Biryani") kept hiding every
    // other item even after switching back to "All".
    if (label === "All") {
      setSelectedFoodCategory(null);
    } else {
      setSelectedFoodCategory((prev) => (prev === label ? null : label));
    }
    setSearchQuery("");
    document.getElementById("best-food-section")?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <div className="min-h-screen bg-white pb-20 lg:pb-0">
      <div className="fixed top-0 left-0 w-full h-1 bg-gray-200 z-50">
        <div className="h-full bg-gradient-to-r from-red-500 to-orange-500 transition-all duration-300" style={{ width: `${scrollProgress}%` }} />
      </div>
      <CookieConsent />

      <div className="relative pt-3 pb-6 sm:pt-4 sm:pb-8 md:pt-5 overflow-hidden">
        <div className="absolute inset-0 z-0">
          <img src="https://cdn.corenexis.com/f/0tZSdrUDNuU.png" alt="" className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-white/35" />
        </div>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="flex items-center justify-between mb-3 sm:mb-4">
            <div className="flex flex-col">
              <button className="flex items-center gap-1 cursor-pointer">
                <span className="text-[15px] sm:text-base md:text-lg font-bold text-gray-900">
                  Deliver to: {userLocation.address && userLocation.address.length > 20 ? userLocation.address.substring(0, 20) + "..." : userLocation.address || "Set Location"}
                </span>
                <ChevronDown className="w-4 h-4 text-gray-700 flex-shrink-0" />
              </button>
              <span className="text-sm text-gray-500 leading-tight">{userLocation.city || "Lucknow"}, Uttar Pradesh</span>
            </div>
            <div className="flex items-center gap-2 sm:gap-3">
              <Link href="/cart">
                <button className="relative w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-gray-100 flex items-center justify-center hover:bg-gray-200 transition-colors">
                  <ShoppingCart className="w-5 h-5 text-gray-700" />
                  {totalItems > 0 && (
                    <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-red-600 text-white text-[10px] font-bold flex items-center justify-center shadow-md">
                      {totalItems > 99 ? "99+" : totalItems}
                    </span>
                  )}
                </button>
              </Link>
              {isAuthenticated && user?.role === "customer" && <WalletButton />}
              {isAuthenticated ? (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button className="w-9 h-9 sm:w-10 sm:h-10 rounded-full overflow-hidden border-2 border-orange-300 flex items-center justify-center bg-gray-100 flex-shrink-0 hover:border-red-300 transition-colors">
                      <img src="https://tse2.mm.bing.net/th/id/OIP.7voziSoXjbJfxit4O9xJZgHaHa?r=0&pid=Api&P=0&h=180" alt="Profile" className="w-full h-full object-cover" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56 mt-2 rounded-xl shadow-lg border border-gray-200">
                    <div className="px-3 py-2">
                      <p className="text-sm font-semibold text-gray-900">{user?.name}</p>
                      <p className="text-xs text-gray-500">{user?.email}</p>
                    </div>
                    <DropdownMenuItem asChild className="cursor-pointer rounded-lg mx-1">
                      <Link href={getProfileDashboardLink()}>
                        <div className="flex items-center w-full">
                          <LayoutDashboard className="w-4 h-4 mr-2" />
                          Dashboard
                        </div>
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator className="bg-gray-100" />
                    <DropdownMenuItem onClick={handleProfileLogout} className="text-red-600 hover:bg-red-50 cursor-pointer rounded-lg mx-1">
                      <LogOut className="w-4 h-4 mr-2" />
                      Logout
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              ) : (
                <button onClick={() => setShowLoginPopup(true)} className="w-9 h-9 sm:w-10 sm:h-10 rounded-full overflow-hidden border-2 border-orange-300 flex items-center justify-center bg-gray-100 flex-shrink-0">
                  <img src="https://tse2.mm.bing.net/th/id/OIP.7voziSoXjbJfxit4O9xJZgHaHa?r=0&pid=Api&P=0&h=180" alt="Profile" className="w-full h-full object-cover" />
                </button>
              )}
            </div>
          </div>
          <div className="flex items-center gap-3 max-w-2xl">
            <div className="relative flex-1 min-w-0">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 z-10" />
              <Input placeholder="Find Your Tiffin..." className="pl-11 pr-12.5 py-6 text-base border-0 rounded-full bg-white shadow-md focus-visible:ring-2 focus-visible:ring-red-400 w-full" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
            </div>
            <div className="flex-shrink-0 w-[52px] h-[52px] rounded-full bg-red-600 text-white shadow-lg border-2 border-white flex flex-col items-center justify-center leading-none text-center">
              <span className="text-[12px] font-extrabold">20%</span>
              <span className="text-[9px] font-bold">OFF</span>
              <span className="text-[6.5px] font-medium opacity-90">| Items</span>
            </div>
          </div>
        </div>
      </div>

      {showImageUpload && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="relative">
            <ImageUpload onImageUpload={(url) => handleImageUpload(url, 'banner')} />
            <Button variant="ghost" size="icon" className="absolute -top-2 -right-2 bg-white rounded-full shadow-lg" onClick={() => setShowImageUpload(false)}>
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}

      {showComingSoon && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-sm p-8 text-center">
            <Button
              variant="ghost"
              size="icon"
              className="absolute top-2 right-2 rounded-full"
              onClick={() => setShowComingSoon(false)}
            >
              <X className="w-4 h-4" />
            </Button>
            <div className="w-14 h-14 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-4">
              <Clock className="w-7 h-7 text-gray-500" />
            </div>
            <h3 className="text-lg font-bold text-gray-900 mb-1">Coming Soon</h3>
            <p className="text-sm text-gray-500 leading-relaxed">
              Healthy Meals is currently in the works. We'll let you know as soon as it's available.
            </p>
            <Button
              className="mt-6 w-full rounded-full"
              onClick={() => setShowComingSoon(false)}
            >
              Got it
            </Button>
          </div>
        </div>
      )}

      <section className="relative z-10 bg-[#F8EFDB] rounded-t-2xl shadow-[0_-4px_16px_rgba(0,0,0,0.06)] -mt-4 pt-3 pb-2 sm:pt-4 sm:pb-3 border-t border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex overflow-x-auto hide-scrollbar gap-6 sm:gap-3 pb-1 sm:justify-start">
            {[
              { title: "Our Kitchen", subtitle: "Daily Specials", img: "https://images.unsplash.com/photo-1631452180519-c014fe946bc7?w=200&h=200&fit=crop" },
              { title: "Veg Thali Tiffin", subtitle: "Complete Veg Meals", img: "https://images.unsplash.com/photo-1601050690597-df0568f70950?w=200&h=200&fit=crop" },
              { title: "Add-ons", subtitle: "Lighter Meals", img: "https://images.unsplash.com/photo-1585937421612-70a008356fbe?w=200&h=200&fit=crop" },
              { title: "Healthy Meals", subtitle: "High Protein, Low-Calorie", img: "https://i.pinimg.com/1200x/59/9e/b4/599eb43d743194b2d9987dce32db9a45.jpg" },
            ].map((cat) => (
              <button key={cat.title} onClick={() => cat.title === "Healthy Meals" ? setShowComingSoon(true) : handleFoodCategoryClick(cat.title)} className="flex-shrink-0 w-[72px] sm:w-[88px] md:w-[100px] text-left">
                <div className="w-[72px] h-[72px] sm:w-[88px] sm:h-[88px] md:w-[100px] md:h-[100px] rounded-2xl overflow-hidden border border-gray-200 shadow-sm bg-white">
                  <img src={cat.img} alt={cat.title} className="w-full h-full object-cover" />
                </div>
                <p className="mt-1 text-[10px] sm:text-xs md:text-sm font-bold text-gray-900 leading-tight line-clamp-2">{cat.title}</p>
                <p className="text-[8px] sm:text-[10px] md:text-xs text-gray-500 leading-tight line-clamp-1">{cat.subtitle}</p>
              </button>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-white pt-3 pb-1 sm:pt-4">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
            <div>
              <h2 className="text-[15px] sm:text-base md:text-lg font-extrabold text-gray-900 mb-2 leading-tight">Tiffin Meal Options</h2>
              <Card className="rounded-2xl overflow-hidden border border-gray-100 shadow-md cursor-pointer" onClick={() => setShowTiffinOverlay(true)}>
                <div className="relative">
                  <img src="https://i.pinimg.com/736x/5f/56/b3/5f56b35ba78d9678a79db6fa234ed8c0.jpg" alt="Veg Special Tiffin" className="w-full h-24 sm:h-28 md:h-32 object-cover" />
                  <Bookmark className="absolute top-1.5 right-1.5 w-5 h-5 text-white drop-shadow" />
                  <span className="absolute bottom-1.5 left-1.5 bg-green-800 text-white text-[10px] font-semibold px-1.5 py-0.5 rounded-md">Maa Ka Dabba</span>
                </div>
                <div className="p-2 sm:p-3">
                  <p className="font-bold text-gray-900 text-[13px] sm:text-sm leading-tight">Veg Special Tiffin</p>
                  <div className="flex items-center gap-1 text-[11px] sm:text-xs text-gray-600 mt-0.5">
                    <Star className="w-3 h-3 text-green-600 fill-green-600" />
                    <span className="font-semibold">4.8</span>
                    <span>| 25-30 mins</span>
                  </div>
                  <p className="text-[10px] sm:text-xs text-green-700 mt-0.5 leading-tight">✓ 15% OFF (Subscriptions)</p>
                </div>
              </Card>
            </div>
            <div>
              <h2 className="text-[15px] sm:text-base md:text-lg font-extrabold text-gray-900 mb-2 leading-tight">Weekly Subscriptions</h2>
              <Card className="rounded-2xl overflow-hidden border border-gray-100 shadow-md cursor-pointer" onClick={() => setShowTiffinOverlay(true)}>
                <img src="https://images.unsplash.com/photo-1626132647523-66f5bf380027?w=400&h=300&fit=crop" alt="Mahalaxmi Sweets" className="w-full h-24 sm:h-28 md:h-32 object-cover" />
                <div className="p-2 sm:p-3">
                  <p className="font-bold text-gray-900 text-[13px] sm:text-sm leading-tight">Mahalaxmi Sweets</p>
                  <p className="text-[10px] sm:text-xs text-gray-500 mt-0.5">Add-on Sweet</p>
                </div>
              </Card>
            </div>
          </div>
        </div>
      </section>

      <section className="bg-white pt-2 pb-3 sm:pt-3 sm:pb-4">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-[15px] sm:text-base md:text-lg font-extrabold text-gray-900 tracking-wide mb-2 leading-tight">RECOMMENDED FOR YOU</h2>
          <div className="flex overflow-x-auto hide-scrollbar gap-2.5 sm:gap-4 pb-1">
            {[
              { title: "Standard Veg Tiffin", badge: "Rs.75 OFF", img: "https://i.pinimg.com/1200x/1a/52/f7/1a52f771a5c9517f08629af02a9f8f3a.jpg" },
              { title: "Kadai Paneer", badge: "Rs.100 OFF Add-ons", img: "https://i.pinimg.com/736x/3e/a0/7f/3ea07f98c1ff6304dbe64998d81c43a2.jpg" },
              { title: "Egg Curry", badge: "Rs.100 OFF Add-ons", img: "https://i.pinimg.com/736x/d1/c9/b3/d1c9b3d0bd722dc465f7ef50292d404e.jpg" },
              { title: "Chilli Paneer", badge: "Rs.100 OFF Add-ons", img: "https://i.pinimg.com/1200x/0d/f1/ae/0df1ae2879042deee637cee2c7a08ef0.jpg" },
              { title: "Chilli Chicken", badge: "Rs.100 OFF Add-ons", img: "https://i.pinimg.com/736x/1e/0e/84/1e0e842b5a7fa11de1ea6606af2dbc0d.jpg" },
              { title: "Dal Tadka", badge: "Rs.100 OFF Add-ons", img: "https://i.pinimg.com/736x/78/07/49/780749ed00ce42f45c5384938632aefa.jpg" },
            ].map((item) => (
              <button key={item.title} onClick={() => handleRecommendedClick(item.title)} className="flex-shrink-0 w-[110px] sm:w-[140px] md:w-[160px] text-left">
                <div className="relative w-full h-[90px] sm:h-[110px] md:h-[130px] rounded-2xl overflow-hidden border border-gray-200 shadow-sm">
                  <img src={item.img} alt={item.title} className="w-full h-full object-cover" />
                  <span className="absolute bottom-0 left-0 right-0 bg-black/70 text-white text-[8px] sm:text-[10px] font-semibold text-center py-0.5">{item.badge}</span>
                </div>
                <p className="mt-1.5 text-[11px] sm:text-xs md:text-sm font-bold text-gray-900 leading-tight line-clamp-2">{item.title}</p>
              </button>
            ))}
          </div>
        </div>
      </section>

      {sellerCards.length > 0 && (
        <section className="bg-white pt-1 pb-3 sm:pb-4">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <h2 className="text-[15px] sm:text-base md:text-lg font-extrabold text-gray-900 tracking-wide mb-2 leading-tight">
              CAFES &amp; SELLERS NEAR YOU
            </h2>
            <div className="flex overflow-x-auto hide-scrollbar gap-3 sm:gap-4 pb-1">
              {sellerCards.map((seller) => (
                <button
                  key={seller._id}
                  onClick={() => setLocation(`/seller/${seller._id}`)}
                  className="flex-shrink-0 w-[150px] sm:w-[180px] md:w-[200px] text-left"
                >
                  <div className="relative w-full h-[90px] sm:h-[110px] md:h-[125px] rounded-2xl overflow-hidden border border-gray-200 shadow-sm bg-gray-100">
                    <img
                      src={seller.image || "https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?auto=format&fit=crop&w=400&q=80"}
                      alt={seller.shopName}
                      className="w-full h-full object-cover"
                    />
                    {seller.isPureVeg && (
                      <span className="absolute top-1.5 left-1.5 bg-green-700 text-white text-[8px] font-bold px-1.5 py-0.5 rounded-full">
                        Pure Veg
                      </span>
                    )}
                    <span className="absolute top-1.5 right-1.5 flex items-center gap-0.5 bg-green-600 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full">
                      <Star className="w-2.5 h-2.5 fill-white" />
                      {seller.rating > 0 ? seller.rating.toFixed(1) : "New"}
                    </span>
                  </div>
                  <p className="mt-1.5 text-[12px] sm:text-sm font-bold text-gray-900 leading-tight line-clamp-1">
                    {seller.shopName}
                  </p>
                  <p className="text-[10px] sm:text-xs text-gray-500 leading-tight">
                    {seller.itemCount} item{seller.itemCount > 1 ? "s" : ""}{seller.city ? ` · ${seller.city}` : ""}
                  </p>
                </button>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Sticky dish-category bar — sticks to top once user scrolls down to the meals list */}
      <div className="sticky top-0 z-40 bg-white border-b border-gray-100 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2">
          <div className="flex overflow-x-auto hide-scrollbar gap-4 sm:gap-6">
            {dishCategories.map((cat) => {
              const isActive = cat.label === "All" ? !selectedFoodCategory : selectedFoodCategory === cat.label;
              return (
                <button
                  key={cat.label}
                  onClick={() => handleDishCategoryClick(cat.label)}
                  className="flex-shrink-0 flex flex-col items-center gap-1"
                >
                  <div
                    className={`w-12 h-12 sm:w-14 sm:h-14 rounded-full overflow-hidden border-2 ${
                      isActive ? "border-red-500" : "border-transparent"
                    }`}
                  >
                    <img src={cat.img} alt={cat.label} className="w-full h-full object-cover" />
                  </div>
                  <span className={`text-[11px] sm:text-xs font-semibold whitespace-nowrap ${isActive ? "text-red-600" : "text-gray-700"}`}>
                    {cat.label}
                  </span>
                  <span className={`w-5 h-0.5 rounded-full ${isActive ? "bg-red-500" : "bg-transparent"}`} />
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <section id="best-food-section" className="py-6 sm:py-8 bg-white -mt-4">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between mb-6 gap-3">
            <div>
              <h2 className="text-2xl sm:text-3xl font-bold text-gray-800 mb-1">
                {selectedFoodCategory ? `Best ${selectedFoodCategory} Items` : "Best Food Near You"}
              </h2>
              <p className="text-gray-600 text-sm">Fresh homemade food from local kitchens</p>
            </div>
            
            {/* ✅ TEXT SWITCH KE ANDAR + FIXED FILTER DROPDOWN (RIGHT ALIGNED) */}
            <div className="flex flex-wrap items-center justify-end gap-3 w-full lg:w-auto">
              
              {/* Premium Toggle: Text hamesha switch ke andar rahega */}
              <button
                onClick={() => setVegMode(!vegMode)}
                className={`relative flex items-center h-[34px] rounded-full cursor-pointer transition-all duration-300 shadow-sm border border-gray-200 w-[80px] ${
                  vegMode 
                    ? 'bg-green-600 border-green-700' 
                    : 'bg-gray-300 border-gray-300'
                }`}
              >
                {/* "VEG" Text - ANDAR switch ke blank area mein move karega */}
                <span 
                  className={`absolute text-[10px] font-extrabold tracking-wider text-white transition-all duration-300 uppercase ${
                    vegMode 
                      ? 'left-3.5 opacity-100 scale-100' 
                      : 'right-3.5 opacity-100 scale-100'
                  }`}
                >
                  VEG
                </span>

                {/* White Circle (Thumb) */}
                <div 
                  className={`w-[24px] h-[24px] bg-white rounded-full shadow-md transform transition-all duration-300 ease-in-out ${
                    vegMode ? 'translate-x-[46px]' : 'translate-x-[4px]'
                  }`}
                />
              </button>

              {/* ✅ Filters Button (Right Aligned) */}
              <div className="relative ml-auto lg:ml-0">
                <Button 
                  variant="outline" 
                  className="border-gray-200 text-gray-700 rounded-full whitespace-nowrap h-9 text-sm font-medium px-4 hover:bg-gray-50 hover:border-gray-300 transition-all" 
                  size="sm"
                  onClick={() => setShowMoreFilters(!showMoreFilters)}
                >
                  <Filter className="w-4 h-4 mr-2 text-gray-500" />
                  Filters
                  {selectedPriceRange && (
                    <span className="ml-1 w-1.5 h-1.5 bg-red-500 rounded-full"></span>
                  )}
                </Button>

                {/* ✅ SMART FILTERS DROPDOWN (Ab kabhi screen ke bahar nahi jayega!) */}
                {showMoreFilters && (
                  <div className="absolute top-full mt-2 w-[280px] max-w-[90vw] bg-white rounded-2xl shadow-[0_10px_40px_-10px_rgba(0,0,0,0.15)] border border-gray-100 z-50 p-5 overflow-hidden right-0 lg:right-0">
                    <div className="flex items-center justify-between mb-5">
                      <h3 className="font-bold text-gray-800 text-base">Price Filter</h3>
                      <button 
                        onClick={() => setShowMoreFilters(false)} 
                        className="w-7 h-7 bg-gray-100 rounded-full flex items-center justify-center hover:bg-gray-200 transition-colors"
                      >
                        <X className="w-4 h-4 text-gray-500" />
                      </button>
                    </div>
                    
                    <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1 custom-scrollbar">
                      {priceRanges.map((range) => (
                        <div 
                          key={range.value} 
                          className={`flex items-center justify-between p-3.5 rounded-xl cursor-pointer transition-all duration-200 ${
                            selectedPriceRange === range.value 
                              ? 'bg-green-50 border border-green-200' 
                              : 'bg-gray-50 hover:bg-gray-100'
                          }`} 
                          onClick={() => { 
                            setSelectedPriceRange(selectedPriceRange === range.value ? null : range.value);
                          }}
                        >
                          <span className={`text-sm font-semibold ${
                            selectedPriceRange === range.value ? 'text-green-700' : 'text-gray-700'
                          }`}>
                            {range.label}
                          </span>
                          {selectedPriceRange === range.value && (
                            <div className="w-5 h-5 bg-green-600 rounded-full flex items-center justify-center shadow-sm">
                              <div className="w-2 h-2 bg-white rounded-full"></div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                    
                    {(selectedPriceRange) && (
                      <div className="mt-4 pt-4 border-t border-gray-100">
                        <Button 
                          variant="ghost" 
                          className="w-full text-green-600 hover:text-green-700 hover:bg-green-50 font-semibold rounded-xl" 
                          size="sm"
                          onClick={() => { setSelectedPriceRange(null); }}
                        >
                          Clear Filter
                        </Button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          <Tabs defaultValue="all" value={activeTab} onValueChange={setActiveTab} className="mb-6">
            <TabsList className="bg-gray-100 p-1 rounded-xl inline-flex overflow-x-auto w-full sm:w-auto">
              {[{ value: "all", label: "All Items" }, { value: "popular", label: "Popular 🔥" }, { value: "top-rated", label: "Top Rated ⭐" }].map((tab) => (
                <TabsTrigger key={tab.value} value={tab.value} className="rounded-lg data-[state=active]:bg-white data-[state=active]:text-red-500 data-[state=active]:shadow-sm font-semibold px-4 py-2 transition-all hover:scale-105 whitespace-nowrap">
                  {tab.label}
                </TabsTrigger>
              ))}
            </TabsList>

            {/* All Items Tab */}
            <TabsContent value="all" className="mt-6">
              {isLoading ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
                  {[...Array(6)].map((_, i) => (
                    <Card key={i} className="overflow-hidden border-0 shadow-lg rounded-2xl">
                      <Skeleton className="h-48 w-full rounded-2xl" />
                      <div className="p-6 space-y-4">
                        <Skeleton className="h-6 w-3/4 rounded" />
                        <Skeleton className="h-4 w-full rounded" />
                        <Skeleton className="h-4 w-2/3 rounded" />
                        <div className="flex justify-between items-center pt-4">
                          <Skeleton className="h-8 w-20 rounded-lg" />
                          <Skeleton className="h-10 w-24 rounded-lg" />
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              ) : filteredTiffins.length === 0 ? (
                <div className="text-center py-12">
                  <div className="w-20 h-20 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
                    <Search className="w-8 h-8 text-gray-400" />
                  </div>
                  <h3 className="text-xl font-semibold text-gray-800 mb-2">No items found</h3>
                  <p className="text-gray-600 mb-4">Try adjusting your search criteria</p>
                  <Button onClick={() => { setSearchQuery(""); setSelectedCategory(null); setSelectedCity(null); setSelectedFoodCategory(null); setVegMode(true); }} className="bg-red-500 hover:bg-red-600 text-white rounded-full hover:scale-105 transition-transform">
                    Clear Filters
                  </Button>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
                  {filteredTiffins.map((tiffin, index) => (
                    <Link key={tiffin._id} href={`/tiffin/${tiffin._id}`}>
                      <Card className="overflow-hidden border-0 shadow-lg hover:shadow-2xl transition-all duration-500 cursor-pointer group rounded-2xl transform hover:-translate-y-1">
                        <div className="relative h-48 sm:h-52 overflow-hidden">
                          <img src={categoryImages[tiffin.category]} alt={tiffin.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                          <div className="absolute top-3 left-3 flex flex-col items-start gap-2">
                            <div className="bg-blue-500 text-white px-3 py-1 rounded-full text-xs font-semibold shadow-lg">🍛 Meal</div>
                          </div>
                          <div className="absolute bottom-3 left-3">
                            <Badge className={`${tiffin.category === "Veg" ? "bg-green-500 text-white" : tiffin.category === "Non-Veg" ? "bg-red-500 text-white" : "bg-purple-500 text-white"} border-0 font-semibold shadow-lg`}>
                              {tiffin.category}
                            </Badge>
                          </div>
                          <Button variant="ghost" size="icon" onClick={(e) => { e.preventDefault(); e.stopPropagation(); }} className="absolute top-3 right-3 w-9 h-9 bg-white/90 backdrop-blur-sm rounded-full shadow-lg hover:bg-white hover:scale-110 transition-all duration-300">
                            <Bookmark className="w-4 h-4 text-gray-700" />
                          </Button>
                        </div>
                        <div className="p-4 sm:p-5">
                          <div className="flex items-start justify-between gap-2 mb-2">
                            <h3 className="text-lg sm:text-xl font-bold text-gray-900 line-clamp-1 group-hover:text-red-500 transition-colors">{tiffin.title}</h3>
                            <div className="flex items-center gap-1 bg-green-600 text-white px-2 py-0.5 rounded-md text-sm font-semibold shrink-0">
                              <Star className="w-3 h-3 fill-white" />
                              <span>{(4.4 + ((tiffin._id.charCodeAt(0) + tiffin._id.charCodeAt(tiffin._id.length - 1)) % 6 * 0.1)).toFixed(1)}</span>
                            </div>
                          </div>
                          <div className="flex items-center flex-wrap gap-x-2 gap-y-1 text-sm text-gray-500 mb-3">
                            <span className="flex items-center gap-1"><Clock4 className="w-3.5 h-3.5" />20-25 mins</span>
                            <span>|</span>
                            <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5" />{tiffin.seller.city} • 2.5 km</span>
                            <span>|</span>
                            <span className="flex items-center gap-1 text-green-600 font-medium"><Truck className="w-3.5 h-3.5" />Free</span>
                          </div>
                          <div className="flex items-center gap-2 pt-3 border-t border-dashed border-gray-200">
                            <div className="w-5 h-5 rounded-full bg-blue-500 flex items-center justify-center shrink-0">
                              <Tag className="w-3 h-3 text-white" />
                            </div>
                            <span className="text-sm font-medium text-gray-700">
                              Flat ₹{Math.round(tiffin.price * 0.2)} OFF · <span className="text-gray-400 line-through">₹{Math.round(tiffin.price * 1.2)}</span> <span className="font-bold text-gray-900">₹{tiffin.price}</span>
                            </span>
                          </div>
                        </div>
                      </Card>
                    </Link>
                  ))}
                </div>
              )}
            </TabsContent>

            {/* Popular Tab */}
            <TabsContent value="popular" className="mt-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
                {popularTiffins.map((tiffin, index) => (
                  <Link key={tiffin._id} href={`/tiffin/${tiffin._id}`}>
                    <Card className="overflow-hidden border-0 shadow-lg rounded-2xl group hover:shadow-2xl transition-all duration-500 cursor-pointer transform hover:-translate-y-1">
                      <div className="relative h-48 sm:h-52 overflow-hidden">
                        <img src={categoryImages[tiffin.category]} alt={tiffin.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                        <div className="absolute top-3 left-3 flex flex-col items-start gap-2">
                          <div className="bg-blue-500 text-white px-3 py-1 rounded-full text-xs font-semibold shadow-lg">🍛 Meal</div>
                          <div className="bg-emerald-600 text-white px-3 py-1 rounded-full text-xs font-semibold shadow-lg">⚡ Instant Delivery</div>
                          <div className="bg-red-500 text-white px-3 py-1 rounded-full text-xs font-semibold shadow-lg">Popular 🔥</div>
                        </div>
                        <Button variant="ghost" size="icon" onClick={(e) => { e.preventDefault(); e.stopPropagation(); }} className="absolute top-3 right-3 w-9 h-9 bg-white/90 backdrop-blur-sm rounded-full shadow-lg hover:bg-white hover:scale-110 transition-all duration-300">
                          <Bookmark className="w-4 h-4 text-gray-700" />
                        </Button>
                      </div>
                      <div className="p-4 sm:p-5">
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <h3 className="text-lg sm:text-xl font-bold text-gray-900 line-clamp-1 group-hover:text-red-500 transition-colors">{tiffin.title}</h3>
                          <div className="flex items-center gap-1 bg-green-600 text-white px-2 py-0.5 rounded-md text-sm font-semibold shrink-0">
                            <Star className="w-3 h-3 fill-white" />
                            <span>4.5</span>
                          </div>
                        </div>
                        <div className="flex items-center flex-wrap gap-x-2 gap-y-1 text-sm text-gray-500 mb-3">
                          <span className="flex items-center gap-1"><Clock4 className="w-3.5 h-3.5" />20-25 mins</span>
                          <span>|</span>
                          <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5" />{tiffin.seller.city} • 2.5 km</span>
                          <span>|</span>
                          <span className="flex items-center gap-1 text-green-600 font-medium"><Truck className="w-3.5 h-3.5" />Free</span>
                        </div>
                        <div className="flex items-center gap-2 pt-3 border-t border-dashed border-gray-200">
                          <div className="w-5 h-5 rounded-full bg-blue-500 flex items-center justify-center shrink-0">
                            <Tag className="w-3 h-3 text-white" />
                          </div>
                          <span className="text-sm font-medium text-gray-700">
                            Flat ₹{Math.round(tiffin.price * 0.2)} OFF · <span className="text-gray-400 line-through">₹{Math.round(tiffin.price * 1.2)}</span> <span className="font-bold text-gray-900">₹{tiffin.price}</span>
                          </span>
                        </div>
                      </div>
                    </Card>
                  </Link>
                ))}
              </div>
            </TabsContent>

            {/* Top Rated Tab */}
            <TabsContent value="top-rated" className="mt-6">
              {isLoading ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
                  {[...Array(6)].map((_, i) => (
                    <Card key={i} className="overflow-hidden border-0 shadow-lg rounded-2xl">
                      <Skeleton className="h-48 w-full rounded-2xl" />
                      <div className="p-6 space-y-4">
                        <Skeleton className="h-6 w-3/4 rounded" />
                        <Skeleton className="h-4 w-full rounded" />
                        <Skeleton className="h-4 w-2/3 rounded" />
                        <div className="flex justify-between items-center pt-4">
                          <Skeleton className="h-8 w-20 rounded-lg" />
                          <Skeleton className="h-10 w-24 rounded-lg" />
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              ) : (() => {
                const topRatedSellerIds = topRatedSellers.map(seller => seller._id);
                const topRatedShopNames = topRatedSellers.map(seller => seller.shopName.toLowerCase());
                const topRatedTiffins = filteredTiffins.filter(tiffin => {
                  const isFromTopRatedSeller = topRatedSellerIds.includes(tiffin.seller._id);
                  const isFromTopRatedShop = topRatedShopNames.includes(tiffin.seller.shopName.toLowerCase());
                  return isFromTopRatedSeller || isFromTopRatedShop;
                });
                return topRatedTiffins.length === 0 ? (
                  <div className="text-center py-12">
                    <div className="w-20 h-20 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
                      <Star className="w-8 h-8 text-yellow-400" />
                    </div>
                    <h3 className="text-xl font-semibold text-gray-800 mb-2">No top rated items found</h3>
                    <p className="text-gray-600 mb-4">{topRatedSellers.length > 0 ? "Top rated sellers found, but no matching tiffins with current filters" : "No top rated sellers available yet"}</p>
                    <Button onClick={() => { setSearchQuery(""); setSelectedCategory(null); setSelectedCity(null); setSelectedFoodCategory(null); setVegMode(true); }} className="bg-red-500 hover:bg-red-600 text-white rounded-full hover:scale-105 transition-transform">
                      Clear Filters
                    </Button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
                    {topRatedTiffins.map((tiffin, index) => (
                      <Link key={tiffin._id} href={`/tiffin/${tiffin._id}`}>
                        <Card className="overflow-hidden border-0 shadow-lg hover:shadow-2xl transition-all duration-500 cursor-pointer group rounded-2xl transform hover:-translate-y-1 border-2 border-yellow-200">
                          <div className="relative h-48 sm:h-52 overflow-hidden">
                            <img src={categoryImages[tiffin.category]} alt={tiffin.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                            <div className="absolute top-3 left-3 flex flex-col items-start gap-2">
                              <div className="bg-blue-500 text-white px-3 py-1 rounded-full text-xs font-semibold shadow-lg">🍛 Meal</div>
                              <div className="bg-emerald-600 text-white px-3 py-1 rounded-full text-xs font-semibold shadow-lg">⚡ Instant Delivery</div>
                              <div className="bg-yellow-500 text-white px-3 py-1 rounded-full text-xs font-semibold shadow-lg flex items-center gap-1">
                                <Star className="w-3 h-3 fill-white" />Top Rated
                              </div>
                            </div>
                            <div className="absolute bottom-3 left-3">
                              <Badge className={`${tiffin.category === "Veg" ? "bg-green-500 text-white" : tiffin.category === "Non-Veg" ? "bg-red-500 text-white" : "bg-purple-500 text-white"} border-0 font-semibold shadow-lg`}>
                                {tiffin.category}
                              </Badge>
                            </div>
                            <Button variant="ghost" size="icon" onClick={(e) => { e.preventDefault(); e.stopPropagation(); }} className="absolute top-3 right-3 w-9 h-9 bg-white/90 backdrop-blur-sm rounded-full shadow-lg hover:bg-white hover:scale-110 transition-all duration-300">
                              <Bookmark className="w-4 h-4 text-gray-700" />
                            </Button>
                          </div>
                          <div className="p-4 sm:p-5">
                            <div className="flex items-start justify-between gap-2 mb-2">
                              <h3 className="text-lg sm:text-xl font-bold text-gray-900 line-clamp-1 group-hover:text-red-500 transition-colors">{tiffin.title}</h3>
                              <div className="flex items-center gap-1 bg-green-600 text-white px-2 py-0.5 rounded-md text-sm font-semibold shrink-0">
                                <Star className="w-3 h-3 fill-white" />
                                <span>{(4.4 + ((tiffin._id.charCodeAt(0) + tiffin._id.charCodeAt(tiffin._id.length - 1)) % 6 * 0.1)).toFixed(1)}</span>
                              </div>
                            </div>
                            <div className="flex items-center gap-2 text-sm text-gray-700 mb-2">
                              <span className="font-medium">{tiffin.seller.shopName}</span>
                              <Badge className="bg-yellow-100 text-yellow-700 border-0 text-xs">Top Seller</Badge>
                            </div>
                            <div className="flex items-center flex-wrap gap-x-2 gap-y-1 text-sm text-gray-500 mb-3">
                              <span className="flex items-center gap-1"><Clock4 className="w-3.5 h-3.5" />20-25 mins</span>
                              <span>|</span>
                              <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5" />{tiffin.seller.city} • 2.5 km</span>
                              <span>|</span>
                              <span className="flex items-center gap-1 text-green-600 font-medium"><Truck className="w-3.5 h-3.5" />Free</span>
                            </div>
                            <div className="flex items-center gap-2 pt-3 border-t border-dashed border-gray-200">
                              <div className="w-5 h-5 rounded-full bg-blue-500 flex items-center justify-center shrink-0">
                                <Tag className="w-3 h-3 text-white" />
                              </div>
                              <span className="text-sm font-medium text-gray-700">
                                Flat ₹{Math.round(tiffin.price * 0.2)} OFF · <span className="text-gray-400 line-through">₹{Math.round(tiffin.price * 1.2)}</span> <span className="font-bold text-gray-900">₹{tiffin.price}</span>
                              </span>
                            </div>
                          </div>
                        </Card>
                      </Link>
                    ))}
                  </div>
                );
              })()}
            </TabsContent>
          </Tabs>
        </div>
      </section>

      <LocationPickerModal isOpen={showLocationPicker} onClose={() => setShowLocationPicker(false)} onConfirm={handleLocationConfirm} initialCoords={deliverFor === "other" && recipientDetails.lat && recipientDetails.lng ? { lat: recipientDetails.lat, lng: recipientDetails.lng } : userLocation.lat && userLocation.lng ? { lat: userLocation.lat, lng: userLocation.lng } : undefined} />

      <TiffinOverlay isOpen={showTiffinOverlay} onClose={() => setShowTiffinOverlay(false)} tiffins={tiffinsData} isLoading={isLoading} onTiffinClick={handleTiffinClick} />

      {showLoginPopup && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full mx-auto shadow-2xl">
            <div className="text-center mb-6">
              <h2 className="text-2xl font-bold text-gray-800 mb-2">Welcome to Tiffo</h2>
              <p className="text-gray-600">Choose how you want to continue</p>
            </div>
            <div className="space-y-4">
              <Button onClick={() => handleLogin("customer")} className="w-full bg-red-500 hover:bg-red-600 text-white py-4 rounded-xl text-base font-semibold transition-all hover:scale-105">
                <User className="w-5 h-5 mr-3" />Continue as Customer
              </Button>
              <Button onClick={() => handleLogin("seller")} className="w-full bg-orange-500 hover:bg-orange-600 text-white py-4 rounded-xl text-base font-semibold transition-all hover:scale-105">
                <ChefHat className="w-5 h-5 mr-3" />Continue as Seller
              </Button>
            </div>
            <Button onClick={() => setShowLoginPopup(false)} variant="ghost" className="w-full mt-4 text-gray-500 hover:text-gray-700">Close</Button>
          </div>
        </div>
      )}

      {isScrolled && (
        <Button onClick={scrollToTop} className="fixed bottom-24 lg:bottom-6 right-4 sm:right-6 z-40 w-11 h-11 sm:w-12 sm:h-12 bg-red-500 hover:bg-red-600 text-white rounded-full shadow-2xl transition-all duration-300 hover:scale-110" size="icon">
          <Navigation className="w-5 h-5" />
        </Button>
      )}

      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-lg z-40 lg:hidden">
        <div className="flex justify-around items-end pt-2 pb-2 relative max-w-md mx-auto sm:max-w-xl">
          <Link href="/" className="flex flex-col items-center gap-1 w-1/5">
            <PackageCheck className={`w-6 h-6 ${location === '/' ? 'text-orange-500' : 'text-gray-500'}`} />
            <span className={`text-[11px] ${location === '/' ? 'text-orange-500 font-bold' : 'text-gray-600'}`}>Delivery</span>
          </Link>
          <Link href="/my-subscriptions" className="flex flex-col items-center gap-1 w-1/5">
            <CalendarCheck className={`w-6 h-6 ${location === '/my-subscriptions' ? 'text-orange-500' : 'text-gray-500'}`} />
            <span className={`text-[11px] ${location === '/my-subscriptions' ? 'text-orange-500 font-bold' : 'text-gray-600'}`}>Subscriptions</span>
          </Link>
          <a href="https://mayankgautam008.github.io/story-rewards-for-tifo/" target="_blank" rel="noopener noreferrer" className="flex flex-col items-center gap-1 w-1/5">
            <BadgePercent className="w-6 h-6 text-gray-500" />
            <span className="text-[11px] text-gray-600">Offer's</span>
          </a>
          <div className="flex flex-col items-center w-1/5 -mt-7">
            <button onClick={() => setShowTiffinOverlay(true)} className="w-14 h-14 rounded-full bg-red-600 shadow-lg border-4 border-white flex items-center justify-center">
              <div className="relative">
                <ChefHat className="w-6 h-6 text-white" />
                <PlusCircle className="w-3.5 h-3.5 text-white absolute -bottom-1 -right-1 bg-red-600 rounded-full" />
              </div>
            </button>
            <span className="text-[11px] font-bold text-gray-800 mt-1">New Tiffin</span>
          </div>
          <Link href="/my-bookings" className="flex flex-col items-center gap-1 w-1/5">
            <BookOpen className={`w-6 h-6 ${location === '/my-bookings' ? 'text-orange-500' : 'text-gray-500'}`} />
            <span className={`text-[11px] ${location === '/my-bookings' ? 'text-orange-500 font-bold' : 'text-gray-600'}`}>Orders</span>
          </Link>
        </div>
      </div>

      <footer className="bg-gray-900 text-white py-10 sm:py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 sm:gap-8">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 bg-red-500 rounded-lg flex items-center justify-center">
                  <span className="text-white font-bold text-sm">T</span>
                </div>
                <span className="font-bold text-xl">Tiffo</span>
              </div>
              <p className="text-gray-400 text-sm mb-4 leading-relaxed">Delivering homemade happiness to your doorstep. Fresh, hygienic, and delicious tiffins from trusted kitchens.</p>
              <div className="flex gap-3">
                <Facebook className="w-5 h-5 text-gray-400 hover:text-white cursor-pointer transition-colors hover:scale-110" />
                <Twitter className="w-5 h-5 text-gray-400 hover:text-white cursor-pointer transition-colors hover:scale-110" />
                <a href="https://www.instagram.com/tiffo.official" target="_blank" rel="noopener noreferrer">
                  <Instagram className="w-5 h-5 text-gray-400 hover:text-white cursor-pointer transition-colors hover:scale-110" />
                </a>
              </div>
            </div>
            <div>
              <h3 className="font-semibold mb-3">Quick Links</h3>
              <ul className="space-y-2 text-gray-400 text-sm">
                <li className="hover:text-white cursor-pointer transition-colors hover:translate-x-1 transform"><a href="/about">About Us</a></li>
                <li className="hover:text-white cursor-pointer transition-colors hover:translate-x-1 transform"><a href="/register">Partner With Us</a></li>
                <li className="hover:text-white cursor-pointer transition-colors hover:translate-x-1 transform"><a href="https://wa.me/918115067311" target="_blank" rel="noopener noreferrer" className="flex items-center gap-1">Contact Us</a></li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold mb-3">Legal</h3>
              <ul className="space-y-2 text-gray-400 text-sm">
                <li className="hover:text-white cursor-pointer transition-colors hover:translate-x-1 transform"><Link href="/terms-conditions">Terms & Conditions</Link></li>
                <li className="hover:text-white cursor-pointer transition-colors hover:translate-x-1 transform"><Link href="/privacy-policy">Privacy Policy</Link></li>
                <li className="hover:text-white cursor-pointer transition-colors hover:translate-x-1 transform"><a href="/cookie-policy">Cookie Policy</a></li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold mb-3">Contact Us</h3>
              <div className="space-y-2 text-gray-400 text-sm">
                <a href="tel:+918115067311" className="flex items-center gap-2 hover:text-white transition-colors"><Phone className="w-4 h-4" /><span>+91 8115067311</span></a>
                <a href="tel:+918115067311" className="flex items-center gap-2 hover:text-white transition-colors"><Phone className="w-4 h-4" /><span>+91 9670421522</span></a>
                <div className="flex items-center gap-2 hover:text-white transition-colors"><Mail className="w-4 h-4" /><span>help@tiffo.com</span></div>
                <div className="flex items-center gap-2 hover:text-white transition-colors"><MapPin className="w-4 h-4" /><span>Lucknow(Uttar Pradesh), India</span></div>
              </div>
            </div>
          </div>
          <div className="border-t border-gray-800 mt-8 pt-6 text-center text-gray-400 text-sm">
            <p>&copy; 2025 Tiffo. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
