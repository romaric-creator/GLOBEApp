const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  getConfig: () => ipcRenderer.invoke('get-config'),
  saveConfig: (config) => ipcRenderer.invoke('save-config', config),
  resetConfig: () => ipcRenderer.invoke('reset-config'),
  getServerUrl: () => ipcRenderer.invoke('get-server-url'),
  getVersion: () => ipcRenderer.invoke('get-version'),
  autostartIsEnabled: () => ipcRenderer.invoke('autostart-is-enabled'),
  autostartEnable: () => ipcRenderer.invoke('autostart-enable'),
  autostartDisable: () => ipcRenderer.invoke('autostart-disable'),

  // Splash events
  onSplashStatus: (cb) => ipcRenderer.on('splash-status', (_e, msg) => cb(msg)),
  onSplashDetail: (cb) => ipcRenderer.on('splash-detail', (_e, msg) => cb(msg)),
  onShowSetup: (cb) => ipcRenderer.on('show-setup', () => cb()),
  setupComplete: (config) => ipcRenderer.send('setup-complete', config),
});
