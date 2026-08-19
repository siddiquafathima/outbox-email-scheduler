export interface EmailRecord {
  id: number;
  recipient: string;
  status: 'SCHEDULED' | 'SENT' | 'FAILED';
  scheduled_at: string;
  sent_at: string | null;
  preview_url: string | null;
  error_message: string | null;
  subject: string;
  body: string;
}

export interface EmailDetail extends EmailRecord {
  sender_email: string;
}