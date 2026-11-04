use near_sdk::borsh::BorshStorageKey;
use near_sdk::json_types::U128;
use near_sdk::store::{LookupMap, LookupSet};
use near_sdk::{
    env, near, require, AccountId, PanicOnDefault,
};

/// Status of an Ajo / Esusu savings circle.
#[near(serializers = [borsh, json])]
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum CircleStatus {
    /// Initial state: circle created, waiting for members to join until capacity is reached.
    Open,
    /// Active state: circle is full, rounds are actively rotating and receiving deposits.
    Active,
    /// Completed state: all scheduled rounds have completed and every member received their payout pot.
    Completed,
}

/// Represents an Ajo / Esusu rotating savings circle.
#[near(serializers = [borsh, json])]
#[derive(Clone, Debug, PartialEq)]
pub struct Circle {
    /// Unique identifier for this circle.
    pub id: u64,
    /// The account ID of the circle organizer/creator.
    pub creator: AccountId,
    /// The total accumulated pot paid out to the winner in each round (contribution_amount * total_rounds).
    pub total_round_pot: U128,
    /// The mandatory contribution amount per member for each round.
    pub contribution_amount: U128,
    /// The current active round (1-indexed when Active, 0 when Open/unstarted).
    pub current_round: u64,
    /// Total rounds to be executed (equal to the total number of members in the rotation).
    pub total_rounds: u64,
    /// The registered members in rotation order.
    pub members: Vec<AccountId>,
    /// Array tracking the sequence of members who have received the payout pot in past rounds.
    pub past_winners: Vec<AccountId>,
    /// Accounts that have successfully deposited their contribution for the current active round.
    pub deposits_current_round: Vec<AccountId>,
    /// Operational status of the savings circle.
    pub status: CircleStatus,
    /// Target duration for each round in seconds (e.g., 604,800 for 1 week).
    pub round_duration_seconds: u64,
    /// Optional metadata or reference URI for the circle (e.g. cross-chain settings or title).
    pub metadata: Option<String>,
}

impl Circle {
    /// Checks whether an account is currently a member of this circle.
    pub fn is_member(&self, account: &AccountId) -> bool {
        self.members.contains(account)
    }

    /// Checks if a member has paid for the current active round.
    pub fn has_deposited(&self, account: &AccountId) -> bool {
        self.deposits_current_round.contains(account)
    }

    /// Checks if a member has already received a round pot payout.
    pub fn has_won(&self, account: &AccountId) -> bool {
        self.past_winners.contains(account)
    }

    /// Returns the account designated to receive the pot for the given round (1-indexed).
    pub fn candidate_for_round(&self, round: u64) -> Option<&AccountId> {
        if round == 0 || round > self.members.len() as u64 {
            None
        } else {
            self.members.get((round - 1) as usize)
        }
    }
}

/// View representation of a member's current status within an active circle.
#[near(serializers = [borsh, json])]
#[derive(Clone, Debug, PartialEq, Eq)]
pub struct MemberRoundStatus {
    pub member: AccountId,
    pub has_deposited: bool,
    pub has_won: bool,
    pub is_current_winner_candidate: bool,
}

/// Borsh storage keys for contract collections.
#[derive(BorshStorageKey)]
#[near(serializers = [borsh])]
pub enum StorageKey {
    Circles,
    Operators,
}

/// Core TrustMesh Rotating Savings Contract State.
#[near(contract_state)]
#[derive(PanicOnDefault)]
pub struct TrustMeshContract {
    /// Platform super-admin with authority to update operators and contract settings.
    pub admin: AccountId,
    /// Set of authorized backend relayer agents permitted to record verified cross-chain deposits.
    pub operators: LookupSet<AccountId>,
    /// Storage map of all circles indexed by their numeric circle ID.
    pub circles: LookupMap<u64, Circle>,
    /// Auto-incrementing identifier counter for the next created circle.
    pub next_circle_id: u64,
}

#[near]
impl TrustMeshContract {
    /// Contract initialization.
    ///
    /// Sets the initial platform admin. If none is supplied, defaults to the predecessor account.
    #[init]
    pub fn new(admin: Option<AccountId>) -> Self {
        let admin_id = admin.unwrap_or_else(env::predecessor_account_id);
        Self {
            admin: admin_id,
            operators: LookupSet::new(StorageKey::Operators),
            circles: LookupMap::new(StorageKey::Circles),
            next_circle_id: 0,
        }
    }

