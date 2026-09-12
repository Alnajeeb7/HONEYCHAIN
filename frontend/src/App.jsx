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
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-yellow-50 relative overflow-hidden">
      {/* Decorative honey drops - top right */}
      <div className="absolute top-20 right-10 text-6xl opacity-40 animate-pulse">🍯</div>
      <div className="absolute bottom-32 right-20 text-5xl opacity-30">💧</div>
      
      {/* Main content */}
      <div className="py-16 px-4 sm:px-6 max-w-6xl mx-auto">
        {/* Header Section */}
        <div className="text-center mb-16">
          <div className="flex items-center justify-center gap-2 mb-6">
            <div className="text-5xl">🍯</div>
            <div className="text-5xl">💛</div>
          </div>
          
          <h1 className="text-6xl sm:text-7xl font-black text-slate-900 mb-4">
            <span className="text-amber-500">Honey</span>Chain
          </h1>
          
          <p className="text-lg sm:text-xl text-slate-600 max-w-3xl mx-auto mb-8 leading-relaxed">
            Blockchain-based honey traceability &amp; smart beekeeping system for KVIC's
            Honey Mission. Every batch tracked from hive to jar — counterfeit-proof,
            consumer-verified.
          </p>
          
          {/* Feature Pills */}
          <div className="mt-8 flex flex-wrap gap-3 justify-center">
            <span className="bg-white/70 backdrop-blur-sm border border-amber-200 text-amber-700 px-4 py-2 rounded-full font-semibold text-sm shadow-sm hover:shadow-md transition-shadow">
              🔍 QR Consumer Verification
            </span>
            <span className="bg-white/70 backdrop-blur-sm border border-emerald-200 text-emerald-700 px-4 py-2 rounded-full font-semibold text-sm shadow-sm hover:shadow-md transition-shadow">
              🌿 AI Disease Detection
            </span>
            <span className="bg-white/70 backdrop-blur-sm border border-blue-200 text-blue-700 px-4 py-2 rounded-full font-semibold text-sm shadow-sm hover:shadow-md transition-shadow">
              📡 IoT Hive Monitoring
            </span>
            <span className="bg-white/70 backdrop-blur-sm border border-purple-200 text-purple-700 px-4 py-2 rounded-full font-semibold text-sm shadow-sm hover:shadow-md transition-shadow">
              ⛓️ Immutable Batch Ledger
            </span>
          </div>
        </div>

        {/* Roles Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {ROLES.map((r) => {
            const c = COLOR[r.color];
            const Icon = r.icon;
            return (
              <Link key={r.key} to={r.path}
                className="group bg-white rounded-2xl p-6 shadow-md hover:shadow-2xl hover:-translate-y-2 transition-all duration-300 border border-slate-100/50 hover:border-amber-200/50">
                
                {/* Icon Background */}
                <div className={`w-14 h-14 rounded-2xl ${c.bg} ${c.text} flex items-center justify-center mb-5 group-hover:scale-110 transition-transform`}>
                  <Icon className="w-7 h-7" strokeWidth={2} />
                </div>
                
                {/* Content */}
                <h3 className="font-bold text-slate-900 text-lg mb-2">{r.label}</h3>
                <p className={`text-sm font-medium ${c.text} mb-3`}>{r.tagline}</p>
                <p className="text-xs text-slate-500 mb-4">{r.reason}</p>
                
                {/* Arrow indicator */}
                <div className="flex items-center gap-2 text-amber-600 font-semibold text-sm group-hover:translate-x-1 transition-transform">
                  <span>Explore</span>
                  <span>→</span>
                </div>
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

        {/* Blockchain & Technology Section */}
        <div className="mt-24 max-w-7xl mx-auto">
          {/* Section Header */}
          <div className="text-center mb-20">
            <h2 className="text-5xl sm:text-6xl font-black text-slate-900 mb-6">Technology & Infrastructure</h2>
            <p className="text-lg text-slate-600 max-w-3xl mx-auto font-light">
              Enterprise-grade decentralized infrastructure ensuring transparency, security, and scalability across the entire honey supply chain.
            </p>
          </div>

          {/* Two Column: Current & Roadmap */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 mb-20">
            {/* Current Implementation */}
            <div>
              <div className="mb-8">
                <span className="text-sm font-bold text-amber-600 uppercase tracking-wider">Live Deployment</span>
                <h3 className="text-3xl font-bold text-slate-900 mt-2">Ethereum Sepolia Testnet</h3>
              </div>
              
              <div className="space-y-6">
                {/* Network */}
                <div className="bg-white rounded-xl p-6 border border-slate-200/50">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-xs font-bold text-slate-500 uppercase tracking-wide">Network</p>
                      <p className="text-2xl font-bold text-slate-900 mt-3">Ethereum Sepolia</p>
                      <p className="text-sm text-slate-600 mt-1">Chain ID: 11155111</p>
                    </div>
                    <div className="text-3xl">◆</div>
                  </div>
                </div>

                {/* Contract */}
                <div className="bg-white rounded-xl p-6 border border-slate-200/50">
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-3">Smart Contract Address</p>
                  <div className="font-mono text-xs bg-slate-50 p-4 rounded-lg break-all text-slate-700 border border-slate-200">
                    0x041A6784780CE499d3e44FD616A3612a58f1f296
                  </div>
                  <p className="text-xs text-slate-600 mt-3">HoneyChainTraceability with OpenZeppelin AccessControl</p>
                </div>

                {/* Capabilities */}
                <div className="bg-gradient-to-br from-blue-50 to-cyan-50 rounded-xl p-6 border border-blue-200/30">
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-4">On-Chain Capabilities</p>
                  <ul className="space-y-3">
                    <li className="flex items-start gap-3">
                      <span className="text-amber-500 font-bold text-lg leading-none">✓</span>
                      <span className="text-sm text-slate-700">Immutable batch ledger with full event history</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <span className="text-amber-500 font-bold text-lg leading-none">✓</span>
                      <span className="text-sm text-slate-700">GPS coordinates anchored to blockchain</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <span className="text-amber-500 font-bold text-lg leading-none">✓</span>
                      <span className="text-sm text-slate-700">Role-based access control (RBAC)</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <span className="text-amber-500 font-bold text-lg leading-none">✓</span>
                      <span className="text-sm text-slate-700">Transparent audit trail for all transactions</span>
                    </li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Strategic Roadmap */}
            <div>
              <div className="mb-8">
                <span className="text-sm font-bold text-purple-600 uppercase tracking-wider">Development Pipeline</span>
                <h3 className="text-3xl font-bold text-slate-900 mt-2">Multi-Phase Expansion</h3>
              </div>
              
              <div className="space-y-4">
                {/* Phase 2 */}
                <div className="bg-white rounded-xl p-6 border border-slate-200/50 hover:border-purple-200 transition-colors">
                  <div className="flex items-start gap-4">
                    <div className="text-3xl font-bold text-amber-500">◈</div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-2">
                        <p className="font-bold text-slate-900">HoneyChain Token (HCT)</p>
                        <span className="text-xs font-bold text-purple-600 bg-purple-50 px-3 py-1 rounded-full">Phase 2</span>
                      </div>
                      <p className="text-sm text-slate-600">ERC-20 governance token enabling decentralized community incentives and direct farmer rewards</p>
                    </div>
                  </div>
                </div>

                {/* Phase 3 */}
                <div className="bg-white rounded-xl p-6 border border-slate-200/50 hover:border-purple-200 transition-colors">
                  <div className="flex items-start gap-4">
                    <div className="text-3xl font-bold text-blue-500">■</div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-2">
                        <p className="font-bold text-slate-900">NFT Batch Certificates</p>
                        <span className="text-xs font-bold text-purple-600 bg-purple-50 px-3 py-1 rounded-full">Phase 3</span>
                      </div>
                      <p className="text-sm text-slate-600">Digital certificates (ERC-721) for each batch enabling secondary market trading and verification</p>
                    </div>
                  </div>
                </div>

                {/* Phase 4 */}
                <div className="bg-white rounded-xl p-6 border border-slate-200/50 hover:border-purple-200 transition-colors">
                  <div className="flex items-start gap-4">
                    <div className="text-3xl font-bold text-slate-600">⬢</div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-2">
                        <p className="font-bold text-slate-900">DAO Governance</p>
                        <span className="text-xs font-bold text-purple-600 bg-purple-50 px-3 py-1 rounded-full">Phase 4</span>
                      </div>
                      <p className="text-sm text-slate-600">Decentralized autonomous organization giving token holders voting power over protocol evolution</p>
                    </div>
                  </div>
                </div>

                {/* Phase 5 */}
                <div className="bg-white rounded-xl p-6 border border-slate-200/50 hover:border-purple-200 transition-colors">
                  <div className="flex items-start gap-4">
                    <div className="text-3xl font-bold text-green-500">→</div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-2">
                        <p className="font-bold text-slate-900">Mainnet Migration</p>
                        <span className="text-xs font-bold text-purple-600 bg-purple-50 px-3 py-1 rounded-full">Phase 5</span>
                      </div>
                      <p className="text-sm text-slate-600">Production deployment on Ethereum Mainnet for real-world honey traceability at scale</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Technology Stack */}
          <div className="mb-20">
            <div className="mb-12">
              <h3 className="text-4xl font-black text-slate-900 text-center">Integrated Technology Stack</h3>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {/* Blockchain */}
              <div className="group">
                <div className="bg-white rounded-2xl p-8 border border-slate-200/50 group-hover:border-amber-200 group-hover:shadow-xl transition-all h-full">
                  <div className="mb-6">
                    <div className="inline-block bg-amber-100 rounded-lg p-3 group-hover:scale-110 transition-transform">
                      <span className="text-2xl font-bold text-amber-600">◆</span>
                    </div>
                  </div>
                  <h4 className="font-bold text-slate-900 text-lg mb-2">Blockchain Core</h4>
                  <p className="text-sm text-slate-600 mb-4">Ethereum smart contracts written in Solidity</p>
                  <div className="pt-4 border-t border-slate-200">
                    <p className="text-xs font-bold text-amber-600">STATUS: LIVE</p>
                  </div>
                </div>
              </div>

              {/* IPFS */}
              <div className="group">
                <div className="bg-white rounded-2xl p-8 border border-slate-200/50 group-hover:border-blue-200 group-hover:shadow-xl transition-all h-full">
                  <div className="mb-6">
                    <div className="inline-block bg-blue-100 rounded-lg p-3 group-hover:scale-110 transition-transform">
                      <span className="text-2xl font-bold text-blue-600">▬</span>
                    </div>
                  </div>
                  <h4 className="font-bold text-slate-900 text-lg mb-2">Distributed Storage</h4>
                  <p className="text-sm text-slate-600 mb-4">IPFS + Pinata for evidence documents</p>
                  <div className="pt-4 border-t border-slate-200">
                    <p className="text-xs font-bold text-blue-600">READY: PINATA API</p>
                  </div>
                </div>
              </div>

              {/* IoT */}
              <div className="group">
                <div className="bg-white rounded-2xl p-8 border border-slate-200/50 group-hover:border-green-200 group-hover:shadow-xl transition-all h-full">
                  <div className="mb-6">
                    <div className="inline-block bg-green-100 rounded-lg p-3 group-hover:scale-110 transition-transform">
                      <span className="text-2xl font-bold text-green-600">◉</span>
                    </div>
                  </div>
                  <h4 className="font-bold text-slate-900 text-lg mb-2">IoT Integration</h4>
                  <p className="text-sm text-slate-600 mb-4">GPS, temperature, humidity sensors</p>
                  <div className="pt-4 border-t border-slate-200">
                    <p className="text-xs font-bold text-green-600">PHASE: EXPANSION</p>
                  </div>
                </div>
              </div>

              {/* AI/ML */}
              <div className="group">
                <div className="bg-white rounded-2xl p-8 border border-slate-200/50 group-hover:border-purple-200 group-hover:shadow-xl transition-all h-full">
                  <div className="mb-6">
                    <div className="inline-block bg-purple-100 rounded-lg p-3 group-hover:scale-110 transition-transform">
                      <span className="text-2xl font-bold text-purple-600">◈</span>
                    </div>
                  </div>
                  <h4 className="font-bold text-slate-900 text-lg mb-2">AI/ML Engine</h4>
                  <p className="text-sm text-slate-600 mb-4">Quality detection & predictive analysis</p>
                  <div className="pt-4 border-t border-slate-200">
                    <p className="text-xs font-bold text-purple-600">PHASE: 2 (Q2 2027)</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Key Metrics */}
          <div className="bg-gradient-to-br from-slate-50 to-slate-100 rounded-3xl p-12 border border-slate-200">
            <h3 className="text-4xl font-black text-slate-900 text-center mb-2">Platform Metrics</h3>
            <p className="text-center text-slate-600 mb-12 text-sm">Current capabilities and scalability specifications</p>
            
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-8 mb-8">
              <div className="text-center">
                <div className="text-6xl font-black text-amber-600 mb-3">8</div>
                <p className="font-bold text-slate-900 mb-1">Supply Chain Roles</p>
                <p className="text-xs text-slate-600">Complete ecosystem coverage</p>
              </div>
              <div className="text-center">
                <div className="text-6xl font-black text-blue-600 mb-3">∞</div>
                <p className="font-bold text-slate-900 mb-1">Scalability</p>
                <p className="text-xs text-slate-600">Unlimited batch capacity</p>
              </div>
              <div className="text-center">
                <div className="text-6xl font-black text-green-600 mb-3">100<span className="text-3xl">%</span></div>
                <p className="font-bold text-slate-900 mb-1">Traceability</p>
                <p className="text-xs text-slate-600">Hive to consumer visibility</p>
              </div>
              <div className="text-center">
                <div className="text-6xl font-black text-red-600 mb-3">0</div>
                <p className="font-bold text-slate-900 mb-1">Counterfeits</p>
                <p className="text-xs text-slate-600">Blockchain-verified supply</p>
              </div>
            </div>

            <div className="bg-white rounded-2xl p-8 border border-slate-200/50 mt-12">
              <p className="text-slate-700 leading-relaxed text-center text-sm">
                <span className="font-bold text-slate-900">HoneyChain</span> leverages Ethereum's immutability and decentralized consensus to create an unforgeable 
                record of every honey batch. Combined with IPFS storage, IoT sensors, and AI analysis, the platform ensures complete supply chain 
                transparency from producer to end consumer, eliminating counterfeits and building consumer trust.
              </p>
            </div>
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
