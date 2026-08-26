# Feature Specification: Registro de Consumo Dietario a partir de Foto

**Feature Branch**: `001-registro-consumo-foto`

**Created**: 2026-08-22

**Status**: Draft

**Input**: PRD-001: NutraShot — Registro dietario asistido por fotografía (`PRD.md`)

## Clarifications

### Session 2026-08-22

- Q: Al solicitar un nuevo magic link, ¿se invalidan automáticamente los links anteriores no utilizados de ese usuario? → A: Sí, invalidar todos los anteriores al emitir uno nuevo.
- Q: ¿Debe existir un límite de frecuencia (rate limit) para solicitar magic links y para analizar imágenes con el modelo de visión? → A: No, no es necesario un límite explícito en esta versión.
- Q: ¿Existen restricciones de formato o tamaño máximo para la imagen que sube el usuario? → A: Sí, restringir a formatos estándar (JPEG/PNG/WebP) con un tamaño máximo de 10 MB.
- Q: ¿La aplicación debe cumplir algún estándar de accesibilidad formal para esta versión? → A: No es un requisito formal para esta versión.

### Session 2026-08-24 (resolución de checklist `general.md`)

- Q: ¿Se crea automáticamente un `Usuario` la primera vez que alguien solicita un magic link, o requiere alta previa? → A: Sí, alta automática al primer pedido de link.
- Q: ¿Qué muestra el tablero cuando no hay consumos ese día? → A: La dona y los valores en cero.
- Q: ¿Qué muestra "Historial" cuando el usuario no tiene consumos? → A: Un mensaje explícito de estado vacío.
- Q: ¿Cuánto tiempo se retienen los consumos de un usuario? → A: Retención indefinida mientras la cuenta exista.
- Q: ¿Qué pasa si falla el guardado del consumo después de confirmado? → A: Mostrar error y permitir reintentar sin perder los datos ya revisados/editados.
- Q: ¿Qué pasa si el modelo de visión responde en un idioma distinto al Español (LatAm)? → A: Se garantiza vía prompt al modelo (responsabilidad del módulo de IA); sin mecanismo de traducción de respaldo.
- Q: ¿Debe la descripción amigable tener alguna cualidad además de "no vacía"? → A: Debe ser breve y concisa, sin prosa extensa.
- Q: ¿Hay alguna regla sobre las calorías editadas manualmente por el usuario? → A: Deben ser un número no negativo.
- Q: ¿El nivel de confianza es un valor agregado por imagen o uno por alimento? → A: Un único valor agregado por imagen/análisis.
- Q: ¿La regla de que el desglose sume 100% aplica también cuando el usuario lo edita a mano? → A: Sí, aplica siempre, también a la edición manual.
- Q: En carga manual (tras error de procesamiento), ¿el desglose nutricional es obligatorio? → A: Sí, también debe completarse y sumar 100%.
- Q: ¿Se implementa detección de consumos duplicados (misma imagen cargada dos veces)? → A: No, es una decisión deliberada; el usuario puede guardar dos veces si así lo decide.
- Q: ¿El indicador de "baja confianza" se conserva y se muestra en el consumo ya guardado / en el Historial? → A: No, es sólo una guía transitoria durante la carga; una vez guardado el consumo, no se conserva ni se muestra.
- Q: ¿Puede editarse un consumo después de guardado? → A: No, sólo puede eliminarse desde el Historial; la edición sólo existe antes de confirmar el guardado.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Autenticarse y ver el tablero principal (Priority: P1)

Un usuario nuevo o recurrente necesita entrar a la aplicación sin usar contraseña,
y al ingresar quiere ver de inmediato cuánto lleva consumido en el día y cómo
se desglosa nutricionalmente.

**Why this priority**: Sin autenticación y sin un tablero que muestre el estado
actual, ninguna otra funcionalidad es accesible ni tiene sentido para el
usuario. Es la puerta de entrada obligatoria a todo lo demás.

**Independent Test**: Puede probarse de punta a punta pidiendo un link de
acceso con un email válido, ingresando a la aplicación mediante ese link, y
verificando que se muestra el tablero con saludo de bienvenida, el gráfico de
dona (en cero si no hay consumos) y las opciones [Nuevo, Historial, Cerrar
Sesión].