    // -------------------------------------------------------------------------
    // Core Rotating Savings Functions
    // -------------------------------------------------------------------------

    /// Initializes a new rotating savings circle with a specific contribution amount and duration.
    ///
    /// - Automatically sets the caller as the circle creator and the first member.
    /// - Initializes the circle in the `Open` status.
    ///
    /// # Arguments
    /// * `contribution_amount` - The token amount each member contributes per round.
    /// * `total_rounds` - Total rounds in the circle (must match the eventual member count, min 2).
    /// * `round_duration_seconds` - Optional cycle duration in seconds (defaults to 7 days = 604,800s).
    /// * `metadata` - Optional descriptive text or IPFS/URI metadata.
    ///
    /// # Returns
    /// The newly generated `circle_id`.
    pub fn create_circle(
        &mut self,
        contribution_amount: U128,
        total_rounds: u64,
        round_duration_seconds: Option<u64>,
        metadata: Option<String>,
    ) -> u64 {
        require!(
            contribution_amount.0 > 0,
            "Contribution amount must be greater than zero"
        );
        require!(
            total_rounds >= 2,
            "A circle must have at least 2 rounds/members"
        );

        let creator = env::predecessor_account_id();
        let circle_id = self.next_circle_id;
        self.next_circle_id = self
            .next_circle_id
            .checked_add(1)
            .expect("Circle ID counter overflow");

        let duration = round_duration_seconds.unwrap_or(7 * 24 * 60 * 60);
        let total_pot = contribution_amount
            .0
            .checked_mul(total_rounds as u128)
            .expect("Total pot calculation overflow");

        let circle = Circle {
            id: circle_id,
            creator: creator.clone(),
            total_round_pot: U128(total_pot),
            contribution_amount,
            current_round: 0,
            total_rounds,
            members: vec![creator.clone()],
            past_winners: Vec::new(),
            deposits_current_round: Vec::new(),
            status: CircleStatus::Open,
            round_duration_seconds: duration,
            metadata,
        };

        self.circles.insert(circle_id, circle);

        Self::emit_event(
            "circle_created",
            serde_json::json!({
                "circle_id": circle_id,
                "creator": creator,
                "contribution_amount": contribution_amount,
                "total_rounds": total_rounds,
                "total_round_pot": U128(total_pot),
                "round_duration_seconds": duration,
            }),
        );

        circle_id
    }

    /// Allows a NEAR account to add themselves to an active, unstarted circle.
    ///
    /// If joining brings the circle to its maximum capacity (`members.len() == total_rounds`),
    /// the circle automatically activates into `Active` status and begins Round 1.
    ///
    /// # Arguments
    /// * `circle_id` - ID of the circle to join.
    pub fn join_circle(&mut self, circle_id: u64) {
        let caller = env::predecessor_account_id();
        let circle = self
            .circles
            .get_mut(&circle_id)
            .expect("Circle not found");

        require!(
            circle.status == CircleStatus::Open,
            "Circle is not open for joining"
        );
        require!(
            !circle.members.contains(&caller),
            "Account is already a member of this circle"
        );
        require!(
            circle.members.len() < circle.total_rounds as usize,
            "Circle has reached maximum member capacity"
        );

        circle.members.push(caller.clone());

        Self::emit_event(
            "member_joined",
            serde_json::json!({
                "circle_id": circle_id,
                "member": caller,
                "current_member_count": circle.members.len(),
                "capacity": circle.total_rounds,
            }),
        );

        // When capacity is satisfied, transition the circle into the Active state for Round 1
        if circle.members.len() == circle.total_rounds as usize {
            circle.status = CircleStatus::Active;
            circle.current_round = 1;

            Self::emit_event(
                "circle_started",
                serde_json::json!({
                    "circle_id": circle_id,
                    "current_round": circle.current_round,
                    "total_members": circle.members.len(),
                    "total_round_pot": circle.total_round_pot,
                }),
            );
        }
    }

