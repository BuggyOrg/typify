
import _ from 'lodash'
import debug from 'debug'

const API = require('./api.js')

export function Log (line) {
  debug('typify')(line)
  console.log(line)
}

export function IsGenericPort (port) {
  return API.IsGenericType(port.type)
}
