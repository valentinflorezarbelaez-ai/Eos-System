use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize, Clone, Copy, PartialEq, Eq)]
pub enum EnforcementAction {
    Continue,
    Warn,
    ReduceContext,
    Stop,
}

#[derive(Debug, Serialize, Deserialize, Clone, Copy, PartialEq, Eq)]
pub struct BudgetPolicy {
    pub soft_limit: u32,
    pub hard_limit: u32,
}

#[derive(Debug, Serialize, Deserialize, Clone, Copy, PartialEq, Eq)]
pub struct BudgetSnapshot {
    pub consumed: u32,
    pub remaining: u32,
}

#[derive(Debug, Serialize, Deserialize, Clone, Copy, PartialEq, Eq)]
pub struct BudgetDecision {
    pub action: EnforcementAction,
    pub snapshot: BudgetSnapshot,
}

impl BudgetPolicy {
    pub fn new(soft_limit: u32, hard_limit: u32) -> Self {
        assert!(
            soft_limit <= hard_limit,
            "soft limit cannot exceed hard limit"
        );

        Self {
            soft_limit,
            hard_limit,
        }
    }

    pub fn evaluate(&self, consumed: u32) -> BudgetDecision {
        let remaining = self.hard_limit.saturating_sub(consumed);
        let warn_threshold = self.soft_limit.saturating_mul(80) / 100;

        let action = if consumed >= self.hard_limit {
            EnforcementAction::Stop
        } else if consumed >= self.soft_limit {
            EnforcementAction::ReduceContext
        } else if consumed > warn_threshold {
            EnforcementAction::Warn
        } else {
            EnforcementAction::Continue
        };

        BudgetDecision {
            action,
            snapshot: BudgetSnapshot {
                consumed,
                remaining,
            },
        }
    }
}

#[cfg(test)]
mod tests {
    use super::{BudgetPolicy, EnforcementAction};

    #[test]
    fn allows_continuation_under_the_warn_threshold() {
        let policy = BudgetPolicy::new(10_000, 15_000);
        let decision = policy.evaluate(5_000);

        assert_eq!(decision.action, EnforcementAction::Continue);
        assert_eq!(decision.snapshot.remaining, 10_000);
    }

    #[test]
    fn warns_when_approaching_the_soft_limit() {
        let policy = BudgetPolicy::new(10_000, 15_000);
        let decision = policy.evaluate(8_500);

        assert_eq!(decision.action, EnforcementAction::Warn);
        assert_eq!(decision.snapshot.remaining, 6_500);
    }

    #[test]
    fn reduces_context_after_crossing_the_soft_limit() {
        let policy = BudgetPolicy::new(10_000, 15_000);
        let decision = policy.evaluate(11_000);

        assert_eq!(decision.action, EnforcementAction::ReduceContext);
        assert_eq!(decision.snapshot.remaining, 4_000);
    }

    #[test]
    fn stops_execution_at_the_hard_limit() {
        let policy = BudgetPolicy::new(10_000, 15_000);
        let decision = policy.evaluate(15_000);

        assert_eq!(decision.action, EnforcementAction::Stop);
        assert_eq!(decision.snapshot.remaining, 0);
    }
}
