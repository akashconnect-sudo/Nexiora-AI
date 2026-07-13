import { SiteFooter } from '@/components/site-footer';
import { SiteHeader } from '@/components/site-header';

export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <SiteHeader />
      <main className="nx-atmosphere min-h-[calc(100vh-3.5rem)]">{children}</main>
      <SiteFooter />
    </>
  );
}
