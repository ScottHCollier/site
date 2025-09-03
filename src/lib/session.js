// Session helpers
export function getSession() {
    const session = localStorage.getItem("session");
    return session ? JSON.parse(session) : null;
}

export function logout() {
    localStorage.removeItem("session");
    window.location.href = "/login.html";
}

export function setSession(session) {
    localStorage.setItem("session", JSON.stringify(session));
}

export function clearSession() {
    localStorage.removeItem("session");
}