**Acceptance Scenarios**:

1. **Given** un usuario sin sesión vigente, **When** intenta usar la
   aplicación, **Then** el sistema lo redirige a la pantalla de inicio de
   sesión, que sólo muestra el nombre y logo de la app y la opción "Obtener
   link de acceso".
2. **Given** un usuario en la pantalla de inicio de sesión, **When** ingresa su
   email y selecciona "Obtener link de acceso", **Then** el sistema le envía
   un email con un link de acceso de un solo uso, válido por 15 minutos.
3. **Given** un link de acceso vigente y no utilizado, **When** el usuario lo
   abre, **Then** el sistema lo autentica y lo redirige al tablero principal
   con un saludo de bienvenida.
4. **Given** un link de acceso ya utilizado o con más de 15 minutos de
   emitido, **When** el usuario intenta usarlo, **Then** el sistema rechaza el
   intento e indica que debe solicitar un nuevo link.
5. **Given** un usuario autenticado en el tablero principal, **When** el
   tablero carga, **Then** se muestra un gráfico de dona con el total de
   calorías del día y su desglose en [Carbohidratos, Proteínas, Grasas, Otros
   Nutrientes] en porcentajes enteros que suman exactamente 100%.
6. **Given** un usuario autenticado sin actividad durante 8 horas continuas,
   **When** intenta realizar cualquier acción, **Then** el sistema exige
   volver a autenticarse mediante un nuevo link de acceso.
7. **Given** un usuario en el tablero principal, **When** selecciona "Cerrar
   Sesión" y confirma, **Then** el sistema finaliza su sesión y lo redirige a
   la pantalla de inicio de sesión.
8. **Given** un usuario que solicita un magic link por primera vez con un
   email que no tiene cuenta previa, **When** el sistema procesa la
   solicitud, **Then** crea automáticamente una cuenta de usuario asociada a
   ese email, sin requerir un paso de registro separado.
9. **Given** un usuario autenticado sin ningún consumo cargado en el día
   actual, **When** el tablero carga, **Then** el gráfico de dona y el total
   de calorías se muestran en cero.

---

### User Story 2 - Registrar un consumo fotografiando el plato (Priority: P1)

Un usuario quiere, al momento de sentarse a comer, sacar una foto de su plato
y obtener en segundos una estimación de los alimentos, calorías y desglose
nutricional, poder corregirla si hace falta, y guardarla en su registro.

**Why this priority**: Es el valor central del producto — sin este flujo no
existe la propuesta de "registrar comidas a partir de una foto", y es lo que
reemplaza el registro manual tedioso que el PRD busca evitar.

**Independent Test**: Puede probarse tomando una foto de un plato con la
opción "Nuevo" → cámara, y verificando que en menos de 10 segundos se muestra
una descripción de los alimentos, las calorías estimadas y el desglose
nutricional, editable, y que al confirmar el consumo queda guardado y el
tablero se actualiza al instante.

**Acceptance Scenarios**:

1. **Given** un usuario en el tablero principal, **When** elige "Nuevo" y toma
   una foto con la cámara del dispositivo, **Then** el sistema muestra un
   indicador de procesamiento mientras analiza la imagen.
2. **Given** una imagen recién capturada, **When** el sistema la analiza,
   **Then** consulta internamente un modelo de visión vía la API de Google AI
   Studio (imagen + prompt), sin exponer en la interfaz detalles técnicos de
   esa consulta (endpoint, payload, nombre del modelo).
3. **Given** un análisis de imagen exitoso, **When** el sistema termina de
   procesarla, **Then** muestra una descripción amigable no vacía de los
   alimentos identificados (mencionando la bebida si está presente), la
   cantidad de calorías estimada, y el desglose nutricional en las 4
   categorías en porcentajes enteros que suman exactamente 100%.
4. **Given** una estimación mostrada al usuario, **When** se despliega,
   **Then** el sistema incluye una nota recordando que la información puede
   ser inexacta.
