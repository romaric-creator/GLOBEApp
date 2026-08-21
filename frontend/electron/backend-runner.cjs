const { spawn, execFileSync } = require('child_process');
const path = require('path');
const fs = require('fs');
const os = require('os');
const http = require('http');
const net = require('net');

class BackendRunner {
  constructor(emit) {
    this.emit = emit;
    this.backendProcess = null;
    this.backendDir = this.getBackendDir();
  }

  getBackendDir() {
    const { app } = require('electron');
    if (!app.isPackaged) {
      return path.join(__dirname, '..', '..', 'backend');
    }
    return path.join(process.resourcesPath, 'backend');
  }

  getNodeExe() {
    return process.execPath;
  }

  getExecEnv(extra = {}) {
    return { ...process.env, ELECTRON_RUN_AS_NODE: '1', ...extra };
  }

  async checkPort(port) {
    return new Promise((resolve) => {
      const server = net.createServer();
      server.once('error', () => resolve(false));
      server.once('listening', () => { server.close(); resolve(true); });
      server.listen(port, '127.0.0.1');
    });
  }

  isPackaged() {
    const { app } = require('electron');
    return app.isPackaged;
  }

  parseDbUrl(dbUrl) {
    const match = dbUrl.match(/^mysql:\/\/([^:]+):([^@]*)@([^:]+):(\d+)\/(.+)$/);
    if (!match) return null;
    return { user: match[1], pass: match[2], host: match[3], port: match[4], dbName: match[5] };
  }

  async testMySQLConnection(dbUrl) {
    this.emit('splash-detail', 'Test de connexion à MySQL...');
    try {
      const nodeExe = this.getNodeExe();
      const parsed = this.parseDbUrl(dbUrl);

      // Step 1: Test MySQL server reachability (without specific database)
      const baseUrl = parsed
        ? `mysql://${parsed.user}:${parsed.pass}@${parsed.host}:${parsed.port}/mysql`
        : dbUrl;

      const testScript = [
        "const{PrismaClient}=require('@prisma/client');",
        "const p=new PrismaClient({datasources:{db:{url:process.env.DATABASE_URL}}});",
        "p.$queryRaw`SELECT 1`.then(()=>{console.log('ok');process.exit(0)})",
        ".catch(e=>{console.error(e.message);process.exit(1)})"
      ].join('');

      const tmpFile = path.join(os.tmpdir(), 'globe-db-test.js');

      // Check prisma client exists
      const mainEntry = path.join(this.backendDir, 'node_modules', '.prisma', 'client', 'index.js');
      if (!fs.existsSync(mainEntry)) {
        if (this.isPackaged()) {
          throw new Error('Client Prisma manquant. Réinstallez l\'application.');
        }
        await this.runPrismaGenerate(dbUrl);
      }

      // Test connection to MySQL server (using system 'mysql' db)
      fs.writeFileSync(tmpFile, testScript);
      const baseResult = execFileSync(nodeExe, [tmpFile], {
        cwd: this.backendDir,
        encoding: 'utf-8',
        timeout: 15000,
        env: this.getExecEnv({
          DATABASE_URL: baseUrl,
          NODE_PATH: path.join(this.backendDir, 'node_modules'),
        }),
      });
      if (baseResult.trim() !== 'ok') {
        throw new Error('Impossible de se connecter au serveur MySQL');
      }
      this.emit('splash-detail', 'Serveur MySQL accessible.');

      // Step 2: Create database if it doesn't exist
      if (parsed) {
        this.emit('splash-detail', `Vérification de la base "${parsed.dbName}"...`);
        const createScript = [
          "const{PrismaClient}=require('@prisma/client');",
          "const p=new PrismaClient({datasources:{db:{url:process.env.DATABASE_URL}}});",
          "p.$executeRawUnsafe('CREATE DATABASE IF NOT EXISTS `" + parsed.dbName + "`')",
          ".then(()=>{console.log('ok');process.exit(0)})",
          ".catch(e=>{console.error(e.message);process.exit(1)})"
        ].join('');
        fs.writeFileSync(tmpFile, createScript);
        try {
          execFileSync(nodeExe, [tmpFile], {
            cwd: this.backendDir,
            encoding: 'utf-8',
            timeout: 15000,
            env: this.getExecEnv({
              DATABASE_URL: baseUrl,
              NODE_PATH: path.join(this.backendDir, 'node_modules'),
            }),
          });
          this.emit('splash-detail', `Base "${parsed.dbName}" prête.`);
        } catch (e) {
          this.emit('splash-detail', `Impossible de créer la base: ${e.stderr || e.message}`);
        }
      }

      // Step 3: Verify connection to the target database
      fs.writeFileSync(tmpFile, testScript);
      const result = execFileSync(nodeExe, [tmpFile], {
        cwd: this.backendDir,
        encoding: 'utf-8',
        timeout: 15000,
        env: this.getExecEnv({
          DATABASE_URL: dbUrl,
          NODE_PATH: path.join(this.backendDir, 'node_modules'),
        }),
      });
      try { fs.unlinkSync(tmpFile); } catch {}
      return result.trim() === 'ok';
    } catch (e) {
      const stderr = e.stderr ? e.stderr.toString().trim() : '';
      const errorMsg = stderr || e.message || String(e);
      this.emit('splash-detail', `MySQL inaccessible: ${errorMsg}`);
      throw new Error(errorMsg);
    }
  }

