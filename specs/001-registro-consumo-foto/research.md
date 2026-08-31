# Research: Registro de Consumo Dietario a partir de Foto

**Feature**: `001-registro-consumo-foto` | **Fecha**: 2026-08-25

Este documento resuelve las decisiones técnicas necesarias para pasar de la
especificación (`spec.md`) a un diseño concreto, dado que el stack base ya
está fijado por `AGENTS.md` y la constitución (Next.js 15, Node 20 LTS,
PostgreSQL, Vitest, Google AI Studio `gemini-3.1-flash-lite`), pero varias
decisiones de implementación quedaban abiertas.

## 1. Acceso a base de datos

**Decision**: Cliente `pg` (node-postgres) directo, con migraciones SQL
planas versionadas en `lib/db/migrations/`, sin ORM.

**Rationale**: El esquema en alcance son exactamente dos tablas (`usuarios`,
`consumos`; ver constitución, sección "Restricciones del Producto y Stack
Técnico"). Un ORM completo (Prisma, Drizzle) agrega generación de código,
un DSL propio y un paso de build adicional para un esquema que no va a
crecer sin antes pasar por una actualización de PRD. SQL plano es más fácil
de auditar contra los principios III (cero invención de datos) y V
(disciplina de alcance).

**Alternatives considered**: Prisma (rechazado: capa de abstracción y
generación de cliente innecesarias para 2 tablas); Drizzle ORM (rechazado
por el mismo motivo, aunque es más liviano que Prisma).

## 2. Sesión y magic link — modelo de almacenamiento

**Decision**: No se crean tablas adicionales (`sesiones`, `magic_links`).
Los datos de sesión y de magic link viven como columnas en la tabla
`usuarios`:

- `magic_link_token_hash`, `magic_link_expires_at` — el token vigente (si lo
  hay); se sobreescribe al emitir uno nuevo, lo que automáticamente invalida
  cualquier link anterior no usado (FR-004a).
- `session_token_hash`, `session_last_activity_at` — sesión activa (si la
  hay); se actualiza en cada request autenticado para implementar expiración
  por 24h de inactividad (FR-006), y se limpia al cerrar sesión (FR-007).

**Rationale**: La constitución restringe explícitamente el esquema a
`usuarios` y `consumos`; cualquier tabla adicional requeriría actualizar el
PRD primero (Principio V). Un usuario sólo necesita un magic link y una
sesión activos a la vez según la spec (no hay multi-dispositivo en el
alcance), así que columnas simples alcanzan.

**Alternatives considered**: Tablas dedicadas `magic_links` y `sessions`
(rechazado: viola la restricción de esquema de la constitución sin
justificación en el PRD); JWT sin estado en servidor (rechazado: la
invalidación inmediata al cerrar sesión y la expiración por *inactividad*
—no por tiempo fijo— requieren poder invalidar/actualizar del lado del
servidor en cada request, lo que anula la ventaja de "sin estado" de un JWT).

## 3. Formato y seguridad del token de sesión/magic link

**Decision**: Tokens opacos aleatorios (32 bytes, `crypto.randomBytes`,
codificados base64url). Se almacena únicamente su hash SHA-256 en la base;
el valor en claro sólo viaja en el email (magic link) o en una cookie
`httpOnly; Secure; SameSite=Lax` (sesión).

**Rationale**: Buena práctica estándar — si la base de datos se filtra, no
expone tokens utilizables. Bajo costo de implementación, no introduce
dependencias nuevas (`crypto` es built-in de Node).

**Alternatives considered**: Guardar el token en claro (rechazado por
seguridad, aunque no estaba explícitamente exigido por la spec).

## 4. Envío de email transaccional (magic link)

**Decision**: Resend (`resend.com`) vía su SDK de Node (`resend`).

**Rationale**: La spec y el PRD asumen "un proveedor de email transaccional
confiable" sin fijar cuál. Resend tiene una API mínima (una llamada HTTP),
buen soporte para Next.js, y un tier gratuito suficiente para el alcance de
este proyecto. Requiere únicamente `RESEND_API_KEY` y `EMAIL_FROM` como
variables de entorno, consistente con el Principio IV (gestión de
secretos).

**Alternatives considered**: Nodemailer + SMTP propio (rechazado: exige
gestionar credenciales SMTP y mayor superficie de configuración); SendGrid
(rechazado: API más pesada para el volumen esperado). Esta es una decisión
de implementación, no un requisito de negocio — se puede sustituir sin
tocar el resto del sistema si el usuario prefiere otro proveedor.

## 5. Aislamiento de IA (Principio II)

**Decision**: Único módulo `lib/ai/vision.ts`, que expone una función
`analizarImagen(buffer, mimeType): Promise<AnalisisImagen>` y encapsula
el SDK de Google AI Studio (`@google/generative-ai`), el prompt (incluye
instrucción explícita de responder en Español LatAm — FR-036) y el parsing
de la respuesta a la forma interna `{ descripcion, calorias, desglose,
confianza }`. Ningún otro módulo importa el SDK de Google directamente.

**Rationale**: Exigencia directa del Principio II. Permite testear el resto
del sistema con un doble de prueba de `analizarImagen` sin llamar al modelo
real, y aísla el prompt/parsing para que un cambio de proveedor no toque
rutas de API ni UI.

**Alternatives considered**: Ninguna — es un principio no negociable de la
constitución, no una decisión de diseño abierta.

**Actualización 2026-08-28** (post-implementación, durante la
investigación de performance de T059): se agregó
`generationConfig.thinkingConfig.thinkingBudget = 0` a la llamada a
`getGenerativeModel` en `lib/ai/vision.ts`, para deshabilitar el
razonamiento extendido del modelo — hipótesis de que la latencia
medida en T059 (p95 de 31.56s con imágenes de ~500KB, ver
`tasks.md` T059/T059b) venía de un presupuesto de "thinking" alto por
default. Probado empíricamente: la calidad de las estimaciones se
mantuvo igual, pero **no hubo mejora significativa de latencia** — la
causa raíz de la lentitud sigue sin identificarse (ver `BACKLOG.md`).
Se dejó el cambio igual, por ser una configuración razonable por
default para este caso de uso (no se necesita razonamiento extendido
para clasificar comida en una foto) aunque no haya resuelto el
problema.

## 6. Garantía de cero persistencia de imágenes (RNF-07)

**Decision**: La imagen se recibe en el handler de
`POST /api/consumos/analizar` como `multipart/form-data`, se lee a un
`Buffer` en memoria, se pasa directo a `lib/ai/vision.ts`, y se descarta al
retornar la respuesta. Ningún código de la ruta escribe a disco, a la base
de datos, ni loguea el contenido del buffer o su base64. La tabla
`consumos` no tiene ninguna columna capaz de almacenar una imagen (ver
`data-model.md`).

**Rationale**: Cumple RNF-07 / SC-002 por construcción: no existe ningún
código path que persista el buffer. Verificable con una prueba de
integración que haga una petición con una imagen y luego audite que ningún
archivo nuevo aparece en el sistema de archivos ni ninguna fila nueva
referencia contenido binario.

**Alternatives considered**: Persistencia temporal en disco con borrado
posterior (rechazado: introduce una ventana en la que la imagen sí queda
en disco, y riesgo de que un fallo deje el archivo huérfano — viola el
espíritu de RNF-07).

## 7. Visualización del gráfico de dona

**Decision**: Componente propio en SVG/CSS (`components/DonaNutricional.tsx`),
sin librería de charts.

**Rationale**: Se necesita un único tipo de gráfico (una dona de 4
categorías) en dos lugares (tablero y revisión de consumo). Una librería de
charting (Recharts, Chart.js, etc.) agrega una dependencia entera para un
solo componente visual simple, en contra de la política de no introducir
abstracciones más allá de lo que la tarea requiere.

**Alternatives considered**: Recharts (rechazado: peso de dependencia
injustificado para un solo gráfico); Chart.js (mismo motivo).

## 8. Captura de imagen (cámara / galería)

**Decision**: `<input type="file" accept="image/*" capture="environment">`
para cámara, `<input type="file" accept="image/*">` para galería — APIs web
estándar, sin dependencias nativas.

**Rationale**: La app es una web app (Next.js), no una app nativa ni PWA
con requisitos especiales documentados en el PRD. El input file estándar
cubre ambos flujos (US2, US3) en todos los navegadores móviles modernos.

**Alternatives considered**: `getUserMedia` con captura in-app (rechazado:
mayor complejidad de UI y permisos para un beneficio no pedido por la
spec, que sólo exige "tomar una foto con la cámara del dispositivo", lo
que el selector nativo ya resuelve).

## 9. Zona horaria del historial

**Decision**: El agrupamiento jerárquico (semana/mes/año) del historial se
calcula en el cliente, usando la zona horaria del dispositivo del usuario
(`Intl`/`Date` del browser). El servidor almacena `fecha_hora` en UTC
(`timestamptz` de PostgreSQL) y no aplica ninguna conversión.

**Rationale**: Requisito explícito de la spec ("Assumptions": el
agrupamiento usa la zona horaria del dispositivo del usuario).

**Alternatives considered**: Ninguna — es un requisito explícito, no una
decisión abierta.

## 10. Estrategia de testing de rutas API

**Decision**: Vitest invocando los route handlers de Next.js App Router
directamente como funciones async (construyendo un `Request` de prueba),
sin levantar un servidor HTTP real para los tests de contrato/integración.

**Rationale**: Los route handlers de App Router son funciones exportadas
estándar (`export async function POST(req: Request)`), invocables
directamente en Vitest. Evita la complejidad de levantar un servidor Next
sólo para testear, manteniendo los tests rápidos — relevante porque el
Principio I exige TDD estricto en cada endpoint.

**Alternatives considered**: Tests E2E con Playwright contra un servidor
real (fuera de alcance: no pedido por la spec ni por la constitución;
la validación end-to-end manual de cámara/permisos queda cubierta por
`quickstart.md`).

## Nota para la fase de implementación

Antes de escribir código Next.js real, `AGENTS.md` exige leer
`node_modules/next/dist/docs/` una vez el proyecto esté instalado (`npm
install`), porque esta versión de Next.js puede tener cambios respecto al
conocimiento de entrenamiento del agente. Esto no aplica a esta fase de
planificación (no hay código Next.js aún), pero debe respetarse en
`/speckit-implement`.
