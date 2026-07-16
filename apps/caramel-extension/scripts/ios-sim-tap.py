#!/usr/bin/env python3
"""Find an AX element by label/id substring via idb describe-all and tap its center. Usage: tap.py <substring> [--index N] [--list]"""
import json, subprocess, sys, os
IDB = os.path.expanduser("~/caramel-ext-phase4/venv/bin/idb")
def elements():
    out = subprocess.run([IDB, "--companion", "localhost:10882", "ui", "describe-all"], capture_output=True, text=True, timeout=60).stdout
    return json.loads(out)
def main():
    args = sys.argv[1:]
    do_list = "--list" in args
    idx = 0
    if "--index" in args:
        i = args.index("--index"); idx = int(args[i+1]); del args[i:i+2]
    args = [a for a in args if a != "--list"]
    els = elements()
    if do_list and not args:
        for e in els:
            print(e.get("type"), "|", e.get("AXLabel"), "|", e.get("AXUniqueId"), "|", e.get("AXValue"), "|", e.get("frame"))
        return
    needle = args[0].lower()
    matches = [e for e in els if needle in str(e.get("AXLabel","")).lower() or needle in str(e.get("AXUniqueId","")).lower()]
    if do_list:
        for e in matches:
            print(e.get("type"), "|", e.get("AXLabel"), "|", e.get("AXUniqueId"), "|", e.get("AXValue"), "|", e.get("frame"))
        return
    if not matches:
        print("NOMATCH"); sys.exit(2)
    e = matches[idx]
    f = e["frame"]; x = f["x"] + f["width"]/2; y = f["y"] + f["height"]/2
    subprocess.run([IDB, "--companion", "localhost:10882", "ui", "tap", str(int(x)), str(int(y))], check=True, timeout=60)
    print(f"TAPPED {e.get('AXLabel')} at {x},{y} value={e.get('AXValue')}")
main()
