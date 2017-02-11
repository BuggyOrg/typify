/* global describe, it, xit */

import * as Graph from '@buggyorg/graphtools'
import * as Rewrite from '@buggyorg/rewrite'
import * as API from '../src/api'
const fs = require('fs')

const Utils = require('../src/utils.js')

import _ from 'lodash'
import chai from 'chai'

const expect = chai.expect

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
        { port: 'p6', kind: 'input', type: 'String' }
      ]
    }),
    Graph.addEdge({ from: 'A@p1', to: 'B@p3' }),
    Graph.addEdge({ from: 'A@p2', to: 'D@p6' }),
    Graph.addEdge({ from: 'C@p5', to: 'B@p4' })
  )()
}

function createFactorialGraph () {
  var cmp = Graph.flow(
    Graph.addNode({
      name: 'Const',
      atomic: true,
      componentId: 'math/const',
      ports: [
        { port: 'out', kind: 'output', type: 'Number' }
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
        { port: 'out', kind: 'output', type: 'Number' }
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
  it('can replace nodes', () => {
    let graph = createSimpleGraph1()
    for (const node of Graph.nodesDeep(graph)) {
      let newNode = _.assign(_.cloneDeep(node), {
        someKey: 'someValue'
      })
      graph = Graph.replaceNode(node, newNode, graph)
    }
    for (const node of Graph.nodes(graph)) {
      expect(node.someKey).to.equal('someValue')
    }
  })
  it('can replace ports', () => {
    let graph = createSimpleGraph1()
    for (let node of Graph.nodesDeep(graph)) {
      for (const port of Graph.Node.ports(node)) {
        let newPort = _.assign(_.cloneDeep(port), {
          type: 'Something'
        })
        graph = Rewrite.replacePort(node, port, newPort, graph)
        node = Graph.node(node.id, graph)
      }
    }
    for (const node of Graph.nodes(graph)) {
      for (const port of Graph.Node.ports(node)) {
        expect(port.type).to.equal('Something')
      }
    }
  })
  it('can apply basic rules I', () => {
    let graph1 = createSimpleGraph1()
    let graph2 = API.TypifyAll(graph1)
    expect(Rewrite.graphEquals(graph1, graph2)).to.be.false
    for (const node of Graph.nodes(graph2)) {
      for (const port of Graph.Node.ports(node)) {
        expect(port).to.not.satisfy(Utils.IsGenericPort)
      }
    }
  })
  it('can apply basic rules II', () => {
    let graph1 = createSimpleGraph2()
    let graph2 = API.TypifyAll(graph1)
    expect(Rewrite.graphEquals(graph1, graph2)).to.be.false
    for (const node of Graph.nodes(graph2)) {
      for (const port of Graph.Node.ports(node)) {
        expect(port).to.not.satisfy(Utils.IsGenericPort)
      }
    }
  })
  it('can typify loop problem case', () => {
    let graph1 = JSON.parse(fs.readFileSync('./test/fixtures/problem.json', 'utf-8'))
    let graph2 = API.TypifyAll(graph1)
    fs.writeFileSync('./test/fixtures/problem_typified.json', JSON.stringify(graph2, null, 2))
    expect(Rewrite.graphEquals(graph1, graph2)).to.be.false
    for (const node of Graph.nodes(graph2)) {
      for (const port of Graph.Node.ports(node)) {
        expect(port).to.not.satisfy(Utils.IsGenericPort)
      }
    }
  })
  it('can typify recursive function (factorial)', () => {
    let graph1 = createFactorialGraph()
    let graph2 = API.TypifyAll(graph1)
    expect(Rewrite.graphEquals(graph1, graph2)).to.be.false
    for (const node of Graph.nodes(graph2)) {
      for (const port of Graph.Node.ports(node)) {
        expect(port).to.not.satisfy(Utils.IsGenericPort)
      }
    }
  })
  it('can typify recursive function (binomial)', () => {
    let graph1 = createBinomialGraph()
    let graph2 = API.TypifyAll(graph1)
    expect(Rewrite.graphEquals(graph1, graph2)).to.be.false
    for (const node of Graph.nodes(graph2)) {
      for (const port of Graph.Node.ports(node)) {
        expect(port).to.not.satisfy(Utils.IsGenericPort)
      }
    }
  })
  it('can unify simple types', () => {
    let t1 = {
      data: ['a', 'Number'],
      name: 'Pair'
    }
    let t2 = {
      data: ['String', 'b'],
      name: 'Pair'
    }
    var a1 = []
    var a2 = []
    expect(API.UnifyTypes(t1, t2, a1, a2)).not.to.throw
    expect(a1).to.have.length(1)
    expect(a2).to.have.length(1)
    expect(a1[0]).to.deep.equal({key: 'a', value: 'String'})
    expect(a2[0]).to.deep.equal({key: 'b', value: 'Number'})
  })
  it('can unify function types', () => {
    let genArray = {
      name: 'Generic Array',
      base: 'Function',
      arguments: [
        'N'
      ],
      data: [
        'e'
      ]
    }
    let genFunc = {
      name: 'Generic Function',
      base: 'Function',
      arguments: [
        'a'
      ],
      data: [
        'e'
      ]
    }
    expect(API.UnifyTypes(genArray, genFunc)).not.to.throw
    for (const t of [genArray, genFunc]) {
      expect(t.assignment).to.exist
    }
  })
})
