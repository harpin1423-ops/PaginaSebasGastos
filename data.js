/* ==========================================================================
   SEBAS E-COMMERCE & FINANCIAL CONTROL — DATA & STORAGE LAYER (data.js)
   Colombian Shopify Store Dataset (COP), Persistence & CSV Helpers
   ========================================================================== */

const STORAGE_KEY = 'sebas_shopify_control_v1';

const INITIAL_DATA = {
  storeConfig: {
    storeName: 'Sebas E-Commerce Store',
    currency: 'COP',
    defaultGatewayRate: 3.2, // % comisión pasarela promedio (Wompi/MercadoPago)
    targetDeliveryRate: 85   // % meta de efectividad de entrega
  },
  products: [
    {
      id: 'PRD-01',
      sku: 'SHP-PROY-4K',
      name: 'Mini Proyector Smart HY300 Full HD WiFi',
      category: 'Tecnología & Hogar',
      fulfillmentType: 'Stock Propio',
      supplier: 'Importadora Digital Medellín',
      costPrice: 112000,
      salePrice: 249900,
      compareAtPrice: 329900,
      avgShippingCost: 16500,
      stock: 34,
      minStock: 10,
      status: 'Activo'
    },
    {
      id: 'PRD-02',
      sku: 'SHP-MASG-PRO',
      name: 'Masajeador Cervical Térmico Shiatsu 4D',
      category: 'Bienestar & Salud',
      fulfillmentType: 'Stock Propio',
      supplier: 'Wellness Import Bogotá',
      costPrice: 54000,
      salePrice: 149900,
      compareAtPrice: 199900,
      avgShippingCost: 14800,
      stock: 19,
      minStock: 8,
      status: 'Activo'
    },
    {
      id: 'PRD-03',
      sku: 'SHP-RELOJ-U9',
      name: 'Smartwatch Ultra Series 9 + 3 Correas',
      category: 'Gadgets & Wearables',
      fulfillmentType: 'Stock Propio',
      supplier: 'Shenzhen Direct / Bodega Cali',
      costPrice: 46000,
      salePrice: 139900,
      compareAtPrice: 189900,
      avgShippingCost: 14200,
      stock: 6,
      minStock: 12,
      status: 'Activo'
    },
    {
      id: 'PRD-04',
      sku: 'SHP-DEPIL-IPL',
      name: 'Depiladora Láser IPL Zafiro Indolora',
      category: 'Cuidado Personal',
      fulfillmentType: 'Dropshipping (Dropi)',
      supplier: 'Bodega Master Dropi Bogotá',
      costPrice: 78000,
      salePrice: 199900,
      compareAtPrice: 259900,
      avgShippingCost: 15000,
      stock: 25,
      minStock: 8,
      status: 'Activo'
    },
    {
      id: 'PRD-05',
      sku: 'SHP-ASPIR-CAR',
      name: 'Aspiradora Inalámbrica Turbo 3 en 1 Auto/Hogar',
      category: 'Hogar & Autos',
      fulfillmentType: 'Stock Propio',
      supplier: 'Importadora Digital Medellín',
      costPrice: 38000,
      salePrice: 119900,
      compareAtPrice: 159900,
      avgShippingCost: 14500,
      stock: 4,
      minStock: 10,
      status: 'Activo'
    },
    {
      id: 'PRD-06',
      sku: 'SHP-CAM-WIFI',
      name: 'Cámara Seguridad Domo 360° Doble Lente WiFi',
      category: 'Seguridad',
      fulfillmentType: 'Dropshipping (Dropi)',
      supplier: 'SecurTech Proveedor Dropi',
      costPrice: 62000,
      salePrice: 169900,
      compareAtPrice: 219900,
      avgShippingCost: 15500,
      stock: 28,
      minStock: 8,
      status: 'Activo'
    }
  ],
  orders: [
    {
      id: 'ORD-1052',
      shopifyOrderNumber: '#SH-1052',
      date: '2026-11-08',
      customerName: 'Camila Andrea Restrepo',
      customerPhone: '573145829104',
      city: 'Medellín, ANT',
      productId: 'PRD-01',
      productName: 'Mini Proyector Smart HY300 Full HD WiFi',
      quantity: 1,
      paymentModel: 'Contraentrega (COD)',
      paymentMethodDetail: 'Efectivo al recibir',
      paymentStatus: 'Pendiente Recaudo',
      shippingStatus: 'En Reparto',
      carrier: 'Coordinadora',
      trackingNumber: 'CRD-884920194',
      saleTotal: 249900,
      productCostTotal: 112000,
      shippingCost: 16800,
      gatewayFee: 0,
      notes: 'Entregar en portería edificio San Fernando.'
    },
    {
      id: 'ORD-1051',
      shopifyOrderNumber: '#SH-1051',
      date: '2026-11-08',
      customerName: 'Juan Sebastián Gómez',
      customerPhone: '573008412290',
      city: 'Bogotá D.C.',
      productId: 'PRD-04',
      productName: 'Depiladora Láser IPL Zafiro Indolora',
      quantity: 1,
      paymentModel: 'Pago Anticipado',
      paymentMethodDetail: 'Wompi (PSE)',
      paymentStatus: 'Pagado',
      shippingStatus: 'En Tránsito',
      carrier: 'Interrapidísimo',
      trackingNumber: '240019485712',
      saleTotal: 199900,
      productCostTotal: 78000,
      shippingCost: 14500,
      gatewayFee: 6800,
      notes: 'Cliente pagó por PSE. Despachado prioritario.'
    },
    {
      id: 'ORD-1050',
      shopifyOrderNumber: '#SH-1050',
      date: '2026-11-07',
      customerName: 'Valentina Morales Ochoa',
      customerPhone: '573116930482',
      city: 'Cali, VAL',
      productId: 'PRD-02',
      productName: 'Masajeador Cervical Térmico Shiatsu 4D',
      quantity: 1,
      paymentModel: 'Contraentrega (COD)',
      paymentMethodDetail: 'Efectivo al recibir',
      paymentStatus: 'Pendiente Recaudo',
      shippingStatus: 'Novedad',
      carrier: 'Interrapidísimo',
      trackingNumber: '240019481039',
      saleTotal: 149900,
      productCostTotal: 54000,
      shippingCost: 15200,
      gatewayFee: 0,
      notes: 'Novedad transportadora: Dirección incompleta (falta torre/apto). Llamar hoy.'
    },
    {
      id: 'ORD-1049',
      shopifyOrderNumber: '#SH-1049',
      date: '2026-11-07',
      customerName: 'Andrés Felipe Vargas',
      customerPhone: '573204918823',
      city: 'Bucaramanga, SAN',
      productId: 'PRD-01',
      productName: 'Mini Proyector Smart HY300 Full HD WiFi',
      quantity: 1,
      paymentModel: 'Contraentrega (COD)',
      paymentMethodDetail: 'Efectivo al recibir',
      paymentStatus: 'Recaudado',
      shippingStatus: 'Entregado',
      carrier: 'Envía',
      trackingNumber: 'ENV-01948271',
      saleTotal: 249900,
      productCostTotal: 112000,
      shippingCost: 16200,
      gatewayFee: 0,
      notes: 'Recaudo liquidado por transportadora.'
    },
    {
      id: 'ORD-1048',
      shopifyOrderNumber: '#SH-1048',
      date: '2026-11-06',
      customerName: 'Laura Daniela Quintero',
      customerPhone: '573159283710',
      city: 'Barranquilla, ATL',
      productId: 'PRD-03',
      productName: 'Smartwatch Ultra Series 9 + 3 Correas',
      quantity: 2,
      paymentModel: 'Pago Anticipado',
      paymentMethodDetail: 'Tarjeta Crédito (Wompi)',
      paymentStatus: 'Pagado',
      shippingStatus: 'Entregado',
      carrier: 'Coordinadora',
      trackingNumber: 'CRD-884912041',
      saleTotal: 259900,
      productCostTotal: 92000,
      shippingCost: 16500,
      gatewayFee: 8900,
      notes: 'Promoción combo 2 unidades.'
    },
    {
      id: 'ORD-1047',
      shopifyOrderNumber: '#SH-1047',
      date: '2026-11-06',
      customerName: 'Carlos Eduardo Mendoza',
      customerPhone: '573184029184',
      city: 'Cartagena, BOL',
      productId: 'PRD-05',
      productName: 'Aspiradora Inalámbrica Turbo 3 en 1 Auto/Hogar',
      quantity: 1,
      paymentModel: 'Contraentrega (COD)',
      paymentMethodDetail: 'Efectivo al recibir',
      paymentStatus: 'No Recaudado',
      shippingStatus: 'Devuelto',
      carrier: 'Servientrega',
      trackingNumber: 'SRV-992018422',
      saleTotal: 119900,
      productCostTotal: 38000,
      shippingCost: 17500,
      gatewayFee: 0,
      notes: 'Cliente salió de viaje y no dejó el dinero en portería. Devolución RTS.'
    },
    {
      id: 'ORD-1046',
      shopifyOrderNumber: '#SH-1046',
      date: '2026-11-05',
      customerName: 'Diana Marcela Pineda',
      customerPhone: '573105829147',
      city: 'Pereira, RIS',
      productId: 'PRD-06',
      productName: 'Cámara Seguridad Domo 360° Doble Lente WiFi',
      quantity: 2,
      paymentModel: 'Contraentrega (COD)',
      paymentMethodDetail: 'Efectivo al recibir',
      paymentStatus: 'Recaudado',
      shippingStatus: 'Entregado',
      carrier: 'Interrapidísimo',
      trackingNumber: '240019476511',
      saleTotal: 319800,
      productCostTotal: 124000,
      shippingCost: 17800,
      gatewayFee: 0,
      notes: 'Cliente compró kit x2 cámaras.'
    },
    {
      id: 'ORD-1045',
      shopifyOrderNumber: '#SH-1045',
      date: '2026-11-05',
      customerName: 'Santiago Patiño Salazar',
      customerPhone: '573128492011',
      city: 'Bogotá D.C.',
      productId: 'PRD-01',
      productName: 'Mini Proyector Smart HY300 Full HD WiFi',
      quantity: 1,
      paymentModel: 'Pago Anticipado',
      paymentMethodDetail: 'Nequi / Bancolombia',
      paymentStatus: 'Pagado',
      shippingStatus: 'Entregado',
      carrier: 'Domicilio Local',
      trackingNumber: 'BOG-EXP-409',
      saleTotal: 249900,
      productCostTotal: 112000,
      shippingCost: 10000,
      gatewayFee: 0,
      notes: 'Transferencia directa Nequi sin comisión de pasarela.'
    },
    {
      id: 'ORD-1044',
      shopifyOrderNumber: '#SH-1044',
      date: '2026-11-04',
      customerName: 'Natalia Herrera Ríos',
      customerPhone: '573167392018',
      city: 'Manizales, CAL',
      productId: 'PRD-04',
      productName: 'Depiladora Láser IPL Zafiro Indolora',
      quantity: 1,
      paymentModel: 'Contraentrega (COD)',
      paymentMethodDetail: 'Efectivo al recibir',
      paymentStatus: 'Recaudado',
      shippingStatus: 'Entregado',
      carrier: 'Coordinadora',
      trackingNumber: 'CRD-884905112',
      saleTotal: 199900,
      productCostTotal: 78000,
      shippingCost: 15200,
      gatewayFee: 0,
      notes: 'Entregado sin novedad.'
    },
    {
      id: 'ORD-1043',
      shopifyOrderNumber: '#SH-1043',
      date: '2026-11-03',
      customerName: 'Jorge Iván Castañeda',
      customerPhone: '573014928173',
      city: 'Cali, VAL',
      productId: 'PRD-02',
      productName: 'Masajeador Cervical Térmico Shiatsu 4D',
      quantity: 1,
      paymentModel: 'Pago Anticipado',
      paymentMethodDetail: 'ADDI Cupo',
      paymentStatus: 'Pagado',
      shippingStatus: 'Entregado',
      carrier: 'Envía',
      trackingNumber: 'ENV-01947110',
      saleTotal: 149900,
      productCostTotal: 54000,
      shippingCost: 14500,
      gatewayFee: 6200,
      notes: 'Financiado con ADDI.'
    },
    {
      id: 'ORD-1042',
      shopifyOrderNumber: '#SH-1042',
      date: '2026-11-02',
      customerName: 'Paola Andrea Bermúdez',
      customerPhone: '573175029183',
      city: 'Ibagué, TOL',
      productId: 'PRD-03',
      productName: 'Smartwatch Ultra Series 9 + 3 Correas',
      quantity: 1,
      paymentModel: 'Contraentrega (COD)',
      paymentMethodDetail: 'Efectivo al recibir',
      paymentStatus: 'No Recaudado',
      shippingStatus: 'Devuelto',
      carrier: 'Interrapidísimo',
      trackingNumber: '240019468901',
      saleTotal: 139900,
      productCostTotal: 46000,
      shippingCost: 15800,
      gatewayFee: 0,
      notes: 'Teléfono apagado en 3 intentos de entrega. Retornado a bodega.'
    },
    {
      id: 'ORD-1041',
      shopifyOrderNumber: '#SH-1041',
      date: '2026-11-01',
      customerName: 'Mauricio Alejandro Duarte',
      customerPhone: '573138492019',
      city: 'Medellín, ANT',
      productId: 'PRD-01',
      productName: 'Mini Proyector Smart HY300 Full HD WiFi',
      quantity: 2,
      paymentModel: 'Pago Anticipado',
      paymentMethodDetail: 'Wompi (PSE)',
      paymentStatus: 'Pagado',
      shippingStatus: 'Entregado',
      carrier: 'Coordinadora',
      trackingNumber: 'CRD-884899301',
      saleTotal: 479800,
      productCostTotal: 224000,
      shippingCost: 19500,
      gatewayFee: 15300,
      notes: 'Compra corporativa 2 proyectores.'
    }
  ],
  returns: [
    {
      id: 'RET-201',
      orderId: 'ORD-1047',
      shopifyOrderNumber: '#SH-1047',
      date: '2026-11-07',
      customerName: 'Carlos Eduardo Mendoza',
      productId: 'PRD-05',
      productName: 'Aspiradora Inalámbrica Turbo 3 en 1 Auto/Hogar',
      quantity: 1,
      returnType: 'Devolución COD (RTS)',
      carrier: 'Servientrega',
      reason: 'Cliente ausente / No dejó dinero en portería',
      lostShippingCost: 17500,
      refundAmount: 0,
      inventoryResolution: 'En Tránsito a Bodega',
      restocked: false
    },
    {
      id: 'RET-202',
      orderId: 'ORD-1042',
      shopifyOrderNumber: '#SH-1042',
      date: '2026-11-04',
      customerName: 'Paola Andrea Bermúdez',
      productId: 'PRD-03',
      productName: 'Smartwatch Ultra Series 9 + 3 Correas',
      quantity: 1,
      returnType: 'Devolución COD (RTS)',
      carrier: 'Interrapidísimo',
      reason: 'Teléfono apagado en 3 visitas de transportadora',
      lostShippingCost: 15800,
      refundAmount: 0,
      inventoryResolution: 'Reintegrado a Stock',
      restocked: true
    }
  ],
  expenses: [
    {
      id: 'EXP-301',
      date: '2026-11-08',
      concept: 'Campaña Meta Ads — Escalamiento Proyector HY300 & IPL',
      category: 'Publicidad (Meta / TikTok Ads)',
      paymentMethod: 'Tarjeta Crédito Bancolombia',
      amount: 245000,
      status: 'Pagado',
      reference: 'META-INV-9921'
    },
    {
      id: 'EXP-302',
      date: '2026-11-06',
      concept: 'Campaña TikTok Ads — Videos UGC Masajeador & Smartwatch',
      category: 'Publicidad (Meta / TikTok Ads)',
      paymentMethod: 'Tarjeta Crédito Nu',
      amount: 165000,
      status: 'Pagado',
      reference: 'TT-ADS-4082'
    },
    {
      id: 'EXP-303',
      date: '2026-11-05',
      concept: 'Bolsas de seguridad polimero x500 + Rollos etiquetas térmicas',
      category: 'Logística & Empaque',
      paymentMethod: 'Nequi / Transferencia',
      amount: 68000,
      status: 'Pagado',
      reference: 'EMP-882'
    },
    {
      id: 'EXP-304',
      date: '2026-11-03',
      concept: 'Suscripción Mensual Shopify + App Releasit COD Form',
      category: 'Plataforma & Apps Shopify',
      paymentMethod: 'Tarjeta Crédito Bancolombia',
      amount: 124000,
      status: 'Pagado',
      reference: 'SHP-BILL-11'
    },
    {
      id: 'EXP-305',
      date: '2026-11-02',
      concept: 'Pauta Meta Ads — Testeo Creativos Inicio de Mes',
      category: 'Publicidad (Meta / TikTok Ads)',
      paymentMethod: 'Tarjeta Crédito Bancolombia',
      amount: 180000,
      status: 'Pagado',
      reference: 'META-INV-9810'
    }
  ]
};

