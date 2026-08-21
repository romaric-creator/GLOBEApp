const { app, BrowserWindow, ipcMain, Tray, Menu, dialog, session } = require('electron');
const path = require('path');
const http = require('http');
const { BackendRunner } = require('./backend-runner.cjs');
const { loadConfig, saveConfig, resetConfig } = require('./config.cjs');

// Performance optimizations
app.commandLine.appendSwitch('enable-gpu-rasterization');
app.commandLine.appendSwitch('enable-zero-copy');
app.commandLine.appendSwitch('enable-accelerated-2d-canvas');
app.commandLine.appendSwitch('disable-renderer-backgrounding');
app.commandLine.appendSwitch('js-flags', '--max-old-space-size=4096');

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
      spellcheck: false,
    },
  });

  ipcMain.on('splash-resize', (_e, { width, height }) => {
    if (splashWindow && !splashWindow.isDestroyed()) {
      splashWindow.setSize(width, height, true);
      splashWindow.center();
    }
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
    autoHideMenuBar: true,
    icon: path.join(__dirname, '..', 'public', 'logo.png'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      spellcheck: false,
      backgroundThrottling: false,
      v8CacheOptions: 'bypassHeatCheck',
    },
  });

  mainWindow.setMenuBarVisibility(false);

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
  try {
    tray = new Tray(iconPath);
  } catch {
    tray = null;
    return;
  }

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
  Menu.setApplicationMenu(null);

  session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
    callback({
      responseHeaders: {
        ...details.responseHeaders,
        'Content-Security-Policy': [
          "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: file:; connect-src 'self' http://localhost:* ws://localhost:*; font-src 'self' data:"
        ],
      },
    });
  });

  createSplashWindow();
  createMainWindow();
  createTray();

  backendRunner = new BackendRunner((channel, msg) => {
    if (channel === 'backend-fatal') {
      dialog.showMessageBoxSync({
        type: 'error',
        title: 'Erreur critique',
        message: 'Le serveur a planté plusieurs fois.',
        detail: msg + '\nL\'application va se fermer.',
        buttons: ['OK'],
      });
      app.exit(1);
      return;
    }
    emitSplash(channel, msg);
  });

  // Wait for splash page to fully load before sending events
  if (splashWindow && !splashWindow.isDestroyed()) {
    if (splashWindow.webContents.isLoading()) {
      await new Promise((resolve) => {
        splashWindow.webContents.on('did-finish-load', resolve);
      });
    }
  }
  await new Promise((r) => setTimeout(r, 500));

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

    let ok = await backendRunner.start(config);
    if (!ok) {
      const choice = dialog.showMessageBoxSync({
        type: 'error',
        title: 'Erreur de démarrage',
        message: 'Le serveur backend n\'a pas pu démarrer.',
        detail: 'Vérifiez que MySQL est lancé et que la configuration est correcte.',
        buttons: ['Réessayer', 'Reconfigurer', 'Quitter'],
        defaultId: 0,
      });
      if (choice === 0) {
        ok = await backendRunner.start(config);
      } else if (choice === 1) {
        resetConfig();
        app.relaunch();
        app.exit(0);
        return;
      } else {
        app.exit(1);
        return;
      }
      if (!ok) {
        dialog.showMessageBoxSync({ type: 'error', title: 'Erreur', message: 'Impossible de démarrer le serveur. L\'application va se fermer.' });
        app.exit(1);
        return;
      }
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
ipcMain.handle('test-db-connection', async (_e, dbUrl) => {
  if (!backendRunner) return { ok: false, error: 'Backend runner non initialisé' };
  try {
    await backendRunner.testMySQLConnection(dbUrl);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e.message || String(e) };
  }
});
ipcMain.handle('get-server-url', () => {
  const c = loadConfig();
  if (c.mode === 'client') return c.server_url;
  return `http://localhost:${c.port || 3001}`;
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

app.on('before-quit', () => {
  app.isQuitting = true;
  if (backendRunner) backendRunner.stop();
});

process.on('SIGTERM', () => {
  if (backendRunner) backendRunner.stop();
  app.quit();
});

process.on('exit', () => {
  if (backendRunner) backendRunner.stop();
});

app.on('window-all-closed', (e) => {
  e.preventDefault();
});
