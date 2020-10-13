from django.db import models
from django.contrib.auth.models import AbstractUser
# Create your models here.
class User(AbstractUser):
    pass
class Room(models.Model):
    host = models.ForeignKey(User, on_delete=models.PROTECT, related_name="host")
    name = models.CharField(max_length = 1000)
    description = models.CharField(max_length = 1000)
    members = models.ManyToManyField("User", related_name = "members")

    def serialize(self):
        return {
            "id": self.id,
            "host": self.host,
            "name": self.name,
            "description": self.description,
            "members": [user.username for user in self.members.all()]
        }
class Invite(models.Model):
    room = models.ForeignKey(Room, on_delete=models.CASCADE, related_name="room")
    recipient = models.ForeignKey(User, on_delete=models.CASCADE, related_name="recipient")
    fingerprint = models.CharField(unique = True, max_length=300, null=True)

    def serialize(self):
        return{
            "pk":self.pk,
            "id": self.room.id,
            "name": self.room.name,
            "recipient": self.recipient.username
        }
    def save(self, *args, **kwargs):
        self.fingerprint = hash(f"{self.room.id}{self.recipient.username}")
        super().save(*args, **kwargs)
class Message(models.Model):
    room_data = models.ForeignKey(Room, on_delete = models.CASCADE, related_name="room_data")
    timestamp = models.DateTimeField(auto_now_add = True)
    sender = models.ForeignKey(User, on_delete = models.CASCADE, related_name = "sender")
    receiver = models.ForeignKey(User, on_delete = models.CASCADE, related_name = "receiver")
    body = models.CharField(max_length = 2000)

    def serialize(self):
        return {
            "room": self.room_data,
            "timestamp": self.timestamp,
            "sender": self.sender.username,
            "senderid":self.sender.pk,
            "body": self.body
        }
class PublicKey(models.Model):
    user = models.ForeignKey(User, on_delete = models.CASCADE, related_name="user")
    publickey = models.CharField(max_length = 1024)
class Status(models.Model):
    thisuser = models.ForeignKey(User, on_delete = models.CASCADE, related_name="thisuser")
    status = models.CharField(max_length = 256, null=True)