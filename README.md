# ☁️ CloudVault – Cloud File Manager

A sleek, modern cloud file manager built with Flask and vanilla JS. Upload, preview, organize, rename, and delete files right from your browser.

## ✨ Features
- **Upload files** via button or drag & drop
- **Preview** images, videos, audio, PDFs, and text files
- **Filter** by file type (Images, Documents, Videos)
- **Search** files instantly
- **Grid & List** view toggle
- **Rename & Delete** files
- **Storage usage** tracker (50 MB limit)
- **Dark mode** premium UI

## 🏗️ Tech Stack
- **Backend**: Flask (Python)
- **Frontend**: HTML, CSS, Vanilla JavaScript
- **Deployment**: Render (free tier)
- **Version Control**: GitHub

## 🚀 Run Locally

```bash
git clone https://github.com/YOUR_USERNAME/cloudvault
cd cloudvault
pip install -r requirements.txt
python app.py
```
Open http://localhost:5000

## 🌐 Deploy to Render (Free)

1. Push to GitHub
2. Go to [render.com](https://render.com) → New → Web Service
3. Connect your GitHub repo
4. Set:
   - **Build Command**: `pip install -r requirements.txt`
   - **Start Command**: `gunicorn app:app --bind 0.0.0.0:$PORT`
5. Click **Deploy** — done! ✅

## 📁 Project Structure

```
cloudvault/
├── app.py              ← Flask backend & API routes
├── requirements.txt    ← Python dependencies
├── render.yaml         ← Render deployment config
├── templates/
│   └── index.html      ← Main HTML page
├── static/
│   ├── css/style.css   ← All styles
│   └── js/app.js       ← All frontend logic
└── uploads/            ← Uploaded files stored here
```

## 🔌 API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/files` | List files (supports `?search=` & `?type=`) |
| POST | `/api/upload` | Upload files (multipart) |
| DELETE | `/api/delete/<name>` | Delete a file |
| POST | `/api/rename` | Rename a file |
| GET | `/api/stats` | Storage stats |
| GET | `/file/<name>` | Serve/download a file |

---
Built by Lahari R – Cloud Intern Capstone Project
