import React, { useEffect, useRef } from "react";

// Interactive Particle & Constellation Canvas
export function InteractiveCanvas({ theme = "aurora" }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    let animationFrameId;

    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };
    window.addEventListener("resize", handleResize);

    // Mouse coordinates
    let mouse = { x: -1000, y: -1000, radius: 140 };
    const handleMouseMove = (e) => {
      mouse.x = e.clientX;
      mouse.y = e.clientY;
    };
    window.addEventListener("mousemove", handleMouseMove);

    // Particle colors based on theme
    const getColor = () => {
      switch (theme) {
        case "blueprint":
          return Math.random() > 0.5 ? "rgba(56, 189, 248, " : "rgba(52, 211, 153, ";
        case "nebula":
          return Math.random() > 0.5 ? "rgba(192, 132, 252, " : "rgba(244, 114, 182, ";
        case "emerald":
          return Math.random() > 0.5 ? "rgba(52, 211, 153, " : "rgba(45, 212, 191, ";
        case "cyber":
          return Math.random() > 0.5 ? "rgba(6, 182, 212, " : "rgba(96, 165, 250, ";
        default:
          return Math.random() > 0.5 ? "rgba(52, 211, 153, " : "rgba(129, 140, 248, ";
      }
    };

    // Initialize particles
    const particleCount = Math.min(Math.floor((width * height) / 30000), 45);
    const particles = [];
    for (let i = 0; i < particleCount; i++) {
      particles.push({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - 0.5) * 0.45,
        vy: (Math.random() - 0.5) * 0.45,
        radius: Math.random() * 2 + 1,
        baseAlpha: Math.random() * 0.4 + 0.15,
        colorPrefix: getColor(),
      });
    }

    // Animation Loop
    const render = () => {
      ctx.clearRect(0, 0, width, height);

      // Draw & update particles
      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];

        // Move
        p.x += p.vx;
        p.y += p.vy;

        // Bounce bounds
        if (p.x < 0 || p.x > width) p.vx *= -1;
        if (p.y < 0 || p.y > height) p.vy *= -1;

        // Mouse distance
        const dx = mouse.x - p.x;
        const dy = mouse.y - p.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        let alpha = p.baseAlpha;

        if (dist < mouse.radius) {
          alpha = Math.min(1, p.baseAlpha + (1 - dist / mouse.radius) * 0.5);
          // Subtle gentle repulsion
          p.x -= (dx / dist) * 0.6;
          p.y -= (dy / dist) * 0.6;
        }

        // Draw particle
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fillStyle = `${p.colorPrefix}${alpha})`;
        ctx.shadowColor = `${p.colorPrefix}0.6)`;
        ctx.shadowBlur = 6;
        ctx.fill();

        // Connect nearby particles
        for (let j = i + 1; j < particles.length; j++) {
          const p2 = particles[j];
          const dist2 = Math.hypot(p.x - p2.x, p.y - p2.y);
          if (dist2 < 110) {
            ctx.beginPath();
            ctx.moveTo(p.x, p.y);
            ctx.lineTo(p2.x, p2.y);
            const lineAlpha = (1 - dist2 / 110) * 0.12;
            ctx.strokeStyle = `${p.colorPrefix}${lineAlpha})`;
            ctx.lineWidth = 0.8;
            ctx.shadowBlur = 0;
            ctx.stroke();
          }
        }
      }

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      window.removeEventListener("resize", handleResize);
      window.removeEventListener("mousemove", handleMouseMove);
      cancelAnimationFrame(animationFrameId);
    };
  }, [theme]);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none z-[1] w-full h-full opacity-80"
    />
  );
}

// Campus Landmark Skyline Silhouette (Subtle Vector Layer)
export function CampusSkylineSVG() {
  return (
    <div className="fixed bottom-0 left-0 right-0 pointer-events-none z-0 overflow-hidden opacity-25 select-none no-print">
      <svg
        viewBox="0 0 1440 320"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-44 sm:h-64 object-cover object-bottom"
        preserveAspectRatio="none"
      >
        <defs>
          <linearGradient id="skylineGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#10b981" stopOpacity="0.4" />
            <stop offset="50%" stopColor="#6366f1" stopOpacity="0.3" />
            <stop offset="100%" stopColor="#06b6d4" stopOpacity="0.35" />
          </linearGradient>
        </defs>

        {/* Far Layer Architectural Skyline */}
        <path
          d="M0 320 L0 260 L80 260 L80 240 L110 240 L110 260 L180 260 L180 210 L230 210 L230 180 L245 150 L260 180 L260 210 L320 210 L320 250 L400 250 L400 230 L450 230 L450 190 L520 190 L520 240 L600 240 L600 160 L620 160 L620 120 L635 80 L650 120 L650 160 L670 160 L670 240 L760 240 L760 210 L830 210 L830 250 L910 250 L910 220 L960 220 L960 170 L980 170 L990 140 L1000 170 L1020 170 L1020 220 L1080 220 L1080 240 L1180 240 L1180 200 L1240 200 L1240 250 L1320 250 L1320 220 L1370 220 L1370 260 L1440 260 L1440 320 Z"
          fill="url(#skylineGrad)"
          opacity="0.3"
        />

        {/* Foreground Modern Campus Pillars & Library Rotunda */}
        <path
          d="M0 320 L0 280 L120 280 L120 250 L160 250 L160 280 L290 280 L290 240 L340 240 L340 280 L480 280 L480 220 L510 220 L510 170 L530 170 L530 220 L560 220 L560 280 L700 280 L700 260 L790 260 L790 280 L880 280 L880 230 L930 230 L930 280 L1060 280 L1060 240 L1120 240 L1120 280 L1260 280 L1260 250 L1300 250 L1300 280 L1440 280 L1440 320 Z"
          fill="#070b14"
          opacity="0.6"
        />

        {/* Glowing Campus Windows / Accent Dots */}
        <circle cx="635" cy="100" r="3" fill="#34d399" opacity="0.8" />
        <rect x="628" y="135" width="4" height="6" fill="#38bdf8" opacity="0.7" />
        <rect x="638" y="135" width="4" height="6" fill="#38bdf8" opacity="0.7" />
        <rect x="240" y="175" width="3" height="5" fill="#a78bfa" opacity="0.8" />
        <rect x="248" y="175" width="3" height="5" fill="#a78bfa" opacity="0.8" />
        <circle cx="990" cy="155" r="2.5" fill="#34d399" opacity="0.8" />
      </svg>
    </div>
  );
}
