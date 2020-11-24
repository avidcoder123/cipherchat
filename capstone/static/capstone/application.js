document.addEventListener('DOMContentLoaded', () => {
    Notification.requestPermission()
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
            let empty = document.querySelector('#emptymessage');
            empty && empty.remove();
            window.scrollTo(0, document.body.scrollHeight || document.documentElement.scrollHeight);
            let data = JSON.parse(e.data);
            data = JSON.parse(data.message);
            if(data.recipient == currentuser && data.sender != currentuser) {
                let message=`<div class="alert alert-${currentuser === data.sender ? "success":"dark"}" role="alert">\
                <a href="/profile/${data.sender}">@${data.sender}</a><hr>\
                <h5>\
                {{{body}}}\
                </h5>\
                {{timestamp}}\
              </div>`;
                let template = Handlebars.compile(message);
                let mbody = Handlebars.compile("{{message}}");
                let decrypted = cryptico.decrypt(data.body,privatekey);
                var senderkey;
                for(i of window.users){
                    senderkey = i.user == data.sender ? i.key : null
                }
                decrypted = decrypted.publicKeyString == senderkey ? decrypted.plaintext : `**WARNING: Our software has detected that this message may be sent by a hacker.**  ${decodeURI(decrypted.plaintext)}`
                mbody = mbody({message:decodeURI(decrypted)});
                document.querySelector('#body').innerHTML+=template({
                    sender:data.sender,
                    body:marked(mbody),
                    timestamp: new Date(data.timestamp).toLocaleString()
                });
                notify(data.sender + ": " + decodeURI(cryptico.decrypt(data.body,privatekey)));
            }
        };
        chatSocket.onclose = function(e) {
            console.error('Chat socket closed unexpectedly');
        }
        document.querySelectorAll('[data-decrypted = "false"]').forEach(e => {
            let decrypted = cryptico.decrypt(e.dataset.contents, privatekey);
            var sender = e.parentNode.childNodes[1].innerHTML;
            var senderkey;
            for(i of window.users){
                senderkey = i.user == sender ? i.key : null
            }
            if(decrypted.signature == "verified" && decrypted.publicKeyString == senderkey) {
                let template = Handlebars.compile("{{message}}")
                e.innerHTML = marked(template({message: decodeURI(decrypted.plaintext)}));
            } else {
                e.innerHTML = `<b>WARNING: Our software has detected that this message may be sent by a hacker.</b><br>${decodeURI(decrypted.plaintext)}`
            }
            e.hidden = false
            e.dataset.decrypted = "true"
        })
        document.querySelectorAll('.timestamp').forEach(e => {
            e.innerHTML = new Date(e.dataset.value).toLocaleString();
        })
        document.querySelector('#message').focus();
        document.querySelector('#message').onkeyup = function(e) {
            if (e.keyCode === 13) {  // enter, return
                document.querySelector('#send').click();
            }
        };

        document.querySelector('#send').onclick = function(e) {
            var message = document.querySelector('#message').value;
            document.querySelector("#message").value = "";
            if (!message){
                return false;
            }
            let message2=`<div class="alert alert-success" role="alert">\
                <a href="/profile/${currentuser}">@${currentuser}</a><hr>\
                <h5>\
                {{{message}}}\
                </h5>\
                Sent ${new Date().toLocaleString()}\
              </div>`
            let mbody = Handlebars.compile("{{message}}")
            mbody = mbody({message: message})
            let template = Handlebars.compile(message2)
            document.querySelector('#body').innerHTML+=template({message:marked(mbody)});
            for(userid in window.users){
                let user = window.users[userid];
                const cipher = cryptico.encrypt(encodeURI(message),user.key,privatekey)
                chatSocket.send(JSON.stringify({
                     "message":JSON.stringify({
                     "roomid": path[2],
                     "sender": currentuser,
                     "body": cipher.cipher,
                     "recipient": user.user,
               })
            }))
            }
        }
    } else if (path[1] == 'login') {
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

function notify(message) {
  if(document.hidden){
  // Let's check if the browser supports notifications
  if (!("Notification" in window)) {
    alert("This browser does not support desktop notification");
  }

  // Let's check whether notification permissions have already been granted
  else if (Notification.permission === "granted") {
    // If it's okay let's create a notification
    var notification = new Notification(message);
  }

  // Otherwise, we need to ask the user for permission
  else if (Notification.permission !== "denied") {
    Notification.requestPermission().then(function (permission) {
      // If the user accepts, let's create a notification
      if (permission === "granted") {
        var notification = new Notification(message);
      }
    });
  }

  // At last, if the user has denied notifications, and you
  // want to be respectful there is no need to bother them any more.
}
}
