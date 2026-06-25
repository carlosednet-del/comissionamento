// PM2 Ecosystem Config — Gestor de Demandas
// Uso: pm2 start ecosystem.config.js
// Docs: https://pm2.keymetrics.io/docs/usage/application-declaration/

module.exports = {
  apps: [
    {
      name: "gestor-demandas",
      script: "server.js",            // gerado pelo output: 'standalone'
      cwd: "/var/www/gestor-demandas", // caminho no servidor — ajuste se necessário
      instances: 1,                   // aumente para cluster mode se tiver múltiplos CPUs
      exec_mode: "fork",
      watch: false,
      autorestart: true,
      max_restarts: 10,
      min_uptime: "10s",
      env: {
        NODE_ENV: "production",
        PORT: 3000,
        HOSTNAME: "0.0.0.0",
      },
      error_file: "/var/log/pm2/gestor-demandas-error.log",
      out_file: "/var/log/pm2/gestor-demandas-out.log",
      log_date_format: "YYYY-MM-DD HH:mm:ss",
    },
  ],
};
