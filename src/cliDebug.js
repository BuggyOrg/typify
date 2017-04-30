#!/usr/bin/env node

import * as cliExt from 'cli-ext'
import {relabelToTypes} from './api'

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
  const relabledGraph = relabelToTypes(graph)
  console.log(JSON.stringify(relabledGraph, null, 2))
})
.catch((err) => {
  console.error(err.stack || err)
  process.exitCode = 1
})
