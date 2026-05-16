import subprocess
import click
from pathlib import Path

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
def main(workers: int, local_folder: str, force: bool, dry_run: bool):
    folder = Path(local_folder)

    for photo_folder in folder.iterdir():
        name = photo_folder.name
        cmd = [
            "python",
            "upload.py",
            "--folder",
            str(photo_folder),
            "--name",
            name,
            "--workers",
            str(workers),
        ]
        if force:
            cmd.append("--force")

        if dry_run:
            cmd.append("--dry-run")

        subprocess.run(cmd)

if __name__ == "__main__":
    main()