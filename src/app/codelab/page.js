import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';

import CodeLabPageClient from './CodeLabPageClient';
import { authOptions } from '../../lib/auth';

export default async function CodeLabPage() {
  const session = await getServerSession(authOptions);
  if (!session) {
    redirect(`/auth/signup?callbackUrl=${encodeURIComponent('/codelab')}`);
  }

  return <CodeLabPageClient />;
}
