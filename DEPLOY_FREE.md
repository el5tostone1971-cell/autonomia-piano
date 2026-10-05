# Publicación gratuita — Autonomía Piano v39

## Opción recomendada para la primera prueba pública
Render permite actualmente desplegar Web Services Node gratuitos y también sitios estáticos gratuitos. Los Web Services gratuitos se duermen después de 15 minutos sin tráfico y su filesystem es efímero.

### Pasos
1. Subir este paquete a un repositorio Git.
2. En Render: **New → Web Service**.
3. Conectar el repositorio.
4. Elegir Docker (el repositorio ya contiene `Dockerfile`).
5. Usar el plan Free para la primera beta.
6. Configurar `AUTONOMIA_SECRET` con un secreto propio.
7. Verificar `/api/v1/health`.
8. Probar registro, login y sincronización.

### Importante sobre los datos
El servidor incluido usa JSON como almacenamiento autónomo para desarrollo y pruebas. No usarlo como base de datos definitiva en una publicación pública porque un Web Service Free puede perder su filesystem al reiniciarse o redeployarse.

Para la beta pública con cuentas persistentes, sustituir el almacenamiento por Postgres/Supabase y mantener la misma API.
