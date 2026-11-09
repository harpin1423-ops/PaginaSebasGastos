/* ==========================================================================
   SEBAS E-COMMERCE & FINANCIAL CONTROL — APPLICATION LOGIC (app.js)
   Real-Time P&L, Orders, COD/Prepaid Tracking, Returns, Ads & Simulator
   ========================================================================== */

let appState = loadAppState();
let currentView = 'dashboard';
let globalPayModelFilter = 'ALL';
let productViewMode = 'table';

const VIEW_METADATA = {
  dashboard: {
    title: 'Resumen Ejecutivo & Estado de Resultados (P&L)',
    subtitle: 'Control financiero en tiempo real: ventas cobradas, contraentrega (COD), pagos anticipados, fletes y pauta publicitaria'
  },
  orders: {
    title: 'Gestión de Pedidos Shopify & Estado de Envíos',
    subtitle: 'Seguimiento de guías por transportadora, recaudo contraentrega, pagos por pasarela y contacto directo por WhatsApp'
  },
  products: {
    title: 'Gestor de Productos, Catálogo Shopify & Control de Inventario',
    subtitle: 'Administración integral de SKUs, precios, márgenes por unidad, valoración de bodega, proveedores y reabastecimiento'
  },
  returns: {
    title: 'Centro de Devoluciones (RTS), Novedades y Reembolsos',
    subtitle: 'Auditoría de paquetes no entregados, pérdida en fletes y reintegro de mercancía a bodega en 1 clic'
  },
  expenses: {
    title: 'Control de Gastos Operativos & Publicidad (Ads)',
    subtitle: 'Registro de campañas en Meta Ads, TikTok Ads, suscripción Shopify, empaques, proveedores y comisiones'
  },
  simulator: {
    title: 'Calculadora de Rentabilidad Unit Economics (CPA / ROAS)',
    subtitle: 'Simulador de punto de equilibrio en pauta publicitaria ponderando tasa de devolución (RTS) y fletes'
  }
};

/* ==========================================================================
   FINANCIAL & OPERATIONAL ENGINE
   ========================================================================== */

/**
 * Calculate real net profit of a single order based on its shipping status
 */
function calculateOrderFinancials(order) {
  const sale = Number(order.saleTotal) || 0;
  const cogs = Number(order.productCostTotal) || 0;
  const ship = Number(order.shippingCost) || 0;
  const fee = Number(order.gatewayFee) || 0;

  if (order.shippingStatus === 'Entregado') {
    return {
      realizedRevenue: sale,
      inTransitRevenue: 0,
      cogsIncurred: cogs,
      shippingIncurred: ship,
      lostReturnShipping: 0,
      gatewayFee: fee,
      netOrderContribution: sale - cogs - ship - fee,
      expectedTransitProfit: 0
    };
  }

  if (order.shippingStatus === 'Devuelto') {
    return {
      realizedRevenue: 0,
      inTransitRevenue: 0,
      cogsIncurred: 0,
      shippingIncurred: 0,
      lostReturnShipping: ship,
      gatewayFee: fee,
      netOrderContribution: -(ship + fee),
      expectedTransitProfit: 0
    };
  }

  // En Tránsito, En Reparto, Novedad, Pendiente Despacho
  return {
    realizedRevenue: 0,
    inTransitRevenue: sale,
    cogsIncurred: 0,
    shippingIncurred: 0,
    lostReturnShipping: 0,
    gatewayFee: fee,
    netOrderContribution: 0,
    expectedTransitProfit: sale - cogs - ship - fee
  };
}

/**
 * Compute aggregate metrics across filtered orders, returns, and expenses
 */
function computeMetrics() {
  const orders = appState.orders.filter(o =>
    globalPayModelFilter === 'ALL' ? true : o.paymentModel === globalPayModelFilter
  );

  let grossSales = 0;
  let realizedRevenue = 0;
  let inTransitRevenue = 0;
  let inTransitProfit = 0;
  let cogsDelivered = 0;
  let shippingDelivered = 0;
  let lostShippingReturns = 0;
  let gatewayFeesTotal = 0;

  let deliveredCount = 0;
  let returnedCount = 0;
  let inTransitCount = 0;
  let noveltyCount = 0;

  orders.forEach(o => {
    grossSales += Number(o.saleTotal) || 0;
    const fin = calculateOrderFinancials(o);
    realizedRevenue += fin.realizedRevenue;
    inTransitRevenue += fin.inTransitRevenue;
    inTransitProfit += fin.expectedTransitProfit;
    cogsDelivered += fin.cogsIncurred;
    shippingDelivered += fin.shippingIncurred;
    lostShippingReturns += fin.lostReturnShipping;
    gatewayFeesTotal += fin.gatewayFee;

    if (o.shippingStatus === 'Entregado') deliveredCount++;
    else if (o.shippingStatus === 'Devuelto') returnedCount++;
    else {
      inTransitCount++;
      if (o.shippingStatus === 'Novedad') noveltyCount++;
    }
  });

  // Expenses breakdown (Ads vs Operational)
  // If filtering by payment model, pro-rate operational/ads spend by order share so P&L stays accurate
  const totalOrdersAll = appState.orders.length || 1;
  const filterRatio = globalPayModelFilter === 'ALL' ? 1 : orders.length / totalOrdersAll;

  let adsSpend = 0;
  let operationalExpenses = 0;
  appState.expenses.forEach(exp => {
    const amt = (Number(exp.amount) || 0) * filterRatio;
    if (exp.category === 'Publicidad (Meta / TikTok Ads)') {
      adsSpend += amt;
    } else {
      operationalExpenses += amt;
    }
  });

  // Refunds from returns
  const refundsTotal = appState.returns.reduce((acc, r) => acc + (Number(r.refundAmount) || 0), 0) * filterRatio;

  const totalDeductions =
    cogsDelivered +
    shippingDelivered +
    lostShippingReturns +
    gatewayFeesTotal +
    adsSpend +
    operationalExpenses +
    refundsTotal;

  const netProfit = realizedRevenue - totalDeductions;
  const netMarginPct = realizedRevenue > 0 ? (netProfit / realizedRevenue) * 100 : 0;

  const closedOrders = deliveredCount + returnedCount;
  const deliveryEffectivenessPct = closedOrders > 0 ? (deliveredCount / closedOrders) * 100 : 0;
  const returnRatePct = closedOrders > 0 ? (returnedCount / closedOrders) * 100 : 0;

  const roasReal = adsSpend > 0 ? realizedRevenue / adsSpend : 0;
  const cpaOrder = orders.length > 0 ? adsSpend / orders.length : 0;

  return {
    ordersCount: orders.length,
    deliveredCount,
    returnedCount,
    inTransitCount,
    noveltyCount,
    grossSales,
    realizedRevenue,
    inTransitRevenue,
    inTransitProfit,
    cogsDelivered,
    shippingDelivered,
    lostShippingReturns,
    gatewayFeesTotal,
    adsSpend,
    operationalExpenses,
    refundsTotal,
    totalDeductions,
    netProfit,
    netMarginPct,
    deliveryEffectivenessPct,
    returnRatePct,
    roasReal,
    cpaOrder
  };
}

/* ==========================================================================
   RENDER FUNCTIONS
   ========================================================================== */

function renderAll() {
  const m = computeMetrics();

  // Update Sidebar Badges & Health
  document.getElementById('badge-orders-count').textContent = appState.orders.length;
  document.getElementById('badge-returns-count').textContent = appState.returns.length;
  document.getElementById('badge-expenses-count').textContent = appState.expenses.length;

  const lowStockCount = appState.products.filter(p => Number(p.stock) <= Number(p.minStock)).length;
  const prodBadge = document.getElementById('badge-low-stock');
  if (prodBadge) {
    prodBadge.textContent = lowStockCount > 0 ? `${appState.products.length} (${lowStockCount}⚠️)` : `${appState.products.length}`;
  }

  document.getElementById('sidebar-delivery-pct').textContent = `${m.deliveryEffectivenessPct.toFixed(0)}%`;
  document.getElementById('sidebar-net-profit').textContent = formatCOP(m.netProfit);
  document.getElementById('sidebar-delivery-bar').style.width = `${Math.min(100, Math.max(8, m.deliveryEffectivenessPct))}%`;

  renderDashboard(m);
  renderOrdersView();
  renderReturnsView();
  renderExpensesView();
  renderProductsView();
  populateProductSelects();
  runSimulator();
}

