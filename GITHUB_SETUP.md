# 🚀 GitHub Repository Setup Guide

This guide will help you push the parking-system project to GitHub with both **main** and **develop** branches.

## ✅ Current Status

Your local repository is ready:
- ✅ Git initialized
- ✅ All code committed to **main** branch
- ✅ **develop** branch created and ready
- ✅ .gitignore configured
- ✅ README.md added

## 📋 Step-by-Step Instructions

### Step 1: Create GitHub Repository

1. Go to https://github.com/new
2. Enter details:
   - **Repository name**: `parking-system`
   - **Description**: "Comprehensive parking management and car rental booking system with payment integration"
   - **Visibility**: Choose Public or Private
   - **Do NOT** initialize with README, .gitignore, or license (we have them already)
3. Click **"Create repository"**

### Step 2: Copy Repository URL

After creating the repository, you'll see a page with commands. Copy the HTTPS URL:
```
https://github.com/YOUR_USERNAME/parking-system.git
```

### Step 3: Add Remote and Configure

Open PowerShell in your parking-system directory and run:

```bash
cd "c:\Users\Adneya Khatate\Documents\SE\parking-system"

# Add the remote repository
git remote add origin https://github.com/YOUR_USERNAME/parking-system.git

# Verify remote is added
git remote -v
```

You should see:
```
origin  https://github.com/YOUR_USERNAME/parking-system.git (fetch)
origin  https://github.com/YOUR_USERNAME/parking-system.git (push)
```

### Step 4: Push Main Branch

```bash
# Make sure you're on main branch
git checkout main

# Push to GitHub
git push -u origin main

# Verify (should show commits)
git log --oneline
```

**Expected Output:**
```
0b06e43 (HEAD -> main, origin/main) docs: Add comprehensive README
079f4d8 Initial commit: Parking system with car rental booking and payment features
```

### Step 5: Push Develop Branch

```bash
# Switch to develop branch
git checkout develop

# Push to GitHub
git push -u origin develop

# Verify both branches exist locally and on GitHub
git branch -a
```

**Expected Output:**
```
  develop
* main
  remotes/origin/develop
  remotes/origin/main
```

## 🔐 Authentication

### If Prompted for Credentials

**Option 1: Personal Access Token (Recommended)**
1. Go to GitHub Settings → Developer settings → Personal access tokens → Tokens (classic)
2. Click "Generate new token (classic)"
3. Select scopes: `repo`, `admin:org_hook`
4. Copy the token
5. Paste when prompted for password

**Option 2: GitHub Desktop**
- Use GitHub Desktop app (easier authentication)
- Go to File → Clone repository → URL
- Paste: `https://github.com/YOUR_USERNAME/parking-system.git`

## ✅ Verification on GitHub

1. Go to https://github.com/YOUR_USERNAME/parking-system
2. Verify you see:
   - ✅ **main** branch (default)
   - ✅ **develop** branch
   - ✅ All commits visible
   - ✅ Files listed (README.md, backend/, frontend/, .gitignore, etc.)

## 📊 Branch Structure

```
main (production-ready)
  ↓ (pull requests)
develop (integration branch)
  ↓ (feature branches)
feature/rental-booking ✓ (merged)
feature/payment-system ✓ (merged)
feature/qr-code ✓ (merged)
```

## 🔄 Future Workflow

### Creating Feature Branches

```bash
# Update develop
git checkout develop
git pull origin develop

# Create feature branch
git checkout -b feature/my-feature-name

# Make changes and commit
git add .
git commit -m "feat: Add my feature"

# Push feature branch
git push -u origin feature/my-feature-name

# Create Pull Request on GitHub (web interface)
# - From: feature/my-feature-name
# - To: develop
```

### Merging to Main (Releases)

```bash
# After thorough testing, create PR
# - From: develop
# - To: main

# Or merge locally:
git checkout main
git pull origin main
git merge develop
git push origin main
```

## 🐛 Troubleshooting

### Remote Already Exists
```bash
# If you get "fatal: remote origin already exists"
git remote remove origin
git remote add origin https://github.com/YOUR_USERNAME/parking-system.git
```

### Authentication Failed
```bash
# Update credentials
git config --global credential.helper osxkeychain  # Mac
git config --global credential.helper wincred      # Windows
git config --global credential.helper store        # Linux
```

### Wrong Branch Pushed
```bash
# Undo push (if not yet merged)
git push origin --delete branch-name
git checkout correct-branch
git push -u origin correct-branch
```

### Need to Update Remote URL
```bash
# Check current URL
git remote -v

# Update URL
git remote set-url origin https://github.com/YOUR_USERNAME/parking-system.git
```

## 📋 Commands Checklist

```bash
# 1. Navigate to project
cd "c:\Users\Adneya Khatate\Documents\SE\parking-system"

# 2. Add remote
git remote add origin https://github.com/YOUR_USERNAME/parking-system.git

# 3. Verify remote
git remote -v

# 4. Push main
git checkout main
git push -u origin main

# 5. Push develop
git checkout develop
git push -u origin develop

# 6. Verify both branches
git branch -a

# 7. View commit history
git log --oneline --graph --all
```

## 🎉 Success Indicators

When everything is set up correctly, you should see:

1. **GitHub Repository** shows:
   - ✅ 2 branches (main, develop)
   - ✅ 2 commits in main
   - ✅ All files/folders visible
   - ✅ README.md displaying on repo page

2. **Local git** shows:
   ```
   $ git branch -a
   * main
     develop
     remotes/origin/main
     remotes/origin/develop
   ```

3. **Both branches are protected** (optional but recommended):
   - Go to Settings → Branches
   - Add protection rules for main branch
   - Require pull requests for changes
   - Require status checks before merge

## 📚 Learning Resources

- Git Documentation: https://git-scm.com/doc
- GitHub Guides: https://guides.github.com/
- Git Branching Model: https://nvie.com/posts/a-successful-git-branching-model/

## 💡 Pro Tips

1. **Set main as default branch** in GitHub Settings
2. **Add branch protection** to prevent direct commits to main
3. **Create pull request templates** for consistency
4. **Use meaningful commit messages** (feat:, fix:, docs:, etc.)
5. **Tag releases** when pushing to main: `git tag v1.0.0`

---

**Questions?** Create a GitHub issue or check GitHub Docs!

Happy coding! 🚀
