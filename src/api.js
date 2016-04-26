
import {utils} from '@buggyorg/graphtools'
import _ from 'lodash'

export function validateTypings (typings) {
  return !!typings && !!typings.number &&
    !!typings.string &&
    !!typings.bool
}

var replaceAll = (str, search, replacement) => {
  return str.split(search).join(replacement)
}

function replaceType (str, typings) {
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
  var editGraph = utils.edit(graph)
  editGraph.nodes = _.map(editGraph.nodes, (n) => {
    return _.merge({}, n, {value: retypeNode(n.value, typings)})
  })
  return utils.finalize(editGraph)
}
