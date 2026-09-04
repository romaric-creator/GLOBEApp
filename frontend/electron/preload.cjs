const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  getConfig: () => ipcRenderer.invoke('get-config'),
  saveConfig: (config) => ipcRenderer.invoke('save-config', config),
  resetConfig: () => ipcRenderer.invoke('reset-config'),
  getServerUrl: () => ipcRenderer.invoke('get-server-url'),
  getVersion: () => ipcRenderer.invoke('get-version'),
  getLogPath: () => ipcRenderer.invoke('get-log-path'),
  getLogContent: () => ipcRenderer.invoke('get-log-content'),
  autostartIsEnabled: () => ipcRenderer.invoke('autostart-is-enabled'),
  autostartEnable: () => ipcRenderer.invoke('autostart-enable'),
  autostartDisable: () => ipcRenderer.invoke('autostart-disable'),
  testDbConnection: (dbUrl) => ipcRenderer.invoke('test-db-connection', dbUrl),

  // Splash events
  onSplashStatus: (cb) => { ipcRenderer.removeAllListeners('splash-status'); ipcRenderer.on('splash-status', (_e, msg) => cb(msg)); },
  onSplashDetail: (cb) => { ipcRenderer.removeAllListeners('splash-detail'); ipcRenderer.on('splash-detail', (_e, msg) => cb(msg)); },
  onShowSetup: (cb) => { ipcRenderer.removeAllListeners('show-setup'); ipcRenderer.once('show-setup', () => cb()); },
  setupComplete: (config) => ipcRenderer.send('setup-complete', config),
  splashResize: (width, height) => ipcRenderer.send('splash-resize', { width, height }),
});
