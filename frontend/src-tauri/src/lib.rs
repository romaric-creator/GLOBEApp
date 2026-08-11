use serde::{Deserialize, Serialize};
use std::process::Command;
use std::sync::{Arc, Condvar, Mutex};
use std::time::{Duration, Instant};
use tauri::{Emitter, Manager};

// ─── Configuration ────────────────────────────────────────────────────────────

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct AppConfig {
    pub mode: String,               // "server" | "client"
    pub server_url: Option<String>,
    pub configured: bool,
}

impl Default for AppConfig {
    fn default() -> Self {
        AppConfig { mode: "server".to_string(), server_url: None, configured: false }
    }
}

struct SetupState {
    config: Mutex<Option<AppConfig>>,
    condvar: Condvar,
}

// ─── Environnement Docker (découverte au démarrage) ───────────────────────────

#[derive(Clone)]
struct DockerEnv {
    docker: std::path::PathBuf,
    compose: ComposeCmd,
}

#[derive(Clone)]
struct ComposeCmd {
    program: std::path::PathBuf,
    subcommand: Option<String>, // Some("compose") v2, None = binaire docker-compose v1
}

impl ComposeCmd {
    fn build(&self) -> Command {
        let mut c = Command::new(&self.program);
        if let Some(sub) = &self.subcommand {
            c.arg(sub);
        }
        c
    }
}

impl DockerEnv {
    fn discover() -> Self {
        let docker = find_docker_binary();
        let compose = detect_compose(&docker);
        DockerEnv { docker, compose }
    }
}

/// Cherche le binaire docker dans PATH puis dans les chemins d'installation connus.
fn find_docker_binary() -> std::path::PathBuf {
    if cmd_ok("docker", &["--version"]) {
        return "docker".into();
    }
    #[cfg(target_os = "windows")]
    {
        let mut candidates = vec![
            r"C:\Program Files\Docker\Docker\resources\bin\docker.exe".to_string(),
        ];
        if let Ok(local) = std::env::var("LOCALAPPDATA") {
            candidates.push(format!(r"{local}\Docker\Docker\resources\bin\docker.exe"));
        }
        if let Ok(prog) = std::env::var("PROGRAMFILES") {
            candidates.push(format!(r"{prog}\Docker\Docker\resources\bin\docker.exe"));
        }
        for path in &candidates {
            if std::path::Path::new(path).exists() && cmd_ok(path, &["--version"]) {
                return path.into();
            }
        }
    }
    #[cfg(target_os = "linux")]
    {
        for path in &["/usr/bin/docker", "/usr/local/bin/docker", "/snap/bin/docker"] {
            if cmd_ok(*path, &["--version"]) {
                return (*path).into();
            }
        }
    }
    "docker".into()
}

/// Détecte Docker Compose v2 (plugin) ou v1 (binaire séparé).
fn detect_compose(docker: &std::path::Path) -> ComposeCmd {
    if cmd_ok(docker, &["compose", "version"]) {
        return ComposeCmd { program: docker.to_path_buf(), subcommand: Some("compose".into()) };
    }
    for v1 in &["docker-compose", "/usr/local/bin/docker-compose", "/usr/bin/docker-compose"] {
        if cmd_ok(*v1, &["version"]) {
            return ComposeCmd { program: (*v1).into(), subcommand: None };
        }
    }
    // Fallback v2 (échouera avec un message clair si absent)
    ComposeCmd { program: docker.to_path_buf(), subcommand: Some("compose".into()) }
}

/// Lance une commande, retourne true si exit code 0 (stdout/stderr supprimés).
fn cmd_ok(program: impl AsRef<std::ffi::OsStr>, args: &[&str]) -> bool {
    Command::new(program)
        .args(args)
        .stdout(std::process::Stdio::null())
        .stderr(std::process::Stdio::null())
        .status()
        .map(|s| s.success())
        .unwrap_or(false)
}

/// Lance `docker info` avec un timeout de 5 s pour éviter tout blocage.
fn docker_is_running(docker: &std::path::Path) -> bool {
    let mut child = match Command::new(docker)
        .arg("info")
        .stdout(std::process::Stdio::null())
        .stderr(std::process::Stdio::null())
        .spawn()
    {
        Ok(c) => c,
        Err(_) => return false,
    };
    let deadline = Instant::now() + Duration::from_secs(5);
    loop {
        match child.try_wait() {
            Ok(Some(s)) => return s.success(),
            Ok(None) if Instant::now() < deadline => {
                std::thread::sleep(Duration::from_millis(100));
            }
            _ => {
                child.kill().ok();
                return false;
            }
        }
    }
}

