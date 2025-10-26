import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { getDb } from '@/lib/db'

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
})

interface ConversationMessage {
  role: 'user' | 'assistant'
  content: string
}

// Tool definitions for Claude
const tools: Anthropic.Tool[] = [
  {
    name: 'query_events',
    description: 'Query calendar events from the database. Can filter by date range or search for specific events.',
    input_schema: {
      type: 'object',
      properties: {
        start_date: {
          type: 'string',
          description: 'Start date in YYYY-MM-DD format (optional, defaults to today)'
        },
        end_date: {
          type: 'string',
          description: 'End date in YYYY-MM-DD format (optional)'
        },
        limit: {
          type: 'number',
          description: 'Maximum number of events to return (default 20)'
        }
      }
    }
  },
  {
    name: 'query_todos',
    description: 'Query tasks/todos from the database. Can filter by completion status and deadline.',
    input_schema: {
      type: 'object',
      properties: {
        include_completed: {
          type: 'boolean',
          description: 'Whether to include completed tasks (default false)'
        },
        priority: {
          type: 'string',
          description: 'Filter by priority: high, medium, or low (optional)',
          enum: ['high', 'medium', 'low']
        },
        limit: {
          type: 'number',
          description: 'Maximum number of tasks to return (default 20)'
        }
      }
    }
  },
  {
    name: 'query_messages',
    description: 'Query emails by category (social, recruitment, events, tasks) or search by sender/subject.',
    input_schema: {
      type: 'object',
      properties: {
        category: {
          type: 'string',
          description: 'Message category to filter by',
          enum: ['SOCIAL', 'RECRUITMENT', 'EVENT', 'TASK', 'OTHER']
        },
        sender_search: {
          type: 'string',
          description: 'Search for messages from a specific sender (partial match)'
        },
        limit: {
          type: 'number',
          description: 'Maximum number of messages to return (default 10)'
        }
      }
    }
  },
  {
    name: 'create_calendar_event',
    description: 'Create a new calendar event. This will add it to Google Calendar.',
    input_schema: {
      type: 'object',
      properties: {
        title: {
          type: 'string',
          description: 'Event title/summary'
        },
        date: {
          type: 'string',
          description: 'Event date in YYYY-MM-DD format'
        },
        start_time: {
          type: 'string',
          description: 'Start time in HH:MM format (24-hour)'
        },
        end_time: {
          type: 'string',
          description: 'End time in HH:MM format (24-hour)'
        },
        location: {
          type: 'string',
          description: 'Event location (optional)'
        }
      },
      required: ['title', 'date', 'start_time', 'end_time']
    }
  },
  {
    name: 'complete_task',
    description: 'Mark a task as completed.',
    input_schema: {
      type: 'object',
      properties: {
        task_id: {
          type: 'number',
          description: 'The ID of the task to mark as complete'
        }
      },
      required: ['task_id']
    }
  },
  {
    name: 'delete_calendar_event',
    description: 'Delete a calendar event from both the database and Google Calendar. Can search by event ID, title, or date.',
    input_schema: {
      type: 'object',
      properties: {
        event_id: {
          type: 'number',
          description: 'The database ID of the event to delete (if known)'
        },
        title: {
          type: 'string',
          description: 'Search for events by title (partial match)'
        },
        date: {
          type: 'string',
          description: 'Filter events by date in YYYY-MM-DD format'
        }
      }
    }
  }
]

