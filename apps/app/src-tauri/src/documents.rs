//! File access for documents.
//!
//! The web code has no general file-system access. It can only ask Rust to show a
//! native open/save dialog, and to write back to a path the user picked in one of
//! those dialogs during this session. Writes are atomic.

use std::collections::HashSet;
use std::fs;
use std::io::Write;
use std::path::{Path, PathBuf};
use std::sync::Mutex;

use serde::Serialize;
use tauri::{AppHandle, State};
use tauri_plugin_dialog::DialogExt;

/// Largest document we will open or write. Must match MAX_DOCUMENT_BYTES in
/// packages/platform/src/encoding.ts.
pub const MAX_DOCUMENT_BYTES: u64 = 50 * 1024 * 1024;

const EXTENSIONS: &[&str] = &["md", "markdown", "mdown", "mkd", "txt"];

/// Paths the user picked in a native dialog this session. Only these may be written.
#[derive(Default)]
pub struct AllowedPaths(Mutex<HashSet<PathBuf>>);

impl AllowedPaths {
    fn allow(&self, path: PathBuf) {
        self.0
            .lock()
            .unwrap_or_else(|e| e.into_inner())
            .insert(path);
    }

    fn contains(&self, path: &Path) -> bool {
        self.0
            .lock()
            .unwrap_or_else(|e| e.into_inner())
            .contains(path)
    }
}

#[derive(Debug, Serialize, PartialEq)]
pub struct OpenedDocument {
    path: String,
    name: String,
    contents: String,
}

#[derive(Debug, Serialize, PartialEq)]
pub struct SavedDocument {
    path: String,
    name: String,
}

fn io_error(action: &str, error: std::io::Error) -> String {
    format!("Could not {action}: {error}")
}

/// Resolves symlinks and `..` so the allowlist compares real locations, and so a
/// save through a symlink replaces the target file rather than the link.
fn normalize(path: &Path) -> Result<PathBuf, String> {
    if let Ok(real) = fs::canonicalize(path) {
        return Ok(real);
    }
    // The file doesn't exist (yet): resolve its folder instead.
    let name = path.file_name().ok_or("Invalid file path.")?;
    let parent = path.parent().ok_or("Invalid file path.")?;
    let parent = fs::canonicalize(parent).map_err(|e| io_error("find the folder", e))?;
    Ok(parent.join(name))
}

fn path_to_string(path: &Path) -> Result<String, String> {
    path.to_str()
        .map(str::to_owned)
        .ok_or_else(|| "File paths that are not valid UTF-8 are not supported.".to_owned())
}

fn file_name(path: &Path) -> String {
    path.file_name()
        .map(|n| n.to_string_lossy().into_owned())
        .unwrap_or_default()
}

/// Reads a document as strict UTF-8 (a byte-order mark, if any, is kept).
fn read_document(path: &Path) -> Result<String, String> {
    let meta = fs::metadata(path).map_err(|e| io_error("open the file", e))?;
    if !meta.is_file() {
        return Err("Only regular files can be opened.".into());
    }
    if meta.len() > MAX_DOCUMENT_BYTES {
        return Err("File is too large to open (limit is 50 MB).".into());
    }
    let bytes = fs::read(path).map_err(|e| io_error("read the file", e))?;
    if bytes.len() as u64 > MAX_DOCUMENT_BYTES {
        return Err("File is too large to open (limit is 50 MB).".into());
    }
    String::from_utf8(bytes)
        .map_err(|_| "File is not valid UTF-8 text, so it was not opened.".into())
}

/// Writes `contents` to `path` atomically: a temporary file in the same folder is
/// written and flushed to disk, then renamed over the original. A crash at any
/// point leaves either the old file or the new one, never a partial file.
fn write_atomic(path: &Path, contents: &str) -> Result<(), String> {
    if contents.len() as u64 > MAX_DOCUMENT_BYTES {
        return Err("Document is too large to save (limit is 50 MB).".into());
    }
    let dir = path.parent().ok_or("Invalid file path.")?;
    let mut tmp = tempfile::Builder::new()
        .prefix(".mdedit-")
        .suffix(".tmp")
        .tempfile_in(dir)
        .map_err(|e| io_error("create a temporary file", e))?;
    tmp.write_all(contents.as_bytes())
        .map_err(|e| io_error("write the file", e))?;
    // Keep the original file's permissions (the temp file is created owner-only).
    if let Ok(meta) = fs::metadata(path) {
        tmp.as_file()
            .set_permissions(meta.permissions())
            .map_err(|e| io_error("set file permissions", e))?;
    }
    tmp.as_file()
        .sync_all()
        .map_err(|e| io_error("flush the file to disk", e))?;
    tmp.persist(path)
        .map_err(|e| io_error("replace the file", e.error))?;
    // Make the rename itself durable (best effort).
    #[cfg(unix)]
    if let Ok(d) = fs::File::open(dir) {
        let _ = d.sync_all();
    }
    Ok(())
}

