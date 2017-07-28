
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

    for(const t of types) {
        t.transitive = {
            subtypes: [t.name].concat(t.subtypes),
            supertypes: [t.name].concat(t.supertypes)
        }
    }

    // advance sub- and supertypes transitively
    do {
        if(newTypes) types = newTypes
        var newTypes = _.cloneDeep(types)
        for(const t of newTypes) {
            if(!t.transitive) {
                
            }
            for(const st of getTypes(types, t.transitive.subtypes))
                t.transitive.subtypes = _.uniq(_.concat(t.transitive.subtypes, st.transitive.subtypes))
            for(const st of getTypes(types, t.transitive.supertypes))
                t.transitive.supertypes = _.uniq(_.concat(t.transitive.supertypes, st.transitive.supertypes))
        }
    } while(!_.isEqual(types, newTypes)) // until fixpoint is reached

    // add bottom element if it's missing
    var bottom = getType(types, 'bottom')
    if(!bottom) {
        bottom = {
            name: 'bottom',
            subtypes: [], supertypes: [],
            transitive: { subtypes: [], supertypes: [] }
        }
        for(const t of types) {
            if(t.subtypes.length === 0) {
                t.subtypes.push('bottom')
                bottom.supertypes.push(t.name)
            }
            bottom.transitive.supertypes.push(t.name)
            t.transitive.subtypes.push('bottom')
        }
        types.push(bottom)
    } else if(!_.isEqual(bottom.transitive.subtypes, ['bottom'])) {
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
    const s1 = typeof t1 === 'string'
    const s2 = typeof t2 === 'string'
    if (!s1 && !s2) {
        if (s1.name !== s2.name) return 'bottom'
        return {
            name: s1.name,
            data: _.zipWith(s1.data, s2.data, (a, b) => intersectionType(types, a, b))
        }
    } else if (s1 && s2) {
        if (t1 === t2) return t1
        t1 = getType(types, t1)
        t2 = getType(types, t2)
        if(!t1 || !t2) return 'bottom'
        let st = _.intersection(t1.transitive.subtypes, t2.transitive.subtypes)
        if (st.length === 0) {
            throw new Error('no common subtype of ' + JSON.stringify(t1) + ' and ' + JSON.stringify(t2))
        }
        return st[0]
    } else return 'bottom'
}