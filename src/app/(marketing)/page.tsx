import Link from 'next/link';

import { Button } from '@/components/ui/button';

export default function MarketingPage() {
  return (
    <div className="mx-auto flex min-h-screen max-w-2xl flex-col items-center justify-center gap-6 px-6 text-center">
      <h1 className="text-4xl font-semibold tracking-tight">
        See the competitors who actually take your customers.
      </h1>
      <p className="max-w-xl text-lg text-muted-foreground">
        Posiciona maps your local market on eight attributes built from public data — hours,
        pricing, service types, and your competitors&apos; own websites. Not review volume.
      </p>
      <Button size="lg" nativeButton={false} render={<Link href="/login">See my free map</Link>} />
    </div>
  );
}
