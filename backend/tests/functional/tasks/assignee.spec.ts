import Task from '#models/task'
import User from '#models/user'
import { test } from '@japa/runner'
import testUtils from '@adonisjs/core/services/test_utils'

/**
 * Lo que cada tarea muestra de su responsable. Cubre los tres scenarios del
 * requisito «Lo que cada tarea muestra de su responsable» de
 * `openspec/specs/tasks/spec.md`: el responsable se identifica por nombre e
 * iniciales, no se filtra ningún otro dato de su cuenta, y una cuenta sin nombre
 * sigue llegando con iniciales.
 *
 * El aislamiento es una transacción global y no un truncate, por el mismo motivo
 * que en `auth/signup.spec.ts`: la suite pega contra el fichero SQLite del
 * servidor de desarrollo. Por eso la lista puede traer tareas que no son de este
 * test, y cada uno busca la suya por id en vez de contar filas.
 */
test.group('Tasks | responsable', (group) => {
  group.each.setup(() => testUtils.db().withGlobalTransaction())

  /**
   * Día de referencia para `GET /tasks/:id`, que lo exige. El vencimiento no es
   * lo que se prueba aquí: cualquier día válido sirve.
   */
  const today = '2026-11-10'

  /**
   * Quien mira la lista. Es una cuenta distinta del responsable a propósito: el
   * requisito es poder saber quién lleva una tarea ajena, no reconocerse a uno
   * mismo.
   */
  async function sesion(client: any) {
    await User.create({
      fullName: 'Grace Hopper',
      email: 'grace@example.com',
      password: 'secreto123',
    })

    const response = await client
      .post('/api/v1/auth/login')
      .json({ email: 'grace@example.com', password: 'secreto123' })

    return response.body().data.token as string
  }

  async function tareaDe(fullName: string | null, email: string) {
    const responsable = await User.create({ fullName, email, password: 'secreto123' })
    return Task.create({
      title: 'Revisar el informe',
      status: 'pending',
      assigneeId: responsable.id,
    })
  }

  /**
   * La misma tarea tal y como la devuelven las dos lecturas del scenario: dentro
   * de la lista y suelta.
   */
  async function lecturas(client: any, token: string, tarea: Task) {
    const lista = await client.get('/api/v1/tasks').header('Authorization', `Bearer ${token}`)
    lista.assertStatus(200)

    const suelta = await client
      .get(`/api/v1/tasks/${tarea.id}`)
      .qs({ today })
      .header('Authorization', `Bearer ${token}`)
    suelta.assertStatus(200)

    const enLaLista = lista.body().data.find((t: { id: number }) => t.id === tarea.id)

    return { lista: enLaLista, suelta: suelta.body().data }
  }

  test('el responsable llega con su nombre y sus iniciales', async ({ client, assert }) => {
    const token = await sesion(client)
    const tarea = await tareaDe('Ada Lovelace', 'ada@example.com')

    const { lista, suelta } = await lecturas(client, token, tarea)

    assert.exists(lista, 'la tarea no aparece en la lista')
    for (const [donde, recibida] of Object.entries({ lista, suelta })) {
      assert.equal(recibida.assignee.fullName, 'Ada Lovelace', `nombre en ${donde}`)
      assert.equal(recibida.assignee.initials, 'AL', `iniciales en ${donde}`)
    }
  })

  test('la tarea no trae el email ni ningún otro dato de la cuenta', async ({ client, assert }) => {
    const token = await sesion(client)
    const tarea = await tareaDe('Ada Lovelace', 'ada@example.com')

    // «Cualquier tarea» es cualquier respuesta que devuelva una: además de las
    // dos lecturas, la creación y el cambio de estado también la devuelven, con
    // su responsable incluido.
    const { lista, suelta } = await lecturas(client, token, tarea)

    const creada = await client
      .post('/api/v1/tasks')
      .header('Authorization', `Bearer ${token}`)
      .json({ title: 'Otra tarea' })
    creada.assertStatus(201)

    const cambiada = await client
      .patch(`/api/v1/tasks/${tarea.id}/status`)
      .header('Authorization', `Bearer ${token}`)
      .json({ status: 'in_progress' })
    cambiada.assertStatus(200)

    const respuestas = {
      'GET /tasks': lista,
      'GET /tasks/:id': suelta,
      'POST /tasks': creada.body().data,
      'PATCH /tasks/:id/status': cambiada.body().data,
    }

    // Se recorren todas antes de afirmar nada, para que el fallo diga a la vez
    // cuáles filtran y no solo la primera que lo haga.
    //
    // Lo permitido es la forma de `TaskAssigneeTransformer`: nombre, iniciales
    // y el id con el que la lista distingue a dos personas que se llamen igual.
    // Cualquier otra clave (email, fechas de la cuenta, hash...) es un dato de
    // cuenta que no pinta junto a la tarea.
    const permitidas = ['fullName', 'id', 'initials']
    const sobrantes: Record<string, string[]> = {}
    for (const [donde, recibida] of Object.entries(respuestas)) {
      const extra = Object.keys(recibida?.assignee ?? {}).filter((k) => !permitidas.includes(k))
      if (extra.length > 0) sobrantes[donde] = extra.sort()
    }

    assert.deepEqual(sobrantes, {}, 'datos de cuenta del responsable expuestos junto a la tarea')

    // Y el email no aparece en ninguna parte de la respuesta, ni bajo otra clave.
    for (const [donde, recibida] of Object.entries(respuestas)) {
      assert.notInclude(JSON.stringify(recibida), '@example.com', `email en ${donde}`)
    }
  })

  test('un responsable sin nombre llega con el nombre nulo y con iniciales', async ({
    client,
    assert,
  }) => {
    const token = await sesion(client)
    const tarea = await tareaDe(null, 'ada@example.com')

    const { lista, suelta } = await lecturas(client, token, tarea)

    assert.exists(lista, 'la tarea no aparece en la lista')
    for (const [donde, recibida] of Object.entries({ lista, suelta })) {
      assert.isNull(recibida.assignee.fullName, `nombre en ${donde}`)
      // Sin nombre, las iniciales salen del email: es la regla de
      // `openspec/specs/auth/spec.md`, que ya cubre `auth/initials.spec.ts`.
      assert.equal(recibida.assignee.initials, 'AE', `iniciales en ${donde}`)
    }
  })
})
