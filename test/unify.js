/* global describe, it */

import * as API from '../src/api'
import * as Unify from '../src/unify'
import * as Rewrites from '../src/rewrites'
import chai from 'chai'

const expect = chai.expect

const id = (x) => x

describe('unification', () => {
  it('can unify atomic types', () => {
    let assign = { }
    expect(Unify.UnifyAndAssignTypes('A', 'A', null, assign)).to.deep.equal('A')
    expect(assign).to.deep.equal({})
  })

  it('can unify atomic type and a parameter type', () => {
    let assign = { }
    expect(Unify.UnifyAndAssignTypes('A', 'a', null, assign)).to.deep.equal('A')
    expect(assign).to.deep.equal({a: 'A'})
  })
  it('can unify record types', () => {
    let t1 = {
      data: ['a', 'Number'],
      name: 'Pair'
    }
    let t2 = {
      data: ['String', 'b'],
      name: 'Pair'
    }
    let assign = { }
    expect(Unify.UnifyAndAssignTypes(t1, t2, null, assign)).to.deep.equal({
      data: ['String', 'Number'],
      name: 'Pair'
    })
    expect(assign).to.deep.equal({
      a: 'String',
      b: 'Number'
    })
  })

  it('can unify complex function types', () => {
    let assign = { }
    let t1 = {
      data: [{name: 'Arguments', data: ['a', 'Number']}, {name: 'Returns', data: ['Number']}],
      name: 'Function'
    }
    let t2 = {
      data: [{name: 'Arguments', data: ['String', 'b']}, {name: 'Returns', data: ['b']}],
      name: 'Function'
    }
    let t3 = Unify.UnifyAndAssignTypes(t1, t2, null, assign)
    expect(assign).to.deep.equal({
      a: 'String',
      b: 'Number'
    })
  })

  it('can unify record types with rest (...) fields', () => {
    let t1 = {
      name: 'Function',
      data: [
        { name: 'Arguments', data: ['Number'] },
        { name: 'Returns', data: ['Number'] }
      ]
    }
    let t2 = {
      name: 'Function',
      data: [
        { name: 'Arguments', data: ['Number', '...rest'] },
        { name: 'Returns', data: ['outType'] }
      ]
    }
    let assign = { }
    let t12 = Unify.UnifyAndAssignTypes(t1, t2, null, assign)
    expect(assign).to.deep.equal({
      rest: [],
      outType: 'Number'
    })
    expect(t12).to.deep.equal(t1)
  })
})

describe('error handling', () => {

  it('Identifies non-unifyable types', () => {
    expect(() => Unify.UnifyTypes('A', 'B')).not.to.throw()
    expect(() => Unify.UnifyTypes('b', 'a')).to.throw()
    expect(() => Unify.UnifyTypes('a', 'b')).to.throw()
    expect(() => Unify.UnifyTypes('A', 'b')).not.to.throw()
  })

  it('Identifies not fully typed complex types', () => {
    const type = {name: 'Function', data: [{name: 'Arguments', data: []}, {name: 'Returns', data: ['generic']}]}
    const type2 = {name: 'Function', data: [{name: 'Arguments', data: []}, {name: 'Returns', data: ['Number']}]}
    expect(API.IsGenericType(type)).to.be.true
    expect(API.IsGenericType(type2)).to.be.false
  })

  it('can detect unification errors in complex function types I', () => {
    let t1 = {
      data: [{name: 'Arguments', data: ['a', 'Apple']}, {name: 'Returns', data: ['Orange']}],
      name: 'Function'
    }
    let t2 = {
      data: [{name: 'Arguments', data: ['String', 'b']}, {name: 'Returns', data: ['b']}],
      name: 'Function'
    }
    expect(() => Unify.UnifyAndAssignTypes(t1, t2)).to.throw(Error)
  })

  it('can detect unification errors in complex function types II', () => {
    let t1 = {
      name: 'Function',
      data: [
        {
          name: 'Arguments',
          data: ['Number']
        }, {
          name: 'Returns',
          data: ['Number']
        }
      ]
    }
    let t2 = {
      data: [
        {
          name: 'Arguments',
          data: ['Number', 'Extra']
        }, {
          name: 'Returns',
          data: ['outType']
        }
      ],
      name: 'Function'
    }
    expect(() => Unify.UnifyAndAssignTypes(t1, t2)).to.throw(Error)
    // let assignment = { }
    // let t12 = Unify.UnifyTypes(t1, t2, [], assignment)
    // expect(t12).to.deep.equal(t1)
    // expect(assignment).to.deep.equal({
    //   'outType': 'Number'
    // })
    // t2.data[0].data = ['Number', 'X', '...']
    // expect(() => Unify.UnifyTypes(t1, t2)).to.throw(Error)
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
    // let assign = { }
    // let t3 = Unify.UnifyTypes(t1, t2, [], assign)
    expect(() => Unify.UnifyAndAssignTypes(t1, t2)).to.throw(Error)
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
    expect(Unify.UnifyTypes(t1, t2)).to.deep.equal('bottom')
  })

  it('Can handle array rests', () => {
    let t1 = {
      data: ['Number', 'String', 'Boolean'],
      name: 'Tupel'
    }
    let t2 = {
      data: ['Number', '...'],
      name: 'Tupel'
    }
    let assignment = { }
    let t12 = Unify.UnifyTypes(t1, t2, [], assignment)
    expect(t12).to.deep.equal(t1)
  })

  it('can extract the name of the generic', () => {
    expect(API.genericName('a.#123')).to.equal('a')
  })
})
describe('.typeNames', () => {
  it('returns an empty array for a non generic type', () => {
    expect(API.typeNames('Number')).to.eql([])
  })
  it('returns an array for a simple type name', () => {
    expect(API.typeNames('a')).to.eql(['a'])
  })
  it('extracts the generic type names in an complex type', () => {
    expect(API.typeNames({name: 'A', data: ['x']})).to.eql(['x'])
    expect(API.typeNames({name: 'A', data: ['x', 'Y']})).to.eql(['x'])
    expect(API.typeNames({name: 'A', data: ['String', 'Y']})).to.eql([])
  })
  it('can extract multiple type names in a complex type', () => {
    expect(API.typeNames({name: 'A', data: ['x', 'y']})).to.eql(['x', 'y'])
    expect(API.typeNames({name: 'A', data: [{name: 'B', data: ['x', 'Number']}, 'y']})).to.eql(['x', 'y'])
  })
})