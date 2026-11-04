import { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Shield, Sparkles } from 'lucide-react';

/**
 * SplashScreen — resolves in ≤1 second.
 *
 * Strategy:
 *  1. Start a 150ms RAF-driven progress bar that reaches 100% in 700ms max.
 *  2. Listen for auth state. The moment auth is resolved AND the progress
 *     bar is ≥ 60%, we trigger the exit animation and navigate immediately.
 *  3. Hard cap: if auth takes longer than 800ms we navigate anyway.
 *
 * Result: users on a warm connection see the splash for ~400–600ms.
 * Cold-start / slow auth: hard-capped at 800ms.
 */
const SplashScreen = () => {
  const [progress, setProgress] = useState(0);
  const [exiting, setExiting] = useState(false);
  const { user, loading: authLoading, userRole, getDashboardRoute } = useAuth();
  const navigate = useNavigate();

  const doneRef = useRef(false);

  const doNavigate = (u: typeof user) => {
    if (doneRef.current) return;
    doneRef.current = true;
    setExiting(true);

    // Determine target route immediately
    const role = userRole || localStorage.getItem('taskvision_user_role');
    const target = u ? getDashboardRoute(role) : '/auth';

    // 150ms exit animation, then navigate
    setTimeout(() => {
      navigate(target, { replace: true });
    }, 150);
  };

  // ── Progress bar: 0→100 in 400ms (Turbo) ──────────────────────────────────
  useEffect(() => {
    const start = performance.now();
    const DURATION = 400; // Accelerated fill
    let raf: number;

    const tick = (now: number) => {
      const elapsed = now - start;
      const pct = Math.min(100, (elapsed / DURATION) * 100);
      setProgress(pct);
      if (pct < 100) {
        raf = requestAnimationFrame(tick);
      }
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  // ── Auth listener: navigate as soon as auth is known AND progress ≥ 40% ──
  useEffect(() => {
    if (authLoading) return;
    if (progress >= 40) {
      doNavigate(user);
    }
  }, [authLoading, user, progress, userRole]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Absolute hard cap: 600ms ───────────────────────────────────────────────
  useEffect(() => {
    const cap = setTimeout(() => doNavigate(user), 600);
    return () => clearTimeout(cap);
  }, [user]); // eslint-disable-line react-hooks/exhaustive-deps


  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center overflow-hidden transition-opacity duration-200 ${exiting ? 'opacity-0' : 'opacity-100'
        }`}
      style={{
        background: 'linear-gradient(135deg, #0f172a 0%, #1e3a5f 50%, #312e81 100%)',
      }}
    >
      {/* ── Ambient blurred orbs (CSS-only, no JS) ── */}
      <div
        className="absolute -top-40 -right-40 w-80 h-80 rounded-full opacity-30 blur-3xl"
        style={{ background: 'radial-gradient(circle, #3b82f6 0%, transparent 70%)' }}
      />
      <div
        className="absolute -bottom-40 -left-40 w-72 h-72 rounded-full opacity-20 blur-3xl"
        style={{ background: 'radial-gradient(circle, #8b5cf6 0%, transparent 70%)' }}
      />
      <div
        className="absolute top-1/3 right-1/4 w-48 h-48 rounded-full opacity-15 blur-2xl"
        style={{ background: 'radial-gradient(circle, #06b6d4 0%, transparent 70%)' }}
      />

      {/* ── Dot grid overlay ── */}
      <div
        className="absolute inset-0 opacity-20"
        style={{
          backgroundImage:
            "radial-gradient(circle, rgba(255,255,255,0.15) 1px, transparent 1px)",
          backgroundSize: '40px 40px',
        }}
      />

      {/* ── Main content ── */}
      <div className="relative z-10 flex flex-col items-center gap-8 px-6 w-full max-w-sm splash-enter">

        {/* Logo */}
        <div className="relative">
          {/* Glow ring */}
          <div
            className="absolute inset-0 rounded-3xl blur-xl opacity-60"
            style={{
              background: 'linear-gradient(135deg, #60a5fa, #a78bfa)',
              transform: 'scale(1.3)',
            }}
          />
          {/* Icon card */}
          <div
            className="relative w-20 h-20 rounded-3xl flex items-center justify-center shadow-2xl"
            style={{
              background: 'linear-gradient(135deg, #ffffff 0%, #dbeafe 60%, #ede9fe 100%)',
            }}
          >
            <Shield className="w-10 h-10 text-blue-600" strokeWidth={2} />
            <Sparkles className="absolute -top-1.5 -right-1.5 w-5 h-5 text-amber-400 sparkle-anim" />
          </div>
        </div>

        {/* Brand text */}
        <div className="text-center space-y-1.5">
          <h1
            className="text-5xl font-black tracking-tight leading-none"
            style={{
              background: 'linear-gradient(135deg, #ffffff 0%, #bfdbfe 50%, #c4b5fd 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
            }}
          >
            TaskVision
          </h1>
          <p className="text-blue-300/90 text-base font-light tracking-widest uppercase">
            Enterprise Management
          </p>
        </div>

        {/* Progress bar */}
        <div className="w-full space-y-2">
          <div className="w-full h-1 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.1)' }}>
            <div
              className="h-full rounded-full relative overflow-hidden"
              style={{
                width: `${progress}%`,
                background: 'linear-gradient(90deg, #60a5fa, #a78bfa, #34d399)',
                transition: 'width 80ms linear',
              }}
            >
              {/* shimmer */}
              <div className="absolute inset-0 shimmer-anim" style={{
                background: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.4) 50%, transparent 100%)',
              }} />
            </div>
          </div>
          <div className="flex justify-between text-xs text-white/40 font-mono">
            <span>Loading</span>
            <span>{Math.round(progress)}%</span>
          </div>
        </div>

        {/* Tagline */}
        <p className="text-white/40 text-xs tracking-wider">
          Streamline • Secure • Scale
        </p>
      </div>

      {/* ── Embedded animations ── */}
      <style>{`
        .splash-enter {
          animation: splashIn 0.4s cubic-bezier(0.34, 1.56, 0.64, 1) both;
        }

        @keyframes splashIn {
          from { opacity: 0; transform: scale(0.92) translateY(12px); }
          to   { opacity: 1; transform: scale(1) translateY(0); }
        }

        .sparkle-anim {
          animation: sparkle 1.2s ease-in-out infinite;
        }

        @keyframes sparkle {
          0%, 100% { opacity: 0.3; transform: scale(0.8) rotate(-10deg); }
          50%       { opacity: 1;   transform: scale(1.2) rotate(10deg); }
        }

        .shimmer-anim {
          animation: shimmer 1s ease-in-out infinite;
        }

        @keyframes shimmer {
          0%   { transform: translateX(-100%); }
          100% { transform: translateX(200%); }
        }
      `}</style>
    </div>
  );
};

export default SplashScreen;
