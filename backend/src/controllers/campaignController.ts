import { Request, Response } from 'express';
import { pool } from '../config/db';
import { emailQueue } from '../queues/emailQueue';
import { ScheduleEmailRequest, EmailJobData } from '../types';

export const createCampaign = async (req: Request, res: Response) => {
  try {
    const {
      subject,
      body,
      senderEmail,
      recipients,
      scheduledAt,
      delaySeconds,
      hourlyLimit,
    }: ScheduleEmailRequest = req.body;

    if (!subject || !body || !recipients?.length || !scheduledAt) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // 1. Find or create the sender
    const [senderRows]: any = await pool.query(
      'INSERT INTO senders (email) VALUES (?) ON DUPLICATE KEY UPDATE id = LAST_INSERT_ID(id)',
      [senderEmail]
    );
    const senderId = senderRows.insertId;

    // 2. Create the campaign
    const [campaignResult]: any = await pool.query(
      `INSERT INTO campaigns (subject, body, sender_id, delay_seconds, hourly_limit)
       VALUES (?, ?, ?, ?, ?)`,
      [subject, body, senderId, delaySeconds, hourlyLimit]
    );
    const campaignId = campaignResult.insertId;

    // 3. Create one `emails` row per recipient, and queue a delayed job for each
    const scheduledDate = new Date(scheduledAt);
    const now = new Date();
    const delayMs = Math.max(0, scheduledDate.getTime() - now.getTime());

    for (const recipient of recipients) {
      const [emailResult]: any = await pool.query(
        `INSERT INTO emails (campaign_id, recipient, status, scheduled_at)
         VALUES (?, ?, 'SCHEDULED', ?)`,
        [campaignId, recipient, scheduledDate]
      );
      const emailId = emailResult.insertId;

      const jobId = `email-${campaignId}-${emailId}`; // stable, unique per email — this IS our idempotency guarantee

      const jobData: EmailJobData = {
        emailId,
        campaignId,
        recipient,
        subject,
        body,
        senderEmail,
        hourlyLimit,
      };

      await emailQueue.add('send-email', jobData, {
        jobId,
        delay: delayMs,
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 5000,
        },
      });

      // save the job ID against the email row, so we can look it up/debug later
      await pool.query('UPDATE emails SET job_id = ? WHERE id = ?', [jobId, emailId]);
    }

    res.status(201).json({
      message: 'Campaign scheduled successfully',
      campaignId,
      emailsScheduled: recipients.length,
    });
  } catch (error: any) {
    console.error('Error creating campaign:', error);
    res.status(500).json({ error: 'Failed to schedule campaign' });
  }
};
export const getEmails = async (req: Request, res: Response) => {
  try {
    const status = req.query.status as string;

    const validStatuses = ['SCHEDULED', 'SENT', 'FAILED'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: 'Invalid or missing status query param' });
    }

    const [rows] = await pool.query(
      `SELECT e.id, e.recipient, e.status, e.scheduled_at, e.sent_at, e.preview_url, e.error_message,
              c.subject, c.body
       FROM emails e
       JOIN campaigns c ON e.campaign_id = c.id
       WHERE e.status = ?
       ORDER BY e.scheduled_at DESC`,
      [status]
    );

    res.json({ emails: rows });
  } catch (error) {
    console.error('Error fetching emails:', error);
    res.status(500).json({ error: 'Failed to fetch emails' });
  }
};

export const getEmailById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const [rows]: any = await pool.query(
      `SELECT e.id, e.recipient, e.status, e.scheduled_at, e.sent_at, e.preview_url, e.error_message,
              c.subject, c.body, s.email AS sender_email
       FROM emails e
       JOIN campaigns c ON e.campaign_id = c.id
       JOIN senders s ON c.sender_id = s.id
       WHERE e.id = ?`,
      [id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Email not found' });
    }

    res.json({ email: rows[0] });
  } catch (error) {
    console.error('Error fetching email:', error);
    res.status(500).json({ error: 'Failed to fetch email' });
  }
};