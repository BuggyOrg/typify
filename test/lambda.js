/* global describe, it */

import * as Graph from '@buggyorg/graphtools'
import * as API from '../src/api'
import chai from 'chai'
import fs from 'fs'

const expect = chai.expect

describe('Lambda functions', () => {
  it('Can identify lambda function with Functiontypes', () => {
    const graph = Graph.fromJSON(JSON.parse(fs.readFileSync('./test/fixtures/lambda_output.json', 'utf8')))
    expect(Graph.hasNode('/functional/lambda', graph)).to.be.true
    const typed = API.TypifyAll(graph)
    console.log(JSON.stringify(typed.nodes[2].ports[0].type))
    expect(API.isFullyTyped(typed)).to.be.true
  })
})
