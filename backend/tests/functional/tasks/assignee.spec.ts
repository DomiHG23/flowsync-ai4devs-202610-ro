import User from '#models/user'
import Task from '#models/task'
import { test } from '@japa/runner'
import testUtils from '@adonisjs/core/services/test_utils'

/**
 * Lo que cada tarea muestra de su responsable. Cubre los tres scenarios del
 * requisito «Lo que cada tarea muestra de su responsable» de
 * `openspec/specs/tasks/spec.md` —responsable identificable, la tarea no filtra
 * datos de cuenta, responsable sin nombre— en **todas** las respuestas que
 * devuelven una tarea: listar (con y sin filtro), crear, consultar una suelta,
 * cambiar el estado y fijar la fecha.
 *
 * Se recorren todas a propósito: cada endpoint elige su propio transformer, y la
 * regresión que este fichero existe para atrapar —que una de ellas vuelva a
 * serializar el responsable con `UserTransformer` y arrastre el email— solo se
 * ve mirando la respuesta concreta que la tiene.
 *
 * La matriz que traza cada scenario a estos tests vive en
 * `docs/verificacion/trazabilidad-tasks-responsable.md`.
 */

/**
 * Las únicas claves que puede traer el responsable junto a una tarea. Se
 * comprueba la lista exacta, y no solo la ausencia del email, para que
 * cualquier dato de cuenta nuevo que se cuele (fechas, hash, tokens...) rompa
 * el test en vez de pasar desapercibido.
 */
const CLAVES_DEL_RESPONSABLE = ['fullName', 'id', 'initials']

const TODAY = '2026-11-10'

type Client = any

/**
 * El cuerpo tal y como llega, sin los tipos del registro Tuyau: estos tests
 * miran la respuesta real, y los tipos generados describirían justo la forma
 * que se quiere comprobar en vez de comprobarla.
 */
const datos = (response: { body(): unknown }) => (response.body() as { data: any }).data

async function sesion(client: Client, fullName: string | null, email: string) {
  const user = await User.create({ fullName, email, password: 'secreto123' })
  const response = await client.post('/api/v1/auth/login').json({ email, password: 'secreto123' })

  return { user, token: response.body().data.token as string }
}

/**
 * Cada forma que tiene la API de devolver una tarea, reducida a «dame el
 * responsable de esta tarea tal y como llega». Así cada scenario se ejecuta
 * contra todas sin repetir el cuerpo del test.
 */
const respuestas: Array<{
  nombre: string
  assignee: (client: Client, token: string, task: Task) => Promise<Record<string, unknown>>
}> = [
  {
    nombre: 'GET /tasks (vista por defecto)',
    assignee: async (client, token, task) => {
      const response = await client.get('/api/v1/tasks').bearerToken(token)
      response.assertStatus(200)
      return response.body().data.find((t: { id: number }) => t.id === task.id).assignee
    },
  },
  {
    nombre: 'GET /tasks?status=done',
    assignee: async (client, token, task) => {
      task.status = 'done'
      await task.save()
      const response = await client.get('/api/v1/tasks').qs({ status: 'done' }).bearerToken(token)
      response.assertStatus(200)
      return response.body().data.find((t: { id: number }) => t.id === task.id).assignee
    },
  },
  {
    nombre: 'GET /tasks/:id',
    assignee: async (client, token, task) => {
      const response = await client
        .get(`/api/v1/tasks/${task.id}`)
        .qs({ today: TODAY })
        .bearerToken(token)
      response.assertStatus(200)
      return response.body().data.assignee
    },
  },
  {
    nombre: 'PATCH /tasks/:id/status',
    assignee: async (client, token, task) => {
      const response = await client
        .patch(`/api/v1/tasks/${task.id}/status`)
        .json({ status: 'in_progress' })
        .bearerToken(token)
      response.assertStatus(200)
      return response.body().data.assignee
    },
  },
  {
    nombre: 'PUT /tasks/:id/due-date',
    assignee: async (client, token, task) => {
      const response = await client
        .put(`/api/v1/tasks/${task.id}/due-date`)
        .qs({ today: TODAY })
        .json({ dueDate: '2026-12-01' })
        .bearerToken(token)
      response.assertStatus(200)
      return response.body().data.assignee
    },
  },
]

