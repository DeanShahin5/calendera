'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function Preferences() {
  const router = useRouter();

  const [preferences, setPreferences] = useState({
    gmail: true,
    calendar: true,
    dailySummary: true,
    taskReminders: true,
    smartCategorization: true,
    priorityNotifications: false,
  });

  const handleToggle = (key: keyof typeof preferences) => {
    setPreferences(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const handleContinue = () => {
    // Frontend-only navigation - you can change this route as needed
    console.log('User preferences:', preferences);
    router.push('/'); // Navigate to home or next page
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-gradient-to-br from-blue-50 via-white to-purple-50 px-4 py-12 dark:from-gray-900 dark:via-gray-800 dark:to-blue-950">
      {/* Animated background orbs */}
      <div className="absolute -top-40 -right-40 h-80 w-80 rounded-full bg-blue-400/20 blur-3xl animate-pulse dark:bg-blue-600/10"></div>
      <div className="absolute -bottom-40 -left-40 h-80 w-80 rounded-full bg-purple-400/20 blur-3xl animate-pulse dark:bg-purple-600/10" style={{ animationDelay: '1s' }}></div>

      {/* Main content card */}
      <main className="relative z-10 w-full max-w-2xl">
        <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 p-8 sm:p-10 space-y-8">
          {/* Header */}
          <div className="text-center space-y-2">
            <h1 className="text-3xl sm:text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent dark:from-blue-400 dark:to-purple-400">
              Customize Your Experience
            </h1>
            <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400">
              Select the features you'd like to enable for your MailMind account
            </p>
            <div className="flex items-center justify-center gap-2 pt-1">
              <div className="h-0.5 w-8 bg-gradient-to-r from-transparent via-blue-500 to-transparent rounded-full dark:via-blue-400"></div>
              <div className="h-0.5 w-6 bg-gradient-to-r from-transparent via-purple-500 to-transparent rounded-full dark:via-purple-400"></div>
              <div className="h-0.5 w-8 bg-gradient-to-r from-transparent via-blue-500 to-transparent rounded-full dark:via-blue-400"></div>
            </div>
          </div>

          {/* Preferences form */}
          <div className="space-y-4">
            {/* Gmail Connection */}
            <PreferenceToggle
              title="Connect Gmail"
              description="Sync your Gmail inbox for smart organization and filtering"
              icon="📧"
              enabled={preferences.gmail}
              onToggle={() => handleToggle('gmail')}
            />

            {/* Calendar Connection */}
            <PreferenceToggle
              title="Connect Google Calendar"
              description="Integrate your calendar for schedule optimization"
              icon="📅"
              enabled={preferences.calendar}
              onToggle={() => handleToggle('calendar')}
            />

            {/* Daily Summary */}
            <PreferenceToggle
              title="Daily Summary Emails"
              description="Receive a daily digest of important emails and tasks"
              icon="📊"
              enabled={preferences.dailySummary}
              onToggle={() => handleToggle('dailySummary')}
            />

            {/* Task Reminders */}
            <PreferenceToggle
              title="Task Reminders"
              description="Get notified about upcoming deadlines and tasks"
              icon="⏰"
              enabled={preferences.taskReminders}
              onToggle={() => handleToggle('taskReminders')}
            />

            {/* Smart Categorization */}
            <PreferenceToggle
              title="Smart Categorization"
              description="Automatically organize emails into intelligent categories"
              icon="🏷️"
              enabled={preferences.smartCategorization}
              onToggle={() => handleToggle('smartCategorization')}
            />

            {/* Priority Notifications */}
            <PreferenceToggle
              title="Priority Notifications"
              description="Only notify you about high-priority emails"
              icon="🔔"
              enabled={preferences.priorityNotifications}
              onToggle={() => handleToggle('priorityNotifications')}
            />
          </div>

          {/* Continue button */}
          <div className="pt-4">
            <button
              onClick={handleContinue}
              className="group relative w-full px-8 py-4 bg-gradient-to-r from-blue-600 to-purple-600 text-white text-lg font-semibold rounded-xl shadow-lg transition-all duration-300 hover:scale-[1.02] hover:shadow-2xl hover:shadow-blue-500/50 dark:hover:shadow-blue-400/30 active:scale-[0.98]"
            >
              {/* Button glow effect */}
              <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-blue-400 to-purple-400 opacity-0 blur-xl transition-opacity duration-300 group-hover:opacity-70 dark:group-hover:opacity-50"></div>

              {/* Button content */}
              <span className="relative flex items-center justify-center gap-2">
                Continue
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

          {/* Info text */}
          <p className="text-xs text-center text-gray-500 dark:text-gray-500 leading-relaxed">
            You can change these preferences anytime in your account settings
          </p>
        </div>
      </main>
    </div>
  );
}

// Reusable toggle component
function PreferenceToggle({
  title,
  description,
  icon,
  enabled,
  onToggle,
}: {
  title: string;
  description: string;
  icon: string;
  enabled: boolean;
  onToggle: () => void;
}) {
  return (
    <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl border border-gray-200 dark:border-gray-600 hover:border-blue-300 dark:hover:border-blue-500 transition-all duration-200">
      <div className="flex items-start gap-3 flex-1">
        <span className="text-2xl mt-0.5">{icon}</span>
        <div className="flex-1">
          <h3 className="font-semibold text-gray-900 dark:text-white text-sm sm:text-base">
            {title}
          </h3>
          <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 mt-0.5">
            {description}
          </p>
        </div>
      </div>

      {/* Toggle switch */}
      <button
        onClick={onToggle}
        className={`relative inline-flex h-7 w-12 sm:h-8 sm:w-14 items-center rounded-full transition-colors duration-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800 ${
          enabled
            ? 'bg-gradient-to-r from-blue-600 to-purple-600'
            : 'bg-gray-300 dark:bg-gray-600'
        }`}
        aria-label={`Toggle ${title}`}
      >
        <span
          className={`inline-block h-5 w-5 sm:h-6 sm:w-6 transform rounded-full bg-white shadow-lg transition-transform duration-300 ${
            enabled ? 'translate-x-6 sm:translate-x-7' : 'translate-x-1'
          }`}
        />
      </button>
    </div>
  );
}
