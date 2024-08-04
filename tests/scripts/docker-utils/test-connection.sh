#!/bin/bash -e

docker run --rm --network end-to-end-test_default curlimages/curl:latest -s --retry 20 --retry-delay 1 --retry-connrefused $1
