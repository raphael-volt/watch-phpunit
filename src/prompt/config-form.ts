import { FormBase } from "./form-base";
import { PHPUnitConfig, IDirDesc } from "src/core/iconfig";
import { Question, Answers, prompt } from "inquirer";
import { Observable, Observer } from "rxjs";

export class ConfigForm extends FormBase<PHPUnitConfig> {
    public static get yesOrNext() {
        return [
            {
                name: "Yes",
                value: true
            },
            {
                name: "No",
                value: false
            }
        ]
    }
    constructor(public config?: PHPUnitConfig) {
        super()
    }

    createQuetions() {
        return this.checkPrefix(<Question<Answers>[]>[
            {
                type: 'input',
                name: 'cmd',
                message: 'Enter the phpunit command',
                default: "phpunit"
            },
            {
                type: 'input',
                name: 'pathMapping.source',
                message: 'Enter relative path to the web server root',
                default: "www"
            },
            {
                type: 'input',
                name: 'pathMapping.target',
                message: 'Enter the web server root',
                default: "/var/www/html"
            }
        ])
    }

    prompt() {
        const config: PHPUnitConfig = {
            suites: [],
            watch: []
        }
        const questions = this.createQuetions()
        const event = this.event
        prompt(questions).then(
            (data: any) => {
                config.cmd = data.cmd
                config.pathMapping = data.pathMapping
                const promptDir = new PromptForAdd()
                const dirPrompt = (message: string, pattern: string, dirDescs: IDirDesc[], cb: () => void) => {
                    const sub = promptDir.prompt(message, pattern).subscribe(
                        desc => {
                            dirDescs.push(desc)
                        },
                        event.error,
                        () => {
                            sub.unsubscribe()
                            cb()
                        }
                    )
                }
                const suites = () => {
                    dirPrompt(
                        "search parameter for unit test suites", "**/*.xml",
                        config.suites, watch)
                }
                const watch = () => [
                    dirPrompt(
                        "search parameter for file system watcher", "**/*.php",
                        config.watch, 
                        () => {
                            event.next(config)
                            event.complete()
                        })
                ]
                suites()
            }
        )
        return event
    }

    getValue(data) {
        return data
    }
}

class PromptForAdd {

    entryQuestions: any[] = [
        {
            message: "Enter a pattern:",
            name: "pattern",
            type: "input",
            default: "**/*.php"
        },
        {
            message: "Enter the relative path:",
            name: "dir",
            type: "input",
            default: "www"
        },
        {
            message: "Add more path?",
            name: "more",
            type: "list",
            choices: ConfigForm.yesOrNext
        }
    ]

    
    /**
     * ask form more path
     */
    private get promptInit() {
        return prompt(this.entryQuestions)
    }

    private get promptAddDesc() {
        return prompt({
            name: "addEntry",
            message: "Add an entry?",
            type: "list",
            choices: ConfigForm.yesOrNext
        })
    }
    private get promptDir() {
        return prompt([this.entryQuestions[1], this.entryQuestions[2]])
    }

    prompt(message: string, pattern: string): Observable<IDirDesc> {
        return Observable.create(
            (obs: Observer<IDirDesc>) => {
                this.entryQuestions[0].default = pattern
                this.entryQuestions.map(q=>{
                    q.prefix = FormBase.QUESTION_PREFIX.green
                    return q
                })
                let current: IDirDesc
                const getData = (data: any): IDirDesc => {
                    return {
                        pattern: data.pattern,
                        dirs: [data.dir]
                    }
                }
                const addDir = () => {
                    this.promptDir.then((data: any) => {
                        current.dirs.push(data.dir)
                        if (data.more)
                            addDir()
                        else {
                            obs.next(current)
                            this.promptAddDesc.then(
                                (data: any) => {
                                    if (data.addEntry) {
                                        init()
                                    }
                                    else {
                                        obs.complete()
                                    }
                                }
                            )
                        }
                    })
                }
                const init = () => {
                    this.promptInit.then(
                        (data: any) => {
                            current = getData(data)
                            if (data.more)
                                addDir()
                            else {
                                obs.next(current)
                                this.promptAddDesc.then((value: any) => {
                                    if (value.addEntry) {
                                        init()
                                    }
                                    else
                                        obs.complete()
                                })
                            }
                        }
                    )
                }
                if(message)
                    this.logFormStep(message)
                init()
            }
        )
    }

    private logFormStep(value: string) {
        console.log(value.magenta)
    }
}