/**
 * Format number as Colombian Pesos (COP)
 */
function formatCOP(value) {
  const num = Number(value) || 0;
  const isNegative = num < 0;
  const absFormatted = new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0,
    minimumFractionDigits: 0
  }).format(Math.abs(num));
  return isNegative ? `- ${absFormatted}` : absFormatted;
}

/**
 * Load state from localStorage or return deep copy of INITIAL_DATA
 */
function loadAppState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      const clone = JSON.parse(JSON.stringify(INITIAL_DATA));
      localStorage.setItem(STORAGE_KEY, JSON.stringify(clone));
      return clone;
    }
    const parsed = JSON.parse(raw);
    if (!parsed.orders || !parsed.products || !parsed.expenses || !parsed.returns) {
      throw new Error('Invalid state schema');
    }
    // Ensure enriched product fields exist
    parsed.products = parsed.products.map(p => ({
      fulfillmentType: p.fulfillmentType || 'Stock Propio',
      supplier: p.supplier || 'Proveedor Principal',
      compareAtPrice: p.compareAtPrice || Math.round((Number(p.salePrice) || 0) * 1.25),
      status: p.status === 'Inactivo' ? 'Inactivo' : 'Activo',
      ...p
    }));
    return parsed;
  } catch (err) {
    console.warn('Restoring default data state:', err);
    return JSON.parse(JSON.stringify(INITIAL_DATA));
  }
}

/**
 * Save state to localStorage
 */
function saveAppState(state) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (err) {
    console.error('Error saving state:', err);
  }
}

/**
 * Reset state back to initial demo dataset
 */
function resetAppStateToDemo() {
  const clone = JSON.parse(JSON.stringify(INITIAL_DATA));
  saveAppState(clone);
  return clone;
}
