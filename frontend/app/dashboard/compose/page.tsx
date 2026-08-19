'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function ComposePage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [recipients, setRecipients] = useState<string[]>([]);
  const [recipientInput, setRecipientInput] = useState('');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [delaySeconds, setDelaySeconds] = useState(2);
  const [hourlyLimit, setHourlyLimit] = useState(100);
  const [scheduledAt, setScheduledAt] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const EMAIL_REGEX = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;

  function addRecipientFromInput() {
    const matches = recipientInput.match(EMAIL_REGEX);
    if (matches) {
      setRecipients((prev) => Array.from(new Set([...prev, ...matches])));
    }
    setRecipientInput('');
  }

  function handleRecipientKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      addRecipientFromInput();
    }
  }

  function removeRecipient(email: string) {
    setRecipients((prev) => prev.filter((r) => r !== email));
  }

  function handleCsvUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      const text = reader.result as string;
      const matches = text.match(EMAIL_REGEX);
      if (matches) {
        setRecipients((prev) => Array.from(new Set([...prev, ...matches])));
      }
    };
    reader.readAsText(file);

    if (fileInputRef.current) fileInputRef.current.value = '';
  }

  async function handleSubmit() {
    setError('');

    if (!subject || !body || recipients.length === 0 || !scheduledAt) {
      setError('Please fill in subject, body, at least one recipient, and a scheduled time.');
      return;
    }

    setSubmitting(true);

    try {
      const res = await fetch('http://localhost:4000/api/campaigns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subject,
          body,
          senderEmail: 'oliver.brown@domain.io',
          recipients,
          scheduledAt: new Date(scheduledAt).toISOString(),
          delaySeconds,
          hourlyLimit,
        }),
      });

      if (!res.ok) throw new Error('Failed to schedule campaign');

      router.push('/dashboard/scheduled');
    } catch (err) {
      setError('Something went wrong. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between px-4 py-3 border-b border-brand-border">
        <div className="flex items-center gap-4">
          <Link href="/dashboard/scheduled" className="text-gray-500 hover:text-gray-800">
            ←
          </Link>
          <h1 className="text-lg font-medium text-gray-900">Compose New Email</h1>
        </div>
        <button
          onClick={handleSubmit}
          disabled={submitting}
          className="bg-brand-green text-white text-sm font-medium px-6 py-2 rounded-full hover:bg-brand-green-hover transition disabled:opacity-50"
        >
          {submitting ? 'Scheduling...' : 'Send Later'}
        </button>
      </div>

      <div className="p-6 max-w-3xl">
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg p-3 mb-4">
            {error}
          </div>
        )}

        <div className="flex items-center gap-3 py-3 border-b border-brand-border">
          <span className="text-sm text-gray-500 w-16">From</span>
          <span className="text-sm text-gray-800 bg-brand-gray px-3 py-1 rounded-full">
            oliver.brown@domain.io
          </span>
        </div>

        <div className="flex items-start gap-3 py-3 border-b border-brand-border">
          <span className="text-sm text-gray-500 w-16 pt-2">To</span>
          <div className="flex-1 flex flex-wrap gap-2 items-center">
            {recipients.map((r) => (
              <span
                key={r}
                className="flex items-center gap-1 bg-brand-green-light text-brand-green text-xs px-2 py-1 rounded-full"
              >
                {r}
                <button onClick={() => removeRecipient(r)} className="hover:text-red-500">
                  ×
                </button>
              </span>
            ))}
            <input
              type="text"
              value={recipientInput}
              onChange={(e) => setRecipientInput(e.target.value)}
              onKeyDown={handleRecipientKeyDown}
              onBlur={addRecipientFromInput}
              placeholder="recipient@example.com"
              className="flex-1 min-w-[160px] text-sm outline-none py-1"
            />
          </div>
          <button
            onClick={() => fileInputRef.current?.click()}
            className="text-sm text-brand-green font-medium whitespace-nowrap hover:underline"
          >
            ↑ Upload List
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,.txt"
            onChange={handleCsvUpload}
            className="hidden"
          />
        </div>

        {recipients.length > 0 && (
          <p className="text-xs text-gray-400 mt-1">
            {recipients.length} email address{recipients.length !== 1 ? 'es' : ''} detected
          </p>
        )}

        <div className="flex items-center gap-3 py-3 border-b border-brand-border">
          <span className="text-sm text-gray-500 w-16">Subject</span>
          <input
            type="text"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="Subject"
            className="flex-1 text-sm outline-none"
          />
        </div>

        <div className="flex items-center gap-6 py-3 border-b border-brand-border">
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-500">Delay between 2 emails</span>
            <input
              type="number"
              value={delaySeconds}
              onChange={(e) => setDelaySeconds(Number(e.target.value))}
              className="w-16 bg-brand-gray rounded-lg px-2 py-1 text-sm text-center outline-none"
            />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-500">Hourly Limit</span>
            <input
              type="number"
              value={hourlyLimit}
              onChange={(e) => setHourlyLimit(Number(e.target.value))}
              className="w-16 bg-brand-gray rounded-lg px-2 py-1 text-sm text-center outline-none"
            />
          </div>
        </div>

        <div className="flex items-center gap-3 py-3 border-b border-brand-border">
          <span className="text-sm text-gray-500 w-24">Send at</span>
          <input
            type="datetime-local"
            value={scheduledAt}
            onChange={(e) => setScheduledAt(e.target.value)}
            className="text-sm bg-brand-gray rounded-lg px-3 py-2 outline-none"
          />
        </div>

        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Type Your Reply..."
          rows={10}
          className="w-full bg-brand-gray rounded-lg px-4 py-3 text-sm outline-none mt-4 resize-none"
        />
      </div>
    </div>
  );
}
