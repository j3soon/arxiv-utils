#!/bin/bash -e

docker run --rm --network tests_default curlimages/curl:latest -s --retry 20 --retry-delay 1 --retry-connrefused $1
