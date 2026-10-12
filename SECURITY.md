# Seguridad

Si encuentras una vulnerabilidad (por ejemplo, una forma de leer o alterar las respuestas guardadas en
D1, de saltarse Turnstile o el límite de envíos, o un secreto publicado por error), no abras un issue
público: escribe a **hi@horacioh.com** con los pasos para reproducirlo. Responderé lo antes posible.

## Qué guarda la web

- Solo si el usuario pulsa «Compartir de forma anónima»: el día y las respuestas del cuestionario, en
  la tabla `envios` de Cloudflare D1. Sin IP, cookies, user-agent ni identificadores.
- La IP se usa en memoria para el rate limit y se envía a Cloudflare Turnstile para la comprobación
  antirrobots; no se guarda.

## Secretos

El único secreto del proyecto es `TURNSTILE_SECRET`, guardado como secret del Worker en Cloudflare y
nunca en el repositorio. `.dev.vars` y `.env` están en `.gitignore`. El CI ejecuta
[gitleaks](https://github.com/gitleaks/gitleaks) sobre todo el historial en cada push y PR.
