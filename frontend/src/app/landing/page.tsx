"use client";

import { useState } from "react";
import Link from "next/link";
import { BarChart3, Activity, Shield, Zap, Globe, Users, ArrowRight, Check, Sparkles, Database, Clock, Star } from "lucide-react";

const features = [
  { icon: BarChart3, title: "Real-Time Analytics", desc: "Monitor metrics as they happen. Instant updates, zero lag.", color: "bg-blue-50 text-blue-500" },
  { icon: Shield, title: "Enterprise Security", desc: "SOC 2 certified. End-to-end encryption built in.", color: "bg-emerald-50 text-emerald-500" },
  { icon: Zap, title: "Lightning Fast", desc: "Sub-100ms queries. Millions of events, no sweat.", color: "bg-orange-50 text-orange-500" },
  { icon: Globe, title: "Multi-Region", desc: "12 global regions with automatic failover.", color: "bg-violet-50 text-violet-500" },
  { icon: Users, title: "Team Collaboration", desc: "Shared dashboards and real-time annotations.", color: "bg-pink-50 text-pink-500" },
  { icon: Database, title: "Data Warehouse", desc: "Built-in data lake with SQL. No tools needed.", color: "bg-blue-50 text-blue-500" },
];

const pricing = [
  { name: "Starter", price: "49", period: "mo", desc: "For small teams", features: ["5 dashboards", "10K events/day", "7-day retention", "Email support"], cta: "Start Free", popular: false },
  { name: "Professional", price: "149", period: "mo", desc: "For growing businesses", features: ["Unlimited dashboards", "1M events/day", "90-day retention", "Priority support", "Custom alerts", "API access"], cta: "Start Free", popular: true },
  { name: "Enterprise", price: "Custom", period: "", desc: "For large orgs", features: ["Everything in Pro", "Unlimited everything", "24/7 support", "SSO & SAML", "Custom integrations", "SLA guarantee"], cta: "Contact Sales", popular: false },
];

function HeroChart() {
  const bars = [65, 45, 80, 55, 90, 70, 85, 60, 95, 75, 88, 92];
  const line = "0,80 50,65 100,70 150,40 200,55 250,30 300,45 350,20 400,35 450,15 500,25 550,10";
  return (
    <svg viewBox="0 0 560 200" className="w-full h-full">
      <defs>
        <linearGradient id="bg" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#3B82F6" stopOpacity="0.8" /><stop offset="100%" stopColor="#3B82F6" stopOpacity="0.2" /></linearGradient>
        <linearGradient id="lg" x1="0" y1="0" x2="1" y2="0"><stop offset="0%" stopColor="#F97316" /><stop offset="100%" stopColor="#FBBF24" /></linearGradient>
        <linearGradient id="ag" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#F97316" stopOpacity="0.2" /><stop offset="100%" stopColor="#F97316" stopOpacity="0" /></linearGradient>
      </defs>
      {[40, 80, 120, 160].map((y) => <line key={y} x1="0" y1={y} x2="560" y2={y} stroke="#F1F5F9" strokeWidth="1" />)}
      {bars.map((h, i) => <rect key={i} x={i * 46 + 5} y={200 - h * 1.8} width="30" height={h * 1.8} rx="6" fill="url(#bg)" />)}
      <polygon points={`${line} 550,200 0,200`} fill="url(#ag)" />
      <polyline points={line} fill="none" stroke="url(#lg)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
      {[[0,80],[100,70],[200,55],[300,45],[400,35],[500,25],[550,10]].map(([cx, cy], i) => <circle key={i} cx={cx} cy={cy} r="4" fill="#F97316" stroke="white" strokeWidth="2" />)}
    </svg>
  );
}

