import assert from "node:assert/strict";
import test from "node:test";
import { splitYocto } from "./policy.js";

const TWO_NEAR = 2_000_000_000_000_000_000_000_000n;

test("a score of 54 holds 30 percent of 2 NEAR", () => {
  const { bond, release } = splitYocto(TWO_NEAR, 3000);
  assert.equal(bond, 600_000_000_000_000_000_000_000n);
  assert.equal(release, 1_400_000_000_000_000_000_000_000n);
});

test("a score of 94 holds nothing", () => {
  const { bond, release } = splitYocto(TWO_NEAR, 0);
  assert.equal(bond, 0n);
  assert.equal(release, TWO_NEAR);
});
