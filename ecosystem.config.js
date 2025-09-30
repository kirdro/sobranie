module.exports = {
  apps: [{
    name: 'sobranie',
    script: 'bun',
    args: 'start',
    cwd: '/var/www/sobranie',
    instances: 1,
    exec_mode: 'fork',
    env: {
      NODE_ENV: 'production',
      PORT: 3011,
      SOBRANIE_API_BASE_URL: 'https://api.sobranie.yaropolk.tech'
    },
    env_production: {
      NODE_ENV: 'production',
      PORT: 3011,
      SOBRANIE_API_BASE_URL: 'https://api.sobranie.yaropolk.tech'
    },
    log_file: '/var/log/pm2/sobranie.log',
    out_file: '/var/log/pm2/sobranie-out.log',
    error_file: '/var/log/pm2/sobranie-error.log',
    time: true,
    restart_delay: 3000,
    max_restarts: 5,
    min_uptime: '10s'
  }]
};