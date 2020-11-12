from django.contrib.auth import authenticate, login, logout
from django.shortcuts import render
from django.http import HttpResponse, HttpResponseRedirect, JsonResponse
from django.urls import reverse
from django.contrib.auth.decorators import login_required
import json
from django.db import IntegrityError
from .models import User, Room, Invite, Message, PublicKey, Status
from django.db import close_old_connections

# Create your views here.
@login_required
def index(request):
    close_old_connections()
    currentuser = User.objects.get(pk = request.user.id)
    raw_invites = Invite.objects.filter(recipient = currentuser)
    text_invites = []
    for invite in raw_invites:
        text_invites.append(invite.serialize())
    request.session["rooms"] = []
    allrooms = Room.objects.all()
    for room in allrooms:
        if request.user in room.members.all():
           request.session["rooms"].append({"name":room.name, "id": room.pk})
    return render(request, "capstone/index.html", {
        "invites": text_invites
    })


def login_view(request):
    close_old_connections()
    if request.method == "POST":

        # Attempt to sign user in
        username = request.POST["username"]
        password = request.POST["password"]
        user = authenticate(request, username=username, password=password)

        # Check if authentication successful
        if user is not None:
            login(request, user)
            return HttpResponseRedirect(reverse("index"))
        else:
            return render(request, "capstone/login.html", {
                "message": "Invalid username and/or password."
            })
    else:
        return render(request, "capstone/login.html")


def logout_view(request):
    close_old_connections()
    logout(request)
    return HttpResponseRedirect(reverse("index"))

def register(request):
    close_old_connections()
    if request.method == "POST":
        username = request.POST["username"]
        email = request.POST["email"]
        key = request.POST["key"]
        print(key)
        # Ensure password matches confirmation
        password = request.POST["password"]
        confirmation = request.POST["confirmation"]
        if password != confirmation:
            return render(request, "capstone/register.html", {
                "message": "Passwords must match."
            })

        # Attempt to create new user
        try:
            user = User.objects.create_user(username, email, password)
            user.save()
        except IntegrityError:
            return render(request, "capstone/register.html", {
                "message": "Username already taken."
            })
        login(request, user)
        newkey = PublicKey.objects.create(user = request.user, publickey = key)
        newkey.save()
        return HttpResponseRedirect(reverse("index"))
    else:
        return render(request, "capstone/register.html")

@login_required
def new_room(request):
    close_old_connections()
    request.session["rooms"] = []
    allrooms = Room.objects.all()
    for room in allrooms:
        if request.user in room.members.all():
           request.session["rooms"].append({"name":room.name, "id": room.pk})
    if request.method == "POST":
        data = json.loads(request.body)
        user = User.objects.get(pk = request.user.id)
        room = Room.objects.create(host=user, name=data.get("title"), description=data.get("description"))
        members = room.members
        if user not in data.get("members"):
            members.add(user)
        for person in data.get("members"):
            try:
                member = User.objects.get(username = person)
                invite = Invite.objects.create(room = room, recipient = member)
                invite.save()
            except:
                room.delete()
                return JsonResponse({
                    "message": "One or more of the listed members do not exist."
                })
        if len(room.members.all()) == len(data.get("members"))+1:
            room.save()
            return JsonResponse({
                "message":"Success!",
                "id": room.id
            })
        else:
            room.save()
            return JsonResponse({
                "message":"Success!",
                "id": room.id
            })
    else:
        return render(request, "capstone/new_room.html")

@login_required
def room(request, id):
    close_old_connections()
    request.session["rooms"] = []
    allrooms = Room.objects.all()
    for room in allrooms:
        if request.user in room.members.all():
           request.session["rooms"].append({"name":room.name, "id": room.pk})
    currentuser = User.objects.get(pk = request.user.id)
    room = Room.objects.get(pk = id)
    if not currentuser in room.members.all():
        return HttpResponseRedirect(reverse("index"))
    if room.host == currentuser:
        host = True
    else:
        host = False
    return render(request, "capstone/room.html", {
        "title": room.name,
        "description": room.description,
        "members": [user.username for user in room.members.all()],
        "host": host,
        "id": room.id
    })

