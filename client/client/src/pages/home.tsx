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
  Search, 
  Gift,
  MapPin, 
  Clock, 
  Tag,
  IndianRupee, 
  Star,
  Shield,
  Truck,
  Clock4,
  Heart,
  ChevronDown,
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
  PackageCheck
} from "lucide-react";
import { Link, useLocation } from "wouter";
import type { TiffinWithSeller } from "@shared/schema";

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

// Import optimized images
import heroImage from "@assets/generated_images/Traditional_Indian_tiffin_thali_d174217b.png";
import vegImage from "@assets/generated_images/Vegetarian_tiffin_lunch_box_a5780b62.png";
import nonVegImage from "@assets/generated_images/Non-vegetarian_tiffin_meal_aa63199b.png";

const categoryImages: Record<string, string> = {
  Veg: vegImage,
  "Non-Veg": nonVegImage,
};

// Featured cities
const featuredCities = ["Lucknow", "Unnao", "Nawabganj", "Kanpur"];

// Food categories with icons
const foodCategories = [
  { name: "Biryani", icon: "🍛", emoji: "🍛" },
  { name: "Burger", icon: "🍔", emoji: "🍔" },
  { name: "Tiffin", icon: "🍱", emoji: "🍱" },
  { name: "Corn", icon: "🌽", emoji: "🌽" },
  { name: "Rice", icon: "🍚", emoji: "🍚" },
  { name: "Noodles", icon: "🍜", emoji: "🍜" },
  { name: "Chicken", icon: "🍗", emoji: "🍗" },
  { name: "Paneer", icon: "🧀", emoji: "🧀" },
  { name: "Mushroom", icon: "🍄", emoji: "🍄" },
  { name: "Aloo", icon: "🥔", emoji: "🥔" },
  { name: "Pizza", icon: "🍕", emoji: "🍕" },
  { name: "Desserts", icon: "🍨", emoji: "🍨" }
];

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
      // Simulate upload process
      setTimeout(() => {
        onImageUpload(imageUrl);
        setIsUploading(false);
      }, 1000);
    }
  };

  return (
    <div className="bg-white rounded-2xl shadow-lg p-6 max-w-md w-full">
      <div className="flex items-center gap-3 mb-4">
        <Image className="w-6 h-6 text-red-500" />
        <h3 className="text-lg font-semibold text-gray-800">Upload Image</h3>
      </div>
      
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Image URL
          </label>
          <Input
            type="url"
            placeholder="https://example.com/image.jpg"
            value={imageUrl}
            onChange={(e) => setImageUrl(e.target.value)}
            className="w-full"
          />
          <p className="text-xs text-gray-500 mt-1">
            Paste the URL of your image (JPG, PNG, WebP supported)
          </p>
        </div>

        <Button
          onClick={handleUrlSubmit}
          disabled={!imageUrl.trim() || isUploading}
          className="w-full bg-red-500 hover:bg-red-600 text-white"
        >
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

// Location Picker Modal - map se location set karne ke liye (Leaflet + OpenStreetMap, no API key needed)
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

  // Reset a fresh state har baar modal khulne par
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

  // Leaflet ko CDN se load karo (npm install ki zaroorat nahi)
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

  // Map initialize karo jab modal khule aur Leaflet load ho jaye
  useEffect(() => {
    if (!isOpen || !mapLoaded || !mapRef.current) return;
    const L = (window as any).L;
    if (leafletMapRef.current) {
      setTimeout(() => leafletMapRef.current.invalidateSize(), 100);
      return;
    }

    const start = initialCoords || { lat: 26.8467, lng: 80.9462 }; // Lucknow default

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, mapLoaded]);

  // Modal band hone par map cleanup karo taaki dobara khulne par fresh ban sake
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

  // "Real" current location - browser geolocation se
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
      <div className="bg-white rounded-t-2xl sm:rounded-2xl w-full sm:max-w-lg max-h-[92vh] flex flex-col shadow-2xl">
        {/* Header */}
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
          {/* Order for self / someone else toggle */}
          <div className="p-4 border-b border-gray-100">
            <div className="flex bg-gray-100 rounded-xl p-1">
              <button
                onClick={() => setForWhom("self")}
                className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-semibold transition-all ${
                  forWhom === "self" ? "bg-white text-red-500 shadow" : "text-gray-500"
                }`}
              >
                <User className="w-4 h-4" />
                Order for Myself
              </button>
              <button
                onClick={() => setForWhom("other")}
                className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-semibold transition-all ${
                  forWhom === "other" ? "bg-white text-red-500 shadow" : "text-gray-500"
                }`}
              >
                <Gift className="w-4 h-4" />
                Order for Someone Else
              </button>
            </div>

            {forWhom === "other" && (
              <div className="mt-3 space-y-2">
                <Input
                  placeholder="Recipient's full name"
                  value={recipientName}
                  onChange={(e) => setRecipientName(e.target.value)}
                />
                <Input
                  type="tel"
                  placeholder="Recipient's phone number"
                  value={recipientPhone}
                  maxLength={10}
                  onChange={(e) => setRecipientPhone(e.target.value.replace(/\D/g, ""))}
                />
                {phoneError && <p className="text-xs text-red-500">{phoneError}</p>}
              </div>
            )}
          </div>

          {/* Search */}
          <div className="p-4 border-b border-gray-100 relative">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                placeholder="Search for area, street, landmark..."
                value={searchQuery}
                onChange={(e) => handleSearchChange(e.target.value)}
                className="pl-9"
              />
            </div>

            {searchResults.length > 0 && (
              <div className="absolute left-4 right-4 top-full mt-1 bg-white rounded-lg shadow-lg border border-gray-200 z-10 max-h-56 overflow-y-auto">
                {searchResults.map((result, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleSelectSearchResult(result)}
                    className="w-full text-left px-3 py-2 hover:bg-gray-50 border-b border-gray-100 last:border-0 text-sm text-gray-700 flex items-start gap-2"
                  >
                    <MapPin className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                    <span className="line-clamp-2">{result.display_name}</span>
                  </button>
                ))}
              </div>
            )}
            {isSearching && <p className="text-xs text-gray-400 mt-1">Searching...</p>}

            <button
              onClick={handleUseCurrentLocation}
              className="flex items-center gap-2 mt-3 text-sm font-semibold text-red-500 hover:text-red-600"
            >
              <Navigation className="w-4 h-4" />
              Use my real (current) location
            </button>
          </div>

          {/* Map */}
          <div className="relative h-[280px]">
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

          {/* Selected Address */}
          <div className="p-4">
            <div className="bg-gray-50 rounded-lg p-3 mb-3 min-h-[54px]">
              {isLoadingAddress ? (
                <div className="flex items-center gap-2 text-sm text-gray-500">
                  <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-red-500"></div>
                  Fetching address...
                </div>
              ) : (
                <>
                  <p className="text-sm font-medium text-gray-800 line-clamp-2">
                    {selectedAddress || "Select a location on the map"}
                  </p>
                  {selectedCity && <p className="text-xs text-gray-500 mt-1">{selectedCity}</p>}
                </>
              )}
            </div>
          </div>
        </div>

        {/* Footer - always visible */}
        <div className="p-4 border-t border-gray-100 flex-shrink-0">
          <Button
            onClick={handleConfirm}
            disabled={!selectedCoords || isLoadingAddress}
            className="w-full bg-red-500 hover:bg-red-600 text-white py-5 rounded-xl font-semibold"
          >
            Confirm {forWhom === "other" ? "Recipient's" : "My"} Location
          </Button>
        </div>
      </div>
    </div>
  );
};

