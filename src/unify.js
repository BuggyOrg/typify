
import _ from 'lodash'
import * as Subtypes from './subtypes'
import * as Rewrites from './rewrites'

const API = require('./api.js')

const DefaultTypes = Subtypes.constructTypes([
  {
    name: 'top',
    subtypes: ['bottom']
  },
  {
    name: 'bottom',
    subtypes: []
  }
])

/**
 * Finds an assignment to unify the given types. An assignment assigns to every generic type
 * its unified type. E.g. `{ a: 'Number' }` assigns the type `Number` to `a`.
 * @param {Type} t1 The first type
 * @param {Type} t2 Second type
 * @param {Typegraph} atomics optional graph of subtypes
 * @returns {Assignment} The assignment for the given types
 * @throws {Error} If the types are not assignable.
 */
export function UnifyAndAssignTypes (t1, t2, atomics, assign = { }) {
  let t = UnifyTypes(t1, t2, atomics, assign)
  for (const k in assign) {
    t = API.replaceTypeParameter(t, k, assign[k])
  }
  if (Rewrites.hasBottom(t))
    throw new Error()
  return t
}

export function UnifyTypes (t1, t2, atomics = DefaultTypes, assign = { }) {
  if (!API.IsValidType(t1)) {
    return 'bottom'
  }
  if (!API.IsValidType(t2)) {
    return 'bottom'
  }
  let p1 = API.isTypeParameter(t1)
  let p2 = API.isTypeParameter(t2)
  if (p1 && p2) {
    return unifyParameterTypes(t1, t2, atomics, assign)
  } else if (!p1 && p2) {
    if (t2 in assign) t1 = UnifyTypes(t1, assign[t2], atomics, assign)
    assign[t2] = t1
    return t2
  } else if (p1 && !p2) {
    if (t1 in assign) t2 = UnifyTypes(assign[t1], t2, atomics, assign)
    assign[t1] = t2
    return t1
  } else {
    let s1 = typeof t1 === 'string'
    let s2 = typeof t2 === 'string'
    if (s1 && !s2) {
      return 'bottom'
    } else if (!s1 && s2) {
      return 'bottom'
    } else if (s1 && s2) {
      return unifyAtomicTypes(t1, t2, atomics)
    } else if (!s1 && !s2) {
      return unifyRecordType(t1, t2, atomics, assign)
    }
  }
}

function unifyParameterTypes (t1, t2, atomics, assign) {
  if (t1 !== t2) throw new Error('cannot unify parameter types')
  else return t1
  // if (t1 !== t2) assign[t1] = t2
  // return t2
  // else return 'bottom'
}

function unifyAtomicTypes (t1, t2, atomics) {
  if (t1 === t2) {
    return t1
  }
  let a1 = Subtypes.hasType(atomics, t1)
  let a2 = Subtypes.hasType(atomics, t2)
  if (a1 !== a2) {
    return 'bottom'
  }
  if (!a1 && !a2) {
    if (t1 !== t2) {
      return 'bottom'
    } else {
      return t1
    }
  }
  return Subtypes.intersectionType(atomics, t1, t2)
}

function isRest (field) {
  return typeof field === 'string' && field.startsWith('...')
}

function unifyRecordType (t1, t2, atomics, assign) {
  if (t1.name !== t2.name) {
    return 'bottom'
  } else if (isRest(t1.data)) {
  } else if (t1.data.length !== t2.data.length) {
    let r1 = isRest(t1.data) || isRest(_.last(t1.data))
    let r2 = isRest(t2.data) || isRest(_.last(t2.data))
    if (r1 && r2) {
      return 'bottom'
    } else if (r1 && !r2) {
      return unifyRecordType(t2, t1, atomics, assign)
    } else if (!r1 && r2) {
      if (t1.data.length < t2.data.length - 1) {
        return 'bottom'
      }
      let restName = _.last(t2.data).substring(3)
      let restData = t1.data.slice(t2.data.length - 1, t1.data.length)
      assign[restName] = _.cloneDeep(restData)
      t2 = {
        name: t2.name,
        data: t2.data.slice(0, t2.data.length - 1).concat(_.cloneDeep(restData))
      }
      return unifyRecordType(t1, t2, atomics, assign)
    } else {
      return 'bottom'
    }
  }
  t1.data.sort(f => f.name || f)
  t2.data.sort(f => f.name || f)
  return {
    name: t1.name,
    data: _.zipWith(t1.data, t2.data, (l, r) => UnifyTypes(l, r, atomics, assign))
  }
}