@login_required
def leave(request, id):
    close_old_connections()
    request.session["rooms"] = []
    allrooms = Room.objects.all()
    for room in allrooms:
        if request.user in room.members.all():
           request.session["rooms"].append({"name":room.name, "id": room.pk})
    if request.method == "GET":
        room = Room.objects.get(pk = id)
        currentuser = User.objects.get(pk = request.user.id)
        if currentuser in room.members.all():
            room.members.remove(currentuser)
            return JsonResponse({
                "message":"You have successfully left that chatroom."
            })
        else:
            return JsonResponse({
                "message":"You are not a member of that room."
            })

@login_required
def invite(request):
    close_old_connections()
    if request.method == "POST":
        data = json.loads(request.body)
        room = Room.objects.get(id = data.get("room"))
        invites = data.get("invites")
        if not request.user == room.host:
            return JsonResponse({
                "message":"You do not have the permissions to do that!"
            })
        for invite in invites:
            try:
                users = room.members.all()
                invite_user = User.objects.get(username = invite)
                if invite_user in users.all():
                    return JsonResponse({
                        "message": "That user is already in this room!"
                    })
                invitation = Invite.objects.create(room = room, recipient = invite_user)
                invitation.save()
            except:
                return JsonResponse({
                    "message": "Either one of the members do not exist or you have already sent an invite to them."
                })
        return JsonResponse({
            "message": "Success!"
        })
    else:
        return HttpResponseRedirect(reverse("index"))

def accept(request):
    close_old_connections()
    if request.method == "POST":
        data = json.loads(request.body)
        invite_room = Room.objects.get(pk = data.get("id"))
        currentuser = User.objects.get(pk = request.user.id)
        invite_room.members.add(currentuser)
        invite_room.save()
        invite = Invite.objects.get(pk = data.get("pk"))
        invite.delete()
        return JsonResponse({
            "message":"Success!"
        })
@login_required
def chat(request, id):
    close_old_connections()
    request.session["rooms"] = []
    allrooms = Room.objects.all()
    for room in allrooms:
        if request.user in room.members.all():
           request.session["rooms"].append({"name":room.name, "id": room.pk})
    thisroom = Room.objects.get(pk = id)
    raw_allmessages = Message.objects.filter(room_data = thisroom, receiver = request.user)
    raw_allmessages = raw_allmessages.order_by("timestamp").all()
    all_messages=[]
    for message in raw_allmessages:
        all_messages.append(message.serialize())
    user_data = []
    for person in thisroom.members.all():
        key = PublicKey.objects.get(user=person)
        user_data.append(key)
    return render(request, "capstone/chat.html",{
        "messages": all_messages,
        "user_data": user_data
    })

def ajax(request, slug):
    close_old_connections()
    if request.method == "POST":
        data = json.loads(request.body)
        if slug == "roomdata":
            room = Room.objects.get(pk = data.get("roomid"))
            return JsonResponse({
                "name": room.name,
                "members": [user.username for user in room.members.all()],
                "host": room.host.username,
                "description": room.description
            })
        elif slug == "getkey":
            print(data.get("user"))
            user = User.objects.get(username = data.get("user"))
            key = PublicKey.objects.get(user = user)
            return JsonResponse({
                "key": key.publickey
            })
    else:
        HttpResponseRedirect(reverse("index"))

@login_required
def profile(request,user):
    close_old_connections()
    if request.method == "POST":
        newstatus = request.POST["status"]
        print(newstatus)
        try:
            status = Status.objects.get(thisuser = request.user)
            status.delete()
        except:
            pass
        setstatus = Status.objects.create(thisuser = request.user, status = newstatus)
        setstatus.save()
        return render(request, "capstone/profile.html",{
                "thisuser":request.user,
                "status": setstatus
            })
    else:
        try:
            requesteduser = User.objects.get(username = user)
            try:
                status = Status.objects.get(thisuser = requesteduser)
            except:
                status=None
            try:
                lastseen = Message.objects.filter(sender = requesteduser).order_by("-timestamp").first().timestamp
            except:
                lastseen = None
            return render(request, "capstone/profile.html",{
                "thisuser":requesteduser,
                "status": status,
                "lastseen":lastseen
            })
        except:
           return HttpResponseRedirect(reverse("index"))
def policy(request):
    return render(request, "capstone/policy.html")