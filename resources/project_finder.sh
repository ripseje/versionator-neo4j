#!/bin/bash

ORG="$1"
PROJECT_FILE="resources/projects.json"

export LANG=en_US.UTF-8

az devops project list --organization "https://dev.azure.com/$ORG" --query "value[].name" --output json | iconv -f iso-8859-1 -t utf-8 > $PROJECT_FILE