    /// Internal / authorized owner function called when a member's cross-chain or native deposit
    /// is verified via our backend agent infrastructure.
    ///
    /// Flags the member as paid for the active round.
    ///
    /// # Arguments
    /// * `circle_id` - ID of the active circle.
    /// * `member` - The member whose deposit is being credited.
    /// * `tx_hash` - Optional transaction hash or cross-chain reference for auditing.
    pub fn record_deposit(
        &mut self,
        circle_id: u64,
        member: AccountId,
        tx_hash: Option<String>,
    ) {
        self.assert_authorized();

        let circle = self
            .circles
            .get_mut(&circle_id)
            .expect("Circle not found");

        require!(
            circle.status == CircleStatus::Active,
            "Circle is not currently active"
        );
        require!(
            circle.is_member(&member),
            "Account is not a member of this circle"
        );
        require!(
            !circle.has_deposited(&member),
            "Deposit already recorded for this member in the current round"
        );

        circle.deposits_current_round.push(member.clone());

        Self::emit_event(
            "deposit_recorded",
            serde_json::json!({
                "circle_id": circle_id,
                "round": circle.current_round,
                "member": member,
                "amount": circle.contribution_amount,
                "tx_hash": tx_hash,
                "total_deposits_this_round": circle.deposits_current_round.len(),
                "required_deposits": circle.members.len(),
            }),
        );
    }

    /// Evaluates if all members have deposited for the current round, determines the next
    /// winner based on the rotation list, updates the ledger state, and resets deposit flags
    /// for the next round.
    ///
    /// May be invoked by the contract admin, an authorized relayer agent, or any member
    /// belonging to the circle once deposit conditions are satisfied.
    ///
    /// # Arguments
    /// * `circle_id` - ID of the circle to rotate.
    ///
    /// # Returns
    /// The `AccountId` of the member awarded the current round's pot.
    pub fn rotate_round(&mut self, circle_id: u64) -> AccountId {
        let caller = env::predecessor_account_id();
        let circle = self
            .circles
            .get_mut(&circle_id)
            .expect("Circle not found");

        // Guard: Caller must be admin, an authorized agent, or a registered circle member
        require!(
            self.is_authorized(&caller) || circle.is_member(&caller),
            "Unauthorized: caller must be an admin, operator, or circle member"
        );

        require!(
            circle.status == CircleStatus::Active,
            "Circle is not currently active"
        );
        require!(
            circle.current_round >= 1 && circle.current_round <= circle.total_rounds,
            "Invalid round state"
        );

        // Verification: ensure all members have deposited for this round
        require!(
            circle.deposits_current_round.len() == circle.members.len(),
            "Cannot rotate round: not all members have deposited for the current round"
        );

        // Determine round winner according to deterministic rotation schedule
        let winner_index = (circle.current_round - 1) as usize;
        let winner = circle
            .members
            .get(winner_index)
            .cloned()
            .expect("Winner index out of bounds");

        require!(
            !circle.has_won(&winner),
            "Integrity failure: winner has already won a past round in this circle"
        );

        // State update: Record the winner and archive the round
        circle.past_winners.push(winner.clone());
        let completed_round = circle.current_round;
        let pot_payout = circle.total_round_pot;

        // Reset deposit status flags for the upcoming round
        circle.deposits_current_round.clear();

        // Check if all scheduled rounds are concluded
        let is_completed = completed_round >= circle.total_rounds;
        if is_completed {
            circle.status = CircleStatus::Completed;
        } else {
            circle.current_round += 1;
        }

        Self::emit_event(
            "round_rotated",
            serde_json::json!({
                "circle_id": circle_id,
                "completed_round": completed_round,
                "winner": winner,
                "pot_amount": pot_payout,
                "next_round": circle.current_round,
                "is_completed": is_completed,
            }),
        );

        winner
    }

    // -------------------------------------------------------------------------
    // Admin & Access Control Functions
    // -------------------------------------------------------------------------

    /// Returns the primary contract admin account ID.
    pub fn get_admin(&self) -> AccountId {
        self.admin.clone()
    }

    /// Updates the contract admin account ID. Can only be invoked by current admin.
    pub fn set_admin(&mut self, new_admin: AccountId) {
        self.assert_admin();
        self.admin = new_admin;
    }

    /// Grants operator privileges to an account (e.g. backend verification agent).
    pub fn add_operator(&mut self, operator: AccountId) {
        self.assert_admin();
        self.operators.insert(operator.clone());
        Self::emit_event("operator_added", serde_json::json!({ "operator": operator }));
    }

