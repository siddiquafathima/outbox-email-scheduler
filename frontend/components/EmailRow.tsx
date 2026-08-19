import { EmailRecord } from '@/types';
import Link from 'next/link';

function getInitial(email: string) {
  return email.charAt(0).toUpperCase();
}

function formatTime(dateStr: string) {
  const date = new Date(dateStr);
  return date.toLocaleString('en-US', {
    weekday: 'short',
    hour: 'numeric',
    minute: '2-digit',
  });
}

export default function EmailRow({ email }: { email: EmailRecord }) {
  const isSent = email.status === 'SENT';
  const isFailed = email.status === 'FAILED';

  return (
    <Link
      href={`/dashboard/email/${email.id}`}
      className="flex items-center gap-4 px-4 py-3 border-b border-brand-border hover:bg-brand-gray transition cursor-pointer"
    >
      <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-xs font-medium text-gray-600 shrink-0">
        {getInitial(email.recipient)}
      </div>

      <div className="w-48 shrink-0 text-sm text-gray-800 truncate">
        To: {email.recipient}
      </div>

      <span
        className={`text-xs px-2 py-1 rounded-full shrink-0 font-medium ${
          isFailed
            ? 'bg-red-100 text-red-600'
            : isSent
            ? 'bg-gray-100 text-gray-600'
            : 'bg-orange-100 text-orange-600'
        }`}
      >
        {isSent ? 'Sent' : isFailed ? 'Failed' : formatTime(email.scheduled_at)}
      </span>

      <div className="flex-1 min-w-0 text-sm text-gray-700 truncate">
        <span className="font-medium">{email.subject}</span>
        <span className="text-gray-400"> · {email.body}</span>
      </div>
    </Link>
  );
}