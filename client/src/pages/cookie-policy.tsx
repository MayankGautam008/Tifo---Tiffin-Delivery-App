// pages/cookie-policy.tsx
export default function CookiePolicy() {
  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-4xl mx-auto px-4">
        <div className="bg-white rounded-2xl shadow-lg p-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-6">Cookie Policy</h1>
          
          <div className="prose prose-gray max-w-none">
            <p className="text-lg text-gray-600 mb-6">
              This Cookie Policy explains how Tiffinwala uses cookies and similar technologies to recognize you when you visit our website.
            </p>

            <h2 className="text-2xl font-semibold mt-8 mb-4">What are cookies?</h2>
            <p>
              Cookies are small data files that are placed on your computer or mobile device when you visit a website. 
              Cookies are widely used by website owners to make their websites work efficiently.
            </p>

            <h2 className="text-2xl font-semibold mt-8 mb-4">How we use cookies</h2>
            <ul className="list-disc pl-6 space-y-2">
              <li>To remember your preferences and settings</li>
              <li>To analyze how our website is performing</li>
              <li>To provide personalized content and ads</li>
              <li>To ensure the security of our website</li>
            </ul>

            <h2 className="text-2xl font-semibold mt-8 mb-4">Managing cookies</h2>
            <p>
              You can control and manage cookies in various ways. Please keep in mind that removing or blocking cookies
              can impact your user experience and parts of our website may no longer be fully accessible.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}