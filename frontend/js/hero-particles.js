// Hero particle / dot-grid background — animejs.com-style: a field of dots
// connected by faint lines, drifting slowly, with a gentle mouse-parallax
// shift. Plain Canvas2D for per-pixel drawing (anime.js has no canvas
// renderer), but leans on anime.js's math helpers (random / damp) for the
// organic drift and frame-rate-independent smoothing.
//
// Perf/accessibility built in: fewer dots on small screens, paused via
// requestAnimationFrame only while the hero is actually on screen (an
// IntersectionObserver) and only while the tab is visible, and frozen to a
// single static frame for prefers-reduced-motion.
(function () {
    const hero = document.getElementById('hero');
    const canvas = document.getElementById('hero-particles');
    if (!hero || !canvas || !canvas.getContext) return;

    const ctx = canvas.getContext('2d');
    const reduceMotionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');

    const ACCENT = '168, 232, 255'; // rgb triplet for the --primary cyan (#a8e8ff)
    const DOT_RADIUS = 1.1;
    const DOT_ALPHA = 0.22;
    const LINE_ALPHA = 0.028;
    const DRIFT = 7; // px of per-dot wander
    const MAX_PARALLAX = 14; // px the whole field can shift toward the cursor

    let dpr = Math.min(window.devicePixelRatio || 1, 2);
    let width = 0, height = 0;
    let dots = [];
    let cols = 0, rows = 0;
    let targetX = 0, targetY = 0; // pointer target, -1..1
    let parX = 0, parY = 0; // damped current parallax offset (px)
    let rafId = null;
    let lastTime = performance.now();
    let heroInView = false;
    let running = false;

    function rand(min, max) {
        return window.anime ? anime.random(min, max) : min + Math.random() * (max - min);
    }

    function buildGrid() {
        const rect = hero.getBoundingClientRect();
        width = Math.max(rect.width, 1);
        height = Math.max(rect.height, 1);
        canvas.width = width * dpr;
        canvas.height = height * dpr;
        canvas.style.width = width + 'px';
        canvas.style.height = height + 'px';
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

        const spacing = width < 640 ? 110 : width < 1024 ? 96 : 88;
        cols = Math.ceil(width / spacing) + 1;
        rows = Math.ceil(height / spacing) + 1;
        dots = [];
        for (let r = 0; r < rows; r++) {
            for (let c = 0; c < cols; c++) {
                dots.push({
                    baseX: c * spacing,
                    baseY: r * spacing,
                    phase: rand(0, 1000) / 100,
                    speed: rand(35, 55) / 100
                });
            }
        }
    }

    function drawStatic() {
        ctx.clearRect(0, 0, width, height);
        ctx.strokeStyle = `rgba(${ACCENT}, ${LINE_ALPHA})`;
        ctx.fillStyle = `rgba(${ACCENT}, ${DOT_ALPHA})`;
        ctx.lineWidth = 1;
        for (let r = 0; r < rows; r++) {
            for (let c = 0; c < cols; c++) {
                const i = r * cols + c;
                const d = dots[i];
                if (c < cols - 1) drawLine(d, dots[i + 1]);
                if (r < rows - 1) drawLine(d, dots[i + cols]);
            }
        }
        for (const d of dots) {
            ctx.beginPath();
            ctx.arc(d.baseX, d.baseY, DOT_RADIUS, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    function drawLine(a, b) {
        ctx.beginPath();
        ctx.moveTo(a.baseX + (a._dx || 0), a.baseY + (a._dy || 0));
        ctx.lineTo(b.baseX + (b._dx || 0), b.baseY + (b._dy || 0));
        ctx.stroke();
    }

    function frame(now) {
        if (!running) return;
        const dt = Math.min(now - lastTime, 64);
        lastTime = now;

        // Frame-rate-independent smoothing toward the pointer target.
        parX = window.anime ? anime.damp(parX, targetX * MAX_PARALLAX, dt, 6) : parX + (targetX * MAX_PARALLAX - parX) * 0.08;
        parY = window.anime ? anime.damp(parY, targetY * MAX_PARALLAX, dt, 6) : parY + (targetY * MAX_PARALLAX - parY) * 0.08;

        const t = now / 1000;
        ctx.clearRect(0, 0, width, height);
        ctx.lineWidth = 1;

        for (const d of dots) {
            d._dx = Math.sin(t * d.speed + d.phase) * DRIFT + parX;
            d._dy = Math.cos(t * d.speed * 0.8 + d.phase) * DRIFT + parY;
        }

        ctx.strokeStyle = `rgba(${ACCENT}, ${LINE_ALPHA})`;
        for (let r = 0; r < rows; r++) {
            for (let c = 0; c < cols; c++) {
                const i = r * cols + c;
                const d = dots[i];
                if (c < cols - 1) drawLine(d, dots[i + 1]);
                if (r < rows - 1) drawLine(d, dots[i + cols]);
            }
        }

        ctx.fillStyle = `rgba(${ACCENT}, ${DOT_ALPHA})`;
        for (const d of dots) {
            ctx.beginPath();
            ctx.arc(d.baseX + d._dx, d.baseY + d._dy, DOT_RADIUS, 0, Math.PI * 2);
            ctx.fill();
        }

        rafId = requestAnimationFrame(frame);
    }

    function start() {
        if (running || reduceMotionQuery.matches || !heroInView) return;
        running = true;
        lastTime = performance.now();
        rafId = requestAnimationFrame(frame);
    }

    function stop() {
        running = false;
        if (rafId) cancelAnimationFrame(rafId);
        rafId = null;
    }

    function handlePointer(e) {
        const rect = hero.getBoundingClientRect();
        targetX = ((e.clientX - rect.left) / width) * 2 - 1;
        targetY = ((e.clientY - rect.top) / height) * 2 - 1;
    }

    function applyMotionPreference() {
        if (reduceMotionQuery.matches) {
            stop();
            buildGrid();
            drawStatic();
        } else {
            start();
        }
    }

    buildGrid();
    if (reduceMotionQuery.matches) {
        drawStatic();
    }

    window.addEventListener('mousemove', handlePointer, { passive: true });

    let resizeTimer;
    window.addEventListener('resize', () => {
        clearTimeout(resizeTimer);
        resizeTimer = setTimeout(() => {
            buildGrid();
            if (reduceMotionQuery.matches) drawStatic();
        }, 150);
    });

    document.addEventListener('visibilitychange', () => {
        if (document.hidden) stop();
        else applyMotionPreference();
    });

    if (typeof reduceMotionQuery.addEventListener === 'function') {
        reduceMotionQuery.addEventListener('change', applyMotionPreference);
    }

    const io = new IntersectionObserver((entries) => {
        heroInView = entries[0].isIntersecting;
        if (heroInView) applyMotionPreference();
        else stop();
    }, { threshold: 0 });
    io.observe(hero);
})();
