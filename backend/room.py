'''
    This file houses many of the backend functions used for the room page.

    NOTE: Not used now, too many global variables in app.py.

    @author - Jon Downs
'''
global token

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
    global token
    print(token)
    if token != "":
        return
    client_id = "17c0a7046ec0463584f357c64e8ad530"
    client_secret = "a4d42e12a0384883b441801ff51ff772"
    url = "https://accounts.spotify.com/api/token"
    redirectURI = "http://:192.168.1.185:5000/room"

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
        next_song = user_queue[curr_id].pop()
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
