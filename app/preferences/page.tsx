'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

interface Preference {
  id: string;
  title: string;
  description: string;
  color: string;
  enabled: boolean;
}

export default function Preferences() {
  const router = useRouter();

  const [preferences, setPreferences] = useState<Preference[]>([
    {
      id: 'gmail',
      title: 'Gmail Sync',
      description: 'Sync your Gmail inbox for smart organization and filtering',
      color: 'var(--google-red)',
      enabled: true,
    },
    {
      id: 'calendar',
      title: 'Calendar Integration',
      description: 'Integrate Google Calendar for schedule optimization',
      color: 'var(--google-blue)',
      enabled: true,
    },
    {
      id: 'dailySummary',
      title: 'Daily Digest',
      description: 'Receive a daily summary of important emails and tasks',
      color: 'var(--google-yellow)',
      enabled: true,
    },
    {
      id: 'taskReminders',
      title: 'Smart Reminders',
      description: 'Get notified about upcoming deadlines and tasks',
      color: 'var(--google-green)',
      enabled: true,
    },
    {
      id: 'smartCategorization',
      title: 'Auto-Categorization',
      description: 'Automatically organize emails into intelligent categories',
      color: 'var(--google-red)',
      enabled: true,
    },
    {
      id: 'priorityNotifications',
      title: 'Priority Alerts',
      description: 'Only notify you about high-priority emails',
      color: 'var(--google-blue)',
      enabled: false,
    },
  ]);

  const handleToggle = (id: string) => {
    setPreferences(prev =>
      prev.map(pref =>
        pref.id === id ? { ...pref, enabled: !pref.enabled } : pref
      )
    );
  };

  const handleContinue = () => {
    console.log('User preferences:', preferences);
    router.push('/');
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-background">
      {/* Grid pattern background */}
      <div className="absolute inset-0 bg-grid-pattern opacity-30"></div>

      {/* Animated background shapes */}
      <div
        className="absolute top-[10%] right-[5%] w-40 h-40 animate-morph opacity-5"
        style={{ background: 'var(--google-yellow)', animationDelay: '1s' }}
      ></div>
      <div
        className="absolute bottom-[15%] left-[8%] w-32 h-32 rounded-full animate-float opacity-5"
        style={{ background: 'var(--google-green)', animationDelay: '3s' }}
      ></div>

      {/* Main content */}
      <div className="relative z-10 flex items-center justify-center min-h-screen px-6 py-16">
        <main className="w-full max-w-3xl">
          {/* Header */}
          <div className="text-center mb-12 animate-stagger-1">
            <div className="flex items-center justify-center gap-2 mb-4">
              <div className="w-2 h-2 rounded-full" style={{background: 'var(--google-red)'}}></div>
              <div className="w-2 h-2 rounded-full" style={{background: 'var(--google-blue)'}}></div>
              <div className="w-2 h-2 rounded-full" style={{background: 'var(--google-yellow)'}}></div>
              <div className="w-2 h-2 rounded-full" style={{background: 'var(--google-green)'}}></div>
            </div>
            <h1 style={{fontFamily: 'var(--font-serif)'}} className="text-5xl sm:text-6xl font-normal text-foreground mb-3">
              Customize
            </h1>
            <div className="w-16 h-0.5 mx-auto mb-6" style={{background: 'linear-gradient(90deg, var(--google-red), var(--google-blue), var(--google-yellow), var(--google-green))'}}></div>
            <p className="text-foreground/60 text-lg leading-relaxed max-w-2xl mx-auto">
              Select the features you'd like to enable for your intelligent workspace
            </p>
          </div>

          {/* Preferences grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-12 animate-stagger-2">
            {preferences.map((pref, index) => (
              <PreferenceCard
                key={pref.id}
                preference={pref}
                onToggle={() => handleToggle(pref.id)}
                index={index}
              />
            ))}
          </div>

          {/* Action buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 animate-stagger-3">
            <button
              onClick={handleContinue}
              className="group relative w-full sm:w-auto px-10 py-4 bg-foreground text-background text-lg font-medium rounded-full hover:shadow-xl transition-all duration-300"
            >
              <span className="relative z-10 flex items-center justify-center gap-2">
                Continue
                <svg
                  className="w-5 h-5 transition-transform duration-300 group-hover:translate-x-1"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                </svg>
              </span>
            </button>
          </div>

          {/* Info text */}
          <p className="text-center text-sm text-foreground/40 mt-8 animate-stagger-4">
            You can modify these settings anytime from your dashboard
          </p>
        </main>
      </div>
    </div>
  );
}

function PreferenceCard({
  preference,
  onToggle,
  index,
}: {
  preference: Preference;
  onToggle: () => void;
  index: number;
}) {
  return (
    <div
      className="group relative bg-surface border-2 border-border rounded-xl p-6 hover:border-foreground/20 transition-all duration-300 cursor-pointer"
      onClick={onToggle}
      style={{
        animationDelay: `${index * 0.1}s`,
      }}
    >
      {/* Colored accent bar */}
      <div
        className="absolute top-0 left-0 w-1 h-full rounded-l-xl transition-all duration-300"
        style={{
          background: preference.color,
          opacity: preference.enabled ? 1 : 0.2,
        }}
      ></div>

      <div className="flex items-start justify-between gap-4 pl-3">
        <div className="flex-1">
          {/* Icon with preference color */}
          <div
            className="w-10 h-10 rounded-full flex items-center justify-center mb-4 transition-all duration-300"
            style={{
              background: `${preference.color}15`,
              opacity: preference.enabled ? 1 : 0.4,
            }}
          >
            <div
              className="w-4 h-4 rounded-full transition-all duration-300"
              style={{
                background: preference.color,
                opacity: preference.enabled ? 1 : 0.5,
              }}
            ></div>
          </div>

          {/* Content */}
          <h3 className="text-lg font-semibold text-foreground mb-2 transition-opacity duration-300"
            style={{ opacity: preference.enabled ? 1 : 0.5 }}
          >
            {preference.title}
          </h3>
          <p className="text-sm text-foreground/60 leading-relaxed transition-opacity duration-300"
            style={{ opacity: preference.enabled ? 1 : 0.4 }}
          >
            {preference.description}
          </p>
        </div>

        {/* Toggle switch */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onToggle();
          }}
          className={`relative flex-shrink-0 inline-flex h-8 w-14 items-center rounded-full transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-surface ${
            preference.enabled ? 'justify-end' : 'justify-start'
          }`}
          style={{
            background: preference.enabled ? preference.color : 'var(--border)',
            focusRingColor: preference.color,
          }}
          aria-label={`Toggle ${preference.title}`}
        >
          <span
            className={`inline-block h-6 w-6 rounded-full bg-surface shadow-lg transition-all duration-300 ${
              preference.enabled ? 'scale-110' : 'scale-100'
            }`}
          />
        </button>
      </div>

      {/* Hover effect overlay */}
      <div
        className="absolute inset-0 rounded-xl opacity-0 group-hover:opacity-5 transition-opacity duration-300 pointer-events-none"
        style={{ background: preference.color }}
      ></div>
    </div>
  );
}
