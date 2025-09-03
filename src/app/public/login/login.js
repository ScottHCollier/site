import { mockLoginApi } from "../../../lib/api.js";
import { setSession } from "../../../lib/session.js";

const form = document.getElementById("loginForm");
const msg = document.getElementById("loginMessage");

form.addEventListener("submit", async e => {
    e.preventDefault();
    const username = document.getElementById("username").value;
    const password = document.getElementById("password").value;

    try {
        const session = await mockLoginApi(username, password);
        setSession(session);
        msg.style.color = "lightgreen";
        msg.textContent = "Login successful!";
        window.location.href = "/scheduler.html";
    } catch (err) {
        msg.style.color = "red";
        msg.textContent = err;
    }
});
