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

interface BeeperMessage {
  id: string;
  platform: string;
  from_name: string;
  from_contact: string;
  body: string;
  snippet: string;
  date: string;
  timestamp: number;
  category: string;
  urgency: string;
  room_name: string;
  is_group_message: boolean;
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
  const [expandedBeeperPlatforms, setExpandedBeeperPlatforms] = useState<Set<string>>(new Set());

  // Collapsible section states - all sections start collapsed
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set());

  const [events, setEvents] = useState<Event[]>([]);
  const [todos, setTodos] = useState<Todo[]>([]);
  const [socialMessages, setSocialMessages] = useState<Message[]>([]);
  const [promotionsMessages, setPromotionsMessages] = useState<Message[]>([]);
  const [recruitmentMessages, setRecruitmentMessages] = useState<Message[]>([]);
  const [beeperMessages, setBeeperMessages] = useState<BeeperMessage[]>([]);

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
    { id: 'messages', label: 'SMS/iMessage', enabled: false },
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
        fetchRecruitmentMessages(),
        fetchBeeperMessages()
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

  const fetchBeeperMessages = async () => {
    const res = await fetch('/api/beeper-messages');
    const data = await res.json();
    if (data.success) {
      setBeeperMessages(data.messages);
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

  const handleDeleteEvent = async (eventId: number) => {
    setLoadingEventId(eventId);
    try {
      const res = await fetch('/api/calendar/delete-event', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ eventId })
      });
      const data = await res.json();

      if (data.success) {
        await fetchEvents();
        showToast('Event deleted successfully!', 'success');
      } else {
        showToast(data.error || 'Failed to delete event', 'error');
      }
    } catch (error) {
      console.error('Error deleting event:', error);
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

  const toggleBeeperPlatform = (platform: string) => {
    setExpandedBeeperPlatforms(prev => {
      const newSet = new Set(prev);
      if (newSet.has(platform)) {
        newSet.delete(platform);
      } else {
        newSet.add(platform);
      }
      return newSet;
    });
  };

  const groupBeeperByPlatform = (messages: BeeperMessage[]) => {
    const groups = new Map<string, BeeperMessage[]>();
    messages.forEach(msg => {
      const platform = msg.platform;
      if (!groups.has(platform)) groups.set(platform, []);
      groups.get(platform)!.push(msg);
    });
    return Array.from(groups.entries())
      .map(([platform, msgs]) => ({
        platform,
        messages: msgs,
        count: msgs.length
      }))
      .sort((a, b) => b.count - a.count); // Sort by count, most messages first
  };

  const toggleSection = (sectionId: string) => {
    setExpandedSections(prev => {
      const newSet = new Set(prev);
      if (newSet.has(sectionId)) {
        newSet.delete(sectionId);
      } else {
        newSet.add(sectionId);
      }
      return newSet;
    });
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
        className={`bg-background border border-border/50 rounded-2xl p-4 hover:border-foreground/20 hover:shadow-[0_10px_40px_-10px_rgba(255,255,255,0.3)] transition-all duration-300 min-h-[120px] max-h-[140px] ${
          todo.completed ? 'opacity-60' : ''
        } ${isOverdue && !todo.completed ? 'border-l-4' : ''}`}
        style={isOverdue && !todo.completed ? { borderLeftColor: 'var(--google-red)' } : {}}
      >
        <div className="flex items-start gap-3 h-full">
          <button
            onClick={() => handleCompleteTodo(todo.id)}
            disabled={isLoading}
            className="mt-0.5 flex-shrink-0"
          >
            <div className="relative">
              <div className={`w-5 h-5 rounded-full border-2 transition-all ${
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

          <div className="flex-1 min-w-0 flex flex-col justify-between">
            <p className={`text-sm text-foreground leading-snug ${todo.completed ? 'line-through' : ''}`} style={{fontFamily: 'system-ui, -apple-system, sans-serif'}}>
              <span className="text-foreground/80 font-bold">{formatCompactDate(todo.deadline || '')}:</span>{' '}
              {cleanTask}
              {estimatedTime && (
                <span className="text-foreground/60 text-xs ml-1">({estimatedTime})</span>
              )}
            </p>
            <div className="flex items-center gap-2 mt-2">
              <span
                className="w-2 h-2 rounded-full flex-shrink-0"
                style={{ background: getPriorityColor(todo.priority) }}
              ></span>
              <span className="text-xs text-foreground/60 capitalize font-medium">{todo.priority} priority</span>
              {isOverdue && !todo.completed && (
                <span className="text-xs px-2 py-0.5 rounded-lg font-semibold" style={{ background: 'rgba(234, 67, 53, 0.15)', color: 'var(--google-red)' }}>
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

              {/* Filter dropdown - hidden in collapsible design */}
              <div className="relative z-50 hidden">
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

          {/* Category sections - Collapsible Accordion */}
          <div className="space-y-4">
            {/* Events Section */}
            <div className="bg-surface/30 border border-border/50 rounded-xl overflow-hidden transition-all duration-200 hover:border-border">
              <button
                onClick={() => toggleSection('events')}
                className="w-full p-5 flex items-center gap-4 hover:bg-foreground/5 transition-colors"
              >
                <div className="w-1.5 h-12 rounded-full bg-gradient-to-b from-[rgb(66,133,244)] to-[rgb(52,168,83)] shadow-[0_0_10px_rgba(66,133,244,0.4)]"></div>
                <div className="flex-1 text-left">
                  <h2 className="text-2xl font-bold text-foreground">{events.length} Events</h2>
                </div>
                <svg
                  className={`w-6 h-6 text-foreground/60 transition-transform duration-200 ${expandedSections.has('events') ? 'rotate-180' : ''}`}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {expandedSections.has('events') && (
                <div className="p-5 border-t border-border/50 bg-background/50">
                  <div className="grid grid-cols-3 gap-x-5 gap-y-5">
                  {events.length === 0 ? (
                    <div className="col-span-3 bg-background border border-border/50 rounded-2xl p-8 min-h-[140px] flex items-center justify-center">
                      <p className="text-foreground/40 text-lg">No events found</p>
                    </div>
                  ) : (
                    events.map(event => (
                      <div key={event.id} className="bg-background border border-border/50 rounded-2xl p-6 hover:border-foreground/20 hover:shadow-[0_10px_40px_-10px_rgba(255,255,255,0.3)] transition-all duration-300 flex flex-col min-h-[380px] relative">
                        {/* Delete button in top-right corner */}
                        <button
                          onClick={() => handleDeleteEvent(event.id)}
                          className="absolute top-3 right-3 text-foreground/30 hover:text-red-500 transition-colors p-1"
                          title="Delete event"
                        >
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>

                        <div className="flex-1 flex flex-col">
                          <h3 className="text-lg font-bold text-foreground mb-3 tracking-tight pr-6" style={{fontFamily: 'system-ui, -apple-system, sans-serif'}}>{event.title}</h3>
                          <div className="space-y-2 text-sm text-foreground/70 flex-1">
                            <p className="flex items-center gap-2">
                              <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                              </svg>
                              <span className="text-xs">{formatDate(event.event_date)} {event.event_time && `at ${formatTime(event.event_time)}`}</span>
                            </p>
                            {event.location && (
                              <p className="flex items-center gap-2">
                                <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                                </svg>
                                <span className="text-xs truncate">{event.location}</span>
                              </p>
                            )}
                            <p className="text-xs text-foreground/50 font-medium truncate">From: {event.from_email}</p>
                          </div>
                          <button
                            onClick={() => handleAddToCalendar(event.id)}
                            disabled={event.is_on_calendar === 1 || loadingEventId === event.id}
                            className="mt-4 w-full px-4 py-2.5 bg-surface border border-white/20 rounded-xl hover:border-[rgb(66,133,244)] hover:shadow-[0_0_20px_rgba(66,133,244,0.4)] transition-all text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
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
            </div>

            {/* Tasks Section */}
            <div className="bg-surface/30 border border-border/50 rounded-xl overflow-hidden transition-all duration-200 hover:border-border">
              <button
                onClick={() => toggleSection('tasks')}
                className="w-full p-5 flex items-center gap-4 hover:bg-foreground/5 transition-colors"
              >
                <div className="w-1.5 h-12 rounded-full bg-gradient-to-b from-[rgb(52,168,83)] to-[rgb(251,188,5)] shadow-[0_0_10px_rgba(52,168,83,0.4)]"></div>
                <div className="flex-1 text-left">
                  <h2 className="text-2xl font-bold text-foreground">{todos.filter(t => !t.completed && !hiddenTodoIds.has(t.id)).length} Tasks</h2>
                </div>
                <svg
                  className={`w-6 h-6 text-foreground/60 transition-transform duration-200 ${expandedSections.has('tasks') ? 'rotate-180' : ''}`}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {expandedSections.has('tasks') && (
                <div className="p-5 border-t border-border/50 bg-background/50">
                  <div className="flex items-center justify-between mb-5">
                    <h3 className="text-lg font-semibold text-foreground">Active Tasks</h3>
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
                      <div className="grid grid-cols-3 gap-x-5 gap-y-4">
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
                      <div className="grid grid-cols-3 gap-x-5 gap-y-4">
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
                      <div className="grid grid-cols-3 gap-x-5 gap-y-4">
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
                      <div className="grid grid-cols-3 gap-x-5 gap-y-4">
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
            </div>

            {/* Social Section */}
            <div className="bg-surface/30 border border-border/50 rounded-xl overflow-hidden transition-all duration-200 hover:border-border">
              <button
                onClick={() => toggleSection('social')}
                className="w-full p-5 flex items-center gap-4 hover:bg-foreground/5 transition-colors"
              >
                <div className="w-1.5 h-12 rounded-full bg-gradient-to-b from-[rgb(251,188,5)] to-[rgb(234,67,53)] shadow-[0_0_10px_rgba(251,188,5,0.4)]"></div>
                <div className="flex-1 text-left">
                  <h2 className="text-2xl font-bold text-foreground">{socialMessages.filter(m => !hiddenSocialIds.has(m.id)).length} Social</h2>
                </div>
                <svg
                  className={`w-6 h-6 text-foreground/60 transition-transform duration-200 ${expandedSections.has('social') ? 'rotate-180' : ''}`}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {expandedSections.has('social') && (
                <div className="p-5 border-t border-border/50 bg-background/50">
                  <div className="grid grid-cols-3 gap-x-5 gap-y-5">
                  {socialMessages.filter(m => !hiddenSocialIds.has(m.id)).length === 0 ? (
                    <div className="col-span-3 bg-background border border-border/50 rounded-2xl p-8 min-h-[140px] flex items-center justify-center">
                      <p className="text-foreground/40 text-lg">No social messages found</p>
                    </div>
                  ) : (
                    socialMessages.filter(m => !hiddenSocialIds.has(m.id)).map(message => {
                      const isRead = message.read === 1;
                      const isLoading = loadingSocialId === message.id;
                      return (
                        <div
                          key={message.id}
                          className={`bg-surface border-2 rounded-2xl p-5 transition-all duration-300 hover:shadow-[0_10px_40px_-10px_rgba(255,255,255,0.3)] flex flex-col min-h-[380px] ${
                            isRead
                              ? 'border-foreground/30 bg-foreground/5'
                              : 'border-border hover:border-foreground/20'
                          }`}
                        >
                          <div className="flex items-start gap-3 mb-3">
                            {/* Checkbox */}
                            <button
                              onClick={() => handleCompleteSocial(message.id)}
                              disabled={isLoading}
                              className="mt-0.5 flex-shrink-0"
                            >
                              <div className="relative">
                                <div className={`w-5 h-5 rounded-full border-2 transition-all ${
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

                            {/* Message content */}
                            <div className={`flex-1 min-w-0 ${isRead ? 'opacity-50' : ''}`}>
                              <h3 className={`text-base font-bold text-foreground mb-2 ${isRead ? 'line-through' : ''}`} style={{fontFamily: 'system-ui, -apple-system, sans-serif'}}>
                                {message.subject}
                              </h3>
                            </div>
                          </div>

                          <div className={`flex-1 ${isRead ? 'opacity-50' : ''}`}>
                            <p className="text-xs text-foreground/70 mb-2 font-medium">From: {message.from_email}</p>
                            <p className="text-sm text-foreground/80 line-clamp-3 leading-relaxed mb-3">{message.snippet}</p>
                            <div className="flex items-center gap-2">
                              <span
                                className="w-2 h-2 rounded-full flex-shrink-0"
                                style={{
                                  background: message.urgency === 'high' ? 'var(--google-red)' :
                                            message.urgency === 'medium' ? 'var(--google-yellow)' :
                                            'var(--google-green)'
                                }}
                              ></span>
                              <span className="text-xs text-foreground/60 capitalize font-medium">{message.urgency} urgency</span>
                            </div>
                          </div>

                          {/* Remove button - appears when read */}
                          {isRead && (
                            <button
                              onClick={() => handleRemoveSocial(message.id)}
                              className="mt-3 w-full px-4 py-2 bg-foreground/10 hover:bg-foreground/20 text-foreground rounded-xl transition-all duration-200 flex items-center justify-center gap-2 font-semibold text-sm"
                            >
                              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                              </svg>
                              Remove
                            </button>
                          )}
                        </div>
                      );
                    })
                  )}
                  </div>
                </div>
              )}
            </div>

            {/* Recruitment Section */}
            <div className="bg-surface/30 border border-border/50 rounded-xl overflow-hidden transition-all duration-200 hover:border-border">
              <button
                onClick={() => toggleSection('recruitment')}
                className="w-full p-5 flex items-center gap-4 hover:bg-foreground/5 transition-colors"
              >
                <div className="w-1.5 h-12 rounded-full bg-gradient-to-b from-[rgb(52,168,83)] to-[rgb(66,133,244)] shadow-[0_0_10px_rgba(52,168,83,0.4)]"></div>
                <div className="flex-1 text-left">
                  <h2 className="text-2xl font-bold text-foreground">{recruitmentMessages.filter(m => !hiddenRecruitmentIds.has(m.id)).length} Professional</h2>
                </div>
                <svg
                  className={`w-6 h-6 text-foreground/60 transition-transform duration-200 ${expandedSections.has('recruitment') ? 'rotate-180' : ''}`}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {expandedSections.has('recruitment') && (
                <div className="p-5 border-t border-border/50 bg-background/50">
                  <div className="grid grid-cols-3 gap-x-5 gap-y-5">
                  {recruitmentMessages.filter(m => !hiddenRecruitmentIds.has(m.id)).length === 0 ? (
                    <div className="col-span-3 bg-background border border-border/50 rounded-2xl p-8 min-h-[140px] flex items-center justify-center">
                      <p className="text-foreground/40 text-lg">No recruitment opportunities found</p>
                    </div>
                  ) : (
                    recruitmentMessages.filter(m => !hiddenRecruitmentIds.has(m.id)).map(message => {
                      const isRead = message.read === 1;
                      const isLoading = loadingRecruitmentId === message.id;
                      return (
                        <div
                          key={message.id}
                          className={`bg-surface border-2 rounded-2xl p-5 transition-all duration-300 hover:shadow-[0_10px_40px_-10px_rgba(255,255,255,0.3)] flex flex-col min-h-[380px] ${
                            isRead
                              ? 'border-foreground/30 bg-foreground/5'
                              : 'border-border hover:border-foreground/20'
                          }`}
                        >
                          <div className="flex items-start gap-3 mb-3">
                            {/* Checkbox */}
                            <button
                              onClick={() => handleCompleteRecruitment(message.id)}
                              disabled={isLoading}
                              className="mt-0.5 flex-shrink-0"
                            >
                              <div className="relative">
                                <div className={`w-5 h-5 rounded-full border-2 transition-all ${
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

                            {/* Message content */}
                            <div className={`flex-1 min-w-0 ${isRead ? 'opacity-50' : ''}`}>
                              <h3 className={`text-base font-bold text-foreground mb-2 ${isRead ? 'line-through' : ''}`} style={{fontFamily: 'system-ui, -apple-system, sans-serif'}}>
                                {message.subject}
                              </h3>
                            </div>
                          </div>

                          <div className={`flex-1 ${isRead ? 'opacity-50' : ''}`}>
                            <p className="text-xs text-foreground/70 mb-2 font-medium">From: {message.from_email}</p>
                            <p className="text-sm text-foreground/80 line-clamp-3 leading-relaxed mb-3">{message.snippet}</p>
                            <div className="flex items-center gap-2">
                              <span
                                className="w-2 h-2 rounded-full flex-shrink-0"
                                style={{
                                  background: message.urgency === 'high' ? 'var(--google-red)' :
                                            message.urgency === 'medium' ? 'var(--google-yellow)' :
                                            'var(--google-green)'
                                }}
                              ></span>
                              <span className="text-xs text-foreground/60 capitalize font-medium">{message.urgency} urgency</span>
                            </div>
                          </div>

                          {/* Remove button - appears when read */}
                          {isRead && (
                            <button
                              onClick={() => handleRemoveRecruitment(message.id)}
                              className="mt-3 w-full px-4 py-2 bg-foreground/10 hover:bg-foreground/20 text-foreground rounded-xl transition-all duration-200 flex items-center justify-center gap-2 font-semibold text-sm"
                            >
                              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                              </svg>
                              Remove
                            </button>
                          )}
                        </div>
                      );
                    })
                  )}
                  </div>
                </div>
              )}
            </div>

            {/* SMS/iMessage (Beeper) Section */}
            <div className="bg-surface/30 border border-border/50 rounded-xl overflow-hidden transition-all duration-200 hover:border-border">
              <button
                onClick={() => toggleSection('messages')}
                className="w-full p-5 flex items-center gap-4 hover:bg-foreground/5 transition-colors"
              >
                <div className="w-1.5 h-12 rounded-full bg-gradient-to-b from-[rgb(251,188,5)] to-[rgb(66,133,244)] shadow-[0_0_10px_rgba(251,188,5,0.4)]"></div>
                <div className="flex-1 text-left">
                  <h2 className="text-2xl font-bold text-foreground">{beeperMessages.length} SMS/Messages</h2>
                </div>
                <svg
                  className={`w-6 h-6 text-foreground/60 transition-transform duration-200 ${expandedSections.has('messages') ? 'rotate-180' : ''}`}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {expandedSections.has('messages') && (
                <div className="p-5 border-t border-border/50 bg-background/50">
                  <div className="grid grid-cols-3 gap-x-5 gap-y-4">
                  {beeperMessages.length === 0 ? (
                    <div className="col-span-3 bg-background border border-border/50 rounded-2xl p-8 min-h-[140px] flex items-center justify-center">
                      <p className="text-foreground/40 text-lg">No messages found. Run beeper-index.js to start collecting SMS/iMessage data.</p>
                    </div>
                  ) : (
                    groupBeeperByPlatform(beeperMessages).map(({ platform, messages, count }) => {
                      const isExpanded = expandedBeeperPlatforms.has(platform);

                      const platformEmoji: Record<string, string> = {
                        'imessage': '💬',
                        'whatsapp': '💚',
                        'telegram': '✈️',
                        'signal': '🔵',
                        'slack': '💼',
                        'discord': '🎮',
                        'sms': '📱',
                        'instagram': '📷',
                        'messenger': '💌'
                      };

                      const emoji = platformEmoji[platform.toLowerCase()] || '📧';

                      return (
                        <div key={platform} className="bg-background border border-border/50 rounded-2xl overflow-hidden hover:border-foreground/20 hover:shadow-[0_10px_40px_-10px_rgba(255,255,255,0.3)] transition-all duration-300 min-h-[120px] max-h-[140px] flex flex-col">
                          {/* Platform Header - Clickable */}
                          <button
                            onClick={() => toggleBeeperPlatform(platform)}
                            className="w-full p-4 flex items-center justify-between hover:bg-foreground/5 transition-colors"
                          >
                            <div className="flex items-center gap-3 min-w-0 flex-1">
                              <svg
                                className={`w-5 h-5 text-foreground/60 transition-transform flex-shrink-0 ${
                                  isExpanded ? 'rotate-90' : ''
                                }`}
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                              >
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                              </svg>
                              <span className="text-xl">{emoji}</span>
                              <div className="text-left min-w-0 flex-1">
                                <p className="text-sm font-bold text-foreground truncate capitalize" style={{fontFamily: 'system-ui, -apple-system, sans-serif'}}>
                                  {platform}
                                </p>
                                <p className="text-xs text-foreground/60 font-medium">{count} message{count !== 1 ? 's' : ''}</p>
                              </div>
                            </div>
                            <div className="px-3 py-1 bg-foreground/10 rounded-full flex-shrink-0 ml-2">
                              <span className="text-xs font-bold text-foreground">{count}</span>
                            </div>
                          </button>

                          {/* Expanded Message List */}
                          {isExpanded && (
                            <div className="border-t border-border/50 bg-surface/50 overflow-y-auto flex-1">
                              <ul className="p-6 space-y-5">
                                {messages.map(message => (
                                  <li key={message.id} className="flex gap-3 text-sm">
                                    <span className="text-foreground/40 flex-shrink-0 text-base">•</span>
                                    <div className="flex-1 min-w-0">
                                      <div className="flex items-start gap-2 mb-2">
                                        <span className="text-foreground/70 font-bold text-sm">
                                          {new Date(message.timestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}:
                                        </span>
                                        <span className="text-foreground line-clamp-1 font-bold text-lg">
                                          {message.from_name || message.from_contact}
                                        </span>
                                      </div>
                                      <p className="text-foreground/90 line-clamp-3 text-base leading-relaxed mb-2">
                                        {message.snippet || message.body}
                                      </p>
                                      {message.category && (
                                        <span className="inline-block px-2 py-1 bg-foreground/10 rounded text-sm font-medium text-foreground/80 capitalize">
                                          {message.category}
                                        </span>
                                      )}
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
            </div>
          </div>
        </div>
      </div>

      {/* AI ChatBot */}
      <ChatBot />
    </div>
  );
}
