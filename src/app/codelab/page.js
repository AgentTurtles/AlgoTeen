import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';

import CodeLabPageClient from './CodeLabPageClient';
import { authOptions } from '../../lib/auth';

export default async function CodeLabPage() {
  const session = await getServerSession(authOptions);
  // Allow unauthenticated access to the CodeLab page.
  // Client will show a mode selector and soft-gate features that require auth.
  const sessionSafe = session || null;

  return <CodeLabPageClient session={sessionSafe} />;
}
