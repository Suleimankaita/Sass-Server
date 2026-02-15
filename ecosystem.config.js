// /var/www/Sass-Server/ecosystem.config.js
module.exports = {
  apps: [
    {
      name: "ysstore-api",
      script: "./Server.js",
      instances: "max",          // Use all CPU cores
      exec_mode: "cluster",      // Cluster mode for high performance
      watch: true,               // Watch for code changes
      ignore_watch: ["Public/img", "node_modules"], // Ignore product uploads
      env: {
        NODE_ENV: "development",
        PORT: 3500
      },
      env_production: {
        NODE_ENV: "production",
        PORT: 3500
      },
      max_memory_restart: "500M",  // Auto-restart if memory usage is high
      autorestart: true
    }
  ]
};
