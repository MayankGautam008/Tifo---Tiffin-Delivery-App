// src/pages/terms-conditions.tsx
import { useState } from "react";
import { Navbar } from "@/components/navbar";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { 
  ArrowLeft, 
  FileText, 
  Scale, 
  ShoppingCart, 
  CreditCard,
  Truck,
  User,
  AlertTriangle,
  ChevronDown,
  ChevronUp
} from "lucide-react";

export default function TermsConditions() {
  const [openSections, setOpenSections] = useState<number[]>([]);

  const toggleSection = (index: number) => {
    setOpenSections(prev =>
      prev.includes(index)
        ? prev.filter(i => i !== index)
        : [...prev, index]
    );
  };

  const sections = [
    {
      title: "Account Registration",
      icon: <User className="w-5 h-5" />,
      content: "You must be at least 18 years old to create an account. You are responsible for maintaining the confidentiality of your account credentials and for all activities that occur under your account."
    },
    {
      title: "Ordering & Payments",
      icon: <CreditCard className="w-5 h-5" />,
      content: "All orders are subject to availability and confirmation. Prices are subject to change without notice. Payment must be made in full at the time of ordering. We accept various payment methods including credit/debit cards and digital wallets."
    },
    {
      title: "Delivery & Cancellation",
      icon: <Truck className="w-5 h-5" />,
      content: "Delivery times are estimates and may vary. We are not responsible for delays beyond our control. Orders can be cancelled up to 1 hour before the scheduled delivery time. Late cancellations may be subject to charges."
    },
    {
      title: "Food Quality & Safety",
      icon: <ShoppingCart className="w-5 h-5" />,
      content: "We work with verified kitchens that maintain high hygiene standards. However, if you have specific allergies or dietary requirements, please inform us in advance. We are not liable for allergic reactions if proper notification is not provided."
    },
    {
      title: "Limitation of Liability",
      icon: <AlertTriangle className="w-5 h-5" />,
      content: "Tiffinwala's liability is limited to the value of the order. We are not liable for any indirect, special, or consequential damages arising from the use of our services."
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <Navbar />
      
      <div className="max-w-4xl mx-auto px-4 py-12">
        {/* Header */}
        <div className="text-center mb-12 animate-fade-in">
          <div className="flex justify-center mb-4">
            <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center shadow-lg">
              <Scale className="w-10 h-10 text-blue-600" />
            </div>
          </div>
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4 bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            Terms & Conditions
          </h1>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Please read these terms carefully before using our services.
          </p>
        </div>

        <div className="bg-white rounded-2xl shadow-xl p-8 transform hover:shadow-2xl transition-all duration-300">
          {/* Back Button */}
          <div className="mb-8">
            <Link href="/">
              <Button variant="ghost" className="pl-0 hover:pl-2 transition-all group">
                <ArrowLeft className="w-4 h-4 mr-2 group-hover:-translate-x-1 transition-transform" />
                Back to Home
              </Button>
            </Link>
          </div>

          {/* Important Notice */}
          <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 mb-8">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-yellow-600 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm text-yellow-800 font-medium">
                  By using Tiffinwala services, you agree to be bound by these Terms & Conditions.
                </p>
              </div>
            </div>
          </div>

          {/* Introduction */}
          <div className="prose prose-lg max-w-none mb-12">
            <p className="text-gray-700 text-lg leading-relaxed">
              Welcome to Tiffinwala! These Terms & Conditions govern your use of our platform and services. 
              By accessing or using our services, you agree to comply with and be bound by these terms.
            </p>
          </div>

          {/* Accordion Sections */}
          <div className="space-y-4">
            {sections.map((section, index) => (
              <div
                key={index}
                className="border border-gray-200 rounded-xl overflow-hidden transition-all duration-300 hover:border-blue-300"
              >
                <button
                  onClick={() => toggleSection(index)}
                  className="w-full px-6 py-4 text-left bg-white hover:bg-gray-50 transition-all duration-300 flex items-center justify-between group"
                >
                  <div className="flex items-center gap-3">
                    <div className="text-blue-500">{section.icon}</div>
                    <h3 className="text-lg font-semibold text-gray-900 group-hover:text-blue-600 transition-colors">
                      {section.title}
                    </h3>
                  </div>
                  {openSections.includes(index) ? (
                    <ChevronUp className="w-5 h-5 text-gray-500 transition-transform" />
                  ) : (
                    <ChevronDown className="w-5 h-5 text-gray-500 transition-transform" />
                  )}
                </button>
                
                {openSections.includes(index) && (
                  <div className="px-6 pb-4 animate-slide-down">
                    <p className="text-gray-700 leading-relaxed">{section.content}</p>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Agreement Section */}
          <div className="mt-12 p-6 bg-gradient-to-r from-blue-50 to-purple-50 rounded-2xl border border-blue-200">
            <div className="flex items-start gap-4">
              <FileText className="w-6 h-6 text-blue-600 mt-1 flex-shrink-0" />
              <div>
                <h3 className="font-semibold text-lg text-gray-900 mb-2">Agreement</h3>
                <p className="text-gray-700">
                  By continuing to use our services, you acknowledge that you have read, understood, 
                  and agree to be bound by these Terms & Conditions. If you do not agree with any part 
                  of these terms, please discontinue use of our services immediately.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes fade-in {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes slide-down {
          from { opacity: 0; max-height: 0; }
          to { opacity: 1; max-height: 200px; }
        }
        .animate-fade-in {
          animation: fade-in 0.6s ease-out;
        }
        .animate-slide-down {
          animation: slide-down 0.3s ease-out;
        }
      `}</style>
    </div>
  );
}