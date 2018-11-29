/**
 * Main functionality.
 * 
 * @author Jon Downs
 */
window.onload = function () {
    // Join Room btn
    document.getElementById("joinRoom").onclick = function(e) {
        var btn = e.target;
        btn.classList.add("animated", "fadeOut");

        setTimeout(function() {
            btn.remove();
        }, 1000);

        var input = document.getElementById("nameInput");
        input.classList.add("animated", "delay-1s", "fadeIn");
        input.style.display = "block";
    }

    // Name input
    document.getElementById("nameInput").oninput = function(e) {
        if (e.target.value.length >= 2) {
            showContinue();
        }
        else {
            hideContinue();
        }
    }

    // Continue to room btn
    document.getElementById("continue").onclick = function(e) {
        // Redirect to room page
        redirToRoom();
    }
};

/**
 * Shows continue btn when text is input for name.
 */
function showContinue() {
    var btn = document.getElementById("continue");
    btn.disabled = false;
    btn.classList.remove("animated", "fadeOut");
    btn.classList.add("animated", "fadeIn");
    btn.style.display = "block";
}

/**
 * Hides continue btn when text is empty.
 */
function hideContinue() {
    var btn = document.getElementById("continue");
    btn.disabled = true;
    btn.classList.remove("animated", "fadeIn");
    btn.classList.add("animated", "fadeOut");
}

function redirToRoom() {
    // Store cookies first
    var username = document.getElementById("nameInput").value;
    setCookie("user_name", username, 360)
    window.location.replace("/room");
}

// Stackoverflow <3
function setCookie(cname, cvalue, exdays) {
    var d = new Date();
    d.setTime(d.getTime() + (exdays*24*60*60*1000));
    var expires = "expires="+ d.toUTCString();
    document.cookie = cname + "=" + cvalue + ";" + expires + ";path=/";
}