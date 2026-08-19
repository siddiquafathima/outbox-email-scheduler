import Sidebar from '@/components/Sidebar';
import { auth } from '@/auth';
import { redirect } from 'next/navigation';

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  if (!session?.user) {
    redirect('/login');
  }

  return (
    <div className="flex">
      <Sidebar user={session.user} />
      <main className="flex-1">{children}</main>
    </div>
  );
}
