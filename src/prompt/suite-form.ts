import { FormBase } from "./form-base";
import { basename } from "path";
import { ISuite, ISuiteValue } from "../core/isuite";
import { Answers } from "inquirer";

export class SuiteForm extends FormBase<ISuiteValue> {

    constructor(private suites: ISuite[]) {
        super()
    }
    createQuetions() {
        const choices: Answers[] = []
        for (const suite of this.suites) {
            const names = suite.names.slice()
            const suiteName = basename(suite.path)
            choices.push(
                this.getAnswer(suiteName, { suite: suite })
            )
            if (names.length > 1) {
                for (const name of suite.names) {
                    const answer = this.getAnswer(
                        suiteName + ` (${name})`,
                        {
                            suite: suite,
                            name: name
                        }
                    )
                    choices.push(answer)
                }
            }
        }
        return [
            {
                type: 'list',
                name: 'suite',
                message: 'Select a suite to run: ',
                filter: val => {
                    //return `${val.suite } (${val.value})`
                    return val
                },
                choices: choices
            }
        ]
    }
    getValue(data) {
        return data.suite
    }
}