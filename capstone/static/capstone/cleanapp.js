//Waits for page to load
$('document').ready(async function() {
    //Self-XSS Warning
    console.warn("WARNING: Do not paste any code you do not understand into this console. Doing so may reveal your messages to a hacker.");
    //Request notification permission
    Notification.requestPermission();
    //Store page path
    var path = window.location.pathname.split('/');
    //Store csrf cookie
    var csrf = Cookies.get('csrftoken');
    //Switch/case for each possible path
    switch(path[1]){
        case 'new_room':
            //Button to create new room
            $('#submit').click(async function() {
                let title = await $('#form_title').val();
                let description = await $('#form_description').val();
                let members = await $('#form_members').val();
                //Generate AES fingerprint for the room
                const roomAES = SHA256(localStorage.getItem('fingerprint') + title + description)
                members = members.split(',');
                let roomKeys = [];
                for (member of members) {
                    //Get each member's public key
                    const request = new Request(
                        '/ajax/getkey',
                        {headers:{'X-CSRFToken': csrf}}
                      );
                    const response = await fetch(request, {
                        "method": "POST",
                        "body": JSON.stringify({
                            "user": member
                        })
                    });
                    const result = await response.json().key;
                    const indivKey = cryptico.encrypt(roomAES, result);
                    roomKeys.push({
                        "user": member,
                        "key": indivKey.cipher
                    })
                }
                const request = new Request(
                  '/new_room',
                  {headers:{'X-CSRFToken': csrf}}
                );
                let response = await fetch(request, {
                    "method": "POST",
                    "body": JSON.stringify({
                        "title": title,
                        "description": description,
                        "members": members,
                        "keys": roomKeys
                    })
                });
                let result = await response.json();
                if(result.message == "Success!"){
                    //If room was created successfully, redirect
                    window.location.href = `/room/${result.id}`;
                } else {
                    //If error, alert error
                    alert(result.message);
                }
            })
        break;
        case 'room':
            $('#leave').click(async function(){
                //Make sure the user wants to leave
                if (confirm("WARNING: If you leave this group, you cannot come back without an invitation.")){
                    //Send leave request to API
                    let response = await fetch(`/leave/${path[2]}`);
                    let result = await response.json();
                    window.location.href = '/';
                    alert(result.message);
                }
            })
            $('#invite').click(async function(){
                //Get basic room data for key
                let title = $('#title').val();
                let description = $('#desc').val();
                let fingerprint = localStorage.getItem('fingerprint');
                //Generate AES key token
                let roomAES = SHA256(fingerprint + title + description);
                //Create array of invitees
                let invites = await $('#invites').val().split(',');
                //Clear the invite field
                await $('#invites').val(null);
                //Get each user's key
                let roomKeys = [];
                for (member of invites) {
                    //Get each member's public key
                    const request = new Request(
                        '/ajax/getkey',
                        {headers:{'X-CSRFToken': csrf}}
                      );
                    const response = await fetch(request, {
                        "method": "POST",
                        "body": JSON.stringify({
                            "user": member
                        })
                    });
                    const result = await response.json().key;
                    const indivKey = cryptico.encrypt(roomAES, result);
                    roomKeys.push({
                        "user": member,
                        "key": indivKey.cipher,
                    })
                }
                //Send invites to the API
                const request = new Request(
                    '/invite',
                    {headers:{'X-CSRFToken':csrf}}
                );
                let response = await fetch(request, {
                    "method": "POST",
                    "body": JSON.stringify({
                        "room": id,
                        "invites": invites,
                        "keys": roomKeys
                    })
                });
                let result = await response.json();
                alert(result.message);
            })
        break;
        case 'chat':
            //Scroll to bottom
            window.scrollTo(0,document.body.scrollHeight || document.documentElement.scrollHeight);
            //Generate RSA key
            fingerprint = await localStorage.getItem('fingerprint');
            const privatekey = await cryptico.generateRSAKey(fingerprint,1024);
            var chatSocket = new WebSocket(
                'wss://'
                + window.location.host
                + '/ws/chat/'
                + path[2]
                + '/'
            );
            chatSocket.onmessage = async function(e){
                let empty = await $('#emptymessage');
                empty.length && empty.remove();
                window.scrollTo(0, document.body.scrollHeight || document.documentElement.scrollHeight);
                let data = await JSON.parse(e.data);
                data = await JSON.parse(data.message);
                if(data.recipient == currentuser && data.sender != currentuser) {
                    //Create message HTML template
                    let message=`<div class="alert alert-${currentuser === data.sender ? "success":"dark"}" role="alert">\
                    <a href="/profile/${data.sender}">@${data.sender}</a><hr>\
                    <h5>\
                    {{{body}}}\
                    </h5>\
                    {{timestamp}}\
                    </div>`;
                    //Create template functions
                    let template = await Handlebars.compile(message);
                    let mbody = await Handlebars.compile("{{message}}");
                    //Decrypt message
                    let decrypted = await cryptico.decrypt(data.body, privatekey);
                    //Verify sender authenticity via signing keys
                    var senderkey;
                    for (i of window.users){
                        if(i.user == data.sender){
                            senderkey = i.key;
                        }
                    }
                    decrypted = (decrypted.publicKeyString == senderkey) ? decrypted.plaintext : `**WARNING: Our software has detected that this message may be sent by a hacker.**  ${decodeURI(decrypted.plaintext)}`;
                    //Compile message and format Unicode characters
                    mbody = await mbody({message: decodeURI(decrypted)});
                    message = await template({
                        sender: data.sender,
                        body: marked(mbody),
                        timestamp: await new Date(data.timestamp).toLocaleString()
                    })
                    //Add message content to message area
                    let area = await $('#body');
                    await area.append(message);
                    await notify(data.sender + ":" + await decodeURI(decrypted));
                }
            }
            chatSocket.onclose = async function(e) {
                await alert('Chat socket closed unexpectedly, reloading...');
                await location.reload(true);
            }
            //Get all encrypted messages
            let texts = await $('[data-decrypted = "false"]');
            texts.each( async function(i) {
                //Decrypt each message
                let decrypted = await cryptico.decrypt(i.data('content'), privatekey);
                var sender = i.parent().children('[data-decrypted = "false"]')
                for(e of window.users){
                   if(e.user == sender.substring(1)){senderkey=e.key;}
                }
                if(decrypted.signature == "verified" && decrypted.publicKeyString == senderkey) {
                let template = Handlebars.compile("{{message}}")
                    i.html(marked(template({message: decodeURI(decrypted.plaintext)})));
                } else {
                    i.html(`<b>WARNING: Our software has detected that this message may be sent by a hacker.</b><br>${decodeURI(decrypted.plaintext)}`)
                }
            })
            $('.timestamp').each(async function(e){
                e.html(new Date(e.data('value').toLocaleString()))
            })
            //Detect message sending
            $('#message').trigger('focus');
            $('#message').keyup(async function(i){
                //Detect Enter
                if (i.which == 13){
                    $('#send').trigger('click');
                }
            })
            $('#send').click(async function(e){
                var message = $('#message').val();
                $('#message').val(null);
                if(!message){
                    return false;
                }
                let message2=`<div class="alert alert-success" role="alert">\
                <a href="/profile/${currentuser}">@${currentuser}</a><hr>\
                <h5>\
                {{{message}}}\
                </h5>\
                Sent ${new Date().toLocaleString()}\
                </div>`;
                let mbody = await Handlebars.compile("{{message}}");
                mbody = mbody({message: message});
                let template = Handlebars.compile(message2);
                $('#body').append(template({message: marked(mbody)}));
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
            })
        break;
        case('login'):
            $('#login').submit(async function(){
                let username = $('#username').val();
                let password = $('#password').val();
                fingerprint = await SHA256(SHA256(username)+password);
                //Store user encryption token
                await localStorange.setItem('fingerprint',fingerprint);
            })
        break;
        case('register'):
            let username = $('#username').val();
            let password = $('#password').val();
            fingerprint = await SHA256(SHA256(username)+password);
            //Store user encryption token
            await localStorange.setItem('fingerprint',fingerprint);
            //Autofillout public key for storage
            let key = await cryptico.generateRSAKey(fingerprint,1024);
            key = await cryptico.publicKeyString(key);
            $('#key').val(key);
            return true;
        break;
    }
})
async function accept(id,pk){
    let csrf = await Cookies.get('csrftoken');
    const request = new Request(
        '/accept',
        {headers: {'X-CSRFToken': csrf}}
    );
    let res = await fetch(request, {
        "method": "POST",
        "body": JSON.stringify({
            "id": id,
            "pk": pk
        })
    })
    let result = await res.json()
    window.location.href = `/room/${id}`
}
async function notify(message) {
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
    Notification.requestPermission().then(async function (permission) {
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
//Extract AES-CBC 32 byte key from a passphrase
function extractAESKey(passphrase){
    //Creates 64-character long digest
    let digest = SHA256(passphrase);
    //Init 32-byte key array
    let key = new Array();
    //Parses each byte of hex into key array
    for(i=0;i<digest.length;i+=2){
          key.push(parseInt(digest[i]+digest[i+1],16))
    }
    return key;
}