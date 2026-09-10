import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useLocation } from 'react-router-dom';
import { Menu, X } from 'lucide-react';
import { ROLES, COLOR } from './roles';
import BeekeeperApp from './pages/BeekeeperApp';
import Collector from './pages/Collector';
import LabDashboard from './pages/LabDashboard';
import Processor from './pages/Processor';
import Exporter from './pages/Exporter';
import Government from './pages/Government';
import Environment from './pages/Environment';
import ConsumerVerification from './pages/ConsumerVerification';

function Nav() {
  const loc = useLocation();
  const [open, setOpen] = useState(false);
  const active = (p) => loc.pathname === p;
  return (
    <>
    <nav className="sticky top-0 z-50 bg-white/80 backdrop-blur-xl border-b border-slate-200/70">
      <div className="max-w-7xl mx-auto px-4 sm:px-5 h-16 flex items-center gap-4">
        <Link to="/" className="font-bold text-lg text-slate-900 tracking-tight flex items-center gap-2 shrink-0">
          <span className="text-xl">🍯</span><span>HoneyChain</span>
        </Link>

        {/* Desktop: Brave-style icon tab strip, active tab expands to show label */}
        <div className="hidden lg:flex items-center gap-1 overflow-x-auto no-scrollbar flex-1 justify-end">
          {ROLES.map((r) => {
            const c = COLOR[r.color]; const Icon = r.icon; const on = active(r.path);
            return (
              <Link key={r.key} to={r.path} title={r.label}
                className={`group flex items-center gap-2 h-10 rounded-xl transition-all duration-300 shrink-0 overflow-hidden
                  ${on ? `px-3.5 ${c.bg} ${c.text} font-semibold shadow-sm ring-1 ${c.ring}` : 'px-2.5 text-slate-500 hover:bg-slate-100 hover:text-slate-800'}`}>
                <Icon className="w-[18px] h-[18px] shrink-0" strokeWidth={on ? 2.4 : 2} />
                <span className={`text-sm whitespace-nowrap transition-all duration-300 ${on ? 'max-w-[180px] opacity-100' : 'max-w-0 opacity-0'}`}>{r.label}</span>
              </Link>
            );
          })}
        </div>

        {/* Mobile: hamburger */}
        <button className="lg:hidden ml-auto p-2 rounded-lg text-slate-600 hover:bg-slate-100" onClick={() => setOpen(true)} aria-label="Open menu">
          <Menu className="w-6 h-6" />
        </button>
      </div>
    </nav>

      {/* Mobile drawer — rendered OUTSIDE the blurred nav so `fixed` maps to the viewport */}
      {open && (
        <div className="lg:hidden fixed inset-0 z-[100]" onClick={() => setOpen(false)}>
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" />
          <div className="absolute right-0 top-0 h-full w-72 max-w-[85vw] bg-white shadow-2xl p-4 flex flex-col" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <span className="font-bold text-slate-900 flex items-center gap-2">🍯 HoneyChain</span>
              <button onClick={() => setOpen(false)} className="p-2 rounded-lg hover:bg-slate-100"><X className="w-5 h-5 text-slate-500" /></button>
            </div>
            <div className="flex flex-col gap-1 overflow-y-auto">
              {ROLES.map((r) => {
                const c = COLOR[r.color]; const Icon = r.icon; const on = active(r.path);
                return (
                  <Link key={r.key} to={r.path} onClick={() => setOpen(false)}
                    className={`flex items-center gap-3 px-3 py-3 rounded-xl transition-colors ${on ? `${c.bg} ${c.text} font-semibold` : 'text-slate-600 hover:bg-slate-100'}`}>
                    <Icon className="w-5 h-5 shrink-0" />
                    <div><div className="text-sm font-medium leading-tight">{r.label}</div>
                      <div className="text-[11px] text-slate-400 leading-tight">{r.tagline}</div></div>
                  </Link>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function LegacyNav() {
  const loc = useLocation();
  return (
    <nav className="sticky top-0 z-50 bg-white/80 backdrop-blur-xl border-b border-slate-200/70">
      <div className="max-w-7xl mx-auto px-5 h-16 flex items-center gap-4">
        <Link to="/" className="font-bold text-lg text-slate-900 tracking-tight flex items-center gap-2 shrink-0">
          <span className="text-xl">🍯</span>
          <span className="hidden sm:inline">HoneyChain</span>
        </Link>

        {/* Brave-style horizontal tab strip: icon-only, active tab expands to show label */}
        <div className="flex items-center gap-1 overflow-x-auto no-scrollbar flex-1 justify-end">
          {ROLES.map((r) => {
            const active = loc.pathname === r.path;
            const c = COLOR[r.color];
            const Icon = r.icon;
            return (
              <Link key={r.key} to={r.path} title={r.label}
                className={`group flex items-center gap-2 h-10 rounded-xl transition-all duration-300 shrink-0 overflow-hidden
                  ${active
                    ? `px-3.5 ${c.bg} ${c.text} font-semibold shadow-sm ring-1 ${c.ring}`
                    : 'px-2.5 text-slate-500 hover:bg-slate-100 hover:text-slate-800'}`}>
                <Icon className="w-[18px] h-[18px] shrink-0" strokeWidth={active ? 2.4 : 2} />
                <span className={`text-sm whitespace-nowrap transition-all duration-300 ${active ? 'max-w-[180px] opacity-100' : 'max-w-0 opacity-0'}`}>
                  {r.label}
                </span>
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}

function Home() {
  return (
    <div className="py-10">
      <div className="text-center mb-12">
        <div className="text-6xl mb-4">🍯</div>
        <h1 className="text-5xl font-extrabold text-slate-900 mb-4">HoneyChain</h1>
        <p className="text-xl text-slate-500 max-w-2xl mx-auto">
          Blockchain-based honey traceability &amp; smart beekeeping system for KVIC's Honey Mission.
          Every batch tracked from hive to jar — counterfeit-proof, consumer-verified.
        </p>
        <div className="mt-6 flex flex-wrap gap-3 justify-center text-sm">
          <span className="bg-amber-100 text-amber-800 px-3 py-1 rounded-full font-semibold">QR Consumer Verification</span>
          <span className="bg-sky-100 text-sky-800 px-3 py-1 rounded-full font-semibold">AI Disease Detection</span>
          <span className="bg-teal-100 text-teal-800 px-3 py-1 rounded-full font-semibold">IoT Hive Monitoring</span>
          <span className="bg-indigo-100 text-indigo-800 px-3 py-1 rounded-full font-semibold">Immutable Batch Ledger</span>
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 max-w-6xl mx-auto">
        {ROLES.map((r) => {
          const c = COLOR[r.color];
          const Icon = r.icon;
          return (
            <Link key={r.key} to={r.path}
              className={`bg-white rounded-2xl border border-slate-200 p-6 shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all ring-1 ${c.ring}`}>
              <div className={`w-12 h-12 rounded-xl ${c.bg} ${c.text} flex items-center justify-center mb-4`}>
                <Icon className="w-6 h-6" />
              </div>
              <h3 className="font-bold text-slate-800 text-lg">{r.label}</h3>
              <p className={`text-sm font-medium ${c.text} mt-1`}>{r.tagline}</p>
              <p className="text-xs text-slate-500 mt-2">{r.reason}</p>
            </Link>
          );
        })}
      </div>

      {/* KVIC Banner */}
      <div className="mt-12 max-w-4xl mx-auto bg-gradient-to-r from-amber-50 to-yellow-50 border border-amber-200 rounded-2xl p-6">
        <div className="flex items-start gap-4">
          <div className="text-3xl">🏛️</div>
          <div>
            <h3 className="font-bold text-amber-800 text-lg">KVIC Honey Mission Integration</h3>
            <p className="text-amber-700 text-sm mt-1">
              Built for rural beekeepers supported under the Khadi &amp; Village Industries Commission's Honey Mission.
              Solves counterfeit honey, low consumer trust, weak market linkages, and lack of traceability
              through an integrated Blockchain + AI + IoT digital ecosystem.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function App() {
  return (
    <Router>
      <div className="min-h-screen bg-amber-50/30 text-slate-800 font-sans">
        <Nav />
        <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
          <Routes>
            <Route path="/"           element={<Home />} />
            <Route path="/beekeeper"  element={<BeekeeperApp role="beekeeper" />} />
            <Route path="/wild"       element={<Collector />} />
            <Route path="/lab"        element={<LabDashboard />} />
            <Route path="/processor"  element={<Processor />} />
            <Route path="/exporter"   element={<Exporter />} />
            <Route path="/government" element={<Government />} />
            <Route path="/environment"element={<Environment />} />
            <Route path="/verify/:id" element={<ConsumerVerification />} />
            <Route path="/verify"     element={<ConsumerVerification />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

export default App;