function renderDashboard(m) {
  // 1. Operational Alerts
  const alertsContainer = document.getElementById('dashboard-alerts-container');
  const noveltyOrders = appState.orders.filter(o => o.shippingStatus === 'Novedad');
  const lowStockProds = appState.products.filter(p => Number(p.stock) <= Number(p.minStock));
  const pendingRestockReturns = appState.returns.filter(r => !r.restocked && r.inventoryResolution === 'En Tránsito a Bodega');

  let alertsHTML = '';
  if (noveltyOrders.length > 0) {
    alertsHTML += `
      <div class="alert-card alert-warning">
        <div class="alert-card-text">
          <strong>⚠️ ${noveltyOrders.length} pedido(s) con Novedad Logística:</strong> Contacta al cliente por WhatsApp hoy para evitar devolución (RTS).
        </div>
        <button type="button" class="btn btn-secondary" onclick="filterOrdersByStatus('Novedad')">Gestionar</button>
      </div>
    `;
  }
  if (lowStockProds.length > 0) {
    alertsHTML += `
      <div class="alert-card alert-danger">
        <div class="alert-card-text">
          <strong>📦 ${lowStockProds.length} producto(s) con Stock Crítico:</strong> ${lowStockProds.map(p => p.name.split(' ').slice(0, 3).join(' ')).join(', ')}.
        </div>
        <button type="button" class="btn btn-secondary" onclick="switchView('products')">Ver Stock</button>
      </div>
    `;
  }
  if (pendingRestockReturns.length > 0) {
    alertsHTML += `
      <div class="alert-card alert-info">
        <div class="alert-card-text">
          <strong>🔄 ${pendingRestockReturns.length} devolución(es) en camino a bodega:</strong> Pendientes por verificar y reintegrar al inventario.
        </div>
        <button type="button" class="btn btn-secondary" onclick="switchView('returns')">Revisar</button>
      </div>
    `;
  }
  alertsContainer.innerHTML = alertsHTML;

  // 2. KPI Cards
  document.getElementById('kpi-orders-total-tag').textContent = `${m.ordersCount} pedidos`;
  document.getElementById('kpi-gross-sales').textContent = formatCOP(m.grossSales);
  document.getElementById('kpi-realized-sales').textContent = formatCOP(m.realizedRevenue);

  document.getElementById('kpi-net-margin-tag').textContent = `${m.netMarginPct.toFixed(1)}% margen`;
  document.getElementById('kpi-net-profit').textContent = formatCOP(m.netProfit);
  const profitPerDelivered = m.deliveredCount > 0 ? m.netProfit / m.deliveredCount : 0;
  document.getElementById('kpi-profit-per-order').textContent = `${formatCOP(profitPerDelivered)} / ent.`;

  document.getElementById('kpi-transit-count-tag').textContent = `${m.inTransitCount} en ruta`;
  document.getElementById('kpi-in-transit-revenue').textContent = formatCOP(m.inTransitRevenue);
  document.getElementById('kpi-in-transit-profit').textContent = formatCOP(m.inTransitProfit);

  document.getElementById('kpi-roas-tag').textContent = `ROAS ${m.roasReal.toFixed(2)}x`;
  document.getElementById('kpi-ads-spend').textContent = formatCOP(m.adsSpend);
  document.getElementById('kpi-cpa-value').textContent = formatCOP(m.cpaOrder);

  document.getElementById('kpi-return-rate-tag').textContent = `${m.returnRatePct.toFixed(1)}% RTS`;
  document.getElementById('kpi-delivery-rate').textContent = `${m.deliveryEffectivenessPct.toFixed(1)}%`;
  document.getElementById('kpi-lost-shipping').textContent = formatCOP(m.lostShippingReturns);

  // 3. P&L Waterfall
  const baseRev = Math.max(m.realizedRevenue, 1);
  const pnlItems = [
    { label: 'Ingresos Efectivos (Pedidos Entregados)', amount: m.realizedRevenue, color: 'hsl(152, 72%, 35%)', pct: 100, sign: '' },
    { label: '(-) Costo de Mercancía Vendida (COGS)', amount: m.cogsDelivered, color: 'hsl(204, 75%, 42%)', pct: (m.cogsDelivered / baseRev) * 100, sign: '- ' },
    { label: '(-) Publicidad Digital (Meta & TikTok Ads)', amount: m.adsSpend, color: 'hsl(34, 88%, 46%)', pct: (m.adsSpend / baseRev) * 100, sign: '- ' },
    { label: '(-) Fletes de Pedidos Entregados', amount: m.shippingDelivered, color: 'hsl(215, 25%, 48%)', pct: (m.shippingDelivered / baseRev) * 100, sign: '- ' },
    { label: '(-) Pérdida por Fletes de Devoluciones (RTS)', amount: m.lostShippingReturns, color: 'hsl(354, 74%, 48%)', pct: (m.lostShippingReturns / baseRev) * 100, sign: '- ' },
    { label: '(-) Comisiones Pasarela + Gastos Operativos Shopify', amount: m.gatewayFeesTotal + m.operationalExpenses + m.refundsTotal, color: 'hsl(215, 20%, 58%)', pct: ((m.gatewayFeesTotal + m.operationalExpenses + m.refundsTotal) / baseRev) * 100, sign: '- ' }
  ];

  const pnlHTML = pnlItems.map(item => `
    <div class="pnl-row">
      <div class="pnl-row-top">
        <span class="pnl-label">${item.label}</span>
        <span class="pnl-amount">${item.sign}${formatCOP(item.amount)} <small style="color:var(--text-muted);">(${item.pct.toFixed(1)}%)</small></span>
      </div>
      <div class="pnl-bar-bg">
        <div class="pnl-bar-fill" style="width:${Math.min(100, Math.max(2, item.pct))}%; background:${item.color};"></div>
      </div>
    </div>
  `).join('') + `
    <div class="pnl-total-box">
      <div>
        <div class="pnl-total-label">UTILIDAD NETA LIBRE (BOLSILLO SEBAS)</div>
        <div style="font-size:0.74rem; color:var(--text-secondary);">Margen neto real sobre recaudo: ${m.netMarginPct.toFixed(1)}%</div>
      </div>
      <div class="pnl-total-value">${formatCOP(m.netProfit)}</div>
    </div>
  `;
  document.getElementById('pnl-waterfall-container').innerHTML = pnlHTML;

  // 4. Carrier Summary Table
  const carriersMap = {};
  appState.orders.forEach(o => {
    const c = o.carrier || 'Sin asignar';
    if (!carriersMap[c]) {
      carriersMap[c] = { total: 0, delivered: 0, transit: 0, returned: 0 };
    }
    carriersMap[c].total++;
    if (o.shippingStatus === 'Entregado') carriersMap[c].delivered++;
    else if (o.shippingStatus === 'Devuelto') carriersMap[c].returned++;
    else carriersMap[c].transit++;
  });

  const carrierRows = Object.entries(carriersMap).map(([name, stats]) => {
    const closed = stats.delivered + stats.returned;
    const eff = closed > 0 ? Math.round((stats.delivered / closed) * 100) : 100;
    const badgeClass = eff >= 80 ? 'status-entregado' : eff >= 65 ? 'status-novedad' : 'status-devuelto';
    return `
      <tr>
        <td class="cell-primary">${name}</td>
        <td class="mono">${stats.total}</td>
        <td class="mono" style="color:var(--color-success); font-weight:600;">${stats.delivered}</td>
        <td class="mono" style="color:var(--color-warning);">${stats.transit}</td>
        <td class="mono" style="color:var(--color-danger);">${stats.returned}</td>
        <td><span class="status-badge ${badgeClass}">${eff}% efectividad</span></td>
      </tr>
    `;
  }).join('');
  document.getElementById('carrier-summary-tbody').innerHTML = carrierRows;

function getProductImage(product) {
  if (!product) {
    return (typeof PRODUCT_DEFAULT_IMAGES !== 'undefined' && PRODUCT_DEFAULT_IMAGES['PRD-01']) || '';
  }
  return (
    product.imageUrl ||
    (typeof PRODUCT_DEFAULT_IMAGES !== 'undefined' && PRODUCT_DEFAULT_IMAGES[product.id]) ||
    (typeof PRODUCT_DEFAULT_IMAGES !== 'undefined' && PRODUCT_DEFAULT_IMAGES['PRD-01']) ||
    ''
  );
}

  // 5. Top Products Table
  const prodStats = appState.products.map(p => {
    const prodOrders = appState.orders.filter(o => o.productId === p.id);
    let unitsSold = 0;
    let revenue = 0;
    let netProdContribution = 0;
    prodOrders.forEach(o => {
      const fin = calculateOrderFinancials(o);
      if (o.shippingStatus === 'Entregado') {
        unitsSold += Number(o.quantity) || 1;
        revenue += fin.realizedRevenue;
      }
      netProdContribution += fin.netOrderContribution;
    });
    return { ...p, unitsSold, revenue, netProdContribution };
  }).sort((a, b) => b.netProdContribution - a.netProdContribution);

  document.getElementById('top-products-tbody').innerHTML = prodStats.map(p => {
    const isLow = Number(p.stock) <= Number(p.minStock);
    return `
      <tr>
        <td>
          <div class="prod-thumb-row">
            <img class="prod-thumb-sm" src="${getProductImage(p)}" alt="${p.name}" loading="lazy" />
            <div>
              <div class="cell-primary">${p.name}</div>
              <div class="cell-sub mono">${p.sku}</div>
            </div>
          </div>
        </td>
        <td class="mono">${p.unitsSold} und.</td>
        <td>
          <span class="status-badge ${isLow ? 'status-devuelto' : 'status-entregado'} mono">
            ${p.stock} disp.
          </span>
        </td>
        <td class="mono">${formatCOP(p.revenue)}</td>
        <td class="mono" style="font-weight:700; color:${p.netProdContribution >= 0 ? 'var(--color-success)' : 'var(--color-danger)'};">
          ${formatCOP(p.netProdContribution)}
        </td>
      </tr>
    `;
  }).join('');

  // 6. Render Canvas Chart
  drawFinanceChart();
}

/* ==========================================================================
   CANVAS FINANCIAL CHART
   ========================================================================== */

