// lib/api.js
export async function mockLoginApi(username, password) {
    return new Promise((resolve, reject) => {
        setTimeout(() => {
            if (username === "admin" && password === "password") {
                resolve({
                    token: "mock-jwt-token",
                    user: { username: "admin", role: "admin" }
                });
            } else {
                reject("Invalid credentials");
            }
        }, 500);
    });
}
