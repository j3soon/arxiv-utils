#!/bin/bash -e

docker exec -t tests-selenium-tests-1 \
    python "/app/tests/$@"
