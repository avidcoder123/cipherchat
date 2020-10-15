document.addEventListener('DOMContentLoaded', () => {
    var path = window.location.pathname.split('/');
    var csrf = Cookies.get('csrftoken')
    if (path[1] == 'new_room') {
        document.querySelector('#submit').onclick = () => {
            let title = document.querySelector('#form_title').value;
            let description = document.querySelector('#form_description').value;
            let members = document.querySelector('#form_members').value;
            var comma_members = members.split(',');
            const request = new Request(
                '/new_room',
                {headers: {'X-CSRFToken': csrf}}
            );
            fetch(request, {
                "method": "POST",
                "body": JSON.stringify({
                    "title": title,
                    "description": description,
                    "members": comma_members
                })
            })
            .then(response => response.json())
            .then(result => {
                if (result.message == "Success!") {
                    window.location.href = `/room/${result.id}`;
                } else {
                    alert(result.message);
                }
            })
        }
    } else if (path[1] == 'room') {
        document.querySelector('#leave').onclick = () => {
            if (confirm("WARNING: If you leave this group, you cannot come back without an invitation.")) {
                fetch(`/leave/${path[2]}`)
                .then(response => response.json())
                .then(result => {
                    window.location.href = '/';
                    alert(result.message);
                })
            }
        
        }
        document.querySelector('#invite').onclick = () => {
            let invites = document.querySelector('#invites').value.split(',');
            const request = new Request(
                '/invite',
                {headers: {'X-CSRFToken': csrf}}
            );
            fetch(request, {
                "method": "POST",
                "body": JSON.stringify({
                    "room": id,
                    "invites": invites
                })
            })
            .then(response => response.json())
            .then(result => {
                alert(result.message);
                document.querySelector('#invite').value = "";
            })

        }
    } else if (path[1] == 'chat') {
        window.scrollTo(0, document.body.scrollHeight || document.documentElement.scrollHeight);
        const fingerprint = localStorage.getItem('fingerprint');
        const privatekey = cryptico.generateRSAKey(fingerprint, 1024);
        var chatSocket = new WebSocket(
            'wss://'
            + window.location.host
            + '/ws/chat/'
            + path[2]
            + '/'
            );
        chatSocket.onmessage = function(e) {
            window.scrollTo(0, document.body.scrollHeight || document.documentElement.scrollHeight);
            let data = JSON.parse(e.data);
            data = JSON.parse(data.message);
            if(!document.hasFocus()){
                //developer.mozilla.org
                  if (!("Notification" in window)) {
                    alert("This browser does not support desktop notification");
                    }
                  // Let's check whether notification permissions have already been granted
                  else if (Notification.permission === "granted") {
                    // If it's okay let's create a notification
                    var notification = new Notification(`${data.sender} says: ${cryptico.decrypt(data.body,privatekey).plaintext}`);
                  }

                  // Otherwise, we need to ask the user for permission
                  else if (Notification.permission !== "denied") {
                    Notification.requestPermission().then(function (permission) {
                      // If the user accepts, let's create a notification
                      if (permission === "granted") {
                        var notification = new Notification(`${data.sender} says: ${cryptico.decrypt(data.body,privatekey).plaintext}`);
                      }
                    });
                }         
            }
            if(data.recipient == currentuser) {
                let message=`<div class="alert alert-${currentuser === data.sender ? "success":"dark"}" role="alert">\
                <a href="/profile/${data.sender}">@${data.sender}</a><hr>\
                <h5>${linkify(escapeOutput(cryptico.decrypt(data.body,privatekey).plaintext))}</h5>\
                Sent Recently\
              </div>`
                document.querySelector('#body').innerHTML+=message;
                try{
                 document.querySelector('#emptymessage').innerHTML="";
                }finally{
                    null
            }
        };
        chatSocket.onclose = function(e) {
            console.error('Chat socket closed unexpectedly');
        }
        document.querySelectorAll('[data-decrypted = "false"]').forEach(e => {
            let decrypted = cryptico.decrypt(e.dataset.contents, privatekey);
            if(decrypted.signature == "verified") {
                e.innerHTML = linkify(decrypted.plaintext);
            } else {
                e.innerHTML = `<b>WARNING: This message may have been intercepted or sent by a hacker because it does not have a valid signature.</b><br>${linkify(decrypted.plaintext)}`
            }
            e.hidden = false
            e.dataset.decrypted = "true"
        })
        document.querySelector('#message').focus();
        document.querySelector('#message').onkeyup = function(e) {
            if (e.keyCode === 13) {  // enter, return
                document.querySelector('#send').click();
            }
        };

        document.querySelector('#send').onclick = function(e) {
            var message = escapeOutput(document.querySelector('#message').value);
            if (!message){
                return false;
            }
            let users = []
            const request = new Request(
                '/ajax/roomdata',
                {headers: {'X-CSRFToken': csrf}}
            );
            fetch(request, {
                "method": "POST",
                "body": JSON.stringify({
                    "roomid": path[2]
                })
            })
            .then(response => response.json())
            .then(result => {
                for(member in result.members) {
                    let user = result.members[member]
                    const request = new Request(
                        '/ajax/getkey',
                        {headers: {'X-CSRFToken': csrf}}
                    )
                    fetch(request, {
                        "method": "POST",
                        "body": JSON.stringify({
                            "user": user
                        })
                    })
                    .then(response => response.json())
                    .then(result => {
                        const cipher = cryptico.encrypt(message,result.key,privatekey)
                        chatSocket.send(JSON.stringify({
                            "message":JSON.stringify({
                                "roomid": path[2],
                                "publickey": result.key,
                                "sender": currentuser,
                                "body": cipher.cipher,
                                "recipient": user,
                            })
                            }));
                        const request = new Request(
                            '/ajax/sendmessage',
                            {headers: {'X-CSRFToken': csrf}}
                        );
                        fetch(request, {
                            method:"POST",
                            body: JSON.stringify({
                                "roomid":path[2],
                                "publickey": result.key,
                                "body": cipher.cipher,
                                "sender": document.querySelector('#currentuser').innerHTML
                            })
                        })
                        document.querySelector('#message').value = '';
                    })
                }
                return false;
            })
        }
    } 
    }else if (path[1] == 'login') {
        document.querySelector('#login').onsubmit = () => {
            //Gets username and password and hashes them together to make a user firgerprint, later used for generating RSA keys.
            let username = document.querySelector('#username').value;
            let password = document.querySelector('#password').value;
            let fingerprint = SHA256(SHA256(username) + password);
            //Store the fingerprint in localStorage for later access.
            localStorage.setItem('fingerprint',fingerprint);
        }
    } else if (path[1] == 'register'){
    document.querySelector('#form').onsubmit = () => {
        //Gets username and password and hashes them together to make a user firgerprint, later used for generating RSA keys.
        let username = document.querySelector('#username').value;
        let password = document.querySelector('#password').value;
        let fingerprint = SHA256(SHA256(username) + password);
        //Store the fingerprint in localStorage for later access.
        localStorage.setItem('fingerprint',fingerprint);
        let key = cryptico.generateRSAKey(fingerprint,1024);
        key = cryptico.publicKeyString(key);
        const field = document.querySelector("#key")
        field.value = key;
        return true;
    }
}
    })
function accept(id,pk) {
    let csrf = Cookies.get('csrftoken')
    const request = new Request(
        '/accept',
        {headers: {'X-CSRFToken': csrf}}
    );
    fetch(request,{
        "method": "POST",
        "body": JSON.stringify({
            "id":id,
            "pk":pk
        })
    })
    .then(response => response.json())
    .then(result => {
        window.location.href = `/room/${id}`;
    })
    
}
/*------------------------------------------------------
XSS Protection code from https://cheatsheetseries.owasp.org/cheatsheets/Cross_Site_Scripting_Prevention_Cheat_Sheet.html
--------------------------------------------------------*/
function escapeOutput(toOutput){
    return toOutput.replace(/\&/g, '&amp;')
        .replace(/\</g, '&lt;')
        .replace(/\>/g, '&gt;')
}
function linkify(text) {
    var urlRegex =/(\b(https?|ftp|file):\/\/[-A-Z0-9+&@#\/%?=~_|!:,.;]*[-A-Z0-9+&@#\/%=~_|])/ig;
    return text.replace(urlRegex, function(url) {
        return '<a href="' + url + '">' + url + '</a>';
    });
}
