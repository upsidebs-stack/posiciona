export default function CheckEmailPage() {
  return (
    <div className="mx-auto flex min-h-screen max-w-sm flex-col justify-center gap-2 px-6 text-center">
      <h1 className="text-2xl font-semibold tracking-tight">Check your email</h1>
      <p className="text-sm text-muted-foreground">
        We sent you a sign-in link. It expires shortly, so use it soon.
      </p>
    </div>
  );
}
