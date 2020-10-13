from django.contrib import admin
from .models import User, Room, Invite, Message, PublicKey
# Register your models here.
admin.site.register(User)
admin.site.register(Room)
admin.site.register(Invite)
admin.site.register(Message)
admin.site.register(PublicKey)