    /// Revokes operator privileges from an account.
    pub fn remove_operator(&mut self, operator: AccountId) {
        self.assert_admin();
        self.operators.remove(&operator);
        Self::emit_event("operator_removed", serde_json::json!({ "operator": operator }));
    }

    /// Checks if a given account has operator status.
    pub fn is_operator(&self, account: AccountId) -> bool {
        self.operators.contains(&account)
    }

    /// Asserts that the caller is the contract admin or an authorized operator.
    pub fn assert_authorized(&self) {
        let caller = env::predecessor_account_id();
        require!(
            self.is_authorized(&caller),
            "Unauthorized: caller is not an admin or authorized operator"
        );
    }

    /// Checks whether an account is the admin or an operator.
    pub fn is_authorized(&self, account: &AccountId) -> bool {
        account == &self.admin || self.operators.contains(account)
    }

    /// Asserts that the caller is the admin.
    pub fn assert_admin(&self) {
        require!(
            env::predecessor_account_id() == self.admin,
            "Unauthorized: caller must be admin"
        );
    }

    // -------------------------------------------------------------------------
    // View Functions
    // -------------------------------------------------------------------------

    /// Retrieves full details of a specific circle by ID.
    pub fn get_circle(&self, circle_id: u64) -> Option<Circle> {
        self.circles.get(&circle_id).cloned()
    }

    /// Paginated lookup of savings circles.
    ///
    /// # Arguments
    /// * `from_index` - Starting circle ID (defaults to 0).
    /// * `limit` - Maximum number of circles to return (defaults to 50, capped at 100).
    pub fn get_circles(&self, from_index: Option<u64>, limit: Option<u64>) -> Vec<Circle> {
        let start = from_index.unwrap_or(0);
        let max_limit = limit.unwrap_or(50).min(100);

        if start >= self.next_circle_id {
            return Vec::new();
        }

        let end = (start + max_limit).min(self.next_circle_id);
        (start..end)
            .filter_map(|id| self.circles.get(&id).cloned())
            .collect()
    }

    /// Returns the total number of circles created on the platform.
    pub fn get_circle_count(&self) -> u64 {
        self.next_circle_id
    }

    /// Retrieves the status of a specific member in the current active round.
    pub fn get_member_round_status(
        &self,
        circle_id: u64,
        member: AccountId,
    ) -> Option<MemberRoundStatus> {
        let circle = self.circles.get(&circle_id)?;
        if !circle.is_member(&member) {
            return None;
        }

        let is_current_candidate = circle
            .candidate_for_round(circle.current_round)
            .map(|c| c == &member)
            .unwrap_or(false);

        Some(MemberRoundStatus {
            member: member.clone(),
            has_deposited: circle.has_deposited(&member),
            has_won: circle.has_won(&member),
            is_current_winner_candidate: is_current_candidate,
        })
    }

    /// Returns round status for all members within a circle.
    pub fn get_all_members_round_status(&self, circle_id: u64) -> Vec<MemberRoundStatus> {
        let circle = match self.circles.get(&circle_id) {
            Some(c) => c,
            None => return Vec::new(),
        };

        circle
            .members
            .iter()
            .map(|m| {
                let is_current_candidate = circle
                    .candidate_for_round(circle.current_round)
                    .map(|c| c == m)
                    .unwrap_or(false);

                MemberRoundStatus {
                    member: m.clone(),
                    has_deposited: circle.has_deposited(m),
                    has_won: circle.has_won(m),
                    is_current_winner_candidate: is_current_candidate,
                }
            })
            .collect()
    }

    // -------------------------------------------------------------------------
    // Internal Event Helper
    // -------------------------------------------------------------------------

    /// Emits a standard NEP-297 compliant JSON event log for indexing.
    fn emit_event(event_name: &str, data: serde_json::Value) {
        let event_log = serde_json::json!({
            "standard": "trustmesh",
            "version": "1.0.0",
            "event": event_name,
            "data": [data]
        });
        env::log_str(&format!("EVENT_JSON:{}", event_log));
    }
}

// -----------------------------------------------------------------------------
// Comprehensive Unit Tests (Machine-Readable Test Harness)
// -----------------------------------------------------------------------------
#[cfg(test)]
mod tests {
    use super::*;
    use near_sdk::test_utils::VMContextBuilder;
    use near_sdk::testing_env;

