#!/usr/bin/env python3
"""
GTPV Upload Script
==================
掃描本機 folder，產生縮圖，上傳到 Cloudflare R2。

Usage:
    python upload.py --folder ./my-photos --name lil-u
    python upload.py --folder ./my-photos --name lil-u --force   # 覆蓋已存在的檔案

Setup:
    1. 複製 .env.example 成 .env 並填入 R2 credentials
    2. pip install boto3 Pillow click python-dotenv

.env 格式:
    R2_ACCOUNT_ID=your_account_id
    R2_ACCESS_KEY_ID=your_access_key
    R2_SECRET_ACCESS_KEY=your_secret_key
    R2_BUCKET_NAME=gtpv-images
"""

import os
import sys
import uuid
import hashlib
from pathlib import Path
from io import BytesIO
from concurrent.futures import ThreadPoolExecutor, as_completed
import threading

import boto3
import click
from botocore.config import Config
from dotenv import load_dotenv
from PIL import Image, ExifTags # type: ignore

load_dotenv()

THUMBNAIL_SIZES = [64, 128, 256, 512]
SUPPORTED_EXTS = {".jpg", ".jpeg", ".png", ".webp", ".heic", ".heif"}


def get_r2_client():
    account_id = os.environ["R2_ACCOUNT_ID"].strip()
    access_key = os.environ["R2_ACCESS_KEY_ID"].strip()
    secret_key = os.environ["R2_SECRET_ACCESS_KEY"].strip()

    return boto3.client(
        "s3",
        endpoint_url=f"https://{account_id}.r2.cloudflarestorage.com",
        aws_access_key_id=access_key,
        aws_secret_access_key=secret_key,
        config=Config(
    signature_version="s3v4",
    retries={"max_attempts": 3},
),
        region_name="apac",
    )


def fix_orientation(img: Image.Image) -> Image.Image:
    """修正 EXIF 旋轉資訊"""
    try:
        exif = img._getexif()
        if exif is None:
            return img
        orientation_key = next(
            k for k, v in ExifTags.TAGS.items() if v == "Orientation"
        )
        orientation = exif.get(orientation_key)
        rotations = {3: 180, 6: 270, 8: 90}
        if orientation in rotations:
            img = img.rotate(rotations[orientation], expand=True)
    except Exception:
        pass
    return img


def make_thumbnail(img: Image.Image, size: int) -> bytes:
    """產生正方形縮圖（保持比例，置中裁切）"""
    img = fix_orientation(img)
    img = img.convert("RGB")

    # 縮放到最短邊 = size，然後裁切中央
    w, h = img.size
    ratio = size / min(w, h)
    new_w, new_h = int(w * ratio), int(h * ratio)
    img = img.resize((new_w, new_h), Image.LANCZOS)

    left = (new_w - size) // 2
    top = (new_h - size) // 2
    img = img.crop((left, top, left + size, top + size))

    buf = BytesIO()
    img.save(buf, format="JPEG", quality=85, optimize=True)
    return buf.getvalue()


def file_md5(path: Path) -> str:
    h = hashlib.md5()
    with open(path, "rb") as f:
        for chunk in iter(lambda: f.read(65536), b""):
            h.update(chunk)
    return h.hexdigest()


def image_id_from_file(path: Path, existing_ids: set[str]) -> str:
    """以原始檔名（不含副檔名）作為 IMAGE_ID，重複時加上 _1, _2..."""
    base = path.stem  # e.g. "IMG_0211"
    candidate = base
    counter = 1
    while candidate in existing_ids:
        candidate = f"{base}_{counter}"
        counter += 1
    return candidate


def key_exists(client, bucket: str, key: str) -> bool:
    try:
        client.head_object(Bucket=bucket, Key=key)
        return True
    except client.exceptions.ClientError:
        return False
    except Exception:
        return False


def upload_bytes(client, bucket: str, key: str, data: bytes, content_type: str):
    client.put_object(
        Bucket=bucket,
        Key=key,
        Body=data,
        ContentType=content_type,
        ContentLength=len(data),
    )


def get_content_type(path: Path) -> str:
    ext = path.suffix.lower()
    mapping = {
        ".jpg": "image/jpeg",
        ".jpeg": "image/jpeg",
        ".png": "image/png",
        ".webp": "image/webp",
        ".heic": "image/heic",
        ".heif": "image/heif",
    }
    return mapping.get(ext, "application/octet-stream")


