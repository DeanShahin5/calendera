const Anthropic = require('@anthropic-ai/sdk');
const logger = require('../utils/logger');
const BeeperDatabase = require('../beeper-database');

class BeeperRecruitmentAgent {
  constructor() {
    this.anthropic = null;
    this.db = new BeeperDatabase();
  }

  /**
   * Initialize the agent
   */
  async initialize() {
    try {
      logger.info('Initializing Beeper Recruitment Agent...');

      // Initialize database
      await this.db.initialize();

      // Initialize Anthropic client
      const apiKey = process.env.ANTHROPIC_API_KEY;
      if (!apiKey) {
        throw new Error('ANTHROPIC_API_KEY environment variable is not set');
      }

      this.anthropic = new Anthropic({
        apiKey: apiKey,
      });

      logger.info('Beeper Recruitment Agent initialized successfully');
      return true;
    } catch (error) {
      logger.error('Failed to initialize Beeper Recruitment Agent', { error: error.message });
      throw error;
    }
  }

  /**
   * Analyze a message for recruitment/job opportunity content
   */
  async analyzeRecruitment(message) {
    try {
      logger.info(`Analyzing recruitment message from ${message.from_name} on ${message.platform}`);

      // Build specialized prompt for recruitment analysis
      const prompt = this.buildRecruitmentPrompt(message);

      // Call Claude API
      const response = await this.anthropic.messages.create({
        model: 'claude-sonnet-4-5-20250929',
        max_tokens: 2048,
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ]
      });

      const analysisText = response.content[0].text;
      
      // Strip markdown code blocks if present
      let cleanedText = analysisText.trim();
      if (cleanedText.startsWith('```json')) {
        cleanedText = cleanedText.replace(/^```json\s*\n/, '').replace(/\n```\s*$/, '');
      } else if (cleanedText.startsWith('```')) {
        cleanedText = cleanedText.replace(/^```\s*\n/, '').replace(/\n```\s*$/, '');
      }
      
      const recruitmentData = JSON.parse(cleanedText);

      logger.info('Recruitment analysis complete', {
        messageId: message.id,
        isJobOpportunity: recruitmentData.isJobOpportunity,
        jobTitle: recruitmentData.jobDetails?.title,
        confidence: recruitmentData.confidence
      });

      return recruitmentData;
    } catch (error) {
      logger.error('Failed to analyze recruitment message', {
        messageId: message.id,
        error: error.message,
        stack: error.stack
      });
      throw error;
    }
  }

  /**
   * Build specialized prompt for recruitment analysis
   */
  buildRecruitmentPrompt(message) {
    return `You are a specialized recruitment and job opportunity analysis AI for chat messages. Your task is to analyze a message from ${message.platform} and extract detailed job opportunity information.

Message Details:
Platform: ${message.platform}
From: ${message.from_name} (${message.from_contact})
Room: ${message.room_name || 'Direct Message'}
Date: ${message.date}
Is Group: ${message.is_group_message}
Body:
${message.body}

Your task is to:
1. Determine if this is a job opportunity or recruitment-related message
2. Extract all job details with high precision
3. Classify the type of opportunity
4. Identify the source (recruiter, company, referral)
5. Assess the quality and relevance of the opportunity

Analyze and extract:

**Job Details:**
- **Job Title**: Exact position title
- **Company**: Company name
- **Location**: Job location (city, state, country) or "Remote"
- **Job Type**: full-time, part-time, contract, freelance, internship
- **Work Mode**: remote, hybrid, onsite
- **Salary Range**: If mentioned (e.g., "$100k-$120k", "Competitive")
- **Experience Level**: entry, mid, senior, lead, executive
- **Required Skills**: Key skills or technologies mentioned
- **Application Deadline**: If specified
- **Job Description**: Brief summary of role

**Source Information:**
- **Source Type**: recruiter_outreach, company_direct, referral, linkedin, slack, other
- **Recruiter Name**: If from a recruiter
- **Recruiter Company**: Recruiting agency name if applicable
- **Application Link**: URL to apply if provided

**Opportunity Assessment:**
- **Relevance**: How relevant to recipient (high, medium, low)
- **Quality**: Quality of opportunity (excellent, good, average, poor)
- **Legitimacy**: Appears legitimate or suspicious (legitimate, questionable, spam)
- **Interest Level**: Recommended interest (high_interest, moderate_interest, low_interest, not_interested)

**Communication Type:**
- new_opportunity: First contact about a position
- follow_up: Follow-up on previous application
- interview_invitation: Invitation to interview
- offer: Job offer
- rejection: Application rejection
- application_confirmation: Confirmation of application received
- networking: General networking, not specific job

**Red Flags:**
- Vague job description
- No company name
- Requests payment or personal info upfront
- Too-good-to-be-true salary
- Poor grammar/spelling
- Suspicious sender

Return ONLY a valid JSON object with no additional text. Format:

{
  "isJobOpportunity": true,
  "confidence": 0.95,
  "communicationType": "new_opportunity",
  "jobDetails": {
    "title": "Senior Software Engineer",
    "company": "TechCorp Inc",
    "location": "San Francisco, CA",
    "jobType": "full-time",
    "workMode": "hybrid",
    "salaryRange": "$140k-$180k",
    "experienceLevel": "senior",
    "requiredSkills": ["JavaScript", "React", "Node.js", "AWS"],
    "applicationDeadline": "2024-04-15",
    "description": "Leading development of cloud-based applications..."
  },
  "sourceInfo": {
    "sourceType": "recruiter_outreach",
    "recruiterName": "Jane Smith",
    "recruiterCompany": "Tech Recruiters LLC",
    "applicationLink": "https://apply.techcorp.com/job/12345"
  },
  "assessment": {
    "relevance": "high",
    "quality": "excellent",
    "legitimacy": "legitimate",
    "interestLevel": "high_interest"
  },
  "redFlags": [],
  "nextSteps": [
    "Review job description in detail",
    "Research company",
    "Prepare resume",
    "Apply by 2024-04-15"
  ]
}

For non-job messages:
{
  "isJobOpportunity": false,
  "confidence": 0.90,
  "communicationType": null,
  "jobDetails": null,
  "sourceInfo": null,
  "assessment": null,
  "redFlags": [],
  "nextSteps": []
}`;
  }

  /**
   * Process all RECRUITMENT category messages
   */
  async processRecruitmentMessages() {
    try {
      logger.info('Processing Beeper RECRUITMENT messages...');

      // Get all processed messages with RECRUITMENT category
      const messages = await this.db.all(`
        SELECT m.*, pm.category, pm.confidence as category_confidence
        FROM beeper_messages m
        JOIN beeper_processed_messages pm ON m.id = pm.message_id
        LEFT JOIN beeper_job_opportunities jo ON m.id = jo.message_id
        WHERE pm.category = 'RECRUITMENT' AND jo.id IS NULL
        ORDER BY m.timestamp DESC
        LIMIT 100
      `);

      logger.info(`Found ${messages.length} RECRUITMENT messages to process`);

      let processedCount = 0;
      let jobsFound = 0;
      let interviewInvites = 0;

      for (const message of messages) {
        try {
          const result = await this.analyzeRecruitment(message);

          if (result.isJobOpportunity) {
            // Store job opportunity
            await this.storeJobOpportunity(message, result);
            jobsFound++;

            if (result.communicationType === 'interview_invitation') {
              interviewInvites++;
              logger.info(`INTERVIEW INVITATION: ${result.jobDetails?.title} at ${result.jobDetails?.company}`);
            }
          }

          processedCount++;
        } catch (error) {
          logger.error(`Failed to process RECRUITMENT message ${message.id}`, {
            messageId: message.id,
            error: error.message
          });
        }
      }

      return {
        processed: processedCount,
        jobsFound: jobsFound,
        interviewInvites: interviewInvites
      };
    } catch (error) {
      logger.error('Error in processRecruitmentMessages', { error: error.message });
      throw error;
    }
  }

  /**
   * Store job opportunity in database
   */
  async storeJobOpportunity(message, recruitmentData) {
    try {
      const job = recruitmentData.jobDetails || {};
      const source = recruitmentData.sourceInfo || {};
      const assessment = recruitmentData.assessment || {};

      // Insert job opportunity
      await this.db.run(`
        INSERT INTO beeper_job_opportunities (
          message_id, from_contact, communication_type,
          job_title, company, location, job_type, work_mode,
          salary_range, experience_level, required_skills,
          application_deadline, job_description,
          source_type, recruiter_name, application_link,
          relevance, quality, legitimacy, interest_level
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        message.id,
        message.from_contact,
        recruitmentData.communicationType,
        job.title,
        job.company,
        job.location,
        job.jobType,
        job.workMode,
        job.salaryRange,
        job.experienceLevel,
        JSON.stringify(job.requiredSkills || []),
        job.applicationDeadline,
        job.description,
        source.sourceType,
        source.recruiterName,
        source.applicationLink,
        assessment.relevance,
        assessment.quality,
        assessment.legitimacy,
        assessment.interestLevel
      ]);

      logger.debug('Stored job opportunity', { messageId: message.id });
    } catch (error) {
      logger.error('Error storing job opportunity', {
        messageId: message.id,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Get high-interest job opportunities
   */
  async getHighInterestJobs() {
    try {
      const jobs = await this.db.all(`
        SELECT jo.*, m.body, m.date, m.from_name, m.platform
        FROM beeper_job_opportunities jo
        JOIN beeper_messages m ON jo.message_id = m.id
        WHERE jo.interest_level = 'high_interest'
          AND jo.legitimacy = 'legitimate'
          AND jo.status = 'new'
        ORDER BY jo.created_at DESC
        LIMIT 50
      `);

      return jobs.map(job => ({
        ...job,
        required_skills: JSON.parse(job.required_skills || '[]')
      }));
    } catch (error) {
      logger.error('Error getting high interest jobs', { error: error.message });
      throw error;
    }
  }

  /**
   * Get interview invitations
   */
  async getInterviewInvitations() {
    try {
      const interviews = await this.db.all(`
        SELECT jo.*, m.body, m.date, m.from_name, m.platform
        FROM beeper_job_opportunities jo
        JOIN beeper_messages m ON jo.message_id = m.id
        WHERE jo.communication_type = 'interview_invitation'
        ORDER BY jo.created_at DESC
        LIMIT 20
      `);

      return interviews;
    } catch (error) {
      logger.error('Error getting interview invitations', { error: error.message });
      throw error;
    }
  }

  /**
   * Cleanup
   */
  async cleanup() {
    if (this.db) {
      await this.db.close();
    }
  }
}

module.exports = BeeperRecruitmentAgent;
