# Agenda · Comedor Garbanzo Cimarrón

Agenda interna de reservas para un comedor vegano pequeño, con sus mesas, un mesón compartido y un salón privado. Muestra el mes completo de un vistazo y evita que un mismo lugar quede reservado dos veces en un servicio. Está pensada para el celular y funciona desde 360 px de ancho.

**Previsualización:** https://garbanzo-cimarron.vercel.app/ (Vercel, se actualiza con cada push a `main`).

---

## 1. Cómo arrancar el proyecto

**Stack:** React 19 + TypeScript 5.9 + Tailwind CSS v4, con Vite 8. Tests con Vitest. No hay backend: los datos viven en `localStorage`.

**Requisitos:** Node **22** (indicado en `.nvmrc`). Como mínimo, Node 20.19, que es lo que exige Vite 8. Probado con npm 10.

```bash
git clone https://github.com/elkacepe/garbanzo-cimarron.git
cd garbanzo-cimarron
nvm use              # opcional, toma la versión de .nvmrc
npm install
npm run dev          # http://localhost:5173
```

| Comando | Qué hace |
|---|---|
| `npm run dev` | Levanta la app en local con recarga en caliente. |
| `npm run dev -- --host` | Igual, y además la deja accesible desde el celular en la misma red, en la IP que muestra la consola. |
| `npm test` | Corre los tests de la lógica de cupo, fechas, duplicados y guardado. |
| `npm run typecheck` | Chequea los tipos de TypeScript. |
| `npm run build` | Chequea los tipos y genera la versión publicable en `dist/`. |
| `npm run preview` | Sirve el contenido de `dist/` para probar el build. |

El build usa rutas relativas (`base: './'` en `vite.config.ts`), así que `dist/` se puede publicar tal cual en cualquier hosting estático. Está desplegado en Vercel, que detecta Vite solo (build `npm run build`, salida `dist`) y genera un enlace de previsualización por cada rama o pull request.

Las tipografías se cargan desde Google Fonts en `index.html`. Sin conexión, la app usa fuentes de sistema y sigue funcionando.

### Dónde está cada cosa

```
garbanzo-cimarron/
├── index.html                  ← HTML base: fuentes de Google y el punto de montaje #root
├── vite.config.ts              ← Vite + plugin de React + plugin de Tailwind v4
├── tsconfig.json
├── src/
│   ├── main.tsx                ← arranque: monta <App/> dentro de <AgendaProvider/>
│   ├── App.tsx                 ← elige la pantalla según la ruta y guarda el estado de navegación
│   ├── index.css               ← Tailwind v4: tokens de marca en @theme y utilidades propias
│   ├── types.ts                ← tipos: Resource, Reservation, ServiceBlock, AgendaState
│   ├── lib/                    ← lógica pura, sin React (es lo que cubren los tests)
│   │   ├── catalog.ts          ← servicios, propuestas, restricciones, estados, tope de cubiertos
│   │   ├── capacity.ts         ← reglas de cupo: ocupación, colores, opciones, horarios, duplicados
│   │   ├── dates.ts            ← fechas propias: grilla del mes con lunes primero, formatos
│   │   └── format.ts           ← pesos, plurales
│   ├── data/
│   │   ├── seed.ts             ← datos de ejemplo
│   │   └── storage.ts          ← lectura y guardado en localStorage  ◀ punto de conexión
│   ├── state/
│   │   ├── AgendaContext.tsx   ← estado global, commit (guarda primero, muestra después) y avisos
│   │   └── router.ts           ← navegación por hash, sin librerías
│   ├── components/
│   │   ├── AppShell.tsx        ← barra superior, barra inferior y aviso flotante
│   │   ├── ui.tsx              ← Button, Dot, StatusPill, Banner, EmptyState, Segmented…
│   │   ├── ReservationItem.tsx ← fila de reserva para las listas
│   │   └── StorageBanner.tsx   ← aviso cuando el navegador no deja guardar
│   └── screens/
│       ├── MonthScreen.tsx       ← 1. Calendario mensual
│       ├── DayScreen.tsx         ← 2. Día: servicios, mesas, mesón y salón
│       ├── ReservationForm.tsx   ← 3. Nueva reserva o edición
│       ├── ReservationDetail.tsx ← 4. Ficha y cambios de estado
│       └── PanelScreen.tsx       ← 5. Panel del encargado  ◀ clave del panel
└── tests/
    └── capacity.test.ts        ← 17 tests de reglas de negocio y localStorage
```

