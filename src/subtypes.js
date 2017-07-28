
const _ = require('lodash')

export function getType (types, name) {
    return _.find(types, (t) => t.name === name)
}

export function getTypes (types, names) {
    return _.map(names, name => getType(types, name))
}

export function constructTypes (types) {
    // derive direct supertypes
    for(const t of types) {
        t.supertypes = []
    }
    for(const t of types) {
        for(const st of getTypes(types, t.subtypes))
            st.supertypes.push(t.name)
    }
    // advance sub- and supertypes transitively
    for(const t of types)
        t.transitive = { subtypes: _.clone(t.subtypes), supertypes: _.clone(t.supertypes)}
    do {
        if(newTypes) types = newTypes
        var newTypes = _.cloneDeep(types)
        for(const t of newTypes) {
            for(const st of getTypes(types, t.transitive.subtypes))
                t.transitive.subtypes = _.uniq(_.concat(t.transitive.subtypes, st.transitive.subtypes))
            for(const st of getTypes(types, t.transitive.supertypes))
                t.transitive.supertypes = _.uniq(_.concat(t.transitive.supertypes, st.transitive.supertypes))
        }
    } while(!_.isEqual(types, newTypes)) // until fixpoint is reached

    // add bottom element if it's missing
    let bottom = getType(types, 'bottom')
    if(!bottom) {
        for(const t of types) {
            if(t.transitive.subtypes.length === 0) {
                t.subtypes.push('bottom')
                t.transitive.subtypes.push('bottom')
            }
        }
        types.push({
            name: 'bottom',
            subtypes: [],
            transitive: { subtypes: [] }
        })
    } else if(bottom.transitive.subtypes.length > 0) {
        throw new Error('bottom element has nonempty set of subtypes: ' + JSON.stringify(bottom.transitive.subtypes, null, 2))
    }

    return types
}

export function isSubtype (types, st, t) {
    return getType(types, t).transitive.subtypes.includes(st)
}

export function isSupertype (types, st, t) {
    return getType(types, t).transitive.supertypes.includes(st)
}

export function hasType (types, n) {
    return !!getType(types, n)
}

export function intersectionType (types, t1, t2) {
  let st = _.intersection(getType(types, t1).transitive.subtypes, getType(types, t1).transitive.subtypes)
  if (st.length === 0) {
    throw new Error('no common subtype of ' + JSON.stringify(t1) + ' and ' + JSON.stringify(t2))
  }
  return st[0]
}