5. **Given** una estimación con confianza menor o igual al 70%, **When** se muestra al
   usuario, **Then** el sistema advierte que es una estimación de baja
   confianza, ofrece la opción de cargar una nueva imagen, y exige al usuario
   editar manualmente la descripción y las calorías antes de poder guardar.
6. **Given** una estimación mostrada (de cualquier nivel de confianza),
   **When** el usuario la revisa, **Then** puede editar la descripción, las
   calorías y el desglose antes de guardar el consumo.
7. **Given** un análisis que falla o tarda más de 30 segundos, **When** ocurre,
   **Then** el sistema muestra un mensaje de error y permite al usuario cargar
   manualmente la descripción y las calorías del consumo.
8. **Given** un usuario que confirma y guarda un nuevo consumo, **When** el
   guardado se completa, **Then** el sistema lo redirige al tablero principal
   y actualiza el gráfico de dona instantáneamente con el consumo incluido.
9. **Given** un usuario en cualquier paso del flujo de carga (selección de
   imagen, error, carga manual, o revisión de estimación), **When** selecciona
   "Cancelar", **Then** el sistema lo redirige al tablero principal sin
   guardar ningún dato.
10. **Given** una imagen ya procesada (con éxito o con error), **When** el
    procesamiento termina, **Then** ninguna copia de la imagen original queda
    persistida en el backend (disco, base de datos o logs).
11. **Given** un usuario que confirma el guardado de un consumo, **When** el
    guardado falla (p. ej. por un error de red o de base de datos), **Then**
    el sistema muestra un mensaje de error y permite reintentar el guardado
    sin perder la descripción, calorías y desglose ya revisados o editados en
    pantalla.

---

### User Story 3 - Registrar un consumo desde una imagen de la galería (Priority: P2)

Un usuario que ya tiene una foto de su plato guardada (por ejemplo, tomada
minutos antes) quiere registrar ese consumo sin volver a fotografiar el plato.

**Why this priority**: Es una variante de entrada del mismo flujo central
(User Story 2); agrega flexibilidad pero no es imprescindible para validar la
propuesta de valor principal.

**Independent Test**: Puede probarse eligiendo "Nuevo" → galería, seleccionando
una imagen existente del dispositivo, y verificando que el análisis, revisión,
edición y guardado se comportan igual que con una foto tomada en el momento.

**Acceptance Scenarios**:

1. **Given** un usuario en el tablero principal, **When** elige "Nuevo" y
   selecciona una imagen preexistente de la galería del dispositivo, **Then**
   el sistema permite agregar un nuevo consumo a partir de esa imagen,
   siguiendo el mismo análisis, revisión y guardado que en User Story 2.
2. **Given** un consumo registrado a partir de una imagen de galería, **When**
   el sistema confirma el registro, **Then** el consumo queda guardado en la
   bitácora diaria del usuario igual que uno originado en cámara.

---

### User Story 4 - Consultar el historial de consumos (Priority: P2)

Un usuario quiere revisar qué comió en días, semanas o meses anteriores para
hacer seguimiento de su alimentación a lo largo del tiempo.

**Why this priority**: Da valor de seguimiento longitudinal una vez que ya
existen consumos registrados; depende de que User Story 2 (o 3) haya generado
datos, por lo que se prioriza después del flujo de carga.

**Independent Test**: Puede probarse con un usuario que tiene consumos
guardados en distintas fechas, ingresando a "Historial" y verificando que se
listan sólo sus propios consumos, ordenados de más reciente a más antiguo y
agrupados jerárquicamente por semana, mes y año.

**Acceptance Scenarios**:

1. **Given** un usuario autenticado, **When** ingresa a la opción "Historial",
   **Then** el sistema muestra únicamente sus propios consumos, cada uno con
   fecha, hora y cantidad de calorías, sin incluir consumos de otros usuarios.
2. **Given** el listado de historial, **When** el usuario navega por él,
   **Then** los consumos aparecen ordenados por fecha y hora en forma
   descendente, separados jerárquicamente por semana, mes y año.
