-- Schulkontenrahmen Industrie (KontenplanFibu.pdf)
-- Inserts missing template and organization accounts.
-- Does not delete journal lines and does not rewrite historical account numbers on journal rows.
-- Legacy org accounts (1200, 3400, …) stay so existing lines keep their numbers.
-- New bookings use 240/44/280/282/501/608/260/480.

insert into public.account_templates (number, name, account_type, account_group) values
('00', 'Ausstehende Einlagen', 'aktiv', 'Anlagevermögen'),
  ('01', 'Aufwendungen für Ingangsetzung', 'aktiv', 'Anlagevermögen'),
  ('02', 'Konzessionen, gewerbliche Schutzrechte und ähnliche Rechte und Werte sowie Lizenzen an solchen Rechten und Werten', 'aktiv', 'Anlagevermögen'),
  ('03', 'Geschäfts- oder Firmenwert', 'aktiv', 'Anlagevermögen'),
  ('05', 'Grundstücke, grundstücksgleiche Rechte und Bauten einschließlich der Bauten auf fremden Grundstücken', 'aktiv', 'Anlagevermögen'),
  ('07', 'Technische Anlagen und Maschinen', 'aktiv', 'Anlagevermögen'),
  ('070', 'Technische Anlagen', 'aktiv', 'Anlagevermögen'),
  ('071', 'Maschinen', 'aktiv', 'Anlagevermögen'),
  ('08', 'Andere Anlagen, Betriebs- und Geschäftsausstattung', 'aktiv', 'Anlagevermögen'),
  ('080', 'Andere Anlagen', 'aktiv', 'Anlagevermögen'),
  ('082', 'Werkzeuge', 'aktiv', 'Anlagevermögen'),
  ('083', 'Lager- und Transporteinrichtungen', 'aktiv', 'Anlagevermögen'),
  ('084', 'Fuhrpark', 'aktiv', 'Anlagevermögen'),
  ('085', 'Betriebsausstattung', 'aktiv', 'Anlagevermögen'),
  ('087', 'Geschäftsausstattung', 'aktiv', 'Anlagevermögen'),
  ('089', 'Geringwertige Wirtschaftsgüter', 'aktiv', 'Anlagevermögen'),
  ('09', 'Geleistete Anzahlungen und Anlagen im Bau', 'aktiv', 'Anlagevermögen'),
  ('090', 'Geleistete Anzahlungen auf Sachanlagen', 'aktiv', 'Anlagevermögen'),
  ('095', 'Anlagen im Bau', 'aktiv', 'Anlagevermögen'),
  ('13', 'Beteiligungen', 'aktiv', 'Anlagevermögen'),
  ('15', 'Wertpapiere des Anlagevermögens', 'aktiv', 'Anlagevermögen'),
  ('16', 'Sonstige Finanzanlagen (z.B. Darlehensforderungen)', 'aktiv', 'Anlagevermögen'),
  ('20', 'Roh-, Hilfs- und Betriebsstoffe und Fremdbauteile', 'aktiv', 'Umlaufvermögen'),
  ('200', 'Rohstoffe und Fremdbauteile', 'aktiv', 'Umlaufvermögen'),
  ('2001', 'Bezugskosten', 'aktiv', 'Umlaufvermögen'),
  ('2002', 'Preisnachlässe und Rücksendungen', 'aktiv', 'Umlaufvermögen'),
  ('2003', 'Liefererskonti', 'aktiv', 'Umlaufvermögen'),
  ('2004', 'Liefererboni', 'aktiv', 'Umlaufvermögen'),
  ('202', 'Hilfsstoffe', 'aktiv', 'Umlaufvermögen'),
  ('203', 'Betriebsstoffe', 'aktiv', 'Umlaufvermögen'),
  ('204', 'Sonstiges Material (z.B. Verpackungsmaterial)', 'aktiv', 'Umlaufvermögen'),
  ('21', 'Unfertige Erzeugnisse', 'aktiv', 'Umlaufvermögen'),
  ('22', 'Fertige Erzeugnisse und Waren', 'aktiv', 'Umlaufvermögen'),
  ('220', 'Fertige Erzeugnisse', 'aktiv', 'Umlaufvermögen'),
  ('221', 'Handelswaren', 'aktiv', 'Umlaufvermögen'),
  ('23', 'Geleistete Anzahlungen auf Vorräte', 'aktiv', 'Umlaufvermögen'),
  ('24', 'Forderungen', 'aktiv', 'Forderungen'),
  ('240', 'Forderungen aus Lieferungen und Leistungen (oder Debitor)', 'aktiv', 'Forderungen'),
  ('241', 'Zweifelhafte Forderungen', 'aktiv', 'Forderungen'),
  ('245', 'Wechselforderungen (Besitzwechsel)', 'aktiv', 'Forderungen'),
  ('26', 'Sonstige Vermögensgegenstände', 'aktiv', 'Umlaufvermögen'),
  ('260', 'Vorsteuer', 'aktiv', 'Steuerkonten'),
  ('263', 'Sonstige Forderungen an Finanzbehörden', 'aktiv', 'Umlaufvermögen'),
  ('264', 'Vorauszahlung Sozialversicherung', 'aktiv', 'Umlaufvermögen'),
  ('265', 'Forderungen an Mitarbeiter (z.B. Vorschüsse)', 'aktiv', 'Umlaufvermögen'),
  ('269', 'Sonstige Forderungen (Jahresabgrenzung)', 'aktiv', 'Umlaufvermögen'),
  ('27', 'Wertpapiere des Umlaufvermögens', 'aktiv', 'Umlaufvermögen'),
  ('28', 'Flüssige Mittel', 'aktiv', 'Finanzkonten'),
  ('280', 'Guthaben bei Kreditinstituten (Bank)', 'aktiv', 'Finanzkonten'),
  ('282', 'Kasse', 'aktiv', 'Finanzkonten'),
  ('29', 'Rechnungsabgrenzung', 'aktiv', 'Umlaufvermögen'),
  ('290', 'Aktive Rechnungsabgrenzung (Jahresabgrenzung)', 'aktiv', 'Umlaufvermögen'),
  ('291', 'Disagio', 'aktiv', 'Umlaufvermögen'),
  ('30', 'Eigenkapital/Gezeichnetes Kapital', 'passiv', 'Eigenkapital'),
  ('300', 'Eigenkapital / Kapital A / Gezeichnetes Kapital', 'passiv', 'Eigenkapital'),
  ('3001', 'Privat / Privat A', 'passiv', 'Eigenkapital'),
  ('301', 'Kapital B', 'passiv', 'Eigenkapital'),
  ('3011', 'Privat B', 'passiv', 'Eigenkapital'),
  ('307', 'Kommanditkapital C', 'passiv', 'Eigenkapital'),
  ('308', 'Kommanditkapital D', 'passiv', 'Eigenkapital'),
  ('31', 'Kapitalrücklage', 'passiv', 'Eigenkapital'),
  ('32', 'Gewinnrücklagen', 'passiv', 'Eigenkapital'),
  ('321', 'gesetzliche Rücklage', 'passiv', 'Eigenkapital'),
  ('322', 'Rücklage für eigene Anteile', 'passiv', 'Eigenkapital'),
  ('323', 'satzungsmäßige Rücklagen', 'passiv', 'Eigenkapital'),
  ('324', 'andere Gewinnrücklagen', 'passiv', 'Eigenkapital'),
  ('33', 'Ergebnisverwendung', 'passiv', 'Eigenkapital'),
  ('332', 'Ergebnisvortrag aus früheren Perioden', 'passiv', 'Eigenkapital'),
  ('335', 'Bilanzergebnis (Bilanzgewinn/Bilanzverlust)', 'passiv', 'Eigenkapital'),
  ('339', 'Ergebnisvortrag auf neue Rechnung', 'passiv', 'Eigenkapital'),
  ('34', 'Jahresüberschuss/Jahresfehlbetrag', 'passiv', 'Eigenkapital'),
  ('35', 'Sonderposten mit Rücklageanteil', 'passiv', 'Eigenkapital'),
  ('36', 'Wertberichtigungen', 'passiv', 'Verbindlichkeiten'),
  ('361', 'Wertberichtigungen zu Sachanlagen', 'passiv', 'Verbindlichkeiten'),
  ('367', 'Einzelwertberichtigung zu Forderungen', 'passiv', 'Verbindlichkeiten'),
  ('368', 'Pauschalwertberichtigungen zu Forderungen', 'passiv', 'Verbindlichkeiten'),
  ('37', 'Rückstellungen für Pensionen und ähnliche Verpflichtungen', 'passiv', 'Verbindlichkeiten'),
  ('38', 'Steuerrückstellungen', 'passiv', 'Verbindlichkeiten'),
  ('39', 'Sonstige Rückstellungen (z.B. für Gewährleistung)', 'passiv', 'Verbindlichkeiten'),
  ('41', 'Anleihen', 'passiv', 'Verbindlichkeiten'),
  ('42', 'Verbindlichkeiten gegenüber Kreditinstituten', 'passiv', 'Verbindlichkeiten'),
  ('43', 'Erhaltene Anzahlungen auf Bestellungen', 'passiv', 'Verbindlichkeiten'),
  ('44', 'Verbindlichkeiten aus Lieferungen und Leistungen (oder Kreditor)', 'passiv', 'Verbindlichkeiten'),
  ('45', 'Wechselverbindlichkeiten (Schuldwechsel)', 'passiv', 'Verbindlichkeiten'),
  ('48', 'Sonstige Verbindlichkeiten', 'passiv', 'Verbindlichkeiten'),
  ('480', 'Umsatzsteuer', 'passiv', 'Steuerkonten'),
  ('483', 'Sonstige Verbindlichkeiten gegenüber Finanzbehörden (z.B. abzuführende Lohnsteuer)', 'passiv', 'Verbindlichkeiten'),
  ('484', 'Verbindlichkeiten gegenüber Sozialversicherungsträgern', 'passiv', 'Verbindlichkeiten'),
  ('485', 'Verbindlichkeiten gegenüber Mitarbeitern', 'passiv', 'Verbindlichkeiten'),
  ('486', 'Verbindlichkeiten aus vermögenswirksamen Leistungen', 'passiv', 'Verbindlichkeiten'),
  ('489', 'Sonstige Verbindlichkeiten (Jahresabgrenzung)', 'passiv', 'Verbindlichkeiten'),
  ('49', 'Passive Rechnungsabgrenzung (Jahresabgrenzung)', 'passiv', 'Verbindlichkeiten'),
  ('50', 'Umsatzerlöse', 'ertrag', 'Erträge'),
  ('500', 'Umsatzerlöse für Erzeugnisse und Leistungen', 'ertrag', 'Erträge'),
  ('5001', 'Preisnachlässe und Rücksendungen', 'ertrag', 'Erträge'),
  ('5002', 'Kundenskonti', 'ertrag', 'Erträge'),
  ('5003', 'Kundenboni', 'ertrag', 'Erträge'),
  ('501', 'Umsatzerlöse für Handelswaren', 'ertrag', 'Erträge'),
  ('52', 'Erhöhung oder Verminderung des Bestandes an unfertigen und fertigen Erzeugnissen', 'ertrag', 'Erträge'),
  ('521', 'Bestandsveränderungen an unfertigen Erzeugnissen', 'ertrag', 'Erträge'),
  ('522', 'Bestandsveränderungen an fertigen Erzeugnissen', 'ertrag', 'Erträge'),
  ('53', 'Andere aktivierte Eigenleistungen', 'ertrag', 'Erträge'),
  ('54', 'Sonstige betriebliche Erträge', 'ertrag', 'Erträge'),
  ('540', 'Erträge aus Vermietung und Verpachtung', 'ertrag', 'Erträge'),
  ('541', 'Provisionserträge', 'ertrag', 'Erträge'),
  ('542', 'Unentgeltliche Wertabgaben', 'ertrag', 'Erträge'),
  ('543', 'Andere sonstige betriebliche Erträge', 'ertrag', 'Erträge'),
  ('544', 'Erträge aus Werterhöhungen von Gegenständen des Anlagevermögens (Zuschreibungen)', 'ertrag', 'Erträge'),
  ('545', 'Erträge aus der Auflösung oder Herabsetzung von Wertberichtigungen auf Forderungen', 'ertrag', 'Erträge'),
  ('546', 'Erträge aus dem Abgang von Sachgegenständen des Sachanlagevermögens', 'ertrag', 'Erträge'),
  ('5461', 'Erlöse aus dem Abgang von Gegenständen des Sachanlagevermögens bei Buchgewinn (Verrechnung mit Konto 546)', 'ertrag', 'Erträge'),
  ('547', 'Erlöse aus direkt abgeschriebenen Forderungen', 'ertrag', 'Erträge'),
  ('548', 'Erträge aus der Auflösung oder Herabsetzung von Rückstellungen', 'ertrag', 'Erträge'),
  ('549', 'Andere periodenfremde Erträge', 'ertrag', 'Erträge'),
  ('55', 'Erträge aus Beteiligungen', 'ertrag', 'Erträge'),
  ('56', 'Erträge aus anderen Finanzanlagen', 'ertrag', 'Erträge'),
  ('57', 'Sonstige Zinsen und ähnliche Erträge', 'ertrag', 'Erträge'),
  ('571', 'Zinserträge', 'ertrag', 'Erträge'),
  ('573', 'Diskonterträge', 'ertrag', 'Erträge'),
  ('578', 'Erträge aus Wertpapieren des Umlaufvermögens', 'ertrag', 'Erträge'),
  ('58', 'Außerordentliche Erträge', 'ertrag', 'Erträge'),
  ('60', 'Aufwendungen für Roh-, Hilfs- und Betriebsstoffe und für bezogene Waren', 'aufwand', 'Aufwendungen'),
  ('600', 'Aufwendungen für Rohstoffe und Fremdbauteile (Fertigungsmaterial)', 'aufwand', 'Aufwendungen'),
  ('6001', 'Bezugskosten', 'aufwand', 'Aufwendungen'),
  ('6002', 'Preisnachlässe und Rücksendungen', 'aufwand', 'Aufwendungen'),
  ('6003', 'Lieferskonti', 'aufwand', 'Aufwendungen'),
  ('6004', 'Lieferboni', 'aufwand', 'Aufwendungen'),
  ('602', 'Aufwendungen für Hilfsstoffe', 'aufwand', 'Aufwendungen'),
  ('603', 'Aufwendungen für Betriebsstoffe', 'aufwand', 'Aufwendungen'),
  ('604', 'Aufwendungen für sonstiges Material (z.B. Verpackungsmaterial)', 'aufwand', 'Aufwendungen'),
  ('605', 'Aufwendungen für Energie und Treibstoffe', 'aufwand', 'Aufwendungen'),
  ('608', 'Aufwendungen für Handelswaren', 'aufwand', 'Aufwendungen'),
  ('61', 'Aufwendungen für bezogene Leistungen', 'aufwand', 'Aufwendungen'),
  ('610', 'Fremdleistungen für Erzeugnisse', 'aufwand', 'Aufwendungen'),
  ('613', 'Instandhaltung und Reparaturen', 'aufwand', 'Aufwendungen'),
  ('614', 'Frachten und Fremdlager', 'aufwand', 'Aufwendungen'),
  ('615', 'Vertriebsprovisionen', 'aufwand', 'Aufwendungen'),
  ('617', 'Sonstige Aufwendungen für bezogene Leistungen', 'aufwand', 'Aufwendungen'),
  ('62', 'Löhne', 'aufwand', 'Aufwendungen'),
  ('63', 'Gehälter', 'aufwand', 'Aufwendungen'),
  ('64', 'Soziale Abgaben und Aufwendungen für Altersversorgung und Unterstützung', 'aufwand', 'Aufwendungen'),
  ('640', 'Arbeitgeberanteil zur Sozialversicherung', 'aufwand', 'Aufwendungen'),
  ('642', 'Beiträge zur Berufsgenossenschaft', 'aufwand', 'Aufwendungen'),
  ('644', 'Aufwendungen für Altersversorgung', 'aufwand', 'Aufwendungen'),
  ('649', 'Aufwendungen für Unterstützung', 'aufwand', 'Aufwendungen'),
  ('65', 'Abschreibungen', 'aufwand', 'Aufwendungen'),
  ('650', 'Abschreibungen auf Sachanlagen', 'aufwand', 'Aufwendungen'),
  ('651', 'Abschreibungen auf immaterielle Vermögensgegenstände des Anlagevermögens', 'aufwand', 'Aufwendungen'),
  ('652', 'Abschreibungen für Aufwendungen der Ingangsetzung', 'aufwand', 'Aufwendungen'),
  ('653', 'Abschreibungen auf Vermögensgegenstände des Umlaufvermögens, soweit diese die üblichen Abschreibungen überschreiten', 'aufwand', 'Aufwendungen'),
  ('654', 'Abschreibungen auf geringwertige Wirtschaftsgüter', 'aufwand', 'Aufwendungen'),
  ('66', 'Sonstige Personalaufwendungen', 'aufwand', 'Aufwendungen'),
  ('67', 'Aufwendungen für die Inanspruchnahme von Rechten und Diensten', 'aufwand', 'Aufwendungen'),
  ('670', 'Mieten, Pachten', 'aufwand', 'Aufwendungen'),
  ('671', 'Leasing', 'aufwand', 'Aufwendungen'),
  ('675', 'Kosten des Geldverkehrs', 'aufwand', 'Aufwendungen'),
  ('677', 'Rechts- und Beratungskosten', 'aufwand', 'Aufwendungen'),
  ('679', 'Sonstige Aufwendungen für die Inanspruchnahme von Rechten und Diensten', 'aufwand', 'Aufwendungen'),
  ('68', 'Aufwendungen für Kommunikation', 'aufwand', 'Aufwendungen'),
  ('680', 'Büromaterial', 'aufwand', 'Aufwendungen'),
  ('682', 'Gebühren', 'aufwand', 'Aufwendungen'),
  ('685', 'Reisekosten', 'aufwand', 'Aufwendungen'),
  ('686', 'Bewirtung und Repräsentation', 'aufwand', 'Aufwendungen'),
  ('687', 'Werbung', 'aufwand', 'Aufwendungen'),
  ('688', 'Spenden', 'aufwand', 'Aufwendungen'),
  ('689', 'Sonstige Aufwendungen für Kommunikation', 'aufwand', 'Aufwendungen'),
  ('69', 'Aufwendungen für Beiträge und Sonstiges sowie Wertkorrekturen und periodenfremde Aufwendungen', 'aufwand', 'Aufwendungen'),
  ('690', 'Versicherungsbeiträge', 'aufwand', 'Aufwendungen'),
  ('692', 'Beiträge zu Wirtschaftsverbänden und Berufsvertretungen', 'aufwand', 'Aufwendungen'),
  ('693', 'Verluste aus Schadensfällen', 'aufwand', 'Aufwendungen'),
  ('695', 'Abschreibungen auf Forderungen', 'aufwand', 'Aufwendungen'),
  ('6951', 'Abschreibungen auf Forderungen wegen Uneinbringlichkeit', 'aufwand', 'Aufwendungen'),
  ('6952', 'Einstellung in Einzelwertberichtigungen', 'aufwand', 'Aufwendungen'),
  ('6953', 'Einstellung in Pauschalwertberichtigungen', 'aufwand', 'Aufwendungen'),
  ('696', 'Verluste aus dem Abgang von Gegenständen des Sachanlagevermögens', 'aufwand', 'Aufwendungen'),
  ('6961', 'Erlöse aus dem Abgang von Gegenständen des Sachanlagevermögens bei Buchverlust (Verrechnung mit Konto 696)', 'aufwand', 'Aufwendungen'),
  ('698', 'Zuführung zu Rückstellungen für Gewährleistung', 'aufwand', 'Aufwendungen'),
  ('699', 'Periodenfremde Aufwendungen', 'aufwand', 'Aufwendungen'),
  ('70', 'Betriebliche Steuern', 'aufwand', 'Aufwendungen'),
  ('702', 'Grundsteuer', 'aufwand', 'Aufwendungen'),
  ('703', 'Kraftfahrzeugsteuer', 'aufwand', 'Aufwendungen'),
  ('707', 'Verbrauchsteuern', 'aufwand', 'Aufwendungen'),
  ('708', 'Sonstige betriebliche Steuern', 'aufwand', 'Aufwendungen'),
  ('709', 'Steuernachzahlungen und -rückerstattungen bei betrieblichen Steuern', 'aufwand', 'Aufwendungen'),
  ('74', 'Abschreibungen auf Finanzanlagen und auf Wertpapiere des Umlaufvermögens', 'aufwand', 'Aufwendungen'),
  ('75', 'Zinsen und ähnliche Aufwendungen', 'aufwand', 'Aufwendungen'),
  ('751', 'Zinsaufwendungen', 'aufwand', 'Aufwendungen'),
  ('753', 'Diskontaufwendungen', 'aufwand', 'Aufwendungen'),
  ('76', 'Außerordentliche Aufwendungen', 'aufwand', 'Aufwendungen'),
  ('77', 'Steuern vom Einkommen und Ertrag', 'aufwand', 'Aufwendungen'),
  ('770', 'Gewerbesteuer', 'aufwand', 'Aufwendungen'),
  ('771', 'Körperschaftsteuer', 'aufwand', 'Aufwendungen'),
  ('772', 'Kapitalertragsteuer', 'aufwand', 'Aufwendungen'),
  ('779', 'Steuernachzahlungen und -rückerstattungen bei Steuern vom Einkommen und Ertrag', 'aufwand', 'Aufwendungen'),
  ('80', 'Eröffnung/Abschluss', 'passiv', 'Eigenkapital'),
  ('800', 'Eröffnungsbilanz', 'passiv', 'Eigenkapital'),
  ('801', 'Schlussbilanz', 'passiv', 'Eigenkapital'),
  ('802', 'G+V', 'passiv', 'Eigenkapital')