// ─── États Docker ─────────────────────────────────────────────────────────────

#[derive(Debug, PartialEq)]
enum DockerStatus {
    Running,
    InstalledNotRunning,
    NotInstalled,
}

fn check_docker(docker: &std::path::Path) -> DockerStatus {
    let installed = cmd_ok(docker, &["--version"]);
    if !installed {
        return DockerStatus::NotInstalled;
    }
    if docker_is_running(docker) {
        DockerStatus::Running
    } else {
        DockerStatus::InstalledNotRunning
    }
}

fn ensure_docker_running(app: &tauri::AppHandle, env: &DockerEnv) -> bool {
    match check_docker(&env.docker) {
        DockerStatus::Running => {
            true
        }
        DockerStatus::InstalledNotRunning => {
            emit_splash_status(app, "Démarrage de l'environnement...");
            start_docker_service(app, &env.docker);
            if wait_for_docker(app, &env.docker, 90) {
                true
            } else {
                emit_splash_status(app, "L'environnement ne répond pas. Relancez l'application.");
                std::thread::sleep(Duration::from_secs(5));
                false
            }
        }
        DockerStatus::NotInstalled => {
            emit_splash_status(app, "Docker n'est pas installé. Installez-le puis relancez GLOBE Manager.");
            // Ouvrir la page de téléchargement dans le navigateur
            #[cfg(target_os = "linux")]
            {
                Command::new("xdg-open")
                    .arg("https://docs.docker.com/engine/install/")
                    .spawn()
                    .ok();
            }
            #[cfg(target_os = "windows")]
            {
                Command::new("explorer")
                    .arg("https://docs.docker.com/desktop/install/windows-install/")
                    .spawn()
                    .ok();
            }
            std::thread::sleep(Duration::from_secs(10));
            false
        }
    }
}

fn wait_for_docker(app: &tauri::AppHandle, docker: &std::path::Path, timeout_secs: u64) -> bool {
    let deadline = Instant::now() + Duration::from_secs(timeout_secs);
    let mut elapsed = 0u64;
    while Instant::now() < deadline {
        if docker_is_running(docker) {
            return true;
        }
        std::thread::sleep(Duration::from_secs(3));
        elapsed += 3;
        if elapsed % 15 == 0 {
            emit_splash_status(app, "Démarrage de l'environnement...");
        }
    }
    false
}

// ── Démarrage du service ──────────────────────────────────────────────────────

#[cfg(target_os = "windows")]
fn start_docker_service(_app: &tauri::AppHandle, _docker: &std::path::Path) {
    let candidates = [
        r"C:\Program Files\Docker\Docker\Docker Desktop.exe".to_string(),
        std::env::var("LOCALAPPDATA")
            .map(|a| format!(r"{a}\Docker\Docker\Docker Desktop.exe"))
            .unwrap_or_default(),
    ];
    for path in candidates.iter().filter(|p| !p.is_empty()) {
        if std::path::Path::new(path).exists() {
            Command::new(path).spawn().ok();
            return;
        }
    }
    // Fallback via PowerShell (plus fiable que cmd /C start)
    Command::new("powershell")
        .args(["-NoProfile", "-Command", "Start-Process 'Docker Desktop'"])
        .spawn()
        .ok();
}

#[cfg(target_os = "linux")]
fn start_docker_service(_app: &tauri::AppHandle, _docker: &std::path::Path) {
    // Docker Desktop (systemd --user)
    Command::new("systemctl").args(["--user", "start", "docker-desktop"]).output().ok();
    // Docker Engine (systemd système, init.d, service)
    for args in &[
        vec!["systemctl", "start", "docker"],
        vec!["service", "docker", "start"],
        vec!["rc-service", "docker", "start"], // OpenRC
    ] {
        if Command::new(args[0]).args(&args[1..]).status()
            .map(|s| s.success()).unwrap_or(false) {
            return;
        }
    }
}

#[cfg(not(any(target_os = "windows", target_os = "linux")))]
fn start_docker_service(_app: &tauri::AppHandle, _docker: &std::path::Path) {}

