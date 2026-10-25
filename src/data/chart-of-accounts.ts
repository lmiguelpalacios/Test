import type { Account } from '../types/accounting'

/**
 * Schulkontenrahmen Industrie aus KontenplanFibu.pdf (Jan. 12).
 * Klasse 9 (Kosten- und Leistungsrechnung) enthält keine Kontonummern.
 * 300 steht im Plan je nach Rechtsform als Eigenkapital, Kapital A oder Gezeichnetes Kapital.
 * Vorsteuer 260 und Umsatzsteuer 480 gelten für 7 % und 19 %. 0 % bucht keine Steuerzeile.
 */
export const chartOfAccounts: Account[] = [
  { number: '00', name: 'Ausstehende Einlagen', type: 'aktiv', group: 'Anlagevermögen' },
  { number: '01', name: 'Aufwendungen für Ingangsetzung', type: 'aktiv', group: 'Anlagevermögen' },
  { number: '02', name: 'Konzessionen, gewerbliche Schutzrechte und ähnliche Rechte und Werte sowie Lizenzen an solchen Rechten und Werten', type: 'aktiv', group: 'Anlagevermögen' },
  { number: '03', name: 'Geschäfts- oder Firmenwert', type: 'aktiv', group: 'Anlagevermögen' },
  { number: '05', name: 'Grundstücke, grundstücksgleiche Rechte und Bauten einschließlich der Bauten auf fremden Grundstücken', type: 'aktiv', group: 'Anlagevermögen' },
  { number: '07', name: 'Technische Anlagen und Maschinen', type: 'aktiv', group: 'Anlagevermögen' },
  { number: '070', name: 'Technische Anlagen', type: 'aktiv', group: 'Anlagevermögen' },
  { number: '071', name: 'Maschinen', type: 'aktiv', group: 'Anlagevermögen' },
  { number: '08', name: 'Andere Anlagen, Betriebs- und Geschäftsausstattung', type: 'aktiv', group: 'Anlagevermögen' },
  { number: '080', name: 'Andere Anlagen', type: 'aktiv', group: 'Anlagevermögen' },
  { number: '082', name: 'Werkzeuge', type: 'aktiv', group: 'Anlagevermögen' },
  { number: '083', name: 'Lager- und Transporteinrichtungen', type: 'aktiv', group: 'Anlagevermögen' },
  { number: '084', name: 'Fuhrpark', type: 'aktiv', group: 'Anlagevermögen' },
  { number: '085', name: 'Betriebsausstattung', type: 'aktiv', group: 'Anlagevermögen' },
  { number: '087', name: 'Geschäftsausstattung', type: 'aktiv', group: 'Anlagevermögen' },
  { number: '089', name: 'Geringwertige Wirtschaftsgüter', type: 'aktiv', group: 'Anlagevermögen' },
  { number: '09', name: 'Geleistete Anzahlungen und Anlagen im Bau', type: 'aktiv', group: 'Anlagevermögen' },
  { number: '090', name: 'Geleistete Anzahlungen auf Sachanlagen', type: 'aktiv', group: 'Anlagevermögen' },
  { number: '095', name: 'Anlagen im Bau', type: 'aktiv', group: 'Anlagevermögen' },
  { number: '13', name: 'Beteiligungen', type: 'aktiv', group: 'Anlagevermögen' },
  { number: '15', name: 'Wertpapiere des Anlagevermögens', type: 'aktiv', group: 'Anlagevermögen' },
  { number: '16', name: 'Sonstige Finanzanlagen (z.B. Darlehensforderungen)', type: 'aktiv', group: 'Anlagevermögen' },
  { number: '20', name: 'Roh-, Hilfs- und Betriebsstoffe und Fremdbauteile', type: 'aktiv', group: 'Umlaufvermögen' },
  { number: '200', name: 'Rohstoffe und Fremdbauteile', type: 'aktiv', group: 'Umlaufvermögen' },
  { number: '2001', name: 'Bezugskosten', type: 'aktiv', group: 'Umlaufvermögen' },
  { number: '2002', name: 'Preisnachlässe und Rücksendungen', type: 'aktiv', group: 'Umlaufvermögen' },
  { number: '2003', name: 'Liefererskonti', type: 'aktiv', group: 'Umlaufvermögen' },
  { number: '2004', name: 'Liefererboni', type: 'aktiv', group: 'Umlaufvermögen' },
  { number: '202', name: 'Hilfsstoffe', type: 'aktiv', group: 'Umlaufvermögen' },
  { number: '203', name: 'Betriebsstoffe', type: 'aktiv', group: 'Umlaufvermögen' },
  { number: '204', name: 'Sonstiges Material (z.B. Verpackungsmaterial)', type: 'aktiv', group: 'Umlaufvermögen' },
  { number: '21', name: 'Unfertige Erzeugnisse', type: 'aktiv', group: 'Umlaufvermögen' },
  { number: '22', name: 'Fertige Erzeugnisse und Waren', type: 'aktiv', group: 'Umlaufvermögen' },
  { number: '220', name: 'Fertige Erzeugnisse', type: 'aktiv', group: 'Umlaufvermögen' },
  { number: '221', name: 'Handelswaren', type: 'aktiv', group: 'Umlaufvermögen' },
  { number: '23', name: 'Geleistete Anzahlungen auf Vorräte', type: 'aktiv', group: 'Umlaufvermögen' },
  { number: '24', name: 'Forderungen', type: 'aktiv', group: 'Forderungen' },
  { number: '240', name: 'Forderungen aus Lieferungen und Leistungen (oder Debitor)', type: 'aktiv', group: 'Forderungen' },
  { number: '241', name: 'Zweifelhafte Forderungen', type: 'aktiv', group: 'Forderungen' },
  { number: '245', name: 'Wechselforderungen (Besitzwechsel)', type: 'aktiv', group: 'Forderungen' },
  { number: '26', name: 'Sonstige Vermögensgegenstände', type: 'aktiv', group: 'Umlaufvermögen' },
  { number: '260', name: 'Vorsteuer', type: 'aktiv', group: 'Steuerkonten' },
  { number: '263', name: 'Sonstige Forderungen an Finanzbehörden', type: 'aktiv', group: 'Umlaufvermögen' },
  { number: '264', name: 'Vorauszahlung Sozialversicherung', type: 'aktiv', group: 'Umlaufvermögen' },
  { number: '265', name: 'Forderungen an Mitarbeiter (z.B. Vorschüsse)', type: 'aktiv', group: 'Umlaufvermögen' },
  { number: '269', name: 'Sonstige Forderungen (Jahresabgrenzung)', type: 'aktiv', group: 'Umlaufvermögen' },
  { number: '27', name: 'Wertpapiere des Umlaufvermögens', type: 'aktiv', group: 'Umlaufvermögen' },
  { number: '28', name: 'Flüssige Mittel', type: 'aktiv', group: 'Finanzkonten' },
  { number: '280', name: 'Guthaben bei Kreditinstituten (Bank)', type: 'aktiv', group: 'Finanzkonten' },
  { number: '282', name: 'Kasse', type: 'aktiv', group: 'Finanzkonten' },
  { number: '29', name: 'Rechnungsabgrenzung', type: 'aktiv', group: 'Umlaufvermögen' },
  { number: '290', name: 'Aktive Rechnungsabgrenzung (Jahresabgrenzung)', type: 'aktiv', group: 'Umlaufvermögen' },
  { number: '291', name: 'Disagio', type: 'aktiv', group: 'Umlaufvermögen' },
  { number: '30', name: 'Eigenkapital/Gezeichnetes Kapital', type: 'passiv', group: 'Eigenkapital' },
  { number: '300', name: 'Eigenkapital / Kapital A / Gezeichnetes Kapital', type: 'passiv', group: 'Eigenkapital' },
  { number: '3001', name: 'Privat / Privat A', type: 'passiv', group: 'Eigenkapital' },
  { number: '301', name: 'Kapital B', type: 'passiv', group: 'Eigenkapital' },
  { number: '3011', name: 'Privat B', type: 'passiv', group: 'Eigenkapital' },
  { number: '307', name: 'Kommanditkapital C', type: 'passiv', group: 'Eigenkapital' },
  { number: '308', name: 'Kommanditkapital D', type: 'passiv', group: 'Eigenkapital' },
  { number: '31', name: 'Kapitalrücklage', type: 'passiv', group: 'Eigenkapital' },
  { number: '32', name: 'Gewinnrücklagen', type: 'passiv', group: 'Eigenkapital' },
  { number: '321', name: 'gesetzliche Rücklage', type: 'passiv', group: 'Eigenkapital' },
  { number: '322', name: 'Rücklage für eigene Anteile', type: 'passiv', group: 'Eigenkapital' },
  { number: '323', name: 'satzungsmäßige Rücklagen', type: 'passiv', group: 'Eigenkapital' },
  { number: '324', name: 'andere Gewinnrücklagen', type: 'passiv', group: 'Eigenkapital' },
  { number: '33', name: 'Ergebnisverwendung', type: 'passiv', group: 'Eigenkapital' },
  { number: '332', name: 'Ergebnisvortrag aus früheren Perioden', type: 'passiv', group: 'Eigenkapital' },
  { number: '335', name: 'Bilanzergebnis (Bilanzgewinn/Bilanzverlust)', type: 'passiv', group: 'Eigenkapital' },
  { number: '339', name: 'Ergebnisvortrag auf neue Rechnung', type: 'passiv', group: 'Eigenkapital' },
  { number: '34', name: 'Jahresüberschuss/Jahresfehlbetrag', type: 'passiv', group: 'Eigenkapital' },
  { number: '35', name: 'Sonderposten mit Rücklageanteil', type: 'passiv', group: 'Eigenkapital' },
  { number: '36', name: 'Wertberichtigungen', type: 'passiv', group: 'Verbindlichkeiten' },
  { number: '361', name: 'Wertberichtigungen zu Sachanlagen', type: 'passiv', group: 'Verbindlichkeiten' },
  { number: '367', name: 'Einzelwertberichtigung zu Forderungen', type: 'passiv', group: 'Verbindlichkeiten' },
  { number: '368', name: 'Pauschalwertberichtigungen zu Forderungen', type: 'passiv', group: 'Verbindlichkeiten' },
  { number: '37', name: 'Rückstellungen für Pensionen und ähnliche Verpflichtungen', type: 'passiv', group: 'Verbindlichkeiten' },
  { number: '38', name: 'Steuerrückstellungen', type: 'passiv', group: 'Verbindlichkeiten' },
  { number: '39', name: 'Sonstige Rückstellungen (z.B. für Gewährleistung)', type: 'passiv', group: 'Verbindlichkeiten' },
  { number: '41', name: 'Anleihen', type: 'passiv', group: 'Verbindlichkeiten' },
  { number: '42', name: 'Verbindlichkeiten gegenüber Kreditinstituten', type: 'passiv', group: 'Verbindlichkeiten' },
  { number: '43', name: 'Erhaltene Anzahlungen auf Bestellungen', type: 'passiv', group: 'Verbindlichkeiten' },
  { number: '44', name: 'Verbindlichkeiten aus Lieferungen und Leistungen (oder Kreditor)', type: 'passiv', group: 'Verbindlichkeiten' },
  { number: '45', name: 'Wechselverbindlichkeiten (Schuldwechsel)', type: 'passiv', group: 'Verbindlichkeiten' },
  { number: '48', name: 'Sonstige Verbindlichkeiten', type: 'passiv', group: 'Verbindlichkeiten' },
  { number: '480', name: 'Umsatzsteuer', type: 'passiv', group: 'Steuerkonten' },
  { number: '483', name: 'Sonstige Verbindlichkeiten gegenüber Finanzbehörden (z.B. abzuführende Lohnsteuer)', type: 'passiv', group: 'Verbindlichkeiten' },
  { number: '484', name: 'Verbindlichkeiten gegenüber Sozialversicherungsträgern', type: 'passiv', group: 'Verbindlichkeiten' },
  { number: '485', name: 'Verbindlichkeiten gegenüber Mitarbeitern', type: 'passiv', group: 'Verbindlichkeiten' },
  { number: '486', name: 'Verbindlichkeiten aus vermögenswirksamen Leistungen', type: 'passiv', group: 'Verbindlichkeiten' },
  { number: '489', name: 'Sonstige Verbindlichkeiten (Jahresabgrenzung)', type: 'passiv', group: 'Verbindlichkeiten' },
  { number: '49', name: 'Passive Rechnungsabgrenzung (Jahresabgrenzung)', type: 'passiv', group: 'Verbindlichkeiten' },
  { number: '50', name: 'Umsatzerlöse', type: 'ertrag', group: 'Erträge' },
  { number: '500', name: 'Umsatzerlöse für Erzeugnisse und Leistungen', type: 'ertrag', group: 'Erträge' },
  { number: '5001', name: 'Preisnachlässe und Rücksendungen', type: 'ertrag', group: 'Erträge' },
  { number: '5002', name: 'Kundenskonti', type: 'ertrag', group: 'Erträge' },
  { number: '5003', name: 'Kundenboni', type: 'ertrag', group: 'Erträge' },
  { number: '501', name: 'Umsatzerlöse für Handelswaren', type: 'ertrag', group: 'Erträge' },
  { number: '52', name: 'Erhöhung oder Verminderung des Bestandes an unfertigen und fertigen Erzeugnissen', type: 'ertrag', group: 'Erträge' },
  { number: '521', name: 'Bestandsveränderungen an unfertigen Erzeugnissen', type: 'ertrag', group: 'Erträge' },
  { number: '522', name: 'Bestandsveränderungen an fertigen Erzeugnissen', type: 'ertrag', group: 'Erträge' },
  { number: '53', name: 'Andere aktivierte Eigenleistungen', type: 'ertrag', group: 'Erträge' },
  { number: '54', name: 'Sonstige betriebliche Erträge', type: 'ertrag', group: 'Erträge' },
  { number: '540', name: 'Erträge aus Vermietung und Verpachtung', type: 'ertrag', group: 'Erträge' },
  { number: '541', name: 'Provisionserträge', type: 'ertrag', group: 'Erträge' },
  { number: '542', name: 'Unentgeltliche Wertabgaben', type: 'ertrag', group: 'Erträge' },
  { number: '543', name: 'Andere sonstige betriebliche Erträge', type: 'ertrag', group: 'Erträge' },
  { number: '544', name: 'Erträge aus Werterhöhungen von Gegenständen des Anlagevermögens (Zuschreibungen)', type: 'ertrag', group: 'Erträge' },
  { number: '545', name: 'Erträge aus der Auflösung oder Herabsetzung von Wertberichtigungen auf Forderungen', type: 'ertrag', group: 'Erträge' },
  { number: '546', name: 'Erträge aus dem Abgang von Sachgegenständen des Sachanlagevermögens', type: 'ertrag', group: 'Erträge' },
  { number: '5461', name: 'Erlöse aus dem Abgang von Gegenständen des Sachanlagevermögens bei Buchgewinn (Verrechnung mit Konto 546)', type: 'ertrag', group: 'Erträge' },
  { number: '547', name: 'Erlöse aus direkt abgeschriebenen Forderungen', type: 'ertrag', group: 'Erträge' },
  { number: '548', name: 'Erträge aus der Auflösung oder Herabsetzung von Rückstellungen', type: 'ertrag', group: 'Erträge' },
  { number: '549', name: 'Andere periodenfremde Erträge', type: 'ertrag', group: 'Erträge' },
  { number: '55', name: 'Erträge aus Beteiligungen', type: 'ertrag', group: 'Erträge' },
  { number: '56', name: 'Erträge aus anderen Finanzanlagen', type: 'ertrag', group: 'Erträge' },
  { number: '57', name: 'Sonstige Zinsen und ähnliche Erträge', type: 'ertrag', group: 'Erträge' },
  { number: '571', name: 'Zinserträge', type: 'ertrag', group: 'Erträge' },
  { number: '573', name: 'Diskonterträge', type: 'ertrag', group: 'Erträge' },
  { number: '578', name: 'Erträge aus Wertpapieren des Umlaufvermögens', type: 'ertrag', group: 'Erträge' },
  { number: '58', name: 'Außerordentliche Erträge', type: 'ertrag', group: 'Erträge' },
  { number: '60', name: 'Aufwendungen für Roh-, Hilfs- und Betriebsstoffe und für bezogene Waren', type: 'aufwand', group: 'Aufwendungen' },
  { number: '600', name: 'Aufwendungen für Rohstoffe und Fremdbauteile (Fertigungsmaterial)', type: 'aufwand', group: 'Aufwendungen' },
  { number: '6001', name: 'Bezugskosten', type: 'aufwand', group: 'Aufwendungen' },
  { number: '6002', name: 'Preisnachlässe und Rücksendungen', type: 'aufwand', group: 'Aufwendungen' },
  { number: '6003', name: 'Lieferskonti', type: 'aufwand', group: 'Aufwendungen' },
  { number: '6004', name: 'Lieferboni', type: 'aufwand', group: 'Aufwendungen' },
  { number: '602', name: 'Aufwendungen für Hilfsstoffe', type: 'aufwand', group: 'Aufwendungen' },
  { number: '603', name: 'Aufwendungen für Betriebsstoffe', type: 'aufwand', group: 'Aufwendungen' },
  { number: '604', name: 'Aufwendungen für sonstiges Material (z.B. Verpackungsmaterial)', type: 'aufwand', group: 'Aufwendungen' },
  { number: '605', name: 'Aufwendungen für Energie und Treibstoffe', type: 'aufwand', group: 'Aufwendungen' },
  { number: '608', name: 'Aufwendungen für Handelswaren', type: 'aufwand', group: 'Aufwendungen' },
  { number: '61', name: 'Aufwendungen für bezogene Leistungen', type: 'aufwand', group: 'Aufwendungen' },
  { number: '610', name: 'Fremdleistungen für Erzeugnisse', type: 'aufwand', group: 'Aufwendungen' },
  { number: '613', name: 'Instandhaltung und Reparaturen', type: 'aufwand', group: 'Aufwendungen' },
  { number: '614', name: 'Frachten und Fremdlager', type: 'aufwand', group: 'Aufwendungen' },
  { number: '615', name: 'Vertriebsprovisionen', type: 'aufwand', group: 'Aufwendungen' },
  { number: '617', name: 'Sonstige Aufwendungen für bezogene Leistungen', type: 'aufwand', group: 'Aufwendungen' },
  { number: '62', name: 'Löhne', type: 'aufwand', group: 'Aufwendungen' },
  { number: '63', name: 'Gehälter', type: 'aufwand', group: 'Aufwendungen' },
  { number: '64', name: 'Soziale Abgaben und Aufwendungen für Altersversorgung und Unterstützung', type: 'aufwand', group: 'Aufwendungen' },
  { number: '640', name: 'Arbeitgeberanteil zur Sozialversicherung', type: 'aufwand', group: 'Aufwendungen' },
  { number: '642', name: 'Beiträge zur Berufsgenossenschaft', type: 'aufwand', group: 'Aufwendungen' },
  { number: '644', name: 'Aufwendungen für Altersversorgung', type: 'aufwand', group: 'Aufwendungen' },
  { number: '649', name: 'Aufwendungen für Unterstützung', type: 'aufwand', group: 'Aufwendungen' },
  { number: '65', name: 'Abschreibungen', type: 'aufwand', group: 'Aufwendungen' },
  { number: '650', name: 'Abschreibungen auf Sachanlagen', type: 'aufwand', group: 'Aufwendungen' },
  { number: '651', name: 'Abschreibungen auf immaterielle Vermögensgegenstände des Anlagevermögens', type: 'aufwand', group: 'Aufwendungen' },
  { number: '652', name: 'Abschreibungen für Aufwendungen der Ingangsetzung', type: 'aufwand', group: 'Aufwendungen' },
  { number: '653', name: 'Abschreibungen auf Vermögensgegenstände des Umlaufvermögens, soweit diese die üblichen Abschreibungen überschreiten', type: 'aufwand', group: 'Aufwendungen' },
  { number: '654', name: 'Abschreibungen auf geringwertige Wirtschaftsgüter', type: 'aufwand', group: 'Aufwendungen' },
  { number: '66', name: 'Sonstige Personalaufwendungen', type: 'aufwand', group: 'Aufwendungen' },
  { number: '67', name: 'Aufwendungen für die Inanspruchnahme von Rechten und Diensten', type: 'aufwand', group: 'Aufwendungen' },
  { number: '670', name: 'Mieten, Pachten', type: 'aufwand', group: 'Aufwendungen' },
  { number: '671', name: 'Leasing', type: 'aufwand', group: 'Aufwendungen' },
  { number: '675', name: 'Kosten des Geldverkehrs', type: 'aufwand', group: 'Aufwendungen' },
  { number: '677', name: 'Rechts- und Beratungskosten', type: 'aufwand', group: 'Aufwendungen' },
  { number: '679', name: 'Sonstige Aufwendungen für die Inanspruchnahme von Rechten und Diensten', type: 'aufwand', group: 'Aufwendungen' },
  { number: '68', name: 'Aufwendungen für Kommunikation', type: 'aufwand', group: 'Aufwendungen' },
  { number: '680', name: 'Büromaterial', type: 'aufwand', group: 'Aufwendungen' },
  { number: '682', name: 'Gebühren', type: 'aufwand', group: 'Aufwendungen' },
  { number: '685', name: 'Reisekosten', type: 'aufwand', group: 'Aufwendungen' },
  { number: '686', name: 'Bewirtung und Repräsentation', type: 'aufwand', group: 'Aufwendungen' },
  { number: '687', name: 'Werbung', type: 'aufwand', group: 'Aufwendungen' },
  { number: '688', name: 'Spenden', type: 'aufwand', group: 'Aufwendungen' },
  { number: '689', name: 'Sonstige Aufwendungen für Kommunikation', type: 'aufwand', group: 'Aufwendungen' },
  { number: '69', name: 'Aufwendungen für Beiträge und Sonstiges sowie Wertkorrekturen und periodenfremde Aufwendungen', type: 'aufwand', group: 'Aufwendungen' },
  { number: '690', name: 'Versicherungsbeiträge', type: 'aufwand', group: 'Aufwendungen' },
  { number: '692', name: 'Beiträge zu Wirtschaftsverbänden und Berufsvertretungen', type: 'aufwand', group: 'Aufwendungen' },
  { number: '693', name: 'Verluste aus Schadensfällen', type: 'aufwand', group: 'Aufwendungen' },
  { number: '695', name: 'Abschreibungen auf Forderungen', type: 'aufwand', group: 'Aufwendungen' },
  { number: '6951', name: 'Abschreibungen auf Forderungen wegen Uneinbringlichkeit', type: 'aufwand', group: 'Aufwendungen' },
  { number: '6952', name: 'Einstellung in Einzelwertberichtigungen', type: 'aufwand', group: 'Aufwendungen' },
  { number: '6953', name: 'Einstellung in Pauschalwertberichtigungen', type: 'aufwand', group: 'Aufwendungen' },
  { number: '696', name: 'Verluste aus dem Abgang von Gegenständen des Sachanlagevermögens', type: 'aufwand', group: 'Aufwendungen' },
  { number: '6961', name: 'Erlöse aus dem Abgang von Gegenständen des Sachanlagevermögens bei Buchverlust (Verrechnung mit Konto 696)', type: 'aufwand', group: 'Aufwendungen' },
  { number: '698', name: 'Zuführung zu Rückstellungen für Gewährleistung', type: 'aufwand', group: 'Aufwendungen' },
  { number: '699', name: 'Periodenfremde Aufwendungen', type: 'aufwand', group: 'Aufwendungen' },
  { number: '70', name: 'Betriebliche Steuern', type: 'aufwand', group: 'Aufwendungen' },
  { number: '702', name: 'Grundsteuer', type: 'aufwand', group: 'Aufwendungen' },
  { number: '703', name: 'Kraftfahrzeugsteuer', type: 'aufwand', group: 'Aufwendungen' },
  { number: '707', name: 'Verbrauchsteuern', type: 'aufwand', group: 'Aufwendungen' },
  { number: '708', name: 'Sonstige betriebliche Steuern', type: 'aufwand', group: 'Aufwendungen' },
  { number: '709', name: 'Steuernachzahlungen und -rückerstattungen bei betrieblichen Steuern', type: 'aufwand', group: 'Aufwendungen' },
  { number: '74', name: 'Abschreibungen auf Finanzanlagen und auf Wertpapiere des Umlaufvermögens', type: 'aufwand', group: 'Aufwendungen' },
  { number: '75', name: 'Zinsen und ähnliche Aufwendungen', type: 'aufwand', group: 'Aufwendungen' },
  { number: '751', name: 'Zinsaufwendungen', type: 'aufwand', group: 'Aufwendungen' },
  { number: '753', name: 'Diskontaufwendungen', type: 'aufwand', group: 'Aufwendungen' },
  { number: '76', name: 'Außerordentliche Aufwendungen', type: 'aufwand', group: 'Aufwendungen' },
  { number: '77', name: 'Steuern vom Einkommen und Ertrag', type: 'aufwand', group: 'Aufwendungen' },
  { number: '770', name: 'Gewerbesteuer', type: 'aufwand', group: 'Aufwendungen' },
  { number: '771', name: 'Körperschaftsteuer', type: 'aufwand', group: 'Aufwendungen' },
  { number: '772', name: 'Kapitalertragsteuer', type: 'aufwand', group: 'Aufwendungen' },
  { number: '779', name: 'Steuernachzahlungen und -rückerstattungen bei Steuern vom Einkommen und Ertrag', type: 'aufwand', group: 'Aufwendungen' },
  { number: '80', name: 'Eröffnung/Abschluss', type: 'passiv', group: 'Eigenkapital' },
  { number: '800', name: 'Eröffnungsbilanz', type: 'passiv', group: 'Eigenkapital' },
  { number: '801', name: 'Schlussbilanz', type: 'passiv', group: 'Eigenkapital' },
  { number: '802', name: 'G+V', type: 'passiv', group: 'Eigenkapital' },
]

