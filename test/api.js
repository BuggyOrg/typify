
/* global describe, it, xit */

import * as Graph from '@buggyorg/graphtools'
import * as Rewrite from '@buggyorg/rewrite'
import * as API from '../src/api'
const fs = require('fs')

import _ from 'lodash'
import chai from 'chai'

const expect = chai.expect

function createSimpleGraph1 () {
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

function createSimpleGraph2 () {
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

function createIssueGraph () {
  let compound = Graph.flow(
    Graph.addNode({
      name: 'M',
      ports: [
        { port: 'p', kind: 'output', type: 'apples' }
      ]
    }),
    Graph.addNode({
      name: 'N',
      ports: [
        { port: 'p', kind: 'input', type: 'generic' }
      ]
    }),
    Graph.addEdge({ from: 'M@p', to: 'N@p' })
  )(Graph.compound({
    name: 'R',
    atomic: false,
    componentId: '',
    ports: []
  }))
  return Graph.addNode(compound, Graph.empty())
}

function createFactorialGraph () {
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
      atomic: false,
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
    name: 'Factorial',
    atomic: false,
    isRecursive: true,
    isRecursiveRoot: true,
    componentId: 'math/factorial',
    ports: [
      { port: 'out', kind: 'input', type: 'generic' },
      { port: 'in', kind: 'output', type: 'generic' }
    ]
  }))
  return Graph.addNode(cmp, Graph.empty())
}

function createBinomialGraph () {
  var cmp = Graph.flow(
    Graph.addNode({
      name: 'MinusOne',
      atomic: true,
      componentId: 'math/const',
      ports: [
        { port: 'out', kind: 'output', type: 'number' }
      ]
    }),
    Graph.addNode({
      name: 'Add1',
      atomic: true,
      componentId: 'math/add',
      ports: [
        { port: 'in1', kind: 'input', type: 'generic' },
        { port: 'in2', kind: 'input', type: 'generic' },
        { port: 'out', kind: 'output', type: 'generic' }
      ]
    }),
    Graph.addNode({
      name: 'Add2',
      atomic: true,
      componentId: 'math/add',
      ports: [
        { port: 'in1', kind: 'input', type: 'generic' },
        { port: 'in2', kind: 'input', type: 'generic' },
        { port: 'out', kind: 'output', type: 'generic' }
      ]
    }),
    Graph.addNode({
      name: 'Rec1',
      atomic: false,
      isRecursive: true,
      componentId: 'math/binomial',
      ports: [
        { port: 'in1', kind: 'input', type: 'generic' },
        { port: 'in2', kind: 'input', type: 'generic' },
        { port: 'out', kind: 'output', type: 'generic' }
      ]
    }),
    Graph.addNode({
      name: 'Rec2',
      atomic: false,
      isRecursive: true,
      componentId: 'math/binomial',
      ports: [
        { port: 'in1', kind: 'input', type: 'generic' },
        { port: 'in2', kind: 'input', type: 'generic' },
        { port: 'out', kind: 'output', type: 'generic' }
      ]
    }),
    Graph.addNode({
      name: 'Add3',
      atomic: true,
      componentId: 'math/add',
      ports: [
        { port: 'in1', kind: 'input', type: 'generic' },
        { port: 'in2', kind: 'input', type: 'generic' },
        { port: 'out', kind: 'output', type: 'generic' }
      ]
    }),
    Graph.addEdge({ from: '@in1', to: 'Add1@in1' }),
    Graph.addEdge({ from: '@in2', to: 'Add2@in1' }),
    Graph.addEdge({ from: 'MinusOne@out', to: 'Add1@in2' }),
    Graph.addEdge({ from: 'MinusOne@out', to: 'Add2@in2' }),
    Graph.addEdge({ from: 'Add1@out', to: 'Rec1@in1' }),
    Graph.addEdge({ from: 'Add2@out', to: 'Rec1@in2' }),
    Graph.addEdge({ from: 'Add1@out', to: 'Rec2@in1' }),
    Graph.addEdge({ from: '@in2', to: 'Rec2@in2' }),
    Graph.addEdge({ from: 'Rec1@out', to: 'Add3@in1' }),
    Graph.addEdge({ from: 'Rec2@out', to: 'Add3@in2' }),
    Graph.addEdge({ from: 'Add3@out', to: '@out' }),
    Graph.addEdge({ from: 'Rec1', to: '', layer: 'recursion' }),
    Graph.addEdge({ from: 'Rec2', to: '', layer: 'recursion' })
  )(Graph.compound({
    name: 'Binomial',
    atomic: false,
    isRecursive: true,
    isRecursiveRoot: true,
    componentId: 'math/binomial',
    ports: [
      { port: 'in1', kind: 'input', type: 'generic' },
      { port: 'in2', kind: 'input', type: 'generic' },
      { port: 'out', kind: 'output', type: 'generic' }
    ]
  }))
  return Graph.addNode(cmp, Graph.empty())
}

describe('API tests', () => {
  it('can apply basic rules I', () => {
    let graph1 = createSimpleGraph1()
    let graph2 = API.TypifyAll(graph1)
    expect(Rewrite.graphEquals(graph1, graph2)).to.be.false
    expect(_.every(Graph.nodes(graph2), node => {
      return _.every(Graph.Node.ports(node), (port) => {
        return Rewrite.isGenericPort(port) === false
      })
    })).to.be.true
  })
  it('can apply basic rules II', () => {
    let graph1 = createSimpleGraph2()
    let graph2 = API.TypifyAll(graph1)
    expect(Rewrite.graphEquals(graph1, graph2)).to.be.false
    expect(_.every(Graph.nodes(graph2), node => {
      return _.every(Graph.Node.ports(node), (port) => {
        return Rewrite.isGenericPort(port) === false
      })
    })).to.be.true
  })
  it('can modify ports without deleting edges (seems to be fixed now)', () => {
    let graph1 = createIssueGraph()
    let graph2 = API.TypifyAll(graph1)
    let root = Graph.node('R', graph1)
    let port = Graph.port('N@p', root)
    let newPort = _.assign(_.cloneDeep(port), {
      type: 'oranges'
    })
    graph2 = Rewrite.replacePort(Graph.node('N', root), port, newPort, graph1)
    expect(Rewrite.graphEquals(graph1, graph2)).to.be.false
    expect(Graph.port('N@p', Graph.node('R', graph2)).type === 'oranges').to.be.true
  })
  it('can typify Maxs recursion', () => {
    let graph1 = JSON.parse(fs.readFileSync('./test/fixtures/fac.json', 'utf-8'))
    let graph2 = API.TypifyAll(graph1)
    expect(Rewrite.graphEquals(graph1, graph2)).to.be.false
  })
  it('can typify recursive function (factorial)', () => {
    let graph1 = createFactorialGraph()
    let graph2 = API.TypifyAll(graph1)
    expect(Rewrite.graphEquals(graph1, graph2)).to.be.false
    expect(_.every(Graph.nodes(graph2), node => {
      return _.every(Graph.Node.ports(node), (port) => {
        return Rewrite.isGenericPort(port) === false
      })
    })).to.be.true
  })
  it('can typify recursive function (binomial)', () => {
    let graph1 = createBinomialGraph()
    let graph2 = API.TypifyAll(graph1)
    expect(Rewrite.graphEquals(graph1, graph2)).to.be.false
    expect(_.every(Graph.nodes(graph2), node => {
      return _.every(Graph.Node.ports(node), (port) => {
        return Rewrite.isGenericPort(port) === false
      })
    })).to.be.true
  })
})