// ─── Docker Compose ───────────────────────────────────────────────────────────

const COMPOSE_CONTENT: &str = include_str!("../../../docker-compose.yml");

fn get_compose_dir() -> Result<std::path::PathBuf, String> {
    let dir = if let Ok(appdata) = std::env::var("APPDATA") {
        std::path::PathBuf::from(appdata).join("GlobeManager")
    } else if let Ok(home) = std::env::var("HOME") {
        std::path::PathBuf::from(home).join(".config").join("GlobeManager")
    } else {
        std::env::current_dir().unwrap_or_else(|_| std::path::PathBuf::from("."))
    };

    std::fs::create_dir_all(&dir)
        .map_err(|e| format!("Impossible de créer le dossier de configuration: {e}"))?;
    std::fs::write(dir.join("docker-compose.yml"), COMPOSE_CONTENT)
        .map_err(|e| format!("Impossible d'écrire docker-compose.yml: {e}"))?;
    Ok(dir)
}

/// Vérifie si un port est disponible. Retourne false si le port est déjà occupé
/// par un processus autre que nos propres conteneurs Docker.
fn check_port(port: u16) -> bool {
    std::net::TcpListener::bind(std::net::SocketAddr::from(([0, 0, 0, 0], port))).is_ok()
}

fn images_already_pulled(env: &DockerEnv) -> bool {
    // Vérifie si au moins une image de l'app est déjà présente localement
    Command::new(&env.docker)
        .args(["images", "-q", "--filter", "reference=*globe*"])
        .output()
        .map(|o| !o.stdout.is_empty())
        .unwrap_or(true) // en cas d'erreur, on suppose que c'est ok
}

fn docker_compose_up_with_log(
    app: &tauri::AppHandle,
    env: &DockerEnv,
    compose_dir: &std::path::Path,
) -> bool {
    let first_pull = !images_already_pulled(env);
    if first_pull {
        emit_splash_status(app, "Téléchargement des services (première installation, peut prendre 5 à 15 min)...");
    } else {
        emit_splash_status(app, "Démarrage des services...");
    }

    let mut child = match env.compose.build()
        .args(["up", "-d", "--remove-orphans"])
        .current_dir(compose_dir)
        .stdout(std::process::Stdio::null())
        .stderr(std::process::Stdio::null())
        .spawn()
    {
        Ok(c) => c,
        Err(e) => {
            emit_splash_status(app, &format!("Impossible de démarrer les services: {e}"));
            return false;
        }
    };

    let start = Instant::now();
    let mut last_update = Instant::now();

    loop {
        match child.try_wait() {
            Ok(Some(status)) => return status.success(),
            Ok(None) => {
                std::thread::sleep(Duration::from_secs(2));
                let elapsed = start.elapsed().as_secs();

                // Mise à jour du message toutes les 20 secondes
                if last_update.elapsed() >= Duration::from_secs(20) {
                    last_update = Instant::now();
                    let msg = if first_pull {
                        match elapsed {
                            0..=60   => "Téléchargement des services en cours...",
                            61..=180 => "Téléchargement en cours (peut prendre quelques minutes)...",
                            181..=360 => "Téléchargement en cours (merci de patienter)...",
                            _        => "Finalisation de l'installation...",
                        }
                    } else {
                        "Démarrage des services..."
                    };
                    emit_splash_status(app, msg);
                }

                // Timeout 20 min (premier pull d'images sur connexion lente)
                if elapsed > 1200 {
                    child.kill().ok();
                    return false;
                }
            }
            Err(_) => {
                child.kill().ok();
                return false;
            }
        }
    }
}

fn wait_for_backend(app: &tauri::AppHandle, url: &str, timeout_secs: u64) -> bool {
    let deadline = Instant::now() + Duration::from_secs(timeout_secs);
    let start = Instant::now();
    let mut last_update = Instant::now();

    while Instant::now() < deadline {
        match ureq::get(url).call() {
            Ok(resp) if resp.status() == 200 => return true,
            _ => {}
        }
        std::thread::sleep(Duration::from_secs(2));

        if last_update.elapsed() >= Duration::from_secs(15) {
            last_update = Instant::now();
            let elapsed = start.elapsed().as_secs();
            let msg = match elapsed {
                0..=30  => "Chargement des données...",
                31..=90 => "Finalisation du démarrage...",
                _       => "Presque prêt, encore quelques instants...",
            };
            emit_splash_status(app, msg);
        }
    }
    false
}

