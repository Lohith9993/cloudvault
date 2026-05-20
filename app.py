from flask import Flask, request, jsonify, render_template, send_from_directory, session
from werkzeug.security import generate_password_hash, check_password_hash
import os, datetime, mimetypes, sqlite3, uuid, functools

app = Flask(__name__)
app.secret_key = 'cloudvault-secret-key-change-in-production'
app.config['UPLOAD_FOLDER'] = 'uploads'
app.config['MAX_CONTENT_LENGTH'] = 50 * 1024 * 1024  # 50MB

os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)

# ─── DATABASE SETUP ────────────────────────────────────────────────────────────

def get_db():
    conn = sqlite3.connect('cloudvault.db')
    conn.row_factory = sqlite3.Row
    conn = sqlite3.connect('/tmp/cloudvault.db')

def init_db():
    conn = get_db()
    conn.executescript('''
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT UNIQUE NOT NULL,
            email TEXT UNIQUE NOT NULL,
            password TEXT NOT NULL,
            created_at TEXT DEFAULT (datetime('now'))
        );

        CREATE TABLE IF NOT EXISTS files (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            filename TEXT NOT NULL,
            original_name TEXT NOT NULL,
            size_bytes INTEGER,
            mime_type TEXT,
            share_token TEXT UNIQUE,
            share_expires TEXT,
            uploaded_at TEXT DEFAULT (datetime('now')),
            FOREIGN KEY (user_id) REFERENCES users(id)
        );
    ''')
    conn.commit()
    conn.close()

init_db()

# ─── AUTH HELPERS ───────────────────────────────────────────────────────────────

def login_required(f):
    @functools.wraps(f)
    def decorated(*args, **kwargs):
        if 'user_id' not in session:
            return jsonify({'error': 'Login required'}), 401
        return f(*args, **kwargs)
    return decorated

def current_user():
    return session.get('user_id')

# ─── FILE HELPERS ───────────────────────────────────────────────────────────────

def user_upload_dir(user_id):
    path = os.path.join(app.config['UPLOAD_FOLDER'], str(user_id))
    os.makedirs(path, exist_ok=True)
    return path

def get_file_info(filename, user_id, row=None):
    path = os.path.join(user_upload_dir(user_id), filename)
    if not os.path.exists(path):
        return None
    stat = os.stat(path)
    mime, _ = mimetypes.guess_type(filename)
    size = stat.st_size
    if size < 1024:
        size_str = f"{size} B"
    elif size < 1024 * 1024:
        size_str = f"{size/1024:.1f} KB"
    else:
        size_str = f"{size/(1024*1024):.1f} MB"
    return {
        'name': filename,
        'original_name': row['original_name'] if row else filename,
        'size': size_str,
        'size_bytes': size,
        'modified': datetime.datetime.fromtimestamp(stat.st_mtime).strftime('%b %d, %Y %I:%M %p'),
        'type': mime or 'application/octet-stream',
        'url': f'/file/{filename}',
        'share_token': row['share_token'] if row else None
    }

# ─── AUTH ROUTES ────────────────────────────────────────────────────────────────

@app.route('/')
def index():
    if 'user_id' not in session:
        return render_template('login.html')
    return render_template('index.html', username=session.get('username'))

@app.route('/api/register', methods=['POST'])
def register():
    data = request.json
    username = data.get('username', '').strip()
    email = data.get('email', '').strip()
    password = data.get('password', '')
    if not username or not email or not password:
        return jsonify({'error': 'All fields required'}), 400
    if len(password) < 6:
        return jsonify({'error': 'Password must be at least 6 characters'}), 400
    hashed = generate_password_hash(password)
    try:
        conn = get_db()
        conn.execute('INSERT INTO users (username, email, password) VALUES (?, ?, ?)',
                     (username, email, hashed))
        conn.commit()
        user = conn.execute('SELECT * FROM users WHERE username = ?', (username,)).fetchone()
        session['user_id'] = user['id']
        session['username'] = user['username']
        conn.close()
        return jsonify({'success': True, 'username': username})
    except sqlite3.IntegrityError:
        return jsonify({'error': 'Username or email already exists'}), 409

@app.route('/api/login', methods=['POST'])
def login():
    data = request.json
    username = data.get('username', '').strip()
    password = data.get('password', '')
    conn = get_db()
    user = conn.execute('SELECT * FROM users WHERE username = ?', (username,)).fetchone()
    conn.close()
    if not user or not check_password_hash(user['password'], password):
        return jsonify({'error': 'Invalid username or password'}), 401
    session['user_id'] = user['id']
    session['username'] = user['username']
    return jsonify({'success': True, 'username': user['username']})

@app.route('/api/logout', methods=['POST'])
def logout():
    session.clear()
    return jsonify({'success': True})

@app.route('/api/me')
@login_required
def me():
    return jsonify({'user_id': session['user_id'], 'username': session['username']})

# ─── FILE ROUTES ────────────────────────────────────────────────────────────────

