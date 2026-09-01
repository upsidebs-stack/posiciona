import { redirect } from 'next/navigation';

import { auth, signIn } from '@/auth';
import { Button } from '@/components/ui/button';

export default async function LoginPage() {
  const session = await auth();
  if (session) redirect('/cycles');

  async function sendMagicLink(formData: FormData) {
    'use server';
    const email = String(formData.get('email') ?? '');
    await signIn('resend', { email, redirectTo: '/cycles' });
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-sm flex-col justify-center gap-6 px-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Sign in to Posiciona</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          We&apos;ll email you a link. No password.
        </p>
      </div>
      <form action={sendMagicLink} className="flex flex-col gap-3">
        <input
          type="email"
          name="email"
          required
          placeholder="you@business.com"
          className="h-10 rounded-md border border-input bg-transparent px-3 text-sm shadow-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
        <Button type="submit">Send magic link</Button>
      </form>
    </div>
  );
}
