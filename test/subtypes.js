
import * as API from '../src/api'
import * as Subtypes from '../src/subtypes'
import * as Graph from '@buggyorg/graphtools'
import chai from 'chai'
import fs from 'fs'
import _ from 'lodash'

const expect = chai.expect

describe('Subtypes tests', () => {
  it('can derive direct supertypes from subtypes', () => {
    let types = Subtypes.constructTypes([{
      name: 'top',
      subtypes: ['A', 'B']
    }, {
      name: 'A',
      subtypes: []
    }, {
      name: 'B',
      subtypes: []
    }])
    expect(Subtypes.getType(types, 'A')).to.have.deep.property('subtypes')
    expect(Subtypes.getType(types, 'A')).to.have.deep.property('supertypes')
    expect(Subtypes.getType(types, 'A').supertypes).to.deep.equal(['top'])
    expect(Subtypes.getType(types, 'B').supertypes).to.deep.equal(['top'])
  })
  it('can derive transitive sub- and supertypes', () => {

    let types = Subtypes.constructTypes(JSON.parse(fs.readFileSync('./test/fixtures/types-numbers.json')))

    expect(Subtypes.getType(types, 'bottom'))
    .to.have.deep.property('transitive.subtypes')
    .and.to.deep.equal([])

    expect(Subtypes.getType(types, 'bottom'))
    .to.have.deep.property('transitive.supertypes')

    expect(Subtypes.getType(types, 'top'))
    .to.have.deep.property('transitive.supertypes')
    .and.to.deep.equal([])

    expect(Subtypes.getType(types, 'top'))
    .to.have.deep.property('transitive.subtypes')

    expect(_.difference(
      Subtypes.getType(types, 'top').transitive.subtypes,
      Subtypes.getType(types, 'bottom').transitive.supertypes))
      .to.deep.equal(['bottom'])

    expect(_.difference(
      Subtypes.getType(types, 'bottom').transitive.supertypes,
      Subtypes.getType(types, 'top').transitive.subtypes))
      .to.deep.equal(['top'])

  })
  it('can query type relations', () => {
    let types = Subtypes.constructTypes(JSON.parse(fs.readFileSync('./test/fixtures/types-numbers.json')))
    expect(Subtypes.isSubtype(types, 'bottom', 'top')).to.be.true
    expect(Subtypes.isSupertype(types, 'top', 'bottom')).to.be.true
  })
  it('can unify atomics from a given type graph', () => {
    let types = Subtypes.constructTypes(JSON.parse(fs.readFileSync('./test/fixtures/types-numbers.json')))
    let t1 = {
      data: [{name: 'Arguments', data: ['2Z', '3Z']}, {name: 'Returns', data: ['b']}],
      name: 'Function'
    }
    let t2 = {
      data: [{name: 'Arguments', data: ['b', 'b']}, {name: 'Returns', data: ['6Z']}],
      name: 'Function'
    }
    var assignments = API.UnifyTypes(t1, t2, x => x, [])
    expect(assignments).to.deep.equal({
      'b': '6Z'
    })
  })
})