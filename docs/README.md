# Documentación de Arena

| | Documento | Para quién |
|---|---|---|
| **01** | [Instalación en otro PC](01-instalacion.md) | Quien monta el proyecto en un ordenador nuevo |
| **02** | [Manual de usuario](02-manual-de-usuario.md) | Todo el grupo |
| **03** | [Arquitectura](03-arquitectura.md) | Quien vaya a modificar el código |
| **04** | [Modelo de datos](04-modelo-de-datos.md) | Quien vaya a modificar el código |
| **05** | [Cómo se calcula todo](05-estadisticas.md) | Todo el grupo, y quien toque las fórmulas |
| **06** | [Despliegue](06-despliegue.md) | Quien lo mantiene |
| **07** | [Guía de desarrollo](07-guia-de-desarrollo.md) | Quien vaya a modificar el código |
| **08** | [Datos externos y APIs](08-datos-externos.md) | Quien vaya a modificar el código |
| **09** | [Mantenimiento](09-mantenimiento.md) | Quien lo mantiene |
| **10** | [Solución de problemas](10-solucion-de-problemas.md) | Cualquiera, cuando algo falla |
| **11** | [Novedades de la v0.3.0](11-v0.3.0.md) | Quien venga de una versión anterior |
| **12** | [Antigravity y entornos dev/prod](12-antigravity.md) | Quien desarrolle con un agente |
| **13** | [Plan de rendimiento](13-plan-rendimiento.md) | **Obligatorio antes de tocar `data.ts`** |

---

## Por dónde empezar

**Si vas a instalarlo:** [01](01-instalacion.md) → [06](06-despliegue.md).

**Si solo vas a usarlo:** [02](02-manual-de-usuario.md), y [05](05-estadisticas.md) cuando
alguien discuta un desempate.

**Si vas a tocar el código:** [03](03-arquitectura.md) → [04](04-modelo-de-datos.md) →
[07](07-guia-de-desarrollo.md). Y [13](13-plan-rendimiento.md) antes de tocar `src/lib/data.ts`.

**Si algo se ha roto:** [10](10-solucion-de-problemas.md).
