from flask import Flask, send_from_directory, jsonify
import random

app = Flask(__name__)

# Song database - easy to extend with more songs
SONGS = [
    {
        "id": 1,
        "title": "Bohemian Rhapsody",
        "artist": "Queen",
        "album": "A Night at the Opera",
        "year": 1975,
        "genre": "Rock"
    },
    {
        "id": 2,
        "title": "Hotel California",
        "artist": "Eagles",
        "album": "Hotel California",
        "year": 1976,
        "genre": "Rock"
    },
    {
        "id": 3,
        "title": "Billie Jean",
        "artist": "Michael Jackson",
        "album": "Thriller",
        "year": 1982,
        "genre": "Pop"
    },
    {
        "id": 4,
        "title": "Smells Like Teen Spirit",
        "artist": "Nirvana",
        "album": "Nevermind",
        "year": 1991,
        "genre": "Grunge"
    },
    {
        "id": 5,
        "title": "Stairway to Heaven",
        "artist": "Led Zeppelin",
        "album": "Led Zeppelin IV",
        "year": 1971,
        "genre": "Rock"
    },
    {
        "id": 6,
        "title": "Imagine",
        "artist": "John Lennon",
        "album": "Imagine",
        "year": 1971,
        "genre": "Rock"
    },
    {
        "id": 7,
        "title": "Like a Rolling Stone",
        "artist": "Bob Dylan",
        "album": "Highway 61 Revisited",
        "year": 1965,
        "genre": "Folk Rock"
    },
    {
        "id": 8,
        "title": "What's Going On",
        "artist": "Marvin Gaye",
        "album": "What's Going On",
        "year": 1971,
        "genre": "Soul"
    }
]

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

@app.route('/random-song')
def random_song():
    """Return a random song suggestion"""
    if not SONGS:
        return jsonify({
            'error': 'No songs available',
            'status': 'error'
        }), 404
    
    selected_song = random.choice(SONGS)
    
    return jsonify({
        'song': selected_song,
        'status': 'success',
        'message': 'Random song selected successfully'
    })

if __name__ == '__main__':
    app.run(debug=True, port=5000, host='0.0.0.0')