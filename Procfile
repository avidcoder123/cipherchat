web: bin/start-pgbouncer-stunnel uvicorn final.asgi:application --limit-max-requests=1200 --port $PORT --host 0.0.0.0
worker: python manage.py runworker -v2
python manage.py collectstatic --noinput
manage.py migrate
