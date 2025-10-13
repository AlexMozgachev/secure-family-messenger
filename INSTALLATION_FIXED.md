# Secure Messenger Builder - Installation Guide

## ✅ Installation Script Fixed (v2.1)

### What Was Fixed

**Problem:** The `install_ubuntu22_simple.sh` script was embedding outdated package versions directly in the script, causing version conflicts with the actual working codebase.

**Solution:** Updated the script to use the actual `package.json` and `requirements.txt` files from the repository instead of hardcoding outdated versions.

### Key Changes Made

1. **Backend Setup (lines 195-227)**
   - ✅ Now uses `requirements.txt` from repository (current working versions)
   - ❌ Removed hardcoded fallback package installation
   - ✅ Only creates `.env` if it doesn't exist (preserves existing configuration)

2. **Frontend Setup (lines 230-249)**
   - ✅ Uses `package.json` from repository (current working versions with React 19)
   - ❌ Removed embedded package.json generation (was using React 18, old router)
   - ✅ Only creates `.env` if it doesn't exist
   - ✅ Added network timeout for yarn install (prevents timeout issues)

### Current Working Versions

**Backend (requirements.txt):**
- FastAPI: 0.110.1
- Uvicorn: 0.25.0
- Motor: 3.3.1
- Pydantic: 2.11.9
- PyJWT: 2.10.1
- Psutil: 7.1.0
- And many more up-to-date packages

**Frontend (package.json):**
- React: 19.0.0
- React Router DOM: 7.5.1
- React Scripts: 5.0.1
- All @radix-ui components updated to latest versions
- Modern ESLint and Babel configurations

### Deprecated Files (Do Not Use)

These files are outdated and should NOT be used:
- ❌ `/app/requirements_ubuntu22.txt` (outdated versions from December 2023)
- ❌ `/app/package_ubuntu22.json` (React 18, old router)
- ❌ `/app/package_clean.json` (missing react-scripts)
- ❌ `install.sh` (Ubuntu 20.04 only)
- ❌ `install_ubuntu22.sh` (old version with SSL issues)
- ❌ `install_ubuntu22_fixed.sh` (still has hardcoded packages)

### Installation Instructions

For a fresh Ubuntu 22.04 LTS installation:

```bash
# Download the script
wget https://raw.githubusercontent.com/YOUR_REPO/Secure-Messenger-Builder/main/install_ubuntu22_simple.sh

# Make it executable
chmod +x install_ubuntu22_simple.sh

# Run with root privileges
sudo bash install_ubuntu22_simple.sh
```

### What the Script Does

1. ✅ Checks Ubuntu version (22.04 recommended)
2. ✅ Updates system packages
3. ✅ Installs Python 3.10
4. ✅ Installs Node.js 20 + Yarn
5. ✅ Installs MongoDB 6.0
6. ✅ Configures firewall (ports 22, 80, 443, 3000, 8001)
7. ✅ Clones the repository
8. ✅ Sets up backend with virtual environment using repository's `requirements.txt`
9. ✅ Sets up frontend using repository's `package.json`
10. ✅ Creates systemd services
11. ✅ Creates admin user (username: admin, password: admin123)
12. ✅ Starts all services

### After Installation

Access the application:
- 🌐 Frontend: `http://YOUR_SERVER_IP:3000`
- 👤 Admin Panel: `http://YOUR_SERVER_IP:3000/admin`
- 🔧 API Docs: `http://YOUR_SERVER_IP:8001/docs`

Default credentials:
- Login: `admin`
- Password: `admin123`

### SSL Configuration

SSL certificates are now configured through the admin panel (Settings → SSL) rather than during installation.

### Service Management

```bash
# Check status
sudo systemctl status secure-messenger-backend
sudo systemctl status secure-messenger-frontend

# Restart services
sudo systemctl restart secure-messenger-backend
sudo systemctl restart secure-messenger-frontend

# View logs
sudo journalctl -u secure-messenger-backend -f
sudo journalctl -u secure-messenger-frontend -f
```

### Troubleshooting

**Frontend not starting:**
```bash
cd /opt/Secure-Messenger-Builder/frontend
yarn install
sudo systemctl restart secure-messenger-frontend
```

**Backend not starting:**
```bash
cd /opt/Secure-Messenger-Builder/backend
source venv/bin/activate
pip install -r requirements.txt
sudo systemctl restart secure-messenger-backend
```

**MongoDB issues:**
```bash
sudo systemctl status mongod
sudo systemctl restart mongod
```

### Architecture

The application runs with:
- Backend: FastAPI on port 8001 (0.0.0.0:8001)
- Frontend: React development server on port 3000
- Database: MongoDB on port 27017 (localhost only)
- All services managed by systemd

### Development Setup

For development in the current environment (with supervisor):

```bash
# Services are already running with hot reload
sudo supervisorctl status

# Backend changes reload automatically
# Frontend changes reload automatically

# Only restart if you change .env or install new packages
sudo supervisorctl restart backend
sudo supervisorctl restart frontend
```

### Version Information

- **Script Version:** 2.1 (Fixed)
- **Ubuntu Target:** 22.04 LTS
- **Python:** 3.10
- **Node.js:** 20.x
- **MongoDB:** 6.0
- **React:** 19.0.0
- **FastAPI:** 0.110.1

---

**Note:** This installation script is specifically optimized for Ubuntu 22.04 LTS and uses the exact package versions that have been tested and verified to work together.
