const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

function configDir() {
  const { app } = require('electron');
  const base = app.getPath('appData');
  const dir = path.join(base, 'GlobeManager');
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

function configFilePath() {
  return path.join(configDir(), 'config.json');
}

function loadConfig() {
  try {
    const content = fs.readFileSync(configFilePath(), 'utf-8');
    return JSON.parse(content);
  } catch {
    return {
      mode: 'server',
      server_url: null,
      database_url: null,
      port: 3001,
      jwt_secret: crypto.randomUUID() + crypto.randomUUID(),
      allowed_origins: '',
      remote_db_host: '',
      remote_db_port: 3306,
      remote_db_user: '',
      remote_db_password: '',
      remote_db_name: '',
      configured: false,
    };
  }
}

function saveConfig(config) {
  fs.writeFileSync(configFilePath(), JSON.stringify(config, null, 2));
  return true;
}

function resetConfig() {
  try {
    fs.unlinkSync(configFilePath());
    return true;
  } catch {
    return false;
  }
}

module.exports = { loadConfig, saveConfig, resetConfig, configFilePath };
