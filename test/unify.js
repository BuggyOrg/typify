/* global describe, it */

import * as API from '../src/unify'
import chai from 'chai'

const expect = chai.expect

const id = (x) => x

describe('Unification', () => {
  it('Can unify normal types via strings', () => {
    expect(API.areUnifyable('A', 'A', id)).to.be.true
    expect(API.areUnifyable('other', 'other', id)).to.be.true
  })

  it('Can unify a type with a generic', () => {
    expect(API.areUnifyable('A', 'a', id)).to.be.true
    expect(API.areUnifyable('b', 'B', id)).to.be.true
  })

  it('Identifies non-unifyable types', () => {
    expect(API.areUnifyable('A', 'B', id)).to.be.false
    expect(API.areUnifyable('b', 'a', id)).to.be.false
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
    var assignments = API.UnifyTypes(t1, t2, id)
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
    var assignments = API.UnifyTypes(t1, t2, id)
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
    expect(() => API.UnifyTypes(t1, t2, id)).to.throw(Error, /Number/)
    expect(() => API.UnifyTypes(t1, t2, id)).to.throw(Error, /String/)
    expect(() => API.UnifyTypes(t1, t2, id)).to.throw(Error, /Arguments/)
    expect(() => API.UnifyTypes(t1, t2, id)).to.throw(Error, /Function/)
  })

  it('Complains if the type name differs', () => {
    let t1 = {
      data: ['Number', 'Number'],
      name: 'Type1'
    }
    let t2 = {
      data: ['Number', 'Number'],
      name: 'Type2'
    }
    expect(() => API.UnifyTypes(t1, t2, id)).to.throw(Error, /Type1/)
    expect(() => API.UnifyTypes(t1, t2, id)).to.throw(Error, /Type2/)
  })

  it('Can handle array rests', () => {
    let t1 = {
      data: ['Number', 'String', 'Boolean'],
      name: 'Tupel'
    }
    let t2 = {
      data: ['Number', '...rest'],
      name: 'Tupel'
    }

    const ass = API.UnifyTypes(t1, t2, id)
    expect(ass['rest']).to.eql(['String', 'Boolean'])
  })
})
