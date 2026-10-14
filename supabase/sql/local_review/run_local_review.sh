#!/usr/bin/env bash
# Isolated local PostgreSQL review — never touches remote Supabase.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../../.." && pwd)"
DB_NAME="${NORDLICHT_REVIEW_DB:-nordlicht_review_local}"
OUT_DIR="${ROOT}/supabase/sql/local_review/out"
mkdir -p "$OUT_DIR"

export PGHOST="${PGHOST:-/var/run/postgresql}"
export PGUSER="${PGUSER:-postgres}"

echo "==> Recreate database ${DB_NAME}"
sudo -u postgres psql -v ON_ERROR_STOP=1 -c "select pg_terminate_backend(pid) from pg_stat_activity where datname = '${DB_NAME}' and pid <> pg_backend_pid();" >/dev/null 2>&1 || true
sudo -u postgres psql -v ON_ERROR_STOP=1 -c "drop database if exists ${DB_NAME};"
sudo -u postgres psql -v ON_ERROR_STOP=1 -c "create database ${DB_NAME};"

run_sql() {
  local file="$1"
  local label="$2"
  echo "==> ${label}: ${file}"
  sudo -u postgres psql -v ON_ERROR_STOP=1 -d "$DB_NAME" -f "$file" \
    >"${OUT_DIR}/${label}.stdout" 2>"${OUT_DIR}/${label}.stderr" || {
      echo "FAILED: ${label}" | tee -a "${OUT_DIR}/summary.txt"
      cat "${OUT_DIR}/${label}.stderr" | tee -a "${OUT_DIR}/summary.txt"
      return 1
    }
  echo "OK: ${label}" | tee -a "${OUT_DIR}/summary.txt"
}

: >"${OUT_DIR}/summary.txt"

run_sql "${ROOT}/supabase/sql/local_review/00_bootstrap_stubs.sql" "01_bootstrap"
run_sql "${ROOT}/supabase/migrations/20261012120000_nordlicht_schema_v1.sql" "02_schema"
run_sql "${ROOT}/supabase/migrations/20261012120100_nordlicht_rls_v1.sql" "03_rls"

# Phase 1 least-privilege grants (replaces former broad GRANT ALL)
run_sql "${ROOT}/supabase/migrations/20261013140000_nordlicht_grants_v1.sql" "04_grants"

# Phase 2 real booking RPCs (not the five core stubs)
run_sql "${ROOT}/supabase/migrations/20261013140100_nordlicht_booking_rpcs_v1.sql" "05_booking_rpcs"

# Remaining stubs only (goods_receipt / learning / import) — does NOT redefine core five
run_sql "${ROOT}/supabase/sql/rpc_booking_stubs.sql" "05b_remaining_stubs"

echo "==> Catalog security_checks (non-interactive selects)"
sudo -u postgres psql -v ON_ERROR_STOP=1 -d "$DB_NAME" \
  -f "${ROOT}/supabase/sql/security_checks.sql" \
  >"${OUT_DIR}/06_security_checks.stdout" 2>"${OUT_DIR}/06_security_checks.stderr" || true
echo "OK: 06_security_checks (see stdout; Expect-0 queries should be empty)" | tee -a "${OUT_DIR}/summary.txt"

run_sql "${ROOT}/supabase/sql/local_review/10_fixtures_and_negative_tests.sql" "07_negative_tests"
run_sql "${ROOT}/supabase/sql/local_review/20_booking_rpc_tests.sql" "08_booking_rpc_tests"

echo "==> Extract review_results"
sudo -u postgres psql -d "$DB_NAME" -c \
  "copy (select case_id, ok, detail from public.review_results order by seq) to stdout with csv header" \
  >"${OUT_DIR}/review_results.csv"

sudo -u postgres psql -d "$DB_NAME" -t -A -c \
  "select count(*) filter (where ok), count(*) filter (where not ok), count(*) from public.review_results" \
  >"${OUT_DIR}/review_results_counts.txt"

echo "==> Extract booking_rpc_results"
sudo -u postgres psql -d "$DB_NAME" -c \
  "copy (select case_id, ok, detail from public.booking_rpc_results order by seq) to stdout with csv header" \
  >"${OUT_DIR}/booking_rpc_results.csv" 2>/dev/null || echo "case_id,ok,detail" >"${OUT_DIR}/booking_rpc_results.csv"

sudo -u postgres psql -d "$DB_NAME" -t -A -c \
  "select count(*) filter (where ok), count(*) filter (where not ok), count(*) from public.booking_rpc_results" \
  >"${OUT_DIR}/booking_rpc_results_counts.txt" 2>/dev/null || echo "0|0|0" >"${OUT_DIR}/booking_rpc_results_counts.txt"

echo "DONE. Results in ${OUT_DIR}"
echo "--- negative tests (pass|fail|total) ---"
cat "${OUT_DIR}/review_results_counts.txt"
echo "--- booking rpc tests (pass|fail|total) ---"
cat "${OUT_DIR}/booking_rpc_results_counts.txt"
echo "--- summary ---"
cat "${OUT_DIR}/summary.txt"