    fn account(name: &str) -> AccountId {
        name.parse().unwrap()
    }

    fn set_context(caller: &AccountId) {
        let context = VMContextBuilder::new()
            .predecessor_account_id(caller.clone())
            .signer_account_id(caller.clone())
            .build();
        testing_env!(context);
    }

    #[test]
    fn test_initialization() {
        let admin = account("admin.near");
        set_context(&admin);

        let contract = TrustMeshContract::new(Some(admin.clone()));
        assert_eq!(contract.get_admin(), admin);
        assert_eq!(contract.get_circle_count(), 0);
    }

    #[test]
    fn test_operator_management() {
        let admin = account("admin.near");
        let agent = account("agent.near");
        set_context(&admin);

        let mut contract = TrustMeshContract::new(Some(admin.clone()));
        assert!(!contract.is_operator(agent.clone()));

        contract.add_operator(agent.clone());
        assert!(contract.is_operator(agent.clone()));
        assert!(contract.is_authorized(&agent));

        contract.remove_operator(agent.clone());
        assert!(!contract.is_operator(agent.clone()));
    }

    #[test]
    #[should_panic(expected = "Unauthorized: caller must be admin")]
    fn test_unauthorized_add_operator_fails() {
        let admin = account("admin.near");
        let attacker = account("attacker.near");
        set_context(&admin);
        let mut contract = TrustMeshContract::new(Some(admin));

        set_context(&attacker);
        contract.add_operator(account("malicious.near"));
    }

    #[test]
    fn test_create_circle_success() {
        let alice = account("alice.near");
        set_context(&alice);

        let mut contract = TrustMeshContract::new(None);
        let contribution = U128(10_000_000_000_000_000_000_000_000); // 10 NEAR
        let total_rounds = 3;

        let circle_id = contract.create_circle(
            contribution,
            total_rounds,
            Some(604800),
            Some("Weekly Alpha Circle".to_string()),
        );

        assert_eq!(circle_id, 0);
        assert_eq!(contract.get_circle_count(), 1);

        let circle = contract.get_circle(circle_id).expect("Circle not found");
        assert_eq!(circle.id, 0);
        assert_eq!(circle.creator, alice);
        assert_eq!(circle.contribution_amount, contribution);
        assert_eq!(circle.total_rounds, 3);
        assert_eq!(circle.current_round, 0);
        assert_eq!(circle.status, CircleStatus::Open);
        assert_eq!(circle.members, vec![alice]);
        assert_eq!(circle.total_round_pot.0, contribution.0 * 3);
        assert!(circle.deposits_current_round.is_empty());
        assert!(circle.past_winners.is_empty());
    }

    #[test]
    #[should_panic(expected = "Contribution amount must be greater than zero")]
    fn test_create_circle_zero_amount_fails() {
        let alice = account("alice.near");
        set_context(&alice);
        let mut contract = TrustMeshContract::new(None);
        contract.create_circle(U128(0), 3, None, None);
    }

    #[test]
    #[should_panic(expected = "A circle must have at least 2 rounds/members")]
    fn test_create_circle_insufficient_rounds_fails() {
        let alice = account("alice.near");
        set_context(&alice);
        let mut contract = TrustMeshContract::new(None);
        contract.create_circle(U128(100), 1, None, None);
    }

    #[test]
    fn test_join_circle_and_activation() {
        let alice = account("alice.near");
        let bob = account("bob.near");
        let charlie = account("charlie.near");

        set_context(&alice);
        let mut contract = TrustMeshContract::new(None);
        let circle_id = contract.create_circle(U128(100), 3, None, None);

        // Bob joins
        set_context(&bob);
        contract.join_circle(circle_id);

        let circle = contract.get_circle(circle_id).unwrap();
        assert_eq!(circle.members.len(), 2);
        assert_eq!(circle.status, CircleStatus::Open);
        assert_eq!(circle.current_round, 0);

        // Charlie joins, reaching total_rounds (3) -> Auto-activates into Round 1
        set_context(&charlie);
        contract.join_circle(circle_id);

        let circle = contract.get_circle(circle_id).unwrap();
        assert_eq!(circle.members.len(), 3);
        assert_eq!(circle.status, CircleStatus::Active);
        assert_eq!(circle.current_round, 1);
    }

