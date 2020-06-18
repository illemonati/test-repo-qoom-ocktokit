if (window.authenticater === undefined) {
    window.authenticater = (function() {

        function sendClick(e) {
            var username = getCookie("username"),
                key = getCookie("key"),
                $indicator = document.querySelector("#indicator"),
                okColor = "orange",
                goodColor = "green",
                errColor = "red",
                to;
            clearTimeout(to);
            if (!username) return;
            var options = {
                    path: "/authenticate/event",
                    data: {
                        width: document.body.offsetWidth,
                        height: document.body.offsetHeight,
                        x: e.center ? e.center.x : e.x,
                        y: e.center ? e.center.y : e.y
                    }
                }
            $indicator.style.display = "block";
            $indicator.style.backgroundColor = okColor;
            restfull.post(options, function(err, response){
                if (err){
                    try {
                        if (JSON.parse(err).error == "Not Authenticated") {
                            deleteCookie("key");
                        }
                        else {
                            console.log(err, response);
                        }
                    }
                    catch (ex) {
                        console.log(err, response);
                    }
                }
                else if (response) {
                    setCookie("key", JSON.parse(response).key);
                }
                $indicator.style.backgroundColor = err ? errColor : goodColor;
                to = setTimeout(function(){
                    $indicator.style.display = "none";
                },500);
            });
        }

        function logOut(callback) {
            var username = getCookie("username"),
                key = getCookie("key");
            if (username === undefined || key === undefined) {
                callback();
                return;
            }
            var options = {
                    path: "/authenticate/" + username + "/logout",
                    data: {}
                }
            restfull.post(options, function(err, response){
                if (!err) {
                    deleteCookie("username");
                    deleteCookie("key");
                }
                callback(err);
            })
        }

    	function load() {
            var $body = document.querySelector("body"),
                mc = new Hammer($body);
            $body.style.height = "100vh";
            $body.style.width = "100vw";
            mc.get('press').set({ time: 250 });
            mc.on("press", sendClick);
            $body.addEventListener('click', sendClick);
        }

        function convertCookieToObject() {
            var cookieParts = document.cookie.split(";"),
                cookieObj = {};
            cookieParts.forEach(function(cookie, i){
                var equalsPosition = cookie.indexOf('='),
                    key = equalsPosition > -1 ? cookie.substring(0, equalsPosition).trim() : cookie.trim(),
                    val = equalsPosition > -1 ? cookie.substring(equalsPosition+1).trim(): undefined;

                cookieObj[key] = {value: val}
            });
            return cookieObj;
        }

        function setCookie(key, val) {
            document.cookie= key + "=" + val +"; expires=Thu, 18 Dec 2030 12:00:00 UTC; path=/";
        }
        function getCookie(key) {
            var cookieObj = convertCookieToObject();
            return key in cookieObj ? cookieObj[key].value : undefined;
        }

        function deleteCookie(key) {
            document.cookie = key + "=; expires=Thu, 01 Jan 1970 00:00:00 UTC";
        }

        document.addEventListener('DOMContentLoaded', function() {
            if(!restfull) {
                console.log("Restfull library didn't load");
                return;
            }
            load()
        });

        return {
            setUsername: function(username) {
                setCookie("username", username);
            },
            logOut: logOut
        }
    }());
}