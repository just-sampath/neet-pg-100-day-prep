export default function AuthLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <main id="main-content" className="app-shell flex min-h-screen items-center justify-center">
      <div className="w-full max-w-md">{children}</div>
    </main>
  );
}
