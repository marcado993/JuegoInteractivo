# OBBY RUSH

Obby infinito estilo Roblox hecho con **Phaser 3** (Arcade Physics). Sin assets externos: gráficos, efectos y música se generan por código.

## Controles

| Acción | Teclado | Táctil |
|---|---|---|
| Mover | Flechas / A D | Botones `<` `>` |
| Saltar | Espacio / ↑ / W (mantén para saltar más alto) | Botón `^` |
| Tienda | E (o 1-4 para comprar) | Botón `$` |
| Volver al checkpoint | R | - |
| Silenciar | M | - |

## Cómo se juega

- Corre y salta entre plataformas sin caer a la lava. Cada 7 plataformas hay una bandera: es tu checkpoint y sube la etapa.
- El nivel es infinito y se hace más difícil: plataformas que se desmoronan, pinchos, plataformas móviles, trampolines y barras giratorias.
- Junta monedas y encadena etapas sin morir para activar la racha (monedas x2 con 3 etapas, x3 con 6).
- En la tienda mejora el salto, la velocidad, el imán de monedas, el doble salto y el color de tu avatar.
- Tu progreso (monedas, mejoras, color y mejor etapa) se guarda en el navegador.

## Estructura

- `index.html`: carga Phaser por CDN y la fuente Fredoka.
- `game.js`: generación procedural del nivel, física, tienda, HUD y música.
