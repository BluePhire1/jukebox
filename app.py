#!/usr/bin/python2

from flask import Flask, Response, render_template, request, make_response, redirect
import json
import requests
import base64
import time
import uuid
import sys
from flask_socketio import SocketIO 
from collections import OrderedDict



from flask_cors import CORS
app = Flask(__name__)
cors = CORS(app,resources={r"/*":{"origins":"*"}})
socketio = SocketIO(app)

@app.route("/", methods=["GET"])
def home():
    if (request.cookies.get("user_id")):
        return redirect("/room", code=302)
    return render_template("/landing.html")

@app.route("/admin", methods=["GET"])
def admin():
    return render_template("/admin.html")

@app.route("/adminRoom", methods=["GET", "POST"])
def adminRoom():
    global user_queue
    code = request.args.get("code")
    print(code)
    token = get_token(code)
    user_id = request.cookies.get("user_id")
    if user_id:
        print("Retrieved user id: %s" % user_id)
        user_queue[user_id] = []
        downvotes[user_id] = 0
        return render_template("/adminRoom.html", user_id=user_id)
    else:
        user_id = generate_user_id()
        user_queue[user_id] = []
        downvotes[user_id] = 0
        resp = make_response(render_template("/adminRoom.html", user_id=user_id))
        resp.set_cookie('user_id', user_id)
        return resp

@app.route("/room", methods=["GET", "POST"])
def room():
    return render_template("/room.html")

''' GLOBAL VARIABLES '''
token = "" # TEMPORARY, STORE THIS IN A DB FOR PRODUCTION
recent_songs = [] # List of up to 5 last songs to use for radio play
durations = {} # looks like: {spotify_uri: duration}
user_queue =  OrderedDict() # Keeps track of each user's song queue using unique user_id
hosting = False
curr_id = None
downvotes = {} # Downvotes for current song, unique by user_id

# Flips vote from downvote to nothing (1 to 0) or vice versa
@app.route("/downvote/<user_id>", methods=["POST"])
def flip_vote(user_id):
    global downvotes
    downvotes[user_id] = int(downvotes[user_id] == 0)
    if downvoted():
        play_song()
    return json.dumps({"success": "Vote is %d" % downvotes[user_id]})

@app.route("/search/<term>", methods=["POST"])
def search(term):
    url = "https://api.spotify.com/v1/search?type=track&q=%s" % term
    headers = {
        "content-type": "application/json",
        "Authorization": "Bearer %s" % token
    }
    r = requests.get(url, headers=headers)
    return json.dumps(r.json())

@app.route("/queueSong/<song>/<duration>/<user_id>", methods=["GET", "POST"])
def queue_song(song, duration, user_id):
    global user_queue, durations
    if not user_id:
        return json.dumps({"error": "No user id assigned!"})
    
    # Add song to orderedDict
    if user_id not in user_queue:
        user_queue[user_id] = []
    user_queue[user_id] = [song] + user_queue[user_id]

    durations[song] = int(duration)
    return json.dumps({"queue": str(user_queue)})

@app.route("/editSongQueue/<song_queue>/<user_id>", methods=["GET", "POST"])
def edit_song_queue(song_queue, user_id):
    print(song_queue)
    global user_queue, durations
    if not user_id:
        return json.dumps({"error": "No user id assigned!"})
    
    # Set user_id song queue to what was received from frontend
    if user_id not in user_queue:
        user_queue[user_id] = []
    # song_queue = json.loads(song_queue)
    user_queue[user_id] = []
    for song in song_queue:
        user_queue[user_id].append([song[0], song[1]])
        durations[song[0]] = int(song[2])

    print(user_queue)
    return json.dumps({"queue": str(user_queue)})

# Starts host that plays queued songs
@app.route("/startHost", methods=["GET"])
def start_host():
    try:
        global hosting
        if not hosting:
            hosting = True
            while hosting:
                time_left = song_time_left()
                time_left = time_left/1000 if True else False

                if not time_left or round(time_left) == 0:
                    dur = play_song()
                    # Check if song is playing, if not, play next one in queue.
                    print("Sleeping for %d seconds." % (dur/1000))
                    time.sleep(dur/1000)
                else:
                    print("Not yet done, sleeping another %d seconds" % time_left)
                    time.sleep(time_left)
        else:
            return json.dumps({"error": "Already hosting!"})
    except Exception as e:
        print(e)
        hosting = False
        return json.dumps({"error": str(e)})
    return json.dumps({"error": "No songs queued up!"})

@app.route("/sse")
def sse():
    def test():
        while 1:
            print("hi")
            yield "hello"
            time.sleep(5)
    return Response(test(), mimetype="text/event-stream")

# Returns True if song has enough downvotes to go to next one.
# False otherwise.
def downvoted():
    if sum(downvotes.values()) >= 2/3*round(len(downvotes.keys())):
        return True
    return False

# Gets user_id and stores it in user's cookies. If one already
# exists, it will load that instead.
def generate_user_id():
    global user_queue
    user_id = str(uuid.uuid4())
    user_queue[user_id] = []
    print("USER ID: %s" % user_id)
    return user_id

