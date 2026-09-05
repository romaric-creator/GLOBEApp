const { app, BrowserWindow, ipcMain, Tray, Menu, dialog, session, shell } = require('electron');
const path = require('path');
const fs = require('fs');
const http = require('http');
const { BackendRunner } = require('./backend-runner.cjs');
const { loadConfig, saveConfig, resetConfig } = require('./config.cjs');

// File logger — writes all init messages to userData/startup.log
let _logPath = null;
function getLogPath() {
  if (!_logPath) _logPath = path.join(app.getPath('userData'), 'startup.log');
  return _logPath;
}
function writeLog(level, msg) {
  try {
    const line = `[${new Date().toISOString()}] [${level}] ${msg}\n`;
    fs.appendFileSync(getLogPath(), line);
  } catch {}
}

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
    width: 520,
    height: 340,
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
  if (channel === 'splash-status' || channel === 'splash-detail') {
    writeLog(channel === 'splash-status' ? 'STATUS' : 'DETAIL', String(data ?? ''));
  }
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
  writeLog('STATUS', `=== GLOBE Manager v${app.getVersion()} startup ===`);
  writeLog('STATUS', `userData: ${app.getPath('userData')}`);
  writeLog('STATUS', `platform: ${process.platform} / arch: ${process.arch}`);
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
  return `http://localhost:${c.port || 3001}`;
});
ipcMain.handle('get-version', () => app.getVersion());
ipcMain.handle('get-log-path', () => getLogPath());
ipcMain.handle('get-log-content', () => {
  try { return fs.readFileSync(getLogPath(), 'utf-8'); } catch { return ''; }
});
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

ipcMain.handle('preview-ticket', (_e, html) => {
  const tmpFile = path.join(app.getPath('temp'), `globe-preview-${Date.now()}.html`);
  const toolbar = `<style>
    #_preview_bar { position:fixed;top:0;left:0;right:0;background:#1a1a1a;padding:6px 10px;
      display:flex;justify-content:space-between;align-items:center;z-index:9999;font-family:sans-serif; }
    #_preview_bar span { color:#C9A84C;font-weight:bold;font-size:12px; }
    #_preview_bar button { background:#C9A84C;color:#000;border:none;padding:4px 14px;
      font-weight:bold;cursor:pointer;border-radius:3px;font-size:11px; }
    body { padding-top: 36px !important; }
    @media print { #_preview_bar { display:none; } body { padding-top:0 !important; } }
  </style>
  <div id="_preview_bar">
    <span>Apercu ticket</span>
    <button onclick="window.print()">Imprimer</button>
  </div>`;
  // Supprimer l'auto-print et injecter la barre
  const previewHtml = html
    .replace(/<script>window\.onload[^<]*<\/script>/g, '')
    .replace('</body>', toolbar + '\n</body>');
  try { fs.writeFileSync(tmpFile, previewHtml, 'utf-8'); } catch (e) {
    return { ok: false, error: String(e) };
  }
  const win = new BrowserWindow({
    show: true,
    width: 380,
    height: 680,
    minWidth: 320,
    title: 'Apercu ticket',
    webPreferences: { contextIsolation: true },
  });
  win.setMenu(null);
  win.loadFile(tmpFile);
  win.webContents.once('did-finish-load', () => {
    try { fs.unlinkSync(tmpFile); } catch {}
  });
  return { ok: true };
});

ipcMain.handle('get-printers', async () => {
  try {
    if (!mainWindow) return [];
    const printers = await mainWindow.webContents.getPrintersAsync();
    return printers.map((p) => ({ name: p.name, displayName: p.displayName || p.name, isDefault: p.isDefault }));
  } catch { return []; }
});

// ─── ESC/POS helpers ──────────────────────────────────────────────────────────

