export interface IConfig {
    filter: string
    dirs: string[]
    cmd: string
    watch: string[]
    cwd?:string
    defaultSuite?: string
}
