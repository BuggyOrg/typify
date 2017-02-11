

import * as Graph from '@buggyorg/graphtools'
import * as API from './api'

function createSimpleGraph1 () {
  return Graph.flow(
    Graph.addNode({
      name: 'a',
      ports: [
        { port: 'p1', kind: 'output', type: 'Number' },
        { port: 'p2', kind: 'output', type: 'generic' }
      ]
    }),
    Graph.addNode({
      name: 'b',
      ports: [
        { port: 'p3', kind: 'input', type: 'generic' },
        { port: 'p4', kind: 'input', type: 'generic' }
      ]
    }),
    Graph.addEdge({ from: 'a@p1', to: 'b@p4' }),
    Graph.addEdge({ from: 'a@p2', to: 'b@p3' })
  )()
}

let graph1 = createSimpleGraph1()
let graph2 = API.TypifyAll(graph1)