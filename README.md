# NEON SWARM

Juego de supervivencia arcade hecho con **Phaser 3** (Arcade Physics). Sin assets externos: gráficos, efectos y música (synthwave a 128 BPM que gana capas con cada ola) se generan por código.

**Jugar:** https://marcado993.github.io/JuegoInteractivo/

## Controles

| Acción | Teclado | Táctil |
|---|---|---|
| Mover | Flechas / WASD | Arrastrar |
| Dash (invulnerable) | Espacio | Botón DASH |
| Disparo | Automático al enemigo más cercano | Automático |
| Silenciar música y efectos | M | - |

## Cómo se juega

- Sobrevive a oleadas cada vez más grandes de enemigos (perseguidores, corredores y tanques).
- Encadena muertes para subir el multiplicador de combo (hasta x8); recibir daño lo reinicia.
- Recoge los orbes verdes para curarte.
- El arma mejora cada dos olas (hasta 5 disparos en abanico).
- El récord se guarda en el navegador (`localStorage`).

## Estructura

- `index.html`: carga Phaser por CDN y el juego.
- `game.js`: configuración, cámara que sigue al jugador, movimiento, enemigos, oleadas y HUD.

## Ejecutar en local

Abre `index.html` con la extensión Live Server de VS Code, o con cualquier servidor estático:

```bash
python -m http.server 8000
```
