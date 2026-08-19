export interface ScheduleEmailRequest {
  subject: string;
  body: string;
  senderEmail: string;
  recipients: string[];
  scheduledAt: string; // ISO date string, e.g. "2026-08-19T10:00:00Z"
  delaySeconds: number;
  hourlyLimit: number;
}

export interface EmailJobData {
  emailId: number;
  campaignId: number;
  recipient: string;
  subject: string;
  body: string;
  senderEmail: string;
  hourlyLimit: number;
}

