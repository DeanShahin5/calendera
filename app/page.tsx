import Link from 'next/link';

export default function Home() {
  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-background">
      {/* Grid pattern background */}
      <div className="absolute inset-0 bg-grid-pattern opacity-40"></div>

      {/* Animated geometric shapes - Google colors */}
      <div
        className="absolute top-20 right-[10%] w-64 h-64 animate-morph opacity-10"
        style={{
          background: 'var(--google-red)',
          animationDelay: '0s'
        }}
      ></div>
      <div
        className="absolute bottom-32 left-[15%] w-48 h-48 animate-morph opacity-10"
        style={{
          background: 'var(--google-blue)',
          animationDelay: '5s'
        }}
      ></div>
      <div
        className="absolute top-[40%] right-[20%] w-32 h-32 animate-float opacity-10"
        style={{
          background: 'var(--google-yellow)',
          borderRadius: '30% 70% 70% 30% / 30% 30% 70% 70%'
        }}
      ></div>
      <div
        className="absolute bottom-[20%] right-[35%] w-40 h-40 animate-float opacity-10"
        style={{
          background: 'var(--google-green)',
          borderRadius: '50%',
          animationDelay: '2s'
        }}
      ></div>

      {/* Main content */}
      <main className="relative z-10 flex flex-col items-center justify-center text-center max-w-5xl mx-auto px-6 py-16">

        {/* Brand mark with Google color accents */}
        <div className="animate-stagger-1 mb-8">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-3 h-3 rounded-full" style={{background: 'var(--google-red)'}}></div>
            <div className="w-3 h-3 rounded-full" style={{background: 'var(--google-blue)'}}></div>
            <div className="w-3 h-3 rounded-full" style={{background: 'var(--google-yellow)'}}></div>
            <div className="w-3 h-3 rounded-full" style={{background: 'var(--google-green)'}}></div>
          </div>
          <h1 style={{fontFamily: 'var(--font-serif)'}} className="text-7xl sm:text-8xl md:text-9xl font-normal tracking-tight text-foreground mb-2">
            Calendera
          </h1>
          <div className="h-1 w-24 mx-auto" style={{background: 'linear-gradient(90deg, var(--google-red), var(--google-blue), var(--google-yellow), var(--google-green))'}}></div>
        </div>

        {/* Tagline */}
        <p className="animate-stagger-2 text-2xl sm:text-3xl md:text-4xl text-foreground/70 max-w-3xl leading-relaxed mb-12 font-light">
          Transform your Gmail into an intelligent workspace with AI-powered organization
        </p>

        {/* Value propositions with Google color accents */}
        <div className="animate-stagger-3 grid grid-cols-1 md:grid-cols-3 gap-6 mb-16 w-full max-w-4xl">
          <div className="p-6 bg-surface border border-border/50 rounded-lg hover:border-[var(--google-red)] transition-all duration-300">
            <div className="w-12 h-12 rounded-full flex items-center justify-center mb-4 mx-auto" style={{background: 'rgba(234, 67, 53, 0.1)'}}>
              <div className="w-6 h-6 rounded-full" style={{background: 'var(--google-red)'}}></div>
            </div>
            <h3 className="text-lg font-semibold mb-2 text-foreground">Smart Categorization</h3>
            <p className="text-sm text-foreground/60 leading-relaxed">AI automatically organizes incoming mail based on your preferences</p>
          </div>

          <div className="p-6 bg-surface border border-border/50 rounded-lg hover:border-[var(--google-blue)] transition-all duration-300">
            <div className="w-12 h-12 rounded-full flex items-center justify-center mb-4 mx-auto" style={{background: 'rgba(66, 133, 244, 0.1)'}}>
              <div className="w-6 h-6 rounded-full" style={{background: 'var(--google-blue)'}}></div>
            </div>
            <h3 className="text-lg font-semibold mb-2 text-foreground">Calendar Sync</h3>
            <p className="text-sm text-foreground/60 leading-relaxed">Seamlessly integrates with Google Calendar for unified productivity</p>
          </div>

          <div className="p-6 bg-surface border border-border/50 rounded-lg hover:border-[var(--google-green)] transition-all duration-300">
            <div className="w-12 h-12 rounded-full flex items-center justify-center mb-4 mx-auto" style={{background: 'rgba(52, 168, 83, 0.1)'}}>
              <div className="w-6 h-6 rounded-full" style={{background: 'var(--google-green)'}}></div>
            </div>
            <h3 className="text-lg font-semibold mb-2 text-foreground">Privacy First</h3>
            <p className="text-sm text-foreground/60 leading-relaxed">Your data stays secure with enterprise-grade encryption</p>
          </div>
        </div>

        {/* CTA */}
        <div className="animate-stagger-4">
          <Link
            href="/authentication"
            className="group relative inline-flex items-center gap-3 px-10 py-5 bg-foreground text-background text-xl font-medium rounded-full hover:gap-5 transition-all duration-300 shadow-lg hover:shadow-2xl overflow-hidden"
          >
            <span className="relative z-10">Get Started</span>
            <svg
              className="relative z-10 w-5 h-5 transition-transform duration-300 group-hover:translate-x-1"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
            </svg>

            {/* Animated background accent */}
            <div
              className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500"
              style={{
                background: 'linear-gradient(90deg, var(--google-red), var(--google-blue), var(--google-yellow), var(--google-green))',
                transform: 'translateX(-100%)',
                animation: 'slide-bg 3s linear infinite'
              }}
            ></div>
          </Link>

        </div>
      </main>
    </div>
  );
}