// Main Home Component
export default function Home() {
  const { data: topRatedSellers = [] } = useQuery<TopRatedSeller[]>({
    queryKey: ["/api/top-rated-sellers"],
  });
  
  const [hasSearched, setHasSearched] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedCity, setSelectedCity] = useState<string | null>(null);
  const [selectedFoodType, setSelectedFoodType] = useState<string | null>(null);
  const [selectedFoodCategory, setSelectedFoodCategory] = useState<string | null>(null);
  const [showCityDropdown, setShowCityDropdown] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [activeTab, setActiveTab] = useState("all");
  const [showLoginPopup, setShowLoginPopup] = useState(false);
  const [userType, setUserType] = useState<"customer" | "seller" | "admin" | null>(null);
  const [scrollProgress, setScrollProgress] = useState(0);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [location] = useLocation();
  const [showImageUpload, setShowImageUpload] = useState(false);
  const [heroImageUrl, setHeroImageUrl] = useState("https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=800&q=80");
  const [bannerImageUrl, setBannerImageUrl] = useState("https://image2url.com/images/1763986721956-7bc4c565-ef21-4771-9eaa-0dd94be72037.jpeg");
  const [showSearchInput, setShowSearchInput] = useState(false);

  const [selectedPriceRange, setSelectedPriceRange] = useState<string | null>(null);
  const [showMoreFilters, setShowMoreFilters] = useState(false);

  const [currentPlaceholder, setCurrentPlaceholder] = useState('');
  const [placeholderIndex, setPlaceholderIndex] = useState(0);
  const [charIndex, setCharIndex] = useState(0);
  const [isDeleting, setIsDeleting] = useState(false);

  // Home component ke state variables mein add karo:
  // Delivery location + "order for someone else" details, ab lat/lng ke saath
  const [userLocation, setUserLocation] = useState({
    city: "Lucknow", // Default city
    address: "Sector J, Jankipuram",
    lat: 26.8896 as number | null,
    lng: 80.9548 as number | null,
  });

  // Kiske liye order ho raha hai - khud ke liye ya kisi aur ke liye
  const [deliverFor, setDeliverFor] = useState<"self" | "other">("self");
  const [recipientDetails, setRecipientDetails] = useState({
    name: "",
    phone: "",
    address: "",
    city: "",
    lat: null as number | null,
    lng: null as number | null,
  });

  // Location picker modal ke liye state
  const [showLocationPicker, setShowLocationPicker] = useState(false);

  // User data fetch karne ke liye useEffect add karo
  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const token = localStorage.getItem('token');
        if (token) {
          const response = await fetch('/api/user/profile', {
            headers: {
              'Authorization': `Bearer ${token}`
            }
          });
          if (response.ok) {
            const userData = await response.json();
            if (userData.city && userData.address) {
              setUserLocation((prev) => ({
                ...prev,
                city: userData.city,
                address: userData.address,
                lat: userData.lat ?? prev.lat,
                lng: userData.lng ?? prev.lng,
              }));
            }
          }
        }
      } catch (error) {
        console.error('Error fetching user data:', error);
      }
    };

    fetchUserData();
  }, []);

  // Location picker se aaya hua result save karne ka handler
  const handleLocationConfirm = (
    loc: { address: string; city: string; lat: number; lng: number },
    forWhom: "self" | "other",
    recipient?: { name: string; phone: string }
  ) => {
    if (forWhom === "self") {
      setUserLocation({ city: loc.city || "Lucknow", address: loc.address, lat: loc.lat, lng: loc.lng });
      setDeliverFor("self");
    } else {
      setRecipientDetails({
        name: recipient?.name || "",
        phone: recipient?.phone || "",
        address: loc.address,
        city: loc.city || "",
        lat: loc.lat,
        lng: loc.lng,
      });
      setDeliverFor("other");
    }
  };

  const searchTerms = [
    "kadhai paneer..",
    "butter chicken..", 
    "biryani..",
    "tiffin services..",
    "home cooked meals..",
    "daily lunch..",
    "healthy food..",
    "veg thali..",
    "chole bhature..",
    "north indian food..",
    "south indian food..",
    "paneer butter masala..",
    "dal makhani..",
    "rajma chawal.."
  ];

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

  const { data: tiffins = [], isLoading } = useQuery<TiffinWithSeller[]>({
    queryKey: ["/api/tiffins"],
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
    if (userType === "seller") {
      window.location.href = "/seller/dashboard";
    } else if (userType === "admin") {
      window.location.href = "/admin";
    } else if (userType === "customer") {
      window.location.href = "/my-bookings";
    }
  }, [userType]);

  const cities = Array.from(new Set(tiffins.map((t) => t.seller.city)));
  const categories = ["Veg", "Non-Veg"];
  const foodTypes = ["Tiffin"];

  // Price ranges define karo
  const priceRanges = [
    { label: "Under ₹100", value: "0-100", min: 0, max: 100 },
    { label: "₹100 - ₹200", value: "100-200", min: 100, max: 200 },
    { label: "₹200 - ₹300", value: "200-300", min: 200, max: 300 },
    { label: "₹300 - ₹400", value: "300-400", min: 300, max: 400 },
    { label: "₹400 - ₹500", value: "400-500", min: 400, max: 500 },
    { label: "Above ₹500", value: "500+", min: 500, max: Infinity }
  ];

  // Filtered tiffins mein price range filter add karo
  const filteredTiffins = tiffins.filter((tiffin) => {
    const matchesSearch =
      !searchQuery ||
      tiffin.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      tiffin.seller.shopName.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesCategory = !selectedCategory || tiffin.category === selectedCategory;
    const matchesCity = !selectedCity || tiffin.seller.city === selectedCity;
    
    const matchesFoodType = !selectedFoodType || 
      (selectedFoodType === "Tiffin" && tiffin.serviceType === "tiffin") ||
      (selectedFoodType === "Meal" && tiffin.serviceType === "meal");

    // Food category filter
    const matchesFoodCategory = !selectedFoodCategory || 
      tiffin.title.toLowerCase().includes(selectedFoodCategory.toLowerCase()) ||
      tiffin.description.toLowerCase().includes(selectedFoodCategory.toLowerCase());

    // Price range filter
    const matchesPrice = !selectedPriceRange || (() => {
      const range = priceRanges.find(r => r.value === selectedPriceRange);
      if (!range) return true;
      
      if (range.value === "500+") {
        return tiffin.price >= range.min;
      }
      return tiffin.price >= range.min && tiffin.price <= range.max;
    })();
    
    return matchesSearch && matchesCategory && matchesCity && matchesFoodType && matchesFoodCategory && matchesPrice;
  });

  const popularTiffins = filteredTiffins.slice(0, 6);

  const handleLogin = (type: "customer" | "seller" | "admin") => {
    setUserType(type);
    setShowLoginPopup(false);
  };

  const handleImageUpload = (url: string, type: 'hero' | 'banner') => {
    if (type === 'hero') {
      setHeroImageUrl(url);
    } else {
      setBannerImageUrl(url);
    }
    setShowImageUpload(false);
  };

  const handleFoodCategoryClick = (categoryName: string) => {
    setSelectedFoodCategory(selectedFoodCategory === categoryName ? null : categoryName);
    setSearchQuery(categoryName);
  };

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen bg-white pb-20 lg:pb-0">
      {/* Scroll Progress Bar */}
      <div className="fixed top-0 left-0 w-full h-1 bg-gray-200 z-50">
        <div 
          className="h-full bg-gradient-to-r from-red-500 to-orange-500 transition-all duration-300"
          style={{ width: `${scrollProgress}%` }}
        />
      </div>

      {/* Cookie Consent */}
      <CookieConsent />

      {/* Navbar - Tifo App Style Header with kitchen background photo */}