3. **Given** un usuario autenticado, **When** intenta acceder (por ejemplo,
   manipulando la URL o el identificador) a un consumo que pertenece a otro
   usuario, **Then** el sistema deniega el acceso y no expone esos datos.
4. **Given** un usuario autenticado sin ningún consumo cargado, **When**
   ingresa a la opción "Historial", **Then** el sistema muestra un mensaje
   explícito indicando que todavía no registró consumos, en lugar de una
   pantalla en blanco.
5. **Given** un consumo ya guardado, **When** el usuario lo visualiza desde el
   Historial, **Then** el sistema no ofrece ninguna opción para editar sus
   datos (sólo eliminarlo); la edición sólo está disponible antes de
   confirmar el guardado (ver User Story 2, escenario 6).

---

### User Story 5 - Eliminar un consumo del historial (Priority: P3)

Un usuario quiere borrar un consumo que cargó por error o que ya no quiere
que forme parte de su registro.

**Why this priority**: Es una acción de corrección secundaria sobre datos ya
existentes; útil pero no bloqueante para el valor principal del producto.

**Independent Test**: Puede probarse desde "Historial", eliminando un consumo
propio, confirmando la acción, y verificando que desaparece del listado y ya
no se contabiliza en el tablero del día correspondiente.

**Acceptance Scenarios**:

1. **Given** un usuario viendo su historial, **When** intenta eliminar uno de
   sus propios consumos visible en pantalla, **Then** el sistema inicia el
   proceso de eliminación de ese consumo.
2. **Given** una eliminación en curso, **When** el sistema pide confirmación,
   **Then** también advierte que la acción es irreversible, y sólo elimina el
   consumo si el usuario confirma.

---

### Edge Cases

- ¿Qué pasa si el usuario sube una imagen en un formato no soportado o que
  supera los 10 MB? El sistema la rechaza con un mensaje claro antes de
  enviarla al modelo de visión, sin consumir la llamada a la API.
- ¿Qué pasa si el usuario deniega el permiso de cámara o galería del
  dispositivo? El sistema debe explicar que el permiso es necesario y cómo
  habilitarlo desde la configuración del dispositivo.
- ¿Qué pasa si el análisis de imagen falla internamente o supera los 30
  segundos? El sistema muestra un error y ofrece carga manual (User Story 2,
  escenario 7).
- ¿Qué pasa si la estimación resulta de baja confianza (≤ 70%)? El sistema
  advierte, ofrece recargar imagen, y exige edición manual antes de guardar
  (User Story 2, escenario 5).
- ¿Qué pasa si el link de acceso expira (> 15 min) o ya fue usado? El sistema
  rechaza el intento y pide solicitar uno nuevo (User Story 1, escenario 4).
- ¿Qué pasa si la sesión permanece inactiva 8 horas? El sistema exige
  reautenticación (User Story 1, escenario 6).
- ¿Qué pasa si el email con el link de acceso demora o cae en spam? Queda
  fuera del control directo del sistema; se espera un proveedor de email
  transaccional confiable (ver Assumptions).
- ¿Qué pasa si el usuario cancela a mitad del flujo de carga de un consumo,
  en cualquier paso? El sistema vuelve al tablero principal sin persistir
  nada (User Story 2, escenario 9).
- ¿Qué pasa si un usuario intenta ver, editar o eliminar un consumo de otro
  usuario? El sistema deniega el acceso en todos los casos (User Story 4,
  escenario 3).
- ¿Qué pasa si falla el guardado de un consumo ya confirmado (p. ej. corte de
  red o error de base de datos)? El sistema muestra un error y permite
  reintentar sin perder los datos ya revisados/editados (User Story 2,
  escenario 11).
- ¿Qué pasa si un usuario carga dos consumos casi simultáneos a partir de la
  misma imagen? El sistema no detecta ni impide duplicados: cada guardado
  confirmado por el usuario es una decisión válida (ver Assumptions).

## Requirements *(mandatory)*

### Functional Requirements

**Autenticación y sesión**

- **FR-001**: El sistema MUST exigir autenticación antes de permitir el uso de
  cualquier funcionalidad de la aplicación. (RF-01)