export const LEARNING_CHART_NOTICE =
  'Schulkontenrahmen Industrie. Vorsteuer 260 und Umsatzsteuer 480 gelten für 7 % und 19 %. Wareneingang ohne eigenen Steuersatz, auch 0 % ohne Vorsteuer: 608 Aufwendungen für Handelswaren.'

/** Aufwendungen für Handelswaren — Wareneingang für 0 %, 7 % und 19 %. */
export const GOODS_EXPENSE_ACCOUNT = '608'
/** Umsatzerlöse für Handelswaren — alle USt-Sätze; 0 % ohne Steuerzeile. */
export const GOODS_REVENUE_ACCOUNT = '501'
export const VORSTEUER_ACCOUNT = '260'
export const UMSATZSTEUER_ACCOUNT = '480'
export const RECEIVABLE_ACCOUNT = '240'
export const PAYABLE_ACCOUNT = '44'
export const BANK_ACCOUNT = '280'
export const CASH_ACCOUNT = '282'
export const DEPOSIT_ACCOUNT = '43'

export const PURCHASE_EXPENSE_NUMBERS = [
  '608',
  '600',
  '602',
  '603',
  '604',
  '605',
  '670',
  '680',
  '613',
] as const

export function purchaseExpenseChoices(
  current?: string,
): { number: string; name: string }[] {
  const byNumber = getAccountMap()
  const numbers = [...PURCHASE_EXPENSE_NUMBERS] as string[]
  if (current && !numbers.includes(current)) numbers.push(current)
  return numbers.map((number) => ({
    number,
    name: byNumber.get(number)?.name ?? 'historisches Konto',
  }))
}

export function getAccountMap(accounts: Account[] = chartOfAccounts): Map<string, Account> {
  return new Map(accounts.map((account) => [account.number, account]))
}

export function accountsByGroup(
  accounts: Account[] = chartOfAccounts,
): Map<string, Account[]> {
  const grouped = new Map<string, Account[]>()
  for (const account of accounts) {
    const list = grouped.get(account.group) ?? []
    list.push(account)
    grouped.set(account.group, list)
  }
  return grouped
}