    #[test]
    #[should_panic(expected = "Account is already a member of this circle")]
    fn test_duplicate_join_fails() {
        let alice = account("alice.near");
        set_context(&alice);
        let mut contract = TrustMeshContract::new(None);
        let circle_id = contract.create_circle(U128(100), 3, None, None);

        // Alice tries to join again
        contract.join_circle(circle_id);
    }

    #[test]
    #[should_panic(expected = "Circle has reached maximum member capacity")]
    fn test_join_beyond_capacity_fails() {
        let alice = account("alice.near");
        let bob = account("bob.near");
        let charlie = account("charlie.near");
        let dave = account("dave.near");

        set_context(&alice);
        let mut contract = TrustMeshContract::new(None);
        let circle_id = contract.create_circle(U128(100), 2, None, None);

        set_context(&bob);
        contract.join_circle(circle_id); // Circle becomes full and active

        // Dave tries to join full circle
        set_context(&dave);
        contract.join_circle(circle_id);
    }

    #[test]
    fn test_record_deposit_and_unauthorized_checks() {
        let admin = account("admin.near");
        let agent = account("agent.near");
        let alice = account("alice.near");
        let bob = account("bob.near");

        set_context(&admin);
        let mut contract = TrustMeshContract::new(Some(admin.clone()));
        contract.add_operator(agent.clone());

        // Alice creates circle
        set_context(&alice);
        let circle_id = contract.create_circle(U128(100), 2, None, None);

        // Bob joins -> Circle active
        set_context(&bob);
        contract.join_circle(circle_id);

        // Agent records Alice's deposit
        set_context(&agent);
        contract.record_deposit(circle_id, alice.clone(), Some("0x123abc".to_string()));

        let circle = contract.get_circle(circle_id).unwrap();
        assert!(circle.has_deposited(&alice));
        assert!(!circle.has_deposited(&bob));

        let status = contract
            .get_member_round_status(circle_id, alice.clone())
            .unwrap();
        assert!(status.has_deposited);
        assert!(!status.has_won);
        assert!(status.is_current_winner_candidate);
    }

    #[test]
    #[should_panic(expected = "Unauthorized: caller is not an admin or authorized operator")]
    fn test_unauthorized_record_deposit_fails() {
        let admin = account("admin.near");
        let alice = account("alice.near");
        let bob = account("bob.near");

        set_context(&admin);
        let mut contract = TrustMeshContract::new(Some(admin));

        set_context(&alice);
        let circle_id = contract.create_circle(U128(100), 2, None, None);

        set_context(&bob);
        contract.join_circle(circle_id);

        // Alice tries to record her own deposit without agent role
        set_context(&alice);
        contract.record_deposit(circle_id, alice.clone(), None);
    }

    #[test]
    #[should_panic(expected = "Deposit already recorded for this member in the current round")]
    fn test_duplicate_deposit_fails() {
        let admin = account("admin.near");
        let alice = account("alice.near");
        let bob = account("bob.near");

        set_context(&admin);
        let mut contract = TrustMeshContract::new(Some(admin.clone()));

        set_context(&alice);
        let circle_id = contract.create_circle(U128(100), 2, None, None);

        set_context(&bob);
        contract.join_circle(circle_id);

        set_context(&admin);
        contract.record_deposit(circle_id, alice.clone(), None);
        // Duplicate deposit
        contract.record_deposit(circle_id, alice.clone(), None);
    }

