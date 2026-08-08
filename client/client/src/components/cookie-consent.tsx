// components/advanced-cookie-consent.tsx
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { X, Settings } from "lucide-react";

export default function AdvancedCookieConsent() {
  const [showConsent, setShowConsent] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [preferences, setPreferences] = useState({
    necessary: true,
    analytics: false,
    marketing: false,
    functional: false
  });

  useEffect(() => {
    const consent = localStorage.getItem("cookieConsent");
    if (!consent) {
      const timer = setTimeout(() => {
        setShowConsent(true);
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, []);

  const savePreferences = () => {
    localStorage.setItem("cookieConsent", JSON.stringify(preferences));
    setShowConsent(false);
    
    // Load scripts based on preferences
    if (preferences.analytics) {
      // Load Google Analytics, etc.
    }
  };

  const acceptAll = () => {
    const allAccepted = {
      necessary: true,
      analytics: true,
      marketing: true,
      functional: true
    };
    localStorage.setItem("cookieConsent", JSON.stringify(allAccepted));
    setShowConsent(false);
    // Load all scripts
  };

  if (!showConsent) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:max-w-md z-50 animate-in slide-in-from-bottom duration-500">
      <div className="bg-white border border-gray-200 rounded-2xl shadow-2xl p-6 relative">
        <button
          onClick={() => setShowConsent(false)}
          className="absolute top-3 right-3 text-gray-400 hover:text-gray-600"
        >
          <X className="w-5 h-5" />
        </button>

        {!showSettings ? (
          // Simple View
          <div className="pr-6">
            <h3 className="font-bold text-lg text-gray-900 mb-2 flex items-center gap-2">
              🍪 Cookie Preferences
            </h3>
            <p className="text-sm text-gray-600 mb-4">
              We use cookies to make Tiffinwala work properly and securely. Choose your preferences below.
            </p>

            <div className="flex flex-col sm:flex-row gap-3">
              <Button
                onClick={acceptAll}
                className="bg-red-500 hover:bg-red-600 text-white flex-1"
                size="sm"
              >
                Accept All
              </Button>
              <Button
                onClick={() => setShowSettings(true)}
                variant="outline"
                className="flex-1"
                size="sm"
              >
                <Settings className="w-4 h-4 mr-2" />
                Customize
              </Button>
            </div>
          </div>
        ) : (
          // Advanced Settings View
          <div className="pr-6">
            <h3 className="font-bold text-lg text-gray-900 mb-4">Cookie Settings</h3>
            
            <div className="space-y-4 mb-6">
              {/* Necessary - Always enabled */}
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-sm">Necessary Cookies</p>
                  <p className="text-xs text-gray-500">Required for the website to function</p>
                </div>
                <Switch checked={true} disabled />
              </div>

              {/* Analytics */}
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-sm">Analytics Cookies</p>
                  <p className="text-xs text-gray-500">Help us improve our services</p>
                </div>
                <Switch 
                  checked={preferences.analytics}
                  onCheckedChange={(checked) => 
                    setPreferences(prev => ({...prev, analytics: checked}))
                  }
                />
              </div>

              {/* Marketing */}
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-sm">Marketing Cookies</p>
                  <p className="text-xs text-gray-500">For personalized ads</p>
                </div>
                <Switch 
                  checked={preferences.marketing}
                  onCheckedChange={(checked) => 
                    setPreferences(prev => ({...prev, marketing: checked}))
                  }
                />
              </div>
            </div>

            <div className="flex gap-3">
              <Button
                onClick={savePreferences}
                className="bg-red-500 hover:bg-red-600 text-white flex-1"
                size="sm"
              >
                Save Preferences
              </Button>
              <Button
                onClick={acceptAll}
                variant="outline"
                className="flex-1"
                size="sm"
              >
                Accept All
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}








