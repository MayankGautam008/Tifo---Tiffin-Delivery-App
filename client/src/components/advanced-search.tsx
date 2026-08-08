import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Search,
  SlidersHorizontal,
  X,
  ChevronDown,
  MapPin,
  Star,
  IndianRupee,
  Leaf,
  Filter,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

interface FilterOptions {
  cities: string[];
  categories: string[];
  mealTypes: string[];
  slots: string[];
  dietaryTags: string[];
  sortOptions: { value: string; label: string }[];
}

interface SearchFilters {
  q: string;
  city: string;
  category: string;
  mealType: string;
  minPrice: string;
  maxPrice: string;
  minRating: string;
  dietary: string[];
  sortBy: string;
}

interface AdvancedSearchProps {
  onSearch: (filters: SearchFilters) => void;
  onClear: () => void;
  isSearching?: boolean;
  resultCount?: number;
}

const DIETARY_ICONS: Record<string, string> = {
  "Low-Calorie": "🥗",
  "High-Protein": "💪",
  "Diabetic-Friendly": "🩺",
  "Gluten-Free": "🌾",
  "Low-Sodium": "🧂",
  Keto: "🥑",
  "No-Onion-Garlic": "🧅",
  Jain: "☘️",
  Vegan: "🌿",
};

export function AdvancedSearch({
  onSearch,
  onClear,
  isSearching,
  resultCount,
}: AdvancedSearchProps) {
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [filters, setFilters] = useState<SearchFilters>({
    q: "",
    city: "",
    category: "",
    mealType: "",
    minPrice: "",
    maxPrice: "",
    minRating: "",
    dietary: [],
    sortBy: "rating",
  });

  const { data: filterOptions } = useQuery<FilterOptions>({
    queryKey: ["/api/search/filter-options"],
    staleTime: 5 * 60 * 1000,
  });

  const activeFilterCount = [
    filters.city,
    filters.category,
    filters.mealType,
    filters.minPrice,
    filters.maxPrice,
    filters.minRating,
    ...filters.dietary,
  ].filter(Boolean).length;

  const handleSearch = () => {
    onSearch(filters);
  };

  const handleClear = () => {
    const cleared: SearchFilters = {
      q: "",
      city: "",
      category: "",
      mealType: "",
      minPrice: "",
      maxPrice: "",
      minRating: "",
      dietary: [],
      sortBy: "rating",
    };
    setFilters(cleared);
    onClear();
  };

  const toggleDietary = (tag: string) => {
    setFilters((f) => ({
      ...f,
      dietary: f.dietary.includes(tag)
        ? f.dietary.filter((t) => t !== tag)
        : [...f.dietary, tag],
    }));
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") handleSearch();
  };

  return (
    <div className="w-full space-y-3">
      {/* Main Search Bar */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            placeholder="Search tiffins, cuisines, dishes..."
            value={filters.q}
            onChange={(e) => setFilters((f) => ({ ...f, q: e.target.value }))}
            onKeyDown={handleKeyDown}
            className="pl-9 pr-4 h-11 rounded-xl border-gray-200 focus:border-red-400 focus:ring-red-200 text-sm"
          />
          {filters.q && (
            <button
              onClick={() => setFilters((f) => ({ ...f, q: "" }))}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        <Button
          onClick={handleSearch}
          disabled={isSearching}
          className="h-11 px-5 bg-red-600 hover:bg-red-700 text-white rounded-xl font-semibold text-sm"
        >
          {isSearching ? (
            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
          ) : (
            "Search"
          )}
        </Button>

        <Button
          variant="outline"
          onClick={() => setFiltersOpen(!filtersOpen)}
          className={`h-11 px-3 rounded-xl border-gray-200 relative ${
            activeFilterCount > 0 ? "border-red-400 bg-red-50" : ""
          }`}
        >
          <SlidersHorizontal className="w-4 h-4" />
          {activeFilterCount > 0 && (
            <span className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-600 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
              {activeFilterCount}
            </span>
          )}
        </Button>
      </div>

      {/* Sort + Quick City Filter */}
      <div className="flex gap-2 items-center flex-wrap">
        <Select
          value={filters.sortBy}
          onValueChange={(v) => setFilters((f) => ({ ...f, sortBy: v }))}
        >
          <SelectTrigger className="h-8 text-xs w-40 rounded-lg border-gray-200">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {(
              filterOptions?.sortOptions ?? [
                { value: "rating", label: "Top Rated" },
                { value: "price_asc", label: "Price: Low to High" },
                { value: "price_desc", label: "Price: High to Low" },
                { value: "newest", label: "Newest First" },
              ]
            ).map((opt) => (
              <SelectItem key={opt.value} value={opt.value} className="text-xs">
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {filterOptions?.cities.slice(0, 4).map((city) => (
          <button
            key={city}
            onClick={() =>
              setFilters((f) => ({ ...f, city: f.city === city ? "" : city }))
            }
            className={`flex items-center gap-1 px-3 py-1 text-xs rounded-full border transition-all ${
              filters.city === city
                ? "bg-red-600 text-white border-red-600"
                : "bg-white text-gray-600 border-gray-200 hover:border-red-300"
            }`}
          >
            <MapPin className="w-3 h-3" />
            {city}
          </button>
        ))}

        {(activeFilterCount > 0 || filters.q) && (
          <button
            onClick={handleClear}
            className="flex items-center gap-1 px-3 py-1 text-xs rounded-full bg-gray-100 text-gray-600 hover:bg-gray-200 border border-gray-200 ml-auto"
          >
            <X className="w-3 h-3" />
            Clear all
          </button>
        )}
      </div>

      {/* Advanced Filters Panel */}
      {filtersOpen && (
        <div className="bg-white border border-gray-200 rounded-2xl p-4 shadow-sm space-y-4">
          <h3 className="text-sm font-semibold text-gray-800 flex items-center gap-2">
            <Filter className="w-4 h-4 text-red-600" />
            Filters
          </h3>

          {/* Row 1: Category + Meal Type */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Category</label>
              <Select
                value={filters.category || "all"}
                onValueChange={(v) =>
                  setFilters((f) => ({ ...f, category: v === "all" ? "" : v }))
                }
              >
                <SelectTrigger className="h-8 text-xs rounded-lg">
                  <SelectValue placeholder="All categories" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all" className="text-xs">
                    All categories
                  </SelectItem>
                  {filterOptions?.categories.map((c) => (
                    <SelectItem key={c} value={c} className="text-xs capitalize">
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-xs text-gray-500 mb-1 block">Meal Type</label>
              <Select
                value={filters.mealType || "all"}
                onValueChange={(v) =>
                  setFilters((f) => ({ ...f, mealType: v === "all" ? "" : v }))
                }
              >
                <SelectTrigger className="h-8 text-xs rounded-lg">
                  <SelectValue placeholder="Any meal" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all" className="text-xs">
                    Any meal type
                  </SelectItem>
                  {filterOptions?.mealTypes.map((m) => (
                    <SelectItem key={m} value={m} className="text-xs capitalize">
                      {m}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Row 2: Price Range + Rating */}
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="text-xs text-gray-500 mb-1 block flex items-center gap-1">
                <IndianRupee className="w-3 h-3" /> Min Price
              </label>
              <Input
                type="number"
                placeholder="₹0"
                value={filters.minPrice}
                onChange={(e) =>
                  setFilters((f) => ({ ...f, minPrice: e.target.value }))
                }
                className="h-8 text-xs rounded-lg"
              />
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block flex items-center gap-1">
                <IndianRupee className="w-3 h-3" /> Max Price
              </label>
              <Input
                type="number"
                placeholder="₹500"
                value={filters.maxPrice}
                onChange={(e) =>
                  setFilters((f) => ({ ...f, maxPrice: e.target.value }))
                }
                className="h-8 text-xs rounded-lg"
              />
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block flex items-center gap-1">
                <Star className="w-3 h-3" /> Min Rating
              </label>
              <Select
                value={filters.minRating || "any"}
                onValueChange={(v) =>
                  setFilters((f) => ({ ...f, minRating: v === "any" ? "" : v }))
                }
              >
                <SelectTrigger className="h-8 text-xs rounded-lg">
                  <SelectValue placeholder="Any" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="any" className="text-xs">Any rating</SelectItem>
                  {["4.5", "4", "3.5", "3"].map((r) => (
                    <SelectItem key={r} value={r} className="text-xs">
                      ⭐ {r}+
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Dietary Tags */}
          <div>
            <label className="text-xs text-gray-500 mb-2 block flex items-center gap-1">
              <Leaf className="w-3 h-3" /> Dietary Preferences
            </label>
            <div className="flex flex-wrap gap-2">
              {(filterOptions?.dietaryTags ?? Object.keys(DIETARY_ICONS)).map((tag) => (
                <button
                  key={tag}
                  onClick={() => toggleDietary(tag)}
                  className={`flex items-center gap-1 px-2.5 py-1 text-xs rounded-full border transition-all ${
                    filters.dietary.includes(tag)
                      ? "bg-green-600 text-white border-green-600"
                      : "bg-white text-gray-600 border-gray-200 hover:border-green-400"
                  }`}
                >
                  <span>{DIETARY_ICONS[tag] ?? "🌿"}</span>
                  {tag}
                </button>
              ))}
            </div>
          </div>

          {/* Apply button */}
          <div className="flex gap-2 pt-1">
            <Button
              onClick={handleSearch}
              className="flex-1 bg-red-600 hover:bg-red-700 text-white h-9 text-sm rounded-xl"
            >
              Apply Filters
              {activeFilterCount > 0 && (
                <Badge className="ml-2 bg-white text-red-600 text-xs px-1.5 py-0">
                  {activeFilterCount}
                </Badge>
              )}
            </Button>
            <Button
              variant="outline"
              onClick={handleClear}
              className="h-9 px-4 text-sm rounded-xl"
            >
              Reset
            </Button>
          </div>
        </div>
      )}

      {/* Results count */}
      {resultCount !== undefined && (
        <p className="text-xs text-gray-500">
          {resultCount === 0
            ? "No tiffins found. Try different filters."
            : `Showing ${resultCount} tiffin${resultCount !== 1 ? "s" : ""}`}
        </p>
      )}
    </div>
  );
}
