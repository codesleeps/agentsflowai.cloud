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
            env_production: {
                NODE_ENV: "production",
                PORT: 3006,
                NEXT_PUBLIC_APP_URL: "https://agentsflowai.cloud",
                BETTER_AUTH_URL: "https://agentsflowai.cloud",
                DATABASE_URL: "postgresql://neondb_owner:npg_fr9mQj6TJHWc@ep-nameless-sound-a9f05rit-pooler.gwc.azure.neon.tech/neondb?sslmode=require&channel_binding=require",
                SESSION_SECRET: "SdeDMfRJTddxHYDxvycIZRLhzCpvAebYIG4To2rA",
                BETTER_AUTH_SECRET: "5ujQ/eOt/C2bcKxxmaI8OuHGSrkgbccslnsA8K64iLE=",
                INNGEST_SIGNING_KEY: "agentsflow_signing_key_72_61_16_111",
                INNGEST_EVENT_KEY: "agentsflow_event_key_72_61_16_111",
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
