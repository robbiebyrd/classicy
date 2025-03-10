import { createContext } from 'react'

export const defaultAppContext = { elements: {}, windows: {} }
const ClassicyAppContext = createContext({
    appContext: defaultAppContext,
    setAppContext: (ctx) => {},
})

export default ClassicyAppContext
