#!/bin/bash

for i in `seq 1 15`;                    
do              
  node lib/cli.js map.json $i|node lib/cliDebug.js|node ../portgraph2kgraph/lib/cli.js|node ../graphify/lib/cli.js -p
done