**Rutas** (por hash, para que funcionen en cualquier hosting estático):

- `#mes-AAAA-MM`
- `#dia-AAAA-MM-DD`
- `#nueva`
- `#reserva-gc-0001`
- `#editar-gc-0001`
- `#panel`

**Estilos.** Se usan utilidades de Tailwind directamente en los componentes. Los colores del cliente están definidos como tokens en `@theme`, dentro de `src/index.css`, y eso genera clases como `bg-crema`, `text-monte`, `bg-barro`, `text-carbon`, `bg-maiz`, `text-aji`. Para cambiar un color de marca, alcanza con tocarlo en ese archivo.

---

## 2. Qué está simulado y cómo se comporta

| Tema | Qué hace hoy | Dónde conectar lo real |
|---|---|---|
| **Base de datos** | Todo vive en el `localStorage` del navegador, en la clave `garbanzo-cimarron.agenda.v1`. Es un único JSON con la forma `AgendaState` (`{version, seq, resources, reservations, blocks}`). No se comparte entre dispositivos ni entre navegadores. | `src/data/storage.ts`: `loadAgenda()` lee y `saveAgenda()` escribe. Toda modificación pasa por `commit()` en `src/state/AgendaContext.tsx`, que guarda primero y solo si salió bien actualiza la pantalla. Para conectar una API, reemplazá esas dos funciones manteniendo el contrato: `saveAgenda` devuelve `false` si no pudo guardar. Con una API asíncrona, `commit` tendría que esperar la respuesta antes de llamar a `setState`. |
| **Correos** | **No se envía ningún correo.** El correo se pide, se guarda y se muestra en la ficha. Solo sirve para detectar duplicados. No hay confirmaciones ni recordatorios. | `submit()` en `ReservationForm.tsx` y `setStatus()` en `ReservationDetail.tsx`, después de un `commit()` que devuelva `true`. |
| **Pagos y señas** | **No hay pagos, señas ni cobros**, ni simulados. Los precios por persona son solo referencia, con un total estimado en el resumen del formulario. | No hay punto previsto. Si se agrega, iría en `submit()` de `ReservationForm.tsx`, antes del `commit()`. |
| **Acceso al panel** | Clave compartida **`garbanzo2026`**, definida en `PANEL_CLAVE` dentro de `src/screens/PanelScreen.tsx`. Se valida en el navegador y queda abierta mientras dure la pestaña (`sessionStorage`, clave `garbanzo-cimarron.panel`). No hay cuentas, alta de usuarios ni recuperación de acceso. **No es seguridad real**: la clave está en el código que descarga el navegador, así que solo evita cambios por descuido. | Componente `Lock` en `PanelScreen.tsx`. Para algo real hace falta autenticar en un servidor. |
| **Fallo de guardado** | Si `localStorage` falla (sin espacio, modo privado que bloquea), aparece un aviso en rojo, lo cargado queda en el formulario y no cambia ningún código, cantidad ni estado. | Para probarlo, ejecutá en la consola `window.__simularFalloGuardado = true` y desactivalo con `false`. Ese interruptor está en `saveAgenda()`. |
| **Datos ilegibles** | Si el JSON guardado está roto, la app **no lo pisa**. Muestra un aviso y deja restaurar los datos de prueba desde el panel. | `loadAgenda()`. |
| **Fecha de hoy** | Se toma del reloj del dispositivo, en su zona horaria. | `todayISO()` en `src/lib/dates.ts`. |

