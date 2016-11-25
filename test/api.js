
/* global describe, it */

import * as Graph from '@buggyorg/graphtools'
import * as Rewrite from '@buggyorg/rewrite'
import * as API from '../src/api'

import _ from 'lodash'
import chai from 'chai'

const expect = chai.expect

function createTestGraph () {
  return Graph.flow(
    Graph.addNode({
      name: 'a',
      ports: [
        { port: 'p1', kind: 'output', type: 'number' },
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

describe('API tests', () => {
  it('can create and compare graphs', () => {
    var graph1 = createTestGraph()
    var rules = [
      API.TypifySpecializingEdge(),
      API.TypifyGeneralizingEdge(),
      API.TypifyCollectingNode(),
      API.TypifyDistributingNode(),
      API.TypifyRecursiveNode()
    ]
    var graph2 = Rewrite.rewrite(rules)(graph1)
    console.log(JSON.stringify(graph2, null, 2))
    expect(Rewrite.graphEquals(graph1, graph2)).to.be.false
  })
})
