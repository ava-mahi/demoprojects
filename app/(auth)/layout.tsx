import Link from 'next/link';

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col">
      <header className="px-6 md:px-10 py-5">
        <Link href="/" className="flex items-center gap-2 font-bold tracking-tight text-lg">
          <span className="inline-block w-7 h-7 rounded-lg bg-gradient-to-br from-brand to-up shadow-glow" />
          Nova<span className="text-brand">Trade</span>
        </Link>
      </header>
      <main className="flex-1 flex items-center justify-center px-6 py-10">
        <div className="w-full max-w-md">{children}</div>
      </main>
    </div>
  );
}
