import { expect} from 'chai';
import { SuiteForm } from "../src/prompt/suite-form";
import { ISuite } from "../src/core/isuite";
const simpleList: ISuite[] = [
    {
        names:["Default"],
        path:"www/specs/1.xml"
    },
    {
        names:["Default"],
        path:"www/specs/2.xml"
    },
    {
        names:["Default"],
        path:"www/specs/3.xml"
    }
]

const multipleList: ISuite[] = [
    {
        names:["Default", "All", "Debug"],
        path:"www/specs/1.xml"
    },
    {
        names:["Default"],
        path:"www/specs/2.xml"
    },
    {
        names:["Default", "1", "2", "3"],
        path:"www/specs/3.xml"
    }
]

describe("SuiteForm", ()=>{
    it("should create collection of simple list", ()=>{
        const form = new SuiteForm(simpleList)
        const questions = form.createQuetions()
        expect(questions.length).eq(1)
        let c: any
        for (c of questions[0].choices) {
            const value: Object = c.value
            expect(value.hasOwnProperty("name")).false
        }
    })
    it("should create collection of multiple list", ()=>{
        const getName = (suite, name) => `${suite} (${name})`
        
        const form = new SuiteForm(multipleList)
        const questions = form.createQuetions()
        expect(questions.length).eq(1)
        let choices = questions[0].choices
        expect(choices.length).eq(10)
        let c: any = choices[0]
        const n0 = "1.xml"
        const n1 = "2.xml"
        const n2 = "3.xml"
        
        expect(c.name).eq(n0)
        let value: any = c.value
        expect(value.hasOwnProperty("name")).false
        //"Default", "All", "Debug"
        c = choices[1]
        expect(c.name).eq(getName(n0, "Default"))
        value = c.value as Object
        expect(value.hasOwnProperty("name")).true
        expect(value.name).eq("Default")
        
        c = choices[2]
        expect(c.name).eq(getName(n0, "All"))
        value = c.value as Object
        expect(value.hasOwnProperty("name")).true
        expect(value.name).eq("All")
        
        c = choices[3]
        expect(c.name).eq(getName(n0, "Debug"))
        value = c.value as Object
        expect(value.hasOwnProperty("name")).true
        expect(value.name).eq("Debug")
        
        c = choices[4]
        expect(c.name).eq(n1)
        value = c.value as Object
        expect(value.hasOwnProperty("name")).false
        
        // "Default", "1", "2", "3"
        c = choices[5]
        expect(c.name).eq(n2)
        value = c.value as Object
        expect(value.hasOwnProperty("name")).false
        
        c = choices[6]
        expect(c.name).eq(getName(n2, "Default"))
        value = c.value as Object
        expect(value.hasOwnProperty("name")).true
        expect(value.name).eq("Default")
        
        c = choices[7]
        expect(c.name).eq(getName(n2, "1"))
        value = c.value as Object
        expect(value.hasOwnProperty("name")).true
        expect(value.name).eq("1")
        
        c = choices[8]
        expect(c.name).eq(getName(n2, "2"))
        value = c.value as Object
        expect(value.hasOwnProperty("name")).true
        expect(value.name).eq("2")
        
        c = choices[9]
        expect(c.name).eq(getName(n2, "3"))
        value = c.value as Object
        expect(value.hasOwnProperty("name")).true
        expect(value.name).eq("3")
    })
})