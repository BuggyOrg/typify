#!/usr/bin/env node

import * as cliExt from 'cli-ext'
import {TypifyAll} from './api'

cliExt.input(process.argv[2])
.then((graphStr) => {
  var graph
  try {
    graph = JSON.parse(graphStr)
  } catch (err) {
    console.error('[Typify] Cannot parse input JSON.')
  }
  return TypifyAll(graph)
})
.then((res) => console.log(JSON.stringify(res, null, 2)))
.catch((err) => console.error(err.stack || err))

