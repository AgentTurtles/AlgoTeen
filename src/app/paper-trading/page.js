import { redirect } from 'next/navigation';
import GlobalStyles from '../../components/GlobalStyles';
import SiteFooter from '../../components/SiteFooter';
import SiteHeader from '../../components/SiteHeader';
import PaperTradingWorkspace from '../../components/paper/PaperTradingWorkspace';
import SITE_SEARCH_INDEX from '../../data/searchIndex';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../lib/auth';

const NAV_ITEMS = [
  { id: 'desk', label: 'PAPER DESK' }
];

export default async function PaperTradingPage() {
  const session = await getServerSession(authOptions);
  if (!session) {
    redirect(`/auth/signin?callbackUrl=${encodeURIComponent('/paper-trading')}`);
  }

  return (
    <div className="min-h-screen bg-[#F5F7F5]">
      <GlobalStyles />
      <SiteHeader navItems={NAV_ITEMS} searchItems={SITE_SEARCH_INDEX} />
      <main id="desk" className="mt-16">
        <PaperTradingWorkspace />
      </main>
      <SiteFooter />
    </div>
  );
}
