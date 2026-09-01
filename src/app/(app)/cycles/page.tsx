import { redirect } from 'next/navigation';

import { auth, signOut } from '@/auth';
import { Button } from '@/components/ui/button';

export default async function CyclesPage() {
  const session = await auth();
  if (!session?.user) redirect('/login');

  return (
    <div className="mx-auto flex min-h-screen max-w-2xl flex-col gap-4 px-6 py-16">
      <h1 className="text-2xl font-semibold tracking-tight">Your businesses</h1>
      <p className="text-sm text-muted-foreground">
        Signed in as {session.user.email}. No diagnosis yet — that&apos;s Fase 1.
      </p>
      <form
        action={async () => {
          'use server';
          await signOut({ redirectTo: '/' });
        }}
      >
        <Button type="submit" variant="outline">
          Sign out
        </Button>
      </form>
    </div>
  );
}
