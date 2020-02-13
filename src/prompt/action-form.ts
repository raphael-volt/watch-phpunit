import { FormBase } from "./form-base";
import { Action } from "../core/action";
import { ISuiteValue } from "../core/isuite";

export class ActionForm extends FormBase<Action> {

    constructor(
        private currentSuite: ISuiteValue,
        private defaultSuite: ISuiteValue = null) {
        super()
    }
    createQuetions() {
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
    getValue(data) {
        return data.action
    }
}