<div className="absolute top-0 left-0 right-0 z-40 py-3 overflow-hidden">
  {/* Background photo behind header, fading into the cream section below */}
  <div className="absolute inset-0 -z-10">
    <img
      src="https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=1200&h=600&fit=crop"
      alt=""
      className="w-full h-full object-cover"
    />
    <div className="absolute inset-0 bg-white/55" />
    <div className="absolute bottom-0 left-0 right-0 h-10 bg-gradient-to-b from-transparent to-[#faf3e3]" />
  </div>

  <div className="max-w-7xl mx-auto px-4">
    <div className="flex items-center justify-between mb-3">
      {/* Left side - Deliver to + Location */}
      <div className="flex flex-col relative group">
        <button
          onClick={() => setShowLocationPicker(true)}
          className="flex items-center gap-1 cursor-pointer"
        >
          <span className="text-[15px] font-bold text-gray-900">
            Deliver to: {deliverFor === "other" ? recipientDetails.name || "Someone" : "Home"}
          </span>
          <ChevronDown className="w-4 h-4 text-gray-700" />
        </button>
        <span className="text-sm text-gray-500 leading-tight">
          {deliverFor === "other" ? recipientDetails.city || "Set location" : `${userLocation.city}, Uttar Pradesh`}
        </span>

        {/* Hover preview of full address + edit link */}
        <div className="absolute top-full left-0 mt-1 w-72 bg-white rounded-lg shadow-lg border border-gray-200 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50">
          <div className="p-3">
            <div className="flex items-center gap-2 mb-2">
              <MapPin className="w-4 h-4 text-red-500" />
              <span className="font-semibold text-gray-800">
                {deliverFor === "other" ? "Recipient's Location" : "Your Location"}
              </span>
            </div>
            {deliverFor === "other" ? (
              <>
                <p className="text-sm text-gray-600">{recipientDetails.address || "Not set yet"}</p>
                <p className="text-xs text-gray-500 mt-1">
                  {recipientDetails.name} {recipientDetails.phone && `• ${recipientDetails.phone}`}
                </p>
              </>
            ) : (
              <>
                <p className="text-sm text-gray-600">{userLocation.address}</p>
                <p className="text-xs text-gray-500 mt-1">{userLocation.city}</p>
              </>
            )}
            <button
              onClick={() => setShowLocationPicker(true)}
              className="text-xs font-semibold text-red-500 hover:text-red-600 mt-2"
            >
              Change location
            </button>
          </div>
        </div>
      </div>

      {/* Right side - Cart + Avatar */}
      <div className="flex items-center gap-3">
        <Link href="/my-bookings">
          <button className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center hover:bg-gray-200 transition-colors">
            <ShoppingCart className="w-5 h-5 text-gray-700" />
          </button>
        </Link>
        <button
          onClick={() => setShowLoginPopup(true)}
          className="w-10 h-10 rounded-full overflow-hidden border-2 border-orange-300 flex items-center justify-center bg-gray-100 flex-shrink-0"
        >
          <img
            src="https://static.vecteezy.com/system/resources/previews/026/716/419/large_2x/illustration-image-of-landscape-with-country-road-empty-asphalt-road-on-blue-cloudy-sky-background-multicolor-vibrant-outdoors-horizontal-image-generative-ai-illustration-photo.jpg"
            alt="Profile"
            className="w-full h-full object-cover"
          />
        </button>
      </div>
    </div>

    {/* Search bar with mic + 50% off badge */}
    <div className="relative">
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 z-10" />
        <Input
          placeholder="Find Your Home-cooked Tiffin..."
          className="pl-11 pr-11 py-6 text-base border-0 rounded-full bg-white shadow-md focus-visible:ring-2 focus-visible:ring-red-400 w-full"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
        <Mic className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
      </div>
      <div className="absolute -right-1 -top-2 sm:right-2 sm:-top-3 bg-red-600 text-white text-[11px] font-bold rounded-full w-14 h-14 flex flex-col items-center justify-center leading-tight shadow-lg border-2 border-white text-center">
        <span>50%</span>
        <span>OFF</span>
      </div>
    </div>
  </div>
