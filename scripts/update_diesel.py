#!/usr/bin/env python3
"""Fetch latest U.S. EIA weekly retail on-highway diesel price (U.S. average,
series EMD_EPD2D_PTE_NUS_DPG) and write data/diesel.json. No API key needed."""
import re, json, os, sys, urllib.request, datetime
URL = "https://www.eia.gov/dnav/pet/hist/LeafHandler.ashx?n=PET&s=EMD_EPD2D_PTE_NUS_DPG&f=W"
MON = {m: i for i, m in enumerate("Jan Feb Mar Apr May Jun Jul Aug Sep Oct Nov Dec".split(), 1)}
OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "data", "diesel.json")

def latest():
    req = urllib.request.Request(URL, headers={"User-Agent": "Mozilla/5.0 (RatePerMile.com diesel updater)"})
    h = urllib.request.urlopen(req, timeout=60).read().decode("utf-8", "replace").replace("&nbsp;", " ")
    best = None
    for row in re.findall(r"<tr>(.*?)</tr>", h, re.S):
        m = re.search(r">\s*(\d{4})-(\w{3})\s*<", row)
        if not m or m.group(2) not in MON: continue
        y, mo = int(m.group(1)), MON[m.group(2)]
        cells = re.findall(r"class='B5'>\s*(\d\d)/(\d\d)\s*</td>\s*<td class='B3'>\s*([\d.]+)\s*<", row)
        for cm, cd, v in cells:
            yy = y + 1 if int(cm) < mo else y  # week may roll into next year
            d = datetime.date(yy, int(cm), int(cd))
            if best is None or d > best[0]: best = (d, float(v))
    if not best: raise RuntimeError("no data parsed from EIA page")
    return best

def main():
    d, p = latest()
    if not (1.0 < p < 15.0): raise RuntimeError(f"implausible price {p}")
    data = {"price": p, "week": d.isoformat(),
            "source": "U.S. EIA weekly retail on-highway diesel, U.S. average",
            "series": "EMD_EPD2D_PTE_NUS_DPG", "url": "https://www.eia.gov/petroleum/gasdiesel/"}
    old = {}
    if os.path.exists(OUT):
        try: old = json.load(open(OUT))
        except Exception: pass
    if old.get("price") == p and old.get("week") == data["week"]:
        print("unchanged", p, data["week"]); return
    data["updated"] = datetime.datetime.now(datetime.timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    with open(OUT, "w") as f: json.dump(data, f, indent=1); f.write("\n")
    print("wrote", p, data["week"])

if __name__ == "__main__":
    try: main()
    except Exception as e: print("ERROR:", e, file=sys.stderr); sys.exit(1)
