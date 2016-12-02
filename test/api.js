
/* global describe, it, xit */

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

function createTestGraph2 () {
  return Graph.flow(
    Graph.addNode({
      name: 'A',
      ports: [
        { port: 'p1', kind: 'output', type: 'generic' },
        { port: 'p2', kind: 'output', type: 'generic' }
      ]
    }),
    Graph.addNode({
      name: 'B',
      ports: [
        { port: 'p3', kind: 'input', type: 'generic' },
        { port: 'p4', kind: 'input', type: 'generic' }
      ]
    }),
    Graph.addNode({
      name: 'C',
      ports: [
        { port: 'p5', kind: 'output', type: 'generic' }
      ]
    }),
    Graph.addNode({
      name: 'D',
      ports: [
        { port: 'p6', kind: 'input', type: 'string' }
      ]
    }),
    Graph.addEdge({ from: 'A@p1', to: 'B@p3' }),
    Graph.addEdge({ from: 'A@p2', to: 'D@p6' }),
    Graph.addEdge({ from: 'C@p5', to: 'B@p4' })
  )()
}

function createFacGraph () {
  var cmp = Graph.flow(
    Graph.addNode({
      name: 'Const',
      atomic: true,
      componentId: 'math/const',
      ports: [
        { port: 'out', kind: 'output', type: 'number' }
      ]
    }),
    Graph.addNode({
      name: 'Add',
      atomic: true,
      componentId: 'math/add',
      ports: [
        { port: 'in1', kind: 'input', type: 'generic' },
        { port: 'in2', kind: 'input', type: 'generic' },
        { port: 'out', kind: 'output', type: 'generic' }
      ]
    }),
    Graph.addNode({
      name: 'Multiply',
      atomic: true,
      componentId: 'math/multiply',
      ports: [
        { port: 'in1', kind: 'input', type: 'generic' },
        { port: 'in2', kind: 'input', type: 'generic' },
        { port: 'out', kind: 'output', type: 'generic' }
      ]
    }),
    Graph.addNode({
      name: 'Recursion',
      atomic: true,
      isRecursive: true,
      componentId: 'math/factorial',
      ports: [
        { port: 'in', kind: 'input', type: 'generic' },
        { port: 'out', kind: 'output', type: 'generic' }
      ]
    }),
    Graph.addNode({
      name: 'Output',
      atomic: true,
      ports: [
        { port: 'in', kind: 'input', type: 'generic' },
        { port: 'out', kind: 'output', type: 'generic' }
      ]
    }),
    Graph.addEdge({ from: '@out', to: 'Add@in1' }),
    Graph.addEdge({ from: '@out', to: 'Multiply@in1' }),
    Graph.addEdge({ from: 'Const@out', to: 'Add@in2' }),
    Graph.addEdge({ from: 'Add@out', to: 'Recursion@in' }),
    Graph.addEdge({ from: 'Recursion@out', to: 'Multiply@in2' }),
    Graph.addEdge({ from: 'Multiply@out', to: 'Output@in' }),
    Graph.addEdge({ from: 'Recursion', to: '', layer: 'recursion' })
  )(Graph.compound({
    name: 'Input',
    atomic: false,
    isRecursive: true,
    isRecursiveRoot: true,
    componentId: 'math/factorial',
    ports: [
      { port: 'out', kind: 'input', type: 'number' },
      { port: 'in', kind: 'output', type: 'number' }
    ]
  }))
  return Graph.addNode(cmp, Graph.empty())
}

describe('API tests', () => {
  it('can apply basic rules I', () => {
    var graph1 = createTestGraph()
    var graph2 = API.TypifyAll(graph1)
    expect(Rewrite.graphEquals(graph1, graph2)).to.be.false
    expect(_.every(Graph.nodes(graph2), node => {
      return _.every(Graph.Node.ports(node), (port) => {
        return Rewrite.isGenericPort(port) === false
      })
    })).to.be.true
  })
  it('can apply basic rules II', () => {
    var graph1 = createTestGraph2()
    var graph2 = API.TypifyAll(graph1)
    expect(Rewrite.graphEquals(graph1, graph2)).to.be.false
  })
  xit('can typify recursive function (factorial)', () => {
    var graph1 = createFacGraph()
    var graph2 = API.TypifyAll(graph1)
    expect(Rewrite.graphEquals(graph1, graph2)).to.be.false
  })
})
