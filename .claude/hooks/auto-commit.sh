#!/bin/bash
# Stop hook: gitignore untracked non-source files, then commit everything else locally. Never pushes.
cd "${CLAUDE_PROJECT_DIR:-.}" || exit 0
git rev-parse --git-dir >/dev/null 2>&1 || exit 0
[ -d .git/rebase-merge ] || [ -d .git/rebase-apply ] || [ -f .git/MERGE_HEAD ] && exit 0

# 1. Untracked files that are not source code -> .gitignore (source dirs are exempt)
added=0
while IFS= read -r f; do
  case "$f" in assets/*|src/*|plugins/*|modules/*|scripts/*|tests/*|legal/*|docs/*|landing/*|graphify-out/*|.claude/*) continue;; esac
  case "$f" in
    *.mp4|*.mov|*.webm|*.mp3|*.wav|*.zip|*.tar|*.tar.gz|*.tgz|*.apk|*.aab|*.ipa|*.dmg|*.pdf|*.docx|*.xlsx|*.pptx|*.log|*.tmp|*.bak|*.swp|*.orig|*.rej|*.psd|*.sketch|*.fig|*.png|*.jpg|*.jpeg|*.heic|*.gif|*.webp|*_VERIFICATION.md|*_AUDIT*.md|*.pem|*.key|*.p8|*.p12|*.mobileprovision|*.jks|*.keystore|credentials.json|*service-account*.json|*.db|.env*|*.local.*|*.DS_Store) ;;
    *) continue;;
  esac
  pat="/$f"
  grep -qxF "$pat" .gitignore 2>/dev/null || { printf '\n' >> .gitignore 2>/dev/null; [ $added -eq 0 ] && echo "# Auto-ignored non-source files" >> .gitignore; echo "$pat" >> .gitignore; added=1; }
done < <(git ls-files --others --exclude-standard)

# Transient graphify files are never source
for p in "graphify-out/.pending_changes" "graphify-out/.rebuild.lock"; do
  grep -qxF "$p" .gitignore || echo "$p" >> .gitignore
  git rm -q --cached --ignore-unmatch "$p" 2>/dev/null
done

# 2. Commit
git add -A
git diff --cached --quiet && exit 0
n=$(git diff --cached --name-only | wc -l | tr -d ' ')
first=$(git diff --cached --name-only | head -3 | paste -sd', ' -)
git commit -q -m "Auto-commit: $n file(s) changed ($first)" -m "Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>" >/dev/null 2>&1
exit 0
