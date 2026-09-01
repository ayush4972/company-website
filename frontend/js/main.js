// GSAP Setup
gsap.registerPlugin(ScrollTrigger);

// Respect prefers-reduced-motion: every scroll/entry reveal below checks
// this once and, when true, snaps straight to the animation's end state
// instead of playing it.
const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

// Custom Cursor Logic
const dot = document.getElementById('cursor-dot');
const outline = document.getElementById('cursor-outline');

window.addEventListener('mousemove', (e) => {
    gsap.to(dot, { x: e.clientX, y: e.clientY, duration: 0.1 });
    gsap.to(outline, { x: e.clientX - 16, y: e.clientY - 16, duration: 0.3 });
});

document.querySelectorAll('a, button, input, textarea').forEach(el => {
    el.addEventListener('mouseenter', () => {
        gsap.to(outline, { scale: 1.5, backgroundColor: 'rgba(168, 232, 255, 0.1)', duration: 0.3 });
        gsap.to(dot, { scale: 1.2, duration: 0.3 });
    });
    el.addEventListener('mouseleave', () => {
        gsap.to(outline, { scale: 1, backgroundColor: 'transparent', duration: 0.3 });
        gsap.to(dot, { scale: 1, duration: 0.3 });
    });
});

// Hero Reveal Animation
const tl = gsap.timeline();
tl.to('.hero-word', {
    opacity: 1,
    y: 0,
    duration: reduceMotion ? 0 : 0.8,
    stagger: reduceMotion ? 0 : 0.2,
    ease: "power4.out"
})
    .to('#hero-subtext', {
        opacity: 1,
        y: 0,
        duration: reduceMotion ? 0 : 1,
        ease: "power2.out"
    }, reduceMotion ? 0 : "-=0.4")
    .to('#hero-cta', {
        opacity: 1,
        duration: reduceMotion ? 0 : 0.8,
        ease: "power2.out"
    }, reduceMotion ? 0 : "-=0.6");

// Mobile nav menu toggle
const menuBtn = document.getElementById('mobile-menu-btn');
const menuPanel = document.getElementById('mobile-menu');
const menuIcon = document.getElementById('mobile-menu-icon');

if (menuBtn && menuPanel) {
    menuBtn.addEventListener('click', () => {
        const isOpen = !menuPanel.classList.contains('hidden');
        menuPanel.classList.toggle('hidden');
        menuBtn.setAttribute('aria-expanded', String(!isOpen));
        if (menuIcon) menuIcon.textContent = isOpen ? 'menu' : 'close';
    });
    menuPanel.querySelectorAll('a').forEach(a => {
        a.addEventListener('click', () => {
            menuPanel.classList.add('hidden');
            menuBtn.setAttribute('aria-expanded', 'false');
            if (menuIcon) menuIcon.textContent = 'menu';
        });
    });
}

// Navbar Scroll Effect
window.addEventListener('scroll', () => {
    const nav = document.getElementById('main-nav');
    if (window.scrollY > 100) {
        nav.classList.add('bg-surface/80', 'backdrop-blur-xl', 'border-primary/20', 'py-2');
        nav.classList.remove('py-4', 'border-transparent');
    } else {
        nav.classList.remove('bg-surface/80', 'backdrop-blur-xl', 'border-primary/20', 'py-2');
        nav.classList.add('py-4', 'border-transparent');
    }
});

// Vision Text Staggered Reveal
// These lines start dimmed/hidden via static Tailwind classes (opacity-30 /
// opacity-0) in the HTML itself, so under reduced-motion we can't just skip
// the animation — jump straight to the fully-revealed end state instead.
const visionLines = document.querySelectorAll('.vision-line');
visionLines.forEach((line, index) => {
    if (reduceMotion) {
        gsap.set(line, { opacity: 1, y: -10 });
        return;
    }
    gsap.to(line, {
        scrollTrigger: {
            trigger: line,
            start: "top 80%",
            end: "top 40%",
            scrub: true,
        },
        opacity: 1,
        y: -10,
        duration: 1
    });
});

// Contact form submission (present on the homepage and the dedicated contact page)
const form = document.getElementById('contact-form');
const success = document.getElementById('success-message');
const formError = document.getElementById('contact-form-error');

if (form) {
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        if (formError) formError.classList.add('hidden');

        const submitBtn = form.querySelector('button[type="submit"]');
        const data = Object.fromEntries(new FormData(form).entries());

        submitBtn.disabled = true;
        try {
            const res = await fetch('/api/contact', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data),
            });
            const result = await res.json().catch(() => ({}));
            if (!res.ok) throw new Error(result.error || 'Something went wrong.');

            if (success) {
                success.classList.remove('hidden');
                gsap.from(success, {
                    opacity: 0,
                    y: 20,
                    duration: 0.5,
                    ease: "power2.out"
                });
            }
            form.reset();
        } catch (err) {
            if (formError) {
                formError.textContent = err.message || 'Could not send your message. Please try again.';
                formError.classList.remove('hidden');
            }
        } finally {
            submitBtn.disabled = false;
        }
    });
}

// Framer-Motion style entry animations via GSAP for elements
// (service cards get their own side-slide below, so exclude them here)
// Skipped entirely under reduced-motion: these elements have no static
// hidden/opacity-0 classes in the HTML, so simply not animating them
// leaves them in their normal, fully visible resting state.
if (!reduceMotion) {
    gsap.utils.toArray('.glass-card:not(.svc-card)').forEach(card => {
        gsap.from(card, {
            scrollTrigger: {
                trigger: card,
                start: "top bottom-=100",
                toggleActions: "play none none none"
            },
            opacity: 0,
            y: 50,
            scale: 0.95,
            duration: 1,
            ease: "power3.out"
        });
    });
}

// Services cards — anime.js grid-stagger reveal on scroll (animejs.com-style
// cascading entrance: fade + rise + spring bounce, staggered outward from
// the center of the grid instead of a straight top-to-bottom order)
// Same reduced-motion handling as above: skipping leaves the cards visible.
if (!reduceMotion && window.anime && document.querySelector('.svc-card')) {
    anime.animate('.svc-card', {
        opacity: [0, 1],
        translateY: [60, 0],
        scale: [0.9, 1],
        delay: anime.stagger(90, { from: 'center' }),
        duration: 900,
        ease: 'outElastic(1, .7)',
        autoplay: anime.onScroll({
            target: '#services',
            enter: 'bottom-=10% top'
        })
    });
}
