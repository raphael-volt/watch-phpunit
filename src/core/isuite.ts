
export interface ISuite {
    names?: string[]
    path?: string
    autoload?: string
}

export interface ISuiteValue {
    suite: ISuite,
    name?: string
}