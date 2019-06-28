import os
from rq import Queue, Connection, Worker
from redis import Redis

listen = ['default']
redis_url = os.getenv('REDISTOGO_URL', 'redis://localhost:6379')  # path to Redis url
redis_con = Redis.from_url(redis_url)  # connection for Redis server

# create a worker process to listen for queue tasks.
if __name__ == "__main__":
    # Provide queue names to listen to as arguments to this script,
    with Connection(redis_con):  # create connection
        worker = Worker(list(map(Queue, listen)))
        worker.work()