// ─── Helpers config ───────────────────────────────────────────────────────────

fn config_file_path() -> std::path::PathBuf {
    if let Ok(appdata) = std::env::var("APPDATA") {
        let dir = std::path::PathBuf::from(appdata).join("GlobeManager");
        std::fs::create_dir_all(&dir).ok();
        return dir.join("config.json");
    }
    if let Ok(home) = std::env::var("HOME") {
        let dir = std::path::PathBuf::from(home).join(".config").join("GlobeManager");
        std::fs::create_dir_all(&dir).ok();
        return dir.join("config.json");
    }
    std::path::PathBuf::from("config.json")
}

fn load_config() -> AppConfig {
    let path = config_file_path();
    if let Ok(content) = std::fs::read_to_string(&path) {
        if let Ok(cfg) = serde_json::from_str::<AppConfig>(&content) {
            return cfg;
        }
    }
    AppConfig::default()
}

fn write_config(config: &AppConfig) -> bool {
    let path = config_file_path();
    match serde_json::to_string_pretty(config) {
        Ok(json) => std::fs::write(path, json).is_ok(),
        Err(_) => false,
    }
}

// ─── Commandes Tauri ──────────────────────────────────────────────────────────

#[tauri::command]
fn get_config() -> AppConfig { load_config() }

#[tauri::command]
fn get_server_url() -> Option<String> {
    let c = load_config();
    if c.mode == "client" { c.server_url } else { None }
}

#[tauri::command]
fn save_config(config: AppConfig, state: tauri::State<Arc<SetupState>>) -> bool {
    if write_config(&config) {
        let mut lock = state.config.lock().unwrap();
        *lock = Some(config);
        state.condvar.notify_all();
        true
    } else {
        false
    }
}

#[tauri::command]
fn reset_config() -> bool {
    std::fs::remove_file(config_file_path()).is_ok()
}

#[tauri::command]
fn autostart_enable(app: tauri::AppHandle) -> bool {
    use tauri_plugin_autostart::ManagerExt;
    app.autolaunch().enable().is_ok()
}

#[tauri::command]
fn autostart_disable(app: tauri::AppHandle) -> bool {
    use tauri_plugin_autostart::ManagerExt;
    app.autolaunch().disable().is_ok()
}

#[tauri::command]
fn autostart_is_enabled(app: tauri::AppHandle) -> bool {
    use tauri_plugin_autostart::ManagerExt;
    app.autolaunch().is_enabled().unwrap_or(false)
}

