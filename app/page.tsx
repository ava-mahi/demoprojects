import Link from 'next/link';
import { ArrowRight, BarChart3, Bolt, ShieldCheck, Wallet, Globe2, Zap } from 'lucide-react';

export default function Landing() {
  return (
    <main className="min-h-screen">
      <header className="px-6 md:px-10 py-5 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2 font-bold tracking-tight text-lg">
          <span className="inline-block w-7 h-7 rounded-lg bg-gradient-to-br from-brand to-up shadow-glow" />
          Nova<span className="text-brand">Trade</span>
        </Link>
        <nav className="hidden md:flex items-center gap-8 text-sm text-muted">
          <a href="#features" className="hover:text-text">Features</a>
          <a href="#assets" className="hover:text-text">Assets</a>
          <a href="#how" className="hover:text-text">How it works</a>
        </nav>
        <div className="flex items-center gap-2">
          <Link href="/login" className="btn btn-ghost">Sign in</Link>
          <Link href="/register" className="btn btn-primary">Get started <ArrowRight size={16} /></Link>
        </div>
      </header>

      <section className="px-6 md:px-10 pt-10 md:pt-20 pb-20 max-w-7xl mx-auto">
        <div className="grid md:grid-cols-2 gap-10 items-center">
          <div>
            <span className="chip mb-5">Real-time · Multi-asset · Premium</span>
            <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight leading-[1.05]">
              Trade <span className="bg-gradient-to-r from-brand to-up bg-clip-text text-transparent">smarter</span>.<br/>
              Live markets, instant fills.
            </h1>
            <p className="mt-5 text-muted text-lg max-w-xl">
              Binary options &amp; spot trading on 20+ assets — crypto, forex, stocks, commodities.
              Lightning-fast charts, glass UI, and a transparent platform you can trust.
            </p>
            <div className="mt-7 flex flex-wrap items-center gap-3">
              <Link href="/register" className="btn btn-primary">Open free demo <ArrowRight size={16} /></Link>
              <Link href="/login" className="btn btn-ghost">I have an account</Link>
            </div>
            <div className="mt-7 flex items-center gap-6 text-xs text-muted">
              <div className="flex items-center gap-2"><ShieldCheck size={16} className="text-up" /> JWT secured</div>
              <div className="flex items-center gap-2"><Bolt size={16} className="text-brand" /> Sub-second updates</div>
              <div className="flex items-center gap-2"><Globe2 size={16} className="text-gold" /> Multi-currency</div>
            </div>
          </div>
          <div className="glass rounded-2xl p-2 md:p-3 shadow-card">
            <div className="rounded-xl overflow-hidden bg-bg-card aspect-[16/11] relative">
              <div className="absolute inset-0 bg-grid-faint [background-size:30px_30px] opacity-30" />
              <div className="absolute inset-0 p-6 flex flex-col">
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-up animate-pulse-slow" /> BTC/USDT · LIVE</div>
                  <div className="mono">67,432.18 <span className="text-up">+1.24%</span></div>
                </div>
                <svg viewBox="0 0 600 280" className="mt-4 flex-1 w-full">
                  <defs>
                    <linearGradient id="lg" x1="0" x2="0" y1="0" y2="1">
                      <stop offset="0%" stopColor="#22D39A" stopOpacity="0.5" />
                      <stop offset="100%" stopColor="#22D39A" stopOpacity="0" />
                    </linearGradient>
                  </defs>
                  <path d="M0,200 C60,170 90,210 150,180 C220,140 260,200 310,150 C380,90 420,160 480,120 C540,90 580,110 600,80 L600,280 L0,280 Z" fill="url(#lg)" />
                  <path d="M0,200 C60,170 90,210 150,180 C220,140 260,200 310,150 C380,90 420,160 480,120 C540,90 580,110 600,80" fill="none" stroke="#22D39A" strokeWidth="2.5" />
                </svg>
                <div className="grid grid-cols-2 gap-3 mt-3">
                  <button className="btn btn-up">UP · 87%</button>
                  <button className="btn btn-down">DOWN · 87%</button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="features" className="px-6 md:px-10 pb-20 max-w-7xl mx-auto">
        <h2 className="text-2xl md:text-3xl font-bold">Built for serious traders</h2>
        <div className="grid md:grid-cols-3 gap-4 mt-8">
          {[
            { icon: BarChart3, t: 'Pro-grade charts', d: 'TradingView-powered candlestick & area charts with sub-second tick updates.' },
            { icon: Zap, t: 'Instant binary trades', d: 'UP / DOWN with payouts up to 87%. Choose your expiry, see live P/L.' },
            { icon: Wallet, t: 'Demo + Live accounts', d: 'Switch in one click. Separate balances, identical execution path.' },
            { icon: ShieldCheck, t: 'Secure by default', d: 'HttpOnly JWT, hashed passwords, session revocation, admin audit logs.' },
            { icon: Globe2, t: 'Multi-currency', d: 'PKR, INR, USD, EUR, PHP, BDT and more. Live FX-based display.' },
            { icon: Bolt, t: 'Realtime everywhere', d: 'Socket-driven balances, ticks, trade outcomes, and notifications.' },
          ].map((f, i) => (
            <div key={i} className="glass rounded-2xl p-5">
              <f.icon size={20} className="text-brand" />
              <div className="mt-3 font-semibold">{f.t}</div>
              <div className="text-sm text-muted mt-1.5">{f.d}</div>
            </div>
          ))}
        </div>
      </section>

      <section id="assets" className="px-6 md:px-10 pb-20 max-w-7xl mx-auto">
        <h2 className="text-2xl md:text-3xl font-bold">Trade 20+ markets</h2>
        <div className="grid md:grid-cols-4 gap-3 mt-8">
          {['BTC/USDT','ETH/USDT','SOL/USDT','EUR/USD','GBP/USD','USD/JPY','USD/PKR','AAPL','TSLA','NVDA','META','XAU/USD','XAG/USD','WTI/USD','MSFT','NFLX'].map((s) => (
            <div key={s} className="glass rounded-xl px-4 py-3 flex items-center justify-between text-sm">
              <span className="font-semibold">{s}</span>
              <span className="chip chip-up">LIVE</span>
            </div>
          ))}
        </div>
      </section>

      <footer className="px-6 md:px-10 py-10 border-t border-line text-sm text-muted max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-4">
        <div>© {new Date().getFullYear()} Nova Trade. Demo platform — for educational purposes only.</div>
        <div className="flex items-center gap-4">
          <Link href="/login">Sign in</Link>
          <Link href="/register">Register</Link>
        </div>
      </footer>
    </main>
  );
}
