//Waits for page to load
window.onload = async () => {
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
                members = members.split(',');
                const request = new Request(
                  '/new_room',
                  {headers:{'X-CSRFToken': csrf}}
                );
                let response = await fetch(request, {
                    "method": "POST",
                    "body": JSON.stringify({
                        "title": title,
                        "description": description,
                        "members": members
                    });
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
            $('leave').click(async function(){
                //Make sure the user wants to leave
                if (confirm("WARNING: If you leave this group, you cannot come back without an invitation.")){
                    //Send leave request to API
                    let response = await fetch(`leave/${path[2]}`);
                    let result = await response.json();
                    window.location.href = '/';
                    alert(result.message);
                }
            })
            $('invite').click(async function(){
                //Create array of invitees
                let invites = await $('#invites').val().split(',');
                //Clear the invite field
                await $('#invites').val(null);
                //Send invites to the API
                const request = new Request(
                    '/invite',
                    {headers:{'X-CSRFToken':csrf}}
                );
                let response = await fetch(request, {
                    "method": "POST",
                    "body": JSON.stringify({
                        "room": id,
                        "invites": invites
                    });
                });
                let result = await response.json();
                alert(result.message);
            })
        break;
        case 'chat':
            //Scroll to bottom
            window.scrollTo(0,document.body.scrollHeight || document.documentElement.scrollHeight);
            //Generate RSA key
            const fingerprint = await localStorage.getItem('fingerprint');
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
                empty && empty.remove();
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
                    await area.html(await area.html().concat(message));
                    await notify(data.sender + ":" + await decodeURI(decrypted));
                }
            }
            chatSocket.onclose = async function(e) {
                await alert('Chat socket closed unexpectedly, reloading...');
                await location.reload(true);
            }
            //Get all encrypted messages
            let texts = await $('[data-decrypted = "false"]');
            for(i of texts){
                //Decrypt each message
                let decrypted = await cryptico.decrypt(i.dataset.contents, privatekey);
                /*---------------------------------//
                LATER: Finish tidy up with JQUERY and await
                //------------------------------------*/
            }
        break;
    }
}