import { Subject } from "rxjs";
import { prompt } from "inquirer";

export interface ISelect<T> {
  event: Subject<T>
  questions: any[]
  prompt(): Subject<T>
}

export class Select<T> implements ISelect<T> {
  event: Subject<T> = new Subject()
  questions: any[]
  
  prompt() {
    if (!this.questions)
      this.questions = this.createQuetions()
    prompt(this.questions)
      .then(
        value => {
          this.event.next(this.getValue(value))
          this.event.complete()
        }
      )
    return this.event
  }
  protected getValue(data: any): T {
    return null
  }
  protected createQuetions(): any[] {
    return null
  }
}