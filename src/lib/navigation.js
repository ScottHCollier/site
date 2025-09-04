// Handles navbar active link highlighting and prevents reloads
export function initNavigation() {
    document.addEventListener("click", (event) => {
        const link = event.target.closest("a");
        if (!link) return;

        const href = link.getAttribute("href");
        if (!href || href.startsWith("#") || href.startsWith("mailto:")) return;

        let currentPath = window.location.pathname.replace(/\/$/, "");
        if (currentPath === "") currentPath = "/";

        const url = new URL(href, window.location.origin + window.location.pathname);
        let targetPath = url.pathname.replace(/\/$/, "");
        if (targetPath === "") targetPath = "/";

        if ((currentPath === "/" && targetPath === "/home.html") ||
            (currentPath === "/home.html" && targetPath === "/")) {
            targetPath = "/";
        }

        if (targetPath === currentPath) event.preventDefault();
    });

    document.addEventListener("DOMContentLoaded", () => {
        let currentPath = window.location.pathname.replace(/\/$/, "");
        if (currentPath === "" || currentPath === "/home.html") currentPath = "/";

        document.querySelectorAll(".navbar a").forEach(link => {
            const href = link.getAttribute("href");
            if (!href || href === '#') return;

            const url = new URL(href, window.location.origin + window.location.pathname);
            let targetPath = url.pathname.replace(/\/$/, "");
            if (targetPath === "" || targetPath === "/home.html") targetPath = "/";

            if (currentPath === targetPath) link.classList.add("active");

            link.addEventListener("click", event => {
                if (currentPath === targetPath) {
                    event.preventDefault();
                    console.log(`Already on ${targetPath}, skipping reload`);
                }
            });
        });
    });
}
