'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Toast, { ToastProps } from '@/components/Toast';

interface Filter {
  id: string;
  label: string;
  enabled: boolean;
}

interface Event {
  id: number;
  title: string;
  event_date: string;
  event_time: string;
  location: string;
  attendees: string[];
  is_on_calendar: number;
  from_email: string;
  subject: string;
}

interface Todo {
  id: number;
  task: string;
  deadline: string;
  priority: string;
  completed: number;
  from_email: string;
  subject: string;
}

interface Message {
  id: string;
  from_email: string;
  subject: string;
  snippet: string;
  category: string;
  urgency: string;
  timestamp: number;
}

export default function Dashboard() {
  const router = useRouter();
  const [userName, setUserName] = useState('User');
  const [userEmail, setUserEmail] = useState('');
  const [showAccountMenu, setShowAccountMenu] = useState(false);
  const [showFilterMenu, setShowFilterMenu] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [toast, setToast] = useState<Omit<ToastProps, 'onClose'> | null>(null);
  const [loadingEventId, setLoadingEventId] = useState<number | null>(null);
  const [loadingTodoId, setLoadingTodoId] = useState<number | null>(null);
  const [hiddenTodoIds, setHiddenTodoIds] = useState<Set<number>>(new Set());
  const [showCompleted, setShowCompleted] = useState(true);

  const [events, setEvents] = useState<Event[]>([]);
  const [todos, setTodos] = useState<Todo[]>([]);
  const [socialMessages, setSocialMessages] = useState<Message[]>([]);
  const [recruitmentMessages, setRecruitmentMessages] = useState<Message[]>([]);

  const [filters, setFilters] = useState<Filter[]>([
    { id: 'events', label: 'Events', enabled: false },
    { id: 'tasks', label: 'Tasks', enabled: false },
    { id: 'social', label: 'Social', enabled: false },
    { id: 'recruitment', label: 'Recruitment', enabled: false },
  ]);

  useEffect(() => {
    // Check if user is logged in
    const userStr = localStorage.getItem('user');
    if (!userStr) {
      router.push('/authentication');
      return;
    }

    const user = JSON.parse(userStr);
    setUserName(user.name);
    setUserEmail(user.email);

    // Fetch all data
    fetchData();
  }, [router]);

  const showToast = (message: string, type: 'success' | 'error' | 'info') => {
    setToast({ message, type });
  };

  const fetchData = async () => {
    setIsLoading(true);
    try {
      await Promise.all([
        fetchEvents(),
        fetchTodos(),
        fetchSocialMessages(),
        fetchRecruitmentMessages()
      ]);
    } catch (error) {
      console.error('Error fetching data:', error);
      showToast('Failed to load data. Please refresh.', 'error');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  const fetchEvents = async () => {
    const res = await fetch('/api/events');
    const data = await res.json();
    if (data.success) {
      setEvents(data.events);
    }
  };

  const fetchTodos = async () => {
    const res = await fetch('/api/todos');
    const data = await res.json();
    if (data.success) {
      setTodos(data.todos);
    }
  };

  const fetchSocialMessages = async () => {
    const res = await fetch('/api/social');
    const data = await res.json();
    if (data.success) {
      setSocialMessages(data.messages);
    }
  };

  const fetchRecruitmentMessages = async () => {
    const res = await fetch('/api/recruitment');
    const data = await res.json();
    if (data.success) {
      setRecruitmentMessages(data.messages);
    }
  };

  const handleRefresh = () => {
    setIsRefreshing(true);
    fetchData();
  };

  const handleAddToCalendar = async (eventId: number) => {
    setLoadingEventId(eventId);
    try {
      const res = await fetch('/api/calendar/add-event', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ eventId })
      });
      const data = await res.json();

      if (data.success) {
        await fetchEvents();
        showToast('Event added to Google Calendar!', 'success');
      } else {
        // Provide helpful error message
        if (data.error?.includes('authentication') || data.error?.includes('scopes')) {
          showToast('Calendar access not configured. Please re-authenticate the inbox-agents backend.', 'error');
        } else {
          showToast(data.error || 'Failed to add event to calendar', 'error');
        }
      }
    } catch (error) {
      console.error('Error adding to calendar:', error);
      showToast('Network error. Please try again.', 'error');
    } finally {
      setLoadingEventId(null);
    }
  };

  const handleCompleteTodo = async (todoId: number) => {
    setLoadingTodoId(todoId);

    // Optimistic UI update
    setTodos(prev => prev.map(t =>
      t.id === todoId ? { ...t, completed: 1 } : t
    ));

    try {
      const res = await fetch(`/api/todos/${todoId}/complete`, {
        method: 'POST'
      });
      const data = await res.json();

      if (data.success) {
        showToast('Task completed!', 'success');
        // Refresh to get the completed_at timestamp
        await fetchTodos();
      } else {
        // Revert on failure
        setTodos(prev => prev.map(t =>
          t.id === todoId ? { ...t, completed: 0 } : t
        ));
        showToast('Failed to mark task as complete', 'error');
      }
    } catch (error) {
      console.error('Error completing todo:', error);
      // Revert on error
      setTodos(prev => prev.map(t =>
        t.id === todoId ? { ...t, completed: 0 } : t
      ));
      showToast('Network error. Please try again.', 'error');
    } finally {
      setLoadingTodoId(null);
    }
  };

  const handleRemoveTodo = (todoId: number) => {
    setHiddenTodoIds(prev => new Set([...prev, todoId]));
    showToast('Task hidden', 'info');
  };

  const handleLogout = () => {
    localStorage.removeItem('user');
    router.push('/');
  };

  const handleFilterToggle = (id: string) => {
    setFilters(prev =>
      prev.map(filter =>
        filter.id === id ? { ...filter, enabled: !filter.enabled } : filter
      )
    );
  };

  const activeFilters = filters.filter(f => f.enabled).map(f => f.id);
  const showAllCategories = activeFilters.length === 0;

  const shouldShowCategory = (categoryId: string) => {
    return showAllCategories || activeFilters.includes(categoryId);
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const formatCompactDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const formatTime = (timeStr: string) => {
    if (!timeStr) return '';
    const [hours, minutes] = timeStr.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour % 12 || 12;
    return `${displayHour}:${minutes} ${ampm}`;
  };

  const getPriorityColor = (priority: string) => {
    switch (priority.toLowerCase()) {
      case 'high': return 'var(--google-red)';
      case 'medium': return 'var(--google-yellow)';
      case 'low': return 'var(--google-green)';
      default: return 'var(--google-blue)';
    }
  };

  const extractEstimatedTime = (task: string): { cleanTask: string; estimatedTime: string | null } => {
    // Try to extract time patterns like "2 hours", "30 minutes", "1 hour", "30 mins"
    const timePattern = /\((\d+\s*(?:hour|hr|minute|min|mins|hours|hrs)s?)\)/i;
    const match = task.match(timePattern);

    if (match) {
      return {
        cleanTask: task.replace(timePattern, '').trim(),
        estimatedTime: match[1]
      };
    }

    return { cleanTask: task, estimatedTime: null };
  };

  const groupTodos = (todos: Todo[]) => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekFromNow = new Date(today);
    weekFromNow.setDate(weekFromNow.getDate() + 7);

    const groups = {
      overdue: [] as Todo[],
      today: [] as Todo[],
      thisWeek: [] as Todo[],
      later: [] as Todo[]
    };

    todos.forEach(todo => {
      if (hiddenTodoIds.has(todo.id)) return;
      if (todo.completed && !showCompleted) return;

      if (todo.deadline) {
        const deadline = new Date(todo.deadline);
        deadline.setHours(0, 0, 0, 0);

        if (deadline < today && !todo.completed) {
          groups.overdue.push(todo);
        } else if (deadline.getTime() === today.getTime()) {
          groups.today.push(todo);
        } else if (deadline <= weekFromNow) {
          groups.thisWeek.push(todo);
        } else {
          groups.later.push(todo);
        }
      } else {
        groups.later.push(todo);
      }
    });

    return groups;
  };

  const visibleTodos = todos.filter(t => !hiddenTodoIds.has(t));
  const groupedTodos = groupTodos(visibleTodos);
  const hasOverdue = groupedTodos.overdue.length > 0;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="text-center">
          <svg className="animate-spin h-12 w-12 mx-auto mb-4 text-foreground" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <p className="text-foreground/60">Loading your inbox...</p>
        </div>
      </div>
    );
  }

  const TodoItem = ({ todo, isOverdue }: { todo: Todo; isOverdue?: boolean }) => {
    const { cleanTask, estimatedTime } = extractEstimatedTime(todo.task);
    const isLoading = loadingTodoId === todo.id;

    return (
      <div
        className={`bg-background border border-border/50 rounded-xl p-4 hover:border-foreground/20 transition-all ${
          todo.completed ? 'opacity-60' : ''
        } ${isOverdue && !todo.completed ? 'border-l-4' : ''}`}
        style={isOverdue && !todo.completed ? { borderLeftColor: 'var(--google-red)' } : {}}
      >
        <div className="flex items-start gap-3">
          <button
            onClick={() => handleCompleteTodo(todo.id)}
            disabled={todo.completed === 1 || isLoading}
            className="mt-0.5 flex-shrink-0"
          >
            <div className="relative">
              <div className={`w-5 h-5 rounded border-2 transition-all ${
                todo.completed
                  ? 'bg-foreground border-foreground'
                  : 'border-border hover:border-foreground/40'
              }`}>
                {isLoading && (
                  <svg className="animate-spin w-full h-full text-background" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                )}
              </div>
              {todo.completed === 1 && !isLoading && (
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
          </button>

          <div className="flex-1 min-w-0">
            <p className={`text-foreground font-medium ${todo.completed ? 'line-through' : ''}`}>
              <span className="text-foreground/80">{formatCompactDate(todo.deadline || '')}:</span>{' '}
              {cleanTask}
              {estimatedTime && (
                <span className="text-foreground/60 text-sm ml-2">({estimatedTime})</span>
              )}
            </p>
            <div className="flex items-center gap-2 mt-1">
              <span
                className="w-2 h-2 rounded-full"
                style={{ background: getPriorityColor(todo.priority) }}
              ></span>
              <span className="text-xs text-foreground/60 capitalize">{todo.priority} priority</span>
              {isOverdue && !todo.completed && (
                <span className="text-xs px-2 py-0.5 rounded" style={{ background: 'rgba(234, 67, 53, 0.1)', color: 'var(--google-red)' }}>
                  Overdue
                </span>
              )}
            </div>
          </div>

          {todo.completed === 1 && (
            <button
              onClick={() => handleRemoveTodo(todo.id)}
              className="flex-shrink-0 text-foreground/40 hover:text-foreground/80 transition-colors p-1"
              title="Remove from list"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="relative min-h-screen bg-background overflow-hidden py-8 px-4">
      {/* Grid pattern background */}
      <div className="absolute inset-0 bg-grid-pattern opacity-40"></div>

      {/* Toast notification */}
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}

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

            {/* Filter dropdown, Refresh, and Account */}
            <div className="flex items-start gap-3">
              {/* Refresh button */}
              <button
                onClick={handleRefresh}
                disabled={isRefreshing}
                className="px-4 py-3 bg-surface border-2 border-border rounded-xl hover:border-foreground/20 transition-all duration-200 disabled:opacity-50"
                title="Refresh"
              >
                <svg
                  className={`w-5 h-5 text-foreground ${isRefreshing ? 'animate-spin' : ''}`}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              </button>

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
                      <p className="text-xs text-foreground/40 mt-1">{userEmail}</p>
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
                      onClick={handleLogout}
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
            {/* Events */}
            {shouldShowCategory('events') && (
              <div className="animate-stagger-2">
                <h2 className="text-2xl font-semibold text-foreground mb-4 flex items-center gap-3">
                  <div className="w-1 h-8 rounded-full" style={{ background: 'var(--google-blue)' }}></div>
                  Events ({events.length})
                </h2>

                <div className="space-y-3">
                  {events.length === 0 ? (
                    <div className="bg-background border border-border/50 rounded-xl p-6 min-h-[120px] flex items-center justify-center">
                      <p className="text-foreground/40 text-sm">No events found</p>
                    </div>
                  ) : (
                    events.map(event => (
                      <div key={event.id} className="bg-background border border-border/50 rounded-xl p-6 hover:border-foreground/20 transition-all">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1">
                            <h3 className="text-lg font-semibold text-foreground mb-2">{event.title}</h3>
                            <div className="space-y-1 text-sm text-foreground/60">
                              <p className="flex items-center gap-2">
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                </svg>
                                {formatDate(event.event_date)} {event.event_time && `at ${formatTime(event.event_time)}`}
                              </p>
                              {event.location && (
                                <p className="flex items-center gap-2">
                                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                                  </svg>
                                  {event.location}
                                </p>
                              )}
                              <p className="text-xs text-foreground/40">From: {event.from_email}</p>
                            </div>
                          </div>
                          <button
                            onClick={() => handleAddToCalendar(event.id)}
                            disabled={event.is_on_calendar === 1 || loadingEventId === event.id}
                            className="px-4 py-2 bg-surface border-2 border-border rounded-lg hover:border-foreground/20 transition-all text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap flex items-center gap-2"
                          >
                            {loadingEventId === event.id ? (
                              <>
                                <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                                Adding...
                              </>
                            ) : event.is_on_calendar ? (
                              <>✓ On Calendar</>
                            ) : (
                              <>Add to Calendar</>
                            )}
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}

            {/* Tasks with Grouping */}
            {shouldShowCategory('tasks') && (
              <div className="animate-stagger-2">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-2xl font-semibold text-foreground flex items-center gap-3">
                    <div className="w-1 h-8 rounded-full" style={{ background: 'var(--google-green)' }}></div>
                    Tasks ({todos.filter(t => !t.completed && !hiddenTodoIds.has(t.id)).length})
                  </h2>
                  <button
                    onClick={() => setShowCompleted(!showCompleted)}
                    className="text-sm text-foreground/60 hover:text-foreground transition-colors"
                  >
                    {showCompleted ? 'Hide' : 'Show'} completed
                  </button>
                </div>

                <div className="space-y-6">
                  {/* Overdue */}
                  {hasOverdue && (
                    <div>
                      <h3 className="text-sm font-semibold text-foreground/80 mb-2 flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full" style={{ background: 'var(--google-red)' }}></span>
                        Overdue ({groupedTodos.overdue.length})
                      </h3>
                      <div className="space-y-2">
                        {groupedTodos.overdue.map(todo => (
                          <TodoItem key={todo.id} todo={todo} isOverdue={true} />
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Today */}
                  {groupedTodos.today.length > 0 && (
                    <div>
                      <h3 className="text-sm font-semibold text-foreground/80 mb-2">Today ({groupedTodos.today.length})</h3>
                      <div className="space-y-2">
                        {groupedTodos.today.map(todo => (
                          <TodoItem key={todo.id} todo={todo} />
                        ))}
                      </div>
                    </div>
                  )}

                  {/* This Week */}
                  {groupedTodos.thisWeek.length > 0 && (
                    <div>
                      <h3 className="text-sm font-semibold text-foreground/80 mb-2">This Week ({groupedTodos.thisWeek.length})</h3>
                      <div className="space-y-2">
                        {groupedTodos.thisWeek.map(todo => (
                          <TodoItem key={todo.id} todo={todo} />
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Later */}
                  {groupedTodos.later.length > 0 && (
                    <div>
                      <h3 className="text-sm font-semibold text-foreground/80 mb-2">Later ({groupedTodos.later.length})</h3>
                      <div className="space-y-2">
                        {groupedTodos.later.map(todo => (
                          <TodoItem key={todo.id} todo={todo} />
                        ))}
                      </div>
                    </div>
                  )}

                  {visibleTodos.length === 0 && (
                    <div className="bg-background border border-border/50 rounded-xl p-6 min-h-[120px] flex items-center justify-center">
                      <p className="text-foreground/40 text-sm">No tasks found</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Social */}
            {shouldShowCategory('social') && (
              <div className="animate-stagger-2">
                <h2 className="text-2xl font-semibold text-foreground mb-4 flex items-center gap-3">
                  <div className="w-1 h-8 rounded-full" style={{ background: 'var(--google-yellow)' }}></div>
                  Social ({socialMessages.length})
                </h2>

                <div className="space-y-3">
                  {socialMessages.length === 0 ? (
                    <div className="bg-background border border-border/50 rounded-xl p-6 min-h-[120px] flex items-center justify-center">
                      <p className="text-foreground/40 text-sm">No social messages found</p>
                    </div>
                  ) : (
                    socialMessages.slice(0, 10).map(message => (
                      <div key={message.id} className="bg-background border border-border/50 rounded-xl p-6 hover:border-foreground/20 transition-all">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1">
                            <h3 className="text-lg font-semibold text-foreground mb-1">{message.subject}</h3>
                            <p className="text-sm text-foreground/60 mb-2">From: {message.from_email}</p>
                            <p className="text-sm text-foreground/80 line-clamp-2">{message.snippet}</p>
                            <div className="mt-2 flex items-center gap-2">
                              <span
                                className="text-xs px-2 py-1 rounded"
                                style={{
                                  background: message.urgency === 'high' ? 'rgba(234, 67, 53, 0.1)' :
                                             message.urgency === 'medium' ? 'rgba(251, 188, 5, 0.1)' :
                                             'rgba(52, 168, 83, 0.1)',
                                  color: message.urgency === 'high' ? 'var(--google-red)' :
                                        message.urgency === 'medium' ? 'var(--google-yellow)' :
                                        'var(--google-green)'
                                }}
                              >
                                {message.urgency} urgency
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}

            {/* Recruitment */}
            {shouldShowCategory('recruitment') && (
              <div className="animate-stagger-2">
                <h2 className="text-2xl font-semibold text-foreground mb-4 flex items-center gap-3">
                  <div className="w-1 h-8 rounded-full" style={{ background: 'var(--google-blue)' }}></div>
                  Recruitment ({recruitmentMessages.length})
                </h2>

                <div className="space-y-3">
                  {recruitmentMessages.length === 0 ? (
                    <div className="bg-background border border-border/50 rounded-xl p-6 min-h-[120px] flex items-center justify-center">
                      <p className="text-foreground/40 text-sm">No recruitment opportunities found</p>
                    </div>
                  ) : (
                    recruitmentMessages.slice(0, 10).map(message => (
                      <div key={message.id} className="bg-background border border-border/50 rounded-xl p-6 hover:border-foreground/20 transition-all">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1">
                            <h3 className="text-lg font-semibold text-foreground mb-1">{message.subject}</h3>
                            <p className="text-sm text-foreground/60 mb-2">From: {message.from_email}</p>
                            <p className="text-sm text-foreground/80 line-clamp-2">{message.snippet}</p>
                            <div className="mt-2 flex items-center gap-2">
                              <span
                                className="text-xs px-2 py-1 rounded"
                                style={{
                                  background: message.urgency === 'high' ? 'rgba(234, 67, 53, 0.1)' :
                                             message.urgency === 'medium' ? 'rgba(251, 188, 5, 0.1)' :
                                             'rgba(52, 168, 83, 0.1)',
                                  color: message.urgency === 'high' ? 'var(--google-red)' :
                                        message.urgency === 'medium' ? 'var(--google-yellow)' :
                                        'var(--google-green)'
                                }}
                              >
                                {message.urgency} urgency
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Empty state when filters show no categories */}
          {!shouldShowCategory('events') && !shouldShowCategory('tasks') && !shouldShowCategory('social') && !shouldShowCategory('recruitment') && (
            <div className="text-center py-16">
              <p className="text-foreground/40 text-lg">No categories match your filters</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
