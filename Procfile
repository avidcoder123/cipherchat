web: bin/start-pgbouncer-stunnel uvicorn final.asgi:application --limit-max-requests=1200 --port 8000
worker: python manage.py runworker -v2
python manage.py collectstatic --noinput
manage.py migrate
