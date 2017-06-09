
import _ from 'lodash'
import * as Subtypes from './subtypes'

const API = require('./api.js')

function IsValidType (t) {
  if (!t) return false
  if (typeof t === 'string') return true
  if (!t.data) return false
  return (isTypeParameter(t.data) && !isRest(t.data)) || t.data.every(IsValidType)
}

function isTypeObject (t) {
  return typeof (t) === 'object' && t.data
}

export function IsGenericType (t) {
  if (!IsValidType(t)) return false
  if (isTypeObject(t)) {
    return isTypeParameter(t.data) || t.data.some(IsGenericType)
  }
  return isTypeParameter(t)
}

export function isTypeParameter (t) {
  return (typeof (t) === 'string') && (IsLowerCase((t.name || t).charAt(0)) || isRest(t))
}

function IsLowerCase (c) {
  return c >= 'a' && c <= 'z'
}

export function genericName (t) {
  return t.split('.')[0]
}

export function typeNames (t) {
  if (!IsGenericType(t)) return []
  if (isTypeParameter(t)) return [typeName(t)]
  if (typeof (t.data) === 'string') return [typeName(t.data)]
  else return _.flatten(t.data.map(typeNames))
}

export function areUnifyable (t1, t2, atomics, assign) {
  try {
    UnifyTypes(t1, t2, atomics, assign)
    return true
  } catch (err) {
    return false
  }
}

function isRest (type) {
  return typeof (type) === 'string' && type.slice(0, 3) === '...'
}

function restName (type) {
  return type.slice(3)
}

export function typeName (type) {
  if (isRest(type)) return restName(type)
  else return type
}

/**
 * Finds an assignment to unify the given types. An assignment assigns to every generic type
 * its unified type. E.g. `{ a: 'Number' }` assigns the type `Number` to `a`.
 * @param {Type} t1 The first type
 * @param {Type} t2 Second type
 * @param {Typegraph} atomics optional graph of subtypes
 * @returns {Assignment} The assignment for the given types
 * @throws {Error} If the types are not assignable.
 */
export function UnifyAndAssignTypes (t1, t2, atomics = []) {
  let assign = { }
  let t = UnifyTypes(t1, t2, atomics, assign)
  for (const k in assign) {
    t = API.replaceTypeParameter(t, k, assign[k])
  }
  return t
}

export function UnifyTypes (t1, t2, atomics = [], assign = {}) {
  if (!IsValidType(t1)) throw new Error('invalid type t1: ' + JSON.stringify(t1))
  if (!IsValidType(t2)) throw new Error('invalid type t2: ' + JSON.stringify(t2))
  let p1 = isTypeParameter(t1)
  let p2 = isTypeParameter(t2)
  if (p1 && p2) {
    return unifyParameterTypes(t1, t2)
  } else if (!p1 && p2) {
    if (t2 in assign) t1 = UnifyTypes(t1, assign[t2], atomics, assign)
    return (assign[t2] = t1)
  } else if (p1 && !p2) {
    if (t1 in assign) t2 = UnifyTypes(assign[t1], t2, atomics, assign)
    return (assign[t1] = t2)
  } else {
    let s1 = typeof t1 === 'string'
    let s2 = typeof t2 === 'string'
    if (s1 && !s2) throw new Error('nongeneric types are not unifyable: cannot unify ' + t1 + ' and ' + JSON.stringify(t2))
    else if (!s1 && s2) throw new Error('nongeneric types are not unifyable: cannot unify ' + JSON.stringify(t1) + ' and ' + t2)
    else if (s1 && s2) return unifyAtomicTypes(t1, t2, atomics)
    else if (!s1 && !s2) return unifyRecordType(t1, t2, atomics, assign)
  }
}

function unifyParameterTypes (t1, t2) {
  if (t1 === t2) return t2
  else throw new Error('Types are not unifyable: ' + JSON.stringify(t1) + ' and ' + JSON.stringify(t2))
}