</div>

      {/* Add padding to account for fixed navbar */}
      <div className="pt-32"></div>

     {/* Image Upload Modal */}
{showImageUpload && (
  <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
    <div className="relative">
      <ImageUpload onImageUpload={(url) => handleImageUpload(url, 'banner')} />
      <Button
        variant="ghost"
        size="icon"
        className="absolute -top-2 -right-2 bg-white rounded-full shadow-lg"
        onClick={() => setShowImageUpload(false)}
      >
        <X className="w-4 h-4" />
      </Button>
    </div>
  </div>
)}

{/* Category Cards Row - matches Our Kitchen / Veg Thali / Add-ons / Healthy Meals */}
<section className="relative bg-[#faf3e3] pt-4 pb-5">
  <div className="max-w-7xl mx-auto px-4">
    <div className="flex overflow-x-auto hide-scrollbar gap-3 pb-1">
      {[
        {
          title: "Our Kitchen",
          subtitle: "Daily Specials",
          img: "https://images.unsplash.com/photo-1631452180519-c014fe946bc7?w=200&h=200&fit=crop",
        },
        {
          title: "Veg Thali Tiffin",
          subtitle: "Complete Veg Meals",
          img: "https://images.unsplash.com/photo-1601050690597-df0568f70950?w=200&h=200&fit=crop",
        },
        {
          title: "Add-ons",
          subtitle: "Lighter Meals",
          img: "https://images.unsplash.com/photo-1585937421612-70a008356fbe?w=200&h=200&fit=crop",
        },
        {
          title: "Healthy Meals",
          subtitle: "High Protein, Low-Calorie",
          img: "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=200&h=200&fit=crop",
        },
      ].map((cat) => (
        <button
          key={cat.title}
          onClick={() => handleFoodCategoryClick(cat.title)}
          className="flex-shrink-0 w-[150px] text-left"
        >
          <div className="w-full h-[110px] rounded-2xl overflow-hidden shadow-sm">
            <img src={cat.img} alt={cat.title} className="w-full h-full object-cover" />
          </div>
          <p className="mt-2 text-[15px] font-bold text-gray-900 leading-tight">{cat.title}</p>
          <p className="text-xs text-gray-500">{cat.subtitle}</p>
        </button>
      ))}
    </div>
  </div>
</section>

{/* Tiffin Meal Options + Weekly Subscriptions */}
<section className="bg-white pt-5 pb-2">
  <div className="max-w-7xl mx-auto px-4">
    <div className="grid grid-cols-2 gap-3">
      <div>
        <h2 className="text-lg font-extrabold text-gray-900 mb-3">Tiffin Meal Options</h2>
        <Card className="rounded-2xl overflow-hidden border-0 shadow-md cursor-pointer" onClick={() => setSelectedFoodType("Tiffin")}>
          <div className="relative">
            <img
              src="https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400&h=300&fit=crop"
              alt="Veg Special Tiffin"
              className="w-full h-32 object-cover"
            />
            <Bookmark className="absolute top-2 right-2 w-6 h-6 text-white drop-shadow" />
            <span className="absolute bottom-2 left-2 bg-green-800 text-white text-[11px] font-semibold px-2 py-1 rounded-md">
              Maa Ka Dabba
            </span>
          </div>
          <div className="p-3">
            <p className="font-bold text-gray-900 text-[15px]">Veg Special Tiffin</p>
            <div className="flex items-center gap-1 text-xs text-gray-600 mt-1">
              <Star className="w-3.5 h-3.5 text-green-600 fill-green-600" />
              <span className="font-semibold">4.8</span>
              <span>| 25-30 mins</span>
            </div>
            <p className="text-xs text-green-700 mt-1">✓ 15% OFF (Subscriptions) | Home Delivery</p>
            <p className="text-[11px] text-gray-500 mt-0.5">* No Preservatives</p>
          </div>
        </Card>
      </div>

      <div>
        <h2 className="text-lg font-extrabold text-gray-900 mb-3">Weekly Subscriptions</h2>
        <Card className="rounded-2xl overflow-hidden border-0 shadow-md cursor-pointer" onClick={() => setActiveTab("popular")}>
          <img
            src="https://images.unsplash.com/photo-1626132647523-66f5bf380027?w=400&h=300&fit=crop"
            alt="Mahalaxmi Sweets"
            className="w-full h-32 object-cover"
          />
          <div className="p-3">
            <p className="font-bold text-gray-900 text-[15px]">Mahalaxmi Sweets</p>
            <p className="text-xs text-gray-500 mt-1">Add-on Sweet</p>
          </div>
        </Card>
      </div>
    </div>
  </div>
</section>

{/* Recommended For You */}
<section className="bg-white pt-4 pb-4">
  <div className="max-w-7xl mx-auto px-4">
    <h2 className="text-lg font-extrabold text-gray-900 tracking-wide mb-3">RECOMMENDED FOR YOU</h2>
    <div className="flex overflow-x-auto hide-scrollbar gap-3 pb-1">
      {[
        {
          title: "Standard Veg Tiffin",
          badge: "Rs.175 OFF",
          img: "https://images.unsplash.com/photo-1631452180519-c014fe946bc7?w=300&h=300&fit=crop",
        },
        {
          title: "Classic Dal Makhani",
          badge: "Rs.100 OFF Add-ons",
          img: "https://images.unsplash.com/photo-1585937421612-70a008356fbe?w=300&h=300&fit=crop",
        },
        {
          title: "Paneer Butter Masala Tiffin",
          badge: "Rs.100 OFF Add-ons",
          img: "https://images.unsplash.com/photo-1585937421612-70a008356fbe?w=300&h=300&fit=crop",
        },
      ].map((item) => (
        <button
          key={item.title}
          onClick={() => setSearchQuery(item.title)}
          className="flex-shrink-0 w-[150px] text-left"
        >
          <div className="relative w-full h-[130px] rounded-2xl overflow-hidden shadow-sm">
            <img src={item.img} alt={item.title} className="w-full h-full object-cover" />
            <span className="absolute bottom-0 left-0 right-0 bg-black/70 text-white text-[10px] font-semibold text-center py-1">
              {item.badge}
            </span>
          </div>
          <p className="mt-2 text-sm font-bold text-gray-900 leading-tight">{item.title}</p>
        </button>
      ))}
    </div>
  </div>