function MiniChart({ up = true }: { up?: boolean }) {
  const pts = up ? "0,30 20,25 40,28 60,18 80,22 100,12 120,15" : "0,15 20,18 40,12 60,20 80,25 100,22 120,28";
  const fill = up ? "0,30 20,25 40,28 60,18 80,22 100,12 120,15 120,40 0,40" : "0,15 20,18 40,12 60,20 80,25 100,22 120,28 120,40 0,40";
  const c = up ? "#10B981" : "#F97316";
  return (
    <svg viewBox="0 0 120 40" className="w-full h-full" preserveAspectRatio="none">
      <defs><linearGradient id={`m${up?"u":"d"}`} x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={c} stopOpacity="0.3" /><stop offset="100%" stopColor={c} stopOpacity="0" /></linearGradient></defs>
      <polygon points={fill} fill={`url(#m${up?"u":"d"})`} />
      <polyline points={pts} fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export default function LandingPage() {
  const [billing, setBilling] = useState<"m" | "y">("m");

  return (
    <div className="min-h-screen bg-white text-slate-900 overflow-hidden">
      {/* Nav */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-xl border-b border-slate-100">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-blue-500 to-violet-500 flex items-center justify-center"><Activity className="w-4 h-4 text-white" /></div>
            <span className="font-bold text-lg font-display">MetricFlow</span>
          </div>
          <div className="hidden md:flex items-center gap-8 text-sm text-slate-400">
            <a href="#features" className="hover:text-slate-900 transition-colors">Features</a>
            <a href="#pricing" className="hover:text-slate-900 transition-colors">Pricing</a>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/login" className="px-4 py-2 text-sm font-medium text-slate-500 hover:text-slate-900 transition-colors">Sign in</Link>
            <Link href="/login" className="px-4 py-2 text-sm font-semibold bg-slate-900 hover:bg-slate-800 text-white rounded-xl transition-all">Get Started</Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative pt-32 pb-20 px-6">
        <div className="absolute top-10 left-1/4 w-96 h-96 bg-blue-50 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute top-20 right-1/4 w-72 h-72 bg-orange-50 rounded-full blur-3xl pointer-events-none" />

        <div className="max-w-7xl mx-auto relative">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div className="space-y-8">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-50 text-blue-600 text-sm font-medium">
                <Sparkles className="w-4 h-4" /><span>AI-powered insights</span>
              </div>
              <h1 className="text-5xl md:text-6xl font-extrabold leading-[1.08] font-display text-slate-900">
                Analytics that<br />
                <span className="bg-gradient-to-r from-blue-500 via-violet-500 to-pink-500 bg-clip-text text-transparent">move fast</span>
              </h1>
              <p className="text-lg text-slate-400 max-w-lg leading-relaxed">Track every metric that matters. Real-time dashboards, instant alerts, and AI insights — all in one platform.</p>
              <div className="flex flex-col sm:flex-row gap-4">
                <Link href="/login" className="px-6 py-3.5 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white font-semibold rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-blue-500/25 transition-all">
                  Start Free Trial <ArrowRight className="w-4 h-4" />
                </Link>
                <a href="#features" className="px-6 py-3.5 bg-slate-50 hover:bg-slate-100 text-slate-700 font-semibold rounded-xl flex items-center justify-center gap-2 transition-all">See Features</a>
              </div>
              <div className="flex items-center gap-6 text-sm text-slate-400">
                {["14-day free trial", "No credit card", "Cancel anytime"].map((t) => (
                  <div key={t} className="flex items-center gap-1.5"><Check className="w-4 h-4 text-emerald-500" /><span>{t}</span></div>
                ))}
              </div>
            </div>

            <div className="relative">
              <div className="absolute -inset-1 bg-gradient-to-r from-blue-100 to-orange-100 rounded-2xl blur-xl opacity-60" />
              <div className="relative bg-white rounded-2xl p-6 shadow-xl shadow-slate-200/60 border border-slate-100">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <p className="text-sm text-slate-400">Total Revenue</p>
                    <p className="text-3xl font-bold font-display mt-1">$284,520<span className="text-sm text-emerald-500 ml-2 font-medium">+24.5%</span></p>
                  </div>
                  <div className="flex gap-1">
                    {["1D", "1W", "1M", "1Y"].map((p, i) => (
                      <button key={p} className={`px-2.5 py-1 text-xs font-medium rounded-lg transition-colors ${i === 2 ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-400 hover:text-slate-700"}`}>{p}</button>
                    ))}
                  </div>
                </div>
                <div className="h-64 md:h-80"><HeroChart /></div>
                <div className="grid grid-cols-3 gap-4 mt-6 pt-6 border-t border-slate-100">
                  {[
                    { l: "Active Users", v: "12.4K", c: "+8.2%", up: true },
                    { l: "Conversion", v: "3.24%", c: "+1.1%", up: true },
                    { l: "Avg. Session", v: "4m 32s", c: "-0.3%", up: false },
                  ].map((s) => (
                    <div key={s.l}>
                      <p className="text-xs text-slate-400">{s.l}</p>
                      <div className="flex items-baseline gap-1.5 mt-1">
                        <p className="text-lg font-bold font-display">{s.v}</p>
                        <span className={`text-xs font-medium ${s.up ? "text-emerald-500" : "text-orange-500"}`}>{s.c}</span>
                      </div>
                      <div className="h-8 mt-2"><MiniChart up={s.up} /></div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-24 px-6" id="features">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <p className="text-sm text-blue-500 font-semibold uppercase tracking-wider mb-3">Features</p>
            <h2 className="text-4xl md:text-5xl font-extrabold font-display text-slate-900">Everything you need</h2>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((f, i) => (
              <div key={i} className="glass-card rounded-2xl p-7 group cursor-pointer">
                <div className={`w-12 h-12 rounded-xl ${f.color} flex items-center justify-center mb-5 group-hover:scale-110 transition-transform`}>
                  <f.icon className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-bold font-display text-slate-900 mb-2">{f.title}</h3>
                <p className="text-sm text-slate-400 leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="py-20 px-6 bg-slate-50">
        <div className="max-w-7xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-8">
          {[{ v: "12K+", l: "Active Teams", c: "text-blue-500" }, { v: "2.4B", l: "Events Processed", c: "text-emerald-500" }, { v: "<100ms", l: "Query Latency", c: "text-orange-500" }, { v: "99.99%", l: "Uptime SLA", c: "text-violet-500" }].map((s, i) => (
            <div key={i} className="text-center">
              <p className={`text-4xl md:text-5xl font-extrabold font-display ${s.c}`}>{s.v}</p>
              <p className="text-sm text-slate-400 mt-2">{s.l}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Pricing */}
      <section className="py-24 px-6" id="pricing">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <p className="text-sm text-blue-500 font-semibold uppercase tracking-wider mb-3">Pricing</p>
            <h2 className="text-4xl md:text-5xl font-extrabold font-display text-slate-900 mb-4">Simple pricing</h2>
            <p className="text-slate-400 max-w-lg mx-auto">No hidden fees. Start free, scale as you grow.</p>
            <div className="flex items-center justify-center gap-3 mt-8">
              <span className={`text-sm font-medium ${billing === "m" ? "text-slate-900" : "text-slate-300"}`}>Monthly</span>
              <button onClick={() => setBilling(billing === "m" ? "y" : "m")} className="relative w-12 h-6 bg-slate-200 rounded-full transition-colors">
                <div className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow-sm transition-all ${billing === "y" ? "left-7" : "left-1"}`} />
              </button>
              <span className={`text-sm font-medium ${billing === "y" ? "text-slate-900" : "text-slate-300"}`}>Yearly <span className="text-emerald-500 text-xs ml-1">Save 20%</span></span>
            </div>
          </div>
          <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {pricing.map((p, i) => (
              <div key={i} className={`rounded-2xl p-8 relative ${p.popular ? "bg-slate-900 text-white shadow-2xl shadow-slate-900/20 scale-[1.02]" : "glass-card"}`}>
                {p.popular && <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 bg-gradient-to-r from-blue-500 to-violet-500 text-white text-xs font-bold rounded-full">Most Popular</div>}
                <h3 className={`text-lg font-bold font-display ${p.popular ? "text-white" : "text-slate-900"}`}>{p.name}</h3>
                <p className={`text-sm mt-1 mb-5 ${p.popular ? "text-slate-400" : "text-slate-400"}`}>{p.desc}</p>
                <div className="flex items-baseline gap-1 mb-6">
                  {p.price !== "Custom" && <span className={`text-sm ${p.popular ? "text-slate-400" : "text-slate-300"}`}>$</span>}
                  <span className={`text-5xl font-extrabold font-display ${p.popular ? "text-white" : "text-slate-900"}`}>
                    {p.price === "Custom" ? "Custom" : billing === "y" ? Math.round(parseInt(p.price) * 0.8) : p.price}
                  </span>
                  {p.period && <span className={`text-sm ${p.popular ? "text-slate-400" : "text-slate-300"}`}>/{p.period}</span>}
                </div>
                <ul className="space-y-3 mb-8">
                  {p.features.map((f, j) => (
                    <li key={j} className={`flex items-start gap-2.5 text-sm ${p.popular ? "text-slate-300" : "text-slate-600"}`}>
                      <Check className={`w-4 h-4 shrink-0 mt-0.5 ${p.popular ? "text-blue-400" : "text-blue-500"}`} /><span>{f}</span>
                    </li>
                  ))}
                </ul>
                <button className={`w-full py-3 rounded-xl font-semibold text-sm transition-all ${p.popular ? "bg-white text-slate-900 hover:bg-slate-100" : "bg-slate-900 text-white hover:bg-slate-800"}`}>
                  {p.cta}
                </button>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 px-6">
        <div className="max-w-4xl mx-auto">
          <div className="rounded-3xl overflow-hidden relative">
            <div className="absolute inset-0 bg-gradient-to-br from-blue-500 via-violet-500 to-pink-500" />
            <div className="relative px-8 py-16 md:px-16 text-center text-white">
              <h2 className="text-3xl md:text-4xl font-extrabold font-display mb-4">Ready to transform your analytics?</h2>
              <p className="text-white/80 max-w-lg mx-auto mb-8">Join 12,000+ teams already using MetricFlow.</p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link href="/login" className="px-8 py-3.5 bg-white text-slate-900 font-bold rounded-xl hover:bg-slate-50 transition-all shadow-xl">Start Free Trial</Link>
                <button className="px-8 py-3.5 bg-white/15 hover:bg-white/25 text-white font-semibold rounded-xl border border-white/20 transition-all">Talk to Sales</button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-6 border-t border-slate-100">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-blue-500 to-violet-500 flex items-center justify-center"><Activity className="w-3.5 h-3.5 text-white" /></div>
            <span className="font-bold font-display">MetricFlow</span>
          </div>
          <div className="flex items-center gap-6 text-sm text-slate-400">
            {["Privacy", "Terms", "Docs", "Status"].map((l) => <a key={l} href="#" className="hover:text-slate-900 transition-colors">{l}</a>)}
          </div>
          <p className="text-sm text-slate-300">&copy; 2026 MetricFlow</p>
        </div>
      </footer>
    </div>
  );
}
