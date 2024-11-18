module.exports = {
    apps: [{
      name: 'sentinel',
      script: 'dist/app.js',
      instances: 1,
      exec_mode: 'fork',
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      env: {
        NODE_ENV: 'production',
        PORT: 3000
      },
      env_production: {
        NODE_ENV: 'production',
        PORT: 80
      },
      time: true,
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      error_file: 'dist/logs/error.log',
      out_file: 'dist/logs/out.log',
    }]
  };