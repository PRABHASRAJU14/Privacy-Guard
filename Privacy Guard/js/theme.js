(function () {
    const STORAGE_KEY = "pg_theme_v2";
    const root = document.documentElement;

    function readTheme() {
        try {
            return localStorage.getItem(STORAGE_KEY);
        } catch (_) {
            return null;
        }
    }

    function writeTheme(theme) {
        try {
            localStorage.setItem(STORAGE_KEY, theme);
        } catch (_) {}
    }

    function applyTheme(theme) {
        root.setAttribute(
            "data-theme",
            theme === "dark" ? "dark" : "light"
        );
    }

    function resolveTheme() {
        const saved = readTheme();

        if (saved === "dark" || saved === "light") {
            return saved;
        }

        return "dark";
    }

    applyTheme(resolveTheme());

    window.applyPrivacyGuardTheme = applyTheme;

    window.setPrivacyGuardTheme = function (theme) {
        const next = theme === "dark" ? "dark" : "light";
        applyTheme(next);
        writeTheme(next);
        return next;
    };

    window.addEventListener("storage", function (event) {
        if (
            event.key === STORAGE_KEY &&
            (event.newValue === "dark" || event.newValue === "light")
        ) {
            applyTheme(event.newValue);
        }
    });

    function initProgressNavigation() {
        const routes = {
            Scan: "../html/scan.html",
            Results: "../html/result.html",
            Purpose: "../html/purpose.html",
            Protect: "../html/protect.html",
            Share: "../html/share.html"
        };

        document.querySelectorAll(".progress-step").forEach(step => {
            const label = step.querySelector(".step-content strong")?.textContent.trim();
            const route = routes[label];

            if (!route) {
                return;
            }

            step.setAttribute("role", "link");
            step.setAttribute("tabindex", "0");

            const navigate = () => {
                window.location.href = route;
            };

            step.addEventListener("click", navigate);
            step.addEventListener("keydown", event => {
                if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    navigate();
                }
            });
        });
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", initProgressNavigation);
    } else {
        initProgressNavigation();
    }

    /* =========================================================
       UNIFIED AMBIENT PARTICLES (MATCHING LANDING PAGE EXACTLY)
    ========================================================= */
    function initAmbientCanvas() {
        const canvas = document.getElementById("ambientCanvas");
        if (!canvas) return;
        if (canvas._pgAmbientInit) return;
        canvas._pgAmbientInit = true;

        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        let width;
        let height;
        const particles = [];
        const particleCount = 36;

        function resize() {
            width = canvas.width = window.innerWidth;
            height = canvas.height = window.innerHeight;
        }

        resize();
        window.addEventListener("resize", resize);

        for (let i = 0; i < particleCount; i++) {
            particles.push({
                x: Math.random() * width,
                y: Math.random() * height,
                vx: (Math.random() - .5) * .35,
                vy: (Math.random() - .5) * .35,
                radius: Math.random() * 1.8 + .8,
                phase: Math.random() * Math.PI * 2
            });
        }

        function animate() {
            ctx.clearRect(0, 0, width, height);

            const dark = document.documentElement.getAttribute("data-theme") === "dark";

            const dotColor = dark
                ? "rgba(116, 125, 255, .40)"
                : "rgba(74, 84, 235, .16)";

            const lineColor = dark
                ? "rgba(91, 101, 255, .11)"
                : "rgba(77, 83, 226, .055)";

            particles.forEach((p, index) => {
                p.x += p.vx;
                p.y += p.vy;
                p.phase += .02;

                if (p.x < 0) p.x = width;
                if (p.x > width) p.x = 0;
                if (p.y < 0) p.y = height;
                if (p.y > height) p.y = 0;

                const radius = p.radius + Math.sin(p.phase) * .6;

                ctx.beginPath();
                ctx.arc(p.x, p.y, Math.max(0.2, radius), 0, Math.PI * 2);
                ctx.fillStyle = dotColor;
                ctx.fill();

                for (let j = index + 1; j < particles.length; j++) {
                    const p2 = particles[j];
                    const dx = p.x - p2.x;
                    const dy = p.y - p2.y;
                    const distance = Math.sqrt(dx * dx + dy * dy);

                    if (distance < 120) {
                        ctx.beginPath();
                        ctx.moveTo(p.x, p.y);
                        ctx.lineTo(p2.x, p2.y);
                        ctx.strokeStyle = lineColor;
                        ctx.lineWidth = (1 - distance / 120) * .8;
                        ctx.stroke();
                    }
                }
            });

            requestAnimationFrame(animate);
        }

        requestAnimationFrame(animate);
    }

    window.initPrivacyGuardAmbientCanvas = initAmbientCanvas;
    window.initAmbientCanvas = initAmbientCanvas;

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", initAmbientCanvas);
    } else {
        initAmbientCanvas();
    }
})();

