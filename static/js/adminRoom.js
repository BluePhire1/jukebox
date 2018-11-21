/**
 * Functionality once user gets into a room.
 * 
 * @author Jon Downs
 */
window.onload = function () {
    /*************** Start Host Button ***************/
    document.getElementById("startHost").onclick = function() {
        // Start host.
        fetch("/startHost", {
            method: "GET",
            credentials: "omit",
        }).then(res => res.json()).then(
            response => {
                if ("error" in response) {
                alert("Please add songs to queue.");
            }
        }
        )
        .catch(
            error => console.error("Error!", error)
        )
    }

    /*************** Search Button ***************/
    document.getElementById("searchBtn").onclick = function() {
        // Search for a song
        var searchTerm = encodeURI(document.getElementById("searchTerm").value);
        fetch("/search/" + searchTerm, {
            method: "POST",
            credentials: "omit",
            headers: {
                "Content-Type": "application/json"
            }
        }).then(res => res.json()).then(
            response => showSongs(response)
        )
        .catch(
            error => console.error("Error!", error)
        )
    }

    /*************** Downvote Button ***************/
    document.getElementById("downvote").onclick = function() {
        fetch("/downvote/" + userID, {
            method: "POST",
            credentials: "omit",
            headers: {
                "Content-Type": "application/json"
            }
        }).then(res => res.json()).then(
            response => console.log(response)
        )
        .catch(
            error => console.error("Error!", error)
        )
    }
};

function showSongs(songs) {
    console.log(songs);
    for (let song of songs["tracks"]["items"]) {
        var node = document.createElement("button");
        node.onclick = function() {
            addToQueue(song["uri"], song["duration_ms"]);
        }
        var name = document.createTextNode(song["name"]);
        node.appendChild(name);
        document.getElementById("songsList").appendChild(node);
    }
}

function addToQueue(uri, duration) {
    fetch("/queueSong/" + uri + "/" + duration + "/" + userID, {
        method: "POST",
        credentials: "omit",
        headers: {
            "Content-Type": "application/json"
        }
    }).then(res => res.json()).then(
        response => console.log(response)
    )
    .catch(
        error => console.error("Error!", error)
    )
}