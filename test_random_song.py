#!/usr/bin/env python3
"""
Simple integration test for the /random_song endpoint.

This test verifies that the random song selection endpoint provides adequate
randomness by calling it 5 times and ensuring not all responses are identical.

Mathematical Note:
With 20 songs in the dataset, the probability of getting the same song
5 times in a row is (1/20)^4 = 1/160,000 ≈ 0.000625%.

This is calculated as:
- First pick: any song (probability = 1)
- Next 4 picks: same as first (probability = 1/20 each)
- Total probability = 1 × (1/20)^4 = 1/160,000

Given this extremely low probability, if all 5 responses are identical,
it strongly suggests a bug in the randomization logic.
"""
import subprocess
import time
import json
import urllib.request
import urllib.error
import sys
import os
import signal


def start_flask_server():
    """Start the Flask server and return the process object."""
    print("Starting Flask server...")
    
    # Start Flask server in background
    process = subprocess.Popen(
        [sys.executable, 'app.py'],
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        cwd=os.path.dirname(os.path.abspath(__file__))
    )
    
    # Wait for server to start (simple retry logic)
    base_url = "http://localhost:5000"
    max_retries = 20
    
    for retry in range(max_retries):
        try:
            # Try to connect to the hello endpoint to verify server is up
            with urllib.request.urlopen(f"{base_url}/api/hello", timeout=1) as response:
                if response.getcode() == 200:
                    print(f"✅ Flask server started successfully on {base_url}")
                    return process
        except (urllib.error.URLError, urllib.error.HTTPError):
            pass
        
        time.sleep(0.5)
    
    # If we get here, server didn't start
    process.terminate()
    raise RuntimeError("❌ Flask server failed to start within expected time")


def stop_flask_server(process):
    """Stop the Flask server process."""
    print("Stopping Flask server...")
    process.terminate()
    try:
        process.wait(timeout=5)
        print("✅ Flask server stopped")
    except subprocess.TimeoutExpired:
        process.kill()
        process.wait()
        print("🔪 Flask server force-killed")


def call_random_song_endpoint():
    """Call the /random_song endpoint and return the response data."""
    url = "http://localhost:5000/random_song"
    
    try:
        with urllib.request.urlopen(url, timeout=5) as response:
            if response.getcode() == 200:
                return json.loads(response.read().decode('utf-8'))
            else:
                raise Exception(f"HTTP {response.getcode()}")
    except Exception as e:
        raise Exception(f"Failed to call {url}: {e}")


def validate_song_structure(song_data):
    """Validate that the song data has the expected structure."""
    required_fields = {'artist', 'song', 'youtube_link'}
    
    if not isinstance(song_data, dict):
        raise ValueError(f"Expected dict, got {type(song_data)}")
    
    if set(song_data.keys()) != required_fields:
        raise ValueError(f"Expected fields {required_fields}, got {set(song_data.keys())}")
    
    for field, value in song_data.items():
        if not isinstance(value, str) or not value.strip():
            raise ValueError(f"Field '{field}' should be a non-empty string, got: {value}")
    
    if 'youtube.com/watch' not in song_data['youtube_link']:
        raise ValueError(f"Invalid YouTube link format: {song_data['youtube_link']}")


def test_random_song_randomness():
    """
    Test that the /random_song endpoint provides randomness across multiple calls.
    
    Calls the endpoint 5 times and verifies that not all responses are identical.
    """
    print("\n🎲 Testing random song selection randomness...")
    
    responses = []
    
    # Make 5 API calls
    for i in range(5):
        print(f"  📞 Making API call {i+1}/5...")
        song_data = call_random_song_endpoint()
        
        # Validate the response structure
        validate_song_structure(song_data)
        
        responses.append(song_data)
        print(f"     🎵 Got: {song_data['artist']} - {song_data['song']}")
    
    # Convert responses to tuples for easy comparison
    response_tuples = [
        (song['artist'], song['song'], song['youtube_link']) 
        for song in responses
    ]
    
    # Check for uniqueness
    unique_responses = set(response_tuples)
    
    print(f"\n📊 Results:")
    print(f"   Total calls: 5")
    print(f"   Unique songs: {len(unique_responses)}")
    
    # The main test: ensure we don't have the same song 5 times
    if len(unique_responses) == 1:
        raise AssertionError(
            f"❌ RANDOMNESS TEST FAILED: All 5 API calls returned the same song!\n"
            f"   Song: {responses[0]['artist']} - {responses[0]['song']}\n"
            f"   This suggests the randomization is not working correctly.\n"
            f"   With 20 songs, the probability of this occurring by chance is only\n"
            f"   1/160,000 (≈0.000625%) - essentially impossible for proper randomization."
        )
    
    print(f"✅ RANDOMNESS TEST PASSED: Got {len(unique_responses)} different songs out of 5 calls")
    
    # Show the distribution for analysis
    from collections import Counter
    song_counts = Counter(response_tuples)
    most_frequent_count = song_counts.most_common(1)[0][1]
    
    if most_frequent_count > 1:
        print(f"   📈 Most frequent song appeared {most_frequent_count} times")
    
    return True


def test_endpoint_consistency():
    """Test that the endpoint consistently returns valid responses."""
    print("\n🔍 Testing endpoint consistency...")
    
    for i in range(3):
        print(f"  📞 Consistency check {i+1}/3...")
        song_data = call_random_song_endpoint()
        validate_song_structure(song_data)
    
    print("✅ CONSISTENCY TEST PASSED: All responses have valid structure")
    return True


def main():
    """Run the integration test."""
    print("=" * 60)
    print("🧪 SIMPLE INTEGRATION TEST FOR /random_song ENDPOINT")
    print("=" * 60)
    
    flask_process = None
    
    try:
        # Start Flask server
        flask_process = start_flask_server()
        
        # Run tests
        test_endpoint_consistency()
        test_random_song_randomness()
        
        print("\n" + "=" * 60)
        print("🎉 ALL TESTS PASSED SUCCESSFULLY!")
        print("   The /random_song endpoint is working correctly with proper randomization.")
        print("=" * 60)
        
        return True
        
    except Exception as e:
        print(f"\n❌ TEST FAILED: {e}")
        print("=" * 60)
        return False
        
    finally:
        # Always clean up the Flask server
        if flask_process:
            stop_flask_server(flask_process)


if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)
