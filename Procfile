web: bin/start-pgbouncer-stunnel gunicorn final.asgi:application -b 0.0.0.0:$PORT -w 4 -k uvicorn.workers.UvicornWorker --forwarded-allow-ips *
worker: python manage.py runworker -v2
python manage.py collectstatic --noinput
manage.py migrate
