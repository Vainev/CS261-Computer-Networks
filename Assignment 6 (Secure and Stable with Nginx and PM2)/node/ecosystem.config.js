module.exports = 
{
  apps: [{
  name: 'CS261_Assign6',
  script: 'assignment6.js',
  instances: 1,
  autorestart: true,
  max_memory_restart: '1G',
  watch: false,
  env: {
    PORT: 3100,
    MCONNECTSTRING: 'mongodb://localhost:27017',
    MDATABASENAME: 'assignment6',
    MCOLLECTIONNAME: 'users',
    REDISADDRESS: '127.0.0.1',
    REDISPORT: 6379,
    REDISEXPIRATIONTIME: 10,
    GAMEPORT: 4200,
    SHAREDSECRET: 'CS261S21'
  }
  }],
};