    #[test]
    fn test_complete_circle_rotation_lifecycle() {
        let admin = account("admin.near");
        let alice = account("alice.near");
        let bob = account("bob.near");
        let charlie = account("charlie.near");

        set_context(&admin);
        let mut contract = TrustMeshContract::new(Some(admin.clone()));

        // Step 1: Alice creates a 3-member circle
        set_context(&alice);
        let circle_id = contract.create_circle(U128(500), 3, None, None);

        // Step 2: Bob and Charlie join
        set_context(&bob);
        contract.join_circle(circle_id);

        set_context(&charlie);
        contract.join_circle(circle_id);

        let circle = contract.get_circle(circle_id).unwrap();
        assert_eq!(circle.status, CircleStatus::Active);
        assert_eq!(circle.current_round, 1);

        // ------------------ ROUND 1 ------------------
        set_context(&admin);
        contract.record_deposit(circle_id, alice.clone(), Some("tx_r1_alice".into()));
        contract.record_deposit(circle_id, bob.clone(), Some("tx_r1_bob".into()));
        contract.record_deposit(circle_id, charlie.clone(), Some("tx_r1_charlie".into()));

        // Rotate Round 1: Alice was first member -> Alice wins pot!
        let winner_r1 = contract.rotate_round(circle_id);
        assert_eq!(winner_r1, alice);

        let circle_after_r1 = contract.get_circle(circle_id).unwrap();
        assert_eq!(circle_after_r1.current_round, 2);
        assert_eq!(circle_after_r1.status, CircleStatus::Active);
        assert_eq!(circle_after_r1.past_winners, vec![alice.clone()]);
        // Deposits should be reset for Round 2
        assert!(circle_after_r1.deposits_current_round.is_empty());

        // ------------------ ROUND 2 ------------------
        contract.record_deposit(circle_id, alice.clone(), Some("tx_r2_alice".into()));
        contract.record_deposit(circle_id, bob.clone(), Some("tx_r2_bob".into()));
        contract.record_deposit(circle_id, charlie.clone(), Some("tx_r2_charlie".into()));

        // Rotate Round 2: Bob was second member -> Bob wins pot!
        let winner_r2 = contract.rotate_round(circle_id);
        assert_eq!(winner_r2, bob);

        let circle_after_r2 = contract.get_circle(circle_id).unwrap();
        assert_eq!(circle_after_r2.current_round, 3);
        assert_eq!(circle_after_r2.status, CircleStatus::Active);
        assert_eq!(circle_after_r2.past_winners, vec![alice.clone(), bob.clone()]);
        assert!(circle_after_r2.deposits_current_round.is_empty());

        // ------------------ ROUND 3 ------------------
        contract.record_deposit(circle_id, alice.clone(), Some("tx_r3_alice".into()));
        contract.record_deposit(circle_id, bob.clone(), Some("tx_r3_bob".into()));
        contract.record_deposit(circle_id, charlie.clone(), Some("tx_r3_charlie".into()));

        // Rotate Round 3: Charlie was third member -> Charlie wins pot! Circle completes!
        let winner_r3 = contract.rotate_round(circle_id);
        assert_eq!(winner_r3, charlie);

        let circle_completed = contract.get_circle(circle_id).unwrap();
        assert_eq!(circle_completed.status, CircleStatus::Completed);
        assert_eq!(circle_completed.past_winners, vec![alice, bob, charlie]);
        assert!(circle_completed.deposits_current_round.is_empty());
    }

    #[test]
    #[should_panic(expected = "Cannot rotate round: not all members have deposited for the current round")]
    fn test_premature_rotation_fails() {
        let admin = account("admin.near");
        let alice = account("alice.near");
        let bob = account("bob.near");

        set_context(&admin);
        let mut contract = TrustMeshContract::new(Some(admin.clone()));

        set_context(&alice);
        let circle_id = contract.create_circle(U128(100), 2, None, None);

        set_context(&bob);
        contract.join_circle(circle_id);

        // Only Alice deposits
        set_context(&admin);
        contract.record_deposit(circle_id, alice, None);

        // Attempt rotation before Bob deposits
        contract.rotate_round(circle_id);
    }

    #[test]
    fn test_get_circles_pagination() {
        let alice = account("alice.near");
        set_context(&alice);
        let mut contract = TrustMeshContract::new(None);

        for _ in 0..5 {
            contract.create_circle(U128(100), 2, None, None);
        }

        let first_page = contract.get_circles(Some(0), Some(2));
        assert_eq!(first_page.len(), 2);
        assert_eq!(first_page[0].id, 0);
        assert_eq!(first_page[1].id, 1);

        let second_page = contract.get_circles(Some(2), Some(2));
        assert_eq!(second_page.len(), 2);
        assert_eq!(second_page[0].id, 2);
        assert_eq!(second_page[1].id, 3);

        let last_page = contract.get_circles(Some(4), Some(10));
        assert_eq!(last_page.len(), 1);
        assert_eq!(last_page[0].id, 4);
    }
}

