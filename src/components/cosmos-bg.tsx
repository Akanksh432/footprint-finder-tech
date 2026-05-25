import { useEffect, useRef } from "react";

interface Star {
  x: number;
  y: number;
  r: number;
  a: number;
  dy: number;
  layer: 0 | 1 | 2;
}

interface Dust {
  x: number;
  y: number;
  r: number;
  a: number;
  dx: number;
  dy: number;
  phase: number;
}

/**
 * Full-screen animated cosmic background:
 * - 280 drifting stars in 3 depth layers
 * - 40 green stardust particles
 * - Breathing nebula glow handled by CSS gradient
 * Fixed, z-0, pointer-events: none. Respects prefers-reduced-motion and tab visibility.
 */
export function CosmosBg() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let stars: Star[] = [];
    let dust: Dust[] = [];
    let raf = 0;
    let running = true;

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    const init = () => {
      canvas.width = Math.floor(window.innerWidth * dpr);
      canvas.height = Math.floor(window.innerHeight * dpr);
      canvas.style.width = window.innerWidth + "px";
      canvas.style.height = window.innerHeight + "px";
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      stars = [];
      const w = window.innerWidth;
      const h = window.innerHeight;
      // 80 tiny
      for (let i = 0; i < 80; i++) {
        stars.push({
          x: Math.random() * w,
          y: Math.random() * h,
          r: 0.6,
          a: 0.3 + Math.random() * 0.4,
          dy: 0.02 + Math.random() * 0.05,
          layer: 0,
        });
      }
      // 120 medium
      for (let i = 0; i < 120; i++) {
        stars.push({
          x: Math.random() * w,
          y: Math.random() * h,
          r: 1,
          a: 0.4 + Math.random() * 0.45,
          dy: 0.05 + Math.random() * 0.08,
          layer: 1,
        });
      }
      // 80 larger
      for (let i = 0; i < 80; i++) {
        stars.push({
          x: Math.random() * w,
          y: Math.random() * h,
          r: 1.8,
          a: 0.5 + Math.random() * 0.5,
          dy: 0.1 + Math.random() * 0.1,
          layer: 2,
        });
      }
      dust = [];
      for (let i = 0; i < 40; i++) {
        dust.push({
          x: Math.random() * w,
          y: Math.random() * h,
          r: 0.8 + Math.random() * 1.4,
          a: 0.15 + Math.random() * 0.2,
          dx: (Math.random() - 0.5) * 0.15,
          dy: -0.05 - Math.random() * 0.1,
          phase: Math.random() * Math.PI * 2,
        });
      }
    };

    init();

    let t = 0;
    const tick = () => {
      if (!running) return;
      t += 0.016;
      const w = window.innerWidth;
      const h = window.innerHeight;
      ctx.clearRect(0, 0, w, h);

      // stars
      for (const s of stars) {
        s.y += s.dy;
        if (s.y > h + 2) {
          s.y = -2;
          s.x = Math.random() * w;
        }
        ctx.beginPath();
        ctx.fillStyle = `rgba(220,240,255,${s.a})`;
        ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
        ctx.fill();
      }

      // green stardust
      for (const d of dust) {
        d.x += d.dx;
        d.y += d.dy;
        if (d.y < -5) {
          d.y = h + 5;
          d.x = Math.random() * w;
        }
        if (d.x < -5) d.x = w + 5;
        if (d.x > w + 5) d.x = -5;
        const pulse = 0.5 + 0.5 * Math.sin(t * 1.4 + d.phase);
        const alpha = d.a * (0.6 + 0.4 * pulse);
        ctx.beginPath();
        ctx.fillStyle = `rgba(0,255,140,${alpha})`;
        ctx.arc(d.x, d.y, d.r, 0, Math.PI * 2);
        ctx.fill();
      }

      raf = requestAnimationFrame(tick);
    };

    if (!reduce) {
      raf = requestAnimationFrame(tick);
    } else {
      // single static draw
      tick();
      running = false;
      cancelAnimationFrame(raf);
    }

    const onResize = () => init();
    const onVis = () => {
      if (document.hidden) {
        running = false;
        cancelAnimationFrame(raf);
      } else if (!reduce) {
        running = true;
        raf = requestAnimationFrame(tick);
      }
    };
    window.addEventListener("resize", onResize);
    document.addEventListener("visibilitychange", onVis);

    return () => {
      running = false;
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", onResize);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, []);

  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-0 z-0 overflow-hidden"
      style={{ contain: "strict" }}
    >
      {/* Breathing nebula glow */}
      <div className="absolute inset-0 cosmos-nebula" />
      {/* Star canvas */}
      <canvas ref={canvasRef} className="absolute inset-0" />
      {/* Subtle grid on top */}
      <div className="absolute inset-0 grid-bg opacity-40" />
    </div>
  );
}
