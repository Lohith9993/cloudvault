from flask import Flask, request, jsonify, render_template, send_from_directory
import os, uuid, datetime, mimetypes

app = Flask(__name__)
app.config['UPLOAD_FOLDER'] = 'uploads'
app.config['MAX_CONTENT_LENGTH'] = 50 * 1024 * 1024  # 50MB

os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)

def get_file_info(filename):
    path = os.path.join(app.config['UPLOAD_FOLDER'], filename)
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
        'size': size_str,
        'size_bytes': size,
        'modified': datetime.datetime.fromtimestamp(stat.st_mtime).strftime('%b %d, %Y %I:%M %p'),
        'type': mime or 'application/octet-stream',
        'url': f'/file/{filename}'
    }

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/api/files', methods=['GET'])
def list_files():
    search = request.args.get('search', '').lower()
    filter_type = request.args.get('type', 'all')
    files = []
    for fname in os.listdir(app.config['UPLOAD_FOLDER']):
        info = get_file_info(fname)
        if info:
            if search and search not in fname.lower():
                continue
            t = info['type']
            if filter_type == 'image' and not t.startswith('image'):
                continue
            if filter_type == 'document' and not (t.startswith('text') or 'pdf' in t or 'word' in t or 'sheet' in t):
                continue
            if filter_type == 'video' and not t.startswith('video'):
                continue
            files.append(info)
    files.sort(key=lambda x: x['modified'], reverse=True)
    total_bytes = sum(f['size_bytes'] for f in files)
    return jsonify({
        'files': files,
        'count': len(files),
        'total_size': f"{total_bytes/(1024*1024):.1f} MB" if total_bytes > 1024*1024 else f"{total_bytes/1024:.1f} KB"
    })

@app.route('/api/upload', methods=['POST'])
def upload():
    if 'files' not in request.files:
        return jsonify({'error': 'No files'}), 400
    uploaded = []
    for f in request.files.getlist('files'):
        if f.filename:
            safe_name = f.filename.replace('/', '_').replace('..', '')
            # Avoid duplicates
            base, ext = os.path.splitext(safe_name)
            final_name = safe_name
            counter = 1
            while os.path.exists(os.path.join(app.config['UPLOAD_FOLDER'], final_name)):
                final_name = f"{base}_{counter}{ext}"
                counter += 1
            f.save(os.path.join(app.config['UPLOAD_FOLDER'], final_name))
            uploaded.append(get_file_info(final_name))
    return jsonify({'uploaded': uploaded, 'count': len(uploaded)})

@app.route('/api/delete/<filename>', methods=['DELETE'])
def delete_file(filename):
    path = os.path.join(app.config['UPLOAD_FOLDER'], filename)
    if os.path.exists(path):
        os.remove(path)
        return jsonify({'success': True})
    return jsonify({'error': 'File not found'}), 404

@app.route('/api/rename', methods=['POST'])
def rename_file():
    data = request.json
    old = os.path.join(app.config['UPLOAD_FOLDER'], data['old_name'])
    new = os.path.join(app.config['UPLOAD_FOLDER'], data['new_name'])
    if os.path.exists(old):
        os.rename(old, new)
        return jsonify({'success': True, 'file': get_file_info(data['new_name'])})
    return jsonify({'error': 'File not found'}), 404

@app.route('/file/<filename>')
def serve_file(filename):
    return send_from_directory(app.config['UPLOAD_FOLDER'], filename)

@app.route('/api/stats')
def stats():
    files = [get_file_info(f) for f in os.listdir(app.config['UPLOAD_FOLDER'])]
    files = [f for f in files if f]
    total = sum(f['size_bytes'] for f in files)
    limit = 50 * 1024 * 1024
    types = {}
    for f in files:
        t = f['type'].split('/')[0]
        types[t] = types.get(t, 0) + 1
    return jsonify({
        'total_files': len(files),
        'used_bytes': total,
        'limit_bytes': limit,
        'used_percent': round((total / limit) * 100, 1),
        'used_str': f"{total/(1024*1024):.1f} MB",
        'limit_str': "50 MB",
        'type_breakdown': types
    })

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5000)
