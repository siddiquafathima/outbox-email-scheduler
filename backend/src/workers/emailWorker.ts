import { Worker, Job } from 'bullmq';
import { redisConnection } from '../config/redis';
import { transporter } from '../config/mailer';
import { pool } from '../config/db';
import { emailQueue } from '../queues/emailQueue';
import { EmailJobData } from '../types';

const CONCURRENCY = Number(process.env.WORKER_CONCURRENCY) || 5;
const MIN_DELAY_MS = Number(process.env.MIN_DELAY_BETWEEN_EMAILS_MS) || 2000;

// Returns the Redis key for a sender's current hour "bucket"
function getHourWindowKey(senderEmail: string): string {
  const now = new Date();
  const hourWindow = `${now.getFullYear()}-${now.getMonth()}-${now.getDate()}-${now.getHours()}`;
  return `rate-limit:${senderEmail}:${hourWindow}`;
}
export const emailWorker = new Worker<EmailJobData>(
  'email-sending',
  async (job: Job<EmailJobData>) => {
    const { emailId, recipient, subject, body, senderEmail, hourlyLimit } = job.data;

    // 1. Check the hourly rate limit for this sender
    const hourKey = getHourWindowKey(senderEmail);
    const currentCount = await redisConnection.incr(hourKey);

    if (currentCount === 1) {
      // first email in this hour window — set the key to expire after 1 hour,
      // so old counters clean themselves up automatically
      await redisConnection.expire(hourKey, 3600);
    }
    if (currentCount > hourlyLimit) {
      // Over the limit — reschedule this exact job into the next hour window,
      // instead of dropping it or failing it.
      await redisConnection.decr(hourKey); // undo the increment, since this job isn't actually running now

      const nextHourDelay = 60 * 60 * 1000; // 1 hour in ms, simplified: push it forward an hour
      const newScheduledAt = new Date(Date.now() + nextHourDelay);

      await emailQueue.add('send-email', job.data, {
        jobId: `${job.id}-retry-${Date.now()}`, // new unique id, since original id is "used"
        delay: nextHourDelay,
        attempts: 3,
        backoff: { type: 'exponential', delay: 5000 },
      });

      // Keep the DB truthful about when this email will actually go out
      await pool.query(
        `UPDATE emails SET scheduled_at = ? WHERE id = ?`,
        [newScheduledAt, emailId]
      );

      console.log(`⏳ Hourly limit hit for ${senderEmail}, rescheduled email ${emailId} to next hour (${newScheduledAt.toISOString()})`);
      return; // exit this job run cleanly — it's been requeued, not failed
    }

    // 2. Send the email via Ethereal
    const info = await transporter.sendMail({
      from: `"Campaign" <${senderEmail}>`,
      to: recipient,
      subject,
      html: body,
    });

    const previewUrl = require('nodemailer').getTestMessageUrl(info) || null;

    // 3. Update MySQL — mark as SENT, save preview URL and timestamp
    await pool.query(
      `UPDATE emails SET status = 'SENT', sent_at = NOW(), preview_url = ? WHERE id = ?`,
      [previewUrl, emailId]
    );

    console.log(`✅ Sent email ${emailId} to ${recipient}`);

    // 4. Respect the minimum delay before this worker slot picks up its next job
    await new Promise((resolve) => setTimeout(resolve, MIN_DELAY_MS));
  },
  {
    connection: redisConnection,
    concurrency: CONCURRENCY,
  }
);

// If a job fails permanently (all retries exhausted), mark it FAILED in the DB
emailWorker.on('failed', async (job, err) => {
  if (!job) return;
  const { emailId } = job.data as EmailJobData;
  await pool.query(
    `UPDATE emails SET status = 'FAILED', error_message = ? WHERE id = ?`,
    [err.message, emailId]
  );
  console.log(`❌ Email ${emailId} permanently failed: ${err.message}`);
});

console.log(`🚀 Email worker started with concurrency ${CONCURRENCY}`);