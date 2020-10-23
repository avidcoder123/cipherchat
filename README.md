# Final project for CS50W 2020
## Description
My final project for CS50W 2020 is called CipherChat. CipherChat is an end-to-end encrypted real-time chat service that runs on Django, Django Channels, and Redis 5. Views.py contains all of my HTTP views for my webpage, and urls.py contains all my HTTP urls. Routing.py and Consumers.py configure Django Channels, which I am using to acheive real-time communication on my website. My static folder contains application.js, the JavaScript that I use to connect to the chat server and perform dynamic actions. The encryption directory contains the source code of Cryptico, the JavaScript package I am using in order to create a secure RSA-1024 encrypted chat. Cryptico's GitHub repo is [here](https://github.com/wwwtyro/cryptico). After two months of nonstop work, I have finally created this project, and I hope you enjoy it.

## How to run
Since CipherChat does not run on pure Django, you must take some extra steps for setup. First, you must install all the requirements running:  
`pip install -r requirements.txt`  
Then, you must download and run a Redis 5.x+ server. Any older version will not work. For Mac, run:  
`brew install redis`  
On Ubuntu, you can install it directly with:   
`wget https://download.redis.io/releases/redis-6.0.8.tar.gz`  
`tar xzf redis-6.0.8.tar.gz`  
`cd redis-6.0.8`  
`make`  
Or you can use [Its Docker Image](https://hub.docker.com/_/redis) with:  
`docker pull redis`  
Windows is more difficult, since Redis does not have direct support for Windows. Since I developed this on a Windows machine, I used a Redis alternative, [Memurai](https://www.memurai.com).

After you install Redis/Memurai, you must run Redis on port 6379 with:  
`redis-server`  
On Windows, you can go to Task Manager, go to Services, and activate Memurai.
The you can run CipherChat as you would with any Django application, with  
`python manage.py runserver`  
## How to use
Want to use CipherChat to chat with others? Visit [the website](http://rsa-cipherchat.herokuapp.com), download for Desktop [on GitHub releases](https://github.com/thomcatmeow/cipherchat/releases) or download from [Google Drive](https://drive.google.com/drive/folders/1mOhxkpwFtzxTf4frSUmRVFBKl_ojqasw).  
## Planned updates:
### Cipherchat v1.1
Cipherchat 1.1 will vastly speed up the chatting experience in CipherChat by removing all AJAX from messages and transferring messages with pure WebSocket. This will speed up CipherChat in browsers such as Opera where AJAX can sometimes be unpredictable. The update will also introduce basic Desktop Notifications, where you will be notified of messages in your room when you are not on that tab. Until this massive speed update releases, if you are having very slow chatting, download CipherChat for your desktop or BlueStacks for a fair speed boost.
