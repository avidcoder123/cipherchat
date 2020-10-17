web: bin/start-pgbouncer-stunnel uvicorn final.asgi:application --limit-max-requests=1200 --port $PORT
worker: python manage.py runworker -v2
python manage.py collectstatic --noinput
manage.py migrate
