/* global describe, it */
import chai from 'chai'
import fs from 'fs'
import graphlib from 'graphlib'
import * as api from '../src/api'

var expect = chai.expect

describe('Typgins', () => {

  it('can validate typings', () => {
    expect(api.validateTypings({number: 'int', bool: 'bool', string: 'string'})).to.be.true
    expect(api.validateTypings({bool: 'bool', string: 'string'})).to.be.false
    expect(api.validateTypings({int: 'int', bool: 'bool', string: 'string'})).to.be.false
    expect(api.validateTypings({number: 'int', bool: null, string: 'string'})).to.be.false
  })

  it('converts every generic port-type into a concrete one', () => {
    var graph = graphlib.json.read(JSON.parse(fs.readFileSync('test/fixtures/add.json', 'utf8')))
    var newGraph = api.applyTypings(graph, {number: 'a', bool: 'b', string: 'c'})
    expect(newGraph.node('a').inputPorts['s1']).to.equal('a')
    expect(newGraph.node('a').inputPorts['s2']).to.equal('b')
    expect(newGraph.node('a').outputPorts['sum']).to.equal('c')
  })

  it('fails to apply invalid typings', () => {
    expect(() => api.applyTypings({}, {numba: 'a', bool: 'b', string: 'c'}))
      .to.throw(Error)
  })
})
