// src/pages/privacy-policy.tsx
import { useState } from "react";
import { Navbar } from "@/components/navbar";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { 
  ArrowLeft, 
  Shield, 
  Lock, 
  Eye, 
  User, 
  FileText, 
  Mail,
  ChevronDown,
  ChevronUp
} from "lucide-react";

export default function PrivacyPolicy() {
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
      title: "Information We Collect",
      icon: <User className="w-5 h-5" />,
      content: "We collect information you provide directly to us, such as when you create an account, place an order, or contact us. This may include your name, email address, phone number, delivery address, and payment information."
    },
    {
      title: "How We Use Your Information",
      icon: <Eye className="w-5 h-5" />,
      content: "We use your information to provide and improve our services, process your orders, communicate with you about your account, send you marketing communications (with your consent), and ensure the security of our platform."
    },
    {
      title: "Information Sharing",
      icon: <Shield className="w-5 h-5" />,
      content: "We do not sell your personal information. We may share your information with trusted third-party service providers who assist us in operating our platform, such as payment processors and delivery partners, but only to the extent necessary to provide our services."
    },
    {
      title: "Data Security",
      icon: <Lock className="w-5 h-5" />,
      content: "We implement appropriate security measures to protect your personal information against unauthorized access, alteration, disclosure, or destruction. However, no method of transmission over the Internet is 100% secure."
    },
    {
      title: "Your Rights",
      icon: <FileText className="w-5 h-5" />,
      content: "You have the right to access, correct, or delete your personal information. You can also object to or restrict certain processing of your data. To exercise these rights, please contact us at privacy@tiffinwala.com."
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <Navbar />
      
      <div className="max-w-4xl mx-auto px-4 py-12">
        {/* Header */}
        <div className="text-center mb-12 animate-fade-in">
          <div className="flex justify-center mb-4">
            <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center shadow-lg">
              <Shield className="w-10 h-10 text-red-600" />
            </div>
          </div>
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4 bg-gradient-to-r from-red-600 to-orange-600 bg-clip-text text-transparent">
            Privacy Policy
          </h1>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Your privacy is important to us. Learn how we protect and manage your personal information.
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

          {/* Last Updated */}
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-8 animate-pulse">
            <p className="text-sm text-blue-800 text-center">
              <strong>Last Updated:</strong> December 2024
            </p>
          </div>

          {/* Introduction */}
          <div className="prose prose-lg max-w-none mb-12">
            <p className="text-gray-700 text-lg leading-relaxed">
              At Tiffinwala, we are committed to protecting your privacy and ensuring the security of your personal information. 
              This Privacy Policy explains how we collect, use, and safeguard your information when you use our services.
            </p>
          </div>

          {/* Accordion Sections */}
          <div className="space-y-4">
            {sections.map((section, index) => (
              <div
                key={index}
                className="border border-gray-200 rounded-xl overflow-hidden transition-all duration-300 hover:border-red-300"
              >
                <button
                  onClick={() => toggleSection(index)}
                  className="w-full px-6 py-4 text-left bg-white hover:bg-gray-50 transition-all duration-300 flex items-center justify-between group"
                >
                  <div className="flex items-center gap-3">
                    <div className="text-red-500">{section.icon}</div>
                    <h3 className="text-lg font-semibold text-gray-900 group-hover:text-red-600 transition-colors">
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

          {/* Contact Section */}
          <div className="mt-12 p-6 bg-gradient-to-r from-red-50 to-orange-50 rounded-2xl border border-red-200">
            <div className="flex items-start gap-4">
              <Mail className="w-6 h-6 text-red-600 mt-1 flex-shrink-0" />
              <div>
                <h3 className="font-semibold text-lg text-gray-900 mb-2">Contact Us</h3>
                <p className="text-gray-700 mb-4">
                  If you have any questions about this Privacy Policy or how we handle your information, 
                  please don't hesitate to contact our privacy team.
                </p>
                <div className="space-y-2">
                  <p className="text-red-600 font-medium">📧 privacy@tiffinwala.com</p>
                  <p className="text-gray-600 text-sm">
                    We typically respond within 24 hours.
                  </p>
                </div>
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