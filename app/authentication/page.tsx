"use client";

import { useRouter } from 'next/navigation';

export default function Authentication() {
  const router = useRouter();

  const handleGoogleSignIn = () => {
    router.push('/preferences');
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-background">
      {/* Subtle grid background */}
      <div className="absolute inset-0 bg-grid-pattern opacity-30"></div>

      {/* Floating accent shapes */}
      <div
        className="absolute top-[15%] left-[10%] w-32 h-32 rounded-full opacity-5 animate-float"
        style={{ background: 'var(--google-blue)' }}
      ></div>
      <div
        className="absolute bottom-[20%] right-[8%] w-24 h-24 opacity-5 animate-morph"
        style={{ background: 'var(--google-red)', animationDelay: '3s' }}
      ></div>

      {/* Main content */}
      <main className="relative z-10 w-full max-w-lg px-6">
        <div className="bg-surface border-2 border-border rounded-2xl p-10 shadow-2xl animate-stagger-1">

          {/* Header with brand colors */}
          <div className="text-center mb-10">
            <div className="flex items-center justify-center gap-2 mb-4">
              <div className="w-2 h-2 rounded-full" style={{background: 'var(--google-red)'}}></div>
              <div className="w-2 h-2 rounded-full" style={{background: 'var(--google-blue)'}}></div>
              <div className="w-2 h-2 rounded-full" style={{background: 'var(--google-yellow)'}}></div>
              <div className="w-2 h-2 rounded-full" style={{background: 'var(--google-green)'}}></div>
            </div>
            <h1 style={{fontFamily: 'var(--font-serif)'}} className="text-5xl font-normal text-foreground mb-3">
              Welcome
            </h1>
            <div className="w-16 h-0.5 mx-auto mb-6" style={{background: 'linear-gradient(90deg, var(--google-red), var(--google-blue), var(--google-yellow), var(--google-green))'}}></div>
            <p className="text-foreground/60 text-lg leading-relaxed max-w-md mx-auto">
              Connect your Google account to unlock intelligent email organization
            </p>
          </div>

          {/* Sign-in section */}
          <div className="space-y-6 animate-stagger-2">
            {/* Google Sign-In Button */}
            <button
              onClick={handleGoogleSignIn}
              className="group relative w-full flex items-center justify-center gap-4 px-8 py-5 bg-surface border-2 border-border text-foreground font-medium text-lg rounded-xl hover:border-foreground hover:shadow-xl transition-all duration-300"
            >
              {/* Google Logo */}
              <svg className="w-7 h-7" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                />
              </svg>
              <span>Continue with Google</span>
            </button>

            {/* What we access */}
            <div className="pt-4 space-y-3">
              <p className="text-sm font-semibold text-foreground/80 mb-3">We'll access:</p>
              <div className="space-y-2">
                <div className="flex items-start gap-3 text-sm text-foreground/60">
                  <div className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5" style={{background: 'rgba(234, 67, 53, 0.1)'}}>
                    <div className="w-2 h-2 rounded-full" style={{background: 'var(--google-red)'}}></div>
                  </div>
                  <span>Gmail inbox for smart categorization</span>
                </div>
                <div className="flex items-start gap-3 text-sm text-foreground/60">
                  <div className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5" style={{background: 'rgba(66, 133, 244, 0.1)'}}>
                    <div className="w-2 h-2 rounded-full" style={{background: 'var(--google-blue)'}}></div>
                  </div>
                  <span>Google Calendar for schedule integration</span>
                </div>
                <div className="flex items-start gap-3 text-sm text-foreground/60">
                  <div className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5" style={{background: 'rgba(52, 168, 83, 0.1)'}}>
                    <div className="w-2 h-2 rounded-full" style={{background: 'var(--google-green)'}}></div>
                  </div>
                  <span>Basic profile information</span>
                </div>
              </div>
            </div>
          </div>

        </div>
      </main>
    </div>
  );
}
