/* global describe, it */

import * as API from '../src/api'
import chai from 'chai'

const expect = chai.expect

describe('Unification', () => {
  it('Can unify normal types via strings', () => {
    expect(API.areUnifyable('A', 'A', {})).to.be.true
    expect(API.areUnifyable('other', 'other', {})).to.be.true
  })

  it('Can unify a type with a generic', () => {
    expect(API.areUnifyable('A', 'a', {})).to.be.true
    expect(API.areUnifyable('b', 'B', {})).to.be.true
  })

  it('Identifies non-unifyable types', () => {
    expect(API.areUnifyable('A', 'B', {})).to.be.false
    expect(API.areUnifyable('b', 'a', {})).to.be.false
  })

  it('Identifies not fully typed complex types', () => {
    const type = {name: 'Function', data: [{name: 'arguments', data: []}, {name: 'returnValues', data: ['generic']}]}
    const type2 = {name: 'Function', data: [{name: 'arguments', data: []}, {name: 'returnValues', data: ['Number']}]}
    expect(API.IsGenericType(type)).to.be.true
    expect(API.IsGenericType(type2)).to.be.false
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
    var assignments = API.UnifyTypes(t1, t2, {})
    expect(assignments).to.deep.equal({
      'a': 'String',
      'b': 'Number'
    })
  })

  it('can unify complex function types', () => {
    let t1 = {
      data: [{name: 'Arguments', data: ['a', 'Number']}, {name: 'Returns', data: ['Number']}],
      name: 'Function'
    }
    let t2 = {
      data: [{name: 'Arguments', data: ['String', 'b']}, {name: 'Returns', data: ['b']}],
      name: 'Function'
    }
    var assignments = API.UnifyTypes(t1, t2, {})
    expect(assignments).to.deep.equal({
      'a': 'String',
      'b': 'Number'
    })
  })

  it('Throws an error if the types are not unifyable', () => {
    let t1 = {
      data: [{name: 'Arguments', data: ['a', 'Number']}, {name: 'Returns', data: ['Number']}],
      name: 'Function'
    }
    let t2 = {
      data: [{name: 'Arguments', data: ['String', 'String']}, {name: 'Returns', data: ['b']}],
      name: 'Function'
    }
    expect(() => API.UnifyTypes(t1, t2, {})).to.throw(Error, /Number/)
    expect(() => API.UnifyTypes(t1, t2, {})).to.throw(Error, /String/)
    expect(() => API.UnifyTypes(t1, t2, {})).to.throw(Error, /Arguments/)
  })
})
