'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

interface Filter {
  id: string;
  label: string;
  enabled: boolean;
}

interface CategoryData {
  id: string;
  title: string;
  items: string[];
}

export default function Dashboard() {
  const router = useRouter();
  const [userName] = useState('User'); // Will be replaced with Google Auth data
  const [showAccountMenu, setShowAccountMenu] = useState(false);
  const [showFilterMenu, setShowFilterMenu] = useState(false);

  const [filters, setFilters] = useState<Filter[]>([
    { id: 'events', label: 'Events', enabled: false },
    { id: 'tasks', label: 'Tasks', enabled: false },
    { id: 'social', label: 'Social', enabled: false },
    { id: 'promotion', label: 'Promotion', enabled: false },
    { id: 'recruitment', label: 'Recruitment', enabled: false },
  ]);

  const handleFilterToggle = (id: string) => {
    setFilters(prev =>
      prev.map(filter =>
        filter.id === id ? { ...filter, enabled: !filter.enabled } : filter
      )
    );
  };

  const activeFilters = filters.filter(f => f.enabled).map(f => f.id);
  const showAllCategories = activeFilters.length === 0;

  // Placeholder data - will be populated by AI agents later
  const categories: CategoryData[] = [
    { id: 'events', title: 'Events', items: [] },
    { id: 'tasks', title: 'Tasks', items: [] },
    { id: 'social', title: 'Social', items: [] },
    { id: 'promotion', title: 'Promotion', items: [] },
    { id: 'recruitment', title: 'Recruitment', items: [] },
  ];

  const visibleCategories = showAllCategories
    ? categories
    : categories.filter(cat => activeFilters.includes(cat.id));

  return (
    <div className="relative min-h-screen bg-background overflow-hidden py-8 px-4">
      {/* Grid pattern background */}
      <div className="absolute inset-0 bg-grid-pattern opacity-40"></div>

      {/* Main content container */}
      <div className="relative z-10 max-w-7xl mx-auto">
        <div className="bg-black border-4 border-surface rounded-2xl p-10 shadow-2xl animate-bounce-in">

          {/* Header section with welcome and filters */}
          <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-6 mb-8 pb-8 border-b border-border/50">
            {/* Welcome message */}
            <div>
              <h1 style={{fontFamily: 'var(--font-serif)'}} className="text-4xl md:text-5xl text-foreground mb-2">
                Welcome, {userName}!
              </h1>
              <p className="text-foreground/60">Here's your organized inbox</p>
            </div>

            {/* Filter dropdown and Account */}
            <div className="flex items-start gap-3">
              {/* Filter dropdown */}
              <div className="relative z-50">
                <button
                  onClick={() => setShowFilterMenu(!showFilterMenu)}
                  className="flex items-center gap-3 px-5 py-3 bg-surface border-2 border-border rounded-xl hover:border-foreground/20 transition-all duration-200 min-w-[200px] justify-between"
                >
                  <div className="flex items-center gap-2">
                    <svg className="w-5 h-5 text-foreground/60" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
                    </svg>
                    <span className="text-sm font-semibold text-foreground">
                      {activeFilters.length === 0 ? 'All Categories' : `${activeFilters.length} Selected`}
                    </span>
                  </div>
                  <svg
                    className={`w-4 h-4 text-foreground/60 transition-transform duration-200 ${
                      showFilterMenu ? 'rotate-180' : ''
                    }`}
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>

                {/* Filter dropdown menu */}
                {showFilterMenu && (
                  <div className="absolute right-0 mt-2 w-64 bg-surface border-2 border-border rounded-xl shadow-2xl p-4 space-y-3 animate-stagger-1 z-50">
                    {filters.map((filter) => (
                      <label
                        key={filter.id}
                        className="flex items-center gap-2 cursor-pointer group"
                      >
                        <div className="relative">
                          <input
                            type="checkbox"
                            checked={filter.enabled}
                            onChange={() => handleFilterToggle(filter.id)}
                            className="w-5 h-5 rounded border-2 border-border appearance-none checked:bg-foreground checked:border-foreground cursor-pointer transition-all duration-200"
                          />
                          {filter.enabled && (
                            <svg
                              className="absolute top-0 left-0 w-5 h-5 text-background pointer-events-none"
                              fill="none"
                              viewBox="0 0 24 24"
                              stroke="currentColor"
                            >
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                            </svg>
                          )}
                        </div>
                        <span className="text-sm text-foreground group-hover:text-foreground/70 transition-colors duration-200">
                          {filter.label}
                        </span>
                      </label>
                    ))}
                  </div>
                )}
              </div>

              {/* Account button - just initials */}
              <div className="relative z-50">
                <button
                  onClick={() => setShowAccountMenu(!showAccountMenu)}
                  className="w-12 h-12 rounded-full bg-surface border-2 border-border hover:border-foreground/20 flex items-center justify-center text-foreground font-semibold text-lg transition-all duration-200"
                >
                  {userName.charAt(0)}
                </button>

                {/* Account dropdown menu */}
                {showAccountMenu && (
                  <div className="absolute right-0 mt-2 w-64 bg-surface border-2 border-border rounded-xl shadow-xl overflow-hidden animate-stagger-1 z-50">
                    <div className="p-4 border-b border-border">
                      <p className="text-sm text-foreground/60 mb-1">Signed in as</p>
                      <p className="font-semibold text-foreground">{userName}</p>
                    </div>
                    <button
                      onClick={() => router.push('/preferences')}
                      className="w-full px-4 py-3 text-left text-foreground hover:bg-foreground/5 transition-colors duration-200 flex items-center gap-3"
                    >
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                      Preferences
                    </button>
                    <button
                      className="w-full px-4 py-3 text-left text-foreground hover:bg-foreground/5 transition-colors duration-200 flex items-center gap-3"
                    >
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                      </svg>
                      Switch Account
                    </button>
                    <button
                      className="w-full px-4 py-3 text-left text-foreground/60 hover:bg-foreground/5 transition-colors duration-200 flex items-center gap-3 border-t border-border"
                    >
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                      </svg>
                      Sign Out
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Category sections */}
          <div className="space-y-8">
            {visibleCategories.map((category, index) => (
              <div
                key={category.id}
                className="animate-stagger-2"
                style={{ animationDelay: `${index * 0.1}s` }}
              >
                <h2 className="text-2xl font-semibold text-foreground mb-4 flex items-center gap-3">
                  <div
                    className="w-1 h-8 rounded-full"
                    style={{
                      background:
                        category.id === 'events'
                          ? 'var(--google-blue)'
                          : category.id === 'tasks'
                          ? 'var(--google-green)'
                          : category.id === 'social'
                          ? 'var(--google-yellow)'
                          : category.id === 'promotion'
                          ? 'var(--google-red)'
                          : 'var(--google-blue)',
                    }}
                  ></div>
                  {category.title}
                </h2>

                {/* Placeholder for AI-generated content */}
                <div className="bg-background border border-border/50 rounded-xl p-6 min-h-[120px] flex items-center justify-center">
                  <p className="text-foreground/40 text-sm">
                    Content will be populated by AI agents
                  </p>
                </div>
              </div>
            ))}
          </div>

          {/* Empty state when filters show no categories */}
          {visibleCategories.length === 0 && (
            <div className="text-center py-16">
              <p className="text-foreground/40 text-lg">No categories match your filters</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
