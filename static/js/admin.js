window.onload = function () {
    document.getElementById("authorize").onclick = function() {
        var clientID = "17c0a7046ec0463584f357c64e8ad530"
        var redirectURI = "http://10.0.2.15:5000/adminRoom";
        var scopes = 'user-modify-playback-state ' + 
        'user-read-private ' + 
        'user-read-email ' + 
        'user-read-playback-state';

        window.location.replace('https://accounts.spotify.com/authorize' +
        '?response_type=code' +
        '&client_id=' + clientID +
        (scopes ? '&scope=' + encodeURIComponent(scopes) : '') +
        '&redirect_uri=' + encodeURIComponent(redirectURI));
    }
};