  getPrismaCommand() {
    const nodeExe = this.getNodeExe();
    const prismaJs = path.join(this.backendDir, 'node_modules', 'prisma', 'build', 'index.js');
    if (fs.existsSync(prismaJs)) {
      return { exe: nodeExe, prefix: [prismaJs] };
    }
    const ext = process.platform === 'win32' ? '.cmd' : '';
    const prismaCli = path.join(this.backendDir, 'node_modules', '.bin', `prisma${ext}`);
    return { exe: prismaCli, prefix: [] };
  }

  async runPrismaGenerate(dbUrl) {
    if (this.isPackaged()) {
      this.emit('splash-detail', 'Client Prisma manquant (app packagee, écriture impossible).');
      return;
    }
    this.emit('splash-detail', 'Génération du client Prisma...');
    try {
      const { exe, prefix } = this.getPrismaCommand();
      execFileSync(exe, [...prefix, 'generate'], {
        cwd: this.backendDir,
        encoding: 'utf-8',
        timeout: 30000,
        env: this.getExecEnv({ DATABASE_URL: dbUrl }),
      });
    } catch (e) {
      this.emit('splash-detail', `Erreur prisma generate: ${e.message}`);
    }
  }

  async runMigrations(dbUrl) {
    this.emit('splash-status', 'Mise à jour de la base de données...');
    this.emit('splash-detail', 'Application du schéma Prisma...');
    try {
      const { exe, prefix } = this.getPrismaCommand();
      execFileSync(exe, [...prefix, 'db', 'push', '--skip-generate'], {
        cwd: this.backendDir,
        encoding: 'utf-8',
        timeout: 60000,
        env: this.getExecEnv({
          DATABASE_URL: dbUrl,
          NODE_PATH: path.join(this.backendDir, 'node_modules'),
        }),
      });
      this.emit('splash-detail', 'Schéma appliqué avec succès.');
      return true;
    } catch (e) {
      this.emit('splash-detail', `Erreur migration: ${e.message}`);
      this.emit('splash-status', 'Erreur lors de la mise à jour de la base de données.');
      return false;
    }
  }

  async runSeed(dbUrl) {
    this.emit('splash-detail', 'Vérification des données initiales...');
    try {
      if (this.isPackaged()) {
        const seedFile = path.join(this.backendDir, 'dist', 'prisma', 'seed.js');
        if (!fs.existsSync(seedFile)) {
          this.emit('splash-detail', 'Fichier seed.js absent, étape ignorée.');
          return;
        }
        const nodeExe = this.getNodeExe();
        execFileSync(nodeExe, [seedFile], {
          cwd: this.backendDir,
          encoding: 'utf-8',
          timeout: 30000,
          env: this.getExecEnv({
            DATABASE_URL: dbUrl,
            NODE_PATH: path.join(this.backendDir, 'node_modules'),
          }),
        });
      } else {
        const { exe, prefix } = this.getPrismaCommand();
        execFileSync(exe, [...prefix, 'db', 'seed'], {
          cwd: this.backendDir,
          encoding: 'utf-8',
          timeout: 30000,
          env: this.getExecEnv({ DATABASE_URL: dbUrl }),
        });
      }
      this.emit('splash-detail', 'Données initiales vérifiées.');
    } catch (e) {
      this.emit('splash-detail', `Seed: ${e.message}`);
    }
  }

