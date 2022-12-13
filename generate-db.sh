#!/bin/bash

./git-log-format.sh $1 | python git-database.py $1