@app.route('/api/files', methods=['GET'])
@login_required
def list_files():
    search = request.args.get('search', '').lower()
    filter_type = request.args.get('type', 'all')
    uid = current_user()
    conn = get_db()
    rows = conn.execute('SELECT * FROM files WHERE user_id = ? ORDER BY uploaded_at DESC', (uid,)).fetchall()
    conn.close()
    files = []
    for row in rows:
        info = get_file_info(row['filename'], uid, row)
        if not info:
            continue
        if search and search not in row['original_name'].lower():
            continue
        t = info['type']
        if filter_type == 'image' and not t.startswith('image'):
            continue
        if filter_type == 'document' and not (t.startswith('text') or 'pdf' in t or 'word' in t):
            continue
        if filter_type == 'video' and not t.startswith('video'):
            continue
        files.append(info)
    total_bytes = sum(f['size_bytes'] for f in files)
    return jsonify({
        'files': files,
        'count': len(files),
        'total_size': f"{total_bytes/(1024*1024):.1f} MB" if total_bytes > 1024*1024 else f"{total_bytes/1024:.1f} KB"
    })

@app.route('/api/upload', methods=['POST'])
@login_required
def upload():
    if 'files' not in request.files:
        return jsonify({'error': 'No files'}), 400
    uid = current_user()
    upload_dir = user_upload_dir(uid)
    uploaded = []
    conn = get_db()
    for f in request.files.getlist('files'):
        if f.filename:
            original_name = f.filename
            safe_name = f.filename.replace('/', '_').replace('..', '')
            base, ext = os.path.splitext(safe_name)
            unique_name = f"{base}_{uuid.uuid4().hex[:8]}{ext}"
            f.save(os.path.join(upload_dir, unique_name))
            stat = os.stat(os.path.join(upload_dir, unique_name))
            mime, _ = mimetypes.guess_type(unique_name)
            conn.execute(
                'INSERT INTO files (user_id, filename, original_name, size_bytes, mime_type) VALUES (?, ?, ?, ?, ?)',
                (uid, unique_name, original_name, stat.st_size, mime)
            )
            conn.commit()
            row = conn.execute('SELECT * FROM files WHERE filename = ?', (unique_name,)).fetchone()
            uploaded.append(get_file_info(unique_name, uid, row))
    conn.close()
    return jsonify({'uploaded': uploaded, 'count': len(uploaded)})

@app.route('/api/delete/<filename>', methods=['DELETE'])
@login_required
def delete_file(filename):
    uid = current_user()
    conn = get_db()
    row = conn.execute('SELECT * FROM files WHERE filename = ? AND user_id = ?', (filename, uid)).fetchone()
    if not row:
        conn.close()
        return jsonify({'error': 'File not found'}), 404
    path = os.path.join(user_upload_dir(uid), filename)
    if os.path.exists(path):
        os.remove(path)
    conn.execute('DELETE FROM files WHERE filename = ? AND user_id = ?', (filename, uid))
    conn.commit()
    conn.close()
    return jsonify({'success': True})

@app.route('/api/rename', methods=['POST'])
@login_required
def rename_file():
    data = request.json
    uid = current_user()
    conn = get_db()
    row = conn.execute('SELECT * FROM files WHERE filename = ? AND user_id = ?',
                       (data['filename'], uid)).fetchone()
    if not row:
        conn.close()
        return jsonify({'error': 'File not found'}), 404
    conn.execute('UPDATE files SET original_name = ? WHERE filename = ? AND user_id = ?',
                 (data['new_name'], data['filename'], uid))
    conn.commit()
    conn.close()
    return jsonify({'success': True})

@app.route('/api/share/<filename>', methods=['POST'])
@login_required
def share_file(filename):
    uid = current_user()
    token = uuid.uuid4().hex
    expires = (datetime.datetime.now() + datetime.timedelta(hours=24)).isoformat()
    conn = get_db()
    conn.execute('UPDATE files SET share_token = ?, share_expires = ? WHERE filename = ? AND user_id = ?',
                 (token, expires, filename, uid))
    conn.commit()
    conn.close()
    return jsonify({'share_url': f'/shared/{token}', 'expires': expires})

@app.route('/shared/<token>')
def shared_file(token):
    conn = get_db()
    row = conn.execute('SELECT * FROM files WHERE share_token = ?', (token,)).fetchone()
    conn.close()
    if not row:
        return "File not found or link expired", 404
    if datetime.datetime.fromisoformat(row['share_expires']) < datetime.datetime.now():
        return "Share link has expired", 410
    return send_from_directory(user_upload_dir(row['user_id']), row['filename'],
                               download_name=row['original_name'])

@app.route('/file/<filename>')
@login_required
def serve_file(filename):
    uid = current_user()
    return send_from_directory(user_upload_dir(uid), filename)

@app.route('/api/stats')
@login_required
def stats():
    uid = current_user()
    conn = get_db()
    rows = conn.execute('SELECT * FROM files WHERE user_id = ?', (uid,)).fetchall()
    conn.close()
    total = sum(r['size_bytes'] or 0 for r in rows)
    limit = 50 * 1024 * 1024
    types = {}
    for r in rows:
        t = (r['mime_type'] or 'other').split('/')[0]
        types[t] = types.get(t, 0) + 1
    return jsonify({
        'total_files': len(rows),
        'used_bytes': total,
        'limit_bytes': limit,
        'used_percent': round((total / limit) * 100, 1),
        'used_str': f"{total/(1024*1024):.1f} MB",
        'limit_str': "50 MB",
        'type_breakdown': types
    })

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5000)
