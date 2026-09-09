#!/usr/bin/env python3
import argparse, json, math, sys
from pathlib import Path

TOL = 1e-9
MARGIN_TOL = 0.002  # 0.2 percentage points


def close(a, b, tol=TOL):
    try:
        return math.isclose(float(a), float(b), rel_tol=0, abs_tol=tol)
    except Exception:
        return False


def add(findings, severity, rule, path, message, expected=None):
    findings.append({"severity": severity, "rule_id": rule, "path": path, "message": message, "expected": expected})


def years_check(rows, count, ref_year, label, findings):
    years = [r.get("year") for r in rows if isinstance(r, dict)]
    if len(years) != count or len(set(years)) != count:
        add(findings, "P1", "FIN-TIME-001", f"financials.{label}", f"Expected exactly {count} unique years", count)
        return
    sy = sorted(years)
    if any((b-a) != 1 for a,b in zip(sy, sy[1:])):
        add(findings, "P1", "FIN-TIME-002", f"financials.{label}", "Years must be consecutive")
    if ref_year is not None and sy[-1] != ref_year:
        add(findings, "P1", "FIN-TIME-003", f"financials.{label}", f"Latest year {sy[-1]} does not equal reference_year {ref_year}")


def validate(d):
    findings=[]
    fin=d.get("financials",{})
    master=d.get("master",{})
    meta=d.get("meta",{})
    ref_year=master.get("reference_year", meta.get("reference_year"))
    inc=fin.get("income_statement",[]) or []
    bs=fin.get("balance_sheet",[]) or []
    cf=fin.get("cash_flow",[]) or []
    k=fin.get("kpis",{}) or {}

    years_check(inc,5,ref_year,"income_statement",findings)
    years_check(bs,3,ref_year,"balance_sheet",findings)
    years_check(cf,3,ref_year,"cash_flow",findings)

    inc_by_year={r.get("year"):r for r in inc if isinstance(r,dict)}
    bs_by_year={r.get("year"):r for r in bs if isinstance(r,dict)}
    cf_by_year={r.get("year"):r for r in cf if isinstance(r,dict)}

    for y,r in inc_by_year.items():
        p=f"financials.income_statement[{y}]"
        required=["revenue","gross_profit","opex","ebitda","da","ebit","interest","ebt","tax","net_income","ebitda_margin"]
        missing=[x for x in required if x not in r]
        if missing:
            add(findings,"P0","FIN-REQ-001",p,f"Missing fields: {missing}")
            continue
        if r["revenue"] < 0: add(findings,"P0","FIN-PL-001",p+".revenue","Revenue cannot be negative")
        if r["gross_profit"] > r["revenue"]+TOL: add(findings,"P0","FIN-PL-002",p+".gross_profit","Gross profit exceeds revenue")
        if not close(r["ebitda"], r["gross_profit"]-r["opex"]): add(findings,"P0","FIN-PL-003",p+".ebitda","EBITDA arithmetic mismatch",r["gross_profit"]-r["opex"])
        if not close(r["ebit"], r["ebitda"]-r["da"]): add(findings,"P0","FIN-PL-004",p+".ebit","EBIT arithmetic mismatch",r["ebitda"]-r["da"])
        if not close(r["ebt"], r["ebit"]-r["interest"]): add(findings,"P0","FIN-PL-005",p+".ebt","EBT arithmetic mismatch",r["ebit"]-r["interest"])
        if not close(r["net_income"], r["ebt"]-r["tax"]): add(findings,"P0","FIN-PL-006",p+".net_income","Net income arithmetic mismatch",r["ebt"]-r["tax"])
        if r["revenue"] != 0:
            exp=r["ebitda"]/r["revenue"]
            if not close(r["ebitda_margin"],exp,MARGIN_TOL): add(findings,"P0","FIN-PL-007",p+".ebitda_margin","EBITDA margin mismatch",round(exp,6))
        if r["tax"] < 0: add(findings,"P1","FIN-PL-008",p+".tax","Negative tax requires explicit rationale")

    for y,r in bs_by_year.items():
        p=f"financials.balance_sheet[{y}]"
        req=["cash","receivables","inventory","ppe","other_assets","total_assets","payables","debt","other_liabilities","equity","total_liab_equity"]
        missing=[x for x in req if x not in r]
        if missing:
            add(findings,"P0","FIN-REQ-002",p,f"Missing fields: {missing}")
            continue
        assets=sum(r[x] for x in ("cash","receivables","inventory","ppe","other_assets"))
        le=sum(r[x] for x in ("payables","debt","other_liabilities","equity"))
        if not close(assets,r["total_assets"]): add(findings,"P0","FIN-BS-001",p+".total_assets","Asset total mismatch",assets)
        if not close(le,r["total_assets"]): add(findings,"P0","FIN-BS-002",p,"Liabilities + equity do not equal total assets",r["total_assets"])
        if not close(r["total_liab_equity"],r["total_assets"]): add(findings,"P0","FIN-BS-003",p+".total_liab_equity","total_liab_equity mismatch",r["total_assets"])

    for y,r in cf_by_year.items():
        p=f"financials.cash_flow[{y}]"
        req=["ebitda","cash_tax","interest","change_nwc","capex","free_cash_flow"]
        missing=[x for x in req if x not in r]
        if missing:
            add(findings,"P0","FIN-REQ-003",p,f"Missing fields: {missing}")
            continue
        exp=r["ebitda"]-r["cash_tax"]-r["interest"]-r["change_nwc"]-r["capex"]
        if not close(exp,r["free_cash_flow"]): add(findings,"P0","FIN-CF-001",p+".free_cash_flow","Free cash flow mismatch",exp)
        if y in inc_by_year and not close(r["ebitda"],inc_by_year[y].get("ebitda")): add(findings,"P1","FIN-CF-002",p+".ebitda","Cash-flow EBITDA differs from income statement")

    if ref_year in inc_by_year:
        ir=inc_by_year[ref_year]
        for fld in ("revenue","ebitda","ebitda_margin","net_income"):
            if fld in k and not close(k[fld],ir.get(fld), MARGIN_TOL if fld=="ebitda_margin" else TOL):
                add(findings,"P0","FIN-KPI-001",f"financials.kpis.{fld}",f"KPI {fld} does not reconcile to reference-year income statement",ir.get(fld))
    if ref_year in bs_by_year:
        br=bs_by_year[ref_year]
        net_debt=br.get("debt",0)-br.get("cash",0)
        for path,val in (("master.net_debt",master.get("net_debt")),("financials.kpis.net_debt",k.get("net_debt"))):
            if val is not None and not close(val,net_debt): add(findings,"P0","FIN-KPI-002",path,"Net debt does not reconcile to debt less cash",net_debt)
        wc=br.get("receivables",0)+br.get("inventory",0)-br.get("payables",0)
        if k.get("working_capital") is not None and not close(k.get("working_capital"),wc): add(findings,"P1","FIN-KPI-003","financials.kpis.working_capital","Working capital does not reconcile to receivables + inventory - payables",wc)
        ebitda=inc_by_year.get(ref_year,{}).get("ebitda")
        if k.get("net_debt_to_ebitda") is not None and ebitda not in (None,0):
            exp=net_debt/ebitda
            if not close(k["net_debt_to_ebitda"],exp,0.02): add(findings,"P1","FIN-KPI-004","financials.kpis.net_debt_to_ebitda","Leverage ratio mismatch",round(exp,4))

    if master.get("employees") is not None and k.get("headcount") is not None and master["employees"] != k["headcount"]:
        add(findings,"P1","FIN-KPI-005","financials.kpis.headcount","Headcount does not reconcile to master.employees",master["employees"])

    for fld in ("top5_customer_concentration","recurring_revenue","export_share"):
        v=k.get(fld)
        if v is not None and not (0 <= v <= 1): add(findings,"P1","FIN-RATIO-001",f"financials.kpis.{fld}","Ratio must be between 0 and 1")
    m=k.get("ebitda_margin")
    if m is not None and not (-1 <= m <= 1): add(findings,"P1","FIN-RATIO-002","financials.kpis.ebitda_margin","EBITDA margin outside plausible ratio bounds")

    currency=meta.get("currency") or ("XOF" if "FCFA" in str(master.get("currency_unit","")) else None)
    scale=meta.get("scale")
    if d.get("schema_version") in {"2.0","3.0"}:
        if currency != "XOF": add(findings,"P1","FIN-UNIT-001","meta.currency","Canonical fixture currency should be XOF")
        if scale not in {"UNIT","THOUSAND","MILLION"}: add(findings,"P1","FIN-UNIT-002","meta.scale","Declare financial scale as UNIT, THOUSAND or MILLION")

    # Light sector plausibility warnings
    sector=str(master.get("sector","")).lower()
    if ref_year in bs_by_year and ref_year in inc_by_year:
        inv=bs_by_year[ref_year].get("inventory",0); rev=inc_by_year[ref_year].get("revenue",0)
        if rev and any(x in sector for x in ("saas","service","conseil","logiciel")) and inv/rev > 0.15:
            add(findings,"P2","FIN-PLAUS-001",f"financials.balance_sheet[{ref_year}].inventory","Inventory is high for a service/software profile; confirm business model")

    p0=sum(1 for x in findings if x["severity"]=="P0")
    p1=sum(1 for x in findings if x["severity"]=="P1")
    status="FAIL" if p0 else ("PASS_WITH_WARNINGS" if p1 or any(x["severity"]=="P2" for x in findings) else "PASS")
    return {"status":status,"summary":{"P0":p0,"P1":p1,"P2":sum(1 for x in findings if x["severity"]=="P2")},"findings":findings}


def main():
    ap=argparse.ArgumentParser()
    ap.add_argument("fixture")
    ap.add_argument("--output")
    args=ap.parse_args()
    d=json.loads(Path(args.fixture).read_text(encoding="utf-8"))
    result=validate(d)
    text=json.dumps(result,ensure_ascii=False,indent=2)
    if args.output: Path(args.output).write_text(text+"\n",encoding="utf-8")
    print(text)
    sys.exit(1 if result["status"]=="FAIL" else 0)

if __name__=="__main__": main()
