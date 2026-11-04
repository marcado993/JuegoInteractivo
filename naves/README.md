# NOOB SWARM

Shooter de naves estilo Roblox hecho con **Phaser 3** (Arcade Physics). Naves y enemigos de ladrillos con tachuelas, piloto "noob", monedas y tienda. Sin assets externos: gráficos, efectos y música se generan por código.

## Controles

| Acción | Teclado | Táctil |
|---|---|---|
| Mover | Flechas / WASD | Arrastrar |
| Dash (invulnerable) | Espacio | Botón DASH |
| Disparo | Automático al enemigo más cercano | Automático |
| Tienda | E (teclas 1-5 compran mejoras) | Botón `$` |
| Silenciar | M | - |

## Cómo se juega

- Sobrevive a oleadas de ladrillos: perseguidores, corredores, tanques y artilleros que disparan.
- Cada 5 olas hay un jefe (el Rey Ladrillo) y cambia el mundo.
- Los enemigos sueltan monedas; encadena muertes para el combo (hasta x3 monedas). Los bloques verdes curan.
- Al morir (¡OOF!) conservas tus monedas y mejoras: gasta en la tienda y vuelve más fuerte.
- Tienda: daño, cadencia, vida, velocidad e imán de monedas, y 6 naves con estadísticas distintas (hasta la Arcoíris).
- Monedas, mejoras, nave y mejor ola se guardan en el navegador.

## Estructura

- `index.html`: carga Phaser por CDN y la fuente Fredoka.
- `game.js`: oleadas, jefe, enemigos, tienda, HUD y música.