test.group('Tasks | lo que cada tarea muestra de su responsable', (group) => {
  group.each.setup(() => testUtils.db().withGlobalTransaction())

  for (const { nombre, assignee } of respuestas) {
    test(`${nombre}: el responsable llega con su nombre y sus iniciales`, async ({
      client,
      assert,
    }) => {
      const ada = await sesion(client, 'Ada Lovelace', 'ada@example.com')
      const task = await Task.create({
        title: 'Revisar',
        status: 'pending',
        assigneeId: ada.user.id,
      })

      const responsable = await assignee(client, ada.token, task)

      assert.equal(responsable.fullName, 'Ada Lovelace')
      assert.equal(responsable.initials, 'AL')
    })

    test(`${nombre}: el responsable no trae el email ni ningún otro dato de cuenta`, async ({
      client,
      assert,
    }) => {
      const ada = await sesion(client, 'Ada Lovelace', 'ada@example.com')
      const task = await Task.create({
        title: 'Revisar',
        status: 'pending',
        assigneeId: ada.user.id,
      })

      const responsable = await assignee(client, ada.token, task)

      assert.notProperty(responsable, 'email')
      assert.sameMembers(Object.keys(responsable), CLAVES_DEL_RESPONSABLE)
      assert.notInclude(JSON.stringify(responsable), 'ada@example.com')
    })

    test(`${nombre}: un responsable sin nombre llega con nombre nulo e iniciales`, async ({
      client,
      assert,
    }) => {
      const anon = await sesion(client, null, 'anon@example.com')
      const task = await Task.create({
        title: 'Revisar',
        status: 'pending',
        assigneeId: anon.user.id,
      })

      const responsable = await assignee(client, anon.token, task)

      assert.isNull(responsable.fullName)
      assert.isString(responsable.initials)
      assert.isNotEmpty(responsable.initials)
      assert.notProperty(responsable, 'email')
      assert.notInclude(JSON.stringify(responsable), 'anon@example.com')
    })
  }

  test('POST /tasks: la tarea recién creada no filtra el email de quien la crea', async ({
    client,
    assert,
  }) => {
    const ada = await sesion(client, 'Ada Lovelace', 'ada@example.com')

    const response = await client
      .post('/api/v1/tasks')
      .json({ title: 'Revisar el informe' })
      .bearerToken(ada.token)

    response.assertStatus(201)
    const responsable = datos(response).assignee
    assert.equal(responsable.fullName, 'Ada Lovelace')
    assert.equal(responsable.initials, 'AL')
    assert.sameMembers(Object.keys(responsable), CLAVES_DEL_RESPONSABLE)
    assert.notInclude(JSON.stringify(response.body()), 'ada@example.com')
  })

  test('POST /tasks: quien se registró sin nombre crea con nombre nulo e iniciales', async ({
    client,
    assert,
  }) => {
    const anon = await sesion(client, null, 'anon@example.com')

    const response = await client
      .post('/api/v1/tasks')
      .json({ title: 'Revisar el informe' })
      .bearerToken(anon.token)

    response.assertStatus(201)
    const responsable = datos(response).assignee
    assert.isNull(responsable.fullName)
    assert.isNotEmpty(responsable.initials)
    assert.sameMembers(Object.keys(responsable), CLAVES_DEL_RESPONSABLE)
  })

  test('la lista no filtra el email de nadie, tampoco el de las tareas ajenas', async ({
    client,
    assert,
  }) => {
    const ada = await sesion(client, 'Ada Lovelace', 'ada@example.com')
    const alan = await sesion(client, 'Alan Turing', 'alan@example.com')
    const anon = await sesion(client, null, 'anon@example.com')
    for (const { user } of [ada, alan, anon]) {
      await Task.create({ title: `De ${user.id}`, status: 'pending', assigneeId: user.id })
    }

    const response = await client.get('/api/v1/tasks').bearerToken(alan.token)

    response.assertStatus(200)
    const cuerpo = JSON.stringify(response.body())
    for (const email of ['ada@example.com', 'alan@example.com', 'anon@example.com']) {
      assert.notInclude(cuerpo, email)
    }
    for (const tarea of datos(response)) {
      assert.sameMembers(Object.keys(tarea.assignee), CLAVES_DEL_RESPONSABLE)
    }
  })
})
