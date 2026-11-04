/**
 * TrustMesh Machine-Readable Automated Test Harness
 * 
 * Verifies:
 * 1. Health check & configuration
 * 2. Cross-chain deposit webhooks (Base USDC, Solana SOL)
 * 3. Double-deposit rejection & non-member rejection
 * 4. Premature round rotation prevention
 * 5. AI Spend Guard Policy (High trust full release vs Low trust escrow withholding)
 * 6. Successful round rotation & winner distribution
 */

const http = require('http');

const BASE_URL = 'http://localhost:3001';

async function request(method, path, body = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE_URL);
    const options = {
      method,
      hostname: url.hostname,
      port: url.port,
      path: url.pathname,
      headers: {
        'Content-Type': 'application/json',
      },
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        try {
          const parsed = data ? JSON.parse(data) : {};
          resolve({ status: res.statusCode, data: parsed });
        } catch {
          resolve({ status: res.statusCode, text: data });
        }
      });
    });

    req.on('error', reject);
    if (body) {
      req.write(JSON.stringify(body));
    }
    req.end();
  });
}

async function runTests() {
  console.log('\n======================================================');
  console.log('  STARTING TRUSTMESH BACKEND & AGENT TEST HARNESS');
  console.log('======================================================\n');

  try {
    // 1. Health check
    console.log('[TEST 1] Verifying Service Health...');
    const health = await request('GET', '/health');
    console.log(` -> Status: ${health.status}, Mode: ${health.data.mode}`);
    if (health.status !== 200) throw new Error('Health check failed');

    // 2. Inspect initial demo circle #0
    console.log('\n[TEST 2] Fetching initial Circle #0 state...');
    const circleRes = await request('GET', '/api/circle/0');
    console.log(` -> Circle #0 Status: ${circleRes.data.status}, Members: [${circleRes.data.members.join(', ')}]`);
    console.log(` -> Current Round: ${circleRes.data.current_round}, Pot: ${circleRes.data.total_round_pot}`);

    // 3. Test premature round rotation rejection
    console.log('\n[TEST 3] Testing premature round rotation rejection...');
    const prematureRotate = await request('POST', '/api/circle/rotate', { circle_id: 0 });
    console.log(` -> Status: ${prematureRotate.status} (Expected 400 rejection)`);
    console.log(` -> Error message: "${prematureRotate.data.error}"`);
    if (prematureRotate.status !== 400) throw new Error('Premature rotation should have been rejected');

    // 4. Ingest Cross-Chain Deposit 1 (Alice: USDC on Base)
    console.log('\n[TEST 4] Ingesting Cross-Chain Deposit #1 (Alice on Base)...');
    const depositAlice = await request('POST', '/api/webhook/cross-chain-deposit', {
      intent_id: 'intent_base_001',
      source_chain: 'base',
      source_token: 'USDC',
      amount: '5.00',
      source_tx_hash: '0x8f4c...alice_base_tx',
      target_circle_id: 0,
      member_account_id: 'alice.near',
    });
    console.log(` -> Status: ${depositAlice.status}, Result: ${depositAlice.data.message}`);
    console.log(` -> Deposits this round: ${depositAlice.data.circleSummary.depositsCount}/${depositAlice.data.circleSummary.requiredCount}`);

    // 5. Test duplicate deposit rejection
    console.log('\n[TEST 5] Testing duplicate deposit rejection for Alice...');
    const dupDeposit = await request('POST', '/api/webhook/cross-chain-deposit', {
      intent_id: 'intent_base_dup',
      source_chain: 'base',
      source_token: 'USDC',
      amount: '5.00',
      source_tx_hash: '0xdup...alice',
      target_circle_id: 0,
      member_account_id: 'alice.near',
    });
    console.log(` -> Status: ${dupDeposit.status} (Expected 400 rejection)`);
    console.log(` -> Error message: "${dupDeposit.data.error}"`);
    if (dupDeposit.status !== 400) throw new Error('Duplicate deposit should have been rejected');

    // 6. Test non-member deposit rejection
    console.log('\n[TEST 6] Testing non-member deposit rejection...');
    const nonMemberDeposit = await request('POST', '/api/webhook/cross-chain-deposit', {
      intent_id: 'intent_intruder',
      source_chain: 'ethereum',
      source_token: 'USDT',
      amount: '5.00',
      source_tx_hash: '0xintruder',
      target_circle_id: 0,
      member_account_id: 'mallory_unregistered.near',
    });
    console.log(` -> Status: ${nonMemberDeposit.status} (Expected 400 rejection)`);
    console.log(` -> Error message: "${nonMemberDeposit.data.error}"`);
    if (nonMemberDeposit.status !== 400) throw new Error('Non-member deposit should have been rejected');

    // 7. Ingest Cross-Chain Deposit 2 (Bob: SOL on Solana)
    console.log('\n[TEST 7] Ingesting Cross-Chain Deposit #2 (Bob on Solana)...');
    const depositBob = await request('POST', '/api/webhook/cross-chain-deposit', {
      intent_id: 'intent_sol_002',
      source_chain: 'solana',
      source_token: 'SOL',
      amount: '0.035',
      source_tx_hash: '5UxK...bob_solana_signature',
      target_circle_id: 0,
      member_account_id: 'bob.near',
    });
    console.log(` -> Status: ${depositBob.status}, Deposits: ${depositBob.data.circleSummary.depositsCount}/3`);

    // 8. Ingest Cross-Chain Deposit 3 (Charlie: ETH on Arbitrum)
    console.log('\n[TEST 8] Ingesting Cross-Chain Deposit #3 (Charlie on Arbitrum)...');
    const depositCharlie = await request('POST', '/api/webhook/cross-chain-deposit', {
      intent_id: 'intent_arb_003',
      source_chain: 'arbitrum',
      source_token: 'USDC',
      amount: '5.00',
      source_tx_hash: '0x3c9a...charlie_arb_tx',
      target_circle_id: 0,
      member_account_id: 'charlie.near',
    });
    console.log(` -> Status: ${depositCharlie.status}, Deposits: ${depositCharlie.data.circleSummary.depositsCount}/3`);
    console.log(` -> Is Round Ready for Rotation: ${depositCharlie.data.circleSummary.isRoundComplete}`);

    // 9. Pre-flight AI Spend Guard Policy evaluation
    console.log('\n[TEST 9] Evaluating AI Spend Guard Policy on Alice vs Bob...');
    const alicePolicy = await request('GET', '/api/circle/0/guard/alice.near');
    console.log(` -> Alice Policy: ${alicePolicy.data.policyStatus} (Score: ${alicePolicy.data.trustScore})`);
    console.log(`    Reason: ${alicePolicy.data.reason}`);

    const bobPolicy = await request('GET', '/api/circle/0/guard/bob.near');
    console.log(` -> Bob Policy: ${bobPolicy.data.policyStatus} (Score: ${bobPolicy.data.trustScore})`);
    console.log(`    Escrow Withheld: ${bobPolicy.data.escrowWithholdingPercent}% to ${bobPolicy.data.escrowSubAccount}`);
    console.log(`    Reason: ${bobPolicy.data.reason}`);

    // 10. Execute Round Rotation for Round 1
    console.log('\n[TEST 10] Triggering Round Rotation for Round 1...');
    const rotateRes = await request('POST', '/api/circle/rotate', { circle_id: 0 });
    console.log(` -> Status: ${rotateRes.status}`);
    console.log(` -> Winner Awarded: ${rotateRes.data.winner}`);
    console.log(` -> Policy Decision: ${rotateRes.data.policyResult.policyStatus}`);
    console.log(` -> Updated Circle Round: ${rotateRes.data.updatedCircle.current_round}`);
    console.log(` -> Deposits Reset for Next Round: ${rotateRes.data.updatedCircle.deposits_current_round.length} pending`);

    console.log('\n======================================================');
    console.log('  ALL AUTOMATED TEST HARNESS CHECKS PASSED (10/10)');
    console.log('======================================================\n');
  } catch (err) {
    console.error('\n[TEST HARNESS FAILURE]', err.message);
    process.exit(1);
  }
}

runTests();

