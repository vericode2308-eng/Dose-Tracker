"""Stage only public website files, excluding internal legal working documents."""
import shutil
import sys
from pathlib import Path

source = Path(__file__).resolve().parent.parent / "landing"
destination = Path(sys.argv[1]).resolve()
destination.mkdir(parents=True, exist_ok=False)
for filename in (
    "index.html", "app.js", "styles.css", "support.html", "privacy.html",
    "terms.html", "delete-data.html",
):
    shutil.copy2(source / filename, destination / filename)
shutil.copytree(source / "assets", destination / "assets", ignore=shutil.ignore_patterns(".DS_Store"))
(destination / "legal").mkdir()
for filename in ("PRIVACY_POLICY.md", "TERMS_OF_SERVICE.md", "DATA_DELETION.md"):
    shutil.copy2(source / "legal" / filename, destination / "legal" / filename)
print(destination)
