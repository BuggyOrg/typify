/* global describe, it */

import * as Graph from '@buggyorg/graphtools'
import * as API from '../src/api'
import * as Unify from '../src/unify'
import * as Fixpoint from '../src/fixpoint'
import * as Rewrites from '../src/rewrites'
import * as Subtypes from '../src/subtypes'
import chai from 'chai'
import _ from 'lodash'

function ListFunctor (item, tail) {
  return {
    name: 'ListF',
    data: [{
      name: 'Or',
      data: [ 'Nil', {
        name: 'Cons',
        data: [item, tail]
      }]
    }]
  }
}

function ListType (item) {
  return {
    name: 'List',
    data: [{
      name: 'Or',
      data: [ 'Nil', {
        name: 'Cons',
        data: [item, 'List']
      }]
    }]
  }
}

function NatFunctor (tail) {
  return {
    name: 'Nat',
    data: [{
      name: 'Or',
      data: [ 'Zero', {
        name: 'Succ',
        data: [tail]
      }]
    }]
  }
}

const NatType = NatFunctor('Nat')

function ListFold (a, b) {
  return Graph.flow(
    Graph.addNode({
      name: 'Cata',
      atomic: true,
      componentId: 'functional/catamorphism',
      ports: [
        { port: 'in', kind: 'input', type: ListType(a) },
        { port: 'f', kind: 'input', type: {
          name: 'Function', data: [
            { name: 'Arguments', data: [ ListType(a), b] },
            { name: 'Returns', data: [b] }
          ]}
        },
        { port: 'out', kind: 'output' }
      ]
    }))(Graph.empty())
}
    
const NatToNum = Graph.flow(
    Graph.addNode({
    name: 'NatToNum',
    atomic: true,
    componentId: 'functional/catamorphism',
    ports: [
      { port: 'in', kind: 'input', type: NatType },
      { port: 'f', kind: 'input', type: {
        name: 'Function', data: [
          { name: 'Arguments', data: [ NatType, 'Number' ] },
          { name: 'Returns', data: ['Number'] }
        ]}
      },
      { port: 'out', kind: 'output' }
      ]
    }))(Graph.empty())

describe('fixpoint types', () => {
    it('can detect fixpoint types', () => {
      let listType = ListType('a')
      chai.expect(Fixpoint.isFixpointType(listType)).to.be.true
    }),
    it('can unfold and fold Nat type', () => {

      var unfolded = Fixpoint.unfoldType(NatType)
      unfolded = Fixpoint.unfoldType(unfolded)

      let folded = Fixpoint.foldType(unfolded)
      chai.expect(folded).to.deep.equal(NatType)

    }),
    it('can unfold and fold List type', () => {

      let listType = ListType('a')
      let unfolded = Fixpoint.unfoldType(listType)
      chai.expect(unfolded)
        .to.have.deep.property('data[0].data[1].data[1]')
        .and.to.deep.equal(listType)

      let folded = Fixpoint.foldType(unfolded)
      chai.expect(folded)
        .to.deep.equal(listType)

    }),
    it('can typify NatToNum catamorphism', () => {

      let graph = API.TypifyAll(NatToNum)
      chai.expect(API.isFullyTyped(graph)).to.be.true

      console.log(JSON.stringify(graph, null, 2))

    }),
    it.only('can typify List catamorphism', () => {

      let graph = API.TypifyAll(ListFold('Number', 'String'))
      chai.expect(API.isFullyTyped(graph)).to.be.true

      console.log(JSON.stringify(graph, null, 2))

    })
})