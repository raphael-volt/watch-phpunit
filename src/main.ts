import { SuiteLoader } from "./core/suite-loader"
import { SelectSuite } from "./prompt/select-suite";
import { Subscription } from "rxjs";
import { ISuite } from "./core/isuite";
import { SelectAction } from "./prompt/select-action";
import { Action } from "./core/action";
import { exec } from "child_process";
import { watch, FSWatcher } from "chokidar";
import { join } from "path";
import * as colors from "colors";
import { EOL } from "os";
colors.enable()

type SubKeys = "config" | "suite" | "action"
type Subs = {
    [K in SubKeys]?: Subscription
}

class PhpUnitWarcher {

    private loader: SuiteLoader = new SuiteLoader()
    private selectSuite: SelectSuite
    private selectAction: SelectAction

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
    private watcher: FSWatcher
    private suite: ISuite

    constructor() {
        process.on('SIGINT', () => {
            this.exit(0)
        })
    }

    private exit(code: number = 0, error: any = null) {
        this.unsubscribeAll()
        if (this.watcher) {
            this.watcher.close()
            console.log('fs watcher removed'.magenta)
        }
        if (error)
            console.error(error)
        else
            console.log("done".green)
        process.exit(code)
    }

    private errorHandler = (error?) => {
        this.exit(1, error)
    }
    init() {
        this.subs.config = this.loadConfig().subscribe(
            suite => suite,
            this.errorHandler,
            () => {
                this.unsubscribe("config")
                const suite = this.loader.defaultSuite
                if (suite) {
                    this.suite = suite
                    this.chokidar()
                    console.log(`Using default suite `.magenta + suite.path.green)
                }
                else
                    this.addSuiteSelector()

            }
        )
    }

    private loadConfig() {
        this.loader = new SuiteLoader()
        return this.loader.lodConfig("phpunit.config.json")
    }
    private addSuiteSelector() {
        this.state = "suite"
        this.selectSuite = new SelectSuite(this.loader.suites)
        this.subs.suite = this.selectSuite.prompt().subscribe(
            suite => {
                if (!suite)
                    return this.exit(0)
                this.suite = suite
                this.selectSuite = null
                this.unsubscribe("suite")
                this.chokidar()
            },
            this.errorHandler,
            this.errorHandler
        )
    }
    private addActionSelector() {
        this.state = "action"
        this.selectAction = new SelectAction(this.loader.defaultSuite)
        this.subs.action = this.selectAction.prompt().subscribe(action => {
            this.unsubscribe("action")
            switch (action) {
                case Action.abord:
                    this.watcher.close()
                    process.exit(0)

                case Action.run:
                    this.selectAction = null
                    this.phpunit()
                    break;

                case Action.select:
                    this.addSuiteSelector()
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
        let dirs = this.loader.config.watch
        const config = this.loader.config
        let prevCwd = process.cwd()
        let cwd: string = config.cwd ? config.cwd : null
        if (cwd)
            dirs = dirs.map(dir => join(cwd, dir))
        const watcher: FSWatcher = watch(dirs)
        this.watcher = watcher
        watcher.on('error', error => {
            console.error(error)
        })
        watcher.on('change', this.fsChange)
        watcher.on('ready', () => {
            console.log("fs watcher ready".magenta)
            this.phpunit()
        })


    }

    private phpunit() {
        const cmd = [
            this.loader.config.cmd,
            "--colors=always", "-c",
            this.suite.path
        ].join(" ")
        exec(cmd, (error, stdout, stderr) => {
            console.log(stdout)
            this.addActionSelector()
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
        const save = this.loader.setDefault(isDefault, this.suite)
        if (save) {
            this.subs.config = save.subscribe(
                value => {
                    this.unsubscribe("config")
                    this.addActionSelector()
                }
            )
        }
        else
            this.addActionSelector()
    }
}

const watcher = new PhpUnitWarcher()
watcher.init()
export { watcher }