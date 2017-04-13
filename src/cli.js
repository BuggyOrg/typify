#!/usr/bin/env node

import * as cliExt from 'cli-ext'
import {TypifyAll, isFullyTyped} from './api'

cliExt.input(process.argv[2])
.then((graphStr) => {
  var graph
  try {
    graph = JSON.parse(graphStr)
  } catch (err) {
    console.error('[Typify] Cannot parse input JSON.')
    process.exitCode = 1
    return
  }
  const typifiedGraph = TypifyAll(graph)
  if (!isFullyTyped(typifiedGraph)) {
    console.error('[Typify] Could not typify the given graph.')
    process.exitCode = 1
  } else {
    console.log(JSON.stringify(typifiedGraph, null, 2))
  }
})
.catch((err) => {
  console.error(err.stack || err)
  process.exitCode = 1
})
