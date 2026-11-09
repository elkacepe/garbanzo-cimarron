# Agenda · Comedor Garbanzo Cimarrón

Agenda interna de reservas para un comedor vegano pequeño: mesas, mesón compartido y salón privado. Muestra el mes completo de un vistazo y evita que un mismo lugar quede reservado dos veces en un servicio. Pensada para el celular (desde 360 px de ancho).

Es un solo archivo, `index.html`, sin dependencias ni build. Para usarla, abrilo en el navegador o publicalo con GitHub Pages.

## Pantallas

1. **Mes**: calendario con lunes como primer día. Cada día muestra dos puntos (izquierda: almuerzo, derecha: cena), coloreados según la ocupación. Abajo, la lista de reservas que falta confirmar.
2. **Día**: los dos servicios en pestañas, con la ocupación, cada mesa (libre o con su reserva), el mesón con sus asientos y las reservas canceladas o que no vinieron.
3. **Formulario**: nueva reserva o edición. Solo ofrece lugares con capacidad suficiente.
4. **Ficha de reserva**: datos de la reserva y cambios de estado.
5. **Panel del encargado**: mesas activas, bloqueos de servicio y datos de prueba. Protegido con clave.

## Reglas

- **Servicios**: almuerzo de 12:30 a 15:30 y cena de 20:00 a 23:30, de martes a domingo. Los lunes está cerrado. Las horas se ofrecen cada 30 minutos y dependen de la duración de la propuesta.
- **Capacidad**: 52 cubiertos por servicio, sumando los recursos activos.
- **Dos formas de reservar**:
  - Las mesas y el Salón del Fondo se reservan enteros: ocupan toda su capacidad aunque vengan menos personas.
  - El Mesón Compartido se reserva por asiento: cada reserva toma solo los que necesita y deja de ofrecerse cuando no alcanzan.
- **Ocupación**: cubiertos ocupados sobre capacidad total del servicio.
  - Verde: hasta 49 %.
  - Amarillo: de 50 % a 84 %.
  - Rojo: de 85 % a 100 %.
  - Gris: cerrado.
  - Rayado: bloqueado.
- **Estados**: Pendiente, Confirmada, Sentada, Finalizada, Cancelada y No vino. Las cuatro primeras ocupan el lugar todo el servicio, sin cálculo por hora. Cancelada y No vino lo liberan enseguida.
- **Duplicados**: no se permite otra reserva activa con la misma combinación de correo + fecha + servicio. El correo se compara sin espacios en los extremos y en minúsculas.
- **Bloqueos**: un servicio bloqueado rechaza reservas nuevas. Las que ya existían se mantienen.

## Datos

- Todo se guarda en `localStorage`, en la clave `garbanzo-cimarron.agenda.v1`.
- La semilla de prueba se carga solo si esa clave no existe. Una lista guardada vacía no vuelve a sembrar.
- Cada cambio se guarda primero y recién después se muestra el éxito. Si el guardado falla, lo cargado sigue en pantalla y no se alteran códigos, cantidades ni estados.
- «Restaurar datos de prueba» pide confirmación y reemplaza solo la clave de esta app.
- Todos los datos son sintéticos y los correos son del dominio `example.com`.

## Clave del panel

La clave es `garbanzo2026` y está definida en la constante `PANEL_CLAVE` de `index.html`.

Es una clave compartida que se valida en el navegador. No hay cuentas, alta de usuarios ni recuperación de acceso, así que no es una protección real: solo evita cambios por descuido.

## Probar el caso del briefing

1. En el mes, el sábado próximo tiene la cena en amarillo (55 %).
2. Entrá al día y abrí la pestaña Cena: el Salón del Fondo dice «Queda libre».
3. Tocalo, poné 12 cubiertos, dejá la reserva en «Pendiente» y guardá. La cena sube al 79 % y sigue en amarillo.
4. El sábado siguiente hay un cumpleaños de 12 confirmado y la cena está en rojo (88 %). Cancelalo: el salón vuelve a quedar libre y la cena baja a amarillo (65 %), sin recargar.

Para simular un fallo de guardado, ejecutá en la consola:

```js
window.__simularFalloGuardado = true
```

## Identidad

- **Tipografías**: DM Serif Display (titulares) y Nunito Sans (texto), desde Google Fonts.
- **Colores**:
  - Fondo: `#F7F1E3`.
  - Primario y texto: `#3B4A2F`.
  - Secundario: `#C4663A`.
  - Negro: `#2A2A22`.
  - Blanco: `#FFFFFF`.
  - Detalles y etiquetas: `#E5B73B` y `#B23A32`.
