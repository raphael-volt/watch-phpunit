import * as fs from "fs";
import * as glob from "glob";
import { Observable, Observer } from "rxjs";
import { parseString } from "xml2js";
import { IConfig } from "./iconfig";
import { ISuite } from "./isuite";
import { join, relative } from "path";
export class SuiteLoader {

    config: IConfig
    private configPath: string
    private finder: SuiteFinder
    suites: ISuite[]
    defaultSuite: ISuite

    constructor() {
        this.finder = new SuiteFinder()
    }
    private saveConfig() {
        return Observable.create(
            (observer: Observer<boolean>) => {
                fs.writeFile(
                    this.configPath,
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
    setDefault(value: boolean, suite: ISuite): Observable<boolean> | null {
        let current = this.config.defaultSuite
        if (!value) {
            if (!current)
                return null
            delete (this.config.defaultSuite)
            if (this.defaultSuite)
                this.defaultSuite.isDefault = false
            this.defaultSuite = null
            return this.saveConfig()
        }
        else {
            if (current != suite.path) {
                if (this.defaultSuite)
                    this.defaultSuite.isDefault = false
                suite.isDefault = true
                this.config.defaultSuite = suite.path
                this.defaultSuite = suite
                return this.saveConfig()
            }
        }
        return null

    }
    lodConfig(path): Observable<ISuite> {

        path = join(process.cwd(), path)
        this.configPath = path
        this.suites = []
        return Observable.create(
            (_observer: Observer<ISuite>) => {
                fs.readFile(path, (err, data) => {
                    if (err)
                        return _observer.error(err)
                    let config: IConfig
                    try {
                        config = JSON.parse(data.toString())
                    } catch (error) {
                        return _observer.error(error)
                    }
                    this.config = config
                    let prevCwd = null
                    if (config.cwd) {
                        prevCwd = process.cwd()
                        process.chdir(config.cwd)
                    }
                    const sub = this.finder.start(config)
                        .subscribe(
                            suite => {
                                this.suiteAdded(suite)
                                _observer.next(suite)
                            },
                            error => {
                                _observer.error(error)
                            },
                            () => {
                                if (prevCwd)
                                    process.chdir(prevCwd)
                                _observer.complete()
                            }
                        )

                })
            }
        )
    }
    private suiteAdded = (suite: ISuite) => {
        this.suites.push(suite)
        if (suite.path == this.config.defaultSuite) {
            this.defaultSuite = suite
            suite.isDefault = true
        }
    }

}

class SuiteFinder {

    private _dirs: string[]
    private _files: string[]

    private config: IConfig
    private _observer: Observer<ISuite>
    /**
     * 
     * @param dirs 
     */
    start(config: IConfig): Observable<ISuite> {
        this._dirs = config.dirs.slice()
        this.config = config
        return Observable.create(
            _observer => {
                this._observer = _observer
                this.nextDir()
            }
        )
    }

    private nextDir() {
        if (!this._dirs.length) {
            return this._observer.complete()
        }
        let path = join(process.cwd(), this._dirs.shift())

        if (this.config.filter)
            path += this.config.filter

        glob(path, {
            cwd: process.cwd()
        }, this.handleFiles)
    }

    private handleFiles = (error: Error, matches: string[]) => {
        if (error)
            return this._observer.error(error)
        if (!matches.length)
            return this.nextDir()
        this._files = matches
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
                const f = relative(process.cwd(), file)
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