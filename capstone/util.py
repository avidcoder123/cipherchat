from django.db import close_old_connections
from functools import wraps

def manageconnections(func):
    @wraps(func)
    def wrapper(*args,**kwargs):
        close_old_connections()
        func(*args,**kwargs)
        close_old_connections()
    return wrapper
