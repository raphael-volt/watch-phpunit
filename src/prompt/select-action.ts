import { Select } from "./iselect";
import { Action } from "../core/action";
import { ISuite } from "src/core/isuite";

export class SelectAction extends Select<Action> {

    constructor(
        private currentSuite: ISuite,
        private defaultSuite: ISuite = null) {
        super()
    }
    protected createQuetions() {
        const setFlag = this.currentSuite != this.defaultSuite
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
                name: setFlag ? "Set as default":"Unset default",
                value: setFlag ? Action.setdefault : Action.unsetdefault
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