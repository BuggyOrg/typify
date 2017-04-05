
import _ from 'lodash'

function IsValidType (t) {
  if (!t) return false
  if (typeof t === 'string') return true
  if (!t.data) return false
  return t.data.every(IsValidType)
}

function isTypeObject (t) {
  return typeof (t) === 'object' && t.data
}

export function IsGenericType (t) {
  if (!IsValidType(t)) return false
  if (isTypeObject(t)) {
    return t.data.some(IsGenericType)
  }
  return isGenericTypeName(t)
}

export function isGenericTypeName (t) {
  return (typeof (t) === 'string') && IsLowerCase((t.name || t).charAt(0))
}

function IsLowerCase (c) {
  return c === c.toLowerCase()
}

export function areUnifyable (t1, t2, assignedType) {
  try {
    UnifyTypes(t1, t2, assignedType)
    return true
  } catch (err) {
    return false
  }
}

/**
 * Finds an assignment to unify the given types. An assignment assigns to every generic type
 * its unified type. E.g. `{ a: 'Number' }` assigns the type `Number` to `a`.
 * @param {Type} t1 The first type
 * @param {Type} t2 Second type
 * @param {Portgraph} graph The base graph
 * @returns {Assignment} The assignment for the given types
 * @throws {Error} If the types are not assignable.
 */
export function UnifyTypes (t1b, t2b, assignedType) {
  var t1 = assignedType(t1b)
  var t2 = assignedType(t2b)
  var assignments = {}
  if (!IsValidType(t1)) throw new Error('invalid type t1: ' + JSON.stringify(t1))
  if (!IsValidType(t2)) throw new Error('invalid type t2: ' + JSON.stringify(t2))
  if ((t1.name || t1) in assignments) t1 = assignments[t1.name || t1]
  if ((t2.name || t2) in assignments) t2 = assignments[t2.name || t2]
  const g1 = isGenericTypeName(t1)
  const g2 = isGenericTypeName(t2)
  if (!g1 && !g2) {
    if (typeof t1 === 'string' && typeof t2 === 'string') {
      // TODO: should this throw an error, if the types are not equal?
      // Or more precisely, we would perhaps need information about the types.
      // e.g. if t1 ⊑ t2 everything is fine (but not if t1 ⋢ t2)
      if (t1 !== t2) throw new Error('Types are not unifyable: "' + t1 + '" and "' + t2 + '"')
      return {}
    }
    // if (t1.name !== t2.name) throw new Error('type unification error: ' + t1.name + ' has a different name than ' + t2.name)
    let f1 = t1.data
    let f2 = t2.data
    if (f1.length !== f2.length) throw new Error('type unification error: number of fields differ')
    for (let i = 0; i < f1.length; ++i) {
      Object.assign(assignments, UnifyTypes(f1[i], f2[i], assignedType))
    }
    return assignments
  } else if (g1 && g2) {
    if (t1 !== t2) throw new Error('Types are not unifyable: "' + JSON.stringify(t1) + '" and "' + JSON.stringify(t2) + '"')
    return assignments
  } else {
    if (g1) assignments[t1.name || t1] = _.cloneDeep(t2)
    if (g2) assignments[t2.name || t2] = _.cloneDeep(t1)
    return assignments
  }
  // if (typeof t1 !== 'string') t1.assignments = assignments.concat(t1.assignment)
  // if (typeof t2 !== 'string') t2.assignments = assignments.concat(t2.assignment)
}