import { fetchEmailById } from '@/lib/api';
import Link from 'next/link';

export default async function EmailDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const email = await fetchEmailById(id);

  const displayDate = email.sent_at
    ? new Date(email.sent_at).toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
      })
    : new Date(email.scheduled_at).toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
      });

  return (
    <div>
      <div className="flex items-center justify-between px-4 py-3 border-b border-brand-border">
        <div className="flex items-center gap-4">
          <Link href="/dashboard/sent" className="text-gray-500 hover:text-gray-800">
            ←
          </Link>
          <h1 className="text-lg font-medium text-gray-900">{email.subject}</h1>
        </div>
      </div>

      <div className="p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-9 h-9 rounded-full bg-brand-green flex items-center justify-center text-white text-sm font-semibold">
            {email.sender_email.charAt(0).toUpperCase()}
          </div>
          <div className="flex-1">
            <div className="text-sm font-medium text-gray-900">{email.sender_email}</div>
            <div className="text-xs text-gray-400">to {email.recipient}</div>
          </div>
          <div className="text-xs text-gray-400">{displayDate}</div>
        </div>

        <div className="text-sm text-gray-700 whitespace-pre-wrap mb-6">
          {email.body}
        </div>

        {email.status === 'FAILED' && email.error_message && (
          <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg p-3 mb-6">
            Failed: {email.error_message}
          </div>
        )}

        {email.preview_url && (
          
            <a
            href={email.preview_url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block text-sm text-brand-green font-medium hover:underline"
          >
            View Rendered Email →
          </a>
        )}
      </div>
    </div>
  );
}
