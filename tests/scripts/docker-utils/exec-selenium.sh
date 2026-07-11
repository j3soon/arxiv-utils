#!/bin/bash -e

docker exec -t -e E2E_FULL="${E2E_FULL:-0}" end-to-end-test-selenium-tests-1 \
    python "/app/tests/end-to-end-test/$@"
