import { fetchEmails } from '@/lib/api';
import EmailRow from '@/components/EmailRow';

export default async function SentPage() {
  const emails = await fetchEmails('SENT');

  return (
    <div>
      <div className="p-4 border-b border-brand-border">
        <input
          type="text"
          placeholder="Search"
          disabled
          className="w-full max-w-md bg-brand-gray rounded-lg px-4 py-2 text-sm outline-none"
        />
      </div>

      {emails.length === 0 ? (
        <div className="p-8 text-center text-gray-400">No sent emails yet.</div>
      ) : (
        emails.map((email) => <EmailRow key={email.id} email={email} />)
      )}
    </div>
  );
}