</section>

     {/* Tiffins and Meals Section - Directly after hero */}
<section className="py-6 bg-white -mt-4">  {/* py-12 se py-6 aur -mt-4 add */}
  <div className="max-w-7xl mx-auto px-4">
    <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between mb-6 gap-3">  {/* mb-8 se mb-6, gap-4 se gap-3 */}
      <div>
        <h2 className="text-2xl font-bold text-gray-800 mb-1">  {/* text-3xl se text-2xl, mb-2 se mb-1 */}
          {selectedFoodCategory 
            ? `Best ${selectedFoodCategory} Items`
            : selectedFoodType === "Tiffin" 
            ? "Best Tiffin Boxes" 
            : selectedFoodType === "Meal" 
            ? "Best Full Meals"
            : "Best Food Near You"
          }
        </h2>
        <p className="text-gray-600 text-sm">  {/* text-sm add */}
          Fresh homemade food from local kitchens
        </p>
      </div>
      
      <div className="flex flex-wrap items-center gap-1">  {/* gap-2 se gap-1 */}
        <div className="flex gap-1">  {/* gap-2 se gap-1 */}
          {foodTypes.map((type) => (
            <Button
              key={type}
              onClick={() => setSelectedFoodType(selectedFoodType === type ? null : type)}
              variant={selectedFoodType === type ? "default" : "outline"}
              size="sm"
              className={`rounded-full text-xs ${
                selectedFoodType === type
                  ? 'bg-red-500 hover:bg-red-600 text-white'
                  : 'border-gray-300 text-gray-700'
              }`}
            >
              {type}
            </Button>
          ))}
        </div>

              <div className="flex gap-2">
                {categories.map((category) => (
                  <Button
                    key={category}
                    onClick={() => setSelectedCategory(selectedCategory === category ? null : category)}
                    variant={selectedCategory === category ? "default" : "outline"}
                    size="sm"
                    className={`rounded-full ${
                      selectedCategory === category
                        ? 'bg-red-500 hover:bg-red-600 text-white'
                        : 'border-gray-300 text-gray-700'
                    }`}
                  >
                    {category}
                  </Button>
                ))}
              </div>

              {/* More Filters Button with Dropdown */}
              <div className="relative">
                <Button 
                  variant="outline" 
                  className="border-gray-300 text-gray-700 rounded-full whitespace-nowrap" 
                  size="sm"
                  onClick={() => setShowMoreFilters(!showMoreFilters)}
                >
                  <Filter className="w-4 h-4 mr-2" />
                  More Filters
                  {selectedPriceRange && (
                    <span className="ml-1 w-2 h-2 bg-red-500 rounded-full"></span>
                  )}
                </Button>

                {/* Filters Dropdown */}
                {showMoreFilters && (
                  <div className="absolute top-full right-0 mt-2 w-64 bg-white rounded-xl shadow-2xl border border-gray-200 z-50 p-4">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="font-semibold text-gray-800">Filters</h3>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setShowMoreFilters(false)}
                        className="w-6 h-6 p-0"
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>

                    {/* Price Range Filter */}
                    <div className="mb-4">
                      <h4 className="font-medium text-gray-700 mb-3">Price Range</h4>
                      <div className="space-y-2">
                        {priceRanges.map((range) => (
                          <div
                            key={range.value}
                            className={`flex items-center gap-3 p-2 rounded-lg cursor-pointer transition-all ${
                              selectedPriceRange === range.value
                                ? 'bg-red-50 border border-red-200'
                                : 'bg-gray-50 hover:bg-gray-100'
                            }`}
                            onClick={() => {
                              setSelectedPriceRange(selectedPriceRange === range.value ? null : range.value);
                            }}
                          >
                            <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                              selectedPriceRange === range.value
                                ? 'border-red-500 bg-red-500'
                                : 'border-gray-400'
                            }`}>
                              {selectedPriceRange === range.value && (
                                <div className="w-2 h-2 bg-white rounded-full"></div>
                              )}
                            </div>
                            <span className={`text-sm ${
                              selectedPriceRange === range.value ? 'text-red-600 font-semibold' : 'text-gray-700'
                            }`}>
                              {range.label}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Clear All Button */}
                    {(selectedPriceRange) && (
                      <Button
                        variant="outline"
                        className="w-full border-red-200 text-red-600 hover:bg-red-50"
                        size="sm"
                        onClick={() => {
                          setSelectedPriceRange(null);
                        }}
                      >
                        Clear All Filters
                      </Button>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          <Tabs defaultValue="all" value={activeTab} onValueChange={setActiveTab} className="mb-6">
            <TabsList className="bg-gray-100 p-1 rounded-xl inline-flex overflow-x-auto w-full">
              {[
                { value: "all", label: "All Items" },
                { value: "popular", label: "Popular 🔥" },
                { value: "top-rated", label: "Top Rated ⭐" },
              ].map((tab) => (
                <TabsTrigger 
                  key={tab.value}
                  value={tab.value}
                  className="rounded-lg data-[state=active]:bg-white data-[state=active]:text-red-500 data-[state=active]:shadow-sm font-semibold px-4 py-2 transition-all hover:scale-105 whitespace-nowrap"
                >
                  {tab.label}
                </TabsTrigger>
              ))}
            </TabsList>

            {/* All Items Tab */}
            <TabsContent value="all" className="mt-6">
              {isLoading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
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
                  <Button 
                    onClick={() => {
                      setSearchQuery("");
                      setSelectedCategory(null);
                      setSelectedCity(null);
                      setSelectedFoodType(null);
                      setSelectedFoodCategory(null);
                    }}
                    className="bg-red-500 hover:bg-red-600 text-white rounded-full hover:scale-105 transition-transform"
                  >
                    Clear Filters
                  </Button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {filteredTiffins.map((tiffin, index) => (
                      <Card className="overflow-hidden border-0 shadow-lg hover:shadow-2xl transition-all duration-500 cursor-pointer group rounded-2xl transform hover:-translate-y-2 hover:scale-105">
                        <div className="relative h-48 overflow-hidden">
                          <img
                            src={categoryImages[tiffin.category]}
                            alt={tiffin.title}
                            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                          />
                          
                          <div className="absolute top-3 left-3 bg-blue-500 text-white px-3 py-1 rounded-full text-sm font-semibold shadow-lg">
                            {tiffin.serviceType === "tiffin" ? "🍱 Tiffin" : "🍛 Meal"}
                          </div>

                          {index % 3 === 0 && (
                            <div className="absolute top-3 right-3 bg-yellow-500 text-white px-3 py-1 rounded-full text-sm font-semibold shadow-lg">
                              ⭐ Premium
                            </div>
                          )}

                          <div className="absolute bottom-3 left-3">
                            <Badge className={`${
                              tiffin.category === "Veg" 
                                ? "bg-green-500 text-white" 
                                : tiffin.category === "Non-Veg"
                                ? "bg-red-500 text-white"
                                : "bg-purple-500 text-white"
                            } border-0 font-semibold shadow-lg`}>
                              {tiffin.category}
                            </Badge>
                          </div>

                          <Button
                            variant="ghost"
                            size="icon"
                            className="absolute top-3 right-3 w-10 h-10 bg-white/90 backdrop-blur-sm rounded-full shadow-lg hover:bg-white hover:scale-110 transition-all duration-300"
                          >
                            <Heart className="w-5 h-5 text-gray-600" />
                          </Button>
                        </div>

                        <div className="p-6">
                          <div className="flex items-start justify-between mb-3">
                            <h3 className="text-xl font-bold text-gray-800 line-clamp-1 group-hover:text-red-500 transition-colors">
                              {tiffin.title}
                            </h3>
                            <div className="flex items-center gap-1 bg-green-100 text-green-700 px-2 py-1 rounded-full text-sm font-semibold">
                              <Star className="w-3 h-3 fill-green-500 text-green-500" />
                              <span>{(4.4 + ((tiffin._id.charCodeAt(0) + tiffin._id.charCodeAt(tiffin._id.length - 1)) % 6 * 0.1)).toFixed(1)}</span>
                            </div>
                          </div>

                          <p className="text-gray-600 text-sm mb-4 line-clamp-2 leading-relaxed">
                            {tiffin.description}
                          </p>

                          <div className="flex items-center gap-3 mb-4">
                            <div className="w-8 h-8 bg-gradient-to-br from-red-500 to-red-600 rounded-full flex items-center justify-center shadow-lg">
                              <span className="text-white text-xs font-bold">T</span>
                            </div>
                            <div>
                              <div className="font-semibold text-gray-800 text-sm">
                                {tiffin.seller.shopName}
                              </div>
                              <div className="flex items-center gap-2 text-xs text-gray-500">
                                <MapPin className="w-3 h-3" />
                                {tiffin.seller.city} • 2.5 km
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                            <div className="flex items-center gap-2">
                              <div className="flex items-center gap-1 text-lg font-bold text-gray-800">
                                <IndianRupee className="w-4 h-4" />
                                <span>{tiffin.price}</span>
                              </div>
                              <div className="flex flex-col">
                                <span className="text-sm text-gray-500 line-through">
                                  <IndianRupee className="w-3 h-3 inline" />
                                  {Math.round(tiffin.price * 1.2)}
                                </span>
                                <span className="text-xs text-green-600 font-semibold">
                                  You save ₹{Math.round(tiffin.price * 0.2)}
                                </span>
                              </div>
                            </div>
                            
                            <div className="flex items-center gap-2">
                              <div className="flex items-center gap-1 text-xs text-green-600 bg-green-50 px-2 py-1 rounded-full">
                                <Truck className="w-3 h-3" />
                                FREE
                              </div>
                              <Link href={`/tiffin/${tiffin._id}`}>
                                <Button className="bg-red-500 hover:bg-red-600 text-white px-4 rounded-full font-semibold shadow-lg shadow-red-200 hover:scale-105 transition-transform">
                                  Order Now
                                </Button>
                              </Link>
                            </div>
                          </div>
                        </div>
                      </Card>
                  ))}
                </div>
              )}
            </TabsContent>

            {/* Popular Tab */}
            <TabsContent value="popular" className="mt-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {popularTiffins.map((tiffin, index) => (
                
                    <Card className="overflow-hidden border-0 shadow-lg rounded-2xl group hover:shadow-xl transition-all duration-500 transform hover:-translate-y-2 hover:scale-105">
                      <div className="relative h-48 overflow-hidden">
                        <img
                          src={categoryImages[tiffin.category]}
                          alt={tiffin.title}
                          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                        />
                        <div className="absolute top-3 left-3 bg-blue-500 text-white px-3 py-1 rounded-full text-sm font-semibold shadow-lg">
                          {tiffin.serviceType === "tiffin" ? "🍱 Tiffin" : "🍛 Meal"}
                        </div>
                        <div className="absolute top-3 right-3 bg-red-500 text-white px-3 py-1 rounded-full text-sm font-semibold shadow-lg">
                          Popular 🔥
                        </div>
                      </div>
                      <div className="p-6">
                        <h3 className="text-xl font-bold text-gray-800 mb-2">{tiffin.title}</h3>
                        <p className="text-gray-600 text-sm mb-4 line-clamp-2">{tiffin.description}</p>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div className="flex items-center gap-1 text-lg font-bold text-gray-800">
                              <IndianRupee className="w-4 h-4" />
                              <span>{tiffin.price}</span>
                            </div>
                            <div className="flex items-center gap-1 text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full">
                              <Star className="w-3 h-3 fill-green-500 text-green-500" />
                              4.5
                            </div>
                          </div>
                          <Link href={`/tiffin/${tiffin._id}`}>
                            <Button className="bg-red-500 hover:bg-red-600 text-white rounded-full hover:scale-105 transition-transform">
                              Order Now
                            </Button>
                          </Link>
                        </div>
                      </div>
                    </Card>
                ))}
              </div>
            </TabsContent>

            {/* Top Rated Tab */}
            <TabsContent value="top-rated" className="mt-6">
              {isLoading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
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
                    <p className="text-gray-600 mb-4">
                      {topRatedSellers.length > 0 
                        ? "Top rated sellers found, but no matching tiffins with current filters"
                        : "No top rated sellers available yet"
                      }
                    </p>
                    
                    <Button 
                      onClick={() => {
                        setSearchQuery("");
                        setSelectedCategory(null);
                        setSelectedCity(null);
                        setSelectedFoodType(null);
                        setSelectedFoodCategory(null);
                      }}
                      className="bg-red-500 hover:bg-red-600 text-white rounded-full hover:scale-105 transition-transform"
                    >
                      Clear Filters
                    </Button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {topRatedTiffins.map((tiffin, index) => (
                  
                        <Card className="overflow-hidden border-0 shadow-lg hover:shadow-2xl transition-all duration-500 cursor-pointer group rounded-2xl transform hover:-translate-y-2 hover:scale-105 border-2 border-yellow-200">
                          <div className="relative h-48 overflow-hidden">
                            <img
                              src={categoryImages[tiffin.category]}
                              alt={tiffin.title}
                              className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                            />
                            
                            {/* Top Rated Badge */}
                            <div className="absolute top-3 right-3 bg-yellow-500 text-white px-3 py-1 rounded-full text-sm font-semibold shadow-lg flex items-center gap-1">
                              <Star className="w-3 h-3 fill-white" />
                              Top Rated
                            </div>

                            <div className="absolute top-3 left-3 bg-blue-500 text-white px-3 py-1 rounded-full text-sm font-semibold shadow-lg">
                              {tiffin.serviceType === "tiffin" ? "🍱 Tiffin" : "🍛 Meal"}
                            </div>

                            <div className="absolute bottom-3 left-3">
                              <Badge className={`${
                                tiffin.category === "Veg" 
                                  ? "bg-green-500 text-white" 
                                  : tiffin.category === "Non-Veg"
                                  ? "bg-red-500 text-white"
                                  : "bg-purple-500 text-white"
                              } border-0 font-semibold shadow-lg`}>
                                {tiffin.category}
                              </Badge>
                            </div>

                            <Button
                              variant="ghost"
                              size="icon"
                              className="absolute top-3 right-12 w-10 h-10 bg-white/90 backdrop-blur-sm rounded-full shadow-lg hover:bg-white hover:scale-110 transition-all duration-300"
                            >
                              <Heart className="w-5 h-5 text-gray-600" />
                            </Button>
                          </div>

                          <div className="p-6">
                            <div className="flex items-start justify-between mb-3">
                              <h3 className="text-xl font-bold text-gray-800 line-clamp-1 group-hover:text-red-500 transition-colors">
                                {tiffin.title}
                              </h3>
                              <div className="flex items-center gap-1 bg-green-100 text-green-700 px-2 py-1 rounded-full text-sm font-semibold">
                                <Star className="w-3 h-3 fill-green-500 text-green-500" />
                                <span>{(4.4 + ((tiffin._id.charCodeAt(0) + tiffin._id.charCodeAt(tiffin._id.length - 1)) % 6 * 0.1)).toFixed(1)}</span>
                              </div>
                            </div>

                            <p className="text-gray-600 text-sm mb-4 line-clamp-2 leading-relaxed">
                              {tiffin.description}
                            </p>

                            <div className="flex items-center gap-3 mb-4">
                              <div className="w-8 h-8 bg-gradient-to-br from-yellow-500 to-orange-500 rounded-full flex items-center justify-center shadow-lg">
                                <span className="text-white text-xs font-bold">
                                  {tiffin.seller.shopName.charAt(0)}
                                </span>
                              </div>
                              <div>
                                <div className="font-semibold text-gray-800 text-sm flex items-center gap-2">
                                  {tiffin.seller.shopName}
                                  <Badge className="bg-yellow-100 text-yellow-700 border-0 text-xs">
                                    Top Seller
                                  </Badge>
                                </div>
                                <div className="flex items-center gap-2 text-xs text-gray-500">
                                  <MapPin className="w-3 h-3" />
                                  {tiffin.seller.city} • 2.5 km
                                </div>
                              </div>
                            </div>

                            <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                              <div className="flex items-center gap-2">
                                <div className="flex items-center gap-1 text-lg font-bold text-gray-800">
                                  <IndianRupee className="w-4 h-4" />
                                  <span>{tiffin.price}</span>
                                </div>
                                <div className="flex flex-col">
                                  <span className="text-sm text-gray-500 line-through">
                                    <IndianRupee className="w-3 h-3 inline" />
                                    {Math.round(tiffin.price * 1.2)}
                                  </span>
                                  <span className="text-xs text-green-600 font-semibold">
                                    You save ₹{Math.round(tiffin.price * 0.2)}
                                  </span>
                                </div>
                              </div>
                              
                              <div className="flex items-center gap-2">
                                <div className="flex items-center gap-1 text-xs text-green-600 bg-green-50 px-2 py-1 rounded-full">
                                  <Truck className="w-3 h-3" />
                                  FREE
                                </div>
                                <Link href={`/tiffin/${tiffin._id}`}>
                                  <Button className="bg-red-500 hover:bg-red-600 text-white px-4 rounded-full font-semibold shadow-lg shadow-red-200 hover:scale-105 transition-transform">
                                    Order Now
                                  </Button>
                                </Link>
                              </div>
                            </div>
                          </div>
                        </Card>
    
                    ))}
                  </div>
                );
              })()}
            </TabsContent>
          </Tabs>
        </div>
      </section>

      <LocationPickerModal
        isOpen={showLocationPicker}
        onClose={() => setShowLocationPicker(false)}
        onConfirm={handleLocationConfirm}
        initialCoords={
          deliverFor === "other" && recipientDetails.lat && recipientDetails.lng
            ? { lat: recipientDetails.lat, lng: recipientDetails.lng }
            : userLocation.lat && userLocation.lng
            ? { lat: userLocation.lat, lng: userLocation.lng }
            : undefined
        }
      />

      {showLoginPopup && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full mx-auto shadow-2xl">
            <div className="text-center mb-6">
              <h2 className="text-2xl font-bold text-gray-800 mb-2">Welcome to Tifo</h2>
              <p className="text-gray-600">Choose how you want to continue</p>
            </div>

            <div className="space-y-4">
              <Button 
                onClick={() => handleLogin("customer")}
                className="w-full bg-red-500 hover:bg-red-600 text-white py-4 rounded-xl text-base font-semibold transition-all hover:scale-105"
              >
                <User className="w-5 h-5 mr-3" />
                Continue as Customer
              </Button>

              <Button 
                onClick={() => handleLogin("seller")}
                className="w-full bg-orange-500 hover:bg-orange-600 text-white py-4 rounded-xl text-base font-semibold transition-all hover:scale-105"
              >
                <ChefHat className="w-5 h-5 mr-3" />
                Continue as Seller
              </Button>
            </div>

            <Button 
              onClick={() => setShowLoginPopup(false)}
              variant="ghost" 
              className="w-full mt-4 text-gray-500 hover:text-gray-700"
            >
              Close
            </Button>
          </div>
        </div>
      )}

      {isScrolled && (
        <Button
          onClick={scrollToTop}
          className="fixed bottom-6 right-6 z-40 w-12 h-12 bg-red-500 hover:bg-red-600 text-white rounded-full shadow-2xl transition-all duration-300 hover:scale-110"
          size="icon"
        >
          <Navigation className="w-5 h-5" />
        </Button>
      )}

      {/* Sticky Bottom Navigation Bar - matches reference screenshot */}
<div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-lg z-40 lg:hidden">
  <div className="flex justify-around items-end pt-2 pb-2 relative">

    {/* Delivery */}
    <Link href="/" className="flex flex-col items-center gap-1 w-1/5">
      <PackageCheck className={`w-6 h-6 ${location === '/' ? 'text-orange-500' : 'text-gray-500'}`} />
      <span className={`text-[11px] ${location === '/' ? 'text-orange-500 font-bold' : 'text-gray-600'}`}>
        Delivery
      </span>
    </Link>

    {/* Subscriptions */}
    <Link href="/my-bookings" className="flex flex-col items-center gap-1 w-1/5">
      <CalendarCheck className={`w-6 h-6 ${location === '/my-bookings' ? 'text-orange-500' : 'text-gray-500'}`} />
      <span className={`text-[11px] ${location === '/my-bookings' ? 'text-orange-500 font-bold' : 'text-gray-600'}`}>
        Subscriptions
      </span>
    </Link>

    {/* Dining */}
    <Link href="/help" className="flex flex-col items-center gap-1 w-1/5">
      <UtensilsCrossed className={`w-6 h-6 ${location === '/help' ? 'text-orange-500' : 'text-gray-500'}`} />
      <span className={`text-[11px] ${location === '/help' ? 'text-orange-500 font-bold' : 'text-gray-600'}`}>
        Dining
      </span>
    </Link>

    {/* New Tiffin - Center FAB */}
    <div className="flex flex-col items-center w-1/5 -mt-7">
      <button
        onClick={() => setShowLoginPopup(true)}
        className="w-14 h-14 rounded-full bg-gradient-to-b from-amber-300 to-amber-500 shadow-lg border-4 border-white flex items-center justify-center"
      >
        <div className="relative">
          <ChefHat className="w-6 h-6 text-amber-900" />
          <PlusCircle className="w-3.5 h-3.5 text-amber-900 absolute -bottom-1 -right-1 bg-white rounded-full" />
        </div>
      </button>
      <span className="text-[11px] font-bold text-gray-800 mt-1">New Tiffin</span>
    </div>

    {/* Orders */}
    <Link href="/my-bookings" className="flex flex-col items-center gap-1 w-1/5">
      <BookOpen className={`w-6 h-6 ${location === '/my-bookings' ? 'text-orange-500' : 'text-gray-500'}`} />
      <span className={`text-[11px] ${location === '/my-bookings' ? 'text-orange-500 font-bold' : 'text-gray-600'}`}>
        Orders
      </span>
    </Link>

  </div>
</div>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12">
        <div className="max-w-7xl mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 bg-red-500 rounded-lg flex items-center justify-center">
                  <span className="text-white font-bold text-sm">T</span>
                </div>
                <span className="font-bold text-xl">Tifo</span>
              </div>
              <p className="text-gray-400 text-sm mb-4 leading-relaxed">
                Delivering homemade happiness to your doorstep. Fresh, hygienic, and delicious tiffins from trusted kitchens.
              </p>
              <div className="flex gap-3">
                <Facebook className="w-5 h-5 text-gray-400 hover:text-white cursor-pointer transition-colors hover:scale-110" />
                <Twitter className="w-5 h-5 text-gray-400 hover:text-white cursor-pointer transition-colors hover:scale-110" />
                <a
                  href="https://www.instagram.com/tiffo.official"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Instagram className="w-5 h-5 text-gray-400 hover:text-white cursor-pointer transition-colors hover:scale-110" />
                </a>
              </div>
            </div>

            <div>
              <h3 className="font-semibold mb-3">Quick Links</h3>
              <ul className="space-y-2 text-gray-400 text-sm">
                <li className="hover:text-white cursor-pointer transition-colors hover:translate-x-1 transform"><a href="/about">About Us</a></li>
                <li className="hover:text-white cursor-pointer transition-colors hover:translate-x-1 transform"><a href="/register">Partner With Us</a></li>
                <li className="hover:text-white cursor-pointer transition-colors hover:translate-x-1 transform">
                  <a 
                    href="https://wa.me/918115067311" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="flex items-center gap-1"
                  >
                    Contact Us
                  </a>
                </li>
              </ul>
            </div>

            <div>
              <h3 className="font-semibold mb-3">Legal</h3>
              <ul className="space-y-2 text-gray-400 text-sm">
                <li className="hover:text-white cursor-pointer transition-colors hover:translate-x-1 transform">
                  <Link href="/terms-conditions">Terms & Conditions</Link>
                </li>
                <li className="hover:text-white cursor-pointer transition-colors hover:translate-x-1 transform">
                  <Link href="/privacy-policy">Privacy Policy</Link>
                </li>
                <li className="hover:text-white cursor-pointer transition-colors hover:translate-x-1 transform">
                  <a href="/cookie-policy">Cookie Policy</a>
                </li>
              </ul>
            </div>

            <div>
              <h3 className="font-semibold mb-3">Contact Us</h3>
              <div className="space-y-2 text-gray-400 text-sm">
                <a href="tel:+918115067311" className="flex items-center gap-2 hover:text-white transition-colors">
                  <Phone className="w-4 h-4" />
                  <span>+91 8115067311</span>
                </a>
                <a href="tel:+918115067311" className="flex items-center gap-2 hover:text-white transition-colors">
                  <Phone className="w-4 h-4" />
                  <span>+91 9670421522</span>
                </a>
                <div className="flex items-center gap-2 hover:text-white transition-colors">
                  <Mail className="w-4 h-4" />
                  <span>help@tiffo.com</span>
                </div>
                <div className="flex items-center gap-2 hover:text-white transition-colors">
                  <MapPin className="w-4 h-4" />
                  <span>Lucknow(Uttar Pradesh), India</span>
                </div>
              </div>
            </div>
          </div>

          <div className="border-t border-gray-800 mt-8 pt-6 text-center text-gray-400 text-sm">
            <p>&copy; 2025 Tifo. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}