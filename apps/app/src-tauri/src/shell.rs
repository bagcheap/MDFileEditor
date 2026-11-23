//! Links and navigation.
//!
//! The app window must only ever show the app itself. Links in documents are
//! opened in the system browser (or mail app) via `open_external_url`, and a
//! navigation guard blocks the window from loading anything else.

use tauri::Url;

/// Longest URL we will hand to the operating system.
const MAX_URL_LEN: usize = 8 * 1024;

/// Validates a link from a document before it leaves the app.
fn validate_external_url(raw: &str) -> Result<Url, String> {
    if raw.len() > MAX_URL_LEN {
        return Err("Link is too long to open.".into());
    }
    let url = Url::parse(raw).map_err(|_| "Not a valid link.".to_owned())?;
    match url.scheme() {
        "https" | "http" => {
            if url.host_str().is_none_or(str::is_empty) {
                return Err("Link has no host.".into());
            }
        }
        "mailto" => {}
        _ => return Err("Only web and email links can be opened.".into()),
    }
    // https://user:pass@host is a common phishing disguise.
    if !url.username().is_empty() || url.password().is_some() {
        return Err("Links containing credentials are not opened.".into());
    }
    Ok(url)
}

#[tauri::command]
pub fn open_external_url(url: String) -> Result<(), String> {
    let url = validate_external_url(&url)?;

    // The URL is passed as a single argument (no shell), and a parsed URL always
    // starts with its scheme, so it can't be mistaken for a command-line option.
    #[cfg(target_os = "macos")]
    let program = "/usr/bin/open";
    #[cfg(all(unix, not(target_os = "macos")))]
    let program = "xdg-open";
    #[cfg(not(unix))]
    return Err("Opening links is not supported on this platform yet.".into());

    #[cfg(unix)]
    {
        let mut child = std::process::Command::new(program)
            .arg(url.as_str())
            .spawn()
            .map_err(|e| format!("Could not open the link: {e}"))?;
        // Reap the helper process when it exits.
        std::thread::spawn(move || {
            let _ = child.wait();
        });
        Ok(())
    }
}

/// True for URLs that belong to the app itself. Everything else is blocked
/// from loading in the app window.
pub fn is_app_url(url: &Url) -> bool {
    match (url.scheme(), url.host_str()) {
        // Bundled app on macOS/Linux, and on Windows.
        ("tauri", Some("localhost")) => true,
        ("http" | "https", Some("tauri.localhost")) => true,
        // Vite dev server, only in development builds.
        ("http", Some("localhost")) if cfg!(debug_assertions) => url.port() == Some(1420),
        _ => false,
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn accepts_web_and_mail_links() {
        for ok in [
            "https://example.com/a?b=c#d",
            "http://example.com",
            "mailto:someone@example.com",
        ] {
            assert!(validate_external_url(ok).is_ok(), "{ok}");
        }
    }

    #[test]
    fn rejects_dangerous_or_odd_links() {
        for bad in [
            "javascript:alert(1)",
            "file:///etc/passwd",
            "data:text/html,hi",
            "vbscript:x",
            "ssh://example.com",
            "x-apple-systempreferences:",
            "-a Calculator",
            "https://user:pass@example.com",
            "https://user@example.com",
            "relative/path.md",
            "",
        ] {
            assert!(validate_external_url(bad).is_err(), "{bad}");
        }
        assert!(
            validate_external_url(&format!("https://e.com/{}", "a".repeat(MAX_URL_LEN))).is_err()
        );
    }

    #[test]
    fn only_app_urls_may_load_in_the_window() {
        let url = |s: &str| Url::parse(s).unwrap();
        assert!(is_app_url(&url("tauri://localhost/index.html")));
        assert!(is_app_url(&url("http://tauri.localhost/")));
        assert!(!is_app_url(&url("https://example.com")));
        assert!(!is_app_url(&url("https://localhost.example.com")));
        assert!(!is_app_url(&url("file:///etc/passwd")));
        assert!(!is_app_url(&url("http://localhost:8080")));
        assert!(!is_app_url(&url("tauri://evil")));
    }
}
