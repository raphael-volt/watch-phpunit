import { Select } from "./iselect";
import { Action } from "../core/action";
import { ISuite } from "src/core/isuite";

export class SelectAction extends Select<Action> {

    constructor(private defaultSuite: ISuite=null){
        super()
    }
    protected createQuetions() {
        const defaultSuite = this.defaultSuite
        const choices = [
            {
                name: "Restart the suite",
                value: Action.run
            },
            {
                name: "Select another suite",
                value: Action.select
            },
            {
                name: defaultSuite ? "Unset default":"Set as default",
                value: defaultSuite ? Action.unsetdefault:Action.setdefault
            },
            {
                name: "Abord",
                value: Action.abord
            }
        ]
        return [
            {
                type: 'list',
                name: 'action',
                message: 'What do you want to do?',
                choices: choices 
            }
        ]
    }
    protected getValue(data) {
        return data.action
    }
}