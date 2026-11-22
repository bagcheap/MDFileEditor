mod documents;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        // The dialog plugin is used from Rust only; the web code is not granted
        // any dialog permissions (see capabilities/default.json).
        .plugin(tauri_plugin_dialog::init())
        .manage(documents::AllowedPaths::default())
        .invoke_handler(tauri::generate_handler![
            documents::open_document,
            documents::save_document,
            documents::save_document_as,
        ])
        .run(tauri::generate_context!())
        .expect("error while running MD File Editor");
}
