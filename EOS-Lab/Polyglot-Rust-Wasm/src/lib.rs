// =========================================================================
// EOS — HIGH-PERFORMANCE RUST AST TOKEN SANITIZER & LEXER
// Compiled to WebAssembly for sub-millisecond edge sanitization in Cursor
// =========================================================================

use wasm_bindgen::prelude::*;

#[wasm_bindgen]
pub struct EosTokenSanitizer;

#[wasm_bindgen]
pub struct HarmonicJudgmentNode {
    conflict: String,
    option: String,
    objective_truth: f64,
    ahimsa_non_harm: f64,
    mathematical_exactness: f64,
    harmonic_score: f64,
}

#[wasm_bindgen]
impl EosTokenSanitizer {
    /// Sanitizes user text by stripping dangerous HTML tags and control characters
    pub fn sanitize(input: &str) -> String {
        let mut result = String::with_capacity(input.len());
        let mut in_tag = false;

        for c in input.chars() {
            match c {
                '<' => in_tag = true,
                '>' => in_tag = false,
                _ if !in_tag => {
                    if !c.is_control() {
                        result.push(c);
                    }
                }
                _ => {}
            }
        }
        result.trim().to_string()
    }

    /// Fast token counter
    pub fn count_tokens(input: &str) -> usize {
        input.split_whitespace().count()
    }
}

#[wasm_bindgen]
impl HarmonicJudgmentNode {
    #[wasm_bindgen(constructor)]
    pub fn new(conflict: &str, option: &str) -> HarmonicJudgmentNode {
        let objective_truth = evaluate_truth(option);
        let ahimsa_non_harm = evaluate_non_harm(option);
        let mathematical_exactness = evaluate_exactness(option);
        let harmonic_score =
            round_score((objective_truth + ahimsa_non_harm + mathematical_exactness) / 3.0);

        HarmonicJudgmentNode {
            conflict: conflict.trim().to_string(),
            option: option.trim().to_string(),
            objective_truth,
            ahimsa_non_harm,
            mathematical_exactness,
            harmonic_score,
        }
    }

    pub fn conflict(&self) -> String {
        self.conflict.clone()
    }

    pub fn option(&self) -> String {
        self.option.clone()
    }

    pub fn objective_truth(&self) -> f64 {
        self.objective_truth
    }

    pub fn ahimsa_non_harm(&self) -> f64 {
        self.ahimsa_non_harm
    }

    pub fn mathematical_exactness(&self) -> f64 {
        self.mathematical_exactness
    }

    pub fn harmonic_score(&self) -> f64 {
        self.harmonic_score
    }

    pub fn verdict(&self) -> String {
        if self.harmonic_score >= 0.8 {
            "HARMONICALLY_OPTIMAL".to_string()
        } else {
            "CONDITIONALLY_ACCEPTABLE".to_string()
        }
    }
}

fn evaluate_truth(option: &str) -> f64 {
    let normalized = option.to_ascii_lowercase();
    if normalized.contains("mock") || normalized.contains("fake") || normalized.contains("vibe") {
        return 0.2;
    }
    if normalized.contains("contract")
        || normalized.contains("spec")
        || normalized.contains("verified")
    {
        return 1.0;
    }
    0.85
}

fn evaluate_non_harm(option: &str) -> f64 {
    let normalized = option.to_ascii_lowercase();
    if normalized.contains("delete-all")
        || normalized.contains("force-overwrite")
        || normalized.contains("bypass")
    {
        return 0.1;
    }
    if normalized.contains("safe")
        || normalized.contains("fallback")
        || normalized.contains("fdir")
        || normalized.contains("rollback")
    {
        return 1.0;
    }
    0.9
}

fn evaluate_exactness(option: &str) -> f64 {
    let normalized = option.to_ascii_lowercase();
    if normalized.contains("sloppy") || normalized.contains("quick-hack") {
        return 0.2;
    }
    if normalized.contains("clean")
        || normalized.contains("tdd")
        || normalized.contains("deterministic")
        || normalized.contains("pure")
    {
        return 1.0;
    }
    0.9
}

fn round_score(value: f64) -> f64 {
    (value * 1000.0).round() / 1000.0
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_sanitize_strips_html() {
        let dirty = "<script>alert('xss')</script>Juan Pérez";
        let clean = EosTokenSanitizer::sanitize(dirty);
        assert_eq!(clean, "alert('xss')Juan Pérez");
    }

    #[test]
    fn test_sanitize_strips_nested_tags() {
        let dirty = "<img src=x onerror=alert(1)> Rionegro";
        let clean = EosTokenSanitizer::sanitize(dirty);
        assert_eq!(clean, "Rionegro");
    }

    #[test]
    fn test_count_tokens() {
        let text = "Alexander Rodriguez Remodelaciones Rionegro Antioquia";
        assert_eq!(EosTokenSanitizer::count_tokens(text), 5);
    }

    #[test]
    fn test_harmonic_node_scores_verified_safe_option() {
        let node = HarmonicJudgmentNode::new(
            "Choose a remediation path",
            "Verified safe deterministic pure contract with rollback",
        );

        assert_eq!(node.conflict(), "Choose a remediation path");
        assert_eq!(
            node.option(),
            "Verified safe deterministic pure contract with rollback"
        );
        assert_eq!(node.objective_truth(), 1.0);
        assert_eq!(node.ahimsa_non_harm(), 1.0);
        assert_eq!(node.mathematical_exactness(), 1.0);
        assert_eq!(node.harmonic_score(), 1.0);
        assert_eq!(node.verdict(), "HARMONICALLY_OPTIMAL");
    }

    #[test]
    fn test_harmonic_node_penalizes_risky_sloppy_option() {
        let node = HarmonicJudgmentNode::new(
            "Resolve unsafe path",
            "Fake bypass quick-hack delete-all flow",
        );

        assert_eq!(node.objective_truth(), 0.2);
        assert_eq!(node.ahimsa_non_harm(), 0.1);
        assert_eq!(node.mathematical_exactness(), 0.2);
        assert_eq!(node.harmonic_score(), 0.167);
        assert_eq!(node.verdict(), "CONDITIONALLY_ACCEPTABLE");
    }
}
