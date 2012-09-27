#!/bin/bash

if [ $UID -ne 0 ]; then
echo "$0 must be run as root"
exit 1
fi

cd src && npm install;
echo 'Source dependencies installed';
cd ../tests && npm install;
echo 'Tests dependencies installed';
cd ../benchmark && npm install;
echo 'Benchmark dependencies installed';
