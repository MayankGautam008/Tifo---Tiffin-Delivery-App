import { useState } from "react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { UtensilsCrossed, Phone, MessageCircle, Mail, ArrowLeft, Home, Clock, HeadphonesIcon, Users , CheckCircle } from "lucide-react";

export default function HelpPage() {
  const { toast } = useToast();
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    issue: ""
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      // EmailJS integration for direct email sending
      const emailData = {
        to_email: "pandeyshashank039@gmail.com",
        from_name: formData.name,
        from_email: formData.email,
        from_phone: formData.phone,
        issue: formData.issue,
        subject: `Tiffo Help Request from ${formData.name}`,
        timestamp: new Date().toLocaleString()
      };

      // Using FormSubmit.co service (free and easy)
      const response = await fetch("https://formsubmit.co/ajax/pandeyshashank039@gmail.com", {
        method: "POST",
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({
          name: formData.name,
          email: formData.email,
          phone: formData.phone,
          issue: formData.issue,
          _subject: `Tiffo Help Request from ${formData.name}`,
          _template: "table",
          _captcha: "false"
        })
      });

      if (response.ok) {
        toast({
          title: "Message Sent Successfully! 🎉",
          description: "We've received your message and will get back to you within 24 hours.",
          variant: "default",
        });
        setIsSubmitted(true);
        
        // Reset form
        setFormData({
          name: "",
          email: "",
          phone: "",
          issue: ""
        });
      } else {
        throw new Error("Failed to send message");
      }

    } catch (error) {
      console.error("Error sending email:", error);
      
      // Fallback to traditional mailto
      const subject = `Tiffo Help Request from ${formData.name}`;
      const body = `
Name: ${formData.name}
Email: ${formData.email}
Phone: ${formData.phone}

Issue Details:
${formData.issue}

---
Sent from Tiffo Help Page
      `.trim();

      const mailtoLink = `mailto:pandeyshashank039@gmail.com?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
      window.location.href = mailtoLink;

      toast({
        title: "Opening Email Client",
        description: "Please send the pre-filled email to complete your request.",
        variant: "default",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const openWhatsApp = () => {
    const message = `Hi Tiffo Team, I need help with my account.`;
    window.open(`https://wa.me/918115067311?text=${encodeURIComponent(message)}`, '_blank');
  };

  const makeCall = () => {
    window.location.href = 'tel:+918115067311';
  };

  const sendEmail = () => {
    window.location.href = 'mailto:pandeyshashank039@gmail.com?subject=General Inquiry&body=Hello Tiffo Team,';
  };

  const goBack = () => {
    window.history.back();
  };

  if (isSubmitted) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center max-w-md mx-4">
          <CheckCircle className="w-20 h-20 text-green-500 mx-auto mb-6" />
          <h1 className="text-3xl font-bold text-gray-900 mb-4">Message Sent Successfully!</h1>
          <p className="text-gray-600 mb-6">
            Thank you for contacting us. We've received your message and will get back to you within 24 hours.
          </p>
          <div className="flex flex-col gap-4"> {/* Using flex with gap for better control */}
  <Button 
    onClick={() => setIsSubmitted(false)}
    className="w-full h-12 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-xl shadow-lg transition-all duration-200 transform hover:scale-[1.02] flex items-center justify-center gap-2"
  >
    <Mail className="w-5 h-5" />
    Send Another Message
  </Button>
  
  <Link href="/" className="block w-full">
    <Button 
      variant="outline" 
      className="w-full h-12 border-2 border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700 hover:border-red-300 rounded-xl transition-all duration-200 flex items-center justify-center gap-2"
    >
      <Home className="w-5 h-5" />
      Back to Home
    </Button>
  </Link>
