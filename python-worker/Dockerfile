FROM python:3.11
WORKDIR /app
COPY python-worker/ ./python-worker/
COPY requirements.txt ./
RUN pip install -r requirements.txt
CMD ["python3", "python-worker/scheduler_cron.py"]