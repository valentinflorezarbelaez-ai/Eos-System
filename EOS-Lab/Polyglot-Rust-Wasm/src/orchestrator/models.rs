use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize, Clone, Copy, PartialEq, Eq)]
pub enum AiProvider {
    ClaudeCode,
    GoogleAntigravity,
    DevinAutonomous,
}

#[derive(Debug, Serialize, Deserialize, Clone, Copy, PartialEq, Eq, PartialOrd, Ord)]
pub enum CodebaseComplexity {
    Low,
    Medium,
    Structural,
    Extreme,
}

#[derive(Debug, Serialize, Deserialize, Clone, PartialEq, Eq)]
pub struct TaskContext {
    pub ticket_id: String,
    pub source_markdown: String,
    pub complexity: CodebaseComplexity,
}