// Tool execution functions
async function executeQueryEvents(args: any) {
  console.log('\n[executeQueryEvents] ========== START ==========')
  try {
    console.log('[executeQueryEvents] Getting database connection...')
    const db = await getDb()
    console.log('[executeQueryEvents] Database connection obtained:', !!db)
    console.log('[executeQueryEvents] Database object type:', typeof db)

    const { start_date, end_date, limit = 20 } = args
    console.log('[executeQueryEvents] Args:', JSON.stringify(args, null, 2))

    let query = `
      SELECT e.*, m.subject, m.from_email
      FROM events e
      LEFT JOIN messages m ON e.message_id = m.id
      WHERE 1=1
    `
    const params: any[] = []

    if (start_date) {
      query += ` AND e.event_date >= ?`
      params.push(start_date)
      console.log('[executeQueryEvents] Filtering by start_date:', start_date)
    }
    if (end_date) {
      query += ` AND e.event_date <= ?`
      params.push(end_date)
      console.log('[executeQueryEvents] Filtering by end_date:', end_date)
    }

    query += ` ORDER BY e.event_date ASC, e.event_time ASC LIMIT ?`
    params.push(limit)

    console.log('[executeQueryEvents] Final SQL Query:', query.trim())
    console.log('[executeQueryEvents] SQL Params:', JSON.stringify(params))
    console.log('[executeQueryEvents] Executing query...')

    let events
    try {
      events = await db.all(query, params)
      console.log('[executeQueryEvents] Query executed successfully')
    } catch (dbError: any) {
      console.error('[executeQueryEvents] !!!! DATABASE QUERY ERROR !!!!')
      console.error('[executeQueryEvents] Error name:', dbError.name)
      console.error('[executeQueryEvents] Error message:', dbError.message)
      console.error('[executeQueryEvents] Error code:', dbError.code)
      console.error('[executeQueryEvents] Error errno:', dbError.errno)
      console.error('[executeQueryEvents] Full error object:', JSON.stringify(dbError, null, 2))
      console.error('[executeQueryEvents] Error stack:', dbError.stack)
      throw dbError
    }

    console.log('[executeQueryEvents] Results count:', events.length)
    if (events.length > 0) {
      console.log('[executeQueryEvents] First result:', JSON.stringify(events[0], null, 2))
    }
    console.log('[executeQueryEvents] ========== SUCCESS ==========\n')

    return events
  } catch (error: any) {
    console.error('[executeQueryEvents] !!!! FUNCTION ERROR !!!!')
    console.error('[executeQueryEvents] Error name:', error.name)
    console.error('[executeQueryEvents] Error message:', error.message)
    console.error('[executeQueryEvents] Error stack:', error.stack)
    console.error('[executeQueryEvents] Full error:', JSON.stringify(error, Object.getOwnPropertyNames(error), 2))
    console.error('[executeQueryEvents] ========== FAILED ==========\n')
    throw new Error(`Failed to query events: ${error.message}`)
  }
}

async function executeQueryTodos(args: any) {
  try {
    const db = await getDb()
    const { include_completed = false, priority, limit = 20 } = args

    console.log('[executeQueryTodos] Args:', JSON.stringify(args, null, 2))

    let query = `
      SELECT t.*, m.subject, m.from_email
      FROM todos t
      LEFT JOIN messages m ON t.message_id = m.id
      WHERE 1=1
    `
    const params: any[] = []

    if (!include_completed) {
      query += ` AND (t.completed = 0 OR t.completed IS NULL)`
      console.log('[executeQueryTodos] Excluding completed tasks')
    }
    if (priority) {
      query += ` AND LOWER(t.priority) = LOWER(?)`
      params.push(priority)
      console.log('[executeQueryTodos] Filtering by priority:', priority)
    }

    query += ` ORDER BY
      CASE WHEN t.priority = 'high' THEN 1
           WHEN t.priority = 'medium' THEN 2
           ELSE 3 END,
      t.deadline ASC
      LIMIT ?`
    params.push(limit)

    console.log('[executeQueryTodos] SQL Query:', query)
    console.log('[executeQueryTodos] SQL Params:', params)

    const todos = await db.all(query, params)
    console.log('[executeQueryTodos] Results count:', todos.length)
    console.log('[executeQueryTodos] Results:', JSON.stringify(todos, null, 2))

    return todos
  } catch (error: any) {
    console.error('[executeQueryTodos] Error:', error)
    throw new Error(`Failed to query todos: ${error.message}`)
  }
}