- **FR-002**: Antes de autenticarse, el sistema MUST mostrar únicamente el
  nombre y logo de la app y la opción "Obtener link de acceso". (RF-02)
- **FR-003**: El sistema MUST permitir iniciar sesión únicamente mediante un
  link de acceso (magic link) enviado por email; no debe existir login o
  registro por contraseña. (RF-03)
- **FR-003a**: Al solicitar un magic link con un email que no tiene cuenta
  asociada, el sistema MUST crear automáticamente una cuenta de usuario para
  ese email, sin exigir un paso de registro separado.
- **FR-004**: El link de acceso MUST ser de un solo uso: una vez utilizado, el
  sistema MUST invalidarlo y rechazar cualquier intento posterior. (RF-34)
- **FR-004a**: Al emitir un nuevo link de acceso para un usuario, el sistema
  MUST invalidar automáticamente cualquier link anterior no utilizado de ese
  mismo usuario, de forma que sólo el último emitido pueda usarse para
  iniciar sesión.
- **FR-005**: El link de acceso MUST expirar a los 15 minutos de emitido.
  (RNF-01)
- **FR-006**: La sesión MUST expirar tras 8 horas de inactividad, exigiendo
  reautenticación. (RNF-06)
- **FR-007**: El sistema MUST permitir cerrar sesión, pidiendo confirmación
  antes de finalizarla. (RF-17)

**Tablero principal**

- **FR-008**: Tras autenticarse, el sistema MUST mostrar un tablero principal
  con saludo de bienvenida. (RF-04)
- **FR-009**: El tablero MUST mostrar un gráfico de dona con el total de
  calorías consumidas en el día actual y su desglose nutricional agregado en
  las categorías [Carbohidratos, Proteínas, Grasas, Otros Nutrientes],
  calculado a partir de la suma de los consumos del día. (RF-05)
- **FR-010**: El desglose nutricional MUST expresarse en porcentajes enteros
  (sin decimales) cuya suma sea exactamente 100%. (RF-14)
- **FR-011**: El tablero MUST mostrar una sección de acciones con las
  opciones [Nuevo, Historial, Cerrar Sesión]. (RF-06)
- **FR-012**: Al guardar un nuevo consumo, el sistema MUST actualizar el
  gráfico de dona del tablero instantáneamente. (RF-24)

**Registro de un nuevo consumo**

- **FR-013**: El sistema MUST permitir agregar un nuevo consumo a partir de
  una foto tomada en el momento con la cámara del dispositivo. (RF-07)
- **FR-014**: El sistema MUST permitir agregar un nuevo consumo a partir de
  una imagen preexistente de la galería del dispositivo. (RF-09)
- **FR-015**: El sistema MUST registrar el consumo resultante (de cámara o de
  galería) en la bitácora de consumos diarios del usuario. (RF-08, RF-10)
- **FR-015a**: El sistema MUST aceptar únicamente imágenes en formatos
  estándar (JPEG, PNG o WebP) de hasta 10 MB, y MUST rechazar con un mensaje
  claro cualquier archivo que no cumpla estos límites antes de enviarlo al
  modelo de visión.
- **FR-016**: El sistema MUST analizar la imagen provista consultando
  internamente un modelo de visión a través de la API de Google AI Studio,
  enviando la imagen y un prompt con los datos a extraer. (RF-11)
- **FR-017**: El sistema MUST mostrar una descripción amigable, breve y
  concisa (no vacía, de hasta 120 caracteres, sin prosa extensa) de los
  alimentos identificados, mencionando la bebida si está presente. (RF-12)
- **FR-018**: El sistema MUST mostrar la cantidad de calorías estimada a
  partir del análisis de la imagen. (RF-13)
- **FR-019**: Mientras se procesa la imagen, el sistema MUST mostrar un
  indicador gráfico de procesamiento. (RF-18)
- **FR-020**: El sistema MUST ocultar en la interfaz los detalles técnicos de
  la consulta al modelo de visión (endpoint, payload, nombre del modelo).
  (RF-19)
