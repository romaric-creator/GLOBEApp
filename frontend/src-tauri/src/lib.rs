use std::process::Command;
use std::time::{Duration, Instant};
use tauri::{Emitter, Manager};

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_single_instance::init(|app, _args, _cwd| {
            if let Some(window) = app.get_webview_window("main") {
                let _ = window.show();
                let _ = window.set_focus();
            }
        }))
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_notification::init())
        .plugin(tauri_plugin_autostart::init(
            tauri_plugin_autostart::MacosLauncher::LaunchAgent,
            Some(vec![]),
        ))
        .setup(|app| {
            let app_handle = app.handle().clone();

            // Lancer Docker et attendre le backend dans un thread séparé
            std::thread::spawn(move || {
                // Laisser le temps à Tauri d'initialiser les fenêtres
                std::thread::sleep(Duration::from_millis(200));

                // Afficher la splash window
                if let Some(splash) = app_handle.get_webview_window("splash") {
                    let _ = splash.show();
                    let _ = splash.set_focus();
                }
                if let Some(main) = app_handle.get_webview_window("main") {
                    let _ = main.hide();
                }

                // Trouver le dossier de l'app pour docker-compose.yml
                let compose_dir = get_compose_dir();

                // Démarrer les conteneurs Docker
                emit_splash_status(&app_handle, "Démarrage des services...");
                let started = docker_compose_up_with_log(&app_handle, &compose_dir);

                if !started {
                    emit_splash_status(&app_handle, "Erreur Docker — vérifiez que Docker Desktop est lancé");
                    std::thread::sleep(Duration::from_secs(5));
                }

                // Attendre que le backend soit prêt (max 180s — MySQL start_period 30s + retries)
                emit_splash_status(&app_handle, "Chargement de GLOBE Manager...");
                let ready = wait_for_backend(&app_handle, "http://localhost:3001/api/health", 180);

                if !ready {
                    emit_splash_status(&app_handle, "Impossible de joindre le serveur après 3 min");
                    std::thread::sleep(Duration::from_secs(4));
                }

                // Afficher la fenêtre principale, cacher le splash
                if let Some(main) = app_handle.get_webview_window("main") {
                    let _ = main.show();
                    let _ = main.set_focus();
                }
                if let Some(splash) = app_handle.get_webview_window("splash") {
                    let _ = splash.close();
                }
            });

            #[cfg(desktop)]
            {
                use tauri::tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent};
                use tauri::menu::{Menu, MenuItem};

                let quit = MenuItem::with_id(app, "quit", "Quitter", true, None::<&str>)?;
                let show = MenuItem::with_id(app, "show", "Afficher", true, None::<&str>)?;
                let menu = Menu::with_items(app, &[&show, &quit])?;

                TrayIconBuilder::new()
                    .icon(app.default_window_icon().unwrap().clone())
                    .menu(&menu)
                    .tooltip("GLOBE Manager")
                    .on_menu_event(|app, event| match event.id.as_ref() {
                        "quit" => {
                            // Arrêter les conteneurs proprement
                            let compose_dir = get_compose_dir();
                            let _ = Command::new("docker")
                                .args(["compose", "stop"])
                                .current_dir(&compose_dir)
                                .output();
                            app.exit(0);
                        }
                        "show" => {
                            if let Some(window) = app.get_webview_window("main") {
                                let _ = window.show();
                                let _ = window.set_focus();
                            }
                        }
                        _ => {}
                    })
                    .on_tray_icon_event(|tray, event| {
                        if let TrayIconEvent::Click {
                            button: MouseButton::Left,
                            button_state: MouseButtonState::Up,
                            ..
                        } = event
                        {
                            let app = tray.app_handle();
                            if let Some(window) = app.get_webview_window("main") {
                                let _ = window.show();
                                let _ = window.set_focus();
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

// Contenu du docker-compose.yml embarqué dans le binaire
const COMPOSE_CONTENT: &str = include_str!("../../../docker-compose.yml");

fn get_compose_dir() -> std::path::PathBuf {
    // En production : %APPDATA%\GlobeManager (créé + docker-compose.yml écrit au démarrage)
    if let Ok(appdata) = std::env::var("APPDATA") {
        let path = std::path::PathBuf::from(appdata).join("GlobeManager");
        std::fs::create_dir_all(&path).ok();
        let compose_path = path.join("docker-compose.yml");
        // Toujours écrire pour avoir la version à jour
        std::fs::write(&compose_path, COMPOSE_CONTENT).ok();
        return path;
    }
    // Fallback dev : répertoire courant
    std::env::current_dir().unwrap_or_else(|_| std::path::PathBuf::from("."))
}

fn docker_compose_up_with_log(app: &tauri::AppHandle, compose_dir: &std::path::Path) -> bool {
    match Command::new("docker")
        .args(["compose", "up", "-d", "--remove-orphans"])
        .current_dir(compose_dir)
        .output()
    {
        Ok(o) => {
            let stdout = String::from_utf8_lossy(&o.stdout);
            let stderr = String::from_utf8_lossy(&o.stderr);
            for line in stdout.lines().chain(stderr.lines()) {
                if !line.trim().is_empty() {
                    emit_log(app, line);
                }
            }
            o.status.success()
        }
        Err(e) => {
            emit_log(app, &format!("Erreur docker: {e}"));
            false
        }
    }
}

fn wait_for_backend(app: &tauri::AppHandle, url: &str, timeout_secs: u64) -> bool {
    let deadline = Instant::now() + Duration::from_secs(timeout_secs);
    let mut attempt = 0u64;
    while Instant::now() < deadline {
        attempt += 1;
        match ureq::get(url).call() {
            Ok(resp) if resp.status() < 500 => return true,
            Ok(resp) => {
                emit_log(app, &format!("backend HTTP {} (tentative {attempt})", resp.status()));
            }
            Err(e) => {
                if attempt % 5 == 1 {
                    emit_log(app, &format!("backend non joignable (tentative {attempt}): {e}"));
                }
            }
        }
        std::thread::sleep(Duration::from_secs(2));
    }
    false
}

fn emit_splash_status(app: &tauri::AppHandle, msg: &str) {
    let _ = app.emit("splash-status", msg);
    let _ = app.emit("app-log", msg);
}

fn emit_log(app: &tauri::AppHandle, msg: &str) {
    let _ = app.emit("app-log", msg);
}