async function executeQueryMessages(args: any) {
  console.log('\n[executeQueryMessages] ========== START ==========')
  try {
    console.log('[executeQueryMessages] Getting database connection...')
    const db = await getDb()
    console.log('[executeQueryMessages] Database connection obtained:', !!db)

    const { category, sender_search, limit = 10 } = args
    console.log('[executeQueryMessages] Args:', JSON.stringify(args, null, 2))

    let query = `
      SELECT m.*, pm.category, pm.urgency
      FROM messages m
      LEFT JOIN processed_messages pm ON m.id = pm.message_id
      WHERE 1=1
    `
    const params: any[] = []

    if (category) {
      query += ` AND pm.category = ?`
      params.push(category)
      console.log('[executeQueryMessages] Filtering by category:', category)
    }
    if (sender_search) {
      query += ` AND (m.from_email LIKE ? OR m.from_name LIKE ?)`
      params.push(`%${sender_search}%`, `%${sender_search}%`)
      console.log('[executeQueryMessages] Filtering by sender:', sender_search)
    }

    query += ` ORDER BY m.date DESC LIMIT ?`
    params.push(limit)

    console.log('[executeQueryMessages] Final SQL Query:', query.trim())
    console.log('[executeQueryMessages] SQL Params:', JSON.stringify(params))
    console.log('[executeQueryMessages] Executing query...')

    let messages
    try {
      messages = await db.all(query, params)
      console.log('[executeQueryMessages] Query executed successfully')
    } catch (dbError: any) {
      console.error('[executeQueryMessages] !!!! DATABASE QUERY ERROR !!!!')
      console.error('[executeQueryMessages] Error name:', dbError.name)
      console.error('[executeQueryMessages] Error message:', dbError.message)
      console.error('[executeQueryMessages] Error code:', dbError.code)
      console.error('[executeQueryMessages] Error errno:', dbError.errno)
      console.error('[executeQueryMessages] Full error object:', JSON.stringify(dbError, null, 2))
      console.error('[executeQueryMessages] Error stack:', dbError.stack)
      throw dbError
    }

    console.log('[executeQueryMessages] Results count:', messages.length)
    if (messages.length > 0) {
      console.log('[executeQueryMessages] First result:', JSON.stringify(messages[0], null, 2))
    }
    console.log('[executeQueryMessages] ========== SUCCESS ==========\n')

    return messages
  } catch (error: any) {
    console.error('[executeQueryMessages] !!!! FUNCTION ERROR !!!!')
    console.error('[executeQueryMessages] Error name:', error.name)
    console.error('[executeQueryMessages] Error message:', error.message)
    console.error('[executeQueryMessages] Error stack:', error.stack)
    console.error('[executeQueryMessages] Full error:', JSON.stringify(error, Object.getOwnPropertyNames(error), 2))
    console.error('[executeQueryMessages] ========== FAILED ==========\n')
    throw new Error(`Failed to query messages: ${error.message}`)
  }
}

async function executeCreateEvent(args: any) {
  try {
    const { title, date, start_time, end_time, location } = args
    const db = await getDb()

    console.log('[executeCreateEvent] Args:', JSON.stringify(args, null, 2))

    // First, insert the event into the database
    const result = await db.run(
      `INSERT INTO events (
        title, event_date, event_time, end_time, location, is_on_calendar
      ) VALUES (?, ?, ?, ?, ?, 0)`,
      [
        title,
        date,
        start_time,
        end_time,
        location || null
      ]
    )

    const eventId = result.lastID
    console.log('[executeCreateEvent] Event inserted with ID:', eventId)

    // Now add it to Google Calendar using the existing API
    const response = await fetch(`http://localhost:3000/api/calendar/add-event`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        eventId: eventId,
      }),
    })

    if (!response.ok) {
      // If calendar API fails, still return success for DB insert
      const errorData = await response.json()
      console.error('[executeCreateEvent] Calendar API error:', errorData)
      return {
        success: true,
        eventId,
        calendarError: errorData.error,
        message: 'Event created in database but failed to add to Google Calendar'
      }
    }

    const calendarResult = await response.json()
    console.log('[executeCreateEvent] Calendar result:', calendarResult)

    return {
      success: true,
      eventId,
      calendarId: calendarResult.calendarId,
      message: 'Event created successfully',
      endTime: end_time
    }
  } catch (error: any) {
    console.error('[executeCreateEvent] Error:', error)
    throw new Error(`Failed to create event: ${error.message}`)
  }
}

