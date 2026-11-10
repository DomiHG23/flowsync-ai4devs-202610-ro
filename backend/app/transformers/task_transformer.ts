import type Task from '#models/task'
import { BaseTransformer } from '@adonisjs/core/transformers'
import TaskAssigneeTransformer from '#transformers/task_assignee_transformer'

/**
 * Una tarea tal y como la devuelven la lista, la creación y el cambio de estado.
 *
 * El responsable pasa por `TaskAssigneeTransformer` y NO por `UserTransformer`:
 * este último trae el email y las fechas de la cuenta, y el requisito «Lo que
 * cada tarea muestra de su responsable» prohíbe exponerlos junto a una tarea.
 * Lo vigila `tests/functional/tasks/assignee.spec.ts`.
 */
export default class TaskTransformer extends BaseTransformer<Task> {
  toObject() {
    return {
      ...this.pick(this.resource, ['id', 'title', 'status', 'createdAt', 'updatedAt']),
      assignee: TaskAssigneeTransformer.transform(this.whenLoaded(this.resource.assignee)),
    }
  }
}
