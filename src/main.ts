import { SuiteLoader } from "./core/suite-loader"
import { SuiteForm } from "./prompt/suite-form";
import { Subscription } from "rxjs";
import { ISuiteValue } from "./core/isuite";
import { ActionForm } from "./prompt/action-form";
import { Action } from "./core/action";
import { exec } from "child_process";
import { watch, FSWatcher } from "chokidar";
import * as colors from "colors";
import { EOL } from "os";
import * as figlet from "figlet";
import { ConfigForm } from "./prompt/config-form";
import { PathResolver } from "./core/path-resolver";
import { readFile } from "fs";
import { resolve, join } from "path";
colors.enable()

type SubKeys = "config" | "suite" | "action"
type Subs = {
    [K in SubKeys]?: Subscription
}

class PhpUnitWarcher {

    private loader: SuiteLoader = new SuiteLoader()
    private selectAction: ActionForm
    private watcher: FSWatcher
    private suiteValue: ISuiteValue;
    private subs: Subs = {}

    private unsubscribeAll() {
        const subs = this.subs
        for (const k in subs)
            this.unsubscribe(k as SubKeys)
    }
    private unsubscribe(key: SubKeys) {
        const sub = this.subs[key]
        if (sub && !sub.closed) {
            sub.unsubscribe()
            delete (this.subs[key])
        }
    }

    private createConfig = false
    private showHelp = false

    private showVersion = false
    constructor() {
        process.on('SIGINT', () => {
            this.exit(0)
        })
        let args = process.argv.slice(2)
        for (const a of args) {
            switch (a) {
                case "-c":
                case "--config":
                    this.createConfig = true
                    break;
                case "-h":
                case "--help":
                    this.showHelp = true
                break
                case "-v":
                case "--version":
                    this.showVersion = true
                break
                default:
                    break;
            }
        }

    }

    private getErrorString(e: string | Error | any): string {
        if (typeof e == 'string')
            return e
        if (e instanceof Error) {
            return e.message
        }
        if (e.message !== undefined)
            return String(e.message)
        return String(e)
    }

    private exit(code: number = 0, error: any = null) {
        this.unsubscribeAll()
        if (this.watcher) {
            this.watcher.close()
            console.log('fs watcher removed'.magenta)
        }
        if (error)
            console.log(this.getErrorString(error).red)
        else
            console.log("done".green)
        process.exit(code)
    }

    private errorHandler = (error?) => {
        this.exit(1, error)
    }
    init() {
        if (this.createConfig)
            return this.setup()
        if(this.showHelp)
            return this.help()
        if(this.showVersion)
            return this.version()
        this.loader.configExists().then(
            exists => {
                this.createConfig = !exists
                this.setup()
            }
        )
    }

    private setup() {
        if (this.createConfig)
            return this.addConfigForm()
        if(this.showHelp)
            return this.help()
        if(this.showVersion)
            return this.version()
        this.subs.config = this.loadConfig().subscribe(
            suite => suite,
            this.errorHandler,
            () => {
                this.unsubscribe("config")
                const data = this.loader.defaultSuite
                this.suiteValue = data
                if (data) {
                    this.chokidar()
                    const parts = [
                        `Using default suite `.magenta + `${data.suite.path}`.green
                    ]
                    if (data.name)
                        parts.push(`(${data.name})`.green)
                    console.log(parts.join(" "))
                }
                else
                    this.addSuiteForm()

            }
        )
    }

    private loadConfig() {
        return this.loader.lodConfig()
    }

    private get figlet(): Promise<boolean> {
        return new Promise<boolean>(
            (resolve, reject) => {
                figlet(`watch${EOL}phpunit`,(error, result)=>{
                    if(error)
                        return reject(error.message)
                    console.log(result.blue)
                    resolve(true)
                })
            }
        )
    }

    private addConfigForm() {
        this.figlet.then(
            done => {
                console.log(EOL + "Configuration".magenta.bold)
                let form: ConfigForm = new ConfigForm()
                this.subs.config = form.prompt().subscribe(
                    config => {
                        this.subs.config = this.loader.save(config)
                            .subscribe(
                                success => {
                                    this.createConfig = false
                                    this.setup()
                                }
                            )
                    },
                    this.errorHandler
                )
            }
        )
    }

