# 🧪 Test Results Summary (Live Environment)

**Run Timestamp:** 2025-11-07 12:52 IST
**Command:** `yarn test`

## Overview
- **Suites:** 4 total
- **Passed:** 0
- **Failed:** 4
- **Tests:** 13 total (7 passed / 6 failed)

## Key Failures
| Module | Failure | Root Cause |
|--------|---------|------------|
| AI Engine (Unit) | `calculateRSI` boundaries expect >0 and <100 | RSI implementation returns 0/100 for monotonic sequences (logic edge case) |
| Auth Routes (Unit) | Jest worker terminated | Downstream services (PostgreSQL/Redis) exit the process; open handles remain |
| API Integration | `/health` returned 503 | PostgreSQL hostname `primary.postgresql--sg8rdlcdjdjw.addon.code.run` cannot be resolved (ENOTFOUND) |
| E2E Email Auth Flow | Timeout waiting for server | Backend exits with `Redis connection failed` (hostname `master.radis--sg8rdlcdjdjw.addon.code.run` not found) |

## Environment Observations
- **PostgreSQL:** `primary.postgresql--sg8rdlcdjdjw.addon.code.run` → DNS lookup failed (ENOTFOUND).
- **Redis:** `master.radis--sg8rdlcdjdjw.addon.code.run` → DNS lookup failed (ENOTFOUND). Note: hostname contains `radis` (possible typo?).
- **Supabase Auth & Cashfree:** External calls not exercised due to early server exit.

## Outstanding Actions
1. Verify live PostgreSQL hostname (ensure DNS record exists / correct spelling).
2. Verify live Redis hostname (`radis` vs `redis`).
3. Re-run test suite once services resolve correctly.
4. Decide on RSI expectation handling for strict 0/100 outputs.
