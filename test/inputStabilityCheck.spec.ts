import { shallowEqual } from 'react-redux'
import { createSelector, lruMemoize, setGlobalDevModeChecks } from 'reselect'

describe('inputStabilityCheck', () => {
  const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

  const unstableInput = vi.fn((a: number, b: number) => ({ a, b }))

  const addNums = createSelector([unstableInput], ({ a, b }) => a + b)

  afterEach(() => {
    consoleSpy.mockClear()
    unstableInput.mockClear()
    addNums.clearCache()
  })
  afterAll(() => {
    consoleSpy.mockRestore()
  })

  it('calls each input selector twice, and warns to console if unstable reference is returned', () => {
    const stableAddNums = createSelector(
      [(a: number) => a, (a: number, b: number) => b],
      (a, b) => a + b
    )

    expect(stableAddNums(1, 2)).toBe(3)

    expect(consoleSpy).not.toHaveBeenCalled()

    expect(addNums(1, 2)).toBe(3)

    expect(unstableInput).toHaveBeenCalledTimes(2)

    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining('An input selector returned a different result'),
      expect.objectContaining({
        // IArguments isn't an array :(
        arguments: expect.anything(),
        firstInputs: expect.arrayContaining([
          expect.objectContaining({ a: 1, b: 2 })
        ]),
        secondInputs: expect.arrayContaining([
          expect.objectContaining({ a: 1, b: 2 })
        ]),
        stack: expect.any(String)
      })
    )
  })

  it('disables check if global setting is changed', () => {
    setGlobalDevModeChecks({ inputStabilityCheck: 'never' })

    expect(addNums(1, 2)).toBe(3)

    expect(unstableInput).toHaveBeenCalledOnce()

    expect(consoleSpy).not.toHaveBeenCalled()

    setGlobalDevModeChecks({ inputStabilityCheck: 'once' })
  })

  it('disables check if specified in the selector options', () => {
    const addNums = createSelector([unstableInput], ({ a, b }) => a + b, {
      devModeChecks: { inputStabilityCheck: 'never' }
    })

    expect(addNums(1, 2)).toBe(3)

    expect(unstableInput).toHaveBeenCalledOnce()

    expect(consoleSpy).not.toHaveBeenCalled()
  })

  it('disables check in production', () => {
    const originalEnv = process.env.NODE_ENV

    process.env.NODE_ENV = 'production'

    expect(addNums(1, 2)).toBe(3)

    expect(unstableInput).toHaveBeenCalledTimes(1)

    expect(consoleSpy).not.toHaveBeenCalled()

    process.env.NODE_ENV = originalEnv
  })

  it('allows running the check only once', () => {
    const addNums = createSelector([unstableInput], ({ a, b }) => a + b, {
      devModeChecks: { inputStabilityCheck: 'once' }
    })

    expect(addNums(1, 2)).toBe(3)

    expect(unstableInput).toHaveBeenCalledTimes(2)

    expect(consoleSpy).toHaveBeenCalledOnce()

    expect(addNums(2, 2)).toBe(4)

    expect(unstableInput).toHaveBeenCalledTimes(3)

    expect(consoleSpy).toHaveBeenCalledOnce()
  })

  it('allows always running the check', () => {
    const addNums = createSelector([unstableInput], ({ a, b }) => a + b, {
      devModeChecks: { inputStabilityCheck: 'always' }
    })

    expect(addNums(1, 2)).toBe(3)

    expect(unstableInput).toHaveBeenCalledTimes(2)

    expect(consoleSpy).toHaveBeenCalledOnce()

    expect(addNums(2, 2)).toBe(4)

    expect(unstableInput).toHaveBeenCalledTimes(4)

    expect(consoleSpy).toHaveBeenCalledTimes(2)

    expect(addNums(1, 2)).toBe(3)

    expect(unstableInput).toHaveBeenCalledTimes(4)

    expect(consoleSpy).toHaveBeenCalledTimes(2)
  })

  it('runs once when devModeChecks is an empty object', () => {
    const addNums = createSelector([unstableInput], ({ a, b }) => a + b, {
      devModeChecks: {}
    })

    expect(addNums(1, 2)).toBe(3)

    expect(unstableInput).toHaveBeenCalledTimes(2)

    expect(consoleSpy).toHaveBeenCalledOnce()

    expect(addNums(2, 2)).toBe(4)

    expect(unstableInput).toHaveBeenCalledTimes(3)

    expect(consoleSpy).toHaveBeenCalledOnce()
  })

  it('uses the memoize provided', () => {
    const addNumsShallow = createSelector(
      [unstableInput],
      ({ a, b }) => a + b,
      {
        memoize: lruMemoize,
        memoizeOptions: {
          equalityCheck: shallowEqual
        }
      }
    )

    expect(addNumsShallow(1, 2)).toBe(3)

    expect(unstableInput).toHaveBeenCalledTimes(2)

    expect(consoleSpy).not.toHaveBeenCalled()
  })
})
