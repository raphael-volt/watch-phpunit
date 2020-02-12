import { Select } from "./iselect";
import { basename } from "path";
import { ISuite } from "../core/isuite";
export class SelectSuite extends Select<ISuite> {

    private suite: ISuite
    constructor(private suites: ISuite[]) {
        super()
    }
    protected createQuetions() {
        const choises = this.suites.map(suite => {
            return {
                name: basename(suite.path) + ` (${suite.names.join(", ")})`,
                value: suite
            }
        })
        return [
            {
                type: 'list',
                name: 'suite',
                message: 'Select a suite to run: ',
                filter: val => {
                    this.suite = val
                    return val.path
                },
                choices: choises
            }
        ]
    }
    protected getValue(data) {
        return this.suite
    }
}