function drawFinanceChart() {
  const canvas = document.getElementById('financeChartCanvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const rect = canvas.parentElement.getBoundingClientRect();
  const dpr = window.devicePixelRatio || 1;

  canvas.width = Math.max(300, rect.width) * dpr;
  canvas.height = Math.max(220, rect.height) * dpr;
  ctx.scale(dpr, dpr);

  const width = Math.max(300, rect.width);
  const height = Math.max(220, rect.height);
  ctx.clearRect(0, 0, width, height);

  // Group by date
  const dateMap = {};
  appState.orders.forEach(o => {
    if (globalPayModelFilter !== 'ALL' && o.paymentModel !== globalPayModelFilter) return;
    if (!dateMap[o.date]) dateMap[o.date] = { sales: 0, costs: 0, profit: 0 };
    const fin = calculateOrderFinancials(o);
    const rev = o.shippingStatus === 'Entregado' ? fin.realizedRevenue : fin.inTransitRevenue;
    const cost = (Number(o.productCostTotal) || 0) + (Number(o.shippingCost) || 0) + (Number(o.gatewayFee) || 0);
    dateMap[o.date].sales += rev;
    dateMap[o.date].costs += cost;
    dateMap[o.date].profit += (rev - cost);
  });

  const sortedDates = Object.keys(dateMap).sort();
  if (sortedDates.length === 0) return;

  const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
  const gridColor = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(15,23,42,0.07)';
  const textColor = isDark ? '#94a3b8' : '#64748b';

  const padLeft = 68;
  const padRight = 20;
  const padTop = 28;
  const padBottom = 34;
  const chartW = width - padLeft - padRight;
  const chartH = height - padTop - padBottom;

  let maxVal = 100000;
  sortedDates.forEach(d => {
    maxVal = Math.max(maxVal, dateMap[d].sales, dateMap[d].costs);
  });
  maxVal = Math.ceil(maxVal / 100000) * 100000;

  // Horizontal grid lines
  ctx.font = '500 11px "JetBrains Mono", monospace';
  ctx.fillStyle = textColor;
  const steps = 4;
  for (let i = 0; i <= steps; i++) {
    const val = (maxVal / steps) * (steps - i);
    const y = padTop + (chartH / steps) * i;
    ctx.strokeStyle = gridColor;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(padLeft, y);
    ctx.lineTo(width - padRight, y);
    ctx.stroke();

    const label = val >= 1000 ? `$${Math.round(val / 1000)}k` : '$0';
    ctx.textAlign = 'right';
    ctx.fillText(label, padLeft - 8, y + 4);
  }

  // Draw grouped bars for each date (Ventas vs Costos vs Utilidad)
  const groupWidth = chartW / sortedDates.length;
  const barWidth = Math.min(22, Math.max(8, groupWidth * 0.24));

  sortedDates.forEach((dateStr, idx) => {
    const item = dateMap[dateStr];
    const centerX = padLeft + idx * groupWidth + groupWidth / 2;

    // Sales bar
    const salesH = Math.max(2, (item.sales / maxVal) * chartH);
    ctx.fillStyle = isDark ? 'hsl(158, 70%, 44%)' : 'hsl(162, 85%, 28%)';
    ctx.beginPath();
    ctx.roundRect(centerX - barWidth - 2, padTop + chartH - salesH, barWidth, salesH, [4, 4, 0, 0]);
    ctx.fill();

    // Costs bar
    const costH = Math.max(2, (item.costs / maxVal) * chartH);
    ctx.fillStyle = isDark ? 'hsl(36, 85%, 55%)' : 'hsl(34, 88%, 48%)';
    ctx.beginPath();
    ctx.roundRect(centerX + 2, padTop + chartH - costH, barWidth, costH, [4, 4, 0, 0]);
    ctx.fill();

    // Date label (MM-DD)
    ctx.fillStyle = textColor;
    ctx.textAlign = 'center';
    ctx.fillText(dateStr.slice(5), centerX, height - 10);
  });

  // Legend
  ctx.font = '600 11px "Plus Jakarta Sans", sans-serif';
  ctx.textAlign = 'left';
  ctx.fillStyle = isDark ? 'hsl(158, 70%, 44%)' : 'hsl(162, 85%, 28%)';
  ctx.fillRect(padLeft, 6, 10, 10);
  ctx.fillStyle = textColor;
  ctx.fillText('Ventas (COP)', padLeft + 15, 15);

  ctx.fillStyle = isDark ? 'hsl(36, 85%, 55%)' : 'hsl(34, 88%, 48%)';
  ctx.fillRect(padLeft + 115, 6, 10, 10);
  ctx.fillStyle = textColor;
  ctx.fillText('Costo Prod + Flete', padLeft + 130, 15);
}

/* ==========================================================================
   ORDERS & SHIPPING VIEW
   ========================================================================== */

function getShippingBadgeClass(status) {
  switch (status) {
    case 'Entregado': return 'status-entregado';
    case 'Devuelto': return 'status-devuelto';
    case 'Novedad': return 'status-novedad';
    default: return 'status-transito';
  }
}

function renderOrdersView() {
  const searchVal = (document.getElementById('orders-search-input')?.value || '').toLowerCase().trim();
  const statusFilter = document.getElementById('orders-status-filter')?.value || 'ALL';
  const carrierFilter = document.getElementById('orders-carrier-filter')?.value || 'ALL';

  const allOrders = appState.orders.filter(o =>
    globalPayModelFilter === 'ALL' ? true : o.paymentModel === globalPayModelFilter
  );

  // Mini KPIs for Orders View
  const countEntregado = allOrders.filter(o => o.shippingStatus === 'Entregado').length;
  const countRuta = allOrders.filter(o => ['En Tránsito', 'En Reparto', 'Pendiente Despacho'].includes(o.shippingStatus)).length;
  const countNovedad = allOrders.filter(o => o.shippingStatus === 'Novedad').length;
  const countDevuelto = allOrders.filter(o => o.shippingStatus === 'Devuelto').length;

  document.getElementById('orders-mini-kpis').innerHTML = `
    <div class="kpi-card">
      <div class="kpi-header"><span class="kpi-label">Total Pedidos</span><span class="kpi-tag tag-blue">Shopify</span></div>
      <div class="kpi-value">${allOrders.length}</div>
      <div class="kpi-subtext"><span>Entregados con éxito:</span><strong class="mono">${countEntregado}</strong></div>
    </div>
    <div class="kpi-card">
      <div class="kpi-header"><span class="kpi-label">En Tránsito / Reparto</span><span class="kpi-tag tag-amber">Activos</span></div>
      <div class="kpi-value">${countRuta}</div>
      <div class="kpi-subtext"><span>Seguimiento de guías</span><strong class="mono">En ruta</strong></div>
    </div>
    <div class="kpi-card">
      <div class="kpi-header"><span class="kpi-label">Con Novedad Transportadora</span><span class="kpi-tag tag-crimson">Urgente</span></div>
      <div class="kpi-value" style="color:var(--color-warning);">${countNovedad}</div>
      <div class="kpi-subtext"><span>Requieren gestión WhatsApp</span><strong class="mono">Solucionar hoy</strong></div>
    </div>
    <div class="kpi-card">
      <div class="kpi-header"><span class="kpi-label">Devueltos (RTS)</span><span class="kpi-tag tag-crimson">No Entregados</span></div>
      <div class="kpi-value" style="color:var(--color-danger);">${countDevuelto}</div>
      <div class="kpi-subtext"><span>Controlados en módulo RTS</span><strong class="mono">Revisar stock</strong></div>
    </div>
  `;

  const filtered = allOrders.filter(o => {
    const matchesSearch =
      !searchVal ||
      o.shopifyOrderNumber.toLowerCase().includes(searchVal) ||
      o.customerName.toLowerCase().includes(searchVal) ||
      o.city.toLowerCase().includes(searchVal) ||
      (o.trackingNumber || '').toLowerCase().includes(searchVal) ||
      o.productName.toLowerCase().includes(searchVal);

    const matchesStatus = statusFilter === 'ALL' || o.shippingStatus === statusFilter;
    const matchesCarrier = carrierFilter === 'ALL' || o.carrier === carrierFilter;
    return matchesSearch && matchesStatus && matchesCarrier;
  });

  const tbody = document.getElementById('orders-table-tbody');
  if (filtered.length === 0) {
    tbody.innerHTML = `<tr><td colspan="10" style="text-align:center; padding:2rem; color:var(--text-muted);">No se encontraron pedidos con los filtros seleccionados.</td></tr>`;
    return;
  }

  tbody.innerHTML = filtered.map(o => {
    const fin = calculateOrderFinancials(o);
    const totalCostPlusShip = (Number(o.productCostTotal) || 0) + (Number(o.shippingCost) || 0) + (Number(o.gatewayFee) || 0);
    const displayProfit = o.shippingStatus === 'Entregado'
      ? fin.netOrderContribution
      : o.shippingStatus === 'Devuelto'
        ? fin.netOrderContribution
        : fin.expectedTransitProfit;

    const profitColor = o.shippingStatus === 'Devuelto'
      ? 'var(--color-danger)'
      : o.shippingStatus === 'Entregado'
        ? 'var(--color-success)'
        : 'var(--text-secondary)';

    const waMsg = encodeURIComponent(
      `Hola ${o.customerName}, te escribimos de Sebas Store sobre tu pedido ${o.shopifyOrderNumber} (${o.productName}) enviado por ${o.carrier} con guía ${o.trackingNumber || 'asignada'}.`
    );
    const cleanPhone = (o.customerPhone || '').replace(/\D/g, '');
    const prodObj = appState.products.find(p => p.id === o.productId);

    return `
      <tr>
        <td>
          <div class="cell-primary mono">${o.shopifyOrderNumber}</div>
          <div class="cell-sub mono">${o.date}</div>
        </td>
        <td>
          <div class="cell-primary">${o.customerName}</div>
          <div class="cell-sub">${o.city}</div>
          ${cleanPhone ? `<a href="https://wa.me/${cleanPhone}?text=${waMsg}" target="_blank" rel="noopener" class="whatsapp-link">💬 WhatsApp Cliente</a>` : ''}
        </td>
        <td>
          <div class="prod-thumb-row">
            <img class="prod-thumb-sm" src="${getProductImage(prodObj)}" alt="${o.productName}" loading="lazy" />
            <div>
              <div class="cell-primary">${o.productName}</div>
              <div class="cell-sub mono">Cant: ${o.quantity} und. ${o.notes ? `· ${o.notes}` : ''}</div>
            </div>
          </div>
        </td>
        <td>
          <span class="status-badge ${o.paymentModel.includes('COD') ? 'status-novedad' : 'status-transito'}">${o.paymentModel}</span>
          <div class="cell-sub">${o.paymentMethodDetail} · <strong>${o.paymentStatus}</strong></div>
        </td>
        <td>
          <div class="cell-primary">${o.carrier}</div>
          <div class="cell-sub mono">${o.trackingNumber || 'Sin guía'}</div>
        </td>
        <td>
          <select class="inline-status-select ${getShippingBadgeClass(o.shippingStatus)}" onchange="updateOrderStatusInline('${o.id}', this.value)" aria-label="Cambiar estado de envío">
            <option value="Pendiente Despacho" ${o.shippingStatus === 'Pendiente Despacho' ? 'selected' : ''}>Pendiente Despacho</option>
            <option value="En Tránsito" ${o.shippingStatus === 'En Tránsito' ? 'selected' : ''}>En Tránsito</option>
            <option value="En Reparto" ${o.shippingStatus === 'En Reparto' ? 'selected' : ''}>En Reparto</option>
            <option value="Novedad" ${o.shippingStatus === 'Novedad' ? 'selected' : ''}>⚠️ Novedad</option>
            <option value="Entregado" ${o.shippingStatus === 'Entregado' ? 'selected' : ''}>✅ Entregado</option>
            <option value="Devuelto" ${o.shippingStatus === 'Devuelto' ? 'selected' : ''}>❌ Devuelto</option>
          </select>
        </td>
        <td class="mono cell-primary">${formatCOP(o.saleTotal)}</td>
        <td class="mono">
          <div>${formatCOP(totalCostPlusShip)}</div>
          <div class="cell-sub">Flete: ${formatCOP(o.shippingCost)}</div>
        </td>
        <td class="mono" style="font-weight:700; color:${profitColor};">
          <div>${formatCOP(displayProfit)}</div>
          <div class="cell-sub">${o.shippingStatus === 'Entregado' ? 'Real cobrado' : o.shippingStatus === 'Devuelto' ? 'Pérdida flete' : 'Estimado ruta'}</div>
        </td>
        <td>
          <div style="display:flex; gap:0.35rem;">
            <button type="button" class="btn-icon" onclick="openEditOrderModal('${o.id}')" title="Editar pedido">✏️</button>
            <button type="button" class="btn-icon" onclick="deleteOrder('${o.id}')" title="Eliminar pedido">🗑️</button>
          </div>
        </td>
      </tr>
    `;
  }).join('');
}

/**
 * Inline Shipping Status Change Handler (Syncs Payment Status + Return Record)
 */
window.updateOrderStatusInline = function(orderId, newStatus) {
  const order = appState.orders.find(o => o.id === orderId);
  if (!order) return;

  order.shippingStatus = newStatus;

  if (newStatus === 'Entregado') {
    order.paymentStatus = order.paymentModel.includes('COD') ? 'Recaudado' : 'Pagado';
  } else if (newStatus === 'Devuelto') {
    order.paymentStatus = order.paymentModel.includes('COD') ? 'No Recaudado' : 'Reembolsado';
    // Automatically register in Returns if not already present
    const existingReturn = appState.returns.find(r => r.orderId === order.id);
    if (!existingReturn) {
      appState.returns.unshift({
        id: 'RET-' + Math.floor(100 + Math.random() * 900),
        orderId: order.id,
        shopifyOrderNumber: order.shopifyOrderNumber,
        date: new Date().toISOString().slice(0, 10),
        customerName: order.customerName,
        productId: order.productId,
        productName: order.productName,
        quantity: order.quantity,
        returnType: order.paymentModel.includes('COD') ? 'Devolución COD (RTS)' : 'Reembolso Cliente',
        carrier: order.carrier,
        reason: order.notes || 'Devolución reportada en guía de transportadora',
        lostShippingCost: order.shippingCost,
        refundAmount: 0,
        inventoryResolution: 'En Tránsito a Bodega',
        restocked: false
      });
    }
  } else {
    if (order.paymentModel.includes('COD')) {
      order.paymentStatus = 'Pendiente Recaudo';
    }
  }

  saveAppState(appState);
  renderAll();
  showToast(`Pedido ${order.shopifyOrderNumber} actualizado a "${newStatus}"`);
};

/* ==========================================================================
   RETURNS & RTS VIEW
   ========================================================================== */

function renderReturnsView() {
  const totalLostShipping = appState.returns.reduce((acc, r) => acc + (Number(r.lostShippingCost) || 0), 0);
  const totalRefunds = appState.returns.reduce((acc, r) => acc + (Number(r.refundAmount) || 0), 0);
  const pendingRestock = appState.returns.filter(r => !r.restocked).length;

  document.getElementById('returns-mini-kpis').innerHTML = `
    <div class="kpi-card">
      <div class="kpi-header"><span class="kpi-label">Total Devoluciones</span><span class="kpi-tag tag-crimson">RTS + Garantías</span></div>
      <div class="kpi-value">${appState.returns.length}</div>
      <div class="kpi-subtext"><span>Registradas en el periodo</span><strong class="mono">Auditoría activa</strong></div>
    </div>
    <div class="kpi-card">
      <div class="kpi-header"><span class="kpi-label">Dinero Perdido en Fletes RTS</span><span class="kpi-tag tag-crimson">Impacto P&L</span></div>
      <div class="kpi-value" style="color:var(--color-danger);">${formatCOP(totalLostShipping)}</div>
      <div class="kpi-subtext"><span>Descontado de utilidad neta</span><strong class="mono">Fletes no cobrados</strong></div>
    </div>
    <div class="kpi-card">
      <div class="kpi-header"><span class="kpi-label">Pendientes Reintegrar a Bodega</span><span class="kpi-tag tag-amber">Inventario</span></div>
      <div class="kpi-value">${pendingRestock}</div>
      <div class="kpi-subtext"><span>Paquetes retornando por transportadora</span><strong class="mono">Por recibir</strong></div>
    </div>
    <div class="kpi-card">
      <div class="kpi-header"><span class="kpi-label">Reembolsos Pagados</span><span class="kpi-tag tag-blue">Pasarela</span></div>
      <div class="kpi-value">${formatCOP(totalRefunds)}</div>
      <div class="kpi-subtext"><span>Devoluciones de pago anticipado</span><strong class="mono">Liquidado</strong></div>
    </div>
  `;

  const tbody = document.getElementById('returns-table-tbody');
  if (appState.returns.length === 0) {
    tbody.innerHTML = `<tr><td colspan="10" style="text-align:center; padding:2rem; color:var(--text-muted);">No hay devoluciones registradas.</td></tr>`;
    return;
  }

  tbody.innerHTML = appState.returns.map(r => `
    <tr>
      <td>
        <div class="cell-primary mono">${r.id}</div>
        <div class="cell-sub mono">${r.date}</div>
      </td>
      <td class="mono cell-primary">${r.shopifyOrderNumber}</td>
      <td>${r.customerName}</td>
      <td>
        <div class="cell-primary">${r.productName}</div>
        <div class="cell-sub mono">${r.quantity} unidad(es)</div>
      </td>
      <td>
        <div class="cell-primary">${r.returnType}</div>
        <div class="cell-sub">${r.carrier}</div>
      </td>
      <td>${r.reason}</td>
      <td class="mono" style="color:var(--color-danger); font-weight:600;">- ${formatCOP(r.lostShippingCost)}</td>
      <td class="mono">${formatCOP(r.refundAmount)}</td>
      <td>
        <span class="status-badge ${r.restocked ? 'status-entregado' : 'status-novedad'}">
          ${r.inventoryResolution}
        </span>
      </td>
      <td>
        <div style="display:flex; gap:0.4rem; align-items:center;">
          ${!r.restocked ? `<button type="button" class="btn btn-success-soft" style="padding:0.3rem 0.6rem; font-size:0.74rem;" onclick="restockReturnItem('${r.id}')">+ Reintegrar Stock</button>` : '<span style="font-size:0.74rem; color:var(--text-muted);">✓ En stock</span>'}
          <button type="button" class="btn-icon" onclick="deleteReturn('${r.id}')" title="Eliminar registro">🗑️</button>
        </div>
      </td>
    </tr>
  `).join('');
}

window.restockReturnItem = function(returnId) {
  const ret = appState.returns.find(r => r.id === returnId);
  if (!ret || ret.restocked) return;

  const product = appState.products.find(p => p.id === ret.productId);
  if (product) {
    product.stock = (Number(product.stock) || 0) + (Number(ret.quantity) || 1);
  }
  ret.restocked = true;
  ret.inventoryResolution = 'Reintegrado a Stock';

  saveAppState(appState);
  renderAll();
  showToast(`+${ret.quantity} und. de "${ret.productName}" reintegradas al inventario`);
};

/* ==========================================================================
   EXPENSES & ADS VIEW
   ========================================================================== */

function renderExpensesView() {
  const searchVal = (document.getElementById('expenses-search-input')?.value || '').toLowerCase().trim();
  const catFilter = document.getElementById('expenses-category-filter')?.value || 'ALL';

  const totalExpenses = appState.expenses.reduce((s, e) => s + (Number(e.amount) || 0), 0);
  const totalAds = appState.expenses
    .filter(e => e.category === 'Publicidad (Meta / TikTok Ads)')
    .reduce((s, e) => s + (Number(e.amount) || 0), 0);
  const totalPlatform = appState.expenses
    .filter(e => e.category === 'Plataforma & Apps Shopify')
    .reduce((s, e) => s + (Number(e.amount) || 0), 0);
  const totalLogistics = appState.expenses
    .filter(e => e.category === 'Logística & Empaque')
    .reduce((s, e) => s + (Number(e.amount) || 0), 0);

  document.getElementById('expenses-mini-kpis').innerHTML = `
    <div class="kpi-card">
      <div class="kpi-header"><span class="kpi-label">Total Gastos Registrados</span><span class="kpi-tag tag-crimson">Egresos</span></div>
      <div class="kpi-value">${formatCOP(totalExpenses)}</div>
      <div class="kpi-subtext"><span>Total comprobantes:</span><strong class="mono">${appState.expenses.length}</strong></div>
    </div>
    <div class="kpi-card">
      <div class="kpi-header"><span class="kpi-label">Publicidad Meta & TikTok Ads</span><span class="kpi-tag tag-blue">Ad Spend</span></div>
      <div class="kpi-value">${formatCOP(totalAds)}</div>
      <div class="kpi-subtext"><span>% sobre el gasto total:</span><strong class="mono">${totalExpenses > 0 ? ((totalAds / totalExpenses) * 100).toFixed(0) : 0}%</strong></div>
    </div>
    <div class="kpi-card">
      <div class="kpi-header"><span class="kpi-label">Shopify & Apps</span><span class="kpi-tag tag-amber">Fijos</span></div>
      <div class="kpi-value">${formatCOP(totalPlatform)}</div>
      <div class="kpi-subtext"><span>Suscripciones y herramientas</span><strong class="mono">Mensual</strong></div>
    </div>
    <div class="kpi-card">
      <div class="kpi-header"><span class="kpi-label">Empaque & Operación</span><span class="kpi-tag tag-emerald">Insumos</span></div>
      <div class="kpi-value">${formatCOP(totalLogistics)}</div>
      <div class="kpi-subtext"><span>Bolsas, etiquetas y bodega</span><strong class="mono">Logística</strong></div>
    </div>
  `;

  const filtered = appState.expenses.filter(e => {
    const matchesSearch =
      !searchVal ||
      e.concept.toLowerCase().includes(searchVal) ||
      e.category.toLowerCase().includes(searchVal) ||
      (e.reference || '').toLowerCase().includes(searchVal);
    const matchesCat = catFilter === 'ALL' || e.category === catFilter;
    return matchesSearch && matchesCat;
  });

  const tbody = document.getElementById('expenses-table-tbody');
  tbody.innerHTML = filtered.map(e => `
    <tr>
      <td class="mono">${e.date}</td>
      <td class="cell-primary">${e.concept}</td>
      <td><span class="status-badge status-transito">${e.category}</span></td>
      <td>${e.paymentMethod}</td>
      <td class="mono">${e.reference || '—'}</td>
      <td><span class="status-badge ${e.status === 'Pagado' ? 'status-entregado' : 'status-novedad'}">${e.status}</span></td>
      <td class="mono cell-primary" style="color:var(--color-danger);">- ${formatCOP(e.amount)}</td>
      <td>
        <button type="button" class="btn-icon" onclick="deleteExpense('${e.id}')" title="Eliminar gasto">🗑️</button>
      </td>
    </tr>
  `).join('');
}

/* ==========================================================================
   PRODUCTS, STOCK & UNIT ECONOMICS SIMULATOR
   ========================================================================== */

function renderProductsView() {
  const searchVal = (document.getElementById('products-search-input')?.value || '').toLowerCase().trim();
  const catFilter = document.getElementById('products-category-filter')?.value || 'ALL';
  const fulfillmentFilter = document.getElementById('products-fulfillment-filter')?.value || 'ALL';
  const stockFilter = document.getElementById('products-stock-filter')?.value || 'ALL';

  // Populate dynamic categories in filter select while keeping current selection
  const catSelect = document.getElementById('products-category-filter');
  if (catSelect) {
    const uniqueCats = Array.from(new Set(appState.products.map(p => p.category).filter(Boolean)));
    const prevVal = catSelect.value || 'ALL';
    catSelect.innerHTML = `<option value="ALL">Todas las categorías (${uniqueCats.length})</option>` +
      uniqueCats.map(c => `<option value="${c}">${c}</option>`).join('');
    catSelect.value = uniqueCats.includes(prevVal) ? prevVal : 'ALL';
  }

  // Compute Inventory & Catalog KPIs across all products
  const totalSkus = appState.products.length;
  const activeSkus = appState.products.filter(p => p.status !== 'Inactivo').length;
  const totalUnitsInStock = appState.products.reduce((acc, p) => acc + (Number(p.stock) || 0), 0);
  const inventoryCostValue = appState.products.reduce((acc, p) => acc + ((Number(p.stock) || 0) * (Number(p.costPrice) || 0)), 0);
  const inventoryRetailValue = appState.products.reduce((acc, p) => acc + ((Number(p.stock) || 0) * (Number(p.salePrice) || 0)), 0);
  const potentialStockProfit = appState.products.reduce((acc, p) => {
    const unitNet = (Number(p.salePrice) || 0) - (Number(p.costPrice) || 0) - (Number(p.avgShippingCost) || 0);
    return acc + ((Number(p.stock) || 0) * unitNet);
  }, 0);
  const lowStockCount = appState.products.filter(p => Number(p.stock) > 0 && Number(p.stock) <= Number(p.minStock)).length;
  const outOfStockCount = appState.products.filter(p => Number(p.stock) <= 0).length;

  const kpiContainer = document.getElementById('products-mini-kpis');
  if (kpiContainer) {
    kpiContainer.innerHTML = `
      <div class="kpi-card">
        <div class="kpi-header"><span class="kpi-label">Catálogo & Unidades Bodega</span><span class="kpi-tag tag-blue">${activeSkus}/${totalSkus} Activos</span></div>
        <div class="kpi-value">${totalUnitsInStock} <small style="font-size:0.85rem; font-weight:600; color:var(--text-secondary);">und.</small></div>
        <div class="kpi-subtext"><span>Referencias creadas:</span><strong class="mono">${totalSkus} SKUs</strong></div>
      </div>
      <div class="kpi-card">
        <div class="kpi-header"><span class="kpi-label">Capital Invertido en Stock</span><span class="kpi-tag tag-emerald">Al Costo</span></div>
        <div class="kpi-value">${formatCOP(inventoryCostValue)}</div>
        <div class="kpi-subtext"><span>Valor mercancía en bodega</span><strong class="mono">Costo proveedor</strong></div>
      </div>
      <div class="kpi-card">
        <div class="kpi-header"><span class="kpi-label">Valor Venta Potencial Shopify</span><span class="kpi-tag tag-emerald">PVP Tienda</span></div>
        <div class="kpi-value" style="color:var(--color-success);">${formatCOP(inventoryRetailValue)}</div>
        <div class="kpi-subtext"><span>Margen bruto proyectado:</span><strong class="mono">${formatCOP(potentialStockProfit)}</strong></div>
      </div>
      <div class="kpi-card">
        <div class="kpi-header"><span class="kpi-label">Alertas de Reabastecimiento</span><span class="kpi-tag ${lowStockCount + outOfStockCount > 0 ? 'tag-crimson' : 'tag-emerald'}">Stock</span></div>
        <div class="kpi-value" style="color:${lowStockCount + outOfStockCount > 0 ? 'var(--color-danger)' : 'var(--color-success)'};">${lowStockCount + outOfStockCount} <small style="font-size:0.85rem;">SKUs</small></div>
        <div class="kpi-subtext"><span>Stock bajo: <strong>${lowStockCount}</strong></span><strong class="mono">Agotados: ${outOfStockCount}</strong></div>
      </div>
    `;
  }

  // Filter products
  const filtered = appState.products.filter(p => {
    const matchesSearch =
      !searchVal ||
      p.name.toLowerCase().includes(searchVal) ||
      p.sku.toLowerCase().includes(searchVal) ||
      (p.category || '').toLowerCase().includes(searchVal) ||
      (p.supplier || '').toLowerCase().includes(searchVal);

    const matchesCat = catFilter === 'ALL' || p.category === catFilter;
    const matchesFulfillment = fulfillmentFilter === 'ALL' || (p.fulfillmentType || 'Stock Propio') === fulfillmentFilter;

    const stockNum = Number(p.stock) || 0;
    const minNum = Number(p.minStock) || 5;
    let matchesStock = true;
    if (stockFilter === 'OPTIMAL') matchesStock = stockNum > minNum;
    else if (stockFilter === 'LOW') matchesStock = stockNum > 0 && stockNum <= minNum;
    else if (stockFilter === 'OUT') matchesStock = stockNum <= 0;

    return matchesSearch && matchesCat && matchesFulfillment && matchesStock;
  });

  // Toggle Table vs Cards visibility
  const tableWrap = document.getElementById('products-table-wrap');
  const cardsWrap = document.getElementById('products-cards-wrap');
  if (tableWrap && cardsWrap) {
    tableWrap.style.display = productViewMode === 'table' ? 'block' : 'none';
    cardsWrap.style.display = productViewMode === 'cards' ? 'grid' : 'none';
  }

  const tbody = document.getElementById('products-table-tbody');
  if (!tbody) return;

  if (filtered.length === 0) {
    tbody.innerHTML = `<tr><td colspan="12" style="text-align:center; padding:2rem; color:var(--text-muted);">No se encontraron productos con los filtros aplicados.</td></tr>`;
    if (cardsWrap) {
      cardsWrap.innerHTML = `<div style="grid-column:1/-1; text-align:center; padding:2rem; color:var(--text-muted);">No se encontraron productos con los filtros aplicados.</div>`;
    }
    return;
  }

  // Render Table Rows
  tbody.innerHTML = filtered.map(p => {
    const unitMargin = (Number(p.salePrice) || 0) - (Number(p.costPrice) || 0) - (Number(p.avgShippingCost) || 0);
    const marginPct = p.salePrice > 0 ? (unitMargin / p.salePrice) * 100 : 0;
    const stockNum = Number(p.stock) || 0;
    const minNum = Number(p.minStock) || 5;
    const isOut = stockNum <= 0;
    const isLow = stockNum > 0 && stockNum <= minNum;
    const stockBadgeClass = isOut ? 'status-devuelto' : isLow ? 'status-novedad' : 'status-entregado';
    const stockCostTotal = stockNum * (Number(p.costPrice) || 0);
    const fulfillment = p.fulfillmentType || 'Stock Propio';
    const supplier = p.supplier || 'Bodega Principal';
    const comparePrice = Number(p.compareAtPrice) || 0;

    const prodOrders = appState.orders.filter(o => o.productId === p.id);
    const deliveredUnits = prodOrders.filter(o => o.shippingStatus === 'Entregado').reduce((s, o) => s + (Number(o.quantity) || 1), 0);
    const returnedUnits = prodOrders.filter(o => o.shippingStatus === 'Devuelto').reduce((s, o) => s + (Number(o.quantity) || 1), 0);
    const totalClosed = deliveredUnits + returnedUnits;
    const prodEff = totalClosed > 0 ? Math.round((deliveredUnits / totalClosed) * 100) : 100;

    return `
      <tr>
        <td>
          <div class="prod-thumb-row">
            <img class="prod-thumb-img" src="${getProductImage(p)}" alt="${p.name}" loading="lazy" />
            <div>
              <div class="cell-primary">${p.name}</div>
              <div class="cell-sub mono">${p.sku}</div>
            </div>
          </div>
        </td>
        <td>
          <div class="cell-primary">${p.category}</div>
          <div class="cell-sub">🏭 ${supplier}</div>
        </td>
        <td>
          <span class="status-badge ${fulfillment.includes('Dropi') ? 'status-transito' : 'status-entregado'}">
            ${fulfillment}
          </span>
        </td>
        <td class="mono">${formatCOP(p.costPrice)}</td>
        <td class="mono">
          <div class="cell-primary">${formatCOP(p.salePrice)}</div>
          ${comparePrice > p.salePrice ? `<div class="cell-sub" style="text-decoration:line-through;">Antes: ${formatCOP(comparePrice)}</div>` : ''}
        </td>
        <td class="mono">${formatCOP(p.avgShippingCost)}</td>
        <td class="mono" style="color:${unitMargin >= 0 ? 'var(--color-success)' : 'var(--color-danger)'}; font-weight:700;">
          <div>${formatCOP(unitMargin)}</div>
          <div class="cell-sub">${marginPct.toFixed(1)}% neto/und</div>
        </td>
        <td>
          <div style="display:flex; align-items:center; gap:0.35rem;">
            <button type="button" class="btn-icon" style="padding:0.15rem 0.45rem;" onclick="adjustStock('${p.id}', -1)" title="Restar 1 unidad">−</button>
            <span class="status-badge ${stockBadgeClass} mono">${stockNum} und.</span>
            <button type="button" class="btn-icon" style="padding:0.15rem 0.45rem;" onclick="adjustStock('${p.id}', 1)" title="Sumar 1 unidad">+</button>
          </div>
          <div class="cell-sub">Mínimo alerta: ${minNum} und.</div>
        </td>
        <td class="mono">
          <div class="cell-primary">${formatCOP(stockCostTotal)}</div>
          <div class="cell-sub">PVP: ${formatCOP(stockNum * (Number(p.salePrice) || 0))}</div>
        </td>
        <td class="mono">
          <div><span style="color:var(--color-success); font-weight:600;">${deliveredUnits} ent.</span> / <span style="color:var(--color-danger);">${returnedUnits} dev.</span></div>
          <div class="cell-sub">${prodEff}% efectividad</div>
        </td>
        <td>
          <button type="button" class="status-badge ${p.status === 'Inactivo' ? 'status-pendiente' : 'status-entregado'}" style="border:none; cursor:pointer;" onclick="toggleProductStatus('${p.id}')" title="Clic para cambiar estado Activo/Inactivo">
            ${p.status || 'Activo'}
          </button>
        </td>
        <td>
          <div style="display:flex; gap:0.3rem;">
            <button type="button" class="btn-icon" onclick="openRestockModal('${p.id}')" title="Reabastecer Stock / Entrada a Bodega">📦</button>
            <button type="button" class="btn-icon" onclick="openEditProductModal('${p.id}')" title="Editar producto">✏️</button>
            <button type="button" class="btn-icon" onclick="duplicateProduct('${p.id}')" title="Duplicar producto">📋</button>
            <button type="button" class="btn-icon" onclick="deleteProduct('${p.id}')" title="Eliminar producto">🗑️</button>
          </div>
        </td>
      </tr>
    `;
  }).join('');

  // Render Cards Grid View
  if (cardsWrap) {
    cardsWrap.innerHTML = filtered.map(p => {
      const unitMargin = (Number(p.salePrice) || 0) - (Number(p.costPrice) || 0) - (Number(p.avgShippingCost) || 0);
      const marginPct = p.salePrice > 0 ? (unitMargin / p.salePrice) * 100 : 0;
      const stockNum = Number(p.stock) || 0;
      const minNum = Number(p.minStock) || 5;
      const isOut = stockNum <= 0;
      const isLow = stockNum > 0 && stockNum <= minNum;
      const stockBadgeClass = isOut ? 'status-devuelto' : isLow ? 'status-novedad' : 'status-entregado';
      const stockCostTotal = stockNum * (Number(p.costPrice) || 0);
      const fulfillment = p.fulfillmentType || 'Stock Propio';
      const supplier = p.supplier || 'Bodega Principal';

      const prodOrders = appState.orders.filter(o => o.productId === p.id);
      const deliveredUnits = prodOrders.filter(o => o.shippingStatus === 'Entregado').reduce((s, o) => s + (Number(o.quantity) || 1), 0);

      return `
        <div class="product-manager-card">
          <div class="pm-card-media">
            <img src="${getProductImage(p)}" alt="${p.name}" loading="lazy" />
            <div class="pm-card-badges-overlay">
              <span class="pm-sku-tag">${p.sku}</span>
              <div style="display:flex; gap:0.35rem; align-items:center;">
                <span class="status-badge ${fulfillment.includes('Dropi') ? 'status-transito' : 'status-entregado'}">${fulfillment}</span>
                <span class="status-badge ${stockBadgeClass} mono">${stockNum} und.</span>
              </div>
            </div>
          </div>

          <div>
            <div class="pm-title">${p.name}</div>
            <div class="pm-meta">
              <span>📂 ${p.category}</span>
              <span>·</span>
              <span>🏭 ${supplier}</span>
            </div>
          </div>

          <div class="pm-metrics-grid">
            <div class="pm-metric-item">
              <div class="pm-metric-label">Precio Shopify</div>
              <div class="pm-metric-val">${formatCOP(p.salePrice)}</div>
            </div>
            <div class="pm-metric-item">
              <div class="pm-metric-label">Costo + Flete</div>
              <div class="pm-metric-val">${formatCOP((Number(p.costPrice) || 0) + (Number(p.avgShippingCost) || 0))}</div>
            </div>
            <div class="pm-metric-item">
              <div class="pm-metric-label">Margen Neto / Und</div>
              <div class="pm-metric-val" style="color:var(--color-success);">${formatCOP(unitMargin)} (${marginPct.toFixed(0)}%)</div>
            </div>
            <div class="pm-metric-item">
              <div class="pm-metric-label">Capital en Bodega</div>
              <div class="pm-metric-val">${formatCOP(stockCostTotal)}</div>
            </div>
          </div>

          <div class="pm-footer">
            <div style="display:flex; align-items:center; gap:0.35rem;">
              <button type="button" class="btn-icon" style="padding:0.2rem 0.5rem;" onclick="adjustStock('${p.id}', -1)">−</button>
              <span class="mono" style="font-size:0.76rem; font-weight:600;">Stock: ${stockNum}</span>
              <button type="button" class="btn-icon" style="padding:0.2rem 0.5rem;" onclick="adjustStock('${p.id}', 1)">+</button>
              <span style="font-size:0.72rem; color:var(--text-muted); margin-left:0.25rem;">(${deliveredUnits} vendidos)</span>
            </div>
            <div style="display:flex; gap:0.35rem;">
              <button type="button" class="btn btn-secondary" style="padding:0.3rem 0.55rem; font-size:0.74rem;" onclick="openRestockModal('${p.id}')">📦 +Stock</button>
              <button type="button" class="btn-icon" onclick="openEditProductModal('${p.id}')" title="Editar">✏️</button>
              <button type="button" class="btn-icon" onclick="duplicateProduct('${p.id}')" title="Duplicar">📋</button>
            </div>
          </div>
        </div>
      `;
    }).join('');
  }
}

window.adjustStock = function(productId, delta) {
  const prod = appState.products.find(p => p.id === productId);
  if (!prod) return;
  prod.stock = Math.max(0, (Number(prod.stock) || 0) + delta);
  saveAppState(appState);
  renderAll();
};

window.toggleProductStatus = function(productId) {
  const prod = appState.products.find(p => p.id === productId);
  if (!prod) return;
  prod.status = prod.status === 'Inactivo' ? 'Activo' : 'Inactivo';
  saveAppState(appState);
  renderAll();
  showToast(`Estado de "${prod.name}" cambiado a ${prod.status}`);
};

window.duplicateProduct = function(productId) {
  const orig = appState.products.find(p => p.id === productId);
  if (!orig) return;
  const copy = {
    ...orig,
    id: 'PRD-' + Math.floor(100 + Math.random() * 900),
    sku: `${orig.sku}-COPIA`,
    name: `${orig.name} (Variante)`
  };
  appState.products.unshift(copy);
  saveAppState(appState);
  renderAll();
  showToast(`Producto duplicado como "${copy.sku}"`);
};

function updateProductModalMarginPreview() {
  const cost = Number(document.getElementById('product-cost')?.value) || 0;
  const price = Number(document.getElementById('product-price')?.value) || 0;
  const shipping = Number(document.getElementById('product-shipping')?.value) || 0;
  const margin = price - cost - shipping;
  const pct = price > 0 ? (margin / price) * 100 : 0;

  const valEl = document.getElementById('modal-prod-margin-val');
  const pctEl = document.getElementById('modal-prod-margin-pct');
  if (valEl) {
    valEl.textContent = formatCOP(margin);
    valEl.style.color = margin >= 0 ? 'var(--color-success)' : 'var(--color-danger)';
  }
  if (pctEl) {
    pctEl.textContent = `Margen operativo antes de pauta: ${pct.toFixed(1)}% sobre precio de venta`;
  }
}

function openNewProductModal() {
  document.getElementById('form-product')?.reset();
  document.getElementById('product-id-input').value = '';
  document.getElementById('modal-product-title').textContent = 'Crear Nuevo Producto en Catálogo Shopify';
  const nextSkuNum = 10 + appState.products.length;
  document.getElementById('product-sku').value = `SHP-PROD-${nextSkuNum}`;
  document.getElementById('product-status').value = 'Activo';
  document.getElementById('product-fulfillment').value = 'Stock Propio';
  document.getElementById('product-supplier').value = 'Importadora Mayorista';
  document.getElementById('product-shipping').value = 15500;
  document.getElementById('product-stock').value = 25;
  document.getElementById('product-min-stock').value = 8;
  const defaultImg = getProductImage(null);
  const previewEl = document.getElementById('product-image-preview');
  if (previewEl) previewEl.src = defaultImg;
  const urlEl = document.getElementById('product-image-url');
  if (urlEl) urlEl.value = '';
  updateProductModalMarginPreview();
  openModal('modal-product');
}

window.openRestockModal = function(preselectedProductId) {
  populateProductSelects();
  const select = document.getElementById('restock-product-select');
  if (select && preselectedProductId) {
    select.value = preselectedProductId;
  }
  const prod = appState.products.find(p => p.id === (select?.value || preselectedProductId)) || appState.products[0];
  if (prod) {
    document.getElementById('restock-unit-cost').value = prod.costPrice;
  }
  document.getElementById('restock-quantity').value = 20;
  updateRestockTotalPreview();
  openModal('modal-restock');
};

function updateRestockTotalPreview() {
  const qty = Number(document.getElementById('restock-quantity')?.value) || 0;
  const cost = Number(document.getElementById('restock-unit-cost')?.value) || 0;
  const preview = document.getElementById('restock-total-preview');
  if (preview) {
    preview.textContent = `Total inversión lote (${qty} unidades): ${formatCOP(qty * cost)}`;
  }
}

function runSimulator() {
  const salePrice = Number(document.getElementById('sim-sale-price')?.value) || 0;
  const costPrice = Number(document.getElementById('sim-cost-price')?.value) || 0;
  const shippingCost = Number(document.getElementById('sim-shipping-cost')?.value) || 0;
  const cpaAds = Number(document.getElementById('sim-cpa-ads')?.value) || 0;
  const rtsRatePct = Math.min(90, Math.max(0, Number(document.getElementById('sim-rts-rate')?.value) || 0));

  const deliveryRate = (100 - rtsRatePct) / 100;

  // Profit if delivered = Sale - Cost - Shipping - CPA
  const profitIfDelivered = salePrice - costPrice - shippingCost - cpaAds;
  // Loss if returned (RTS) = Shipping + CPA (product comes back to stock)
  const lossIfReturned = shippingCost + cpaAds;

  // Expected Net Profit per dispatched order = (deliveryRate * (salePrice - costPrice)) - shippingCost - cpaAds
  const expectedGrossContributionBeforeAds = deliveryRate * (salePrice - costPrice) - shippingCost;
  const expectedNetProfit = expectedGrossContributionBeforeAds - cpaAds;

  const breakEvenCPA = Math.max(0, expectedGrossContributionBeforeAds);
  const minRoas = breakEvenCPA > 0 ? salePrice / breakEvenCPA : 0;
  const expectedMarginPct = salePrice > 0 ? (expectedNetProfit / salePrice) * 100 : 0;

  document.getElementById('sim-profit-if-delivered').textContent = formatCOP(profitIfDelivered);
  document.getElementById('sim-loss-if-returned').textContent = `- ${formatCOP(lossIfReturned)}`;
  document.getElementById('sim-breakeven-cpa').textContent = formatCOP(breakEvenCPA);
  document.getElementById('sim-min-roas').textContent = `${minRoas.toFixed(2)}x`;
  document.getElementById('sim-expected-net-profit').textContent = formatCOP(expectedNetProfit);
  document.getElementById('sim-expected-net-profit').style.color =
    expectedNetProfit >= 0 ? 'var(--color-success)' : 'var(--color-danger)';
  document.getElementById('sim-margin-Readout').textContent =
    `Con ${100 - rtsRatePct}% de entrega efectiva · Margen esperado: ${expectedMarginPct.toFixed(1)}%`;
}

/* ==========================================================================
   MODALS, FORMS & CRUD ACTIONS
   ========================================================================== */

function populateProductSelects() {
  const orderProdSelect = document.getElementById('order-product-select');
  const simProdSelect = document.getElementById('sim-product-select');
  const returnOrderSelect = document.getElementById('return-order-select');
  const restockProdSelect = document.getElementById('restock-product-select');

  const prodOptions = appState.products.map(p =>
    `<option value="${p.id}">${p.name} (${formatCOP(p.salePrice)} · Stock: ${p.stock})</option>`
  ).join('');

  if (orderProdSelect) {
    const currentVal = orderProdSelect.value;
    orderProdSelect.innerHTML = prodOptions;
    if (currentVal && appState.products.some(p => p.id === currentVal)) {
      orderProdSelect.value = currentVal;
    }
  }

  if (simProdSelect) {
    const currentSim = simProdSelect.value;
    simProdSelect.innerHTML = `<option value="CUSTOM">-- Personalizado --</option>` + prodOptions;
    if (currentSim) simProdSelect.value = currentSim;
  }

  if (restockProdSelect) {
    const currentRestock = restockProdSelect.value;
    restockProdSelect.innerHTML = prodOptions;
    if (currentRestock && appState.products.some(p => p.id === currentRestock)) {
      restockProdSelect.value = currentRestock;
    }
  }

  if (returnOrderSelect) {
    returnOrderSelect.innerHTML = appState.orders.map(o =>
      `<option value="${o.id}">${o.shopifyOrderNumber} — ${o.customerName} (${o.productName})</option>`
    ).join('');
  }
}

function openModal(modalId) {
  document.getElementById(modalId)?.classList.add('open');
}

function closeModal(modalId) {
  document.getElementById(modalId)?.classList.remove('open');
}

function openNewOrderModal() {
  document.getElementById('modal-order-title').textContent = 'Registrar Nuevo Pedido de Shopify';
  document.getElementById('order-id-input').value = '';
  const nextNum = 1053 + appState.orders.length;
  document.getElementById('order-shopify-num').value = `#SH-${nextNum}`;
  document.getElementById('order-date').value = new Date().toISOString().slice(0, 10);
  document.getElementById('order-customer-name').value = '';
  document.getElementById('order-customer-phone').value = '573';
  document.getElementById('order-city').value = '';
  document.getElementById('order-quantity').value = 1;
  document.getElementById('order-tracking').value = '';
  document.getElementById('order-shipping-status').value = 'En Tránsito';
  document.getElementById('order-notes').value = '';

  syncOrderFormWithProduct();
  openModal('modal-order');
}

window.openEditOrderModal = function(orderId) {
  const o = appState.orders.find(item => item.id === orderId);
  if (!o) return;
  document.getElementById('modal-order-title').textContent = `Editar Pedido ${o.shopifyOrderNumber}`;
  document.getElementById('order-id-input').value = o.id;
  document.getElementById('order-shopify-num').value = o.shopifyOrderNumber;
  document.getElementById('order-date').value = o.date;
  document.getElementById('order-payment-model').value = o.paymentModel;
  document.getElementById('order-customer-name').value = o.customerName;
  document.getElementById('order-customer-phone').value = o.customerPhone;
  document.getElementById('order-city').value = o.city;
  document.getElementById('order-product-select').value = o.productId;
  document.getElementById('order-quantity').value = o.quantity;
  document.getElementById('order-carrier').value = o.carrier;
  document.getElementById('order-tracking').value = o.trackingNumber;
  document.getElementById('order-shipping-status').value = o.shippingStatus;
  document.getElementById('order-sale-total').value = o.saleTotal;
  document.getElementById('order-cost-total').value = o.productCostTotal;
  document.getElementById('order-shipping-cost').value = o.shippingCost;
  document.getElementById('order-payment-detail').value = o.paymentMethodDetail;
  document.getElementById('order-gateway-fee').value = o.gatewayFee;
  document.getElementById('order-notes').value = o.notes || '';
  openModal('modal-order');
};

function syncOrderFormWithProduct() {
  const prodId = document.getElementById('order-product-select')?.value;
  const qty = Number(document.getElementById('order-quantity')?.value) || 1;
  const payModel = document.getElementById('order-payment-model')?.value || 'Contraentrega (COD)';
  const prod = appState.products.find(p => p.id === prodId) || appState.products[0];
  if (!prod) return;

  const saleTotal = prod.salePrice * qty;
  const costTotal = prod.costPrice * qty;
  const shippingCost = prod.avgShippingCost;

  document.getElementById('order-sale-total').value = saleTotal;
  document.getElementById('order-cost-total').value = costTotal;
  document.getElementById('order-shipping-cost').value = shippingCost;

  if (payModel === 'Contraentrega (COD)') {
    document.getElementById('order-payment-detail').value = 'Efectivo al recibir';
    document.getElementById('order-gateway-fee').value = 0;
  } else {
    document.getElementById('order-payment-detail').value = 'Wompi (PSE / Tarjeta)';
    document.getElementById('order-gateway-fee').value = Math.round(saleTotal * 0.032);
  }
}

window.deleteOrder = function(orderId) {
  appState.orders = appState.orders.filter(o => o.id !== orderId);
  saveAppState(appState);
  renderAll();
  showToast('Pedido eliminado correctamente');
};

window.deleteReturn = function(returnId) {
  appState.returns = appState.returns.filter(r => r.id !== returnId);
  saveAppState(appState);
  renderAll();
  showToast('Registro de devolución eliminado');
};

window.deleteExpense = function(expenseId) {
  appState.expenses = appState.expenses.filter(e => e.id !== expenseId);
  saveAppState(appState);
  renderAll();
  showToast('Gasto eliminado');
};

window.openEditProductModal = function(productId) {
  const p = appState.products.find(item => item.id === productId);
  if (!p) return;
  document.getElementById('modal-product-title').textContent = `Editar Producto ${p.sku}`;
  document.getElementById('product-id-input').value = p.id;
  document.getElementById('product-sku').value = p.sku;
  document.getElementById('product-category').value = p.category;
  document.getElementById('product-status').value = p.status || 'Activo';
  document.getElementById('product-name').value = p.name;
  document.getElementById('product-fulfillment').value = p.fulfillmentType || 'Stock Propio';
  document.getElementById('product-supplier').value = p.supplier || 'Proveedor General';
  document.getElementById('product-cost').value = p.costPrice;
  document.getElementById('product-price').value = p.salePrice;
  document.getElementById('product-shipping').value = p.avgShippingCost;
  document.getElementById('product-compare-price').value = p.compareAtPrice || Math.round(p.salePrice * 1.25);
  document.getElementById('product-stock').value = p.stock;
  document.getElementById('product-min-stock').value = p.minStock;
  const imgSrc = getProductImage(p);
  const previewEl = document.getElementById('product-image-preview');
  if (previewEl) previewEl.src = imgSrc;
  const urlEl = document.getElementById('product-image-url');
  if (urlEl) urlEl.value = imgSrc.startsWith('data:') ? '' : imgSrc;
  const fileEl = document.getElementById('product-image-file');
  if (fileEl) fileEl.value = '';
  updateProductModalMarginPreview();
  openModal('modal-product');
};

window.deleteProduct = function(productId) {
  appState.products = appState.products.filter(p => p.id !== productId);
  saveAppState(appState);
  renderAll();
  showToast('Producto eliminado del catálogo');
};

/* ==========================================================================
   NAVIGATION & FILTER HELPERS
   ========================================================================== */

window.switchView = function(viewName) {
  currentView = viewName;
  document.querySelectorAll('.view-panel').forEach(p => p.classList.remove('active'));
  document.getElementById(`view-${viewName}`)?.classList.add('active');

  document.querySelectorAll('.nav-item[data-view]').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.view === viewName);
  });

  if (VIEW_METADATA[viewName]) {
    document.getElementById('current-view-title').textContent = VIEW_METADATA[viewName].title;
    document.getElementById('current-view-subtitle').textContent = VIEW_METADATA[viewName].subtitle;
  }

  document.getElementById('app-sidebar')?.classList.remove('mobile-open');
  if (viewName === 'dashboard') {
    setTimeout(drawFinanceChart, 40);
  }
};

