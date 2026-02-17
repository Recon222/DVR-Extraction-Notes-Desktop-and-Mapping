//! Recovery Feature
//!
//! Provides emergency data recovery for crash recovery and session persistence.

pub mod commands;
pub mod types;

// Re-export commonly used items
pub use types::RecoveryError;