on conflict (number) do update
  set name = excluded.name,
      account_type = excluded.account_type,
      account_group = excluded.account_group;

delete from public.account_templates
where number not in ('00', '01', '02', '03', '05', '07', '070', '071', '08', '080', '082', '083', '084', '085', '087', '089', '09', '090', '095', '13', '15', '16', '20', '200', '2001', '2002', '2003', '2004', '202', '203', '204', '21', '22', '220', '221', '23', '24', '240', '241', '245', '26', '260', '263', '264', '265', '269', '27', '28', '280', '282', '29', '290', '291', '30', '300', '3001', '301', '3011', '307', '308', '31', '32', '321', '322', '323', '324', '33', '332', '335', '339', '34', '35', '36', '361', '367', '368', '37', '38', '39', '41', '42', '43', '44', '45', '48', '480', '483', '484', '485', '486', '489', '49', '50', '500', '5001', '5002', '5003', '501', '52', '521', '522', '53', '54', '540', '541', '542', '543', '544', '545', '546', '5461', '547', '548', '549', '55', '56', '57', '571', '573', '578', '58', '60', '600', '6001', '6002', '6003', '6004', '602', '603', '604', '605', '608', '61', '610', '613', '614', '615', '617', '62', '63', '64', '640', '642', '644', '649', '65', '650', '651', '652', '653', '654', '66', '67', '670', '671', '675', '677', '679', '68', '680', '682', '685', '686', '687', '688', '689', '69', '690', '692', '693', '695', '6951', '6952', '6953', '696', '6961', '698', '699', '70', '702', '703', '707', '708', '709', '74', '75', '751', '753', '76', '77', '770', '771', '772', '779', '80', '800', '801', '802');

