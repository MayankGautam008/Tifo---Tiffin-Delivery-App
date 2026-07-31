import { useState, useEffect, useRef } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  Phone,
  Mail,
  MapPin,
  Linkedin,
  Instagram,
  Clock,
  Award,
  Users,
  Shield,
  Star,
  Gift,
  Calendar,
  Settings,
  ArrowLeft
} from "lucide-react";
import { Link } from "wouter";

// Scroll Animation Component
const ScrollAnimation = ({ children, delay = 0, className = "" }: { children: React.ReactNode; delay?: number; className?: string }) => {
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
      className={`transition-all duration-500 transform ${
        isVisible
          ? "translate-y-0 opacity-100"
          : "translate-y-6 opacity-0"
      } ${className}`}
    >
      {children}
    </div>
  );
};

export default function About() {
  // Founders Data
  const founders = [
    {
      name: "Shashank Pandey",
      role: "Founder & CEO",
      description: "Manages all operations of Tiffo and handles overall growth strategies & business development at TIFOINDIA.",
      image: "https://image2url.com/images/1763915469075-3a182610-3895-46a8-85fc-737e975f2256.png",
      socials: [
        { icon: Linkedin, url: "https://linkedin.com/in/abhayrajput" },
        { icon: Instagram, url: "https://www.instagram.com/shashank__0001__?igsh=MXN5eGs2cjludWV5cA==" }
      ]
    },
    {
      name: "Mayank Gautam",
      role: "Co-Founder and CTO",
      description: "Building scalable food technology solutions and leading product innovation at TIFOINDIA.", 
      image: "https://image2url.com/images/1763915342857-b3b96900-f74c-4ab2-98eb-b735ac71cfb1.jpeg",
      socials: [
        { icon: Linkedin, url: "https://www.linkedin.com/in/mayank-gautam-9140933aa?utm_source=share&utm_campaign=share_via&utm_content=profile&utm_medium=android_app" }
        
      ]
    }
  ];

  // Features
  const features = [
    {
      icon: Clock,
      title: "Fast Delivery",
      description: "30-minutes guaranteed delivery"
    },
    {
      icon: Calendar,
      title: "Flexible Subscriptions", 
      description: "Monthly & weekly plans"
    },
    {
      icon: Settings,
      title: "Customization",
      description: "Personalized meal plans"
    },
    {
      icon: Gift,
      title: "Exciting Rewards",
      description: "Loyalty points & offers"
    }
  ];

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
<div className="bg-white border-b border-gray-200 absolute left-0 right-0 top-0 z-[100]">
  <div className="max-w-md mx-auto px-4 py-3">
    <div className="flex items-center gap-3">
      <Link href="/">
        <Button 
          variant="ghost" 
          size="icon" 
          className="text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-lg"
        >
          <ArrowLeft className="w-5 h-5" />
        </Button>
      </Link>
      <div className="w-8 h-8 bg-red-600 rounded-lg flex items-center justify-center">
        <span className="text-white font-bold">T</span>
      </div>
      <div>
        <h1 className="text-lg font-bold text-gray-900">About Tiffo</h1>
      </div>
    </div>
  </div>
</div>

      {/* Hero Banner */}
      <div className="bg-gradient-to-br from-red-600 to-red-500 py-8 text-white">
        <div className="max-w-md mx-auto px-4 text-center">
          <br></br><br></br><div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-white/20">
            <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <Award className="w-6 h-6 text-white" />
            </div>
            <h1 className="text-2xl font-bold mb-2 leading-tight">
              India's 1st Tiffin Delivery App
            </h1>
            <p className="text-white/90 text-sm font-medium">
              From verified tiffin sellers with premium quality
            </p>
            <div className="w-16 h-1 bg-white/30 rounded-full mx-auto mt-3"></div>
          </div>
        </div>
      </div>

      {/* Features Grid */}
      <div className="py-6 bg-white border-b border-gray-100">
        <div className="max-w-md mx-auto px-4">
          <div className="grid grid-cols-2 gap-4">
            {features.map((feature, index) => (
              <div key={feature.title} className="text-center bg-red-50 rounded-xl p-4 border border-red-100">
                <feature.icon className="w-8 h-8 text-red-600 mx-auto mb-3" />
                <h3 className="font-bold text-gray-900 text-sm mb-1">{feature.title}</h3>
                <p className="text-gray-600 text-xs">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="py-6 bg-gray-50">
        <div className="max-w-md mx-auto px-4">
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <div className="text-red-600 font-bold text-lg">50K+</div>
              <div className="text-gray-600 text-xs">Happy Users</div>
            </div>
            <div>
              <div className="text-red-600 font-bold text-lg">4.8★</div>
              <div className="text-gray-600 text-xs">Rating</div>
            </div>
            <div>
              <div className="text-red-600 font-bold text-lg">500+</div>
              <div className="text-gray-600 text-xs">Verified Sellers</div>
            </div>
          </div>
        </div>
      </div>

      {/* Founders Section */}
      <div className="py-8 bg-white">
        <div className="max-w-md mx-auto px-4">
          <ScrollAnimation>
            <div className="text-center mb-6">
              <h2 className="text-xl font-bold text-gray-900 mb-2">Meet Our Founders</h2>
              <div className="w-12 h-0.5 bg-red-600 mx-auto"></div>
            </div>
          </ScrollAnimation>

<div className="space-y-4">
  {founders.map((member, index) => (
    <ScrollAnimation key={member.name} delay={index * 150}>
      <Card className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
        <div className="p-6 text-center">
          {/* Profile Image */}
          <div className="relative mx-auto mb-4">
            <div className="w-20 h-20 rounded-full bg-red-100 p-1 mx-auto border-2 border-red-200">
              {member.image ? (
                <img
                  src={member.image}
                  alt={member.name}
                  className="w-full h-full rounded-full object-cover"
                />
              ) : (
                <div className="w-full h-full rounded-full bg-red-200 flex items-center justify-center">
                  <span className="text-red-600 font-bold">
                    {member.name.split(' ').map(n => n[0]).join('')}
                  </span>
                </div>
              )}
            </div>
          </div>

          <h3 className="text-lg font-bold text-gray-900 mb-2">{member.name}</h3>
          <div className="mb-4">
            <span className="bg-red-600 text-white text-xs font-semibold px-3 py-1 rounded-full inline-block">
              {member.role}
            </span>
          </div>
          
          {/* Description for each founder */}
          {member.name === "Shashank Pandey" && (
            <p className="text-gray-600 text-sm mb-4 leading-relaxed">
              Manages all operations of Tiffo and handles overall growth strategies & business development.
            </p>
          )}
          
          {member.name === "Mohd. Hamza" && (
            <p className="text-gray-600 text-sm mb-4 leading-relaxed">
              Handles marketing activities and manages seller reports & performance tracking.
            </p>
          )}
          
          <div className="flex justify-center gap-3">
            {member.socials.map((social: any, i: number) => (
              <a
                key={i}
                href={social.url}
                target="_blank"
                rel="noopener noreferrer"
                className="w-8 h-8 bg-gray-100 hover:bg-red-600 text-gray-600 hover:text-white rounded-full flex items-center justify-center transition-all duration-300"
              >
                <social.icon className="w-3 h-3" />
              </a>
            ))}
          </div>
        </div>
      </Card>
    </ScrollAnimation>
  ))}
</div>

         
        </div>
      </div>

      {/* About Tiffo Section */}
      <div className="py-8 bg-gray-50">
        <div className="max-w-md mx-auto px-4">
          <ScrollAnimation>
            <div className="text-center">
              <h2 className="text-xl font-bold text-gray-900 mb-4">About Tiffo</h2>
              <div className="bg-white rounded-2xl p-6 border border-gray-200">
                <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Star className="w-6 h-6 text-red-600" />
                </div>
                <p className="text-gray-700 text-sm leading-relaxed mb-4">
                  Tiffo is India's first and most trusted tiffin delivery platform, connecting you with verified home chefs who serve authentic, homemade meals with love and quality.
                </p>
                <p className="text-gray-700 text-sm leading-relaxed">
                  We deliver happiness in every tiffin with fast service, flexible subscriptions, and exciting rewards for our loyal customers.
                </p>
              </div>
            </div>
          </ScrollAnimation>
        </div>
      </div>

      {/* Contact Section */}
      <div className="py-8 bg-white">
        <div className="max-w-md mx-auto px-4">
          <ScrollAnimation>
            <div className="text-center mb-6">
              <h2 className="text-lg font-bold text-gray-900 mb-2">Get In Touch</h2>
              <div className="w-10 h-0.5 bg-red-600 mx-auto"></div>
            </div>
          </ScrollAnimation>

          <div className="space-y-4">
            <a 
              href="mailto:help@tiffo.com"
              className="flex items-center gap-3 p-4 bg-red-50 rounded-xl border border-red-100 hover:bg-red-100 transition-colors"
            >
              <div className="w-10 h-10 bg-red-600 rounded-lg flex items-center justify-center">
                <Mail className="w-5 h-5 text-white" />
              </div>
              <div className="text-left">
                <p className="text-gray-600 text-xs">Email Help</p>
                <p className="text-gray-900 font-semibold">help@tiffo.com</p>
              </div>
            </a>

            <a 
              href="tel:+918115067311"
              className="flex items-center gap-3 p-4 bg-gray-50 rounded-xl border border-gray-200 hover:bg-gray-100 transition-colors"
            >
              <div className="w-10 h-10 bg-gray-600 rounded-lg flex items-center justify-center">
                <Phone className="w-5 h-5 text-white" />
              </div>
              <div className="text-left">
                <p className="text-gray-600 text-xs">Call Support</p>
                <p className="text-gray-900 font-semibold">+91 8115067311</p>
              </div>
            </a>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="bg-gray-900 text-white py-8">
        <div className="max-w-md mx-auto px-4 text-center">
          <div className="flex items-center justify-center gap-2 mb-3">
            <div className="w-6 h-6 bg-red-600 rounded flex items-center justify-center">
              <span className="text-white font-bold text-xs">T</span>
            </div>
            <span className="font-bold">Tiffo</span>
          </div>
          <p className="text-gray-400 text-xs mb-4">
            India's 1st Tiffin Delivery App
          </p>
          <div className="flex justify-center gap-4 mb-4">
            {[Instagram, Linkedin].map((Icon, index) => (
              <a
                key={index}
                href="#"
                className="w-8 h-8 bg-gray-800 hover:bg-red-600 text-gray-300 hover:text-white rounded flex items-center justify-center transition-colors"
              >
                <Icon className="w-4 h-4" />
              </a>
            ))}
          </div>
          <p className="text-gray-500 text-xs">
            &copy; 2025 Tiffo. All rights reserved.
          </p>
        </div>
      </div>
    </div>
  );
}
