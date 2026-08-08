import { useEffect, useRef } from "react";

// ✅ Google Sign-In is FREE — no cost regardless of how many users sign in.
// You just need a free Google Cloud OAuth Client ID (see client/.env.example).

declare global {
  interface Window {
    google?: any;
  }
}

type GoogleSignInButtonProps = {
  onCredential: (idToken: string) => void;
  text?: "signin_with" | "signup_with" | "continue_with";
  disabled?: boolean;
};

export default function GoogleSignInButton({
  onCredential,
  text = "signin_with",
  disabled = false,
}: GoogleSignInButtonProps) {
  const buttonRef = useRef<HTMLDivElement>(null);
  const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined;

  useEffect(() => {
    if (!clientId) {
      console.warn(
        "⚠️ VITE_GOOGLE_CLIENT_ID is not set. Add it to client/.env to enable Google Sign-In."
      );
      return;
    }

    let cancelled = false;

    const renderButton = () => {
      if (cancelled || !window.google || !buttonRef.current) return;

      window.google.accounts.id.initialize({
        client_id: clientId,
        callback: (response: { credential: string }) => {
          onCredential(response.credential);
        },
      });

      buttonRef.current.innerHTML = "";
      window.google.accounts.id.renderButton(buttonRef.current, {
        type: "standard",
        theme: "outline",
        size: "large",
        text,
        shape: "pill",
        width: 320,
      });
    };

    if (window.google) {
      renderButton();
    } else {
      // Google Identity Services script (loaded in index.html) may still be loading
      const interval = setInterval(() => {
        if (window.google) {
          clearInterval(interval);
          renderButton();
        }
      }, 200);
      return () => clearInterval(interval);
    }

    return () => {
      cancelled = true;
    };
  }, [clientId, text, onCredential]);

  if (!clientId) {
    return null; // Silently hide the button if Google Sign-In hasn't been configured yet
  }

  return (
    <div
      className={`flex justify-center ${disabled ? "opacity-50 pointer-events-none" : ""}`}
      ref={buttonRef}
    />
  );
}