window.filterOrdersByStatus = function(status) {
  switchView('orders');
  const select = document.getElementById('orders-status-filter');
  if (select) {
    select.value = status;
    renderOrdersView();
  }
};

function showToast(message) {
  const container = document.getElementById('toast-container');
  if (!container) return;
  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.innerHTML = `<span>✓</span><span>${message}</span>`;
  container.appendChild(toast);
  setTimeout(() => {
    toast.remove();
  }, 3400);
}

/* ==========================================================================
   CSV IMPORT & EXPORT UTILITIES
   ========================================================================== */

function downloadCSVFile(filename, rows) {
  const csvContent = rows.map(r => r.map(field => `"${String(field ?? '').replace(/"/g, '""')}"`).join(',')).join('\n');
  const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

function exportOrdersToCSV() {
  const header = [
    'Pedido_Shopify', 'Fecha', 'Cliente', 'Telefono', 'Ciudad', 'Producto',
    'Cantidad', 'Modalidad_Pago', 'Estado_Pago', 'Transportadora', 'Guia',
    'Estado_Envio', 'Total_Venta_COP', 'Costo_Producto_COP', 'Costo_Flete_COP', 'Comision_Pasarela_COP'
  ];
  const rows = appState.orders.map(o => [
    o.shopifyOrderNumber, o.date, o.customerName, o.customerPhone, o.city, o.productName,
    o.quantity, o.paymentModel, o.paymentStatus, o.carrier, o.trackingNumber,
    o.shippingStatus, o.saleTotal, o.productCostTotal, o.shippingCost, o.gatewayFee
  ]);
  downloadCSVFile(`Sebas_Pedidos_Shopify_${new Date().toISOString().slice(0, 10)}.csv`, [header, ...rows]);
  showToast('Archivo CSV de pedidos descargado');
}

function exportExpensesToCSV() {
  const header = ['ID', 'Fecha', 'Concepto', 'Categoria', 'Metodo_Pago', 'Referencia', 'Estado', 'Monto_COP'];
  const rows = appState.expenses.map(e => [
    e.id, e.date, e.concept, e.category, e.paymentMethod, e.reference, e.status, e.amount
  ]);
  downloadCSVFile(`Sebas_Gastos_Shopify_${new Date().toISOString().slice(0, 10)}.csv`, [header, ...rows]);
  showToast('Archivo CSV de gastos descargado');
}

function exportProductsToCSV() {
  const header = [
    'ID', 'SKU', 'Producto', 'Categoria', 'Modalidad_Logistica', 'Proveedor',
    'Costo_Proveedor_COP', 'Precio_Venta_Shopify_COP', 'Flete_Promedio_COP',
    'Stock_Actual', 'Stock_Minimo_Alerta', 'Valor_Stock_Costo_COP', 'Estado'
  ];
  const rows = appState.products.map(p => [
    p.id, p.sku, p.name, p.category, p.fulfillmentType || 'Stock Propio', p.supplier || 'Proveedor General',
    p.costPrice, p.salePrice, p.avgShippingCost, p.stock, p.minStock,
    (Number(p.stock) || 0) * (Number(p.costPrice) || 0), p.status || 'Activo'
  ]);
  downloadCSVFile(`Sebas_Catalogo_Productos_${new Date().toISOString().slice(0, 10)}.csv`, [header, ...rows]);
  showToast('Catálogo de productos exportado a CSV');
}

function downloadTemplateCSV() {
  const header = [
    'Name', 'Created at', 'Billing Name', 'Billing Phone', 'Shipping City',
    'Lineitem name', 'Lineitem quantity', 'Payment Method', 'Carrier', 'Tracking Number',
    'Shipping Status', 'Total', 'Product Cost', 'Shipping Cost'
  ];
  const sample1 = [
    '#SH-1060', '2026-11-08', 'Carolina Mejía', '573109988776', 'Medellín, ANT',
    'Mini Proyector Smart HY300 Full HD WiFi', '1', 'Contraentrega (COD)', 'Coordinadora', 'CRD-9910293',
    'En Tránsito', '249900', '112000', '16500'
  ];
  const sample2 = [
    '#SH-1061', '2026-11-08', 'David Ospina', '573154433221', 'Bogotá D.C.',
    'Depiladora Láser IPL Zafiro Indolora', '1', 'Pago Anticipado', 'Interrapidísimo', '24001959991',
    'Entregado', '199900', '78000', '15000'
  ];
  downloadCSVFile('Plantilla_Importacion_Shopify_Sebas.csv', [header, sample1, sample2]);
  showToast('Plantilla CSV descargada');
}

function parseCSVLine(line) {
  const result = [];
  let cur = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      inQuotes = !inQuotes;
    } else if (ch === ',' && !inQuotes) {
      result.push(cur.trim());
      cur = '';
    } else {
      cur += ch;
    }
  }
  result.push(cur.trim());
  return result;
}

