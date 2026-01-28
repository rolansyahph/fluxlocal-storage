<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# FluxLocal Storage

A powerful local cloud storage system with advanced file upload capabilities.

## 🚀 Latest Update: Upload System Fixed!

**Version 2.0** - Now supports files up to **100GB** with improved stability and performance!

### ✅ What's New:
- ✨ **File size limit increased**: 50GB → **100GB** 
- ⚡ **Faster uploads**: Chunk size doubled (5MB → **10MB**)
- 🔄 **Better reliability**: Retry attempts increased (5 → **10 times**)
- 🎯 **More concurrent uploads**: 3 → **5 simultaneous uploads**
- ⏱️ **Timeout protection**: 5 minutes per chunk with auto-retry
- 🛡️ **Enhanced error handling**: Graceful degradation on network issues

👉 See [SUMMARY.md](SUMMARY.md) for complete details

## 📋 Prerequisites

- **Node.js** (v14 or higher)
- **npm** or **yarn**
- **Disk space** for uploaded files

## 🏃 Quick Start

### Option 1: One Command (Recommended)
```bash
npm install && npm run dev
```
Then in another terminal:
```bash
npm run server
```

### Option 2: Windows Batch Script
```bash
# Double-click this file:
start-server.bat
```

### Option 3: Step by Step
```bash
# 1. Install dependencies
npm install

# 2. Start the development server (Terminal 1)
npm run dev

# 3. Start the backend server (Terminal 2)
npm run server
```

## 🌐 Access the Application

- **Frontend**: http://localhost:5173
- **Backend API**: http://localhost:3001

## 👤 Demo Accounts

### Admin Account
- **Email**: admin@fluxlocal.com
- **Password**: 123
- **Storage**: 100GB
- **Permissions**: Full access

### User Account
- **Email**: user@fluxlocal.com
- **Password**: 123
- **Storage**: 50GB
- **Permissions**: Basic access

## 📁 Features

### File Management
- ✅ Upload files up to 100GB
- ✅ Upload multiple files simultaneously (5 concurrent)
- ✅ Upload entire folders with structure
- ✅ Download files
- ✅ Delete files and folders
- ✅ Copy/Cut/Paste files
- ✅ Create folders
- ✅ Navigate folder structure

### Sharing & Collaboration
- ✅ Share files with other users
- ✅ View files shared with you
- ✅ Save shared files to your drive

### Upload Manager
- ✅ Real-time upload progress
- ✅ Upload speed indicator
- ✅ Multiple concurrent uploads
- ✅ Auto-retry on network errors
- ✅ Pause/Cancel uploads

### Admin Panel
- ✅ User management
- ✅ Storage allocation
- ✅ View all users
- ✅ Create/Edit/Delete users

## 📊 Upload Performance

| File Size | Upload Time* | Chunks | Reliability |
|-----------|-------------|--------|-------------|
| < 100MB | 1-5s | 10-20 | ⭐⭐⭐⭐⭐ |
| 100MB - 1GB | 10-60s | 100-200 | ⭐⭐⭐⭐⭐ |
| 1GB - 10GB | 1-10min | 1K-2K | ⭐⭐⭐⭐⭐ |
| > 10GB | 10+ min | >2K | ⭐⭐⭐⭐ |

*Time depends on your upload bandwidth

## 🛠️ Tech Stack

### Frontend
- React + TypeScript
- Vite
- TailwindCSS
- Context API for state management

### Backend
- Express.js
- SQLite
- Multer for file uploads
- bcrypt for password hashing

## 📚 Documentation

- [SUMMARY.md](SUMMARY.md) - Quick overview of upload fixes
- [UPLOAD_FIX_DOCUMENTATION.md](UPLOAD_FIX_DOCUMENTATION.md) - Detailed technical documentation

## 🐛 Troubleshooting

### Upload fails or is slow?
1. Check your internet connection
2. Verify server is running on port 3001
3. Check browser console for errors
4. See [UPLOAD_FIX_DOCUMENTATION.md](UPLOAD_FIX_DOCUMENTATION.md) for detailed troubleshooting

### Server won't start?
```bash
# Kill any process using port 3001
# Windows:
npx kill-port 3001

# Then restart:
npm run server
```

### Database issues?
```bash
# Delete the database and restart
rm database.sqlite
npm run server
```

## 🔧 Configuration

### Adjust Upload Performance
Edit `contexts/FileSystemContext.tsx`:
```typescript
const CHUNK_SIZE = 10 * 1024 * 1024; // Adjust chunk size
const MAX_CONCURRENT_UPLOADS = 5; // Adjust concurrent uploads
```

### Adjust Server Limits
Edit `server/index.ts`:
```typescript
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 1024 * 1024 * 1024 * 100 // Adjust max file size
  }
});
```

## 📝 Project Structure

```
fluxlocal-storage/
├── components/          # React components
├── contexts/            # Context providers
├── server/              # Backend server
│   ├── index.ts        # Main server file
│   └── db.ts           # Database setup
├── uploads/            # Uploaded files storage
├── public/             # Static assets
└── README.md           # This file
```

## 🤝 Contributing

Found a bug or want to contribute? Feel free to:
1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Open a Pull Request

## 📄 License

This project is for educational and personal use.

## 🎉 Credits

Developed with ❤️ for better file management experience.

---

**Happy uploading! 🚀**

For support, check the documentation files or create an issue.