@click.command()
@click.option(
    "--workers",
    default=4,
    show_default=True,
    help="並行上傳的 thread 數量",
)
@click.option(
    "--folder",
    "local_folder",
    required=True,
    type=click.Path(exists=True, file_okay=False),
    help="本機相片資料夾路徑",
)
@click.option(
    "--name",
    "folder_name",
    required=True,
    help="R2 上的 folder 名稱（對應網址 /:folder）",
)
@click.option(
    "--force",
    is_flag=True,
    default=False,
    help="強制覆蓋已存在的檔案",
)
@click.option(
    "--dry-run",
    is_flag=True,
    default=False,
    help="僅列出將要上傳的檔案，不實際上傳",
)
def main(workers: int, local_folder: str, folder_name: str, force: bool, dry_run: bool):
    """GTPV 相片上傳工具"""

    bucket = os.environ.get("R2_BUCKET_NAME", "gtpv-images")
    source = Path(local_folder)

    # 收集所有支援的圖片
    files = sorted(
        [f for f in source.rglob("*") if f.suffix.lower() in SUPPORTED_EXTS]
    )

    if not files:
        click.echo(f"⚠️  在 {source} 找不到支援的圖片格式")
        sys.exit(1)

    click.echo(f"📂  Folder : {folder_name}")
    click.echo(f"🪣  Bucket : {bucket}")
    click.echo(f"🖼️   共找到 : {len(files)} 張圖片")
    if dry_run:
        click.echo("🔍  Dry run 模式，不會實際上傳\n")

    client = None if dry_run else get_r2_client()

    lock = threading.Lock()
    used_ids: set[str] = set()

    def process_file(args):
        idx, file_path = args
        image_id = image_id_from_file(file_path, used_ids)
        with lock:
            used_ids.add(image_id)
        prefix = f"{folder_name}/{image_id}"

        results = {"uploaded": 0, "skipped": 0, "errors": 0}

        with lock:
            click.echo(f"\n[{idx}/{len(files)}] {file_path.name} → {image_id}")

        try:
            with Image.open(file_path) as img:
                img.load()

            # Full image
            full_key = f"{prefix}/full"
            with open(file_path, "rb") as f:
                full_data = f.read()

            if dry_run:
                with lock:
                    click.echo(f"  [dry] full     → {full_key}")
            elif force or not key_exists(client, bucket, full_key):
                upload_bytes(client, bucket, full_key, full_data, get_content_type(file_path))
                with lock:
                    click.echo(f"  ✅ full     ({len(full_data) // 1024} KB)")
                results["uploaded"] += 1
            else:
                with lock:
                    click.echo(f"  ⏭️  full     (已存在，略過)")
                results["skipped"] += 1

        # Thumbnails
            with Image.open(file_path) as img:
                for size in THUMBNAIL_SIZES:
                    thumb_key = f"{prefix}/thumbnail{size}"
                    if dry_run:
                        with lock:
                            click.echo(f"  [dry] thumb{size:<3}  → {thumb_key}")
                        continue

                    if not force and key_exists(client, bucket, thumb_key):
                        with lock:
                            click.echo(f"  ⏭️  thumb{size:<3}  (已存在，略過)")
                        results["skipped"] += 1
                        continue

                    thumb_data = make_thumbnail(img, size)
                    upload_bytes(client, bucket, thumb_key, thumb_data, "image/jpeg")
                    with lock:
                        click.echo(f"  ✅ thumb{size:<3}  ({len(thumb_data) // 1024} KB)")
                    results["uploaded"] += 1

        except Exception as e:
            with lock:
                click.echo(f"  ❌ 錯誤: {e}", err=True)
            results["errors"] += 1

        return results
    
    uploaded = 0
    skipped = 0
    errors = 0

    with ThreadPoolExecutor(max_workers=workers) as executor:
        futures = {
            executor.submit(process_file, (idx, f)): f
            for idx, f in enumerate(files, 1)
        }
        for future in as_completed(futures):
            r = future.result()
            uploaded += r["uploaded"]
            skipped += r["skipped"]
            errors += r["errors"]

    click.echo(f"\n{'='*40}")
    click.echo(f"✅ 上傳: {uploaded}  ⏭️ 略過: {skipped}  ❌ 錯誤: {errors}")


if __name__ == "__main__":
    main()
