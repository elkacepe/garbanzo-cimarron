# Agenda · Comedor Garbanzo Cimarrón

Agenda interna de reservas para un comedor vegano pequeño, con sus mesas, un mesón compartido y un salón privado. Muestra el mes completo de un vistazo y evita que un mismo lugar quede reservado dos veces en un servicio. Está pensada para el celular y funciona desde 360 px de ancho.

---

## 1. Cómo arrancar el proyecto

No hay dependencias que instalar, no hay build y no hace falta Node. Todo el proyecto es un único archivo, `index.html`, con HTML, CSS y JavaScript sin frameworks.

**Opción rápida.** Abrí `index.html` con doble clic en Chrome, Safari o Firefox.

**Opción recomendada.** Levantá un servidor local, que se parece más a cómo va a funcionar publicado:

```bash
git clone https://github.com/elkacepe/garbanzo-cimarron.git
cd garbanzo-cimarron
python3 -m http.server 8080
# abrí http://localhost:8080
```

Si preferís Node (cualquier versión 18 o superior), en vez de Python:

```bash
npx serve .
```

**Para probarlo en el celular.** Con el servidor local corriendo, entrá desde el teléfono a `http://IP-de-tu-compu:8080`, con los dos dispositivos en la misma red. También podés activar GitHub Pages en *Settings → Pages → Branch: main / root*.

**Requisitos.** Un navegador actual con `localStorage` habilitado. Las tipografías se cargan desde Google Fonts. Sin conexión, la app usa fuentes de sistema y sigue funcionando.

### Dónde está cada cosa

```
garbanzo-cimarron/
├── index.html   ← toda la app
└── README.md
```

Dentro de `index.html`, los números de línea son aproximados:

| Qué | Dónde |
|---|---|
| Comentario con decisiones clave (clave del panel, clave de storage, duplicados) | Encabezado, líneas 7–20 |
| Estilos (colores en `:root`, tipografías, componentes) | `<style>`, líneas ~25–280 |
| Barra superior y barra de navegación inferior | `<header class="topbar">` y `<nav class="tabbar">`, líneas ~287–305 |
| **Configuración y catálogo**: servicios, propuestas, restricciones, estados | `/* Configuración */`: `SERVICES`, `PROPOSALS`, `RESTRICTIONS`, `STATUS`, `MAX_COVERS` (líneas ~311–336) |
| **Datos de ejemplo** | `/* Semilla */`: `seedResources()` y `makeSeed()` (líneas ~362–418) |
| **Lógica de datos**: lectura y guardado | `/* Persistencia */`: `load()`, `persist()` y `commit()` (líneas ~420–455) |
| **Reglas de cupo**: ocupación, colores, lugares disponibles, horarios | `/* Reglas de cupo */`: `serviceState()`, `serviceUsage()`, `level()`, `resourceOptions()` y `timeSlots()` (líneas ~456–515) |
| Navegación por hash (`#mes-AAAA-MM`, `#dia-AAAA-MM-DD`, `#nueva`, `#reserva-gc-0001`, `#editar-…`, `#panel`) | `/* Navegación */`: `go()` y `render()` (líneas ~524–563) |
| Pantalla 1: Mes | `renderMes()` (línea ~572) |
| Pantalla 2: Día | `renderDia()`, `servicePanel()` y `resourceCard()` (línea ~648) |
| Pantalla 3: Formulario | `renderForm()`, `refreshForm()` y `submitForm()` (línea ~743) |
| Pantalla 4: Ficha de reserva | `renderDetalle()` y `setStatus()` (línea ~890) |
| Pantalla 5: Panel del encargado | `renderPanel()` (línea ~945) |
| Manejo de clics, cambios y envíos de formularios | `/* Eventos */` (línea ~997) |

---

## 2. Qué está simulado y cómo se comporta

