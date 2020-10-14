from django.db import close_old_connections

def manageconnections(func):
    def wrapper(*args,**kwargs):
        close_old_connections()
        func(*args,**kwargs)
        close_old_connections()
    return wrapper
