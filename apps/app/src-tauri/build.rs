fn main() {
    // Declaring the app's commands here means each one must be explicitly granted
    // in capabilities/default.json before the web code can call it.
    tauri_build::try_build(tauri_build::Attributes::new().app_manifest(
        tauri_build::AppManifest::new().commands(&[
            "open_document",
            "save_document",
            "save_document_as",
        ]),
    ))
    .expect("failed to run tauri-build");
}