insert into public.accounts (organization_id, number, name, account_type, account_group)
select o.id, t.number, t.name, t.account_type, t.account_group
from public.organizations o
cross join public.account_templates t
on conflict (organization_id, number) do update
  set name = excluded.name,
      account_type = excluded.account_type,
      account_group = excluded.account_group
  where accounts.name is distinct from excluded.name
     or accounts.account_type is distinct from excluded.account_type
     or accounts.account_group is distinct from excluded.account_group;

-- Keep historical payment rows (1200/1000). New payments use 280/282.
do $$
declare r record;
begin
  for r in
    select con.conname, rel.relname
    from pg_constraint con
    join pg_class rel on rel.oid = con.conrelid
    join pg_namespace nsp on nsp.oid = rel.relnamespace
    where nsp.nspname = 'public'
      and rel.relname in ('sales_payments', 'vendor_payments')
      and con.contype = 'c'
      and pg_get_constraintdef(con.oid) ilike '%bank_account%'
  loop
    execute format('alter table public.%I drop constraint %I', r.relname, r.conname);
  end loop;
end $$;

alter table public.sales_payments
  add constraint sales_payments_bank_account_check
  check (bank_account in ('280', '282', '1200', '1000'));

alter table public.vendor_payments
  add constraint vendor_payments_bank_account_check
  check (bank_account in ('280', '282', '1200', '1000'));

