import { EmailRecord } from '@/types';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:4000/api';

export async function fetchEmails(status: 'SCHEDULED' | 'SENT' | 'FAILED'): Promise<EmailRecord[]> {
  const res = await fetch(`${API_BASE}/emails?status=${status}`, { cache: 'no-store' });
  if (!res.ok) throw new Error('Failed to fetch emails');
  const data = await res.json();
  return data.emails;
}
export async function fetchEmailById(id: string): Promise<EmailDetail> {
  const res = await fetch(`${API_BASE}/emails/${id}`, { cache: 'no-store' });
  if (!res.ok) throw new Error('Failed to fetch email');
  const data = await res.json();
  return data.email;
}