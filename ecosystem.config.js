module.exports = {
  apps: [{
    name: 'smartcost-calculator',
    script: 'npm',
    args: 'start',
    env: {
      NODE_ENV: 'production',
      PORT: 3000,
      POSTGRES_HOST: 'localhost',
      POSTGRES_PORT: 5432,
      POSTGRES_DATABASE: 'smartcost_vps',
      POSTGRES_USER: 'smartcost_user',
      POSTGRES_PASSWORD: 'your_secure_password_here'
    },
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    env_production: {
      NODE_ENV: 'production'
    }
  }]
};
