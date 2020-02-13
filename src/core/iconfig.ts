import { ISuiteValue } from "./isuite";

export interface IDirDesc {
    pattern?: string,
    dirs?: string[]
}

export interface PHPUnitConfig {
    cmd?: string
    
    pathMapping?:{
        source:string
        target:string
    }
    suites?:IDirDesc[]
    watch?: IDirDesc[]
    defaultSuite?: ISuiteValue
}