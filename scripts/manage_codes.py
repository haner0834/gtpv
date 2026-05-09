#!/usr/bin/env python3
"""
用法：
  python manage_codes.py list           # 列出目前所有 folder
  python manage_codes.py set 510 1234   # 新增或更新
  python manage_codes.py delete lil-u   # 刪除
"""
import json, subprocess, sys

# 這裡手動維護，或從某個 local json 檔讀取
CODES_FILE = ".folder_codes.json"

from pathlib import Path

def load() -> dict:
    p = Path(CODES_FILE)
    return json.loads(p.read_text()) if p.exists() else {}

def save(codes: dict):
    Path(CODES_FILE).write_text(json.dumps(codes, indent=2))
    # 同步到 wrangler
    subprocess.run(
        ["npx", "wrangler", "secret", "put", "FOLDER_CODES"],
        input=json.dumps(codes),
        text=True,
        check=True,
    )
    print("✅ 已同步到 Cloudflare Worker")

cmd = sys.argv[1] if len(sys.argv) > 1 else "list"
codes = load()

if cmd == "list":
    for k, v in codes.items():
        print(f"  {k}: {v}")
elif cmd == "set" and len(sys.argv) == 4:
    codes[sys.argv[2]] = sys.argv[3]
    save(codes)
elif cmd == "delete" and len(sys.argv) == 3:
    codes.pop(sys.argv[2], None)
    save(codes)
else:
    print(__doc__)