create or replace function public._nl_revenue_account(p_vat int)
returns text
language sql
immutable
as $$
  select '501';
$$;

create or replace function public._nl_ust_account(p_vat int)
returns text
language sql
immutable
as $$
  select case when p_vat in (7, 19) then '480' else null end;
$$;

create or replace function public._nl_vst_account(p_vat int)
returns text
language sql
immutable
as $$
  select case when p_vat in (7, 19) then '260' else null end;
$$;

comment on function public._nl_revenue_account(int) is
  'Umsatzerlöse für Handelswaren (501) for 0/7/19. Rate does not change the account.';
comment on function public._nl_ust_account(int) is
  'Umsatzsteuer 480 for 7 and 19. Null at 0 % (no tax line).';
comment on function public._nl_vst_account(int) is
  'Vorsteuer 260 for 7 and 19. Null at 0 % (no tax line).';

create or replace function public.book_sales_invoice(
  p_organization_id uuid,
  p_invoice_id uuid
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_inv public.sales_invoices%rowtype;
  v_customer_name text;
  v_group record;
  v_group_count int;
  v_net int;
  v_tax int;
  v_gross int;
  v_revenue text;
  v_ust text;
  v_entry_id uuid;
  v_first_entry_id uuid;
  v_doc_number text;
  v_desc text;
  v_line record;
  v_tracks boolean;
  v_vat_enabled boolean;
begin
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;
  if not public.can_write_org(p_organization_id) then
    raise exception 'forbidden';
  end if;

  select * into v_inv
  from public.sales_invoices
  where id = p_invoice_id and organization_id = p_organization_id
  for update;

  if not found then
    raise exception 'sales invoice not found';
  end if;

  if v_inv.booked_at is not null then
    raise exception 'already_booked: sales invoice %', p_invoice_id;
  end if;

  select c.company_name into v_customer_name
  from public.customers c
  where c.id = v_inv.customer_id and c.organization_id = p_organization_id;

  if v_customer_name is null then
    raise exception 'customer not found for invoice';
  end if;

  if not exists (
    select 1 from public.sales_invoice_lines l
    where l.organization_id = p_organization_id and l.invoice_id = p_invoice_id
  ) then
    raise exception 'invoice has no lines';
  end if;

  select o.vat_enabled into v_vat_enabled
  from public.organizations o
  where o.id = p_organization_id;

  if not found then
    raise exception 'organization not found';
  end if;

  -- Flag wins over the rate on the still-unbooked document. Already booked
  -- invoices returned above, so existing journal lines are not rewritten.
  if not v_vat_enabled then
    update public.sales_invoice_lines
    set vat_rate = 0
    where organization_id = p_organization_id
      and invoice_id = p_invoice_id;
  end if;

  -- USt groups (client parity: sum nets per rate, then tax on group net)
  select count(*) into v_group_count
  from (
    select l.vat_rate
    from public.sales_invoice_lines l
    where l.organization_id = p_organization_id and l.invoice_id = p_invoice_id
    group by l.vat_rate
  ) g;

  for v_group in
    select
      l.vat_rate,
      sum(public._nl_line_net_cents(l.quantity, l.net_unit_price_cents))::int as net_cents
    from public.sales_invoice_lines l
    where l.organization_id = p_organization_id and l.invoice_id = p_invoice_id
    group by l.vat_rate
    order by l.vat_rate
  loop
    v_net := v_group.net_cents;
    if v_net <= 0 then
      raise exception 'invalid group net for vat %', v_group.vat_rate;
    end if;
    v_tax := public._nl_tax_cents(v_net, v_group.vat_rate);
    v_gross := v_net + v_tax;
    if v_gross <= 0 then
      raise exception 'invoice gross must be > 0';
    end if;

    v_revenue := public._nl_revenue_account(v_group.vat_rate);
    v_ust := public._nl_ust_account(v_group.vat_rate);

    if not exists (
      select 1 from public.accounts a
      where a.organization_id = p_organization_id and a.number = v_revenue
        and a.account_type = 'ertrag'
    ) then
      raise exception 'revenue account % missing or not ertrag', v_revenue;
    end if;

    if v_group_count = 1 then
      v_doc_number := v_inv.number;
    else
      v_doc_number := v_inv.number || '-U' || v_group.vat_rate::text;
    end if;

    v_desc := format(
      'Ausgangsrechnung %s an %s',
      v_inv.number,
      v_customer_name
    );

    insert into public.journal_entries (
      organization_id, entry_date, document_number, description,
      debit_account, credit_account, net_amount_cents, vat_rate,
      tax_amount_cents, gross_amount_cents, explanation
    ) values (
      p_organization_id, v_inv.issue_date, v_doc_number, v_desc,
      '240', v_revenue, v_net, v_group.vat_rate,
      v_tax, v_gross,
      format('AR %s USt %s%%', v_inv.number, v_group.vat_rate)
    )
    returning id into v_entry_id;

    if v_first_entry_id is null then
      v_first_entry_id := v_entry_id;
    end if;

    -- Lines: revenue with VAT → Debit AR gross, Credit revenue net, Credit USt tax
    if v_group.vat_rate in (7, 19) then
      insert into public.journal_lines (
        organization_id, journal_entry_id, account_number, debit_cents, credit_cents
      ) values
        (p_organization_id, v_entry_id, '240', v_gross, 0),
        (p_organization_id, v_entry_id, v_revenue, 0, v_net),
        (p_organization_id, v_entry_id, v_ust, 0, v_tax);
    else
      insert into public.journal_lines (
        organization_id, journal_entry_id, account_number, debit_cents, credit_cents
      ) values
        (p_organization_id, v_entry_id, '240', v_net, 0),
        (p_organization_id, v_entry_id, v_revenue, 0, v_net);
    end if;

    insert into public.document_journal_links (
      organization_id, document_type, document_id, journal_entry_id
    ) values (
      p_organization_id, 'sales_invoice', p_invoice_id, v_entry_id
    );
  end loop;

  if v_first_entry_id is null then
    raise exception 'invoice has no lines';
  end if;

  -- Stock outflows for products that track stock
  for v_line in
    select l.product_id, l.quantity, l.description
    from public.sales_invoice_lines l
    where l.organization_id = p_organization_id
      and l.invoice_id = p_invoice_id
      and l.product_id is not null
  loop
    select p.tracks_stock into v_tracks
    from public.products p
    where p.id = v_line.product_id and p.organization_id = p_organization_id;

    if coalesce(v_tracks, false) then
      insert into public.stock_movements (
        organization_id, product_id, movement_date, quantity_delta,
        source_type, source_id, note
      ) values (
        p_organization_id, v_line.product_id, v_inv.issue_date, -v_line.quantity,
        'verkauf', p_invoice_id::text, v_inv.number
      );
    end if;
  end loop;

  update public.sales_invoices
  set booked_at = now(), updated_at = now()
  where id = p_invoice_id and organization_id = p_organization_id
    and booked_at is null;

  if not found then
    raise exception 'already_booked: sales invoice %', p_invoice_id;
  end if;

  return v_first_entry_id;
end;
$$;


create or replace function public.book_vendor_invoice(
  p_organization_id uuid,
  p_invoice_id uuid
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_inv public.vendor_invoices%rowtype;
  v_supplier_name text;
  v_group record;
  v_group_count int;
  v_net int;
  v_tax int;
  v_gross int;
  v_vst text;
  v_entry_id uuid;
  v_first_entry_id uuid;
  v_doc_number text;
  v_desc text;
  v_acct_type text;
  v_vat_enabled boolean;
begin
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;
  if not public.can_write_org(p_organization_id) then
    raise exception 'forbidden';
  end if;

  select * into v_inv
  from public.vendor_invoices
  where id = p_invoice_id and organization_id = p_organization_id
  for update;

  if not found then
    raise exception 'vendor invoice not found';
  end if;

  if v_inv.booked_at is not null then
    raise exception 'already_booked: vendor invoice %', p_invoice_id;
  end if;

  select s.company_name into v_supplier_name
  from public.suppliers s
  where s.id = v_inv.supplier_id and s.organization_id = p_organization_id;

  if v_supplier_name is null then
    raise exception 'supplier not found for invoice';
  end if;

  if not exists (
    select 1 from public.vendor_invoice_lines l
    where l.organization_id = p_organization_id and l.invoice_id = p_invoice_id
  ) then
    raise exception 'invoice has no lines';
  end if;

  select o.vat_enabled into v_vat_enabled
  from public.organizations o
  where o.id = p_organization_id;

  if not found then
    raise exception 'organization not found';
  end if;

  if not v_vat_enabled then
    update public.vendor_invoice_lines
    set vat_rate = 0
    where organization_id = p_organization_id
      and invoice_id = p_invoice_id;
  end if;

  -- Validate expense accounts
  for v_group in
    select distinct l.expense_account
    from public.vendor_invoice_lines l
    where l.organization_id = p_organization_id and l.invoice_id = p_invoice_id
  loop
    select a.account_type into v_acct_type
    from public.accounts a
    where a.organization_id = p_organization_id and a.number = v_group.expense_account;

    if v_acct_type is distinct from 'aufwand' then
      raise exception 'expense account % invalid or not aufwand', v_group.expense_account;
    end if;
  end loop;

  select count(*) into v_group_count
  from (
    select l.expense_account, l.vat_rate
    from public.vendor_invoice_lines l
    where l.organization_id = p_organization_id and l.invoice_id = p_invoice_id
    group by l.expense_account, l.vat_rate
  ) g;

  for v_group in
    select
      l.expense_account,
      l.vat_rate,
      sum(public._nl_line_net_cents(l.quantity, l.net_unit_price_cents))::int as net_cents
    from public.vendor_invoice_lines l
    where l.organization_id = p_organization_id and l.invoice_id = p_invoice_id
    group by l.expense_account, l.vat_rate
    order by l.expense_account, l.vat_rate
  loop
    v_net := v_group.net_cents;
    if v_net <= 0 then
      raise exception 'invalid group net for expense % vat %',
        v_group.expense_account, v_group.vat_rate;
    end if;
    v_tax := public._nl_tax_cents(v_net, v_group.vat_rate);
    v_gross := v_net + v_tax;
    v_vst := public._nl_vst_account(v_group.vat_rate);

    if v_group_count = 1 then
      v_doc_number := v_inv.internal_number;
    else
      v_doc_number := v_inv.internal_number
        || '-' || v_group.expense_account
        || '-U' || v_group.vat_rate::text;
    end if;

    v_desc := format(
      'Eingangsrechnung %s von %s',
      v_inv.internal_number,
      v_supplier_name
    );

    insert into public.journal_entries (
      organization_id, entry_date, document_number, description,
      debit_account, credit_account, net_amount_cents, vat_rate,
      tax_amount_cents, gross_amount_cents, explanation
    ) values (
      p_organization_id, v_inv.issue_date, v_doc_number, v_desc,
      v_group.expense_account, '44', v_net, v_group.vat_rate,
      v_tax, v_gross,
      format('ER %s USt %s%%', v_inv.internal_number, v_group.vat_rate)
    )
    returning id into v_entry_id;

    if v_first_entry_id is null then
      v_first_entry_id := v_entry_id;
    end if;

    if v_group.vat_rate in (7, 19) then
      insert into public.journal_lines (
        organization_id, journal_entry_id, account_number, debit_cents, credit_cents
      ) values
        (p_organization_id, v_entry_id, v_group.expense_account, v_net, 0),
        (p_organization_id, v_entry_id, v_vst, v_tax, 0),
        (p_organization_id, v_entry_id, '44', 0, v_gross);
    else
      insert into public.journal_lines (
        organization_id, journal_entry_id, account_number, debit_cents, credit_cents
      ) values
        (p_organization_id, v_entry_id, v_group.expense_account, v_net, 0),
        (p_organization_id, v_entry_id, '44', 0, v_net);
    end if;

    insert into public.document_journal_links (
      organization_id, document_type, document_id, journal_entry_id
    ) values (
      p_organization_id, 'vendor_invoice', p_invoice_id, v_entry_id
    );
  end loop;

  if v_first_entry_id is null then
    raise exception 'invoice has no lines';
  end if;

  update public.vendor_invoices
  set booked_at = now(), updated_at = now()
  where id = p_invoice_id and organization_id = p_organization_id
    and booked_at is null;

  if not found then
    raise exception 'already_booked: vendor invoice %', p_invoice_id;
  end if;

  return v_first_entry_id;
end;
$$;


create or replace function public.record_sales_payment(
  p_organization_id uuid,
  p_invoice_id uuid,
  p_payment_date date,
  p_amount_cents int,
  p_bank_account text,
  p_reference text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_inv public.sales_invoices%rowtype;
  v_existing uuid;
  v_ref text;
  v_gross int;
  v_paid int;
  v_entry_id uuid;
  v_payment_id uuid;
  v_doc_number text;
  v_desc text;
  v_seq int;
begin
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;
  if not public.can_write_org(p_organization_id) then
    raise exception 'forbidden';
  end if;

  if p_payment_date is null then
    raise exception 'invalid payment date';
  end if;
  if p_amount_cents is null or p_amount_cents <= 0 then
    raise exception 'payment amount must be > 0';
  end if;
  if p_bank_account not in ('280', '282') then
    raise exception 'invalid bank account';
  end if;

  v_ref := coalesce(p_reference, '');

  select * into v_inv
  from public.sales_invoices
  where id = p_invoice_id and organization_id = p_organization_id
  for update;

  if not found then
    raise exception 'sales invoice not found';
  end if;

  if v_inv.booked_at is null then
    raise exception 'sales payment requires booked invoice';
  end if;

  -- Idempotent retry
  select p.id into v_existing
  from public.sales_payments p
  where p.organization_id = p_organization_id
    and p.invoice_id = p_invoice_id
    and p.payment_date = p_payment_date
    and p.amount_cents = p_amount_cents
    and p.bank_account = p_bank_account
    and coalesce(p.reference, '') = v_ref
  order by p.created_at
  limit 1;

  if v_existing is not null then
    return v_existing;
  end if;

  v_gross := public.sales_invoice_gross_cents(p_organization_id, p_invoice_id);
  select coalesce(sum(amount_cents), 0) into v_paid
  from public.sales_payments
  where organization_id = p_organization_id and invoice_id = p_invoice_id;

  if v_paid + p_amount_cents > v_gross then
    raise exception 'sales payment overpays invoice (paid=% + % > gross=%)',
      v_paid, p_amount_cents, v_gross;
  end if;

  v_seq := public.next_document_number(p_organization_id, 'journal');
  v_doc_number := format('ZE-%s-%s', v_inv.number, v_seq);
  v_desc := nullif(trim(v_ref), '');
  if v_desc is null then
    v_desc := format('Zahlungseingang zu %s', v_inv.number);
  end if;

  insert into public.journal_entries (
    organization_id, entry_date, document_number, description,
    debit_account, credit_account, net_amount_cents, vat_rate,
    tax_amount_cents, gross_amount_cents, explanation
  ) values (
    p_organization_id, p_payment_date, v_doc_number, v_desc,
    p_bank_account, '240', p_amount_cents, 0,
    0, p_amount_cents,
    format('ZE %s', v_inv.number)
  )
  returning id into v_entry_id;

  insert into public.journal_lines (
    organization_id, journal_entry_id, account_number, debit_cents, credit_cents
  ) values
    (p_organization_id, v_entry_id, p_bank_account, p_amount_cents, 0),
    (p_organization_id, v_entry_id, '240', 0, p_amount_cents);

  insert into public.sales_payments (
    organization_id, invoice_id, payment_date, amount_cents,
    bank_account, reference, journal_entry_id
  ) values (
    p_organization_id, p_invoice_id, p_payment_date, p_amount_cents,
    p_bank_account, nullif(v_ref, ''), v_entry_id
  )
  returning id into v_payment_id;

  insert into public.document_journal_links (
    organization_id, document_type, document_id, journal_entry_id
  ) values (
    p_organization_id, 'sales_payment', v_payment_id, v_entry_id
  );

  return v_payment_id;
end;
$$;


create or replace function public.record_vendor_payment(
  p_organization_id uuid,
  p_invoice_id uuid,
  p_payment_date date,
  p_amount_cents int,
  p_bank_account text,
  p_reference text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_inv public.vendor_invoices%rowtype;
  v_existing uuid;
  v_ref text;
  v_gross int;
  v_paid int;
  v_entry_id uuid;
  v_payment_id uuid;
  v_doc_number text;
  v_desc text;
  v_seq int;
begin
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;
  if not public.can_write_org(p_organization_id) then
    raise exception 'forbidden';
  end if;

  if p_payment_date is null then
    raise exception 'invalid payment date';
  end if;
  if p_amount_cents is null or p_amount_cents <= 0 then
    raise exception 'payment amount must be > 0';
  end if;
  if p_bank_account not in ('280', '282') then
    raise exception 'invalid bank account';
  end if;

  v_ref := coalesce(p_reference, '');

  select * into v_inv
  from public.vendor_invoices
  where id = p_invoice_id and organization_id = p_organization_id
  for update;

  if not found then
    raise exception 'vendor invoice not found';
  end if;

  if v_inv.booked_at is null then
    raise exception 'vendor payment requires booked invoice';
  end if;

  select p.id into v_existing
  from public.vendor_payments p
  where p.organization_id = p_organization_id
    and p.invoice_id = p_invoice_id
    and p.payment_date = p_payment_date
    and p.amount_cents = p_amount_cents
    and p.bank_account = p_bank_account
    and coalesce(p.reference, '') = v_ref
  order by p.created_at
  limit 1;

  if v_existing is not null then
    return v_existing;
  end if;

  v_gross := public.vendor_invoice_gross_cents(p_organization_id, p_invoice_id);
  select coalesce(sum(amount_cents), 0) into v_paid
  from public.vendor_payments
  where organization_id = p_organization_id and invoice_id = p_invoice_id;

  if v_paid + p_amount_cents > v_gross then
    raise exception 'vendor payment overpays invoice (paid=% + % > gross=%)',
      v_paid, p_amount_cents, v_gross;
  end if;

  v_seq := public.next_document_number(p_organization_id, 'journal');
  v_doc_number := format('ZA-%s-%s', v_inv.internal_number, v_seq);
  v_desc := nullif(trim(v_ref), '');
  if v_desc is null then
    v_desc := format('Zahlungsausgang zu %s', v_inv.internal_number);
  end if;

  insert into public.journal_entries (
    organization_id, entry_date, document_number, description,
    debit_account, credit_account, net_amount_cents, vat_rate,
    tax_amount_cents, gross_amount_cents, explanation
  ) values (
    p_organization_id, p_payment_date, v_doc_number, v_desc,
    '44', p_bank_account, p_amount_cents, 0,
    0, p_amount_cents,
    format('ZA %s', v_inv.internal_number)
  )
  returning id into v_entry_id;

  insert into public.journal_lines (
    organization_id, journal_entry_id, account_number, debit_cents, credit_cents
  ) values
    (p_organization_id, v_entry_id, '44', p_amount_cents, 0),
    (p_organization_id, v_entry_id, p_bank_account, 0, p_amount_cents);

  insert into public.vendor_payments (
    organization_id, invoice_id, payment_date, amount_cents,
    bank_account, reference, journal_entry_id
  ) values (
    p_organization_id, p_invoice_id, p_payment_date, p_amount_cents,
    p_bank_account, nullif(v_ref, ''), v_entry_id
  )
  returning id into v_payment_id;

  insert into public.document_journal_links (
    organization_id, document_type, document_id, journal_entry_id
  ) values (
    p_organization_id, 'vendor_payment', v_payment_id, v_entry_id
  );

  return v_payment_id;
end;
$$;


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
      coalesce(v_item->>'debitAccount', '280'),
      coalesce(v_item->>'creditAccount', '501'),
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
          coalesce(v_line->>'accountNumber', '280'),
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
      coalesce(v_item->>'bankAccount', '280'),
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
          coalesce(v_line->>'expenseAccount', '608')
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
          coalesce(v_line->>'expenseAccount', '608')
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
      coalesce(v_item->>'bankAccount', '280'),
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



comment on function public.book_sales_invoice(uuid, uuid) is
  'Books sales invoice to 240/501 and Umsatzsteuer 480. vat_enabled false treats rates as 0 and writes no tax line.';

comment on function public.book_vendor_invoice(uuid, uuid) is
  'Books vendor invoice to the line expense account (default 608) and 44, plus Vorsteuer 260. vat_enabled false writes no tax line.';

comment on function public.record_sales_payment(uuid, uuid, date, int, text, text) is
  'Atomic sales payment 280/282 an 240. Idempotent on natural key. Returns payment id.';

comment on function public.record_vendor_payment(uuid, uuid, date, int, text, text) is
  'Atomic vendor payment 44 an 280/282. Idempotent on natural key. Returns payment id.';