    private addSuiteForm() {
        this.state = "suite"
        let selectSuite = new SuiteForm(this.loader.suites)
        this.subs.suite = selectSuite.prompt().subscribe(
            data => {
                let suite = data.suite
                if (!suite)
                    return this.exit(0)
                this.suiteValue = data
                this.unsubscribe("suite")
                this.chokidar()
            },
            this.errorHandler,
            this.errorHandler
        )
    }
    private addActionForm() {
        this.state = "action"
        this.selectAction = new ActionForm(
            this.suiteValue,
            this.loader.defaultSuite)
        this.subs.action = this.selectAction.prompt().subscribe(action => {
            this.unsubscribe("action")
            switch (action) {
                case Action.abort:
                    this.watcher.close()
                    process.exit(0)

                case Action.run:
                    this.selectAction = null
                    this.phpunit()
                    break;

                case Action.select:
                    this.addSuiteForm()
                    break;
                case Action.setdefault:
                case Action.unsetdefault: {
                    this.setDefault(action)
                    break
                }
                default:
                    break;
            }
        },
            this.errorHandler,
            this.errorHandler)
    }

    private chokidar() {
        if (this.watcher)
            return this.phpunit()
        const resolver = PathResolver.instance
        const config = this.loader.config
        const src = config.pathMapping.source
        const dirs = []
        let missingPatterns = []
        for (const desc of this.loader.config.watch) {
            if (!desc.pattern) {
                missingPatterns.push()
            }
            for (const p of desc.dirs) {
                if (!desc.pattern) {
                    missingPatterns.push(resolver.checkPath(src, p))
                }
                dirs.push(resolver.checkPath(src, p, desc.pattern))
            }
        }
        if (!dirs.length) {
            this.checkConfigMessage("missing or invalide directories to watch")
            return this.phpunit()
        }
        if (dirs.length == 1 && dirs[0] == ".")
            this.checkConfigMessage("watching the root directory without filename pattern is deprecated")
        if (missingPatterns.length) {
            this.checkConfigMessage("watching a directory without filename pattern is deprecated", missingPatterns.join(", "))
        }
        const watcher: FSWatcher = watch(dirs)
        this.watcher = watcher
        watcher.on('error', error => {
            this.exit(1, error)
        })
        watcher.on('change', this.fsChange)
        watcher.on('ready', () => {
            console.log("fs watcher ready ".magenta + ` [${dirs.join(", ")}]`.cyan)
            this.phpunit()
        })
    }

    private phpunit() {
        const data = this.suiteValue
        const cmd = [
            this.loader.config.cmd,
            "--colors=always",
            "-c", data.suite.path
        ]
        if (data.name)
            cmd.push("--testsuite", data.name)

        exec(cmd.join(" "), (error: Error, stdout: string, stderr: string) => {
            if (error && (!stdout || !stdout.length))
                return this.exit(1, error)
            console.log(stdout)
            this.addActionForm()
        })
    }
    private state: "suite" | "action" = "suite"
    private fsChange = (error, stdout, stderr) => {
        if (this.state == "action") {
            process.stdin.emit('keypress', Action.run)
            process.stdin.emit('keypress', EOL)
        }
    }
    private setDefault(action: Action) {
        const isDefault = action == Action.setdefault
        const save = this.loader.setDefault(isDefault, this.suiteValue)
        if (save) {
            this.subs.config = save.subscribe(
                value => {
                    this.unsubscribe("config")
                    this.addActionForm()
                }
            )
        }
        else
            this.addActionForm()
    }

    private checkConfigMessage(...lines) {
        lines = lines.map(s => "- " + s)
        lines.splice(0, 0, "Error, check your configuration file".bold)
        console.log(lines.join(EOL).red)
    }

    private help() {
        this.figlet.then(
            done=>{
                const rows = [
                    "Usage: watch-phpunit [options]",
                    "",
                    `test suite selection
                    live reload on file system changes`
                ]

                console.log(`
Usage: ${"watch-phpunit".bold} [options]

Options:    
    -h, --help       Show help.
    -v, --version    Show version number.
    -c --config      Create or override the configuration file.

Documentation: https://github.com/raphael-volt/watch-phpunit
`)
                process.exit()
            }
        )
    }
    private version() {
        readFile(resolve(__dirname, join("..", "package.json")), (err, data)=>{
            if(err)
                this.exit(1, err)
            const pkg = JSON.parse(data.toString())
            console.log(`${"watch-phpunit".bold}: ${pkg.version}`)
            process.exit()
        })
    }
}

const watcher = new PhpUnitWarcher()
watcher.init()
export { watcher }