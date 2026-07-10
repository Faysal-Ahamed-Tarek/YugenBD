// PM2 process manifest for the YugenBD VPS (Hostinger KVM1).
// Runs all three apps behind Nginx. Secrets are NOT here — each app reads its
// own .env file (backend via dotenv, Next apps via .env.production). Keep this
// file committed and secret-free.
//
// Ports (internal only — Nginx proxies to these; never expose them publicly):
//   backend  -> 4000   frontend -> 3000   admin -> 3001
//
// Adjust max_memory_restart to your plan's RAM (check with `free -m`).
module.exports = {
  apps: [
    {
      name: "yugenbd-backend",
      cwd: "./backend",
      script: "npm",
      args: "start", // -> node dist/server.js (build first: npm run build)
      env: { NODE_ENV: "production", PORT: "4000" },
      instances: 1,
      autorestart: true,
      max_memory_restart: "350M",
      time: true,
    },
    {
      name: "yugenbd-frontend",
      cwd: "./frontend",
      script: "npm",
      args: "start", // -> next start (port 3000)
      env: { NODE_ENV: "production", PORT: "3000" },
      instances: 1,
      autorestart: true,
      max_memory_restart: "500M",
      time: true,
    },
    {
      name: "yugenbd-admin",
      cwd: "./admin",
      script: "npm",
      args: "start", // -> next start -p 3001
      env: { NODE_ENV: "production", PORT: "3001" },
      instances: 1,
      autorestart: true,
      max_memory_restart: "400M",
      time: true,
    },
  ],
};