function handleCSVUpload() {
  const input = document.getElementById('csv-file-input');
  if (!input?.files?.length) {
    showToast('Selecciona primero un archivo .CSV');
    return;
  }

  const file = input.files[0];
  const reader = new FileReader();
  reader.onload = function(evt) {
    const text = evt.target.result;
    const lines = text.split(/\r?\n/).filter(l => l.trim().length > 0);
    if (lines.length < 2) {
      showToast('El archivo CSV está vacío o no tiene filas');
      return;
    }

    const headers = parseCSVLine(lines[0]).map(h => h.toLowerCase());
    let importedCount = 0;

    for (let i = 1; i < lines.length; i++) {
      const cols = parseCSVLine(lines[i]);
      if (cols.length < 4) continue;

      const getCol = (possibleNames, fallbackIdx) => {
        for (const name of possibleNames) {
          const idx = headers.findIndex(h => h.includes(name));
          if (idx !== -1 && cols[idx] !== undefined) return cols[idx];
        }
        return cols[fallbackIdx] || '';
      };

      const orderNum = getCol(['name', 'pedido'], 0) || `#SH-${1060 + i}`;
      const rawDate = getCol(['created', 'fecha'], 1) || new Date().toISOString().slice(0, 10);
      const date = rawDate.slice(0, 10);
      const customerName = getCol(['billing name', 'shipping name', 'cliente'], 2) || 'Cliente Shopify';
      const phone = getCol(['phone', 'telefono'], 3) || '573000000000';
      const city = getCol(['city', 'ciudad'], 4) || 'Bogotá D.C.';
      const prodName = getCol(['lineitem name', 'producto'], 5) || appState.products[0].name;
      const qty = Number(getCol(['quantity', 'cantidad'], 6)) || 1;
      const payMethodRaw = getCol(['payment', 'modalidad'], 7) || 'Contraentrega (COD)';
      const isCOD = payMethodRaw.toLowerCase().includes('cod') || payMethodRaw.toLowerCase().includes('contraentrega') || payMethodRaw.toLowerCase().includes('efectivo');
      const carrier = getCol(['carrier', 'transportadora'], 8) || 'Coordinadora';
      const tracking = getCol(['tracking', 'guia'], 9) || `GUIA-${Math.floor(100000 + Math.random() * 900000)}`;
      const shipStatus = getCol(['shipping status', 'estado_envio'], 10) || 'En Tránsito';
      const total = Number(String(getCol(['total', 'venta'], 11)).replace(/[^\d.]/g, '')) || 189900;

      const matchedProd = appState.products.find(p => p.name.toLowerCase().includes(prodName.toLowerCase().slice(0, 8))) || appState.products[0];
      const costTotal = Number(getCol(['product cost', 'costo_producto'], 12)) || (matchedProd.costPrice * qty);
      const shipCost = Number(getCol(['shipping cost', 'costo_flete'], 13)) || matchedProd.avgShippingCost;

      appState.orders.unshift({
        id: 'ORD-' + Math.floor(10000 + Math.random() * 90000),
        shopifyOrderNumber: orderNum,
        date,
        customerName,
        customerPhone: phone,
        city,
        productId: matchedProd.id,
        productName: prodName,
        quantity: qty,
        paymentModel: isCOD ? 'Contraentrega (COD)' : 'Pago Anticipado',
        paymentMethodDetail: isCOD ? 'Efectivo al recibir' : 'Wompi / Pasarela',
        paymentStatus: shipStatus === 'Entregado' ? (isCOD ? 'Recaudado' : 'Pagado') : (isCOD ? 'Pendiente Recaudo' : 'Pagado'),
        shippingStatus: shipStatus,
        carrier,
        trackingNumber: tracking,
        saleTotal: total,
        productCostTotal: costTotal,
        shippingCost: shipCost,
        gatewayFee: isCOD ? 0 : Math.round(total * 0.032),
        notes: 'Importado vía CSV de Shopify'
      });
      importedCount++;
    }

    saveAppState(appState);
    renderAll();
    closeModal('modal-csv');
    showToast(`${importedCount} pedido(s) importados desde CSV con éxito`);
  };
  reader.readAsText(file);
}

