import { getSession } from './session.js';

export function initAuth() {
    const wrapper = document.getElementById('page-wrapper');
    const loader = document.getElementById('global-loader');

    const session = getSession();
    const path = window.location.pathname;
    const isLoginPage = path === '/' || path === '/index.html';

    if (!session && !isLoginPage) {
        window.location.href = '/';
        return;
    }

    if (session && isLoginPage) {
        window.location.href = '/scheduler.html';
        return;
    }

    // Show content after auth check
    if (wrapper) wrapper.style.display = 'block';
    if (loader) loader.style.display = 'none';
}

export function initLogout() {
    document.addEventListener('DOMContentLoaded', () => {
        const logoutLink = document.getElementById('logout-link');
        if (!logoutLink) return;

        logoutLink.addEventListener('click', (e) => {
            e.preventDefault();
            localStorage.removeItem('session');
            window.location.href = '/';
        });
    });
}
