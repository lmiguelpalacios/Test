-- Nordlicht — App integration RPCs (import + goods receipt)
-- NEW migration only — does not rewrite applied schema/rls/grants/booking/payment files.
-- Local/repo artifact; remote apply only on approved review project, never handels/TrueFuel.

-- ---------------------------------------------------------------------------
-- record_goods_receipt
-- ---------------------------------------------------------------------------
create or replace function public.record_goods_receipt(
  p_organization_id uuid,
  p_order_id uuid,
  p_receipt_date date,
  p_lines jsonb
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order public.purchase_orders%rowtype;
  v_receipt_id uuid;
  v_number text;
  v_seq int;
  v_line jsonb;
  v_order_line public.purchase_order_lines%rowtype;
  v_qty numeric;
  v_already numeric;
  v_product_id uuid;
  v_tracks boolean;
begin
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;
  if not public.can_write_org(p_organization_id) then
    raise exception 'forbidden';
  end if;

  select * into v_order
  from public.purchase_orders
  where id = p_order_id and organization_id = p_organization_id
  for update;

  if not found then
    raise exception 'purchase order not found';
  end if;
  if v_order.confirmed_at is null then
    raise exception 'order not confirmed';
  end if;
  if p_lines is null or jsonb_typeof(p_lines) <> 'array' or jsonb_array_length(p_lines) = 0 then
    raise exception 'receipt lines required';
  end if;

  v_seq := public.next_document_number(p_organization_id, 'goods_receipt');
  v_number := 'WE-' || to_char(p_receipt_date, 'YYYY') || '-' || lpad(v_seq::text, 4, '0');

  insert into public.goods_receipts (
    organization_id, number, order_id, receipt_date
  ) values (
    p_organization_id, v_number, p_order_id, p_receipt_date
  ) returning id into v_receipt_id;

  for v_line in select * from jsonb_array_elements(p_lines)
  loop
    v_qty := (v_line->>'quantity')::numeric;
    if v_qty is null or v_qty <= 0 then
      raise exception 'invalid receipt quantity';
    end if;

    select * into v_order_line
    from public.purchase_order_lines
    where id = (v_line->>'order_line_id')::uuid
      and organization_id = p_organization_id
      and order_id = p_order_id
    for update;

    if not found then
      raise exception 'order line not found';
    end if;

    select coalesce(sum(grl.quantity), 0) into v_already
    from public.goods_receipt_lines grl
    join public.goods_receipts gr
      on gr.id = grl.receipt_id and gr.organization_id = grl.organization_id
    where grl.organization_id = p_organization_id
      and gr.order_id = p_order_id
      and grl.order_line_id = v_order_line.id;

    if v_already + v_qty > v_order_line.quantity then
      raise exception 'over_delivery: remaining %', (v_order_line.quantity - v_already);
    end if;

    insert into public.goods_receipt_lines (
      organization_id, receipt_id, order_line_id, quantity
    ) values (
      p_organization_id, v_receipt_id, v_order_line.id, v_qty
    );

    v_product_id := v_order_line.product_id;
    if v_product_id is not null then
      select tracks_stock into v_tracks
      from public.products
      where id = v_product_id and organization_id = p_organization_id;
      if coalesce(v_tracks, false) then
        insert into public.stock_movements (
          organization_id, product_id, movement_date, quantity_delta,
          source_type, source_id, note
        ) values (
          p_organization_id, v_product_id, p_receipt_date, v_qty,
          'wareneingang', v_receipt_id::text, v_number
        );
      end if;
    end if;
  end loop;

  update public.purchase_orders
  set updated_at = now()
  where id = p_order_id and organization_id = p_organization_id;

  return v_receipt_id;
end;
$$;

comment on function public.record_goods_receipt(uuid, uuid, date, jsonb) is
  'Atomic WE + lines + stock. Enforces aggregated remaining qty. Negative stock allowed (client parity).';

revoke all on function public.record_goods_receipt(uuid, uuid, date, jsonb) from public, anon;
grant execute on function public.record_goods_receipt(uuid, uuid, date, jsonb) to authenticated;

-- ---------------------------------------------------------------------------
-- import_workspace (Workspace v4 JSON, owner-only, idempotent on content_hash)
-- ---------------------------------------------------------------------------
create or replace function public.import_workspace(
  p_organization_id uuid,
  p_content_hash text,
  p_payload jsonb,
  p_source_label text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_batch_id uuid;
  v_existing uuid;
  v_sales jsonb;
  v_purchase jsonb;
  v_learning jsonb;
  v_entries jsonb;
  v_item jsonb;
  v_line jsonb;
  v_id uuid;
  v_map jsonb := '{}'::jsonb;
  v_cust_id uuid;
  v_prod_id uuid;
  v_sup_id uuid;
  v_inv_id uuid;
  v_order_id uuid;
  v_je_id uuid;
  v_legacy text;
begin
  if v_uid is null then
    raise exception 'not authenticated';
  end if;
  if not public.has_org_role(p_organization_id, array['owner']::text[]) then
    raise exception 'forbidden: owner required';
  end if;
  if p_content_hash is null or length(trim(p_content_hash)) < 16 then
    raise exception 'content_hash required';
  end if;
  if p_payload is null or jsonb_typeof(p_payload) <> 'object' then
    raise exception 'payload required';
  end if;

  select id into v_existing
  from public.import_batches
  where organization_id = p_organization_id and content_hash = p_content_hash;

  if found then
    raise exception 'already_imported:%', v_existing;
  end if;

  insert into public.import_batches (
    organization_id, content_hash, source_label, imported_by
  ) values (
    p_organization_id, p_content_hash, p_source_label, v_uid
  ) returning id into v_batch_id;

  v_entries := coalesce(p_payload->'entries', '[]'::jsonb);
  v_sales := coalesce(p_payload->'sales', '{}'::jsonb);
  v_purchase := coalesce(p_payload->'purchase', '{}'::jsonb);
  v_learning := coalesce(p_payload->'learning', '{}'::jsonb);

  -- Customers
  for v_item in select * from jsonb_array_elements(coalesce(v_sales->'customers', '[]'::jsonb))
  loop
    v_legacy := coalesce(v_item->>'id', gen_random_uuid()::text);
    insert into public.customers (
      organization_id, legacy_id, number, company_name, contact_name, billing_address, email
    ) values (
      p_organization_id,
      v_legacy,
      coalesce(v_item->>'number', 'K-IMP'),
      coalesce(v_item->>'companyName', 'Import'),
      nullif(v_item->>'contactName', ''),
      coalesce(v_item->>'billingAddress', ''),
      nullif(v_item->>'email', '')
    )
    on conflict (organization_id, legacy_id) do update
      set company_name = excluded.company_name
    returning id into v_cust_id;
    v_map := jsonb_set(v_map, array['customer', v_legacy], to_jsonb(v_cust_id::text));
  end loop;

  -- Products
  for v_item in select * from jsonb_array_elements(coalesce(v_sales->'products', '[]'::jsonb))
  loop
    v_legacy := coalesce(v_item->>'id', gen_random_uuid()::text);
    insert into public.products (
      organization_id, legacy_id, sku, name, description,
      net_unit_price_cents, net_purchase_price_cents, vat_rate, tracks_stock, min_stock_quantity
    ) values (
      p_organization_id,
      v_legacy,
      coalesce(v_item->>'sku', 'SKU'),
      coalesce(v_item->>'name', 'Produkt'),
      nullif(v_item->>'description', ''),
      coalesce((v_item->>'netUnitPriceCents')::int, 0),
      coalesce((v_item->>'netPurchasePriceCents')::int, 0),
      coalesce((v_item->>'vatRate')::int, 19),
      coalesce((v_item->>'tracksStock')::boolean, false),
      nullif(v_item->>'minStockQuantity', '')::numeric
    )
    on conflict (organization_id, legacy_id) do update
      set name = excluded.name
    returning id into v_prod_id;
    v_map := jsonb_set(v_map, array['product', v_legacy], to_jsonb(v_prod_id::text));
  end loop;

  -- Suppliers
  for v_item in select * from jsonb_array_elements(coalesce(v_purchase->'suppliers', '[]'::jsonb))
  loop
    v_legacy := coalesce(v_item->>'id', gen_random_uuid()::text);
    insert into public.suppliers (
      organization_id, legacy_id, number, company_name, contact_name, billing_address, email
    ) values (
      p_organization_id,
      v_legacy,
      coalesce(v_item->>'number', 'L-IMP'),
      coalesce(v_item->>'companyName', 'Lieferant'),
      nullif(v_item->>'contactName', ''),
      coalesce(v_item->>'billingAddress', ''),
      nullif(v_item->>'email', '')
    )
    on conflict (organization_id, legacy_id) do update
      set company_name = excluded.company_name
    returning id into v_sup_id;
    v_map := jsonb_set(v_map, array['supplier', v_legacy], to_jsonb(v_sup_id::text));
  end loop;

  -- Journal entries (DEFINER — clients cannot insert)
  for v_item in select * from jsonb_array_elements(v_entries)
  loop
    v_legacy := coalesce(v_item->>'id', gen_random_uuid()::text);
    insert into public.journal_entries (
      organization_id, legacy_id, entry_date, document_number, description,
      debit_account, credit_account, net_amount_cents, vat_rate,
      tax_amount_cents, gross_amount_cents, explanation, created_at
    ) values (
      p_organization_id,
      v_legacy,
      coalesce((v_item->>'date')::date, current_date),
      coalesce(v_item->>'documentNumber', 'IMP-' || left(v_legacy, 8)),
      coalesce(v_item->>'description', 'Import'),
      coalesce(v_item->>'debitAccount', '1200'),
      coalesce(v_item->>'creditAccount', '8400'),
      greatest(coalesce((v_item->>'netAmountCents')::int, 1), 1),
      coalesce((v_item->>'vatRate')::int, 19),
      coalesce((v_item->>'taxAmountCents')::int, 0),
      greatest(coalesce((v_item->>'grossAmountCents')::int, 1), 1),
      coalesce(v_item->>'explanation', ''),
      coalesce((v_item->>'createdAt')::timestamptz, now())
    )
    on conflict (organization_id, legacy_id) do nothing
    returning id into v_je_id;

    if v_je_id is null then
      select id into v_je_id from public.journal_entries
      where organization_id = p_organization_id and legacy_id = v_legacy;
    else
      for v_line in select * from jsonb_array_elements(coalesce(v_item->'lines', '[]'::jsonb))
      loop
        insert into public.journal_lines (
          organization_id, journal_entry_id, account_number, debit_cents, credit_cents
        ) values (
          p_organization_id,
          v_je_id,
          coalesce(v_line->>'accountNumber', '1200'),
          coalesce((v_line->>'debitCents')::int, 0),
          coalesce((v_line->>'creditCents')::int, 0)
        );
      end loop;
    end if;
    v_map := jsonb_set(v_map, array['journal', v_legacy], to_jsonb(v_je_id::text));
  end loop;

  -- Sales invoices (draft or booked header + lines; links if journal ids present)
  for v_item in select * from jsonb_array_elements(coalesce(v_sales->'invoices', '[]'::jsonb))
  loop
    v_legacy := coalesce(v_item->>'id', gen_random_uuid()::text);
    v_cust_id := (v_map #>> array['customer', v_item->>'customerId'])::uuid;
    if v_cust_id is null then
      continue;
    end if;
    insert into public.sales_invoices (
      organization_id, legacy_id, number, issue_date, due_date, customer_id,
      booked_at, created_at, updated_at
    ) values (
      p_organization_id,
      v_legacy,
      coalesce(v_item->>'number', 'AR-IMP'),
      coalesce((v_item->>'issueDate')::date, current_date),
      coalesce((v_item->>'dueDate')::date, current_date),
      v_cust_id,
      nullif(v_item->>'bookedAt', '')::timestamptz,
      coalesce((v_item->>'createdAt')::timestamptz, now()),
      coalesce((v_item->>'updatedAt')::timestamptz, now())
    )
    on conflict (organization_id, legacy_id) do nothing
    returning id into v_inv_id;
    if v_inv_id is null then
      select id into v_inv_id from public.sales_invoices
      where organization_id = p_organization_id and legacy_id = v_legacy;
    else
      for v_line in select * from jsonb_array_elements(coalesce(v_item->'lines', '[]'::jsonb))
      loop
        insert into public.sales_invoice_lines (
          organization_id, invoice_id, product_id, description,
          quantity, net_unit_price_cents, vat_rate
        ) values (
          p_organization_id,
          v_inv_id,
          (v_map #>> array['product', coalesce(v_line->>'productId', '')])::uuid,
          coalesce(v_line->>'description', 'Pos'),
          coalesce((v_line->>'quantity')::numeric, 1),
          coalesce((v_line->>'netUnitPriceCents')::int, 0),
          coalesce((v_line->>'vatRate')::int, 19)
        );
      end loop;
      for v_line in select * from jsonb_array_elements(coalesce(v_item->'journalEntryIds', '[]'::jsonb))
      loop
        v_je_id := (v_map #>> array['journal', trim(both '"' from v_line::text)])::uuid;
        if v_je_id is not null then
          insert into public.document_journal_links (
            organization_id, document_type, document_id, journal_entry_id
          ) values (
            p_organization_id, 'sales_invoice', v_inv_id, v_je_id
          ) on conflict do nothing;
        end if;
      end loop;
    end if;
    v_map := jsonb_set(v_map, array['sales_invoice', v_legacy], to_jsonb(v_inv_id::text));
  end loop;

  -- Sales payments
  for v_item in select * from jsonb_array_elements(coalesce(v_sales->'payments', '[]'::jsonb))
  loop
    v_legacy := coalesce(v_item->>'id', gen_random_uuid()::text);
    v_inv_id := (v_map #>> array['sales_invoice', v_item->>'invoiceId'])::uuid;
    v_je_id := (v_map #>> array['journal', coalesce(v_item->>'journalEntryId', '')])::uuid;
    if v_inv_id is null then
      continue;
    end if;
    insert into public.sales_payments (
      organization_id, legacy_id, invoice_id, payment_date, amount_cents,
      bank_account, reference, journal_entry_id, created_at
    ) values (
      p_organization_id,
      v_legacy,
      v_inv_id,
      coalesce((v_item->>'date')::date, current_date),
      greatest(coalesce((v_item->>'amountCents')::int, 1), 1),
      coalesce(v_item->>'bankAccount', '1200'),
      nullif(v_item->>'reference', ''),
      v_je_id,
      coalesce((v_item->>'createdAt')::timestamptz, now())
    )
    on conflict (organization_id, legacy_id) do nothing;
  end loop;

  -- Purchase orders (minimal)
  for v_item in select * from jsonb_array_elements(coalesce(v_purchase->'orders', '[]'::jsonb))
  loop
    v_legacy := coalesce(v_item->>'id', gen_random_uuid()::text);
    v_sup_id := (v_map #>> array['supplier', v_item->>'supplierId'])::uuid;
    if v_sup_id is null then
      continue;
    end if;
    insert into public.purchase_orders (
      organization_id, legacy_id, number, supplier_id, order_date,
      confirmed_at, created_at, updated_at
    ) values (
      p_organization_id,
      v_legacy,
      coalesce(v_item->>'number', 'PO-IMP'),
      v_sup_id,
      coalesce((v_item->>'orderDate')::date, current_date),
      nullif(v_item->>'confirmedAt', '')::timestamptz,
      coalesce((v_item->>'createdAt')::timestamptz, now()),
      coalesce((v_item->>'updatedAt')::timestamptz, now())
    )
    on conflict (organization_id, legacy_id) do nothing
    returning id into v_order_id;
    if v_order_id is null then
      select id into v_order_id from public.purchase_orders
      where organization_id = p_organization_id and legacy_id = v_legacy;
    else
      for v_line in select * from jsonb_array_elements(coalesce(v_item->'lines', '[]'::jsonb))
      loop
        insert into public.purchase_order_lines (
          organization_id, order_id, legacy_id, product_id, description,
          quantity, net_unit_price_cents, vat_rate, expense_account
        ) values (
          p_organization_id,
          v_order_id,
          coalesce(v_line->>'id', gen_random_uuid()::text),
          (v_map #>> array['product', coalesce(v_line->>'productId', '')])::uuid,
          coalesce(v_line->>'description', 'Pos'),
          coalesce((v_line->>'quantity')::numeric, 1),
          coalesce((v_line->>'netUnitPriceCents')::int, 0),
          coalesce((v_line->>'vatRate')::int, 19),
          coalesce(v_line->>'expenseAccount', '3400')
        );
      end loop;
    end if;
    v_map := jsonb_set(v_map, array['purchase_order', v_legacy], to_jsonb(v_order_id::text));
  end loop;

  -- Vendor invoices (header+lines)
  for v_item in select * from jsonb_array_elements(coalesce(v_purchase->'vendorInvoices', '[]'::jsonb))
  loop
    v_legacy := coalesce(v_item->>'id', gen_random_uuid()::text);
    v_sup_id := (v_map #>> array['supplier', v_item->>'supplierId'])::uuid;
    if v_sup_id is null then
      continue;
    end if;
    insert into public.vendor_invoices (
      organization_id, legacy_id, external_number, internal_number, supplier_id,
      issue_date, due_date, order_id, booked_at, created_at, updated_at
    ) values (
      p_organization_id,
      v_legacy,
      coalesce(v_item->>'externalNumber', 'EXT'),
      coalesce(v_item->>'internalNumber', 'ER-IMP'),
      v_sup_id,
      coalesce((v_item->>'issueDate')::date, current_date),
      coalesce((v_item->>'dueDate')::date, current_date),
      (v_map #>> array['purchase_order', coalesce(v_item->>'orderId', '')])::uuid,
      nullif(v_item->>'bookedAt', '')::timestamptz,
      coalesce((v_item->>'createdAt')::timestamptz, now()),
      coalesce((v_item->>'updatedAt')::timestamptz, now())
    )
    on conflict (organization_id, legacy_id) do nothing
    returning id into v_inv_id;
    if v_inv_id is null then
      select id into v_inv_id from public.vendor_invoices
      where organization_id = p_organization_id and legacy_id = v_legacy;
    else
      for v_line in select * from jsonb_array_elements(coalesce(v_item->'lines', '[]'::jsonb))
      loop
        insert into public.vendor_invoice_lines (
          organization_id, invoice_id, product_id, description,
          quantity, net_unit_price_cents, vat_rate, expense_account
        ) values (
          p_organization_id,
          v_inv_id,
          (v_map #>> array['product', coalesce(v_line->>'productId', '')])::uuid,
          coalesce(v_line->>'description', 'Pos'),
          coalesce((v_line->>'quantity')::numeric, 1),
          coalesce((v_line->>'netUnitPriceCents')::int, 0),
          coalesce((v_line->>'vatRate')::int, 19),
          coalesce(v_line->>'expenseAccount', '3400')
        );
      end loop;
      for v_line in select * from jsonb_array_elements(coalesce(v_item->'journalEntryIds', '[]'::jsonb))
      loop
        v_je_id := (v_map #>> array['journal', trim(both '"' from v_line::text)])::uuid;
        if v_je_id is not null then
          insert into public.document_journal_links (
            organization_id, document_type, document_id, journal_entry_id
          ) values (
            p_organization_id, 'vendor_invoice', v_inv_id, v_je_id
          ) on conflict do nothing;
        end if;
      end loop;
    end if;
    v_map := jsonb_set(v_map, array['vendor_invoice', v_legacy], to_jsonb(v_inv_id::text));
  end loop;

  -- Vendor payments
  for v_item in select * from jsonb_array_elements(coalesce(v_purchase->'vendorPayments', '[]'::jsonb))
  loop
    v_legacy := coalesce(v_item->>'id', gen_random_uuid()::text);
    v_inv_id := (v_map #>> array['vendor_invoice', v_item->>'invoiceId'])::uuid;
    v_je_id := (v_map #>> array['journal', coalesce(v_item->>'journalEntryId', '')])::uuid;
    if v_inv_id is null then
      continue;
    end if;
    insert into public.vendor_payments (
      organization_id, legacy_id, invoice_id, payment_date, amount_cents,
      bank_account, reference, journal_entry_id, created_at
    ) values (
      p_organization_id,
      v_legacy,
      v_inv_id,
      coalesce((v_item->>'date')::date, current_date),
      greatest(coalesce((v_item->>'amountCents')::int, 1), 1),
      coalesce(v_item->>'bankAccount', '1200'),
      nullif(v_item->>'reference', ''),
      v_je_id,
      coalesce((v_item->>'createdAt')::timestamptz, now())
    )
    on conflict (organization_id, legacy_id) do nothing;
  end loop;

  -- Learning progress for importer only
  for v_item in select * from jsonb_array_elements(coalesce(v_learning->'progress', '[]'::jsonb))
  loop
    insert into public.learning_progress (
      organization_id, user_id, task_id, attempts, best_score,
      completed, last_attempt_at, practice_posted_at
    ) values (
      p_organization_id,
      v_uid,
      coalesce(v_item->>'taskId', 'unknown'),
      coalesce((v_item->>'attempts')::int, 0),
      coalesce((v_item->>'bestScore')::int, 0),
      coalesce((v_item->>'completed')::boolean, false),
      nullif(v_item->>'lastAttemptAt', '')::timestamptz,
      nullif(v_item->>'practicePostedAt', '')::timestamptz
    )
    on conflict (user_id, organization_id, task_id) do update
      set attempts = greatest(public.learning_progress.attempts, excluded.attempts),
          best_score = greatest(public.learning_progress.best_score, excluded.best_score),
          completed = public.learning_progress.completed or excluded.completed;
  end loop;

  return v_batch_id;
end;
$$;

comment on function public.import_workspace(uuid, text, jsonb, text) is
  'Owner-only Workspace v4 import. Idempotent on (organization_id, content_hash). Raises already_imported:<batch_id> on retry.';

revoke all on function public.import_workspace(uuid, text, jsonb, text) from public, anon;
grant execute on function public.import_workspace(uuid, text, jsonb, text) to authenticated;
