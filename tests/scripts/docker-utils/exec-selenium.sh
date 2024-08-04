#!/bin/bash -e

docker exec -t end-to-end-test-selenium-tests-1 \
    python "/app/tests/end-to-end-test/$@"
