/**
 * PM2 Ecosystem Configuration (CommonJS)
 */

module.exports = {
    apps: [
        {
            name: "agentsflow-ai",
            script: "/home/deploy/agentsflow-ai/node_modules/next/dist/bin/next",
            args: "start",
            cwd: "/home/deploy/agentsflow-ai",
            instances: 1,
            exec_mode: "fork",
            autorestart: true,
            watch: false,
            max_memory_restart: "1G",

            // Environment variables for production
            // Secrets should be stored in .env.production on the server
            env_production: {
                NODE_ENV: "production",
                PORT: 3006,
                NEXT_PUBLIC_APP_URL: "https://agentsflowai.cloud",
                BETTER_AUTH_URL: "https://agentsflowai.cloud",
                TRUST_PROXY: "true"
            },

            // Logging
            log_date_format: "YYYY-MM-DD HH:mm:ss Z",
            error_file: "/home/deploy/.pm2/logs/agentsflow-ai-error.log",
            out_file: "/home/deploy/.pm2/logs/agentsflow-ai-out.log",
            merge_logs: true,

            // Graceful shutdown
            kill_timeout: 5000,
            wait_ready: false,
            listen_timeout: 10000,

            // Restart strategy
            exp_backoff_restart_delay: 100,
            max_restarts: 10,
            min_uptime: "10s",
        },
    ],
};