</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <div className="bg-red-600 text-white py-4 px-6 shadow-lg">
        <div className="flex items-center justify-between max-w-6xl mx-auto">
          <div className="flex items-center gap-3">
            <Button
              onClick={goBack}
              variant="ghost"
              size="sm"
              className="text-white hover:bg-red-700 hover:text-white"
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div className="flex items-center gap-2">
              <UtensilsCrossed className="w-8 h-8" />
              <h1 className="text-2xl font-bold">Tiffo</h1>
            </div>
          </div>
          <Link href="/">
            <Button
              variant="ghost"
              size="sm"
              className="text-white hover:bg-red-700 hover:text-white"
            >
              <Home className="w-5 h-5 mr-2" />
              Home
            </Button>
          </Link>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Hero Section */}
        <div className="text-center mb-12">
          <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <HeadphonesIcon className="w-10 h-10 text-red-600" />
          </div>
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            How can we <span className="text-red-600">help</span> you?
          </h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            We're here to help you with any questions or issues. Your message will be sent directly to our team.
          </p>
        </div>

        <Card className="border-2 border-purple-100 hover:border-purple-300 transition-all duration-200 hover:shadow-lg">
  <CardHeader className="text-center pb-4">
    <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-3">
      <Users className="w-6 h-6 text-purple-600" />
    </div>
    <CardTitle className="text-lg text-gray-900">About Our Team</CardTitle>
    <CardDescription className="text-gray-600">
      Meet the founders behind Tiffo
    </CardDescription>
  </CardHeader>
  <CardContent className="text-center">
    <Link href="/about">
      <Button className="w-full bg-purple-600 hover:bg-purple-700 text-white font-semibold py-3">
        <Users className="w-5 h-5 mr-2" />
        Meet Our Team
      </Button>
    </Link>
  </CardContent>
