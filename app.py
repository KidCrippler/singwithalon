from flask import Flask, send_from_directory, jsonify
import random

app = Flask(__name__)


@app.route('/')
def index():
    """Serve the main index.html page"""
    return send_from_directory('static', 'index.html')

@app.route('/<path:path>')
def static_files(path):
    """Serve all static files (CSS, JS, images, etc.)"""
    return send_from_directory('static', path)

@app.route('/api/hello')
def hello():
    """Dummy API endpoint for testing"""
    return jsonify({
        'message': 'Hello from Flask!',
        'status': 'success',
        'api_version': '1.0'
    })


if __name__ == '__main__':
    app.run(debug=True, port=5000, host='0.0.0.0')