- **FR-021**: El tiempo máximo de procesamiento de una imagen MUST ser de 30
  segundos; superado ese límite o ante un error interno, el sistema MUST
  mostrar un mensaje de error. (RF-20, RNF-04)
- **FR-022**: El procesamiento completo de una imagen (desde la carga hasta
  mostrar los datos estimados) MUST completarse en menos de 10 segundos (p95)
  bajo condiciones normales de red 4G. (RNF-02)
- **FR-023**: Ante un error de procesamiento, el sistema MUST permitir al
  usuario hacer una carga manual de la descripción, cantidad de calorías y
  desglose nutricional del consumo; el desglose cargado manualmente MUST
  sumar exactamente 100% en las 4 categorías, igual que uno generado por el
  modelo. (RF-21)
- **FR-024**: El sistema MUST permitir al usuario editar la descripción, las
  calorías y el desglose obtenidos antes de guardar el consumo. Las calorías
  (estimadas o editadas) MUST ser un número no negativo, y el desglose
  nutricional editado MUST seguir sumando exactamente 100% en sus 4
  categorías. (RF-22)
- **FR-024a**: Si el guardado de un consumo ya confirmado por el usuario
  falla (p. ej. error de red o de base de datos), el sistema MUST mostrar
  un mensaje de error y MUST permitir reintentar el guardado sin que el
  usuario pierda la descripción, calorías y desglose ya revisados o
  editados en pantalla (ver User Story 2, escenario 11).
- **FR-025**: Al guardar un nuevo consumo, el sistema MUST redirigir al
  usuario al tablero principal. (RF-23)
- **FR-026**: El sistema MUST recordar al usuario, junto a cada estimación,
  que la información puede ser inexacta. (RF-25)
- **FR-027**: El sistema MUST calcular un único nivel de confianza agregado
  por imagen analizada (no uno por cada alimento identificado dentro de la
  misma imagen), y MUST clasificar la estimación como de baja confianza
  cuando ese valor agregado sea menor o igual al 70%, advirtiendo al usuario
  en ese caso. (RF-26, RNF-03)
- **FR-028**: Ante una estimación de baja confianza, el sistema MUST ofrecer
  al usuario la opción de cargar una nueva imagen. (RF-27)
- **FR-029**: Ante una estimación de baja confianza, el sistema MUST exigir al
  usuario editar manualmente la descripción y la cantidad de calorías antes
  de poder guardar el consumo. (RF-28)
- **FR-030**: El sistema MUST permitir cancelar la creación de un nuevo
  consumo en cualquier paso del flujo, volviendo al tablero principal sin
  guardar ningún dato. (RF-35)
- **FR-031**: El sistema MUST garantizar que ninguna imagen provista por el
  usuario quede persistida en el backend (disco, base de datos o logs), sea
  cual sea el resultado del procesamiento. (RNF-07)

**Historial**

- **FR-032**: El sistema MUST permitir visualizar un resumen de los propios
  consumos cargados a lo largo del tiempo, mostrando fecha, hora y cantidad
  de calorías. (RF-15)
- **FR-033**: El historial MUST presentarse separado jerárquicamente por
  semanas, meses y años, ordenado de más reciente a más antiguo. (RF-16)
- **FR-034**: El sistema MUST permitir eliminar cualquiera de los propios
  consumos visibles en el historial, pidiendo confirmación previa y
  advirtiendo que la acción es irreversible. (RF-29, RF-30, RF-31)
- **FR-034a**: Una vez guardado, un consumo MUST NOT poder editarse: desde el
  Historial sólo se ofrece la opción de eliminarlo. La edición de la
  descripción, calorías y desglose sólo está disponible antes de confirmar el
  guardado (ver FR-024).

**Seguridad y accesos**

- **FR-035**: El sistema MUST garantizar que un usuario autenticado sólo
  pueda visualizar, editar o eliminar los consumos asociados a su propia
  cuenta, incluso ante intentos de acceso directo por URL o identificador.
  (RF-32)

**Idioma**

- **FR-036**: El sistema MUST presentar toda la interfaz y las descripciones
  generadas por el modelo de visión en Español (Latinoamérica). (RF-33)

### Key Entities

