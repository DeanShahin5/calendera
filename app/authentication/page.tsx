'use client';

import { useRouter } from 'next/navigation';

export default function Authentication() {
  const router = useRouter();

  const handleGoogleSignIn = () => {
    // Simulate Google sign-in and navigate to preferences
    router.push('/preferences');
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-gradient-to-br from-blue-50 via-white to-purple-50 px-4 dark:from-gray-900 dark:via-gray-800 dark:to-blue-950">
      {/* Animated background orbs */}
      <div className="absolute -top-40 -right-40 h-80 w-80 rounded-full bg-blue-400/20 blur-3xl animate-pulse dark:bg-blue-600/10"></div>
      <div className="absolute -bottom-40 -left-40 h-80 w-80 rounded-full bg-purple-400/20 blur-3xl animate-pulse dark:bg-purple-600/10" style={{ animationDelay: '1s' }}></div>

      {/* Main content card */}
      <main className="relative z-10 w-full max-w-md">
        <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 p-8 sm:p-10 space-y-8">
          {/* Logo/Brand */}
          <div className="text-center space-y-2">
            <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent dark:from-blue-400 dark:to-purple-400">
              MailMind
            </h1>
            <div className="flex items-center justify-center gap-2">
              <div className="h-0.5 w-8 bg-gradient-to-r from-transparent via-blue-500 to-transparent rounded-full dark:via-blue-400"></div>
              <div className="h-0.5 w-6 bg-gradient-to-r from-transparent via-purple-500 to-transparent rounded-full dark:via-purple-400"></div>
              <div className="h-0.5 w-8 bg-gradient-to-r from-transparent via-blue-500 to-transparent rounded-full dark:via-blue-400"></div>
            </div>
          </div>

          {/* Header text */}
          <div className="text-center space-y-3">
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">
              Sign in with Google to continue
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
              This will connect to your Gmail and Google Calendar for AI-powered organization.
            </p>
          </div>

          {/* Google Sign-In button */}
          <div className="space-y-4">
            <button
              onClick={handleGoogleSignIn}
              className="group relative w-full flex items-center justify-center gap-3 px-6 py-4 bg-white dark:bg-gray-700 text-gray-800 dark:text-white font-semibold rounded-xl border-2 border-gray-300 dark:border-gray-600 shadow-md hover:shadow-xl hover:scale-[1.02] active:scale-[0.98] transition-all duration-300"
            >
              {/* Google Logo SVG */}
              <svg className="w-6 h-6" viewBox="0 0 24 24">
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
              <span className="text-base">Continue with Google</span>
            </button>

            {/* Privacy note */}
            <p className="text-xs text-center text-gray-500 dark:text-gray-500 leading-relaxed px-2">
              By continuing, you agree to MailMind's Terms of Service and Privacy Policy. We'll never spam or share your data.
            </p>
          </div>

          {/* Security badge */}
          <div className="flex items-center justify-center gap-2 pt-2">
            <svg className="w-4 h-4 text-green-600 dark:text-green-400" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M2.166 4.999A11.954 11.954 0 0010 1.944 11.954 11.954 0 0017.834 5c.11.65.166 1.32.166 2.001 0 5.225-3.34 9.67-8 11.317C5.34 16.67 2 12.225 2 7c0-.682.057-1.35.166-2.001zm11.541 3.708a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            <span className="text-xs text-gray-600 dark:text-gray-400 font-medium">
              Secured with enterprise-grade encryption
            </span>
          </div>
        </div>
      </main>
    </div>
  );
}
