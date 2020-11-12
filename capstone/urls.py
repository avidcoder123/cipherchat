from django.urls import path
from . import views

urlpatterns = [
    path("", views.index, name="index"),
    path("login", views.login_view, name="login"),
    path("logout", views.logout_view, name="logout"),
    path("register", views.register, name="register"),
    path("new_room", views.new_room, name="new_room"),
    path("room/<int:id>", views.room, name="room"),
    path("leave/<int:id>", views.leave, name="leave"),
    path("invite", views.invite, name="invite"),
    path("accept", views.accept, name="accept"),
    path("chat/<int:id>", views.chat, name="chat"),
    path("ajax/<str:slug>", views.ajax, name="ajax"),
    path("profile/<str:user>", views.profile, name="profile"),
    path("/policy",views.policy,name="policy")
]