/* global describe, it, xit */

import * as Graph from '@buggyorg/graphtools'
import * as API from '../src/api'
import chai from 'chai'
import fs from 'fs'

const expect = chai.expect

function Graph3(fromType, overType, toType) {
  return Graph.flow(
      Graph.addNode({
        name: 'A',
        ports: [
          { port: 'a1', kind: 'output', type: fromType }
        ]
      }),
      Graph.addNode({
        name: 'B',
        ports: [
          { port: 'b1', kind: 'input', type: overType },
          { port: 'b2', kind: 'output', type: overType }
        ]
      }),
      Graph.addNode({
        name: 'C',
        ports: [
          { port: 'c1', kind: 'input', type: toType }
        ]
      }),
      Graph.addEdge({ from: 'A@a1', to: 'B@b1' }),
      Graph.addEdge({ from: 'B@b2', to: 'C@c1' })
    )()
}

const ListType = {
  name: 'LFP',
  data: [{
    name: 'List',
    data: [{
      name: 'Union',
      data: [
        { name: 'Nil', data: [] },
        { name: 'Cons', data: [ 'a', 'x' ] }
      ]
    }]
  }]
}

function ListGraph (sourceType, resultType) {
  let listType = {

  }
  return Graph.flow(
      Graph.addNode({
        name: 'sourceElement',
        ports: [
          { port: 'p1', kind: 'output', type: 'Integer' }
        ]
      }),
      Graph.addNode({
        name: 'sourceArray',
        ports: [
          { port: 'b1', kind: 'input', type: { name: 'Array', data: [sourceType] } },
          { port: 'b2', kind: 'output', type: overType }
        ]
      }),
      Graph.addNode({
        name: 'C',
        ports: [
          { port: 'c1', kind: 'input', type: toType }
        ]
      }),
      Graph.addEdge({ from: 'A@a1', to: 'B@b1' }),
      Graph.addEdge({ from: 'B@b2', to: 'C@c1' })
    )()
}

describe('Lambda functions', () => {
  it('Can identify lambda function with Function types', () => {
    const graph = Graph.fromJSON(JSON.parse(fs.readFileSync('./test/fixtures/lambda_output.json', 'utf8')))
    expect(Graph.hasNode('/functional/lambda', graph)).to.be.true
    const typed = API.TypifyAll(graph)
    expect(API.isFullyTyped(typed)).to.be.true
  }),
  it('Can propagate subtypes across functions', () => {

    let types = API.constructTypeTree([
      { name: 'Z', subtypes: ['2Z'] },
      { name: '2Z', subtypes: ['4Z'] },
      { name: '4Z', subtypes: [] }
    ])

    var graph, typed

    graph = Graph3('4Z', 'generic', 'Z')
    typed = API.TypifyAll(graph, types)

  })
})