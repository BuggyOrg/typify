
import {graph as graphAPI} from '@buggyorg/graphtools'
import _ from 'lodash'

export function validateTypings (typings) {
  return !!typings && !!typings.number &&
    !!typings.string &&
    !!typings.bool
}

var replaceAll = (str, search, replacement) => {
  return str.split(search).join(replacement)
}

const isFunction = (type) => {
  return typeof (type) === 'object' && type.type === 'function'
}

/*
{
  "type": "function",
  "arguments": {
    "n": "number"
  },
  "argumentOrdering": [
    "n",
    "value",
    "acc"
  ],
  "outputs": {
    "value": "bool"
  },
  "return": "bool"
}
*/
const mapFunctionTypes = (fn, mapping) => {
  fn.arguments = _.mapValues(fn.arguments, mapping)
  fn.outputs = _.mapValues(fn.outputs.mapValues, mapping)
  fn.return = mapping(fn.return)
  return fn
}

const replaceFunctionTypes = (type, typings) => {
  return mapFunctionTypes(type, _.partial(replaceType, _, typings))
}

function replaceType (str, typings) {
  if (isFunction(str)) {
    return replaceFunctionTypes(str, typings)
  }
  return replaceAll(
    replaceAll(
      replaceAll(str, 'number', typings.number),
      'bool', typings.bool),
    'string', typings.string)
}

function retypePorts (ports, typings) {
  return _.mapValues(ports, _.partial(replaceType, _, typings))
}

function retypeNode (node, typings) {
  return _.merge({}, node, {
    inputPorts: retypePorts(node.inputPorts, typings),
    outputPorts: retypePorts(node.outputPorts, typings),
    typeHint: retypePorts(node.typeHint, typings)
  })
}

export function applyTypings (graph, typings) {
  if (!validateTypings(typings)) throw new Error('Cannot apply invalid typings')
  var editGraph = graphAPI.toJSON(graph)
  editGraph.nodes = _.map(editGraph.nodes, (n) => {
    return _.merge({}, n, {value: retypeNode(n.value, typings)})
  })
  return graphAPI.importJSON(editGraph)
}
