/* global describe, it */

import * as API from '../src/api'
import * as Unify from '../src/unify'
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
    .and.to.deep.equal(['bottom'])

    expect(Subtypes.getType(types, 'bottom'))
    .to.have.deep.property('transitive.supertypes')

    expect(Subtypes.getType(types, 'top'))
    .to.have.deep.property('transitive.supertypes')
    .and.to.deep.equal(['top'])

    expect(Subtypes.getType(types, 'top'))
    .to.have.deep.property('transitive.subtypes')

    expect(_.difference(
      Subtypes.getType(types, 'top').transitive.subtypes,
      Subtypes.getType(types, 'bottom').transitive.supertypes))
      .to.deep.equal([])

    expect(_.difference(
      Subtypes.getType(types, 'bottom').transitive.supertypes,
      Subtypes.getType(types, 'top').transitive.subtypes))
      .to.deep.equal([])
  })
  it('can detect missing bottom element and add it', () => {
    let types = Subtypes.constructTypes([])
    expect(Subtypes.hasType(types, 'bottom')).to.be.true
  })
  it('can query type relations', () => {
    let atomics = Subtypes.constructTypes(JSON.parse(fs.readFileSync('./test/fixtures/types-numbers.json')))
    expect(Subtypes.isSubtype(atomics, 'bottom', 'top')).to.be.true
    expect(Subtypes.isSupertype(atomics, 'top', 'bottom')).to.be.true
  })
  it('can unify a complex pair', () => {
    let atomics = Subtypes.constructTypes(JSON.parse(fs.readFileSync('./test/fixtures/types-numbers.json')))
    let assign = { }
    let t1 = {
      data: ['2Z', '3Z'],
      name: 'Pair'
    }
    let t2 = {
      data: ['b', 'b'],
      name: 'Pair'
    }
    let t3 = Unify.UnifyAndAssignTypes(t1, t2, atomics, assign)
    expect(t3).to.have.deep.property('data')
    expect(assign).to.deep.equal({
      'b': '6Z'
    })
  })
})