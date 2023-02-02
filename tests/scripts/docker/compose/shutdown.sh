#!/bin/bash -e

DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )"
docker-compose -f $DIR/../../../docker-compose.yml down -v --remove-orphans
