import * as fs from "fs";
import * as glob from "glob";
import { Observable, Observer } from "rxjs";
import { parseString } from "xml2js";
import { PHPUnitConfig } from "./iconfig";
import { ISuite, ISuiteValue } from "./isuite";
import { join } from "path";
import { PathResolver } from "./path-resolver";

export class SuiteLoader {

    static readonly CONFIG_FILENAME = "watch-phpunit.config.json"
    config: PHPUnitConfig
    private finder: SuiteFinder
    suites: ISuite[]
    get defaultSuite(): ISuiteValue {
        return this.config.defaultSuite
    }

    constructor() {
        this.finder = new SuiteFinder()
    }

    configExists(): Promise<boolean> {
        return new Promise<boolean>(
            (resolve, reject) => {
                fs.exists(SuiteLoader.CONFIG_FILENAME, (exist => {
                    resolve(exist)
                }))
            }
        )
    }
    save(config: PHPUnitConfig) {
        this.config = config
        return this.saveConfig()
    }
    private saveConfig() {
        return Observable.create(
            (observer: Observer<boolean>) => {
                const path = this.configPath
                console.log(path)
                fs.writeFile(
                    path,
                    JSON.stringify(this.config, null, 4),
                    (err?) => {
                        if (err)
                            return observer.error(err)
                        observer.next(true)
                        observer.complete()
                    })
            }
        )
    }
    setDefault(value: boolean, suite: ISuiteValue): Observable<boolean> | null {
        let current = this.config.defaultSuite
        if (!value) {
            if (!current)
                return null
            delete (this.config.defaultSuite)
            return this.saveConfig()
        }
        else {
            if (current != suite) {
                this.config.defaultSuite = suite
                return this.saveConfig()
            }
        }
        return null

    }
    private get configPath(): string {

        return join(PathResolver.instance.cwd, SuiteLoader.CONFIG_FILENAME)
    }

    lodConfig(): Observable<ISuite> {
        const path = this.configPath
        this.suites = []
        return Observable.create(
            (_observer: Observer<ISuite>) => {

                const setConfig = config => {
                    this.config = config
                    PathResolver.instance.config = config
                    find()
                }
                const load = () => {
                    fs.readFile(path, (err, data) => {
                        if (err)
                            return _observer.error(err)
                        let config: PHPUnitConfig
                        try {
                            config = JSON.parse(data.toString())
                        } catch (error) {
                            return _observer.error(error)
                        }
                        setConfig(config)
                    })
                }
                const find = () => {
                    const sub = this.finder.start(this.config)
                        .subscribe(
                            suite => {
                                this.suiteAdded(suite)
                                _observer.next(suite)
                            },
                            error => {
                                sub?.unsubscribe()
                                _observer.error(error)
                            },
                            () => {
                                _observer.complete()
                                sub?.unsubscribe()
                            }
                        )
                }

                if (this.config)
                    setConfig(this.config)
                else
                    load()

            }
        )
    }
    private suiteAdded = (suite: ISuite) => {
        this.suites.push(suite)
    }

}

class SuiteFinder {

    private _dirs: string[]
    private _files: string[]

    private config: PHPUnitConfig
    private cwd: string
    private _observer: Observer<ISuite>
    /**
     * 
     * @param dirs 
     */

    start(config: PHPUnitConfig): Observable<ISuite> {
        const dirPatterns: string[] = []
        let pattern: string
        let parts: string[]
        const src = config.pathMapping.source
        const resolver = PathResolver.instance
        this.cwd = resolver.cwd
        for (const desc of config.suites) {
            pattern = desc.pattern
            parts = [src, null]
            if (pattern)
                parts.push(pattern)
            for (let p of desc.dirs)
                dirPatterns.push(resolver.checkPath(src, p, pattern))
        }
        this._dirs = dirPatterns
        this.config = config
        return Observable.create(
            observer => {
                this._observer = observer
                this.nextDir()
            }
        )
    }

    private nextDir() {
        const resolver = PathResolver.instance
        if (!this._dirs.length) {
            return this._observer.complete()
        }
        glob(this._dirs.shift(), {
            cwd: this.cwd
        }, this.handleFiles)
    }

    private handleFiles = (error: Error, matches: string[]) => {
        if (error)
            return this._observer.error(error)
        if (!matches.length)
            return this.nextDir()
        this._files = matches.map(file => join(this.cwd, file))
        this.nextFile()
    }

    private nextFile() {
        if (!this._files.length) {
            return this.nextDir()
        }
        const file = this._files.shift()

        fs.readFile(file, (error: Error, data: Buffer) => {
            if (error) {
                return this._observer.error(error)
            }
            this.checkXML(data, file)
        })
    }

    private checkXML(data: Buffer, file: string) {
        parseString(data.toString(), (err, json) => {
            if (err)
                return console.error(err)

            const phpunit = (json && json.phpunit) ? json.phpunit : null
            if (phpunit && phpunit.$ && phpunit.$["xmlns:xsi"]) {
                const attr = phpunit.$
                const resolver = PathResolver.instance
                const f = resolver.map(file)
                const suite: ISuite = {
                    autoload: attr.bootstrap,
                    path: f,
                    names: []
                }
                const suites = phpunit.testsuites
                for (let item of suites) {
                    for (let ts of item.testsuite)
                        suite.names.push(ts.$["name"])
                }
                this._observer.next(suite)
            }
            this.nextFile()
        })
    }
}