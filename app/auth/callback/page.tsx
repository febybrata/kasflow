"use client";

import { useEffect, useRef } from "react";
import { createClient } from "@/lib/supabase/client";

export default function AuthCallbackPage() {
  const hasRun = useRef(false);

  useEffect(() => {
    // Prevent double-execution in React StrictMode
    if (hasRun.current) return;
    hasRun.current = true;

    const supabase = createClient();
    let redirected = false;

    const doRedirect = (url: string) => {
      if (redirected) return;
      redirected = true;
      // Set a flag so AppShell shows "Memverifikasi akun..." instead of
      // the "Login required" modal during the post-OAuth transition.
      if (url === "/") {
        sessionStorage.setItem("oauth_in_progress", "true");
      }
      // use replace() so the callback URL is not kept in browser history
      window.location.replace(url);
    };

    // 1. Set up onAuthStateChange FIRST.
    //    @supabase/ssr createBrowserClient is a singleton — the AuthProvider
    //    and this callback page share the SAME client instance.  So when
    //    exchangeCodeForSession() resolves, onAuthStateChange fires
    //    SIGNED_IN here as well.
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (event === "SIGNED_IN" && session) {
          doRedirect("/");
        }
      },
    );

    // 2. Timeout fallback — if exchangeCodeForSession hangs or the
    //    SIGNED_IN event never fires, redirect after 5 seconds so the
    //    user is never stuck on the loading spinner.
    const fallbackTimer = setTimeout(() => {
      subscription.unsubscribe();
      doRedirect("/");
    }, 5000);

    // 3. Main handler — exchange code (PKCE) and / or check session.
    const handleCallback = async () => {
      try {
        const params = new URLSearchParams(window.location.search);
        const code = params.get("code");

        if (code) {
          const { error } = await supabase.auth.exchangeCodeForSession(code);
          if (error) {
            console.error("OAuth callback error:", error.message);
            // Session might still have been set in some edge cases
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) {
              clearTimeout(fallbackTimer);
              subscription.unsubscribe();
              doRedirect("/auth?error=OAuth_failed");
              return;
            }
          }
        }

        // Check if session is available now (from exchange or detectSessionInUrl)
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          clearTimeout(fallbackTimer);
          subscription.unsubscribe();
          doRedirect("/");
        }

        // If no session yet, wait for onAuthStateChange or timeout fallback
      } catch (err) {
        console.error("OAuth callback exception:", err);
        // Attempt redirect anyway — the session might have been set
        doRedirect("/");
      }
    };

    handleCallback();
  }, []);

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        height: "100vh",
        background: "#0a0a0a",
        color: "#fff",
        fontFamily: "Inter, sans-serif",
      }}
    >
      <div style={{ textAlign: "center" }}>
        <div
          style={{
            width: 40,
            height: 40,
            border: "3px solid rgba(255,255,255,0.2)",
            borderTop: "3px solid #10b981",
            borderRadius: "50%",
            animation: "spin 0.8s linear infinite",
            margin: "0 auto 16px",
          }}
        />
        <p style={{ fontSize: 16, opacity: 0.8 }}>Memverifikasi akun...</p>
        <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
      </div>
    </div>
  );
}
