# Financial consistency standard v3

Apply deterministic arithmetic checks and analytical plausibility checks separately. Arithmetic failures are release blockers; plausibility issues are warnings unless they contradict another fixture fact.

## Arithmetic — P0
For every displayed year:
- `gross_profit <= revenue`.
- `ebitda = gross_profit - opex`.
- `ebit = ebitda - da`.
- `ebt = ebit - interest`.
- `net_income = ebt - tax`.
- `ebitda_margin = ebitda / revenue` within 0.2 percentage points.
- `total_assets = cash + receivables + inventory + ppe + other_assets`.
- `total_assets = payables + debt + other_liabilities + equity`.
- `total_liab_equity = total_assets`.
- `free_cash_flow = ebitda - cash_tax - interest - change_nwc - capex`.

## Cross-statement reconciliation — P0/P1
For the latest balance-sheet year:
- `net_debt = debt - cash` and must reconcile to master/KPI values within rounding tolerance.
- `net_debt_to_ebitda = net_debt / EBITDA` when EBITDA is positive.
- `working_capital = receivables + inventory - payables` unless the fixture explicitly defines another formula.
- KPI revenue, EBITDA, margin and net income must reconcile to the income statement for the KPI year.
- Headcount must reconcile to master employees.

## Time and units — P1
- Income statement: exactly 5 unique consecutive years ending on `reference_year`.
- Balance sheet and cash flow: exactly 3 unique consecutive years ending on `reference_year`.
- Canonical currency must be declared and financial scale explicit.
- Avoid mixing `FCFA`, `M FCFA`, EUR and USD in the canonical data without a declared conversion layer.

## Ratio bounds — P1
- Customer concentration, recurring revenue and export share: 0–1.
- EBITDA margin: normally -1 to 1; values outside this range require explicit rationale.
- Employee/headcount values must be non-negative integers.

## Analytical plausibility — warnings
Use sector logic without pretending there is one universal benchmark:
- SaaS/services normally carry lower inventory and higher gross margins than manufacturing/distribution.
- Industrial/logistics/hospitality cases normally carry more fixed assets and capex.
- Distress cases may show weak free cash flow, covenant pressure, overdue maintenance or negative working-capital signals.
- Revenue growth and margin expansion should have a narrative driver; avoid smooth artificial curves with no operating explanation.
- If net debt is negative, describe the company as net cash rather than leveraged.
