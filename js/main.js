// GSAP Setup
gsap.registerPlugin(ScrollTrigger);

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
    duration: 0.8,
    stagger: 0.2,
    ease: "power4.out"
})
    .to('#hero-subtext', {
        opacity: 1,
        y: 0,
        duration: 1,
        ease: "power2.out"
    }, "-=0.4")
    .to('#hero-cta', {
        opacity: 1,
        duration: 0.8,
        ease: "power2.out"
    }, "-=0.6");

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
const visionLines = document.querySelectorAll('.vision-line');
visionLines.forEach((line, index) => {
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

// Form Submission Interaction (only present on the homepage)
const form = document.getElementById('contact-form');
const success = document.getElementById('success-message');

if (form) {
    form.addEventListener('submit', (e) => {
        e.preventDefault();
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
    });
}

// Framer-Motion style entry animations via GSAP for elements
gsap.utils.toArray('.glass-card').forEach(card => {
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
