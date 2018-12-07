/**
 * Functionality once user gets into a room.
 * 
 * @author Jon Downs
 */

//  var socket; // Global socket variable

var queue = [];
var glob_queue = []
var queueEvent;
var currSong = [];


window.onunload = function () {
    if (queueEvent) {
        queueEvent.close();
    }
}

window.onload = function () {
    // /** Socket connection */
    // socket = io.connect('http://192.168.1.185:5000');
    // socket.on('connect', function() {
    //     socket.on('addGlobalQueue', function(data) {
    //         console.log(data);
    //         updateSongQueue(data);
    //     });
    // });

    // Serverside event
    queueEvent = new EventSource("queue");
    queueEvent.onmessage = function (e) {
        var ret_queue = JSON.parse(e.data);
        if (ret_queue["glob_queue"].toString() != glob_queue.toString()) {
            updateSongQueue(ret_queue["glob_queue"]);
        }
        if (ret_queue["user_queue"][getCookie("user_id")].toString() != queue.toString()) {
            updateUserQueue(ret_queue["user_queue"]);
        }
        if (ret_queue["curr_song"].toString() != currSong.toString()) {
            currSong = ret_queue["curr_song"];
            updateCurrSong();
        }
    }

    /*************** Search Button ***************/
    document.getElementById("searchBtn").onclick = search();

    /*************** Downvote Button ***************/
    document.getElementById("downvote").onclick = function (e) {
        var node = document.getElementById("downvote");
        if (node.classList.contains("btn-outline-primary")) {
            node.classList.remove("btn-outline-primary");
            node.classList.add("btn-outline-light");
        }
        else {
            node.classList.remove("btn-outline-light");
            node.classList.add("btn-outline-primary");
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
        ).catch(
            error => console.error("Error!", error)
        )
    }
};


// window.onunload = function() {
//     socket.close();
// }

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
            img.style.paddingRight = "20px";
        }
        catch {
            console.log("ERROR!");
        }
        var node = document.createElement("li");

        node.className = "list-group-item songpos-" + count;

        node.onclick = function (e) {
            addToQueue(song["uri"], song["duration_ms"], song, e);
        }

        var nameContainer = document.createElement("p");
        nameContainer.style.display = "inline";

        var name = document.createTextNode(song["name"]);

        node.style.fontSize = "24px";
        node.appendChild(img);
        node.appendChild(nameContainer);
        nameContainer.appendChild(name);
        document.getElementById("songsList").appendChild(node);

        count++;
    }
}

function addToQueue(uri, duration, songData, elem) {
    var node = elem.target;
    // Color in div.
    // node.closest("li").style.backgroundColor = "#4f86f7";
    // Make div fade out
    node.closest("li").classList.add("animated", "fadeOut");
    setTimeout(function () {
        node.remove();
        var userID = getCookie("user_id");
        var albumImg = songData["album"]["images"][0]["url"];

        // Add song to queue visually
        var userQueueImg = document.createElement("img");
        userQueueImg.classList = "animated fadeIn"
        userQueueImg.src = albumImg
        userQueueImg.style.width = "100%";
        document.getElementById("userQueue").appendChild(userQueueImg);

        queue.push([uri, albumImg, duration]);

        fetch("/editSongQueue/" + userID, {
            body: JSON.stringify({ "song_queue": queue }),
            method: "POST",
            credentials: "omit",
            headers: {
                "Content-Type": "application/json"
            }
        }).then(res => res.json()).then(
            response => console.log(response)
        ).catch(
            error => console.error("Error!", error)
        )
    }, 1000);


    // Add song to queue backend.
    // fetch("/queueSong/" + uri + "/" + duration + "/" + userID, {
    //     method: "POST",
    //     credentials: "omit",
    //     headers: {
    //         "Content-Type": "application/json"
    //     }
    // }).then(res => res.json()).then(
    //     response => console.log(response),
    //     console.log("here"),
    //     socket.emit('addToQueue', 
    //     {
    //         "uri": uri,
    //         "duration": duration,
    //         "userID": userID
    //     })
    // )
    // .catch(
    //     error => console.error("Error!", error)
    // )
}

// Add and remove songs from user queue.
function updateUserQueue(updated_queue) {
    queue = updated_queue[getCookie("user_id")];
    console.log("Updating user queue!");
    document.getElementById("userQueue").innerHTML = "";
    for (let song of queue) {
        var songInfo = song[0];
        // Note: songInfo[0] is song URI
        var albumImg = song[1];
        var queueImg = document.createElement("img");
        queueImg.src = albumImg;
        queueImg.style.width = "100%";
        document.getElementById("userQueue").appendChild(queueImg);
    }
}

function updateSongQueue(updated_queue) {
    glob_queue = updated_queue;
    console.log("Updating global queue!");
    document.getElementById("songQueue").innerHTML = "";
    for (let user of updated_queue) {
        var userID = user[0];
        var songInfo = user[1];
        // Note: songInfo[0] is song URI
        var albumImg = songInfo[1];
        var queueImg = document.createElement("img");
        queueImg.src = albumImg;
        queueImg.style.height = "calc(15vh - 10px)";
        if (userID == getCookie("user_id")) {
            queueImg.style.border = "2px solid #4f86f7";
        }
        document.getElementById("songQueue").appendChild(queueImg);
    }
}

function updateCurrSong() {
    console.log(currSong);
    var albumImg = currSong[1];
    var imgNode = document.createElement("img");
    imgNode.src = albumImg;
    imgNode.style.height = "100%";

    // document.getElementById("currPlayingInfo").innerHTML = "";
    // document.getElementById("currPlayingInfo").appendChild(infoNode);
    document.getElementById("currPlayingImg").innerHTML = "";
    document.getElementById("currPlayingImg").appendChild(imgNode);

    // Reset thumbs down
    var node = document.getElementById("downvote");
    if (node.classList.contains("btn-outline-primary")) {
        node.classList.remove("btn-outline-primary");
        node.classList.add("btn-outline-light");
    }
}

// From w3schools <3
function getCookie(cname) {
    var name = cname + "=";
    var decodedCookie = decodeURIComponent(document.cookie);
    var ca = decodedCookie.split(';');
    for (var i = 0; i < ca.length; i++) {
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

// Searches for songs.
function search() {
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
    ).catch(
        error => console.error("Error!", error)
    )
    document.getElementById("searchTerm").blur();
}