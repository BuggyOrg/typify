
const _ = require('lodash')
const API = require('./api.js')

export function isFixpointType (type, root = null) {
    if (!API.isValidType(type)) {
        return false
    } else if (typeof type === 'string') {
        return type === root
    } else {
        return _.some(type.data, t => isFixpointType(t, root || type.name))
    }
}

export function unfoldType (type) {
    if (!isFixpointType(type)) {
        return type
    }
    return unfoldLFP(_.cloneDeep(type), _.cloneDeep(type))
}

export function unfoldLFP (type, root) {
    if(typeof type === 'string')
        return type === root.name
            ? _.cloneDeep(root)
            : type
    else
        return Object.assign(_.cloneDeep(type), {
            data: _.map(type.data, t => unfoldLFP(t, root))
        })
}

export function foldType (type) {
    if (!isFixpointType(type)) {
        return type
    }
    type.data = _.map(type.data, t => foldLFP(t, _.cloneDeep(type)))
    return type
}

export function foldLFP (type, from) {
    if (typeof type === 'string') {
        return type
    } else if (type.name === from.name) {
        return type.name
    }
    type.data = _.map(type.data, t => foldLFP(t, from))
    return type
}