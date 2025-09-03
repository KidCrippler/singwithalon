from flask import Flask, send_from_directory, jsonify
import json
import random
import os

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

@app.route('/random_song')
def random_song():
    """Return a random song from the mock_songs.json file"""
    try:
        # Get the path to the mock_songs.json file
        mock_songs_path = os.path.join(os.path.dirname(__file__), 'data', 'mock_songs.json')
        
        # Load the songs from the JSON file
        with open(mock_songs_path, 'r', encoding='utf-8') as file:
            songs = json.load(file)
        
        # Select a random song
        random_song = random.choice(songs)
        
        return jsonify(random_song)
    
    except FileNotFoundError:
        return jsonify({'error': 'Songs data file not found'}), 404
    except json.JSONDecodeError:
        return jsonify({'error': 'Invalid JSON in songs data file'}), 500
    except Exception as e:
        return jsonify({'error': f'An error occurred: {str(e)}'}), 500

if __name__ == '__main__':
    app.run(debug=True, port=5000, host='0.0.0.0')