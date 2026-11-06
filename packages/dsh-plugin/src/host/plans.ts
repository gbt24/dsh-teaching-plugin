/** Persistence for guided course plans (`$DSH_HOME/teaching/plans/*.json`). */
import type { CoursePlan } from '@deepseek-teaching/core'
import type { LocalState } from '@deepseek-teaching/core'

/** One planning record store. */
export class PlanRepository {
  private readonly state: LocalState

  constructor(state: LocalState) {
    this.state = state
  }

  async get(planId: string): Promise<CoursePlan | undefined> {
    return this.state.readJson<CoursePlan>(`plans/${planId}.json`)
  }

  async save(plan: CoursePlan): Promise<CoursePlan> {
    const next = { ...plan, updatedAt: new Date().toISOString() }
    await this.state.writeJson(`plans/${plan.id}.json`, next)
    return next
  }

  async list(): Promise<CoursePlan[]> {
    const files = (await this.state.list('plans')).filter(name => name.endsWith('.json'))
    const plans: CoursePlan[] = []
    for (const name of files) {
      const plan = await this.state.readJson<CoursePlan>(`plans/${name}`)
      if (plan !== undefined) plans.push(plan)
    }
    return plans.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
  }
}
