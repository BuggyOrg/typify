
const _ = require('lodash')

export function getType (types, name) {
    return _.find(types, (t) => t.name === name)
}

export function getTypes (types, names) {
    return _.map(names, name => getType(types, name))
}

export function constructTypes (types) {
    // derive direct supertypes
    for(const t of types)
        t.supertypes = []
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
    return types
}

export function isSubtype (types, n1, n2) {
    let t2 = getType(types, n2)
    if(!t2) return false
    if(!t2.transitive) throw new Error('invalid type graph')
    if(!t2.transitive.subtypes) throw new Error('invalid type graph')
    return t2.transitive.subtypes.includes(n1)
}

export function isSupertype (types, n1, n2) {
    let t2 = getType(types, n2)
    if(!t2) return false
    if(!t2.transitive) throw new Error('invalid type graph')
    if(!t2.transitive.supertypes) throw new Error('invalid type graph')
    return t2.transitive.supertypes.includes(n1)
}