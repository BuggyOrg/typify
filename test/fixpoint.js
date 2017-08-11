/* global describe, it */

import * as API from '../src/api'
import * as Unify from '../src/unify'
import * as Fixpoint from '../src/fixpoint'
import * as Rewrites from '../src/rewrites'
import chai from 'chai'

const ListType = {
  name: 'List',
  data: [{
    name: 'Or',
    data: [{
      name: 'Nil',
      data: []
    }, {
      name: 'Cons',
      data: ['a', 'List']
    }]
  }]
}

const NatType = {
  name: 'Nat',
  data: [{
    name: 'Or',
    data: [ 'Zero', {
      name: 'Succ',
      data: ['Nat']
    }]
  }]
}

describe('fixpoint types', () => {
    it('can detect fixpoint types', () => {
      chai.expect(Fixpoint.isFixpointType(ListType)).to.be.true
    }),
    it('can unfold and fold List type', () => {

      let unfolded = Fixpoint.unfoldType(ListType)
      chai.expect(unfolded)
        .to.have.deep.property('data[0].data[1].data[1]')
        .and.to.deep.equal(ListType)

      let folded = Fixpoint.foldType(unfolded)
      chai.expect(folded)
        .to.deep.equal(ListType)

    }),
    it.only('can unfold and fold Nat type', () => {

      var unfolded = Fixpoint.unfoldType(NatType)
      unfolded = Fixpoint.unfoldType(unfolded)
      console.log(JSON.stringify(unfolded, null, 2))
      /*
      chai.expect(unfolded)
        .to.have.deep.property('data[0].data[1].data[1]')
        .and.to.deep.equal(ListType)
      */

      let folded = Fixpoint.foldType(unfolded)
      chai.expect(folded).to.deep.equal(NatType)

    })
})