async function executeCompleteTask(args: any) {
  try {
    const { task_id } = args

    console.log('[executeCompleteTask] Task ID:', task_id)

    // Call the existing todo completion API
    const response = await fetch(`http://localhost:3000/api/todos/${task_id}/complete`, {
      method: 'POST',
    })

    if (!response.ok) {
      const errorData = await response.json()
      console.error('[executeCompleteTask] API error:', errorData)
      throw new Error(`Failed to complete task: ${errorData.error || 'Unknown error'}`)
    }

    const result = await response.json()
    console.log('[executeCompleteTask] Result:', result)

    return result
  } catch (error: any) {
    console.error('[executeCompleteTask] Error:', error)
    throw new Error(`Failed to complete task: ${error.message}`)
  }
}

async function executeDeleteEvent(args: any) {
  console.log('\n[executeDeleteEvent] ========== START ==========')
  try {
    const { event_id, title, date } = args
    const db = await getDb()

    console.log('[executeDeleteEvent] Args:', JSON.stringify(args, null, 2))

    // Build query to find events
    let query = 'SELECT * FROM events WHERE 1=1'
    const params: any[] = []

    if (event_id) {
      query += ' AND id = ?'
      params.push(event_id)
    }
    if (title) {
      query += ' AND title LIKE ?'
      params.push(`%${title}%`)
    }
    if (date) {
      query += ' AND event_date = ?'
      params.push(date)
    }

    console.log('[executeDeleteEvent] Query:', query)
    console.log('[executeDeleteEvent] Params:', params)

    const events = await db.all(query, params)
    console.log('[executeDeleteEvent] Found events:', events.length)

    if (events.length === 0) {
      return {
        success: false,
        message: 'No events found matching the criteria',
        deleted_count: 0
      }
    }

    const deletedEvents = []
    const failedEvents = []

    for (const event of events) {
      try {
        // If event is on Google Calendar, delete it there first
        if (event.is_on_calendar && event.calendar_id) {
          console.log('[executeDeleteEvent] Deleting event from Google Calendar:', event.calendar_id)

          // Import googleapis dynamically
          const { google } = await import('googleapis')
          const fs = await import('fs')
          const path = await import('path')

          const tokenPath = path.join(process.cwd(), 'inbox-agents', 'token.json')
          const credentialsPath = path.join(process.cwd(), 'inbox-agents', 'credentials.json')

          if (fs.existsSync(tokenPath) && fs.existsSync(credentialsPath)) {
            const credentials = JSON.parse(fs.readFileSync(credentialsPath, 'utf-8'))
            const token = JSON.parse(fs.readFileSync(tokenPath, 'utf-8'))

            const { client_secret, client_id, redirect_uris } = credentials.installed || credentials.web
            const oAuth2Client = new google.auth.OAuth2(client_id, client_secret, redirect_uris[0])
            oAuth2Client.setCredentials(token)

            const calendar = google.calendar({ version: 'v3', auth: oAuth2Client })

            try {
              await calendar.events.delete({
                calendarId: 'primary',
                eventId: event.calendar_id
              })
              console.log('[executeDeleteEvent] Deleted from Google Calendar successfully')
            } catch (calError: any) {
              console.error('[executeDeleteEvent] Google Calendar deletion error:', calError.message)
              // Continue anyway - we'll still mark it as deleted in database
            }
          }
        }

        // Delete from database
        await db.run('DELETE FROM events WHERE id = ?', [event.id])
        console.log('[executeDeleteEvent] Deleted event from database:', event.id)

        deletedEvents.push({
          id: event.id,
          title: event.title,
          date: event.event_date,
          time: event.event_time
        })
      } catch (error: any) {
        console.error('[executeDeleteEvent] Error deleting event:', event.id, error)
        failedEvents.push({
          id: event.id,
          title: event.title,
          error: error.message
        })
      }
    }

    console.log('[executeDeleteEvent] Successfully deleted:', deletedEvents.length)
    console.log('[executeDeleteEvent] Failed:', failedEvents.length)
    console.log('[executeDeleteEvent] ========== SUCCESS ==========\n')

    return {
      success: true,
      message: `Deleted ${deletedEvents.length} event(s)`,
      deleted_count: deletedEvents.length,
      deleted_events: deletedEvents,
      failed_events: failedEvents
    }
  } catch (error: any) {
    console.error('[executeDeleteEvent] !!!! FUNCTION ERROR !!!!')
    console.error('[executeDeleteEvent] Error:', error)
    console.error('[executeDeleteEvent] ========== FAILED ==========\n')
    throw new Error(`Failed to delete events: ${error.message}`)
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { message, conversationHistory = [] } = body

    console.log('\n========== NEW CHAT REQUEST ==========')
    console.log('[POST /api/chat] User message:', message)
    console.log('[POST /api/chat] Conversation history length:', conversationHistory.length)

    if (!message) {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 })
    }

    const today = new Date().toISOString().split('T')[0]
    const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0]

    console.log('[POST /api/chat] Today:', today)
    console.log('[POST /api/chat] Tomorrow:', tomorrow)

    // Build messages for Claude
    const messages: Anthropic.MessageParam[] = [
      ...conversationHistory.map((msg: ConversationMessage) => ({
        role: msg.role,
        content: msg.content
      })),
      {
        role: 'user',
        content: message
      }
    ]

    // System prompt
    const systemPrompt = `You are MailMind, an AI assistant with access to the user's email, calendar, and task data.

You can query the SQLite database to answer questions and perform actions using the provided tools.

Available tools:
- query_events: Query calendar events from the database
- query_todos: Query tasks/todos from the database
- query_messages: Query emails by category (SOCIAL, RECRUITMENT, EVENT, TASK, OTHER)
- create_calendar_event: Create ONE calendar event via Google Calendar API
- complete_task: Mark tasks as completed
- delete_calendar_event: Delete calendar events from database and Google Calendar (search by id, title, or date)

IMPORTANT: For recurring/multiple events, call create_calendar_event MULTIPLE TIMES, once for each occurrence.
For example, if user asks for "study session Monday and Wednesday for 2 weeks", call create_calendar_event 4 times total (2 weeks × 2 days).

Be concise, friendly, and actionable. Format dates naturally (e.g., 'Monday' not '2025-10-27').
When performing actions, confirm what you did clearly.
Only claim events were created if the tool calls actually succeeded.

Today's date is ${new Date().toISOString().split('T')[0]}.

For date references:
- "today" means ${new Date().toISOString().split('T')[0]}
- "tomorrow" means ${new Date(Date.now() + 86400000).toISOString().split('T')[0]}
- Parse "Monday", "next Friday" etc. relative to today

When querying data:
- For "today's schedule", use today's date as both start and end date
- For "this week", use today through 7 days from now
- For urgent/high priority tasks, filter by priority='high'

Format your responses with:
- Bullet points for lists
- Clear time formatting (e.g., "9:00 AM" not "09:00:00")
- Natural language dates when possible
- Use markdown formatting (bold, italic, headers) for emphasis
- Do NOT use emojis

When you create an event or complete a task, structure your response to indicate the action taken so the UI can show appropriate visual feedback.`

    let response = await anthropic.messages.create({
      model: 'claude-sonnet-4-5-20250929',
      max_tokens: 2048,
      system: systemPrompt,
      messages: messages,
      tools: tools,
    })

    // Handle tool calls
    let finalResponse = ''
    let actionType: string | undefined
    let actionData: any | undefined

    while (response.stop_reason === 'tool_use') {
      const toolUse = response.content.find((block) => block.type === 'tool_use') as Anthropic.ToolUseBlock | undefined

      if (!toolUse) {
        console.log('[POST /api/chat] No tool use block found')
        break
      }

      console.log('\n---------- TOOL EXECUTION ----------')
      console.log('[POST /api/chat] Tool name:', toolUse.name)
      console.log('[POST /api/chat] Tool input:', JSON.stringify(toolUse.input, null, 2))

      let toolResult: any

      try {
        // Execute the appropriate tool
        switch (toolUse.name) {
          case 'query_events':
            toolResult = await executeQueryEvents(toolUse.input)
            break
          case 'query_todos':
            toolResult = await executeQueryTodos(toolUse.input)
            break
          case 'query_messages':
            toolResult = await executeQueryMessages(toolUse.input)
            break
          case 'create_calendar_event':
            toolResult = await executeCreateEvent(toolUse.input)
            actionType = 'event_created'
            actionData = {
              type: 'event_created',
              title: (toolUse.input as any).title,
              date: (toolUse.input as any).date,
              time: `${(toolUse.input as any).start_time} - ${(toolUse.input as any).end_time}`
            }
            break
          case 'complete_task':
            toolResult = await executeCompleteTask(toolUse.input)
            actionType = 'task_completed'
            actionData = {
              type: 'task_completed'
            }
            break
          case 'delete_calendar_event':
            toolResult = await executeDeleteEvent(toolUse.input)
            actionType = 'event_deleted'
            actionData = {
              type: 'event_deleted',
              deleted_count: toolResult.deleted_count || 0
            }
            break
          default:
            console.log('[POST /api/chat] Unknown tool:', toolUse.name)
            toolResult = { error: 'Unknown tool' }
        }

        console.log('[POST /api/chat] Tool result type:', typeof toolResult)
        console.log('[POST /api/chat] Tool result:', JSON.stringify(toolResult, null, 2))
      } catch (error: any) {
        console.error('[POST /api/chat] Tool execution error:', error)
        toolResult = { error: error.message }
      }

      // Continue conversation with tool result
      messages.push({
        role: 'assistant',
        content: response.content
      })

      messages.push({
        role: 'user',
        content: [
          {
            type: 'tool_result',
            tool_use_id: toolUse.id,
            content: JSON.stringify(toolResult)
          }
        ]
      })

      response = await anthropic.messages.create({
        model: 'claude-sonnet-4-5-20250929',
        max_tokens: 2048,
        system: systemPrompt,
        messages: messages,
        tools: tools,
      })
    }

    // Extract final text response
    const textBlock = response.content.find((block) => block.type === 'text') as Anthropic.TextBlock | undefined
    finalResponse = textBlock?.text || 'I processed your request.'

    console.log('\n========== FINAL RESPONSE ==========')
    console.log('[POST /api/chat] Final response:', finalResponse)
    console.log('[POST /api/chat] Action type:', actionType)
    console.log('[POST /api/chat] Action data:', JSON.stringify(actionData, null, 2))
    console.log('====================================\n')

    return NextResponse.json({
      response: finalResponse,
      actionType,
      actionData
    })

  } catch (error: any) {
    console.error('\n========== ERROR ==========')
    console.error('[POST /api/chat] Error:', error)
    console.error('[POST /api/chat] Error stack:', error.stack)
    console.error('===========================\n')
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}
