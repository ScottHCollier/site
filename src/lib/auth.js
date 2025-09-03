import { getSession } from './session.js';

// Pages that require authentication
const protectedPages = [
    '/index.html',
    '/scheduler.html',
];

export function initAuth() {
    document.addEventListener("DOMContentLoaded", () => {
        const session = getSession();
        const pathname = window.location.pathname === '/' ? '/index.html' : window.location.pathname;

        if (!session && protectedPages.includes(pathname)) {
            window.location.href = '/login.html';
            return;
        }

        const wrapper = document.getElementById('page-wrapper');
        if (wrapper) wrapper.style.display = 'block';

        const loader = document.getElementById('global-loader');
        if (loader) loader.style.display = 'none';
    });
}

export function initLogout() {
    document.addEventListener('DOMContentLoaded', () => {
        const logoutLink = document.getElementById('logout-link');
        if (!logoutLink) return;

        logoutLink.addEventListener('click', (e) => {
            e.preventDefault();
            localStorage.removeItem('session');
            window.location.href = '/login.html';
        });
    });
}
