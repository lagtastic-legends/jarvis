module.exports = {
  apps: [
    {
      name: 'jarvis-core',
      script: 'node_modules/tsx/dist/cli.mjs',
      args: 'server.ts',
      cwd: __dirname,
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      env: {
        NODE_ENV: 'production',
        PORT: 3001,
      },
      error_file: './logs/jarvis-error.log',
      out_file: './logs/jarvis-out.log',
      time: true,
    },
  ],
};
