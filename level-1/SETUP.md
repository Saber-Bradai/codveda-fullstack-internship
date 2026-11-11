# Level 1 · Task 1: Development Environment Setup

## Installed tools (verified)

| Tool | Version | Check |
|---|---|---|
| Node.js | 22.13.0 | `node -v` |
| npm | 10.9.2 | `npm -v` |
| Git | 2.51 | `git --version` |
| VS Code | 1.145 | `code --version` |
| Docker | 28.4 (optional, for running MongoDB) | `docker --version` |

## Node.js and npm
1. Install the LTS version from https://nodejs.org (or use `nvm-windows` / `nvm`).
2. Check with `node -v` and `npm -v`.
3. Useful commands: `npm init -y`, `npm install <pkg>`, `npm install -D <pkg>`, `npm run <script>`, `npm ci`.
4. Yarn (optional): `corepack enable` and then `yarn -v`.

## Database (MongoDB)
Pick one option:
- **Docker:** `docker run -d --name mongo -p 27017:27017 mongo:8`, then `MONGO_URI=mongodb://127.0.0.1:27017/codveda`
- **Local install:** MongoDB Community Server + `mongosh`
- **Cloud:** a free MongoDB Atlas cluster (used for the Level 3 deployment)
- **Zero-setup dev:** Levels 2 and 3 fall back to `mongodb-memory-server` when `MONGO_URI` is empty

## Git and GitHub
```bash
git config --global user.name  "Your Name"
git config --global user.email "you@example.com"

git init                     # create a repository
git status                   # see changed files
git add .                    # stage changes
git commit -m "message"      # save a snapshot
git branch -M main           # rename branch to main
git remote add origin https://github.com/<you>/codveda-fullstack.git
git push -u origin main      # publish to GitHub
git pull                     # get remote changes
git checkout -b feature/x    # new branch
git log --oneline            # history
```

## Basic terminal commands
| Purpose | Bash / Git Bash | PowerShell |
|---|---|---|
| Where am I | `pwd` | `Get-Location` |
| List files | `ls -la` | `ls` |
| Change dir | `cd folder`, `cd ..` | same |
| Make dir | `mkdir -p a/b` | `mkdir a\b` |
| New file | `touch file.js` | `New-Item file.js` |
| Copy / move | `cp a b`, `mv a b` | `cp a b`, `mv a b` |
| Delete | `rm file`, `rm -r dir` | `rm file`, `rm -r dir` |
| Print file | `cat file` | `cat file` |
| Find text | `grep -r "text" .` | `Select-String "text" *.js` |
| Clear screen | `clear` | `cls` |

## VS Code extensions used
ESLint, Prettier, Thunder Client (API testing), REST Client, MongoDB for VS Code, GitLens.