# Get token using the authorization code when going into the room.
# @param code - Auth Code from user accepting Spotify TOS.
def get_token(code):
    import sys
    print(sys.version)
    global token
    print(token)
    if token != "":
        return
    client_id = "17c0a7046ec0463584f357c64e8ad530"
    client_secret = "a4d42e12a0384883b441801ff51ff772"
    url = "https://accounts.spotify.com/api/token"
    redirectURI = "http://10.0.2.15:5000/adminRoom"

    body = {
        "grant_type": "authorization_code",
        "code": code,
        "redirect_uri": redirectURI
    }
    headers = {
        "content-type": "application/x-www-form-urlencoded",
        "Accept-Charset": "UTF-8",
        "Authorization": "Basic %s" % (base64.b64encode(client_id + ":" + client_secret))
    }
    r = requests.post(url, data=body, headers=headers)
    print(r.json())
    token = r.json()["access_token"] 
    return r.json()["access_token"]

# Gets recommended songs based on recent songs
def get_recommended():
    url = "https://api.spotify.com/v1/recommendations?limit=1&seed_tracks=%s" % ",".join(recent_songs)
    print(url)
    headers = {
        "Authorization": "Bearer %s" % token
    }
    r = requests.get(url, headers=headers)
    rec_song = r.json()["tracks"][0]
    # Return uri and duration of recommended song.
    print(r.status_code)
    return rec_song["uri"], rec_song["duration_ms"]

# Gets time left in song. Used to make sure new song
# is not played when one is already playing.
# Common when people pause music.
def song_time_left() :
    url = "https://api.spotify.com/v1/me/player/"
    headers = {
        "content-type": "application/json",
        "Authorization": "Bearer %s" % token
    }
    r = requests.get(url, headers=headers)
    try:
        curr_song = r.json()
    except:
        # Sometimes 204 response but no json. This is due to nothing playing.
        return False
    # Return False if no song currently playing, else return time left in current song.
    time_left = curr_song["is_playing"]
    if time_left:
        return curr_song["item"]["duration_ms"] - curr_song["progress_ms"]
    else:
        return time_left

# Gets the next song to be played, usually from a user but
# can be a recommended song if no songs queued up by any users.
def get_next_song():
    global user_queue, curr_id, recent_songs
    if len(user_queue) == 0:
        print("NO USER IN ROOM")
        return json.dumps({"error": "No users in room."})
    if not curr_id:
        curr_id = list(user_queue.keys())[0]
    else:
        # Increment curr_id to next user
        curr_index = (list(user_queue.keys()).index(curr_id) + 1) % len(user_queue)
        curr_id = list(user_queue.keys())[curr_index]

    # Next song is curr_user's next song in their queue.
    # If they have no song, go to next one.
    start_id = curr_id
    next_song = None
    print(user_queue)
    while len(user_queue[curr_id]) == 0:
        # Increment to next user_id (circularly)
        curr_index = (list(user_queue.keys()).index(curr_id) + 1) % len(user_queue)
        curr_id = list(user_queue.keys())[curr_index]
        # If you get into this if statement, no songs are queued by any user.
        if curr_id == start_id:
            # Play recommended songs because no one has one queued up.
            next_song, duration = get_recommended()
            break

    if not next_song:
        next_song = user_queue[curr_id].pop()[0]
        duration = durations.pop(next_song)

    # Only store song ID in recent_songs
    recent_songs = [next_song.split(":")[-1]] + recent_songs
    # Ensure recent_songs only keeps last 5 tracks
    recent_songs = recent_songs[:5]

    print("Playing song: %s" % next_song)
    return next_song, duration

# Plays song by creating a player playlist of length 1.
def play_song():
    global durations, downvotes
    next_song, duration = get_next_song()

    url = "https://api.spotify.com/v1/me/player/play"
    body = {
        "uris": [next_song]
    }
    headers = {
        "content-type": "application/json",
        "Authorization": "Bearer %s" % token
    }
    r = requests.put(url, data=json.dumps(body), headers=headers)
    print(r.status_code)

    # Reset all downvotes to 0
    downvotes = downvotes.fromkeys(downvotes, 0)
    return duration

# Socket stuff below!

@socketio.on('queue')
def get_song_queue(json):
    edit_song_queue(json["queue"], json["userID"])
    print("Adding to queue...")
    global_queue = get_global_queue()
    socketio.emit('addGlobalQueue', global_queue)

@socketio.on('connect')
def socket_connected():
    print("CONNECTED!")

# Gets all songs in order to be played to return to frontend.
def get_global_queue():
    # Next index and id used since curr_id curr_index are currently playing, not in queue.
    # Copy user_queue locally to pop stuff.
    global_queue = user_queue
    if curr_id:
        next_index = (list(global_queue.keys()).index(curr_id) + 1) % len(global_queue)
    else:
        next_index = 0
    return_queue = []

    # Build return queue as list of lists
    while 1:
        print("Global Queue: ", global_queue, "\n\n")
        next_id = list(user_queue.keys())[next_index]
        if len(global_queue[next_id]) > 0:
            return_queue = [next_id, global_queue.pop(next_id)] + return_queue
        else:
            global_queue.remove(next_id)

        if len(global_queue) == 0:
            break
        next_index = next_index + 1 % len(global_queue)

    print("DONE")
    print(return_queue)
    return return_queue

# Main call
if __name__ == '__main__':
    socketio.run(app, host='0.0.0.0')