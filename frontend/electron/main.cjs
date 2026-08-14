const { app, BrowserWindow, ipcMain, Tray, Menu } = require('electron');
const path = require('path');
const http = require('http');
const { BackendRunner } = require('./backend-runner.cjs');
const { loadConfig, saveConfig, resetConfig } = require('./config.cjs');

let mainWindow = null;
let splashWindow = null;
let tray = null;
let backendRunner = null;

const isDev = !app.isPackaged;

function createSplashWindow() {
  splashWindow = new BrowserWindow({
    width: 480,
    height: 320,
    frame: false,
    resizable: false,
    transparent: false,
    alwaysOnTop: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  const splashPath = isDev
    ? path.join(__dirname, '..', 'public', 'splash.html')
    : path.join(__dirname, '..', 'dist', 'splash.html');

  splashWindow.loadFile(splashPath);
  splashWindow.center();
}

function createMainWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    show: false,
    icon: path.join(__dirname, '..', 'public', 'logo.png'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  if (isDev) {
    mainWindow.loadURL('http://localhost:3000');
  } else {
    mainWindow.loadFile(path.join(__dirname, '..', 'dist', 'index.html'));
  }

  mainWindow.on('close', (e) => {
    if (!app.isQuitting) {
      e.preventDefault();
      mainWindow.hide();
    }
  });
}

function createTray() {
  const iconPath = path.join(__dirname, '..', 'public', 'logo.png');
  tray = new Tray(iconPath);

  const contextMenu = Menu.buildFromTemplate([
    { label: 'Afficher', click: () => { mainWindow?.show(); mainWindow?.focus(); } },
    { type: 'separator' },
    {
      label: 'Quitter',
      click: () => {
        app.isQuitting = true;
        if (backendRunner) backendRunner.stop();
        app.quit();
      },
    },
  ]);

  tray.setToolTip('GLOBE Manager');
  tray.setContextMenu(contextMenu);
  tray.on('double-click', () => { mainWindow?.show(); mainWindow?.focus(); });
}

function emitSplash(channel, data) {
  if (splashWindow && !splashWindow.isDestroyed()) {
    splashWindow.webContents.send(channel, data);
  }
}

function showMain() {
  if (mainWindow) {
    mainWindow.show();
    mainWindow.focus();
  }
  if (splashWindow && !splashWindow.isDestroyed()) {
    splashWindow.close();
    splashWindow = null;
  }
}

function healthCheck(url) {
  return new Promise((resolve) => {
    const req = http.get(url, { timeout: 3000 }, (res) => {
      resolve(res.statusCode === 200);
      res.resume();
    });
    req.on('error', () => resolve(false));
    req.on('timeout', () => { req.destroy(); resolve(false); });
  });
}

async function waitForRemoteBackend(url, timeoutSecs, emit) {
  const deadline = Date.now() + timeoutSecs * 1000;
  let attempt = 0;
  while (Date.now() < deadline) {
    attempt++;
    if (await healthCheck(url)) return true;
    if (attempt <= 3 || attempt % 5 === 0) {
      emit('splash-detail', `Attente du serveur (tentative ${attempt})...`);
    }
    await new Promise((r) => setTimeout(r, 2000));
  }
  return false;
}

async function startup() {
  createSplashWindow();
  createMainWindow();
  createTray();

  backendRunner = new BackendRunner((channel, msg) => emitSplash(channel, msg));

  await new Promise((r) => setTimeout(r, 300));

  let config = loadConfig();

  if (!config.configured) {
    emitSplash('show-setup', null);
    config = await new Promise((resolve) => {
      ipcMain.once('setup-complete', (_e, cfg) => {
        saveConfig(cfg);
        resolve(cfg);
      });
    });
  }

  if (config.mode === 'server') {
    emitSplash('splash-status', 'Démarrage du serveur...');
    emitSplash('splash-detail', 'Lancement du backend intégré...');

    const ok = await backendRunner.start(config);
    if (!ok) {
      await new Promise((r) => setTimeout(r, 4000));
    }
  } else {
    const base = (config.server_url || 'http://localhost:3001').replace(/\/$/, '');
    emitSplash('splash-status', `Connexion au serveur ${base}...`);
    emitSplash('splash-detail', 'Vérification de la disponibilité...');

    const ready = await waitForRemoteBackend(
      `${base}/api/health`, 30,
      (ch, msg) => emitSplash(ch, msg)
    );
    if (!ready) {
      emitSplash('splash-status', 'Serveur inaccessible. Vérifiez le réseau.');
      await new Promise((r) => setTimeout(r, 4000));
    }
  }

  showMain();
}

// IPC handlers
ipcMain.handle('get-config', () => loadConfig());
ipcMain.handle('save-config', (_e, config) => saveConfig(config));
ipcMain.handle('reset-config', () => resetConfig());
ipcMain.handle('get-server-url', () => {
  const c = loadConfig();
  return c.mode === 'client' ? c.server_url : null;
});
ipcMain.handle('get-version', () => app.getVersion());
ipcMain.handle('autostart-is-enabled', () => {
  return app.getLoginItemSettings().openAtLogin;
});
ipcMain.handle('autostart-enable', () => {
  app.setLoginItemSettings({ openAtLogin: true });
  return true;
});
ipcMain.handle('autostart-disable', () => {
  app.setLoginItemSettings({ openAtLogin: false });
  return true;
});

// Single instance
const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (mainWindow) {
      mainWindow.show();
      mainWindow.focus();
    }
  });

  app.whenReady().then(startup);
}

app.on('window-all-closed', (e) => {
  e.preventDefault();
});
