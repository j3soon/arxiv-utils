#!/bin/bash -e

docker exec -t tests_selenium-tests_1 \
    python "/app/tests/$@"
