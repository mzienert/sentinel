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
      PORT: 3000,
      AWS_REGION: 'us-west-1',
      DYNAMODB_TABLE: 'GalvitronStack-GalvitronTable1808E743-A10U3EPBPH98'
    },
    env_production: {
      NODE_ENV: 'production',
      PORT: 80,
      AWS_REGION: 'us-west-1',
      DYNAMODB_TABLE: 'GalvitronStack-GalvitronTable1808E743-A10U3EPBPH98'
    },
    time: true,
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    error_file: 'dist/logs/error.log',
    out_file: 'dist/logs/out.log',
  }]
};