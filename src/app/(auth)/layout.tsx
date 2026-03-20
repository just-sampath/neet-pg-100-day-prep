export default function AuthLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <main id="main-content" className="app-shell flex min-h-screen items-center justify-center">
      <div className="grid w-full max-w-6xl gap-6 md:grid-cols-[1.15fr_0.85fr]">{children}</div>
    </main>
  );
}