| Tema | Qué hace hoy | Dónde conectar lo real |
|---|---|---|
| **Base de datos** | Todo vive en el `localStorage` del navegador, bajo la clave `garbanzo-cimarron.agenda.v1`, como un único JSON: `{version, seq, resources, reservations, blocks}`. No se comparte entre dispositivos ni entre navegadores. | `load()` (lectura) y `persist()` (escritura). Toda modificación pasa por `commit(next)`, que guarda primero y recién después actualiza la pantalla. Para conectar una API, cambiá `persist()` por una llamada al servidor y respetá esa regla. |
| **Correos** | **No se envía ningún correo.** El correo se pide, se guarda y se muestra en la ficha de la reserva. Solo sirve para detectar duplicados. No hay confirmaciones ni recordatorios. | El punto natural es dentro de `submitForm()` y de `setStatus()`, justo después de un `commit()` exitoso. |
| **Pagos y señas** | **No hay pagos, señas ni cobros**, ni simulados. Los precios por persona se muestran solo como referencia, con un total estimado en el resumen del formulario. | No hay punto de conexión previsto. Si se agrega, iría en `submitForm()` antes del `commit()`. |
| **Acceso al panel** | Clave compartida **`garbanzo2026`**, definida en `PANEL_CLAVE`. Se valida en el navegador y queda abierta mientras dure la pestaña (`sessionStorage`, clave `garbanzo-cimarron.panel`). No hay cuentas, alta de usuarios ni recuperación de acceso. **No es seguridad real**: cualquiera puede leer la clave en el código. Solo evita cambios por descuido. | Validación en el `submit` del formulario `#lock`, dentro de `/* Eventos */`. Para algo real hace falta autenticar en un servidor. |
| **Fallo de guardado** | Si `localStorage` falla (navegador sin espacio, modo privado que bloquea), aparece un aviso en rojo. Lo cargado queda en el formulario y no cambia ningún código, cantidad ni estado. | Para probarlo, ejecutá en la consola `window.__simularFalloGuardado = true` y desactivalo con `false`. Ese interruptor está en `persist()`. |
| **Datos ilegibles** | Si el JSON guardado está roto, la app **no lo pisa**. Muestra un aviso y deja restaurar los datos de prueba desde el panel. | `load()`. |
| **Fecha de hoy** | Se toma del reloj del dispositivo, en su zona horaria. | Helper `todayISO()`. |

---

## 3. Datos de ejemplo y cómo reiniciarlos

La semilla se carga **solo la primera vez**, cuando no existe la clave `garbanzo-cimarron.agenda.v1`. Las fechas se calculan a partir del día en que se abre la app, así que el caso del briefing siempre queda en el futuro cercano. Sea **S** el sábado próximo:

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
2. **Desde el navegador.** Abrí la consola y ejecutá:
   ```js
   localStorage.removeItem('garbanzo-cimarron.agenda.v1'); location.reload();
   ```
   Al no encontrar la clave, la app vuelve a cargar la semilla.

En el panel también está **Borrar todas las reservas**, que deja las mesas y los bloqueos. Una lista vacía guardada **no** vuelve a cargar la semilla al recargar.

---

## 4. Decisiones que no estaban en el encargo

- **Qué estados ocupan el lugar.** El encargo nombraba Pendiente y Confirmada. Sumé **Sentada y Finalizada**, para que una mesa que ya comió no se pueda volver a vender en el mismo servicio. Solo Cancelada y No vino liberan el lugar. Se cambia en el objeto `STATUS`.
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
- **Colores** (tokens en `:root` del `<style>`):
  - Fondo: `#F7F1E3`.
  - Primario y texto: `#3B4A2F`.
  - Secundario: `#C4663A`.
  - Negro: `#2A2A22`.
  - Blanco: `#FFFFFF`.
  - Detalles y etiquetas: `#E5B73B` y `#B23A32`.
- **Verde de ocupación**: `#5E7D3E`. Es un verde derivado del primario, para que el punto se distinga del texto.
