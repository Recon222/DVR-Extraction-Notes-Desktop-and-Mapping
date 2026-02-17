//! Preferences Feature
//!
//! Manages application preferences including theme, language, and shortcuts.
//! Preferences persist to disk as JSON.

pub mod commands;
pub mod types;

// Re-export commonly used items
pub use types::AppPreferences;
