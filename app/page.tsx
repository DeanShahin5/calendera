export default function Home() {
  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-gradient-to-br from-blue-50 via-white to-purple-50 px-4 dark:from-gray-900 dark:via-gray-800 dark:to-blue-950">
      {/* Animated background orbs */}
      <div className="absolute -top-40 -right-40 h-80 w-80 rounded-full bg-blue-400/20 blur-3xl animate-pulse dark:bg-blue-600/10"></div>
      <div className="absolute -bottom-40 -left-40 h-80 w-80 rounded-full bg-purple-400/20 blur-3xl animate-pulse dark:bg-purple-600/10" style={{ animationDelay: '1s' }}></div>

      {/* Main content */}
      <main className="relative z-10 flex flex-col items-center justify-center text-center max-w-4xl mx-auto space-y-8 py-12">
        {/* Logo/Brand name */}
        <div className="space-y-2 animate-fade-in">
          <h1 className="text-6xl sm:text-7xl md:text-8xl font-bold tracking-tight text-gray-900 dark:text-white transition-all">
            <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent dark:from-blue-400 dark:to-purple-400">
              MailMind
            </span>
          </h1>

          {/* Decorative line */}
          <div className="flex items-center justify-center gap-2">
            <div className="h-1 w-12 bg-gradient-to-r from-transparent via-blue-500 to-transparent rounded-full dark:via-blue-400"></div>
            <div className="h-1 w-8 bg-gradient-to-r from-transparent via-purple-500 to-transparent rounded-full dark:via-purple-400"></div>
            <div className="h-1 w-12 bg-gradient-to-r from-transparent via-blue-500 to-transparent rounded-full dark:via-blue-400"></div>
          </div>
        </div>

        {/* Tagline */}
        <p className="text-xl sm:text-2xl md:text-3xl text-gray-600 dark:text-gray-300 max-w-2xl leading-relaxed font-medium px-4 animate-fade-in-up">
          Declutter your notifications with AI-powered email organization.
        </p>

        {/* Features badges */}
        <div className="flex flex-wrap items-center justify-center gap-3 px-4 animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
          <span className="px-4 py-2 bg-white/60 dark:bg-gray-800/60 backdrop-blur-sm rounded-full text-sm font-medium text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700 shadow-sm">
            ✨ Smart Sorting
          </span>
          <span className="px-4 py-2 bg-white/60 dark:bg-gray-800/60 backdrop-blur-sm rounded-full text-sm font-medium text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700 shadow-sm">
            🚀 Time Saver
          </span>
          <span className="px-4 py-2 bg-white/60 dark:bg-gray-800/60 backdrop-blur-sm rounded-full text-sm font-medium text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700 shadow-sm">
            🔒 Secure
          </span>
        </div>

        {/* CTA Button */}
        <div className="pt-4 animate-fade-in-up" style={{ animationDelay: '0.4s' }}>
          <button className="group relative px-8 py-4 sm:px-10 sm:py-5 bg-gradient-to-r from-blue-600 to-purple-600 text-white text-lg sm:text-xl font-semibold rounded-full shadow-lg transition-all duration-300 hover:scale-105 hover:shadow-2xl hover:shadow-blue-500/50 dark:hover:shadow-blue-400/30 active:scale-95">
            {/* Button glow effect */}
            <div className="absolute inset-0 rounded-full bg-gradient-to-r from-blue-400 to-purple-400 opacity-0 blur-xl transition-opacity duration-300 group-hover:opacity-70 dark:group-hover:opacity-50"></div>

            {/* Button content */}
            <span className="relative flex items-center gap-2">
              Get Started
              <svg
                className="w-5 h-5 transition-transform duration-300 group-hover:translate-x-1"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
            </span>
          </button>
        </div>

        {/* Trust indicator */}
        <p className="text-sm text-gray-500 dark:text-gray-400 pt-4 animate-fade-in-up" style={{ animationDelay: '0.6s' }}>
          Join thousands of professionals taking control of their inbox
        </p>
      </main>
    </div>
  );
}
