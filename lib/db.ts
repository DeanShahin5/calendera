import sqlite3 from 'sqlite3';
import { open, Database } from 'sqlite';
import path from 'path';

let db: Database | null = null;

export async function getDb(): Promise<Database> {
  if (db) {
    console.log('[getDb] Returning existing database connection')
    return db;
  }

  const cwd = process.cwd()
  const dbPath = path.join(cwd, 'inbox-agents', 'mailmind.db');

  console.log('[getDb] ========== DATABASE CONNECTION ==========')
  console.log('[getDb] Current working directory:', cwd)
  console.log('[getDb] Database path:', dbPath)
  console.log('[getDb] Opening database connection...')

  try {
    db = await open({
      filename: dbPath,
      driver: sqlite3.Database
    });
    console.log('[getDb] Database connection opened successfully')
    console.log('[getDb] Database object:', !!db)
    console.log('[getDb] ===========================================')
  } catch (error: any) {
    console.error('[getDb] !!!! FAILED TO OPEN DATABASE !!!!')
    console.error('[getDb] Error:', error)
    console.error('[getDb] ===========================================')
    throw error
  }

  return db;
}

export interface Message {
  id: string;
  thread_id: string;
  from_email: string;
  to_email: string;
  subject: string;
  body: string;
  snippet: string;
  date: string;
  timestamp: number;
  labels: string;
  created_at: string;
}

export interface ProcessedMessage {
  id: number;
  message_id: string;
  category: string;
  urgency: string;
  confidence: number;
  processed_at: string;
}

export interface Event {
  id: number;
  message_id: string;
  title: string;
  event_date: string;
  event_time: string;
  location: string;
  attendees: string;
  calendar_id: string | null;
  is_on_calendar: number;
  created_at: string;
}

export interface Todo {
  id: number;
  message_id: string;
  task: string;
  deadline: string;
  priority: string;
  completed: number;
  completed_at: string | null;
  created_at: string;
}

export interface MessageWithCategory extends Message {
  category: string;
  urgency: string;
  confidence: number;
}
