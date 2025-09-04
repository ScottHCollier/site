<!-- title: Login -->
<template>
  <h1>Login</h1>
  <form id="loginForm">
    <label for="username">Username</label>
    <input type="text" id="username" name="username" required>
    
    <label for="password">Password</label>
    <input type="password" id="password" name="password" required>
    
    <button type="submit">Log In</button>
  </form>
  <div id="loginMessage"></div>
</template>

<script>
import { mockLoginApi } from "../../lib/api.js";
import { setSession } from "../../lib/session.js";

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
</script>

<style>
form {
  display:flex;
  flex-direction:column;
  gap:0.5em;
  max-width:300px;
}

input {
  padding:0.5em;
  border-radius:5px;
  border:1px solid #555;
  background:#1e1e1e;
  color:#e0e0e0;
}

button {
  background:#6200ee;
  color:#fff;
  padding:0.5em;
}

button:hover {
  background:#7b39ff;
}

.login-container {
  display: flex;
  justify-content: center;
  align-items: center;
  flex-direction: column;
  height: 100vh;
}
</style>
