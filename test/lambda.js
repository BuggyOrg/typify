/* global describe, it, xit */

import * as Graph from '@buggyorg/graphtools'
import * as API from '../src/api'
import chai from 'chai'
import fs from 'fs'

const expect = chai.expect

describe('Lambda functions', () => {
  xit('Can identify lambda function with Function types', () => {
    const graph = Graph.fromJSON(JSON.parse(fs.readFileSync('./test/fixtures/lambda_output.json', 'utf8')))
    expect(Graph.hasNode('/functional/lambda', graph)).to.be.true
    const typed = API.TypifyAll(graph)
    expect(API.isFullyTyped(typed)).to.be.true
  })
})