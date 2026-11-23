mod documents;
mod shell;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    // Defense in depth: even if something tried to navigate the window away from
    // the app (e.g. a link that slipped past the UI's click handling), block it.
    let navigation_guard = tauri::plugin::Builder::<tauri::Wry>::new("navigation-guard")
        .on_navigation(|_webview, url| shell::is_app_url(url))
        .build();

    tauri::Builder::default()
        .plugin(navigation_guard)
        // The dialog plugin is used from Rust only; the web code is not granted
        // any dialog permissions (see capabilities/default.json).
        .plugin(tauri_plugin_dialog::init())
        .manage(documents::AllowedPaths::default())
        .invoke_handler(tauri::generate_handler![
            documents::open_document,
            documents::save_document,
            documents::save_document_as,
            shell::open_external_url,
        ])
        .run(tauri::generate_context!())
        .expect("error while running MD File Editor");
}
