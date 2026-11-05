/**
 * Public surface of the teaching core package.
 *
 * Feature modules (corpus, teaching, learning, experiments, portability) are
 * exported from their own entry points to keep deep imports explicit; this
 * root re-exports the shared contracts every consumer needs.
 */
export * from './contracts/ids.ts'
export * from './contracts/result.ts'
export * from './contracts/task.ts'
export * from './contracts/source.ts'
export * from './contracts/course.ts'
export * from './contracts/session.ts'
export * from './contracts/model.ts'
export * from './contracts/activity.ts'
export * from './contracts/learning.ts'
export * from './contracts/experiment.ts'
export * from './contracts/portability.ts'
export * from './contracts/corpus.ts'
export * from './contracts/teaching.ts'
export * from './contracts/learning-service.ts'
export * from './contracts/api.ts'
export * from './contracts/portability-service.ts'
export * from './storage/layout.ts'
export * from './storage/local-state.ts'
export * from './storage/repositories.ts'
export * from './model/types.ts'
export * from './model/fake.ts'
