'use client';

import Link from 'next/link';

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-canvas text-ink">
      {/* NAVIGATION */}
      <nav className="sticky top-0 z-50 bg-white/80 backdrop-blur-xl border-b border-line">
        <div className="max-w-[1280px] mx-auto px-6 h-[72px] flex items-center justify-between gap-6">
          <Link href="/" className="inline-flex items-center gap-3 text-[1.25rem] font-bold tracking-tight text-ink">
            <span className="w-8 h-8 rounded-xl bg-gradient-to-tr from-brand to-orange flex items-center justify-center text-white font-bold shadow-sm shadow-brand/30 shrink-0">
              <svg className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="9"></circle>
                <circle cx="12" cy="12" r="3" fill="currentColor"></circle>
              </svg>
            </span>
            ClassSync
          </Link>

          <div className="hidden md:flex items-center gap-8 text-[0.9375rem] font-medium text-sub">
            <a href="#features" className="hover:text-ink transition-colors">Features</a>
            <a href="#philosophy" className="hover:text-ink transition-colors">Philosophy</a>
            <a href="#security" className="hover:text-ink transition-colors">Privacy</a>
            <a href="#roles" className="hover:text-ink transition-colors">For Schools</a>
            <a href="#pricing" className="hover:text-ink transition-colors">Pricing</a>
          </div>

          <div className="flex items-center gap-3">
            <Link href="/login" className="hidden sm:inline-flex items-center justify-center rounded-[999px] text-ink text-[0.875rem] font-medium px-4 py-2 hover:bg-ink/[0.06] transition-colors">
              Teacher Login
            </Link>
            <Link href="/dashboard" className="inline-flex items-center justify-center rounded-[999px] bg-brand hover:bg-brand-hover text-white text-[0.875rem] font-semibold px-5 py-2.5 shadow-sm shadow-brand/20 transition-all hover:scale-[1.02]">
              Teacher Dashboard
            </Link>
          </div>
        </div>
      </nav>

      {/* HERO SECTION */}
      <header className="pt-24 pb-20 px-6 text-center max-w-[1280px] mx-auto">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-brand/[0.08] text-brand text-[0.875rem] font-semibold mb-6 tracking-tight">
          <span className="w-2 h-2 rounded-full bg-brand animate-pulse"></span>
          The Transparent K-12 Classroom Focus Platform
        </div>

        <h1 className="text-[3.25rem] sm:text-[4.75rem] lg:text-[5.5rem] font-extrabold tracking-[-0.03em] leading-[1.08] max-w-[920px] mx-auto text-ink">
          Focus without surveillance.<br/>On every device.
        </h1>

        <p className="mt-6 text-[1.125rem] sm:text-[1.25rem] text-sub max-w-[640px] mx-auto font-normal leading-relaxed">
          ClassSync replaces invasive legacy MDM spyware with transparent student agency, real-time teacher visibility, and intentional focus modes.
        </p>

        <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link href="/dashboard" className="w-full sm:w-auto inline-flex items-center justify-center rounded-[999px] bg-brand hover:bg-brand-hover text-white text-[1rem] font-semibold px-8 py-4 shadow-lg shadow-brand/25 transition-all hover:scale-105">
            Launch Teacher Dashboard
          </Link>
          <a href="#features" className="w-full sm:w-auto inline-flex items-center justify-center rounded-[999px] bg-surface hover:bg-track text-ink border border-line text-[1rem] font-semibold px-8 py-4 transition-all">
            See How It Works
          </a>
        </div>

        {/* HERO MOCKUP CONTAINER */}
        <div className="mt-16 relative max-w-[1100px] mx-auto">
          <div className="absolute inset-0 bg-gradient-to-tr from-brand/20 via-orange/10 to-transparent rounded-card filter blur-3xl -z-10 opacity-70"></div>

          {/* Laptop Mockup */}
          <div className="bg-surface rounded-card p-3 sm:p-5 shadow-device border border-line">
            <div className="bg-[#1e1e24] rounded-[22px] overflow-hidden text-left shadow-inner">
              {/* Window Header */}
              <div className="px-4 py-3 bg-[#2d2d35] flex items-center justify-between border-b border-[#3d3d46]">
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-[#ff5f56]"></span>
                  <span className="w-3 h-3 rounded-full bg-[#ffbd2e]"></span>
                  <span className="w-3 h-3 rounded-full bg-[#27c93f]"></span>
                </div>
                <div className="text-xs text-[#a0a0ab] font-mono">classsync.app/teacher/dashboard</div>
                <div className="text-xs text-brand font-medium">Live Session Active</div>
              </div>
              {/* Screen Content Preview */}
              <div className="p-6 bg-[#121215] text-white min-h-[420px] sm:min-h-[520px] flex flex-col">
                <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
                  <div>
                    <div className="text-xs text-orange font-semibold uppercase tracking-wider">Active Learning Mode</div>
                    <h3 className="text-xl sm:text-2xl font-bold mt-1">Period 3 — Advanced Biology</h3>
                  </div>
                  <div className="flex gap-2">
                    <span className="px-3 py-1.5 rounded-full bg-green/20 text-green text-xs font-medium">5 Connected</span>
                    <span className="px-3 py-1.5 rounded-full bg-brand/20 text-brand text-xs font-medium">Code: 123-456</span>
                  </div>
                </div>
                {/* Grid cards preview */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="bg-[#1c1c21] border border-[#2c2c33] rounded-2xl p-4 flex flex-col justify-between">
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="font-semibold text-sm">Alice Chen</div>
                        <div className="text-xs text-green mt-0.5 flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-green"></span>Focused (In App)</div>
                      </div>
                      <span className="text-xs font-mono bg-green/10 text-green px-2 py-0.5 rounded">98%</span>
                    </div>
                    <div className="mt-4 pt-3 border-t border-[#2c2c33] flex justify-between items-center text-xs text-[#8e8e99]">
                      <span>App: Research.gov</span>
                      <span className="text-brand">Ping Nudge</span>
                    </div>
                  </div>

                  <div className="bg-[#1c1c21] border border-[#2c2c33] rounded-2xl p-4 flex flex-col justify-between">
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="font-semibold text-sm">Marcus Brody</div>
                        <div className="text-xs text-orange mt-0.5 flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-orange"></span>Backgrounded ({'&gt;'}10s)</div>
                      </div>
                      <span className="text-xs font-mono bg-orange/10 text-orange px-2 py-0.5 rounded">84%</span>
                    </div>
                    <div className="mt-4 pt-3 border-t border-[#2c2c33] flex justify-between items-center text-xs text-[#8e8e99]">
                      <span>App: Notes</span>
                      <span className="text-orange">Send Nudge</span>
                    </div>
                  </div>

                  <div className="bg-[#1c1c21] border border-[#2c2c33] rounded-2xl p-4 flex flex-col justify-between">
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="font-semibold text-sm">Sofia Rodriguez</div>
                        <div className="text-xs text-green mt-0.5 flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-green"></span>Focused (In App)</div>
                      </div>
                      <span className="text-xs font-mono bg-green/10 text-green px-2 py-0.5 rounded">100%</span>
                    </div>
                    <div className="mt-4 pt-3 border-t border-[#2c2c33] flex justify-between items-center text-xs text-[#8e8e99]">
                      <span>App: Bio Lab</span>
                      <span className="text-brand">Ping Nudge</span>
                    </div>
                  </div>
                </div>
                {/* Floating Mobile App Overlay */}
                <div className="mt-auto pt-6 text-center text-xs text-[#8e8e99]">
                  ✨ Powered by React Native mobile telemetry & real-time WebSockets. No MDM root required.
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* TESTIMONIAL BANNER */}
        <div className="mt-20 pt-16 border-t border-line max-w-[900px] mx-auto text-center">
          <p className="text-[1.25rem] sm:text-[1.5rem] font-medium text-ink italic leading-snug">
            &ldquo;ClassSync transformed our high school. Instead of adversarial phone bans and secret monitoring, we built mutual trust and student accountability.&rdquo;
          </p>
          <div className="mt-4 font-semibold text-[0.9375rem] text-ink">Dr. Sarah Jenkins</div>
          <div className="text-[0.875rem] text-sub">Superintendent, Oakridge Unified School District</div>

          <div className="mt-8 flex items-center justify-center gap-6 text-sub text-[0.875rem] flex-wrap">
            <span className="flex items-center gap-1.5">🛡️ FERPA/COPPA Compliant</span>
            <span>•</span>
            <span className="flex items-center gap-1.5">⭐ 4.9/5 Educator Rating</span>
            <span>•</span>
            <span className="flex items-center gap-1.5">⚡ Setup in 2 Minutes</span>
          </div>
        </div>
      </header>

      {/* SECTION 2: MORE THAN RESTRICTIVE BLOCKING */}
      <section id="features" className="py-24 px-6 bg-surface border-t border-line">
        <div className="max-w-[1280px] mx-auto">
          <div className="text-center max-w-[700px] mx-auto mb-16">
            <h2 className="text-[2.5rem] sm:text-[3rem] font-bold tracking-tight">More than a filter. More than surveillance.</h2>
            <p className="mt-4 text-[1.125rem] text-sub">
              Legacy tools like GoGuardian rely on covert tracking and hard URL blocks. ClassSync empowers students through transparency and active self-regulation.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="bg-canvas rounded-card p-8 border border-line flex flex-col justify-between hover:shadow-card transition-shadow">
              <div>
                <div className="w-12 h-12 rounded-2xl bg-brand/10 text-brand flex items-center justify-center text-xl font-bold mb-6">👁️</div>
                <h3 className="text-xl font-bold tracking-tight text-ink">Session-Based Privacy</h3>
                <p className="mt-3 text-[0.9375rem] text-sub leading-relaxed">
                  Unlike hidden background daemons that log students 24/7, ClassSync operates strictly during active class session windows. Once class ends, tracking terminates immediately.
                </p>
              </div>
              <div className="mt-8 pt-4 border-t border-line text-xs font-semibold text-brand">Zero off-hours surveillance →</div>
            </div>

            <div className="bg-canvas rounded-card p-8 border border-line flex flex-col justify-between hover:shadow-card transition-shadow">
              <div>
                <div className="w-12 h-12 rounded-2xl bg-orange/10 text-orange flex items-center justify-center text-xl font-bold mb-6">⚡</div>
                <h3 className="text-xl font-bold tracking-tight text-ink">Intentional Focus Modes</h3>
                <p className="mt-3 text-[0.9375rem] text-sub leading-relaxed">
                  Toggle instantly between Active Learning, Quiet Study (gentle soft nudges), and Assessment Lock with instant breach telemetry alerts.
                </p>
              </div>
              <div className="mt-8 pt-4 border-t border-line text-xs font-semibold text-orange">Adaptive classroom pacing →</div>
            </div>

            <div className="bg-canvas rounded-card p-8 border border-line flex flex-col justify-between hover:shadow-card transition-shadow">
              <div>
                <div className="w-12 h-12 rounded-2xl bg-green/10 text-green flex items-center justify-center text-xl font-bold mb-6">📱</div>
                <h3 className="text-xl font-bold tracking-tight text-ink">BYOD & Mobile Native</h3>
                <p className="mt-3 text-[0.9375rem] text-sub leading-relaxed">
                  Lightweight React Native app for personal iOS and Android devices. No invasive school MDM profiles or complex hardware enrollment required.
                </p>
              </div>
              <div className="mt-8 pt-4 border-t border-line text-xs font-semibold text-green">Runs on any smartphone →</div>
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 2.5: PHILOSOPHY */}
      <section id="philosophy" className="py-24 px-6 bg-canvas border-t border-line">
        <div className="max-w-[1280px] mx-auto">
          <div className="text-center max-w-[700px] mx-auto mb-16">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand/10 text-brand text-xs font-bold uppercase tracking-wider mb-4">
              Our Core Philosophy
            </div>
            <h2 className="text-[2.5rem] sm:text-[3rem] font-bold tracking-tight text-ink">Student Agency Over Surveillance</h2>
            <p className="mt-4 text-[1.125rem] text-sub leading-relaxed">
              Traditional classroom management assumes students are adversaries to be monitored and locked down. ClassSync believes lasting digital responsibility is built on trust, transparency, and self-regulation.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-[1000px] mx-auto">
            <div className="bg-surface rounded-card p-8 border border-line shadow-card flex flex-col justify-between">
              <div>
                <div className="text-red font-bold text-sm tracking-wider uppercase mb-2">Legacy Approach</div>
                <h3 className="text-2xl font-bold text-ink mb-4">Authoritarian MDMs</h3>
                <ul className="space-y-3 text-sub text-sm">
                  <li className="flex items-start gap-2"><span>❌</span> Hidden 24/7 background daemons logging web activity off-campus.</li>
                  <li className="flex items-start gap-2"><span>❌</span> Punitive blackout screens with zero student feedback.</li>
                  <li className="flex items-start gap-2"><span>❌</span> Invasive device takeovers requiring school-issued hardware.</li>
                </ul>
              </div>
            </div>

            <div className="bg-surface rounded-card p-8 border border-line shadow-card flex flex-col justify-between border-l-4 border-l-brand">
              <div>
                <div className="text-brand font-bold text-sm tracking-wider uppercase mb-2">The ClassSync Way</div>
                <h3 className="text-2xl font-bold text-ink mb-4">Transparent Agency</h3>
                <ul className="space-y-3 text-ink text-sm">
                  <li className="flex items-start gap-2"><span>✅</span> Session-based telemetry active only during scheduled classes.</li>
                  <li className="flex items-start gap-2"><span>✅</span> Real-time personal focus score & feedback visible to students.</li>
                  <li className="flex items-start gap-2"><span>✅</span> BYOD-friendly mobile app that respects personal privacy.</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 3: PRIVACY & ARCHITECTURE */}
      <section id="security" className="py-24 px-6 bg-surface border-t border-line">
        <div className="max-w-[1280px] mx-auto grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-green/10 text-green text-xs font-bold uppercase tracking-wider mb-4">
              Privacy-First Architecture
            </div>
            <h2 className="text-[2.5rem] sm:text-[3rem] font-bold tracking-tight text-ink">Private by design. Trusted by parents & students.</h2>
            <p className="mt-4 text-[1.125rem] text-sub leading-relaxed">
              Students see exact focus scores and transparent telemetry in real-time. Teachers get actionable focus analytics without compromising personal web history or device files.
            </p>

            <div className="mt-8 space-y-4">
              <div className="flex items-start gap-4">
                <div className="w-8 h-8 rounded-full bg-green/10 text-green flex items-center justify-center font-bold text-sm shrink-0">✓</div>
                <div>
                  <h4 className="font-semibold text-ink">Student Agency & Score Visibility</h4>
                  <p className="text-sm text-sub mt-0.5">Students view their own focus score and know exactly what data is shared during class.</p>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <div className="w-8 h-8 rounded-full bg-green/10 text-green flex items-center justify-center font-bold text-sm shrink-0">✓</div>
                <div>
                  <h4 className="font-semibold text-ink">Assessment Lock Isolation</h4>
                  <p className="text-sm text-sub mt-0.5">Instant breach notifications on app switching during exams without full device lockdown.</p>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <div className="w-8 h-8 rounded-full bg-green/10 text-green flex items-center justify-center font-bold text-sm shrink-0">✓</div>
                <div>
                  <h4 className="font-semibold text-ink">Zero Data Selling</h4>
                  <p className="text-sm text-sub mt-0.5">Strict compliance with student privacy laws. School data remains strictly under district control.</p>
                </div>
              </div>
            </div>
          </div>

          {/* Visual Graphic Box */}
          <div className="bg-canvas rounded-card p-8 border border-line shadow-card">
            <div className="text-xs font-mono text-sub uppercase tracking-wider mb-4">Live Student Telemetry Stream</div>
            <div className="space-y-3 font-mono text-xs">
              <div className="p-3 rounded-xl bg-surface border border-line flex items-center justify-between">
                <span className="text-ink font-semibold">student_id: #8492 — Alice Chen</span>
                <span className="text-green font-bold">STATUS: ACTIVE_LEARNING (100%)</span>
              </div>
              <div className="p-3 rounded-xl bg-surface border border-line flex items-center justify-between">
                <span className="text-ink font-semibold">student_id: #8493 — Bob Martinez</span>
                <span className="text-orange font-bold">STATUS: BACKGROUNDED ({'&gt;'}10s)</span>
              </div>
              <div className="p-3 rounded-xl bg-surface border border-line flex items-center justify-between">
                <span className="text-ink font-semibold">student_id: #8494 — Charlie Okafor</span>
                <span className="text-green font-bold">STATUS: ACTIVE_LEARNING (96%)</span>
              </div>
              <div className="p-3 rounded-xl bg-surface border border-line flex items-center justify-between">
                <span className="text-ink font-semibold">session_mode: ASSESSMENT_LOCK</span>
                <span className="text-red font-bold">BREACH ALERT: NONE</span>
              </div>
            </div>
            <div className="mt-6 pt-4 border-t border-line text-center text-xs text-sub">
              WebSocket gateway streaming real-time deltas securely via PostgreSQL & Redis.
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 4: BUILT FOR HOW SCHOOLS WORK */}
      <section id="roles" className="py-24 px-6 bg-canvas border-t border-line">
        <div className="max-w-[1280px] mx-auto text-center mb-16">
          <h2 className="text-[2.5rem] sm:text-[3.0rem] font-bold tracking-tight">Built for how schools work.</h2>
          <p className="mt-4 text-[1.125rem] text-sub">Designed specifically for teachers, students, administrators, and parents.</p>
        </div>

        <div className="max-w-[1000px] mx-auto grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-surface p-6 rounded-tile border border-line text-left shadow-card">
            <div className="text-2xl mb-3">👩‍🏫</div>
            <h3 className="font-bold text-lg text-ink">Teachers</h3>
            <p className="text-sm text-sub mt-2">Real-time grid view, instant mode toggles, and gentle student focus pings.</p>
          </div>
          <div className="bg-surface p-6 rounded-tile border border-line text-left shadow-card">
            <div className="text-2xl mb-3">🎓</div>
            <h3 className="font-bold text-lg text-ink">Students</h3>
            <p className="text-sm text-sub mt-2">Device agency, personal focus streak tracking, and transparent self-regulation.</p>
          </div>
          <div className="bg-surface p-6 rounded-tile border border-line text-left shadow-card">
            <div className="text-2xl mb-3">🏫</div>
            <h3 className="font-bold text-lg text-ink">Administrators</h3>
            <p className="text-sm text-sub mt-2">District-wide compliance, lightweight setup, and zero hardware MDM overhead.</p>
          </div>
          <div className="bg-surface p-6 rounded-tile border border-line text-left shadow-card">
            <div className="text-2xl mb-3">👨‍👩‍👧</div>
            <h3 className="font-bold text-lg text-ink">Parents</h3>
            <p className="text-sm text-sub mt-2">Peace of mind knowing digital tools are used productively without invasive tracking.</p>
          </div>
        </div>
      </section>

      {/* SECTION 5: TESTIMONIALS */}
      <section className="py-24 px-6 bg-surface border-t border-line">
        <div className="max-w-[1280px] mx-auto text-center mb-16">
          <h2 className="text-[2.5rem] font-bold tracking-tight">Educators everywhere love ClassSync</h2>
        </div>

        <div className="max-w-[1200px] mx-auto grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-canvas p-8 rounded-card border border-line shadow-card flex flex-col justify-between">
            <p className="text-sub text-[1rem] leading-relaxed">&ldquo;ClassSync gives me visibility without turning my classroom into a police state. Students respect the boundaries because they understand them.&rdquo;</p>
            <div className="mt-6 flex items-center gap-3 pt-4 border-t border-line">
              <div className="w-10 h-10 rounded-full bg-brand/20 text-brand font-bold flex items-center justify-center">MK</div>
              <div>
                <div className="font-semibold text-sm">Marcus Vance</div>
                <div className="text-xs text-sub">High School History Teacher</div>
              </div>
            </div>
          </div>

          <div className="bg-canvas p-8 rounded-card border border-line shadow-card flex flex-col justify-between">
            <p className="text-sub text-[1rem] leading-relaxed">&ldquo;The Assessment Lock feature has completely eliminated testing anxiety and cheating without needing complicated school-issued Chromebook lockdowns.&rdquo;</p>
            <div className="mt-6 flex items-center gap-3 pt-4 border-t border-line">
              <div className="w-10 h-10 rounded-full bg-orange/20 text-orange font-bold flex items-center justify-center">EL</div>
              <div>
                <div className="font-semibold text-sm">Elena Rostova</div>
                <div className="text-xs text-sub">STEM Department Chair</div>
              </div>
            </div>
          </div>

          <div className="bg-canvas p-8 rounded-card border border-line shadow-card flex flex-col justify-between">
            <p className="text-sub text-[1rem] leading-relaxed">&ldquo;Switching from GoGuardian to ClassSync was the best decision our district made. Parents and students are thrilled with our new privacy-first approach.&rdquo;</p>
            <div className="mt-6 flex items-center gap-3 pt-4 border-t border-line">
              <div className="w-10 h-10 rounded-full bg-green/20 text-green font-bold flex items-center justify-center">DP</div>
              <div>
                <div className="font-semibold text-sm">David Park</div>
                <div className="text-xs text-sub">District Technology Director</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 6: FINAL CTA */}
      <section id="pricing" className="py-24 px-6 bg-canvas border-t border-line text-center">
        <div className="max-w-[800px] mx-auto">
          <h2 className="text-[3rem] font-bold tracking-tight text-ink">Try ClassSync free for 30 days</h2>
          <p className="mt-4 text-[1.125rem] text-sub">No hardware MDM required. Set up your first class in under 2 minutes.</p>

          <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link href="/dashboard" className="w-full sm:w-auto inline-flex items-center justify-center rounded-[999px] bg-brand hover:bg-brand-hover text-white text-[1rem] font-semibold px-8 py-4 shadow-lg shadow-brand/25 transition-all">
              Start Free Teacher Trial
            </Link>
            <Link href="/dashboard" className="w-full sm:w-auto inline-flex items-center justify-center rounded-[999px] bg-surface hover:bg-track text-ink border border-line text-[1rem] font-semibold px-8 py-4 transition-all">
              Open Demo Classroom
            </Link>
          </div>
          <div className="mt-6 text-xs text-sub">Full access to all focus modes, student telemetry, and real-time WebSocket dashboard.</div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="py-16 px-6 bg-[#121215] text-[#a0a0ab] border-t border-[#222226]">
        <div className="max-w-[1280px] mx-auto grid grid-cols-2 md:grid-cols-5 gap-8 text-sm">
          <div className="col-span-2">
            <div className="flex items-center gap-3 text-white font-bold text-lg mb-4">
              <span className="w-7 h-7 rounded-lg bg-gradient-to-tr from-brand to-orange flex items-center justify-center text-white shrink-0">
                <svg className="w-4 h-4 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="9"></circle>
                  <circle cx="12" cy="12" r="3" fill="currentColor"></circle>
                </svg>
              </span>
              ClassSync
            </div>
            <p className="text-xs text-[#70707b] max-w-[300px] leading-relaxed">
              The transparent classroom focus platform designed for student agency and digital responsibility.
            </p>
            <div className="mt-6 text-xs text-[#70707b]">© 2026 ClassSync Inc. All rights reserved.</div>
          </div>

          <div>
            <h4 className="text-white font-semibold mb-3 text-xs uppercase tracking-wider">Product</h4>
            <ul className="space-y-2 text-xs">
              <li><a href="#features" className="hover:text-white transition-colors">Features</a></li>
              <li><a href="#philosophy" className="hover:text-white transition-colors">Philosophy</a></li>
              <li><a href="#security" className="hover:text-white transition-colors">Privacy & Security</a></li>
              <li><a href="#roles" className="hover:text-white transition-colors">For Schools</a></li>
              <li><a href="#pricing" className="hover:text-white transition-colors">Pricing & Trial</a></li>
            </ul>
          </div>

          <div>
            <h4 className="text-white font-semibold mb-3 text-xs uppercase tracking-wider">Resources</h4>
            <ul className="space-y-2 text-xs">
              <li><a href="#roles" className="hover:text-white transition-colors">Teacher Guide</a></li>
              <li><a href="#roles" className="hover:text-white transition-colors">Student App (iOS/Android)</a></li>
              <li><a href="#security" className="hover:text-white transition-colors">FERPA / COPPA Compliance</a></li>
            </ul>
          </div>

          <div>
            <h4 className="text-white font-semibold mb-3 text-xs uppercase tracking-wider">Company</h4>
            <ul className="space-y-2 text-xs">
              <li><a href="#philosophy" className="hover:text-white transition-colors">About Us</a></li>
              <li><a href="mailto:hello@classsync.demo" className="hover:text-white transition-colors">Contact</a></li>
            </ul>
          </div>
        </div>
      </footer>
    </div>
  );
}
