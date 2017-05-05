
import _ from 'lodash'

function IsValidType (t) {
  if (!t) return false
  if (typeof t === 'string') return true
  if (!t.data) return false
  return (isGenericTypeName(t.data) && !isRest(t.data)) || t.data.every(IsValidType)
}

function isTypeObject (t) {
  return typeof (t) === 'object' && t.data
}

export function IsGenericType (t) {
  if (!IsValidType(t)) return false
  if (isTypeObject(t)) {
    return isGenericTypeName(t.data) || t.data.some(IsGenericType)
  }
  return isGenericTypeName(t)
}

export function isGenericTypeName (t) {
  return (typeof (t) === 'string') && (IsLowerCase((t.name || t).charAt(0)) || isRest(t))
}

function IsLowerCase (c) {
  return c === c.toLowerCase()
}

export function genericName (t) {
  return t.split('.')[0]
}

export function typeNames (t) {
  if (!IsGenericType(t)) return []
  if (isGenericTypeName(t)) return [typeName(t)]
  if (typeof (t.data) === 'string') return [typeName(t.data)]
  else return _.flatten(t.data.map(typeNames))
}

export function areUnifyable (t1, t2, assignedType) {
  try {
    UnifyTypes(t1, t2, assignedType)
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
 * @param {Portgraph} graph The base graph
 * @returns {Assignment} The assignment for the given types
 * @throws {Error} If the types are not assignable.
 */
export function UnifyTypes (t1b, t2b, assign) {
  const t1 = assign(t1b)
  const t2 = assign(t2b)
  if (!IsValidType(t1)) throw new Error('invalid type t1: ' + JSON.stringify(t1))
  if (!IsValidType(t2)) throw new Error('invalid type t2: ' + JSON.stringify(t2))
  const g1 = isGenericTypeName(t1)
  const g2 = isGenericTypeName(t2)
  if (!g1 && !g2) {
    return UnifyNonGenericTypes(t1, t2, assign)
  } else if (g1 && g2) {
    return UnifyGenericTypes(t1, t2)
  } else if (!g1 && g2) {
    if (IsGenericType(t1)) throw new Error('Types are not unifyable: "' + t2 + '" and "' + JSON.stringify(t1) + '"')
    else return SingleAssignment(t2, t1)
  } else if (g1 && !g2) {
    if (IsGenericType(t2)) throw new Error('Types are not unifyable: "' + t1 + '" and "' + JSON.stringify(t2) + '"')
    else return SingleAssignment(t1, t2)
  }
}

function SwapKeysAndValues (x) {
  var y = { }
  for (const k in _.keys(x)) {
    y[x[k]] = k
  }
  return y
}

function SingleAssignment (k, v) {
  var map = { }
  map[k] = v
  return map
}

function UnifyGenericTypes (t1, t2) {
  if (_.isEqual(t1, t2)) return { }
  else throw new Error('Types are not unifyable: "' + JSON.stringify(t1) + '" and "' + JSON.stringify(t2) + '"')
}

function UnifyNonGenericTypes (t1, t2, assign) {
  const s1 = typeof t1 === 'string'
  const s2 = typeof t2 === 'string'
  if (s1 && !s2) {
    throw new Error('Types are not unifyable: cannot unify ' + t1 + ' and ' + JSON.stringify(t2))
  } else if (!s1 && s2) {
    throw new Error('Types are not unifyable: cannot unify ' + JSON.stringify(t1) + ' and ' + t2)
  } else if (s1 && s2) {
    if (t1 === t2) return { }
    else throw new Error('Types are not unifyable: cannot unify ' + t1 + ' and ' + t2)
  } else if (!s1 && !s2) {
    return UnifyNonGenericComplexTypes(t1, t2, assign)
  }
}

function UnifyNonGenericComplexTypes (t1, t2, assign) {
  if (t1.name !== t2.name) {
    throw new Error('Type names do not match for "' + t1.name + '" and "' + t2.name + '"')
  }
  var assignments = { }
  let f1 = t1.data
  let f2 = t2.data
  let ff1 = (typeof (f1) === 'string') ? [] : _.takeWhile(f1, (d) => !isRest(d))
  let ff2 = (typeof (f2) === 'string') ? [] : _.takeWhile(f2, (d) => !isRest(d))
  /*
  let ff1 = _.takeWhile(f1, (d) => !isRest(d))
  let ff2 = _.takeWhile(f2, (d) => !isRest(d))
  */
  if (f1.length === ff1.length && f2.length === ff2.length && ff1.length !== ff2.length) {
    throw new Error('type unification error: number of fields differ')
  }
  const minLen = Math.min(ff1.length, ff2.length)
  for (let i = 0; i < minLen; ++i) {
    try {
      Object.assign(assignments, UnifyTypes(f1[i], f2[i], assign))
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
}

export function UnifyTypesBACKUP (t1b, t2b, assignedType) {
  var t1 = assignedType(t1b)
  var t2 = assignedType(t2b)
  var assignments = {}
  if (!IsValidType(t1)) throw new Error('invalid type t1: ' + JSON.stringify(t1))
  if (!IsValidType(t2)) throw new Error('invalid type t2: ' + JSON.stringify(t2))
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
    if (t1.name !== t2.name) {
      throw new Error('Type names do not match for "' + t1.name + '" and "' + t2.name + '"')
    }
    let f1 = t1.data
    let f2 = t2.data
    let ff1 = _.takeWhile(f1, (d) => !isRest(d))
    let ff2 = _.takeWhile(f2, (d) => !isRest(d))
    if (f1.length === ff1.length && f2.length === ff2.length && ff1.length !== ff2.length) {
      throw new Error('type unification error: number of fields differ')
    }
    const minLen = Math.min(ff1.length, ff2.length)
    for (let i = 0; i < minLen; ++i) {
      try {
        Object.assign(assignments, UnifyTypes(f1[i], f2[i], assignedType))
      } catch (err) {
        throw new Error(t1.name + '[' + i + ']>' + err.message)
      }
    }
    if (ff1.length < f1.length) {
      if (!isRest(f1[ff1.length])) throw new Error('Expected rest param but found: ' + f1[ff1.length])
      assignments[restName(f1[ff1.length])] = _.drop(f2, ff1.length)
    }
    if (ff2.length < f2.length) {
      if (!isRest(f2[ff2.length])) throw new Error('Expected rest param but found: ' + f1[ff2.length])
      assignments[restName(f2[ff2.length])] = _.drop(f1, ff2.length)
    }
  } else if (g1 && g2) {
    if (!_.isEqual(t1, t2)) {
      throw new Error('Types are not unifyable: "' + JSON.stringify(t1) + '" and "' + JSON.stringify(t2) + '"')
    }
  } else {
    if (g1) {
      if (IsGenericType(t2)) throw new Error('Cannot unify generic type with complex generic type: ' + JSON.stringify(t2))
      assignments[t1.name || t1] = _.cloneDeep(t2)
    }
    if (g2) {
      if (IsGenericType(t1)) throw new Error('Cannot unify generic type with complex generic type: ' + JSON.stringify(t1))
      assignments[t2.name || t2] = _.cloneDeep(t1)
    }
  }
  return assignments
}