/* ==========================================================================
   INITIALIZATION & EVENT LISTENERS
   ========================================================================== */

document.addEventListener('DOMContentLoaded', () => {
  // Navigation Buttons
  document.querySelectorAll('.nav-item[data-view]').forEach(btn => {
    btn.addEventListener('click', () => switchView(btn.dataset.view));
  });

  document.querySelectorAll('[data-goto-view]').forEach(btn => {
    btn.addEventListener('click', () => switchView(btn.dataset.gotoView));
  });

  // Mobile Menu
  document.getElementById('btn-mobile-menu')?.addEventListener('click', () => {
    document.getElementById('app-sidebar')?.classList.toggle('mobile-open');
  });

  // Global Payment Model Filter Pills
  document.querySelectorAll('.filter-pill[data-paymodel]').forEach(pill => {
    pill.addEventListener('click', () => {
      document.querySelectorAll('.filter-pill[data-paymodel]').forEach(p => p.classList.remove('active'));
      pill.classList.add('active');
      globalPayModelFilter = pill.dataset.paymodel;
      renderAll();
    });
  });

  // Theme Toggle
  document.getElementById('btn-theme-toggle')?.addEventListener('click', () => {
    const html = document.documentElement;
    const nextTheme = html.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
    html.setAttribute('data-theme', nextTheme);
    drawFinanceChart();
  });

  // Close Modals
  document.querySelectorAll('[data-close-modal]').forEach(btn => {
    btn.addEventListener('click', () => closeModal(btn.dataset.closeModal));
  });

  // Open Modals
  document.getElementById('btn-quick-order')?.addEventListener('click', openNewOrderModal);
  document.getElementById('btn-new-order-table')?.addEventListener('click', openNewOrderModal);

  const openExpenseFn = () => {
    document.getElementById('form-expense').reset();
    document.getElementById('expense-date').value = new Date().toISOString().slice(0, 10);
    openModal('modal-expense');
  };
  document.getElementById('btn-quick-expense')?.addEventListener('click', openExpenseFn);
  document.getElementById('btn-new-expense-table')?.addEventListener('click', openExpenseFn);

  document.getElementById('btn-open-return-modal')?.addEventListener('click', () => {
    populateProductSelects();
    document.getElementById('return-date').value = new Date().toISOString().slice(0, 10);
    openModal('modal-return');
  });

  document.getElementById('btn-open-product-modal')?.addEventListener('click', openNewProductModal);
  document.getElementById('btn-quick-product')?.addEventListener('click', openNewProductModal);
  document.getElementById('btn-open-restock-modal')?.addEventListener('click', () => openRestockModal());

  // Product View Mode Toggle (Table vs Cards)
  document.getElementById('btn-prod-view-table')?.addEventListener('click', () => {
    productViewMode = 'table';
    document.getElementById('btn-prod-view-table')?.classList.add('active');
    document.getElementById('btn-prod-view-cards')?.classList.remove('active');
    renderProductsView();
  });

  document.getElementById('btn-prod-view-cards')?.addEventListener('click', () => {
    productViewMode = 'cards';
    document.getElementById('btn-prod-view-cards')?.classList.add('active');
    document.getElementById('btn-prod-view-table')?.classList.remove('active');
    renderProductsView();
  });

  // Live Margin Preview in Product Modal
  ['product-cost', 'product-price', 'product-shipping'].forEach(id => {
    document.getElementById(id)?.addEventListener('input', updateProductModalMarginPreview);
  });

  // Product Image File Upload & URL Preview
  document.getElementById('product-image-url')?.addEventListener('input', e => {
    const val = e.target.value.trim();
    const preview = document.getElementById('product-image-preview');
    if (val && preview) {
      preview.src = val;
    }
  });

  document.getElementById('product-image-file')?.addEventListener('change', e => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = evt => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const size = 320;
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = '#f1f5f9';
        ctx.fillRect(0, 0, size, size);
        const scale = Math.max(size / img.width, size / img.height);
        const w = img.width * scale;
        const h = img.height * scale;
        ctx.drawImage(img, (size - w) / 2, (size - h) / 2, w, h);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.84);
        const preview = document.getElementById('product-image-preview');
        if (preview) preview.src = dataUrl;
      };
      img.src = evt.target.result;
    };
    reader.readAsDataURL(file);
  });

  // Live Restock Preview in Restock Modal
  document.getElementById('restock-product-select')?.addEventListener('change', e => {
    const prod = appState.products.find(p => p.id === e.target.value);
    if (prod) {
      document.getElementById('restock-unit-cost').value = prod.costPrice;
      updateRestockTotalPreview();
    }
  });
  ['restock-quantity', 'restock-unit-cost'].forEach(id => {
    document.getElementById(id)?.addEventListener('input', updateRestockTotalPreview);
  });

  document.getElementById('btn-open-csv-modal')?.addEventListener('click', () => openModal('modal-csv'));

  // Order Form Dynamic Calculations
  ['order-product-select', 'order-quantity', 'order-payment-model'].forEach(id => {
    document.getElementById(id)?.addEventListener('change', syncOrderFormWithProduct);
  });

  // Submit Order Form
  document.getElementById('form-order')?.addEventListener('submit', e => {
    e.preventDefault();
    const editId = document.getElementById('order-id-input').value;
    const prodId = document.getElementById('order-product-select').value;
    const prod = appState.products.find(p => p.id === prodId) || appState.products[0];
    const payModel = document.getElementById('order-payment-model').value;
    const shipStatus = document.getElementById('order-shipping-status').value;
    const qty = Number(document.getElementById('order-quantity').value) || 1;

    let payStatus = 'Pendiente Recaudo';
    if (payModel === 'Pago Anticipado') payStatus = 'Pagado';
    if (shipStatus === 'Entregado' && payModel.includes('COD')) payStatus = 'Recaudado';
    if (shipStatus === 'Devuelto') payStatus = payModel.includes('COD') ? 'No Recaudado' : 'Reembolsado';

    const orderPayload = {
      id: editId || 'ORD-' + Math.floor(1000 + Math.random() * 9000),
      shopifyOrderNumber: document.getElementById('order-shopify-num').value,
      date: document.getElementById('order-date').value,
      customerName: document.getElementById('order-customer-name').value,
      customerPhone: document.getElementById('order-customer-phone').value,
      city: document.getElementById('order-city').value,
      productId: prod.id,
      productName: prod.name,
      quantity: qty,
      paymentModel: payModel,
      paymentMethodDetail: document.getElementById('order-payment-detail').value,
      paymentStatus: payStatus,
      shippingStatus: shipStatus,
      carrier: document.getElementById('order-carrier').value,
      trackingNumber: document.getElementById('order-tracking').value,
      saleTotal: Number(document.getElementById('order-sale-total').value) || 0,
      productCostTotal: Number(document.getElementById('order-cost-total').value) || 0,
      shippingCost: Number(document.getElementById('order-shipping-cost').value) || 0,
      gatewayFee: Number(document.getElementById('order-gateway-fee').value) || 0,
      notes: document.getElementById('order-notes').value
    };

    if (editId) {
      const idx = appState.orders.findIndex(o => o.id === editId);
      if (idx !== -1) appState.orders[idx] = orderPayload;
    } else {
      appState.orders.unshift(orderPayload);
      // Deduct stock on new order
      prod.stock = Math.max(0, (Number(prod.stock) || 0) - qty);
    }

    saveAppState(appState);
    closeModal('modal-order');
    renderAll();
    showToast(`Pedido ${orderPayload.shopifyOrderNumber} guardado exitosamente`);
  });

  // Submit Expense Form
  document.getElementById('form-expense')?.addEventListener('submit', e => {
    e.preventDefault();
    const newExp = {
      id: 'EXP-' + Math.floor(100 + Math.random() * 900),
      date: document.getElementById('expense-date').value,
      category: document.getElementById('expense-category').value,
      concept: document.getElementById('expense-concept').value,
      amount: Number(document.getElementById('expense-amount').value) || 0,
      paymentMethod: document.getElementById('expense-method').value,
      status: document.getElementById('expense-status').value,
      reference: document.getElementById('expense-reference').value
    };
    appState.expenses.unshift(newExp);
    saveAppState(appState);
    closeModal('modal-expense');
    renderAll();
    showToast('Gasto registrado en la contabilidad');
  });

  // Submit Return Form
  document.getElementById('form-return')?.addEventListener('submit', e => {
    e.preventDefault();
    const orderId = document.getElementById('return-order-select').value;
    const order = appState.orders.find(o => o.id === orderId);
    if (!order) return;

    const resolution = document.getElementById('return-resolution').value;
    const restocked = resolution === 'Reintegrado a Stock';

    order.shippingStatus = 'Devuelto';
    order.paymentStatus = order.paymentModel.includes('COD') ? 'No Recaudado' : 'Reembolsado';

    if (restocked) {
      const prod = appState.products.find(p => p.id === order.productId);
      if (prod) prod.stock = (Number(prod.stock) || 0) + (Number(order.quantity) || 1);
    }

    appState.returns.unshift({
      id: 'RET-' + Math.floor(100 + Math.random() * 900),
      orderId: order.id,
      shopifyOrderNumber: order.shopifyOrderNumber,
      date: document.getElementById('return-date').value,
      customerName: order.customerName,
      productId: order.productId,
      productName: order.productName,
      quantity: order.quantity,
      returnType: document.getElementById('return-type').value,
      carrier: order.carrier,
      reason: document.getElementById('return-reason').value,
      lostShippingCost: Number(document.getElementById('return-lost-shipping').value) || 0,
      refundAmount: Number(document.getElementById('return-refund-amount').value) || 0,
      inventoryResolution: resolution,
      restocked
    });

    saveAppState(appState);
    closeModal('modal-return');
    renderAll();
    showToast(`Devolución registrada para ${order.shopifyOrderNumber}`);
  });

  // Submit Product Form
  document.getElementById('form-product')?.addEventListener('submit', e => {
    e.preventDefault();
    const editId = document.getElementById('product-id-input').value;
    const salePriceVal = Number(document.getElementById('product-price').value) || 0;
    const urlInputVal = (document.getElementById('product-image-url')?.value || '').trim();
    const previewSrc = document.getElementById('product-image-preview')?.getAttribute('src') || '';
    const finalImageUrl = urlInputVal || previewSrc || getProductImage(null);

    const payload = {
      id: editId || 'PRD-' + Math.floor(100 + Math.random() * 900),
      sku: document.getElementById('product-sku').value,
      category: document.getElementById('product-category').value,
      status: document.getElementById('product-status').value || 'Activo',
      name: document.getElementById('product-name').value,
      imageUrl: finalImageUrl,
      fulfillmentType: document.getElementById('product-fulfillment').value || 'Stock Propio',
      supplier: document.getElementById('product-supplier').value || 'Proveedor General',
      costPrice: Number(document.getElementById('product-cost').value) || 0,
      salePrice: salePriceVal,
      compareAtPrice: Number(document.getElementById('product-compare-price').value) || Math.round(salePriceVal * 1.25),
      avgShippingCost: Number(document.getElementById('product-shipping').value) || 15000,
      stock: Number(document.getElementById('product-stock').value) || 0,
      minStock: Number(document.getElementById('product-min-stock').value) || 5
    };

    if (editId) {
      const idx = appState.products.findIndex(p => p.id === editId);
      if (idx !== -1) appState.products[idx] = payload;
    } else {
      appState.products.unshift(payload);
    }

    saveAppState(appState);
    closeModal('modal-product');
    renderAll();
    showToast(`Producto "${payload.name}" guardado en el catálogo`);
  });

  // Submit Restock Form
  document.getElementById('form-restock')?.addEventListener('submit', e => {
    e.preventDefault();
    const prodId = document.getElementById('restock-product-select').value;
    const qty = Number(document.getElementById('restock-quantity').value) || 0;
    const unitCost = Number(document.getElementById('restock-unit-cost').value) || 0;
    const logExpense = document.getElementById('restock-log-expense')?.checked;

    const prod = appState.products.find(p => p.id === prodId);
    if (!prod || qty <= 0) return;

    prod.stock = (Number(prod.stock) || 0) + qty;
    if (unitCost > 0) prod.costPrice = unitCost;

    if (logExpense && qty * unitCost > 0) {
      appState.expenses.unshift({
        id: 'EXP-' + Math.floor(100 + Math.random() * 900),
        date: new Date().toISOString().slice(0, 10),
        category: 'Inventario / Proveedores',
        concept: `Compra de inventario (${qty} und.) — ${prod.name}`,
        amount: qty * unitCost,
        paymentMethod: 'Transferencia Proveedor',
        status: 'Pagado',
        reference: prod.sku
      });
    }

    saveAppState(appState);
    closeModal('modal-restock');
    renderAll();
    showToast(`+${qty} unidades agregadas a "${prod.name}"`);
  });

  // Table Filters
  ['orders-search-input', 'orders-status-filter', 'orders-carrier-filter'].forEach(id => {
    document.getElementById(id)?.addEventListener('input', renderOrdersView);
    document.getElementById(id)?.addEventListener('change', renderOrdersView);
  });

  ['expenses-search-input', 'expenses-category-filter'].forEach(id => {
    document.getElementById(id)?.addEventListener('input', renderExpensesView);
    document.getElementById(id)?.addEventListener('change', renderExpensesView);
  });

  ['products-search-input', 'products-category-filter', 'products-fulfillment-filter', 'products-stock-filter'].forEach(id => {
    document.getElementById(id)?.addEventListener('input', renderProductsView);
    document.getElementById(id)?.addEventListener('change', renderProductsView);
  });

  // Simulator Inputs
  ['sim-sale-price', 'sim-cost-price', 'sim-shipping-cost', 'sim-cpa-ads', 'sim-rts-rate'].forEach(id => {
    document.getElementById(id)?.addEventListener('input', runSimulator);
  });

  document.getElementById('sim-product-select')?.addEventListener('change', e => {
    const prod = appState.products.find(p => p.id === e.target.value);
    if (prod) {
      document.getElementById('sim-sale-price').value = prod.salePrice;
      document.getElementById('sim-cost-price').value = prod.costPrice;
      document.getElementById('sim-shipping-cost').value = prod.avgShippingCost;
      runSimulator();
    }
  });

  // CSV & Backup Actions
  document.getElementById('btn-export-orders-csv')?.addEventListener('click', exportOrdersToCSV);
  document.getElementById('btn-export-expenses-csv')?.addEventListener('click', exportExpensesToCSV);
  document.getElementById('btn-export-products-csv')?.addEventListener('click', exportProductsToCSV);
  document.getElementById('btn-download-template-csv')?.addEventListener('click', downloadTemplateCSV);
  document.getElementById('btn-process-csv')?.addEventListener('click', handleCSVUpload);

  document.getElementById('btn-backup-json')?.addEventListener('click', () => {
    const blob = new Blob([JSON.stringify(appState, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Respaldo_Sebas_Control_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('Copia de seguridad JSON descargada');
  });

  document.getElementById('btn-reset-demo')?.addEventListener('click', () => {
    appState = resetAppStateToDemo();
    renderAll();
    closeModal('modal-csv');
    showToast('Datos de demostración restaurados');
  });

  window.addEventListener('resize', () => {
    if (currentView === 'dashboard') drawFinanceChart();
  });

  renderAll();
});