#[tauri::command]
pub async fn open_document(
    app: AppHandle,
    allowed: State<'_, AllowedPaths>,
) -> Result<Option<OpenedDocument>, String> {
    let Some(picked) = app
        .dialog()
        .file()
        .add_filter("Markdown", EXTENSIONS)
        .blocking_pick_file()
    else {
        return Ok(None);
    };
    let path = normalize(&picked.into_path().map_err(|e| e.to_string())?)?;
    let contents = read_document(&path)?;
    let doc = OpenedDocument {
        path: path_to_string(&path)?,
        name: file_name(&path),
        contents,
    };
    allowed.allow(path);
    Ok(Some(doc))
}

#[tauri::command]
pub async fn save_document(
    path: String,
    contents: String,
    allowed: State<'_, AllowedPaths>,
) -> Result<(), String> {
    let path = normalize(Path::new(&path))?;
    if !allowed.contains(&path) {
        return Err("This file was not opened in this session, so it can't be saved.".into());
    }
    write_atomic(&path, &contents)
}

#[tauri::command]
pub async fn save_document_as(
    app: AppHandle,
    contents: String,
    suggested_name: String,
    allowed: State<'_, AllowedPaths>,
) -> Result<Option<SavedDocument>, String> {
    let Some(picked) = app
        .dialog()
        .file()
        .add_filter("Markdown", EXTENSIONS)
        .set_file_name(&suggested_name)
        .blocking_save_file()
    else {
        return Ok(None);
    };
    let path = normalize(&picked.into_path().map_err(|e| e.to_string())?)?;
    write_atomic(&path, &contents)?;
    let saved = SavedDocument {
        path: path_to_string(&path)?,
        name: file_name(&path),
    };
    allowed.allow(path);
    Ok(Some(saved))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn round_trips_utf8_exactly_including_bom() {
        let dir = tempfile::tempdir().unwrap();
        let path = dir.path().join("a.md");
        let text = "\u{feff}# Héllo 👋\r\n- item\n";
        write_atomic(&path, text).unwrap();
        assert_eq!(read_document(&path).unwrap(), text);
    }

    #[test]
    fn refuses_invalid_utf8() {
        let dir = tempfile::tempdir().unwrap();
        let path = dir.path().join("bad.md");
        fs::write(&path, [0x41, 0xff, 0x42]).unwrap();
        assert!(read_document(&path).unwrap_err().contains("UTF-8"));
    }

    #[test]
    fn refuses_directories() {
        let dir = tempfile::tempdir().unwrap();
        assert!(read_document(dir.path()).is_err());
    }

    #[test]
    fn overwrite_leaves_no_temp_files_and_keeps_permissions() {
        let dir = tempfile::tempdir().unwrap();
        let path = dir.path().join("a.md");
        fs::write(&path, "old").unwrap();
        #[cfg(unix)]
        {
            use std::os::unix::fs::PermissionsExt;
            fs::set_permissions(&path, fs::Permissions::from_mode(0o644)).unwrap();
        }
        write_atomic(&path, "new").unwrap();
        assert_eq!(fs::read_to_string(&path).unwrap(), "new");
        let entries: Vec<_> = fs::read_dir(dir.path()).unwrap().collect();
        assert_eq!(entries.len(), 1);
        #[cfg(unix)]
        {
            use std::os::unix::fs::PermissionsExt;
            let mode = fs::metadata(&path).unwrap().permissions().mode() & 0o777;
            assert_eq!(mode, 0o644);
        }
    }

    #[cfg(unix)]
    #[test]
    fn saving_through_a_symlink_replaces_the_target_not_the_link() {
        let dir = tempfile::tempdir().unwrap();
        let target = dir.path().join("real.md");
        let link = dir.path().join("link.md");
        fs::write(&target, "old").unwrap();
        std::os::unix::fs::symlink(&target, &link).unwrap();
        let resolved = normalize(&link).unwrap();
        write_atomic(&resolved, "new").unwrap();
        assert!(fs::symlink_metadata(&link)
            .unwrap()
            .file_type()
            .is_symlink());
        assert_eq!(fs::read_to_string(&target).unwrap(), "new");
    }

    #[test]
    fn normalize_resolves_dot_dot_so_allowlist_cannot_be_bypassed() {
        let dir = tempfile::tempdir().unwrap();
        fs::create_dir(dir.path().join("sub")).unwrap();
        let file = dir.path().join("a.md");
        fs::write(&file, "x").unwrap();
        let allowed = AllowedPaths::default();
        allowed.allow(normalize(&file).unwrap());
        let sneaky = dir.path().join("sub/../a.md");
        assert!(allowed.contains(&normalize(&sneaky).unwrap()));
        let other = dir.path().join("sub/../b.md");
        assert!(!allowed.contains(&normalize(&other).unwrap()));
    }

    #[test]
    fn refuses_oversized_writes() {
        let dir = tempfile::tempdir().unwrap();
        let big = "x".repeat(MAX_DOCUMENT_BYTES as usize + 1);
        assert!(write_atomic(&dir.path().join("a.md"), &big).is_err());
    }
}
