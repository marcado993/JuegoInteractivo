# NOOB SWARM

Shooter de naves estilo juegos de bloques hecho con **Phaser 3** (Arcade Physics). Naves y enemigos de ladrillos con tachuelas, piloto "noob", monedas y tienda. Sin assets externos: gráficos, efectos y música se generan por código.

> Un piloto noob, armado con una nave hecha de ladrillos, debe frenar al enjambre de Ladrillos Corruptos antes de que el Rey Ladrillo convierta toda la galaxia en un error 404.

La historia completa, los personajes y los mundos están en [`LORE.md`](LORE.md). Dentro del juego se muestran la primera vez que juegas y cuando pulsas **H**.

## Controles

| Acción | Teclado | Táctil |
|---|---|---|
| Mover | Flechas / WASD | Arrastrar |
| Dash (invulnerable) | Espacio | Botón DASH |
| Disparo | Automático al enemigo más cercano | Automático |
| La Fábrica (tienda) | E (teclas 1-5 compran mejoras) | Botón `$` |
| Historia y personajes | H | Texto «H» del menú |
| Silenciar | M | - |

## Cómo se juega

- Sobrevive a oleadas de Ladrillos Corruptos: Bug Menor, Condición de Carrera, Spam y Deuda Técnica.
- Cada 5 olas hay un jefe (el Rey Ladrillo en una versión distinta) y cambia el mundo.
- Los enemigos sueltan monedas; encadena muertes para el combo (hasta x3 monedas). Los bloques verdes curan.
- Al morir (¡OOF!) conservas tus monedas y mejoras: gasta en la Fábrica Automática y vuelve más fuerte.
- La Fábrica: daño, cadencia, vida, velocidad e imán de monedas, y 6 naves con estadísticas distintas (hasta la Arcoíris).
- Monedas, mejoras, nave y mejor ola se guardan en el navegador.

## Estructura

- `index.html`: carga Phaser por CDN y la fuente Fredoka.
- `game.js`: oleadas, jefes, enemigos, Fábrica, HUD, historia y música.
- `LORE.md`: biblia de lore.
