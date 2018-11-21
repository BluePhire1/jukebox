/**
 * Functionality once user gets into a room.
 * 
 * @author Jon Downs
 */
window.onload = function () {
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
    document.getElementById("downvote").onclick = function(e) {
        var node = e.target;
        if (node.classList.contains("btn-outline-light")) {
            node.classList.remove("btn-outline-light");
            node.classList.add("btn-outline-primary");
        }
        else {
            node.classList.remove("btn-outline-primary");
            node.classList.add("btn-outline-light");
        }
        node.style.border = "0px solid transparent";

        var userID = getCookie("user_id");
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
    var count = 0;
    document.getElementById("songsList").innerHTML = "";
    for (let song of songs["tracks"]["items"]) {
        // Try to get album image
            var img = document.createElement("img");
        try {
            var albumImg = song["album"]["images"][0]["url"];
            img.src = albumImg;
            img.style.height = "64px";
        }
        catch {
            console.log("ERROR!");
        }
        var node = document.createElement("li");

        node.className = "list-group-item list-group-item-dark songpos-" + count;

        node.onclick = function(e) {
            addToQueue(song["uri"], song["duration_ms"], song, e);
        }
        var name = document.createTextNode(song["name"]);
        node.style.fontSize = "24px";
        node.appendChild(img);
        node.appendChild(name);
        document.getElementById("songsList").appendChild(node);

        count++;
    }
}

function addToQueue(uri, duration, songData, elem) {
    var node = elem.target;
    var userID = getCookie("user_id");
    // Add song to queue visually
    var queueImg = document.createElement("img");
    queueImg.src = songData["album"]["images"][0]["url"];
    queueImg.style.height = "calc(15vh - 10px)";
    document.getElementById("songQueue").appendChild(queueImg);
    // Color in div.
    node.style.backgroundColor = "#4f86f7";

    // Add song to queue backend.
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

// From w3schools <3
function getCookie(cname) {
    var name = cname + "=";
    var decodedCookie = decodeURIComponent(document.cookie);
    var ca = decodedCookie.split(';');
    for(var i = 0; i <ca.length; i++) {
        var c = ca[i];
        while (c.charAt(0) == ' ') {
            c = c.substring(1);
        }
        if (c.indexOf(name) == 0) {
            return c.substring(name.length, c.length);
        }
    }
    return "";
}