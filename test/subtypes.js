
import * as API from '../src/api'
import * as Subtypes from '../src/subtypes'

describe('Subtypes tests', () => {
  it('can unify basic types', () => {
      Subtypes.unifyTypes('2Z', '3Z')
  })
})