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

echo "==> Grants for authenticated (post-migration)"
sudo -u postgres psql -v ON_ERROR_STOP=1 -d "$DB_NAME" <<'SQL' \
  >"${OUT_DIR}/04_grants.stdout" 2>"${OUT_DIR}/04_grants.stderr"
grant select, insert, update, delete on all tables in schema public to authenticated;
grant select on all tables in schema public to anon;
grant usage, select on all sequences in schema public to authenticated;
grant execute on all functions in schema public to authenticated;
-- Re-assert revokes from migrations for sensitive trigger fns
revoke all on function public.handle_new_user() from public, anon, authenticated;
revoke all on function public.assert_journal_entry_balanced() from public, anon, authenticated;
SQL
echo "OK: 04_grants" | tee -a "${OUT_DIR}/summary.txt"

run_sql "${ROOT}/supabase/sql/rpc_booking_stubs.sql" "05_rpc_stubs"

echo "==> Catalog security_checks (non-interactive selects)"
sudo -u postgres psql -v ON_ERROR_STOP=1 -d "$DB_NAME" \
  -f "${ROOT}/supabase/sql/security_checks.sql" \
  >"${OUT_DIR}/06_security_checks.stdout" 2>"${OUT_DIR}/06_security_checks.stderr" || true
echo "OK: 06_security_checks (see stdout; some queries informational)" | tee -a "${OUT_DIR}/summary.txt"

run_sql "${ROOT}/supabase/sql/local_review/10_fixtures_and_negative_tests.sql" "07_negative_tests"

echo "==> Extract review_results"
sudo -u postgres psql -d "$DB_NAME" -c \
  "copy (select case_id, ok, detail from public.review_results order by seq) to stdout with csv header" \
  >"${OUT_DIR}/review_results.csv"

sudo -u postgres psql -d "$DB_NAME" -t -A -c \
  "select count(*) filter (where ok), count(*) filter (where not ok), count(*) from public.review_results" \
  >"${OUT_DIR}/review_results_counts.txt"

echo "DONE. Results in ${OUT_DIR}"
cat "${OUT_DIR}/review_results_counts.txt"
cat "${OUT_DIR}/review_results.csv"