---

## 3. Datos de ejemplo y cómo reiniciarlos

Están en `src/data/seed.ts`. La semilla se carga **solo la primera vez**, cuando no existe la clave `garbanzo-cimarron.agenda.v1`. Las fechas se calculan a partir del día en que se abre la app, así que el caso del briefing siempre queda en el futuro cercano. Sea **S** el sábado próximo:

**9 recursos, 52 cubiertos por servicio:**

| Recurso | Sector | Capacidad | Forma de reservar |
|---|---|---|---|
| Mesa Ventana 1 | Vereda | 2 | Mesa entera |
| Mesa Ventana 2 | Vereda | 2 | Mesa entera |
| Mesa Jazmín | Salón | 4 | Mesa entera |
| Mesa Romero | Salón | 4 | Mesa entera |
| Mesa Albahaca | Salón | 4 | Mesa entera |
| Mesón Compartido | Salón | 12 asientos | Por asiento |
| Mesa Parra 1 | Patio | 6 | Mesa entera |
| Mesa Parra 2 | Patio | 6 | Mesa entera |
| Salón del Fondo | Privado | 12 | Mesa entera, mínimo 8 personas |

**23 reservas (GC-0001 a GC-0023):**

| Cuándo | Reservas | Ocupación |
|---|---|---|
| S, cena | 7 activas, entre ellas la pareja en Mesa Ventana 1 sin gluten y las 3 amigas en el mesón, más 1 cancelada | 55 %, amarillo. **El Salón del Fondo queda libre.** |
| S, almuerzo | 2 | 11 %, verde |
| S + 7, cena | 9, entre ellas el **cumpleaños de 12 en el Salón del Fondo**, confirmado | 88 %, rojo |
| Miércoles próximo, almuerzo | 2 | Verde |
| S − 7, almuerzo | 2 en el pasado: 1 Finalizada y 1 No vino | — |

**Estados de las 23 reservas:**

- 16 Confirmadas
- 4 Pendientes
- 1 Cancelada
- 1 No vino
- 1 Finalizada

**Restricciones cargadas:**

- 2 sin gluten
- 2 sin soja
- 1 sin frutos secos

**Bloqueos:** 1 servicio bloqueado, el almuerzo del martes S + 3, con motivo «Fumigación del local».

Los nombres son inventados y todos los correos son del dominio `example.com`.

### Cómo volver al estado inicial

1. **Desde la app.** Entrá en *Panel*, poné la clave `garbanzo2026` y tocá **Restaurar datos de prueba**. Pide confirmación y solo reemplaza la clave de esta app.
2. **Desde el navegador.** Abrí la consola (con la app abierta) y ejecutá:
   ```js
   localStorage.removeItem('garbanzo-cimarron.agenda.v1'); location.reload();
   ```
   Al no encontrar la clave, la app vuelve a cargar la semilla.

En el panel también está **Borrar todas las reservas**, que deja las mesas y los bloqueos. Una lista vacía guardada **no** vuelve a cargar la semilla al recargar.

---

## 4. Decisiones que no estaban en el encargo