async function htmlToEscposBuffer(html) {
  const net_module = require('net'); // eslint-disable-line
  const stripped = html
    .replace(/<script>window\.onload[^<]*<\/script>/g, '')
    // Force la largeur à 100% pour remplir les 576px de la fenêtre de capture
    .replace('width: 80mm', 'width: 100%');

  const WIN_W = 576; // 80mm à ~180 DPI sur thermique 203 DPI
  const WIN_H = 3000;

  const tmpFile = path.join(app.getPath('temp'), `globe-escpos-${Date.now()}.html`);
  fs.writeFileSync(tmpFile, stripped, 'utf-8');

  return new Promise((resolve, reject) => {
    const win = new BrowserWindow({
      show: false,
      width: WIN_W,
      height: WIN_H,
      webPreferences: { offscreen: true, contextIsolation: true },
    });

    const cleanup = () => {
      try { win.close(); } catch {}
      try { fs.unlinkSync(tmpFile); } catch {}
    };

    win.loadFile(tmpFile);

    win.webContents.once('did-finish-load', async () => {
      try {
        // Attendre le rendu complet
        await new Promise((r) => setTimeout(r, 250));

        const image = await win.webContents.capturePage({ x: 0, y: 0, width: WIN_W, height: WIN_H });
        const { width, height } = image.getSize();
        const bitmap = image.getBitmap(); // Buffer RGBA, 4 bytes/pixel
        cleanup();

        const bytesPerLine = Math.ceil(width / 8);
        const lines = [];

        for (let y = 0; y < height; y++) {
          const line = Buffer.alloc(bytesPerLine, 0x00);
          for (let x = 0; x < width; x++) {
            const i = (y * width + x) * 4;
            const lum = 0.299 * bitmap[i] + 0.587 * bitmap[i + 1] + 0.114 * bitmap[i + 2];
            if (lum < 200) line[Math.floor(x / 8)] |= (0x80 >> (x % 8));
          }
          lines.push(line);
        }

        // Supprimer les lignes blanches de fin
        while (lines.length > 0 && lines[lines.length - 1].every((b) => b === 0)) lines.pop();

        const nLines = lines.length;
        const xL = bytesPerLine & 0xff;
        const xH = (bytesPerLine >> 8) & 0xff;
        const yL = nLines & 0xff;
        const yH = (nLines >> 8) & 0xff;

        resolve(Buffer.concat([
          Buffer.from([0x1b, 0x40]),               // ESC @ — init
          Buffer.from([0x1b, 0x61, 0x00]),          // ESC a 0 — align left
          Buffer.from([0x1d, 0x76, 0x30, 0x00, xL, xH, yL, yH]), // GS v 0 — raster image
          Buffer.concat(lines),
          Buffer.from([0x0a, 0x0a, 0x0a]),          // 3 line feeds
          Buffer.from([0x1d, 0x56, 0x42, 0x00]),    // GS V B — coupe partielle
        ]));
      } catch (e) {
        cleanup();
        reject(e);
      }
    });

    win.webContents.once('did-fail-load', () => { cleanup(); reject(new Error('Erreur HTML→ESC/POS')); });
  });
}

function sendTcp(host, port, data) {
  const net = require('net');
  return new Promise((resolve, reject) => {
    const client = net.createConnection({ host, port: Number(port) });
    client.setTimeout(15000);
    client.once('connect', () => client.write(data, (e) => { if (e) { client.destroy(); reject(e); } else client.end(); }));
    client.once('close', () => resolve());
    client.once('error', reject);
    client.once('timeout', () => { client.destroy(); reject(new Error('TCP timeout (15s)')); });
  });
}

// ─── Handlers impression ──────────────────────────────────────────────────────

ipcMain.handle('print-ticket', (_e, html) => {
  const config = loadConfig();

  // Mode ESC/POS TCP (imprimante virtuelle ou réseau)
  if (config.printer_mode === 'escpos' && config.escpos_host) {
    return htmlToEscposBuffer(html)
      .then((data) => sendTcp(config.escpos_host, config.escpos_port || 9444, data))
      .then(() => ({ ok: true }))
      .catch((e) => ({ ok: false, error: e.message || String(e) }));
  }

  // Mode GDI (driver Windows)
  const printerName = config.printer_name || '';
  return new Promise((resolve) => {
    const tmpFile = path.join(app.getPath('temp'), `globe-ticket-${Date.now()}.html`);
    try {
      fs.writeFileSync(tmpFile, html, 'utf-8');
    } catch (e) {
      resolve({ ok: false, error: 'Impossible de créer le fichier temporaire' });
      return;
    }
    // 302px ≈ 80mm at 96dpi — force la largeur du layout au format ticket
    const win = new BrowserWindow({
      show: false,
      width: 302,
      height: 800,
      webPreferences: { contextIsolation: true },
    });
    const cleanup = () => {
      try { win.close(); } catch {}
      try { fs.unlinkSync(tmpFile); } catch {}
    };
    win.loadFile(tmpFile);
    win.webContents.once('did-finish-load', () => {
      win.webContents.print(
        {
          silent: true,
          printBackground: false,
          margins: { marginType: 'none' },
          // 80mm × 2970mm — hauteur généreuse pour tout ticket thermique
          pageSize: { width: 80000, height: 2970000 },
          scaleFactor: 100,
          ...(printerName ? { deviceName: printerName } : {}),
        },
        (success, reason) => {
          cleanup();
          resolve({ ok: success, error: reason || null });
        },
      );
    });
    win.webContents.once('did-fail-load', () => {
      cleanup();
      resolve({ ok: false, error: 'Erreur de chargement du ticket' });
    });
  });
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
