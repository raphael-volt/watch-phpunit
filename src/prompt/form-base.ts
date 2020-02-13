import { Subject } from "rxjs";
import { prompt, Answers } from "inquirer";
import { Question } from "inquirer";

export interface IQuestion {

}
export interface ICLIForm<T> {
  event: Subject<T>
  questions: any[]
  prompt(): Subject<T>
  getValue(data: any): T
  createQuetions(): Question[]
}

export class FormBase<T> implements ICLIForm<T> {
  public static readonly QUESTION_PREFIX: string = "\u2022"
  event: Subject<T> = new Subject()
  questions: Question[]
  protected getAnswer(name: string, value: any): Answers {
    return {
      name: name,
      value: value
    }
  }
  checkPrefix(questions) {
    return questions.map(q => {
      q.prefix = FormBase.QUESTION_PREFIX.green
      return q
    })
  }
  prompt() {
    if (!this.questions)
      this.questions = this.checkPrefix(this.createQuetions())
    prompt(this.questions)
      .then(
        value => {
          this.event.next(this.getValue(value))
          this.event.complete()
        }
      )
    return this.event
  }
  getValue(data: any): T {
    return null
  }
  createQuetions(): Question[] {
    return null
  }
}