- **Qué estados ocupan el lugar.** El encargo nombraba Pendiente y Confirmada. Sumé **Sentada y Finalizada**, para que una mesa que ya comió no se pueda volver a vender en el mismo servicio. Solo Cancelada y No vino liberan el lugar. Se cambia en el objeto `STATUS` de `src/lib/catalog.ts`.
- **Duplicados.** Defino la combinación como **correo + fecha + servicio**, entre reservas que ocupan lugar. El correo se compara sin espacios en los extremos y en minúsculas. Se guarda sin esos espacios.
- **Horarios según la propuesta.** Se ofrecen cada 30 minutos, pero solo los que permiten terminar antes del cierre. Por ejemplo, la Mesa de festejo (150 min) en la cena va de 20:00 a 21:00.
- **Mesa de festejo.** Solo se ofrece cuando el lugar elegido es el Salón del Fondo y el servicio es la cena.
- **Tope de cubiertos.** Una reserva admite de 1 a 12 cubiertos, porque 12 es el recurso más grande. No hay reservas que combinen varias mesas.
- **Fechas pasadas.** No se cargan reservas nuevas en días que ya pasaron. Sí se pueden cambiar estados y ver el día.
- **Bloquear con reservas.** Se puede bloquear un servicio que ya tiene reservas. Esas reservas siguen en pie y el panel avisa cuántas hay. No se pueden bloquear lunes, porque ya están cerrados.
- **Mesas inactivas.** Desactivar una mesa la saca de la oferta y de la capacidad total. Sus reservas existentes no se borran y se ven como «fuera de servicio».
- **Transiciones de estado.** Pendiente pasa a Confirmada o a Sentada. Confirmada pasa a Sentada o vuelve a Pendiente. Sentada pasa a Finalizada. Pendiente y Confirmada también pueden pasar a Cancelada o No vino, con confirmación. Cancelada, No vino y Finalizada son finales. Solo se editan reservas Pendientes o Confirmadas.
- **Cálculo de porcentaje.** Para mostrar el porcentaje se redondea hacia abajo, así un 49,9 % se ve como 49 % y queda verde, coherente con el umbral.
- **Día sin reservas.** Se dibuja con anillos verdes en lugar de puntos llenos. Sigue siendo «verde», pero se distingue de un día con poca gente.
- **Tema único claro.** La paleta del cliente es clara, así que no se adapta al modo oscuro del sistema.
- **Sin librerías extra.** Ni router ni librería de fechas: la navegación por hash y el armado del mes están hechos a mano en `src/state/router.ts` y `src/lib/dates.ts`, como pedía el encargo para las fechas.
- **Sin teléfono.** El encargo no lo pedía y así se evita cargar más datos personales.

---

## 5. Reglas de negocio, en corto

- **Servicios**: almuerzo de 12:30 a 15:30 y cena de 20:00 a 23:30, de martes a domingo. Los lunes está cerrado.
- **Dos formas de reservar**:
  - Mesas y Salón del Fondo: se reservan enteros y ocupan toda su capacidad aunque vengan menos personas.
  - Mesón: cada reserva descuenta solo los asientos que usa.
- **Ocupación**: cubiertos ocupados sobre la capacidad de los recursos activos.
  - Verde: hasta 49 %.
  - Amarillo: de 50 % a 84 %.
  - Rojo: de 85 % a 100 %.
  - Gris: cerrado.
  - Rayado: bloqueado.
- **Cupo por servicio**: cada fecha y cada servicio tienen su propio cupo. No hay reinicio manual.

## 6. Probar el caso del briefing

1. En el mes, el sábado próximo tiene la cena en amarillo (55 %).
2. Entrá al día y abrí la pestaña **Cena**: el Salón del Fondo dice «Queda libre».
3. Tocalo, poné 12 cubiertos, dejá la reserva en «Pendiente» y guardá. La cena sube a 79 % y sigue en amarillo.
4. Andá al sábado siguiente, abrí el cumpleaños de 12 y cancelalo. El salón vuelve a quedar libre y la cena pasa de 88 % (rojo) a 65 % (amarillo), sin recargar.

## 7. Identidad

- **Tipografías**: DM Serif Display 400 (titulares) y Nunito Sans (texto).
- **Colores** (tokens en `@theme` de `src/index.css`):
  - Fondo: `#F7F1E3`.
  - Primario y texto: `#3B4A2F`.
  - Secundario: `#C4663A`.
  - Negro: `#2A2A22`.
  - Blanco: `#FFFFFF`.
  - Detalles y etiquetas: `#E5B73B` y `#B23A32`.
- **Verde de ocupación**: `#5E7D3E`. Es un verde derivado del primario, para que el punto se distinga del texto.