  async start(config) {
    const port = config.port || 3001;
    const dbUrl = config.database_url;

    const portFree = await this.checkPort(port);
    if (!portFree) {
      this.emit('splash-status', `Le port ${port} est déjà utilisé.`);
      this.emit('splash-detail', `Port ${port} occupé — un autre serveur tourne peut-être déjà.`);
      return false;
    }
    this.emit('splash-detail', `Port ${port} disponible.`);

    // Test MySQL connection
    this.emit('splash-status', 'Connexion à la base de données...');
    try {
      const mysqlOk = await this.testMySQLConnection(dbUrl);
      if (!mysqlOk) {
        this.emit('splash-status', 'Impossible de se connecter à MySQL. Vérifiez que MySQL est démarré.');
        return false;
      }
    } catch {
      this.emit('splash-status', 'Impossible de se connecter à MySQL. Vérifiez que MySQL est démarré.');
      return false;
    }
    this.emit('splash-detail', 'Connexion MySQL établie.');

    // Run migrations
    const migOk = await this.runMigrations(dbUrl);
    if (!migOk) return false;

    // Run seed
    await this.runSeed(dbUrl);

    // Start backend
    this.emit('splash-status', 'Démarrage du serveur...');
    this.emit('splash-detail', 'Lancement du backend NestJS...');

    const mainFile = path.join(this.backendDir, 'dist', 'src', 'main.js');
    if (!fs.existsSync(mainFile)) {
      this.emit('splash-status', 'Fichier backend introuvable. Réinstallez l\'application.');
      this.emit('splash-detail', `Fichier manquant: ${mainFile}`);
      return false;
    }

    const nodeExe = this.getNodeExe();
    this.backendProcess = spawn(nodeExe, [mainFile], {
      cwd: this.backendDir,
      env: this.getExecEnv({
        NODE_ENV: 'production',
        DATABASE_URL: dbUrl,
        JWT_SECRET: config.jwt_secret || 'globe-jwt-secret-change-in-production',
        JWT_EXPIRES_IN: '1h',
        JWT_REFRESH_EXPIRES_IN: '7d',
        PORT: String(port),
        ALLOWED_ORIGINS: config.allowed_origins || '',
        SYNC_REMOTE_URL: config.sync_remote_url || '',
        SYNC_API_KEY: config.sync_api_key || '',
        NODE_PATH: path.join(this.backendDir, 'node_modules'),
      }),
      stdio: ['ignore', 'pipe', 'pipe'],
      windowsHide: true,
    });

    this.backendProcess.stdout.on('data', (data) => {
      const lines = data.toString().split('\n').filter((l) => l.trim());
      lines.forEach((line) => this.emit('splash-detail', line));
    });

    this.backendProcess.stderr.on('data', (data) => {
      const lines = data.toString().split('\n').filter((l) => l.trim());
      lines.forEach((line) => this.emit('splash-detail', `[err] ${line}`));
    });

    this.backendProcess.on('exit', (code) => {
      if (code !== 0 && code !== null) {
        this.emit('splash-detail', `Backend arrêté (code ${code})`);
      }
      this.backendProcess = null;
    });

    // Wait for backend to be ready
    const healthUrl = `http://localhost:${port}/api/health`;
    const ready = await this.waitForBackend(healthUrl, 60);
    if (!ready) {
      this.emit('splash-status', 'Le serveur ne démarre pas. Consultez les logs.');
      return false;
    }

    this.emit('splash-detail', 'Serveur prêt.');
    return true;
  }

  async waitForBackend(url, timeoutSecs) {
    const deadline = Date.now() + timeoutSecs * 1000;
    let attempt = 0;

    while (Date.now() < deadline) {
      attempt++;
      const ok = await this.healthCheck(url);
      if (ok) {
        this.emit('splash-detail', `Serveur prêt (tentative ${attempt})`);
        return true;
      }

      if (attempt <= 3 || attempt % 5 === 0) {
        this.emit('splash-detail', `Attente du serveur (tentative ${attempt})...`);
      }

      await new Promise((r) => setTimeout(r, 1000));
    }

    this.emit('splash-detail', `Timeout après ${attempt} tentatives`);
    return false;
  }

  healthCheck(url) {
    return new Promise((resolve) => {
      const req = http.get(url, { timeout: 3000 }, (res) => {
        resolve(res.statusCode === 200);
        res.resume();
      });
      req.on('error', () => resolve(false));
      req.on('timeout', () => { req.destroy(); resolve(false); });
    });
  }

  stop() {
    if (!this.backendProcess) return;
    const proc = this.backendProcess;
    this.backendProcess = null;
    if (process.platform === 'win32') {
      proc.kill();
    } else {
      proc.kill('SIGTERM');
      setTimeout(() => { try { proc.kill('SIGKILL'); } catch {} }, 5000);
    }
  }
}

module.exports = { BackendRunner };
