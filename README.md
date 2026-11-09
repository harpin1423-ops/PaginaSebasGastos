# Sebas Control Pro — Finanzas, Pedidos, Envíos y Rentabilidad Shopify (COP)

Plataforma web profesional de gestión financiera, logística y de inventario diseñada específicamente para tiendas **Shopify en Colombia** que operan con **Contraentrega (COD)** y **Pago Anticipado (Wompi, PSE, Nequi, ADDI, Tarjetas)**.

## Características Principales

1. **Resumen Ejecutivo & Estado de Resultados (P&L Real en Tiempo Real)**
   - **Separación de Ventas Facturadas vs. Ingresos Efectivos (Entregados y Cobrados)** y dinero **En Tránsito / Por Recaudar**.
   - **Utilidad Neta Real (Libre)**: Descuenta automáticamente el costo de mercancía (COGS) de pedidos entregados, fletes de entrega, **pérdida por fletes de devoluciones (RTS)**, comisiones de pasarela, gasto publicitario (**Meta Ads / TikTok Ads**) y gastos operativos de Shopify.
   - **Efectividad por Transportadora**: Comparativa automática entre *Coordinadora, Interrapidísimo, Servientrega, Envía y Domicilio Local*.
   - **Alertas Operativas**: Aviso inmediato de guías en **Novedad** para gestión por WhatsApp, productos con stock bajo y devoluciones en tránsito a bodega.

2. **Gestión de Pedidos Shopify & Estado de Envíos**
   - Filtros instantáneos por modalidad (`Contraentrega COD` / `Pago Anticipado`), estado de envío (`Pendiente Despacho`, `En Tránsito`, `En Reparto`, `Novedad`, `Entregado`, `Devuelto`) y transportadora.
   - **Cambio rápido de estado en tabla**: Al marcar un pedido como `Entregado` o `Devuelto`, el sistema actualiza automáticamente el estado del recaudo, genera el registro en el módulo de Devoluciones (RTS) y recalcula la utilidad neta.
   - **Botón directo a WhatsApp del cliente**: Abre conversación con mensaje prellenado incluyendo número de pedido `#SH-...`, producto y número de guía.

3. **Centro de Devoluciones (RTS), Novedades y Reembolsos**
   - Control de fletes perdidos por paquetes no recibidos en contraentrega.
   - **Reintegro a Stock en 1 clic**: Cuando el paquete devuelto llega físicamente a la bodega, suma la unidad de vuelta al inventario disponible con un solo clic.

4. **Control de Gastos & Publicidad Digital (Ads)**
   - Registro de inversión en **Meta Ads / TikTok Ads** (cálculo automático de **ROAS Real** y **CPA por pedido**), mensualidad de Shopify, apps, empaques y proveedores.

5. **Catálogo de Productos, Inventario & Calculadora Unit Economics (CPA / ROAS)**
   - Control de stock por SKU con ajuste rápido (`+` / `-`).
   - **Simulador de Rentabilidad y Punto de Equilibrio**: Calcula la utilidad esperada por pedido despachado ponderando el porcentaje estimado de devolución (RTS) y el CPA de pauta publicitaria.

6. **Importación y Exportación CSV de Shopify + Respaldo JSON**
   - Importa archivos `.csv` de pedidos de Shopify o mediante la plantilla incluida.
   - Exporta reportes a Excel (`.csv`) y copias de seguridad completas (`.json`).

## Estructura del Proyecto

- `index.html`: Estructura semántica de la aplicación y modales operativos.
- `index.css`: Sistema de diseño en Vanilla CSS con soporte de tema Claro y Oscuro.
- `data.js`: Capa de persistencia (`localStorage`), formateo en Pesos Colombianos (`COP`) y datos iniciales.
- `app.js`: Motor contable P&L, gráficos en Canvas, simulador Unit Economics e importador/exportador CSV.