function unifyAtomicTypes (t1, t2, atomics) {
  if (t1 === t2) {
    return t1
  }
  let a1 = Subtypes.hasType(atomics, t1)
  let a2 = Subtypes.hasType(atomics, t2)
  if (a1 !== a2) {
    throw new Error('cannot unify ' + JSON.stringify(t1) + ' and ' + JSON.stringify(t2))
  }
  if (!a1 && !a2) {
    if (t1 !== t2) {
      throw new Error('cannot unify ' + JSON.stringify(t1) + ' and ' + JSON.stringify(t2))
    } else {
      return t1
    }
  }
  return Subtypes.intersectionType(atomics, t1, t2)
}

function isRest (field) {
  return field === '...'
}

function unifyRecordType (t1, t2, atomics, assign) {
  if (t1.name !== t2.name) {
    throw new Error('Type names do not match for "' + t1.name + '" and "' + t2.name + '"')
  }
  if (t1.data.length !== t2.data.length) {
    let r1 = isRest(t1.data[t1.data.length - 1])
    let r2 = isRest(t2.data[t2.data.length - 1])
    if (r1 && r2) {
      let minLength = Math.min(t1.data.length, t2.data.length)
      return unifyRecordType({
        name: t1.name,
        data: t1.data.slice(0, minLength)
      }, {
        name: t2.name,
        data: t2.data.slice(0, minLength)
      }, atomics, assign)
    } else if (r1 && !r2) {
      if (t2.data.length < t1.data.length - 1) {
        throw new Error('cannot unify ' + JSON.stringify(t1) + ' and ' + JSON.stringify(t2))
      }
      return unifyRecordType({
        name: t1.name,
        data: t1.data.slice(0, t1.data.length - 1).concat(t2.data.slice(t1.data.length - 1, t2.data.length))
      }, t2, atomics, assign)
    } else if (!r1 && r2) {
      if (t1.data.length < t2.data.length - 1) {
        throw new Error('cannot unify ' + JSON.stringify(t1) + ' and ' + JSON.stringify(t2))
      }
      return unifyRecordType(t1, {
        name: t2.name,
        data: t2.data.slice(0, t2.data.length - 1).concat(t1.data.slice(t2.data.length - 1, t1.data.length))
      }, atomics, assign)
    } else {
      throw new Error('number of fields differ for ' + JSON.stringify(t1) + ' and ' + JSON.stringify(t2))
    }
  }
  t1.data.sort(f => f.name || f)
  t2.data.sort(f => f.name || f)
  return {
    name: t1.name,
    data: _.zipWith(t1.data, t2.data, (l, r) => UnifyTypes(l, r, atomics, assign))
  }
  /*
  var assignments = { }
  let f1 = t1.data
  let f2 = t2.data
  let ff1 = (typeof (f1) === 'string') ? [] : _.takeWhile(f1, (d) => !isRest(d))
  let ff2 = (typeof (f2) === 'string') ? [] : _.takeWhile(f2, (d) => !isRest(d))
  if (f1.length === ff1.length && f2.length === ff2.length && ff1.length !== ff2.length) {
    throw new Error('type unification error: number of fields differ')
  }
  const minLen = Math.min(ff1.length, ff2.length)
  for (let i = 0; i < minLen; ++i) {
    try {
      const childAssignments = UnifyTypes(types, f1[i], f2[i])
      for(const k of _.intersection(_.keys(childAssignments), _.keys(assignments))) {
        // UnifyTypes(childAssignments[k], assignments[k], assign, atomics)
      }
      Object.assign(assignments, childAssignments)
    } catch (err) {
      throw new Error(t1.name + '[' + i + ']>' + err.message)
    }
  }
  if (typeof (f1) === 'string') {
    assignments[f1] = f2
  } else if (ff1.length < f1.length) {
    if (!isRest(f1[ff1.length])) throw new Error('Expected rest param but found: ' + f1[ff1.length])
    assignments[restName(f1[ff1.length])] = _.drop(f2, ff1.length)
  }
  if (typeof (f2) === 'string') {
    assignments[f2] = f1
  } else if (ff2.length < f2.length) {
    if (!isRest(f2[ff2.length])) throw new Error('Expected rest param but found: ' + f1[ff2.length])
    assignments[restName(f2[ff2.length])] = _.drop(f1, ff2.length)
  }
  return assignments
  */
}
