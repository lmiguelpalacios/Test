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

# Payment natural-key unique indexes (idempotency hardening; local only here)
run_sql "${ROOT}/supabase/migrations/20261014100000_nordlicht_payment_idempotency_v1.sql" "05c_payment_idempotency"

# Remaining stubs only (goods_receipt / learning / import) — does NOT redefine core five
run_sql "${ROOT}/supabase/sql/rpc_booking_stubs.sql" "05b_remaining_stubs"

echo "==> Catalog security_checks (non-interactive selects)"
sudo -u postgres psql -v ON_ERROR_STOP=1 -d "$DB_NAME" \
  -f "${ROOT}/supabase/sql/security_checks.sql" \
  >"${OUT_DIR}/06_security_checks.stdout" 2>"${OUT_DIR}/06_security_checks.stderr" || true
echo "OK: 06_security_checks (see stdout; Expect-0 queries should be empty)" | tee -a "${OUT_DIR}/summary.txt"

run_sql "${ROOT}/supabase/sql/local_review/10_fixtures_and_negative_tests.sql" "07_negative_tests"
run_sql "${ROOT}/supabase/sql/local_review/20_booking_rpc_tests.sql" "08_booking_rpc_tests"
run_sql "${ROOT}/supabase/sql/local_review/30_payment_idempotency_tests.sql" "09_payment_idempotency"

# Parallel same-key payment stress: two concurrent psql sessions (local PG only)
echo "==> 10_payment_parallel (two concurrent sessions)"
SEED_LINE="$(sudo -u postgres psql -d "$DB_NAME" -At -F '|' -c \
  "select organization_id, invoice_id, payment_date, amount_cents, bank_account, reference
   from public._pay_idem_parallel_seed limit 1;")"
IFS='|' read -r SEED_ORG SEED_INV SEED_DATE SEED_AMT SEED_BANK SEED_REF <<<"$SEED_LINE"

parallel_pay() {
  local label="$1"
  # Single SELECT result only: JWT claim via subquery; role via SET before txn.
  sudo -u postgres psql -v ON_ERROR_STOP=1 -d "$DB_NAME" -At \
    -v org="$SEED_ORG" -v inv="$SEED_INV" -v pdate="$SEED_DATE" \
    -v amt="$SEED_AMT" -v bank="$SEED_BANK" -v ref="$SEED_REF" <<'SQL' \
    >"${OUT_DIR}/${label}.stdout" 2>"${OUT_DIR}/${label}.stderr"
select set_config('request.jwt.claim.sub', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa3', false);
set role authenticated;
select public.record_sales_payment(
  :'org'::uuid,
  :'inv'::uuid,
  :'pdate'::date,
  :'amt'::int,
  :'bank',
  :'ref'
);
SQL
}
parallel_pay "10a_parallel_pay_a" &
pid_a=$!
parallel_pay "10b_parallel_pay_b" &
pid_b=$!
wait "$pid_a"
rc_a=$?
wait "$pid_b"
rc_b=$?

# Last UUID line = payment id (ignore set_config echo)
pay_a="$(grep -Eo '[0-9a-f-]{36}' "${OUT_DIR}/10a_parallel_pay_a.stdout" | tail -1 || true)"
pay_b="$(grep -Eo '[0-9a-f-]{36}' "${OUT_DIR}/10b_parallel_pay_b.stdout" | tail -1 || true)"
row_count="$(sudo -u postgres psql -d "$DB_NAME" -At -c \
  "select count(*) from public.sales_payments p
   join public._pay_idem_parallel_seed s on s.invoice_id = p.invoice_id
   where p.amount_cents = s.amount_cents
     and p.bank_account = s.bank_account
     and coalesce(p.reference,'') = s.reference;")"

if [[ "$rc_a" -eq 0 && "$rc_b" -eq 0 && -n "$pay_a" && -n "$pay_b" \
      && "$pay_a" == "$pay_b" && "$row_count" == "1" ]]; then
  echo "OK: 10_payment_parallel (ids=${pay_a}; rows=${row_count})" | tee -a "${OUT_DIR}/summary.txt"
  sudo -u postgres psql -d "$DB_NAME" -v ON_ERROR_STOP=1 -c \
    "select public.pay_idem_expect('ZE_PARALLEL_TWO_SESSIONS', true,
       format('id=%s rows=%s', '${pay_a}', ${row_count}));" >/dev/null
else
  echo "FAILED: 10_payment_parallel rc_a=${rc_a} rc_b=${rc_b} a=${pay_a} b=${pay_b} rows=${row_count}" \
    | tee -a "${OUT_DIR}/summary.txt"
  sudo -u postgres psql -d "$DB_NAME" -c \
    "select public.pay_idem_expect('ZE_PARALLEL_TWO_SESSIONS', false,
       format('rc_a=%s rc_b=%s a=%s b=%s rows=%s',
         ${rc_a}, ${rc_b}, coalesce(nullif('${pay_a}',''),'?'),
         coalesce(nullif('${pay_b}',''),'?'), '${row_count}'));" >/dev/null || true
  cat "${OUT_DIR}/10a_parallel_pay_a.stderr" "${OUT_DIR}/10b_parallel_pay_b.stderr" \
    | tee -a "${OUT_DIR}/summary.txt" || true
fi

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

echo "==> Extract payment_idempotency_results"
sudo -u postgres psql -d "$DB_NAME" -c \
  "copy (select case_id, ok, detail from public.payment_idempotency_results order by seq) to stdout with csv header" \
  >"${OUT_DIR}/payment_idempotency_results.csv" 2>/dev/null \
  || echo "case_id,ok,detail" >"${OUT_DIR}/payment_idempotency_results.csv"

sudo -u postgres psql -d "$DB_NAME" -t -A -c \
  "select count(*) filter (where ok), count(*) filter (where not ok), count(*) from public.payment_idempotency_results" \
  >"${OUT_DIR}/payment_idempotency_results_counts.txt" 2>/dev/null \
  || echo "0|0|0" >"${OUT_DIR}/payment_idempotency_results_counts.txt"

echo "DONE. Results in ${OUT_DIR}"
echo "--- negative tests (pass|fail|total) ---"
cat "${OUT_DIR}/review_results_counts.txt"
echo "--- booking rpc tests (pass|fail|total) ---"
cat "${OUT_DIR}/booking_rpc_results_counts.txt"
echo "--- payment idempotency (pass|fail|total) ---"
cat "${OUT_DIR}/payment_idempotency_results_counts.txt"
echo "--- summary ---"
cat "${OUT_DIR}/summary.txt"