</Card>

        {/* Quick Contact Cards */}
        <div className="grid md:grid-cols-3 gap-6 mb-12">
          {/* WhatsApp Card */}
          <Card className="border-2 border-green-100 hover:border-green-300 transition-all duration-200 hover:shadow-lg">
            <CardHeader className="text-center pb-4">
              <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <MessageCircle className="w-6 h-6 text-green-600" />
              </div>
              <CardTitle className="text-lg text-gray-900">Chat on WhatsApp</CardTitle>
              <CardDescription className="text-gray-600">
                Quick responses within minutes
              </CardDescription>
            </CardHeader>
            <CardContent className="text-center">
              <Button
                onClick={openWhatsApp}
                className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-3"
              >
                <MessageCircle className="w-5 h-5 mr-2" />
                Start Chat
              </Button>
            </CardContent>
          </Card>

          {/* Call Card */}
          <Card className="border-2 border-blue-100 hover:border-blue-300 transition-all duration-200 hover:shadow-lg">
            <CardHeader className="text-center pb-4">
              <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <Phone className="w-6 h-6 text-blue-600" />
              </div>
              <CardTitle className="text-lg text-gray-900">Call Us Directly</CardTitle>
              <CardDescription className="text-gray-600">
                24/7 customer support
              </CardDescription>
            </CardHeader>
            <CardContent className="text-center">
              <Button
                onClick={makeCall}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3"
              >
                <Phone className="w-5 h-5 mr-2" />
                Call Now
              </Button>
            </CardContent>
          </Card>

          {/* Direct Message Card */}
          <Card className="border-2 border-red-100 hover:border-red-300 transition-all duration-200 hover:shadow-lg">
            <CardHeader className="text-center pb-4">
              <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <Mail className="w-6 h-6 text-red-600" />
              </div>
              <CardTitle className="text-lg text-gray-900">Direct Message</CardTitle>
              <CardDescription className="text-gray-600">
                Send message directly from website
              </CardDescription>
            </CardHeader>
            <CardContent className="text-center">
              <Button
                onClick={() => document.getElementById('contact-form')?.scrollIntoView({ behavior: 'smooth' })}
                className="w-full bg-red-600 hover:bg-red-700 text-white font-semibold py-3"
              >
                <Mail className="w-5 h-5 mr-2" />
                Send Message
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Contact Form */}
        <Card id="contact-form" className="border-2 border-red-100 shadow-lg">
          <CardHeader className="text-center pb-4 bg-red-50">
            <CardTitle className="text-2xl text-gray-900">Send Direct Message</CardTitle>
            <CardDescription className="text-gray-600">
              Fill the form and your message will be sent directly to our team
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-6">
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">Your Name *</label>
                  <Input
                    name="name"
                    placeholder="Enter your full name"
                    value={formData.name}
                    onChange={handleChange}
                    className="h-12 rounded-xl border-red-200 focus:ring-2 focus:ring-red-500 focus:border-red-500"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">Your Email *</label>
                  <Input
                    name="email"
                    type="email"
                    placeholder="your@email.com"
                    value={formData.email}
                    onChange={handleChange}
                    className="h-12 rounded-xl border-red-200 focus:ring-2 focus:ring-red-500 focus:border-red-500"
                    required
                  />
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">Phone Number</label>
                  <Input
                    name="phone"
                    placeholder="Your phone number"
                    value={formData.phone}
                    onChange={handleChange}
                    className="h-12 rounded-xl border-red-200 focus:ring-2 focus:ring-red-500 focus:border-red-500"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">Our Contact</label>
                  <Input
                    value="8115067311"
                    readOnly
                    className="h-12 rounded-xl border-red-200 bg-red-50 text-gray-600"
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Describe Your Issue *</label>
                <Textarea
                  name="issue"
                  placeholder="Please describe your issue in detail so we can help you better..."
                  value={formData.issue}
                  onChange={handleChange}
                  className="min-h-32 rounded-xl border-red-200 focus:ring-2 focus:ring-red-500 focus:border-red-500 resize-none"
                  required
                />
              </div>

              <Button
                type="submit"
                disabled={isSubmitting || !formData.name || !formData.email || !formData.issue}
                className="w-full h-12 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-xl text-lg transition-all duration-200 transform hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? (
                  <div className="flex items-center gap-2">
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    Sending Message...
                  </div>
                ) : (
                  <>
                    <Mail className="w-5 h-5 mr-2" />
                    Send Message Directly
                  </>
                )}
              </Button>

              <p className="text-sm text-gray-500 text-center">
                Your message will be sent directly to <strong>pandeyshashank039@gmail.com</strong>
              </p>
            </form>
          </CardContent>
        </Card>

        {/* Additional Info */}
        <div className="grid md:grid-cols-2 gap-8 mt-12">
          <Card className="border-2 border-red-100">
            <CardHeader className="bg-red-50">
              <CardTitle className="flex items-center gap-2 text-gray-900">
                <Clock className="w-5 h-5 text-red-600" />
                Response Time
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              <p className="text-gray-600">
                <strong className="text-red-600">WhatsApp:</strong> Within 15 minutes<br/>
                <strong className="text-red-600">Phone:</strong> Immediate<br/>
                <strong className="text-red-600">Email:</strong> Within 24 hours<br/>
                <strong className="text-red-600">Direct Message:</strong> Within 12 hours
              </p>
            </CardContent>
          </Card>

          <Card className="border-2 border-red-100">
            <CardHeader className="bg-red-50">
              <CardTitle className="flex items-center gap-2 text-gray-900">
                <HeadphonesIcon className="w-5 h-5 text-red-600" />
                Support Hours
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              <p className="text-gray-600">
                <strong className="text-red-600">24/7 Support:</strong> Phone & WhatsApp<br/>
                <strong className="text-red-600">Email Support:</strong> 24/7<br/>
                <strong className="text-red-600">Direct Messages:</strong> 24/7<br/>
                We're always here to help you!
              </p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Footer */}
      <div className="bg-red-50 border-t border-red-100 mt-16 py-8">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <div className="flex items-center justify-center gap-2 mb-4">
            <UtensilsCrossed className="w-6 h-6 text-red-600" />
            <span className="text-xl font-bold text-gray-900">Tiffo</span>
          </div>
          <p className="text-gray-600 mb-4">
            Fresh Food Delivery • Your satisfaction is our priority
          </p>
          <div className="text-sm text-gray-500">
            <p>Contact: 8115067311 • Email: <span className="text-red-600">pandeyshashank039@gmail.com</span></p>
            <p className="mt-2">© 2024 Tiffo. All rights reserved.</p>
          </div>
        </div>
      </div>
    </div>
  );
}