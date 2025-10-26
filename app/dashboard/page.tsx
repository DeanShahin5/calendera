'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Toast, { ToastProps } from '@/components/Toast';
import ChatBot from '@/components/ChatBot';

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
  read?: number;
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
  const [loadingSocialId, setLoadingSocialId] = useState<string | null>(null);
  const [loadingRecruitmentId, setLoadingRecruitmentId] = useState<string | null>(null);
  const [hiddenTodoIds, setHiddenTodoIds] = useState<Set<number>>(new Set());
  const [hiddenSocialIds, setHiddenSocialIds] = useState<Set<string>>(new Set());
  const [hiddenRecruitmentIds, setHiddenRecruitmentIds] = useState<Set<string>>(new Set());
  const [showCompleted, setShowCompleted] = useState(true);
  const [expandedSpamSenders, setExpandedSpamSenders] = useState<Set<string>>(new Set());

  const [events, setEvents] = useState<Event[]>([]);
  const [todos, setTodos] = useState<Todo[]>([]);
  const [socialMessages, setSocialMessages] = useState<Message[]>([]);
  const [promotionsMessages, setPromotionsMessages] = useState<Message[]>([]);
  const [recruitmentMessages, setRecruitmentMessages] = useState<Message[]>([]);

  // Cursor trail effect - only on background
  useEffect(() => {
    const colors = [
      'rgba(66, 133, 244, 0.6)',
      'rgba(234, 67, 53, 0.6)',
      'rgba(251, 188, 5, 0.6)',
      'rgba(52, 168, 83, 0.6)',
    ];

    let colorIndex = 0;

    const handleMouseMove = (e: MouseEvent) => {
      // Check if mouse is over the main content box
      const mainContent = document.querySelector('.main-content-box');
      if (mainContent) {
        const rect = mainContent.getBoundingClientRect();
        const isOverContent = e.clientX >= rect.left &&
                             e.clientX <= rect.right &&
                             e.clientY >= rect.top &&
                             e.clientY <= rect.bottom;

        // Only create trail if NOT over main content
        if (!isOverContent) {
          const trail = document.createElement('div');
          trail.className = 'cursor-trail';
          trail.style.left = e.pageX + 'px';
          trail.style.top = e.pageY + 'px';
          trail.style.background = colors[colorIndex];
          colorIndex = (colorIndex + 1) % colors.length;

          document.body.appendChild(trail);

          setTimeout(() => {
            trail.remove();
          }, 1000);
        }
      }
    };

    document.addEventListener('mousemove', handleMouseMove);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
    };
  }, []);

  const [filters, setFilters] = useState<Filter[]>([
    { id: 'events', label: 'Events', enabled: false },
    { id: 'tasks', label: 'Tasks', enabled: false },
    { id: 'social', label: 'Social', enabled: false },
    { id: 'promotions', label: 'Spam', enabled: false },
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
        fetchPromotionsMessages(),
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

  const fetchPromotionsMessages = async () => {
    const res = await fetch('/api/promotions');
    const data = await res.json();
    if (data.success) {
      setPromotionsMessages(data.messages);
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

    // Find current completion status
    const currentTodo = todos.find(t => t.id === todoId);
    const newCompletedStatus = currentTodo?.completed === 1 ? 0 : 1;

    // Optimistic UI update - toggle completion
    setTodos(prev => prev.map(t =>
      t.id === todoId ? { ...t, completed: newCompletedStatus } : t
    ));

    try {
      const res = await fetch(`/api/todos/${todoId}/complete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ completed: newCompletedStatus })
      });
      const data = await res.json();

      if (data.success) {
        showToast(newCompletedStatus === 1 ? 'Task completed!' : 'Task marked as incomplete', 'success');
        // Refresh to get the updated timestamp
        await fetchTodos();
      } else {
        // Revert on failure
        setTodos(prev => prev.map(t =>
          t.id === todoId ? { ...t, completed: currentTodo?.completed || 0 } : t
        ));
        showToast('Failed to update task', 'error');
      }
    } catch (error) {
      console.error('Error updating todo:', error);
      // Revert on error
      setTodos(prev => prev.map(t =>
        t.id === todoId ? { ...t, completed: currentTodo?.completed || 0 } : t
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

  const handleCompleteSocial = async (messageId: string) => {
    setLoadingSocialId(messageId);

    const currentMessage = socialMessages.find(m => m.id === messageId);
    const newReadStatus = currentMessage?.read === 1 ? 0 : 1;

    // Optimistic UI update
    setSocialMessages(prev => prev.map(m =>
      m.id === messageId ? { ...m, read: newReadStatus } : m
    ));

    try {
      const res = await fetch(`/api/social/${messageId}/complete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ completed: newReadStatus })
      });
      const data = await res.json();

      if (data.success) {
        showToast(newReadStatus === 1 ? 'Message marked as read' : 'Message marked as unread', 'success');
        await fetchSocialMessages();
      } else {
        setSocialMessages(prev => prev.map(m =>
          m.id === messageId ? { ...m, read: currentMessage?.read || 0 } : m
        ));
        showToast('Failed to update message', 'error');
      }
    } catch (error) {
      console.error('Error updating social message:', error);
      setSocialMessages(prev => prev.map(m =>
        m.id === messageId ? { ...m, read: currentMessage?.read || 0 } : m
      ));
      showToast('Network error. Please try again.', 'error');
    } finally {
      setLoadingSocialId(null);
    }
  };

  const handleRemoveSocial = (messageId: string) => {
    setHiddenSocialIds(prev => new Set([...prev, messageId]));
    showToast('Message hidden', 'info');
  };

  const handleCompleteRecruitment = async (messageId: string) => {
    setLoadingRecruitmentId(messageId);

    const currentMessage = recruitmentMessages.find(m => m.id === messageId);
    const newReadStatus = currentMessage?.read === 1 ? 0 : 1;

    // Optimistic UI update
    setRecruitmentMessages(prev => prev.map(m =>
      m.id === messageId ? { ...m, read: newReadStatus } : m
    ));

    try {
      const res = await fetch(`/api/recruitment/${messageId}/complete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ completed: newReadStatus })
      });
      const data = await res.json();

      if (data.success) {
        showToast(newReadStatus === 1 ? 'Message marked as read' : 'Message marked as unread', 'success');
        await fetchRecruitmentMessages();
      } else {
        setRecruitmentMessages(prev => prev.map(m =>
          m.id === messageId ? { ...m, read: currentMessage?.read || 0 } : m
        ));
        showToast('Failed to update message', 'error');
      }
    } catch (error) {
      console.error('Error updating recruitment message:', error);
      setRecruitmentMessages(prev => prev.map(m =>
        m.id === messageId ? { ...m, read: currentMessage?.read || 0 } : m
      ));
      showToast('Network error. Please try again.', 'error');
    } finally {
      setLoadingRecruitmentId(null);
    }
  };

  const handleRemoveRecruitment = (messageId: string) => {
    setHiddenRecruitmentIds(prev => new Set([...prev, messageId]));
    showToast('Message hidden', 'info');
  };

  const toggleSpamSender = (sender: string) => {
    setExpandedSpamSenders(prev => {
      const newSet = new Set(prev);
      if (newSet.has(sender)) {
        newSet.delete(sender);
      } else {
        newSet.add(sender);
      }
      return newSet;
    });
  };

  const groupSpamBySender = (messages: Message[]) => {
    const groups = new Map<string, Message[]>();
    messages.forEach(msg => {
      const sender = msg.from_email;
      if (!groups.has(sender)) groups.set(sender, []);
      groups.get(sender)!.push(msg);
    });
    return Array.from(groups.entries())
      .map(([sender, msgs]) => ({
        sender,
        messages: msgs,
        count: msgs.length
      }))
      .sort((a, b) => b.count - a.count); // Sort by count, most messages first
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

  const visibleTodos = todos.filter(t => !hiddenTodoIds.has(t.id));
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
        className={`bg-background border border-border/50 rounded-2xl p-5 hover:border-foreground/20 hover:shadow-[0_10px_40px_-10px_rgba(255,255,255,0.3)] transition-all duration-300 ${
          todo.completed ? 'opacity-60' : ''
        } ${isOverdue && !todo.completed ? 'border-l-4' : ''}`}
        style={isOverdue && !todo.completed ? { borderLeftColor: 'var(--google-red)' } : {}}
      >
        <div className="flex items-start gap-4">
          <button
            onClick={() => handleCompleteTodo(todo.id)}
            disabled={isLoading}
            className="mt-1 flex-shrink-0"
          >
            <div className="relative">
              <div className={`w-6 h-6 rounded-full border-2 transition-all ${
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
                  className="absolute top-0 left-0 w-6 h-6 text-background pointer-events-none"
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
            <p className={`text-base text-foreground leading-relaxed ${todo.completed ? 'line-through' : ''}`} style={{fontFamily: 'system-ui, -apple-system, sans-serif'}}>
              <span className="text-foreground/80 font-bold">{formatCompactDate(todo.deadline || '')}:</span>{' '}
              {cleanTask}
              {estimatedTime && (
                <span className="text-foreground/60 text-sm ml-2">({estimatedTime})</span>
              )}
            </p>
            <div className="flex items-center gap-2 mt-2">
              <span
                className="w-2.5 h-2.5 rounded-full"
                style={{ background: getPriorityColor(todo.priority) }}
              ></span>
              <span className="text-sm text-foreground/60 capitalize font-medium">{todo.priority} priority</span>
              {isOverdue && !todo.completed && (
                <span className="text-sm px-3 py-1 rounded-lg font-semibold" style={{ background: 'rgba(234, 67, 53, 0.15)', color: 'var(--google-red)' }}>
                  Overdue
                </span>
              )}
            </div>
          </div>

          {todo.completed === 1 && (
            <button
              onClick={() => handleRemoveTodo(todo.id)}
              className="flex-shrink-0 text-foreground/40 hover:text-foreground/80 transition-colors p-2"
              title="Remove from list"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
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

      {/* Evenly distributed color overlay - large blended gradients */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {/* Large overlapping color fields for smooth blending */}
        <div className="absolute top-0 left-0 w-full h-1/2 bg-gradient-to-br from-[rgb(66,133,244)]/8 via-transparent to-transparent blur-3xl"></div>
        <div className="absolute top-0 right-0 w-full h-1/2 bg-gradient-to-bl from-[rgb(234,67,53)]/8 via-transparent to-transparent blur-3xl"></div>
        <div className="absolute top-1/4 left-0 w-2/3 h-2/3 bg-gradient-to-r from-[rgb(251,188,5)]/8 via-transparent to-transparent blur-3xl"></div>
        <div className="absolute top-1/4 right-0 w-2/3 h-2/3 bg-gradient-to-l from-[rgb(52,168,83)]/8 via-transparent to-transparent blur-3xl"></div>
        <div className="absolute bottom-0 left-0 w-full h-1/2 bg-gradient-to-tr from-[rgb(52,168,83)]/8 via-transparent to-transparent blur-3xl"></div>
        <div className="absolute bottom-0 right-0 w-full h-1/2 bg-gradient-to-tl from-[rgb(66,133,244)]/8 via-transparent to-transparent blur-3xl"></div>

        {/* Subtle moving blobs for animation */}
        <div className="absolute top-10 left-10 w-96 h-96 bg-gradient-to-br from-[rgb(66,133,244)]/10 to-transparent rounded-full blur-3xl animate-blob"></div>
        <div className="absolute top-20 right-20 w-80 h-80 bg-gradient-to-br from-[rgb(234,67,53)]/10 to-transparent rounded-full blur-3xl animate-blob animation-delay-2000"></div>
        <div className="absolute bottom-20 left-1/4 w-88 h-88 bg-gradient-to-br from-[rgb(251,188,5)]/10 to-transparent rounded-full blur-3xl animate-blob animation-delay-4000"></div>
        <div className="absolute bottom-10 right-1/3 w-76 h-76 bg-gradient-to-br from-[rgb(52,168,83)]/10 to-transparent rounded-full blur-3xl animate-blob animation-delay-1000"></div>
        <div className="absolute top-1/2 left-1/2 w-64 h-64 bg-gradient-to-br from-[rgb(66,133,244)]/10 to-transparent rounded-full blur-3xl animate-blob animation-delay-3000"></div>
      </div>

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
        <div className="main-content-box bg-black border-2 border-white/40 rounded-3xl p-10 shadow-[0_20px_60px_-15px_rgba(66,133,244,0.3),0_10px_30px_-10px_rgba(234,67,53,0.2),0_5px_15px_-5px_rgba(251,188,5,0.2)] animate-bounce-in">

          {/* Header section with welcome and filters */}
          <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-6 mb-10 pb-8 border-b border-white/10">
            {/* Welcome message */}
            <div>
              <h1 style={{fontFamily: 'var(--font-serif)'}} className="text-4xl md:text-5xl text-foreground mb-3">
                Welcome, {userName}!
              </h1>
              <p className="text-foreground/80 text-xl font-medium">Here's your organized inbox</p>
            </div>

            {/* Filter dropdown, Refresh, and Account */}
            <div className="flex items-start gap-3">
              {/* Refresh button */}
              <button
                onClick={handleRefresh}
                disabled={isRefreshing}
                className="px-4 py-3 bg-surface border border-white/20 rounded-xl hover:border-[rgb(66,133,244)] hover:shadow-[0_0_20px_rgba(66,133,244,0.4)] transition-all duration-200 disabled:opacity-50"
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
                  className="flex items-center gap-3 px-5 py-3 bg-surface border border-white/20 rounded-xl hover:border-[rgb(251,188,5)] hover:shadow-[0_0_20px_rgba(251,188,5,0.4)] transition-all duration-200 min-w-[200px] justify-between"
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
                  className="w-14 h-14 rounded-full bg-gradient-to-br from-[rgb(66,133,244)] via-[rgb(251,188,5)] to-[rgb(234,67,53)] border-2 border-white/40 hover:shadow-[0_0_30px_rgba(66,133,244,0.8),0_0_60px_rgba(234,67,53,0.4)] hover:scale-110 flex items-center justify-center text-white font-bold text-xl transition-all duration-300"
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
                <h2 className="text-4xl font-bold text-foreground mb-5 flex items-center gap-4">
                  <div className="w-1.5 h-10 rounded-full bg-gradient-to-b from-[rgb(66,133,244)] to-[rgb(52,168,83)] shadow-[0_0_15px_rgba(66,133,244,0.6)]"></div>
                  Events ({events.length})
                </h2>

                <div className="space-y-4">
                  {events.length === 0 ? (
                    <div className="bg-background border border-border/50 rounded-2xl p-8 min-h-[140px] flex items-center justify-center">
                      <p className="text-foreground/40 text-lg">No events found</p>
                    </div>
                  ) : (
                    events.map(event => (
                      <div key={event.id} className="bg-background border border-border/50 rounded-2xl p-7 hover:border-foreground/20 hover:shadow-[0_10px_40px_-10px_rgba(255,255,255,0.3)] transition-all duration-300">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1">
                            <h3 className="text-xl font-bold text-foreground mb-3 tracking-tight" style={{fontFamily: 'system-ui, -apple-system, sans-serif'}}>{event.title}</h3>
                            <div className="space-y-2 text-base text-foreground/70">
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
                              <p className="text-sm text-foreground/50 font-medium">From: {event.from_email}</p>
                            </div>
                          </div>
                          <button
                            onClick={() => handleAddToCalendar(event.id)}
                            disabled={event.is_on_calendar === 1 || loadingEventId === event.id}
                            className="px-5 py-3 bg-surface border border-white/20 rounded-xl hover:border-[rgb(66,133,244)] hover:shadow-[0_0_20px_rgba(66,133,244,0.4)] transition-all text-base font-semibold disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap flex items-center gap-2"
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
                <div className="flex items-center justify-between mb-5">
                  <h2 className="text-4xl font-bold text-foreground flex items-center gap-4">
                    <div className="w-1.5 h-10 rounded-full bg-gradient-to-b from-[rgb(52,168,83)] to-[rgb(251,188,5)] shadow-[0_0_15px_rgba(52,168,83,0.6)]"></div>
                    Tasks ({todos.filter(t => !t.completed && !hiddenTodoIds.has(t.id)).length})
                  </h2>
                  <button
                    onClick={() => setShowCompleted(!showCompleted)}
                    className="text-lg font-semibold text-foreground/60 hover:text-foreground transition-colors px-4 py-2 rounded-lg hover:bg-foreground/5"
                  >
                    {showCompleted ? 'Hide' : 'Show'} completed
                  </button>
                </div>

                <div className="space-y-6">
                  {/* Overdue */}
                  {hasOverdue && (
                    <div>
                      <h3 className="text-lg font-bold text-foreground/90 mb-3 flex items-center gap-3" style={{fontFamily: 'system-ui, -apple-system, sans-serif'}}>
                        <span className="w-3 h-3 rounded-full" style={{ background: 'var(--google-red)' }}></span>
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
                      <h3 className="text-lg font-bold text-foreground/90 mb-3" style={{fontFamily: 'system-ui, -apple-system, sans-serif'}}>Today ({groupedTodos.today.length})</h3>
                      <div className="space-y-3">
                        {groupedTodos.today.map(todo => (
                          <TodoItem key={todo.id} todo={todo} />
                        ))}
                      </div>
                    </div>
                  )}

                  {/* This Week */}
                  {groupedTodos.thisWeek.length > 0 && (
                    <div>
                      <h3 className="text-lg font-bold text-foreground/90 mb-3" style={{fontFamily: 'system-ui, -apple-system, sans-serif'}}>This Week ({groupedTodos.thisWeek.length})</h3>
                      <div className="space-y-3">
                        {groupedTodos.thisWeek.map(todo => (
                          <TodoItem key={todo.id} todo={todo} />
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Later */}
                  {groupedTodos.later.length > 0 && (
                    <div>
                      <h3 className="text-lg font-bold text-foreground/90 mb-3" style={{fontFamily: 'system-ui, -apple-system, sans-serif'}}>Later ({groupedTodos.later.length})</h3>
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
                <h2 className="text-4xl font-bold text-foreground mb-5 flex items-center gap-4">
                  <div className="w-1.5 h-10 rounded-full bg-gradient-to-b from-[rgb(251,188,5)] to-[rgb(234,67,53)] shadow-[0_0_15px_rgba(251,188,5,0.6)]"></div>
                  Social ({socialMessages.filter(m => !hiddenSocialIds.has(m.id)).length})
                </h2>

                <div className="space-y-4">
                  {socialMessages.filter(m => !hiddenSocialIds.has(m.id)).length === 0 ? (
                    <div className="bg-background border border-border/50 rounded-2xl p-8 min-h-[140px] flex items-center justify-center">
                      <p className="text-foreground/40 text-lg">No social messages found</p>
                    </div>
                  ) : (
                    socialMessages.filter(m => !hiddenSocialIds.has(m.id)).map(message => {
                      const isRead = message.read === 1;
                      const isLoading = loadingSocialId === message.id;
                      return (
                        <div
                          key={message.id}
                          className={`bg-surface border-2 rounded-2xl p-6 transition-all duration-300 hover:shadow-[0_10px_40px_-10px_rgba(255,255,255,0.3)] ${
                            isRead
                              ? 'border-foreground/30 bg-foreground/5'
                              : 'border-border hover:border-foreground/20'
                          }`}
                        >
                          <div className="flex items-start gap-4">
                            {/* Checkbox */}
                            <button
                              onClick={() => handleCompleteSocial(message.id)}
                              disabled={isLoading}
                              className="mt-1 flex-shrink-0"
                            >
                              <div className="relative">
                                <div className={`w-6 h-6 rounded-full border-2 transition-all ${
                                  isRead
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
                                {isRead && !isLoading && (
                                  <svg
                                    className="absolute top-0 left-0 w-6 h-6 text-background pointer-events-none"
                                    fill="none"
                                    viewBox="0 0 24 24"
                                    stroke="currentColor"
                                  >
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                  </svg>
                                )}
                              </div>
                            </button>

                            {/* Message content */}
                            <div className={`flex-1 min-w-0 ${isRead ? 'opacity-50' : ''}`}>
                              <h3 className={`text-lg font-bold text-foreground mb-2 ${isRead ? 'line-through' : ''}`} style={{fontFamily: 'system-ui, -apple-system, sans-serif'}}>
                                {message.subject}
                              </h3>
                              <p className="text-base text-foreground/70 mb-2 font-medium">From: {message.from_email}</p>
                              <p className="text-base text-foreground/80 line-clamp-2 leading-relaxed">{message.snippet}</p>
                              <div className="mt-3 flex items-center gap-2">
                                <span
                                  className="w-2.5 h-2.5 rounded-full"
                                  style={{
                                    background: message.urgency === 'high' ? 'var(--google-red)' :
                                              message.urgency === 'medium' ? 'var(--google-yellow)' :
                                              'var(--google-green)'
                                  }}
                                ></span>
                                <span className="text-sm text-foreground/60 capitalize font-medium">{message.urgency} urgency</span>
                              </div>
                            </div>

                            {/* Remove button - appears when read */}
                            {isRead && (
                              <button
                                onClick={() => handleRemoveSocial(message.id)}
                                className="flex-shrink-0 px-5 py-3 bg-foreground/10 hover:bg-foreground/20 text-foreground rounded-xl transition-all duration-200 flex items-center gap-2 font-semibold"
                              >
                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                                Remove
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            )}

            {/* Spam */}
            {shouldShowCategory('promotions') && (
              <div className="animate-stagger-2">
                <h2 className="text-4xl font-bold text-foreground mb-5 flex items-center gap-4">
                  <div className="w-1.5 h-10 rounded-full bg-gradient-to-b from-[rgb(234,67,53)] to-[rgb(66,133,244)] shadow-[0_0_15px_rgba(234,67,53,0.6)]"></div>
                  Spam ({promotionsMessages.length})
                </h2>

                <div className="space-y-4">
                  {promotionsMessages.length === 0 ? (
                    <div className="bg-background border border-border/50 rounded-2xl p-8 min-h-[140px] flex items-center justify-center">
                      <p className="text-foreground/40 text-lg">No spam messages found</p>
                    </div>
                  ) : (
                    groupSpamBySender(promotionsMessages).map(({ sender, messages, count }) => {
                      const isExpanded = expandedSpamSenders.has(sender);
                      return (
                        <div key={sender} className="bg-background border border-border/50 rounded-2xl overflow-hidden hover:border-foreground/20 hover:shadow-[0_10px_40px_-10px_rgba(255,255,255,0.3)] transition-all duration-300">
                          {/* Sender Header - Clickable */}
                          <button
                            onClick={() => toggleSpamSender(sender)}
                            className="w-full p-6 flex items-center justify-between hover:bg-foreground/5 transition-colors"
                          >
                            <div className="flex items-center gap-4">
                              <svg
                                className={`w-6 h-6 text-foreground/60 transition-transform ${
                                  isExpanded ? 'rotate-90' : ''
                                }`}
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                              >
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                              </svg>
                              <div className="text-left">
                                <p className="text-lg font-bold text-foreground" style={{fontFamily: 'system-ui, -apple-system, sans-serif'}}>{sender}</p>
                                <p className="text-sm text-foreground/60 font-medium">{count} message{count !== 1 ? 's' : ''}</p>
                              </div>
                            </div>
                            <div className="px-4 py-2 bg-foreground/10 rounded-full">
                              <span className="text-sm font-bold text-foreground">{count}</span>
                            </div>
                          </button>

                          {/* Expanded Message List */}
                          {isExpanded && (
                            <div className="border-t border-border/50 bg-surface/50">
                              <ul className="p-6 space-y-4">
                                {messages.map(message => (
                                  <li key={message.id} className="flex gap-4 text-base">
                                    <span className="text-foreground/40 flex-shrink-0 text-lg">•</span>
                                    <div className="flex-1 min-w-0">
                                      <div className="flex items-start gap-2 mb-2">
                                        <span className="text-foreground/70 font-bold">
                                          {formatCompactDate(new Date(message.timestamp).toISOString())}:
                                        </span>
                                        <span className="text-foreground line-clamp-1 font-semibold">{message.subject}</span>
                                      </div>
                                      <p className="text-foreground/70 line-clamp-2 text-base leading-relaxed">{message.snippet}</p>
                                    </div>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            )}

            {/* Recruitment */}
            {shouldShowCategory('recruitment') && (
              <div className="animate-stagger-2">
                <h2 className="text-4xl font-bold text-foreground mb-5 flex items-center gap-4">
                  <div className="w-1.5 h-10 rounded-full bg-gradient-to-b from-[rgb(52,168,83)] to-[rgb(66,133,244)] shadow-[0_0_15px_rgba(52,168,83,0.6)]"></div>
                  Recruitment ({recruitmentMessages.filter(m => !hiddenRecruitmentIds.has(m.id)).length})
                </h2>

                <div className="space-y-4">
                  {recruitmentMessages.filter(m => !hiddenRecruitmentIds.has(m.id)).length === 0 ? (
                    <div className="bg-background border border-border/50 rounded-2xl p-8 min-h-[140px] flex items-center justify-center">
                      <p className="text-foreground/40 text-lg">No recruitment opportunities found</p>
                    </div>
                  ) : (
                    recruitmentMessages.filter(m => !hiddenRecruitmentIds.has(m.id)).map(message => {
                      const isRead = message.read === 1;
                      const isLoading = loadingRecruitmentId === message.id;
                      return (
                        <div
                          key={message.id}
                          className={`bg-surface border-2 rounded-2xl p-6 transition-all duration-300 hover:shadow-[0_10px_40px_-10px_rgba(255,255,255,0.3)] ${
                            isRead
                              ? 'border-foreground/30 bg-foreground/5'
                              : 'border-border hover:border-foreground/20'
                          }`}
                        >
                          <div className="flex items-start gap-4">
                            {/* Checkbox */}
                            <button
                              onClick={() => handleCompleteRecruitment(message.id)}
                              disabled={isLoading}
                              className="mt-1 flex-shrink-0"
                            >
                              <div className="relative">
                                <div className={`w-6 h-6 rounded-full border-2 transition-all ${
                                  isRead
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
                                {isRead && !isLoading && (
                                  <svg
                                    className="absolute top-0 left-0 w-6 h-6 text-background pointer-events-none"
                                    fill="none"
                                    viewBox="0 0 24 24"
                                    stroke="currentColor"
                                  >
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                  </svg>
                                )}
                              </div>
                            </button>

                            {/* Message content */}
                            <div className={`flex-1 min-w-0 ${isRead ? 'opacity-50' : ''}`}>
                              <h3 className={`text-lg font-bold text-foreground mb-2 ${isRead ? 'line-through' : ''}`} style={{fontFamily: 'system-ui, -apple-system, sans-serif'}}>
                                {message.subject}
                              </h3>
                              <p className="text-base text-foreground/70 mb-2 font-medium">From: {message.from_email}</p>
                              <p className="text-base text-foreground/80 line-clamp-2 leading-relaxed">{message.snippet}</p>
                              <div className="mt-3 flex items-center gap-2">
                                <span
                                  className="w-2.5 h-2.5 rounded-full"
                                  style={{
                                    background: message.urgency === 'high' ? 'var(--google-red)' :
                                              message.urgency === 'medium' ? 'var(--google-yellow)' :
                                              'var(--google-green)'
                                  }}
                                ></span>
                                <span className="text-sm text-foreground/60 capitalize font-medium">{message.urgency} urgency</span>
                              </div>
                            </div>

                            {/* Remove button - appears when read */}
                            {isRead && (
                              <button
                                onClick={() => handleRemoveRecruitment(message.id)}
                                className="flex-shrink-0 px-5 py-3 bg-foreground/10 hover:bg-foreground/20 text-foreground rounded-xl transition-all duration-200 flex items-center gap-2 font-semibold"
                              >
                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                                Remove
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Empty state when filters show no categories */}
          {!shouldShowCategory('events') && !shouldShowCategory('tasks') && !shouldShowCategory('social') && !shouldShowCategory('promotions') && !shouldShowCategory('recruitment') && (
            <div className="text-center py-16">
              <p className="text-foreground/40 text-lg">No categories match your filters</p>
            </div>
          )}
        </div>
      </div>

      {/* AI ChatBot */}
      <ChatBot />
    </div>
  );
}
