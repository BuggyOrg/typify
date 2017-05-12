
import _ from 'lodash'

const Types = [{
    name: 'top',
    subtypes: ['poset', 'group']
},{
    name: 'poset',
    subtypes: ['toset']
},{
    name: 'toset',
    subtypes: ['2Z', '2Z+1', '3Z', '6Z']
},{
    name: 'group',
    subtypes: ['2Z', '3Z', '6Z', 'F3']
},{
    name: '2Z',
    subtypes: ['6Z']
},{
    name: '2Z+1',
    subtypes: []
},{
    name: '3Z',
    subtypes: ['6Z']
},{
    name: '6Z',
    subtypes: []
},{
    name: 'F3',
    subtypes: []
}]

export function unifyTypes (t1, t2) {
    const s1 = typeof (t1) === 'string'
    const s2 = typeof (t2) === 'string'
    if (s1 != s2) throw new Error('cannot unify type strings and type objects')
    if (s1 && s2) {
        if (t1 === t2) return { }
    }
    if (t1.length !== t2.length) throw new Error('differing number of fields')
}

function findType (name) {
    return _.find(Types, (t) => t.name === name)
}