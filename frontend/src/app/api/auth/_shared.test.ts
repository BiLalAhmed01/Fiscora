import test from "node:test";
import assert from "node:assert/strict";

import { isRefreshTokenDead } from "./_shared";

test("isRefreshTokenDead: true only for 401", () => {
  assert.equal(isRefreshTokenDead(401), true);
});

test("isRefreshTokenDead: false for 429 (rate-limited)", () => {
  assert.equal(isRefreshTokenDead(429), false);
});

test("isRefreshTokenDead: false for 5xx (transient backend issue)", () => {
  assert.equal(isRefreshTokenDead(500), false);
  assert.equal(isRefreshTokenDead(503), false);
});

test("isRefreshTokenDead: false for 502 (upstream unreachable)", () => {
  assert.equal(isRefreshTokenDead(502), false);
});