// ─── Point d'entrée ───────────────────────────────────────────────────────────

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let setup_state = Arc::new(SetupState {
        config: Mutex::new(None),
        condvar: Condvar::new(),
    });

    tauri::Builder::default()
        .manage(setup_state)
        .plugin(tauri_plugin_single_instance::init(|app, _args, _cwd| {
            if let Some(w) = app.get_webview_window("main") {
                let _ = w.show();
                let _ = w.set_focus();
            }
        }))
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_notification::init())
        .plugin(tauri_plugin_autostart::init(
            tauri_plugin_autostart::MacosLauncher::LaunchAgent,
            Some(vec![]),
        ))
        .invoke_handler(tauri::generate_handler![
            get_config,
            get_server_url,
            save_config,
            reset_config,
            autostart_enable,
            autostart_disable,
            autostart_is_enabled,
        ])
        .setup(|app| {
            let app_handle = app.handle().clone();

            std::thread::spawn(move || {
                std::thread::sleep(Duration::from_millis(200));

                if let Some(s) = app_handle.get_webview_window("splash") { let _ = s.show(); let _ = s.set_focus(); }
                if let Some(m) = app_handle.get_webview_window("main")   { let _ = m.hide(); }

                // Découvrir l'environnement Docker une seule fois
                let docker_env = DockerEnv::discover();

                // Attendre la configuration initiale si nécessaire
                let config = {
                    let loaded = load_config();
                    if !loaded.configured {
                        let _ = app_handle.emit("show-setup", ());
                        let state = app_handle.state::<Arc<SetupState>>();
                        let mut lock = state.config.lock().unwrap();
                        while lock.is_none() {
                            lock = state.condvar.wait(lock).unwrap();
                        }
                        lock.clone().unwrap()
                    } else {
                        loaded
                    }
                };

                let health_url = if config.mode == "server" {
                    // Préparer le dossier compose
                    let compose_dir = match get_compose_dir() {
                        Ok(d) => d,
                        Err(_) => {
                            emit_splash_status(&app_handle, "Une erreur est survenue. Relancez l'application.");
                            std::thread::sleep(Duration::from_secs(5));
                            show_main(&app_handle);
                            return;
                        }
                    };

                    emit_splash_status(&app_handle, "Préparation de l'environnement...");
                    if !ensure_docker_running(&app_handle, &docker_env) {
                        show_main(&app_handle);
                        return;
                    }

                    emit_splash_status(&app_handle, "Démarrage des services...");
                    let started = docker_compose_up_with_log(&app_handle, &docker_env, &compose_dir);
                    if !started {
                        emit_splash_status(&app_handle, "Un problème est survenu. Relancez l'application.");
                        std::thread::sleep(Duration::from_secs(3));
                    }

                    "http://localhost:3001/api/health".to_string()
                } else {
                    let base = config.server_url.as_deref()
                        .unwrap_or("http://localhost:3001")
                        .trim_end_matches('/')
                        .to_string();
                    emit_splash_status(&app_handle, &format!("Connexion au serveur {}...", base));
                    format!("{}/api/health", base)
                };

                emit_splash_status(&app_handle, "Chargement des données...");
                if !wait_for_backend(&app_handle, &health_url, 180) {
                    emit_splash_status(&app_handle, "Connexion impossible. Vérifiez le réseau et relancez.");
                    std::thread::sleep(Duration::from_secs(4));
                }

                show_main(&app_handle);
            });

            #[cfg(desktop)]
            {
                use tauri::menu::{Menu, MenuItem};
                use tauri::tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent};

                let quit = MenuItem::with_id(app, "quit", "Quitter", true, None::<&str>)?;
                let show = MenuItem::with_id(app, "show", "Afficher", true, None::<&str>)?;
                let menu = Menu::with_items(app, &[&show, &quit])?;

                TrayIconBuilder::new()
                    .icon(app.default_window_icon().unwrap().clone())
                    .menu(&menu)
                    .tooltip("GLOBE Manager")
                    .on_menu_event(|app, event| match event.id.as_ref() {
                        "quit" => {
                            let config = load_config();
                            if config.mode == "server" {
                                if let Ok(dir) = get_compose_dir() {
                                    let docker = find_docker_binary();
                                    let mut compose = detect_compose(&docker).build();
                                    compose.args(["stop"]).current_dir(&dir).output().ok();
                                }
                            }
                            app.exit(0);
                        }
                        "show" => {
                            if let Some(w) = app.get_webview_window("main") {
                                let _ = w.show();
                                let _ = w.set_focus();
                            }
                        }
                        _ => {}
                    })
                    .on_tray_icon_event(|tray, event| {
                        if let TrayIconEvent::Click {
                            button: MouseButton::Left,
                            button_state: MouseButtonState::Up,
                            ..
                        } = event {
                            if let Some(w) = tray.app_handle().get_webview_window("main") {
                                let _ = w.show();
                                let _ = w.set_focus();
                            }
                        }
                    })
                    .build(app)?;
            }
            Ok(())
        })
        .on_window_event(|window, event| {
            if let tauri::WindowEvent::CloseRequested { api, .. } = event {
                if window.label() == "main" {
                    window.hide().unwrap();
                    api.prevent_close();
                }
            }
        })
        .run(tauri::generate_context!())
        .expect("Erreur lors du démarrage de GLOBE Manager");
}

fn show_main(app: &tauri::AppHandle) {
    if let Some(m) = app.get_webview_window("main")   { let _ = m.show(); let _ = m.set_focus(); }
    if let Some(s) = app.get_webview_window("splash") { let _ = s.close(); }
}

fn emit_splash_status(app: &tauri::AppHandle, msg: &str) {
    let _ = app.emit("splash-status", msg);
    let _ = app.emit("app-log", msg);
}

fn emit_log(app: &tauri::AppHandle, msg: &str) {
    let _ = app.emit("app-log", msg);
}