- **Usuario**: Persona autenticada que usa la aplicación. Se identifica por
  su email; la cuenta se crea automáticamente en el primer pedido de magic
  link para ese email. Tiene una sesión activa (con expiración por
  inactividad) y es dueño exclusivo de sus propios consumos.
- **Consumo**: Registro de una comida cargada por un usuario. Incluye fecha y
  hora, descripción de los alimentos (y bebida, si aplica), calorías
  (estimadas o editadas, siempre un número no negativo) y desglose
  nutricional en 4 categorías (porcentajes enteros que suman 100%). No
  conserva el nivel de confianza de la estimación original: ese indicador es
  transitorio, sólo se usa para guiar la revisión y edición antes de guardar
  (ver FR-027 a FR-029), y no forma parte del consumo ya guardado. Pertenece
  a un único usuario, y una vez guardado sólo puede eliminarse, no editarse.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Un usuario puede pasar de tomar la foto de su plato a ver el
  consumo estimado en pantalla en menos de 10 segundos de interacción (p95)
  bajo red 4G.
- **SC-002**: El 100% de las imágenes provistas por usuarios dejan de existir
  en el backend inmediatamente después de terminado su procesamiento, exitoso
  o no.
- **SC-003**: Un usuario puede autenticarse y llegar al tablero principal
  usando únicamente su email y un link de acceso, sin crear ni recordar
  ninguna contraseña.
- **SC-004**: El desglose nutricional mostrado en el tablero y en cada
  consumo suma exactamente 100% en sus 4 categorías, en el 100% de los casos.
- **SC-005**: Un usuario puede ubicar cualquier consumo propio cargado en los
  últimos 12 meses navegando el historial jerárquico (semana/mes/año), sin
  necesidad de un buscador.
- **SC-006**: El sistema advierte al usuario en el 100% de los casos en que
  la confianza de una estimación es menor o igual al 70%.
- **SC-007**: En el 100% de los intentos de acceso a un consumo ajeno (por
  URL o identificador manipulado), el sistema deniega el acceso.
- **SC-008**: Un usuario puede cancelar la carga de un nuevo consumo en
  cualquier paso del flujo sin que quede ningún dato guardado.

## Assumptions

- No se implementará un límite de frecuencia (rate limiting) explícito sobre
  la solicitud de magic links ni sobre el análisis de imágenes en esta
  versión; queda como decisión deliberada, no como omisión.
- Existe un proveedor de email transaccional confiable para el envío de
  magic links; su elección específica queda fuera de esta especificación.
- El modelo de visión (Gemini `gemini-3.1-flash-lite` vía Google AI Studio)
  está disponible y responde en un formato del que se puede extraer
  descripción, calorías, desglose nutricional y nivel de confianza.
- Los usuarios acceden principalmente desde dispositivos móviles con cámara,
  bajo resoluciones entre 240p y 4K.
- El agrupamiento del historial por semana/mes/año usa la zona horaria del
  dispositivo del usuario.
- Los consumos de un usuario se retienen indefinidamente mientras la cuenta
  exista; no hay expiración ni archivado automático de datos históricos.
- El sistema no implementa detección ni prevención de consumos duplicados
  (p. ej. la misma imagen cargada dos veces): cada guardado confirmado por el
  usuario se acepta como una decisión válida.
- El requisito de idioma (Español Latinoamérica, FR-036) se garantiza
  mediante el prompt enviado al modelo de visión, como responsabilidad del
  módulo de IA aislado; no existe un mecanismo de traducción de respaldo si
  el modelo no lo respetara.
- No se exige cumplimiento formal de un estándar de accesibilidad (p. ej.
  WCAG) en esta versión; se espera HTML semántico razonable, pero sin
  auditoría de accesibilidad como criterio de aceptación.
- Quedan fuera de alcance (ver PRD, sección "Fuera de Alcance"): metas de
  consumo diario/semanal, login por contraseña, gráficas históricas
  avanzadas, export/import de datos, borrado de cuenta, planes de
  suscripción o pagos, RBAC configurable, multi-tenant, y soporte
  multi-idioma (la app funciona únicamente en Español Latinoamérica).
