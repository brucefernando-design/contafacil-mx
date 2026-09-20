/**
 * Contenido Curado Oficial para el Asistente EasyConta MX
 * Guías por pantalla, Glosario SAT, Checklist de inicio y Preguntas Frecuentes (FAQ).
 *
 * REGLAS EDITORIALES:
 * - Español de México, claro, segunda persona ("tú").
 * - Sin tecnicismos vacíos ni anglicismos innecesarios.
 * - No inventar criterios fiscales ni asegurar "ya estás en regla".
 * - Tono didáctico y preventivo.
 */

export interface BloqueGuia {
  nombre: string;
  descripcion: string;
}

export interface PantallaGuia {
  ruta: string;
  titulo: string;
  paraQue: string;
  bloques: BloqueGuia[];
  queHacerAhora: string[];
  erroresFrecuentes: string[];
  cuandoSiContador: string;
}

export interface TerminoGlosario {
  id: string;
  termino: string;
  queEs: string;
  paraQue: string;
  ejemplo: string;
  errorComun: string;
}

export interface PreguntaFrecuente {
  id: string;
  pregunta: string;
  respuesta: string;
}

export interface PasoTour {
  paso: number;
  titulo: string;
  descripcion: string;
  destacado: string;
}

// ---------------------------------------------------------------------------
// 1. TOUR DE PRIMERA VISITA (7 Pasos)
// ---------------------------------------------------------------------------
export const TOUR_PRIMERA_VISITA: PasoTour[] = [
  {
    paso: 1,
    titulo: "Qué es EasyConta y qué NO es",
    descripcion:
      "EasyConta MX es tu espacio de trabajo para ordenar tus comprobantes, calcular tus impuestos provisionales (ISR/IVA) y preparar tus pólizas contables. NO es el portal oficial del SAT ni sustituye las facultades de comprobación de la autoridad fiscal.",
    destacado: "Herramienta de control y cálculo, no el portal del gobierno.",
  },
  {
    paso: 2,
    titulo: "Cómo cambiar de RFC o Persona",
    descripcion:
      "En la esquina superior derecha o en la barra lateral encontrarás el selector de empresa. Puedes alternar entre personas físicas (RESICO, Actividad Empresarial, Arrendamiento) y personas morales sin cerrar tu sesión.",
    destacado: "Multi-RFC inmediato: mantén separada la información de cada negocio.",
  },
  {
    paso: 3,
    titulo: "Cómo emitir una factura CFDI 4.0",
    descripcion:
      "Ve a 'Facturación CFDI 4.0'. Ingresa los datos fiscales exactos de tu cliente: RFC, Razón Social en mayúsculas, Código Postal de su constancia y su Régimen Fiscal. El sistema generará el XML y el PDF al instante.",
    destacado: "Validación estricta de C.P. y nombre oficial según las reglas del SAT.",
  },
  {
    paso: 4,
    titulo: "Qué es la bóveda XML y por qué es el rey",
    descripcion:
      "El SAT solo reconoce el archivo XML con sello digital, el PDF es solo un dibujo informativo. En la Bóveda puedes subir y consultar todos tus XML de ingresos y egresos para alimentar el sistema.",
    destacado: "Los XML son la verdad jurídica y contable de tu negocio.",
  },
  {
    paso: 5,
    titulo: "PUE vs PPD: la diferencia que salva tu flujo",
    descripcion:
      "PUE (Pago en una sola exhibición) significa que el dinero ya entró o entra el mismo mes. PPD (Pago en parcialidades o diferido) es a crédito; solo genera impuestos cuando registras su Complemento de Pago.",
    destacado: "Nunca marques PUE si tu cliente te pagará hasta el próximo mes.",
  },
  {
    paso: 6,
    titulo: "Dónde ver cuánto pagar de ISR e IVA",
    descripcion:
      "En el Dashboard y en 'Motor Fiscal SAT 2026' ves el cálculo automatizado de tus pagos provisionales con base en lo efectivamente cobrado y pagado. Podrás ver el desglose exacto de cada peso.",
    destacado: "Transparencia total: entiende por qué debes cada peso antes de declarar.",
  },
  {
    paso: 7,
    titulo: "Cómo volver a consultar este asistente",
    descripcion:
      "Este botón verde flotante en la esquina inferior derecha siempre te acompañará. Además, donde veas el icono de interrogación (?) puedes hacer clic para ver la definición en el Glosario SAT.",
    destacado: "Tu guía interactiva siempre disponible con solo un clic.",
  },
];

// ---------------------------------------------------------------------------
// 2. CHECKLIST INTERACTIVO ("Usa el sistema por primera vez")
// ---------------------------------------------------------------------------
export interface ItemChecklist {
  id: string;
  texto: string;
  descripcion: string;
  rutaSugerida?: string;
}

export const CHECKLIST_INICIO: ItemChecklist[] = [
  {
    id: "check-login-demo",
    texto: "Entrar con el usuario demo",
    descripcion: "Ingresa con ana@easyconta.mx o despacho@easyconta.mx y la contraseña Demo1234!",
    rutaSugerida: "/login",
  },
  {
    id: "check-elegir-rfc",
    texto: "Elegir un RFC en operación",
    descripcion: "Usa el selector en el menú superior o lateral para elegir el contribuyente a consultar.",
    rutaSugerida: "/dashboard",
  },
  {
    id: "check-factura-pue",
    texto: "Emitir una factura PUE de $1,000 + IVA",
    descripcion: "Emite un comprobante con método PUE para ver cómo impacta tus ingresos del mes.",
    rutaSugerida: "/dashboard/facturacion",
  },
  {
    id: "check-factura-ppd",
    texto: "Emitir una factura PPD y registrar su pago",
    descripcion: "Crea una factura a crédito y después concíliala con su complemento de pago.",
    rutaSugerida: "/dashboard/facturacion",
  },
  {
    id: "check-boveda-fixtures",
    texto: "Cargar los XML de prueba en Bóveda",
    descripcion: "Usa el botón 'Cargar CFDI de Prueba' para poblar la bóveda con gastos e ingresos reales.",
    rutaSugerida: "/dashboard/boveda",
  },
  {
    id: "check-banco-csv",
    texto: "Subir o cargar el CSV demo del banco",
    descripcion: "Importa movimientos bancarios y prueba la conciliación automática 1 a 1.",
    rutaSugerida: "/dashboard/conciliacion",
  },
  {
    id: "check-motor-fiscal",
    texto: "Abrir Impuestos y leer el desglose",
    descripcion: "Revisa la tarjeta '¿Por qué debo esta cantidad?' en el Motor Fiscal 2026.",
    rutaSugerida: "/dashboard/motor-fiscal",
  },
  {
    id: "check-poliza-cuadrada",
    texto: "Ver que una póliza esté cuadrada",
    descripcion: "Abre el módulo de Pólizas y comprueba que la suma del Debe sea idéntica al Haber.",
    rutaSugerida: "/dashboard/polizas",
  },
  {
    id: "check-aviso-legal",
    texto: "Leer el aviso legal y preventivo",
    descripcion: "Revisa los términos sobre cálculo estimado y la consulta obligatoria con un profesional.",
    rutaSugerida: "/dashboard/motor-fiscal",
  },
];

// ---------------------------------------------------------------------------
// 3. GUÍAS ESPECÍFICAS POR PANTALLA
// ---------------------------------------------------------------------------
export const GUIAS_PANTALLAS: Record<string, PantallaGuia> = {
  "/login": {
    ruta: "/login",
    titulo: "Acceso al Sistema EasyConta MX",
    paraQue:
      "Esta pantalla te permite autenticarte de forma segura en tu espacio contable. Aquí inicias sesión para administrar tus empresas o clientes.",
    bloques: [
      {
        nombre: "Formulario de Correo y Contraseña",
        descripcion: "Credenciales de acceso cifradas mediante NextAuth con contraseñas seguras bcrypt.",
      },
      {
        nombre: "Credenciales Demo Rápidas",
        descripcion:
          "Botones de acceso con un solo clic para probar como Usuario Persona Física (Ana) o como Despacho Contable Multicliente.",
      },
      {
        nombre: "Aviso de Entorno Seguro",
        descripcion: "Recordatorio de que EasyConta no solicita tus claves bancarias ni comparte datos con terceros.",
      },
    ],
    queHacerAhora: [
      "1. Elige una de las cuentas demo preconfiguradas o escribe tu correo registrado.",
      "2. Si usas cuenta demo, la contraseña de prueba es Demo1234!",
      "3. Haz clic en 'Iniciar Sesión' para acceder a tu panel principal.",
    ],
    erroresFrecuentes: [
      "Intentar ingresar con tu contraseña de la e.firma o CIEC del SAT (aquí solo usas tu contraseña de EasyConta).",
      "Confundir mayúsculas y minúsculas en la contraseña.",
    ],
    cuandoSiContador:
      "Si olvidaste qué régimen fiscal tienes registrado ante el SAT para saber qué usuario demo se parece a ti.",
  },

  "/dashboard": {
    ruta: "/dashboard",
    titulo: "Tablero General de Impuestos y Finanzas",
    paraQue:
      "Ver de un vistazo tus ingresos cobrados, gastos deducibles, el estimado de ISR e IVA a pagar en el periodo seleccionado y tus alertas críticas.",
    bloques: [
      {
        nombre: "Selector de Periodo (Mes y Año)",
        descripcion: "Permite filtrar toda la contabilidad entre los meses del ejercicio 2026. Si ves todo en cero, cambia al mes donde tienes facturas.",
      },
      {
        nombre: "Tarjetas de Estimación ISR e IVA",
        descripcion: "Muestra el impuesto mensual calculado con base en ingresos cobrados y deducciones amparadas con CFDI.",
      },
      {
        nombre: "Resumen de Cobrado vs Facturado",
        descripcion: "Distingue el dinero real que entró a tu cuenta bancaria del monto total emitido en facturas a crédito.",
      },
      {
        nombre: "Alertas de Vencimiento y Seguridad",
        descripcion: "Notifica sobre días restantes para declarar ante el SAT (día 17) y estatus de sellos digitales.",
      },
    ],
    queHacerAhora: [
      "1. Confirma que el mes seleccionado corresponda al periodo que deseas revisar.",
      "2. Revisa la cifra de ISR e IVA estimado para prever tu flujo de efectivo.",
      "3. Si los números están en ceros, ve a la Bóveda XML y carga los CFDI de prueba.",
      "4. Atiende cualquier alerta preventiva en color amarillo o rojo.",
    ],
    erroresFrecuentes: [
      "Creer que el vencimiento del día 17 es la fecha límite para facturar (es la fecha para presentar tu declaración mensual y pagar).",
      "Pensar que todo lo facturado genera ISR de inmediato, ignorando que en RESICO y personas físicas aplica flujo de efectivo.",
    ],
    cuandoSiContador:
      "Si tienes discrepancias entre tus estados de cuenta bancarios y los ingresos cobrados calculados, o si recibiste ingresos extraordinarios.",
  },

  "/dashboard/onboarding": {
    ruta: "/dashboard/onboarding",
    titulo: "Alta y Configuración de Nuevo RFC",
    paraQue:
      "Dar de alta un nuevo contribuyente (Persona Física o Moral) dentro de EasyConta para empezar a emitir facturas y llevar su contabilidad.",
    bloques: [
      {
        nombre: "Paso 1: Tipo de Persona y RFC",
        descripcion: "Valida la longitud y estructura oficial del SAT (13 caracteres para PF, 12 para PM).",
      },
      {
        nombre: "Paso 2: Domicilio Fiscal y Razón Social",
        descripcion: "Datos que deben coincidir al 100% con tu Cédula de Identificación Fiscal (CIF).",
      },
      {
        nombre: "Paso 3: Régimen Fiscal 2026",
        descripcion: "Selección entre RESICO (626), Actividad Empresarial (612), Arrendamiento (606) o PM General (601).",
      },
      {
        nombre: "Paso 4: Certificados y Serie de Facturación",
        descripcion: "Asigna la serie inicial y resguarda tu Certificado de Sello Digital (CSD).",
      },
    ],
    queHacerAhora: [
      "1. Ten a la mano tu Constancia de Situación Fiscal actualizada del SAT.",
      "2. Ingresa el RFC en mayúsculas sin espacios ni guiones.",
      "3. Escribe la Razón Social exactamente como viene en tu constancia (sin S.A. de C.V. en personas morales para CFDI 4.0).",
      "4. Confirma el Código Postal registrado ante el SAT.",
    ],
    erroresFrecuentes: [
      "Creer que registrar el RFC aquí te da de alta automáticamente ante el SAT del gobierno (solo te da de alta en la plataforma).",
      "Poner el nombre comercial en lugar de la Razón Social oficial que tiene el SAT en sus registros.",
    ],
    cuandoSiContador:
      "Si tienes dudas sobre cuál es tu régimen fiscal correcto o si ejerces más de una actividad económica simultánea.",
  },

  "/dashboard/facturacion": {
    ruta: "/dashboard/facturacion",
    titulo: "Emisión de Comprobantes Fiscales CFDI 4.0",
    paraQue:
      "Crear y timbrar facturas de ingresos de prueba con validador de catálogo SAT, cálculo automático de IVA y retenciones.",
    bloques: [
      {
        nombre: "Receptor (Cliente)",
        descripcion: "RFC, nombre en mayúsculas, código postal del cliente y su régimen fiscal según constancia.",
      },
      {
        nombre: "Método de Pago (PUE vs PPD)",
        descripcion: "PUE si ya te pagaron; PPD si te pagarán en el futuro o a crédito.",
      },
      {
        nombre: "Conceptos y Servicios",
        descripcion: "Clave de producto SAT, descripción, cantidad, valor unitario y desglose de impuestos.",
      },
      {
        nombre: "Botonera de Timbrado PAC Mock",
        descripcion: "Simula el timbrado oficial generando UUID, cadena original, sello digital y código QR.",
      },
    ],
    queHacerAhora: [
      "1. Solicita a tu cliente su Constancia de Situación Fiscal vigente (no mayor a 3 meses).",
      "2. Copia fielmente el RFC y el Código Postal del receptor.",
      "3. Elige PUE si ya cobraste o PPD si emitirás complemento de pago posteriormente.",
      "4. Agrega los conceptos con su clave SAT correspondiente y haz clic en 'Generar y Timbrar Factura'.",
    ],
    erroresFrecuentes: [
      "Marcar PUE cuando el cliente aún no te transfiere el dinero.",
      "Escribir 'S.A. DE C.V.' en el nombre del receptor cuando CFDI 4.0 exige omitir el régimen societario.",
      "Creer que en este simulador las facturas se envían al SAT real (este entorno es seguro y mock).",
    ],
    cuandoSiContador:
      "Si no sabes qué clave de producto o servicio (ClaveProdServ) del catálogo del SAT le corresponde a lo que vendes.",
  },

  "/dashboard/boveda": {
    ruta: "/dashboard/boveda",
    titulo: "Bóveda Criptográfica y Lector de XML",
    paraQue:
      "Almacenar, indexar y auditar todos tus comprobantes XML emitidos y recibidos, validando su estructura y verificando contra una lista de demo de presuntos EFOS (69-B).",
    bloques: [
      {
        nombre: "Importador de Archivos XML",
        descripcion: "Arrastra archivos .xml para que el parser extraiga automáticamente emisor, receptor, impuestos y totales.",
      },
      {
        nombre: "Botón Cargar CFDI de Prueba",
        descripcion: "Inserta facturas de ejemplo con gastos deducibles e ingresos para probar el sistema sin archivos propios.",
      },
      {
        nombre: "Detector Preventivo (Simulación / Lista de Demo 69-B)",
        descripcion: "Verificación preventiva demostrativa que cruza los RFC de tus proveedores contra una muestra de demo.",
      },
      {
        nombre: "Tabla de Comprobantes",
        descripcion: "Listado con filtros por tipo (Ingreso, Gasto, Pago), método (PUE/PPD) y visualizador de representación impresa.",
      },
    ],
    queHacerAhora: [
      "1. Si tu bóveda está vacía, oprime 'Cargar CFDI de Prueba' para poblarla al instante.",
      "2. Sube tus facturas XML descargadas de tus proveedores para deducir gastos.",
      "3. Revisa la columna de alerta 69-B para confirmar si algún proveedor coincide con la lista de demo.",
    ],
    erroresFrecuentes: [
      "Pensar que guardar solo el PDF es suficiente para amparar una deducción (el XML es el único documento legalmente válido).",
      "Subir archivos que no correspondan al RFC de la empresa seleccionada.",
    ],
    cuandoSiContador:
      "Si alguno de tus proveedores aparece en la lista 69-B definitiva del SAT, consulta a tu contador para acreditar la materialidad del servicio.",
  },

  "/dashboard/conciliacion": {
    ruta: "/dashboard/conciliacion",
    titulo: "Conciliación Bancaria y PUE / PPD",
    paraQue:
      "Garantizar que cada peso que ingresó o salió del banco tenga una factura XML asociada, y dar seguimiento a cobros de facturas a crédito (PPD).",
    bloques: [
      {
        nombre: "Pestaña PUE / PPD",
        descripcion: "Muestra las facturas emitidas a crédito pendientes de cobro para emitirles su complemento de recepción de pago.",
      },
      {
        nombre: "Pestaña Conciliación Bancaria",
        descripcion: "Permite importar un estado de cuenta en archivo CSV bancario y emparejarlo con tus facturas por fecha y monto.",
      },
      {
        nombre: "Resumen de Estatus de Cobranza",
        descripcion: "Métricas de cuentas por cobrar y montos pendientes que aún no causan ISR.",
      },
    ],
    queHacerAhora: [
      "1. En PUE/PPD, revisa qué facturas siguen con saldo insoluto.",
      "2. Cuando tu cliente te pague, haz clic en 'Registrar Cobro' para actualizar el saldo y detonar el cálculo fiscal.",
      "3. En la pestaña Banco, sube tu CSV o usa los movimientos demo para conciliar.",
    ],
    erroresFrecuentes: [
      "Marcar una factura como cobrada sin tener el comprobante bancario del depósito.",
      "Olvidar emitir el complemento de pago antes del quinto día natural del mes siguiente al que se recibió el dinero.",
    ],
    cuandoSiContador:
      "Cuando tu saldo en bancos no cuadre con la suma de tus ingresos y egresos, o existan comisiones bancarias no facturadas.",
  },

  "/dashboard/motor-fiscal": {
    ruta: "/dashboard/motor-fiscal",
    titulo: "Motor de Impuestos y Pagos Provisionales SAT 2026",
    paraQue:
      "Calcular con precisión matemática (usando decimal.js y redondeo fiscal SAT) la determinación mensual de ISR e IVA según tu régimen.",
    bloques: [
      {
        nombre: "Determinación de ISR",
        descripcion: "Aplica las reglas específicas de tu régimen: tasas RESICO (1% - 2.5%), tarifa progresiva Art. 96, deducción ciega o Coeficiente de Utilidad.",
      },
      {
        nombre: "Determinación de IVA",
        descripcion: "Cálculo del IVA trasladado (16%) menos IVA acreditable efectivamente pagado en gastos e inversiones.",
      },
      {
        nombre: "Tarjeta '¿Por qué debo esta cantidad?'",
        descripcion: "Desglose explicativo paso a paso: base gravable, tasa aplicada, retenciones sufridas y total neto a enterar.",
      },
      {
        nombre: "Aviso Legal y Descargo de Responsabilidad",
        descripcion: "Recordatorio obligatorio de que los cálculos son informativos y deben cotejarse antes del envío al portal del SAT.",
      },
    ],
    queHacerAhora: [
      "1. Selecciona el mes y año que vas a declarar.",
      "2. Lee con atención el desglose en la tarjeta explicativa.",
      "3. Verifica que todas tus retenciones efectuadas por personas morales aparezcan restadas.",
      "4. Genera la proyección para apartar el dinero en tu cuenta bancaria antes del día 17.",
    ],
    erroresFrecuentes: [
      "Pensar que en RESICO puedes restar facturas de gastos para bajar el ISR (en RESICO los gastos solo bajan el IVA).",
      "Pagar el impuesto sin verificar que tus clientes personas morales te hayan retenido el 1.25% de ISR.",
    ],
    cuandoSiContador:
      "Siempre que vayas a presentar tu declaración oficial en el portal del SAT, o si tienes pérdidas fiscales de ejercicios anteriores.",
  },

  "/dashboard/polizas": {
    ruta: "/dashboard/polizas",
    titulo: "Pólizas Contables Automatizadas",
    paraQue:
      "Generar los asientos de partida doble (Debe y Haber) que corresponden a cada factura, cobranza o pago realizado en el periodo.",
    bloques: [
      {
        nombre: "Tipos de Póliza",
        descripcion: "Ingreso (cobros reales), Egreso (pagos reales) y Diario (facturas a crédito o provisiones).",
      },
      {
        nombre: "Cuentas Contables y Códigos SAT",
        descripcion: "Asignación de cuentas según el Anexo 24: Clientes, Bancos, Ingresos, IVA Trasladado, IVA Pendiente, etc.",
      },
      {
        nombre: "Indicador de Cuadrante (Debe = Haber)",
        descripcion: "Garantía matemática de que la póliza no tiene descuadre centavo a centavo.",
      },
    ],
    queHacerAhora: [
      "1. Observa cómo al timbrar o subir un CFDI se genera automáticamente la póliza.",
      "2. Revisa que el indicador de cada póliza marque 'Cuadrada'.",
      "3. Si necesitas exportar o revisar los movimientos de una cuenta, búscalos en la tabla.",
    ],
    erroresFrecuentes: [
      "Creer que las pólizas son la declaración de impuestos (las pólizas son tu contabilidad financiera interna).",
      "Modificar manualmente un asiento dejando el Debe diferente al Haber.",
    ],
    cuandoSiContador:
      "Para ajustes de fin de año, depreciaciones de activos fijos, provisiones de nómina y cierre del ejercicio contable.",
  },

  "/dashboard/balanza": {
    ruta: "/dashboard/balanza",
    titulo: "Balanza de Comprobación (Simulación Anexo 24)",
    paraQue:
      "Concentrar los saldos iniciales, movimientos deudor y acreedor, y saldos finales de todas las cuentas contables de la organización con fines didácticos y de control.",
    bloques: [
      {
        nombre: "Estructura Demostrativa Anexo 24 de la RMF",
        descripcion: "Formato estandarizado de simulación para Contabilidad Electrónica en XML.",
      },
      {
        nombre: "Saldos Iniciales y Finales",
        descripcion: "Muestra el acumulado de cada cuenta contable en el mes consultado.",
      },
      {
        nombre: "Descarga de Archivo XML de Simulación Anexo 24",
        descripcion: "Genera el archivo con la estructura demostrativa para control y análisis interno.",
      },
    ],
    queHacerAhora: [
      "1. Selecciona el periodo mensual en el filtro superior.",
      "2. Comprueba que las sumas totales de Movimientos Deudores sean iguales a los Acreedores.",
      "3. Genera el XML si requieres entregarlo a tu auditor o para archivo interno.",
    ],
    erroresFrecuentes: [
      "Tener cuentas de naturaleza deudora (como Bancos) con saldo negativo o acreedor sin justificación.",
      "Mandar este XML al SAT sin que un contador público certificado haya revisado los saldos.",
    ],
    cuandoSiContador:
      "Para dictámenes fiscales, trámites de devolución de saldos a favor o requerimientos de contabilidad electrónica por parte del SAT.",
  },

  "/dashboard/alertas": {
    ruta: "/dashboard/alertas",
    titulo: "Centro de Alertas Fiscales y Riesgos (Simulación)",
    paraQue:
      "Monitoreo preventivo y demostrativo de vencimientos y simulación de cruce con listas de prueba de proveedores.",
    bloques: [
      {
        nombre: "Alertas de Vencimiento de CSD",
        descripcion: "Avisa 30, 15 y 5 días antes de que expire tu Certificado de Sello Digital para tramitar la renovación a tiempo.",
      },
      {
        nombre: "Alertas de Facturas PPD Huérfanas",
        descripcion: "Facturas a crédito que llevan más de 60 días sin recibir su complemento de pago correspondiente.",
      },
      {
        nombre: "Monitoreo en Lista de Demo (EFOS Art. 69-B)",
        descripcion: "Revisión preventiva de proveedores frente a una lista de demo de contribuyentes con señalamientos.",
      },
      {
        nombre: "Semáforo de Límite RESICO ($3.5 MDP)",
        descripcion: "Control acumulado de ingresos para avisarte antes de rebasar el tope y perder el régimen preferencial.",
      },
    ],
    queHacerAhora: [
      "1. Revisa diariamente las alertas con severidad 'CRITICAL' o 'WARNING'.",
      "2. Haz clic en las acciones sugeridas de cada alerta para resolver la causa de raíz.",
      "3. Marca como atendida la alerta una vez que hayas realizado la acción preventiva.",
    ],
    erroresFrecuentes: [
      "Ignorar las alertas de vencimiento de sellos (renovar un CSD revocado puede demorar de 24 a 72 horas hábiles en el SAT).",
      "Confundir este centro de alertas con el Buzón Tributario oficial del SAT.",
    ],
    cuandoSiContador:
      "Inmediatamente si recibes una alerta por operaciones con un proveedor que cayó en el supuesto definitivo del 69-B en los listados oficiales del SAT.",
  },

  "/dashboard/despacho": {
    ruta: "/dashboard/despacho",
    titulo: "Modo Despacho y Gestión Multi-RFC",
    paraQue:
      "Diseñado para contadores y despachos que gestionan múltiples razones sociales desde una sola consola centralizada.",
    bloques: [
      {
        nombre: "Matriz de Contribuyentes",
        descripcion: "Vista panorámica de todos los RFC asignados con estatus de semáforo fiscal, régimen y fecha de última declaración.",
      },
      {
        nombre: "Acceso Rápido por Contribuyente",
        descripcion: "Cambia de cliente en un clic cargando instantáneamente sus facturas, pólizas y cálculos sin cerrar sesión.",
      },
      {
        nombre: "Concentrado de Cumplimiento",
        descripcion: "Resumen global de declaraciones pendientes antes del día 17 del mes en curso.",
      },
    ],
    queHacerAhora: [
      "1. Revisa qué clientes tienen pendiente su conciliación del mes.",
      "2. Haz clic en 'Administrar' sobre el cliente con el que vas a trabajar hoy.",
      "3. Da de alta nuevos clientes con el botón '+ Agregar Cliente'.",
    ],
    erroresFrecuentes: [
      "Capturar facturas o subir archivos XML sin fijarse en qué RFC está activo en ese momento en la barra superior.",
      "Mezclar cuentas bancarias de diferentes empresas.",
    ],
    cuandoSiContador:
      "Este módulo es precisamente la herramienta de trabajo para el contador titular del despacho.",
  },

  "/dashboard/certificados": {
    ruta: "/dashboard/certificados",
    titulo: "Bóveda de Certificados SAT (CSD y e.firma)",
    paraQue:
      "Administrar de forma ultra segura tus archivos .cer, .key y contraseñas fiscales, protegidos con cifrado militar AES-256-GCM.",
    bloques: [
      {
        nombre: "Certificado de Sello Digital (CSD)",
        descripcion: "Es el sello específico y único que se utiliza para emitir y timbrar facturas CFDI 4.0. Puede revocarse sin afectar tu identidad fiscal.",
      },
      {
        nombre: "Firma Electrónica Avanzada (e.firma)",
        descripcion: "Tu firma de identidad personal para trámites SAT, renovaciones y consultas. Por regla de seguridad SAT NUNCA se utiliza para timbrar facturas.",
      },
      {
        nombre: "Cifrado Criptográfico AES-256-GCM",
        descripcion: "Tus llaves privadas nunca se guardan en texto plano; se cifran con una clave maestra del servidor de 256 bits.",
      },
      {
        nombre: "Vigencia y No. de Certificado",
        descripcion: "Lectura del número de serie y fecha de expiración para que no te quedes sin poder facturar.",
      },
    ],
    queHacerAhora: [
      "1. Si vas a facturar, sube los archivos .cer y .key de tu CSD junto con su contraseña.",
      "2. Si vas a realizar consultas del portal SAT, sube tu e.firma en el apartado correspondiente.",
      "3. Verifica que la vigencia del certificado marque más de 30 días restantes.",
    ],
    erroresFrecuentes: [
      "Subir los archivos de la e.firma en el casillero del CSD (los archivos tienen nombres similares pero extensiones y funciones distintas).",
      "Subir certificados reales en entornos de prueba no auditados sin conocer la política de cifrado.",
    ],
    cuandoSiContador:
      "Si tus certificados fueron revocados por el SAT por presuntas irregularidades fiscales o si necesitas tramitar un nuevo CSD en CertiSAT Web.",
  },
};

// ---------------------------------------------------------------------------
// 4. GLOSARIO SAT CURADO (Mínimo los 28 términos requeridos)
// ---------------------------------------------------------------------------
export const GLOSARIO_SAT: TerminoGlosario[] = [
  {
    id: "rfc",
    termino: "RFC",
    queEs: "Registro Federal de Contribuyentes: clave alfanumérica única que asigna el gobierno mexicano a cada persona o negocio.",
    paraQue: "Identificarte ante el SAT para pagar impuestos, facturar y abrir cuentas bancarias.",
    ejemplo: "Las personas físicas tienen 13 caracteres (ej. ROVM900101XYZ) y las morales 12 (ej. CFC2401019A8).",
    errorComun: "Confundir la letra O con el número 0 al escribir la homoclave final.",
  },
  {
    id: "cfdi-4-0",
    termino: "CFDI 4.0",
    queEs: "Comprobante Fiscal Digital por Internet en su versión vigente 4.0. Es la factura electrónica oficial en México.",
    paraQue: "Comprobar legalmente ingresos, egresos y traslados de mercancías ante las autoridades fiscales.",
    ejemplo: "Desde 2023 es obligatorio emitir facturas en versión 4.0 incluyendo el código postal exacto del cliente.",
    errorComun: "Poner el nombre comercial del cliente o incluir el régimen de capital (como S.A. de C.V.) en el campo de Razón Social.",
  },
  {
    id: "uuid",
    termino: "UUID (Folio Fiscal)",
    queEs: "Identificador Universal Único de 36 caracteres que el PAC le asigna a tu factura al momento de timbrarla.",
    paraQue: "Garantizar que tu factura es auténtica, no está duplicada y existe registrada en la base de datos del SAT.",
    ejemplo: "Tiene la forma 8A2F1B04-3C89-4D12-9F67-8822005544AA.",
    errorComun: "Confundir el folio interno de tu empresa (ej. Factura #105) con el UUID oficial del SAT.",
  },
  {
    id: "xml",
    termino: "XML",
    queEs: "Archivo de texto estructurado con código informático que contiene toda la información de la factura y los sellos digitales.",
    paraQue: "Es el ÚNICO comprobante con validez legal ante el SAT; es la prueba jurídica de la operación.",
    ejemplo: "El SAT no revisa imágenes ni hojas impresas; sus sistemas leen directamente los nodos del XML.",
    errorComun: "Guardar únicamente el archivo PDF y borrar o perder el archivo XML.",
  },
  {
    id: "pdf-representacion",
    termino: "PDF (Representación Impresa)",
    queEs: "Traducción visual y legible para humanos del contenido que viene dentro del archivo XML de la factura.",
    paraQue: "Entregar una copia visual amigable a tu cliente con tu logotipo, desglose claro y código QR.",
    ejemplo: "Un PDF sin su respectivo XML firmado no tiene ningún valor fiscal para una deducción.",
    errorComun: "Creer que el PDF es el documento oficial y que no necesitas conservar el XML.",
  },
  {
    id: "pac",
    termino: "PAC",
    queEs: "Proveedor Autorizado de Certificación: empresa privada autorizada y auditada por el SAT para certificar y timbrar CFDI.",
    paraQue: "Revisar que tu factura cumpla todas las reglas del SAT y estamparle el timbre digital con el UUID oficial.",
    ejemplo: "En EasyConta contamos con un adaptador Mock para pruebas seguras que simula el timbrado de un PAC real.",
    errorComun: "Pensar que las facturas se timbran directamente en la página web del SAT sin pasar por un PAC.",
  },
  {
    id: "csd",
    termino: "CSD (Certificado de Sello Digital)",
    queEs: "Par de llaves digitales (.cer y .key) tramitadas ante el SAT destinadas EXCLUSIVAMENTE a firmar y emitir facturas.",
    paraQue: "Firmar digitalmente cada CFDI demostrando que tu empresa fue quien emitió el comprobante.",
    ejemplo: "Si sospechas de un robo o fuga de sellos, puedes cancelar el CSD sin perder tu e.firma personal.",
    errorComun: "Confundir el CSD con la e.firma personal y usar la llave incorrecta al configurar tu facturador.",
  },
  {
    id: "efirma",
    termino: "e.firma (Antes FIEL)",
    queEs: "Firma Electrónica Avanzada que equivale jurídicamente a tu firma de puño y letra ante cualquier autoridad mexicana.",
    paraQue: "Hacer trámites en el portal del SAT, presentar declaraciones anuales, solicitar devoluciones y renovar sellos.",
    ejemplo: "Tu e.firma es como la llave maestra de tu patrimonio; jamás debes compartirla a la ligera.",
    errorComun: "Subir la e.firma para timbrar facturas (el SAT prohíbe timbrar con e.firma; se debe usar siempre CSD).",
  },
  {
    id: "pue",
    termino: "PUE (Pago en Una Sola Exhibición)",
    queEs: "Método de pago que indica que la factura se cobró en el momento o se liquidará por completo antes de terminar el mes en curso.",
    paraQue: "Evitar la obligación de generar complementos de pago posteriores.",
    ejemplo: "Si vendes un producto en mostrador y te pagan al contado o con tarjeta bancaria, emites PUE.",
    errorComun: "Emitir PUE cuando acordaste que el cliente te transferirá el dinero a 30 o 60 días.",
  },
  {
    id: "ppd",
    termino: "PPD (Pago en Parcialidades o Diferido)",
    queEs: "Método de pago para facturas a crédito, en abonos o cuando no recibiste el dinero al momento de expedir el comprobante.",
    paraQue: "Diferir la causación de tus impuestos hasta el momento exacto en que tu cliente te transfiera el dinero.",
    ejemplo: "Vendes mercancía por \$50,000 con pago en 3 mensualidades: emites PPD y un complemento por cada mensualidad.",
    errorComun: "Emitir PPD y olvidar emitir el CFDI de pago cuando el cliente te liquida la cuenta.",
  },
  {
    id: "complemento-pago",
    termino: "Complemento de Pago (Recibo Electrónico de Pago)",
    queEs: "Factura especial de tipo 'Pago' que se emite para amparar el cobro total o parcial de una factura emitida previamente en PPD.",
    paraQue: "Demostrar ante el SAT la fecha real en que entró el dinero a tu banco y amparar el IVA cobrado/pagado.",
    ejemplo: "Si tu cliente te paga \$10,000 de una factura a crédito, le emites un complemento de pago amarrado a su UUID.",
    errorComun: "Pensar que con el estado de cuenta bancario basta para deducir una compra que se facturó en PPD.",
  },
  {
    id: "isr",
    termino: "ISR (Impuesto Sobre la Renta)",
    queEs: "Impuesto directo federal que grava las ganancias o utilidades obtenidas por personas físicas y morales.",
    paraQue: "Contribuir al gasto público federal con base en tu capacidad contributiva y el régimen fiscal en el que tributes.",
    ejemplo: "En RESICO PF pagas del 1% al 2.5% de tus ingresos brutos, mientras que en Actividad Empresarial pagas según tarifa sobre utilidad.",
    errorComun: "Creer que todo el dinero que entra a tu cuenta bancaria es utilidad sujeta a la tasa máxima de ISR.",
  },
  {
    id: "iva",
    termino: "IVA (Impuesto al Valor Agregado)",
    queEs: "Impuesto indirecto del 16% (o 0% en alimentos y medicinas) que grava el consumo de bienes y servicios.",
    paraQue: "Recaudar un gravamen que no es tuyo: tú solo lo cobras a tu cliente para luego entregárselo al SAT.",
    ejemplo: "Cobras \$1,000 + \$160 de IVA. Los \$160 no son tu ingreso; debes restarle el IVA de tus gastos y pagar la diferencia.",
    errorComun: "Gastarte el IVA cobrado pensando que es parte de tu ganancia neta disponible del mes.",
  },
  {
    id: "retencion",
    termino: "Retención de Impuestos",
    queEs: "Monto de ISR o IVA que una persona moral le descuenta a una persona física al momento de pagarle una factura.",
    paraQue: "Garantizar al SAT el cobro anticipado de impuestos; la persona moral lo entera al fisco a nombre del prestador del servicio.",
    ejemplo: "En RESICO PF, cuando le facturas a una empresa, te retienen obligatoriamente el 1.25% de ISR.",
    errorComun: "Volver a pagar el 1.25% en tu declaración mensual en lugar de acreditarlo y restarlo de tu impuesto a pagar.",
  },
  {
    id: "resico",
    termino: "RESICO (Régimen Simplificado de Confianza)",
    queEs: "Régimen fiscal del SAT creado para personas físicas con ingresos de hasta \$3.5 millones de pesos al año con tasas de ISR muy bajas (1% - 2.5%).",
    paraQue: "Facilitar el pago de impuestos a pequeños empresarios, profesionistas y arrendadores a cambio de no poder deducir gastos para ISR.",
    ejemplo: "Si cobraste \$50,000 en el mes, tu ISR determinado al 1.10% es de solo \$550 pesos.",
    errorComun: "Creer que en RESICO no necesitas pedir facturas de tus gastos (las facturas son indispensables para restar y bajar el IVA).",
  },
  {
    id: "actividad-empresarial",
    termino: "Actividad Empresarial y Profesional (Régimen 612)",
    queEs: "Régimen tradicional para personas físicas que comercializan bienes, prestan servicios independientes o realizan actividades industriales.",
    paraQue: "Tributar mediante tarifa progresiva (hasta el 35%) sobre la utilidad real (Ingresos acumulables menos deducciones autorizadas).",
    ejemplo: "Un consultor cobra \$80,000 y gasta \$30,000 en insumos facturados: paga ISR solo sobre la base neta de \$50,000.",
    errorComun: "Intentar deducir compras que no son estrictamente indispensables para la actividad del negocio.",
  },
  {
    id: "arrendamiento",
    termino: "Arrendamiento de Inmuebles (Régimen 606)",
    queEs: "Régimen aplicable a personas físicas que obtienen ingresos por rentar casas, departamentos, oficinas, bodegas o locales comerciales.",
    paraQue: "Calcular el ISR permitiendo optar por la 'deducción ciega' del 35% de los ingresos más el predial, sin comprobantes de gastos.",
    ejemplo: "Cobras \$20,000 de renta: con deducción ciega descuentas \$7,000 automáticamente y pagas ISR solo sobre \$13,000.",
    errorComun: "Aplicar deducción ciega y pretender deducir simultáneamente facturas de remodelación o pintura.",
  },
  {
    id: "persona-moral",
    termino: "Persona Moral (Régimen 601 General)",
    queEs: "Entidad jurídica formada por dos o más socios (ej. S.A. de C.V., S.A.P.I., S. de R.L.) que tributa en el Título II de la LISR.",
    paraQue: "Determinar pagos provisionales mensuales aplicando el Coeficiente de Utilidad (CU) a los ingresos nominales, gravados al 30%.",
    ejemplo: "Una S.A. de C.V. no calcula sus pagos mensuales restando gastos mes a mes, sino aplicando el Coeficiente del ejercicio previo.",
    errorComun: "Tratar a una Persona Moral como si fuera una Persona Física en el cálculo provisional de ISR mensual.",
  },
  {
    id: "coeficiente-utilidad",
    termino: "Coeficiente de Utilidad (CU)",
    queEs: "Factor porcentual que refleja el margen de ganancia fiscal que una persona moral obtuvo en su última declaración anual.",
    paraQue: "Calcular la base estimada sobre la cual la empresa pagará sus anticipos provisionales de ISR durante todo el año.",
    ejemplo: "Si tu CU es de 0.0825 (8.25%) y vendiste \$1,000,000, tu utilidad estimada del mes es de \$82,500 y pagarás el 30% de eso.",
    errorComun: "Usar un Coeficiente de Utilidad vencido sin actualizarlo tras presentar la Declaración Anual de marzo.",
  },
  {
    id: "poliza",
    termino: "Póliza Contable",
    queEs: "Documento digital interno donde se registra formalmente un hecho económico de la empresa mediante asientos de cargo y abono.",
    paraQue: "Construir la contabilidad formal que respalda los estados financieros y la contabilidad electrónica ante el SAT.",
    ejemplo: "Al cobrar una factura de \$1,160: abonas a Clientes por \$1,160 y cargas a Bancos por \$1,160.",
    errorComun: "Guardar una póliza que no está cuadrada (donde la suma del Debe no es idéntica a la suma del Haber).",
  },
  {
    id: "balanza",
    termino: "Balanza de Comprobación",
    queEs: "Informe contable mensual que reúne todas las cuentas del catálogo con sus saldos iniciales, movimientos del mes y saldos finales.",
    paraQue: "Verificar la exactitud del libro mayor y generar el archivo XML de contabilidad electrónica requerido por el SAT.",
    ejemplo: "La balanza demuestra que las sumas de todos los cargos del mes igualan con exactitud matemática a todos los abonos.",
    errorComun: "Presentar la balanza con cuentas bancarias en saldo negativo o con descuadres aritméticos.",
  },
  {
    id: "catalogo-cuentas",
    termino: "Catálogo de Cuentas",
    queEs: "Lista ordenada y codificada de todas las cuentas contables que utiliza tu empresa para registrar sus operaciones financieras.",
    paraQue: "Organizar activos, pasivos, capital, ingresos y gastos bajo una nomenclatura uniforme.",
    ejemplo: "En EasyConta viene precargado el catálogo base alineado con los lineamientos del Anexo 24 del SAT.",
    errorComun: "Crear cuentas personalizadas sin asociarles su Código Agrupador oficial del SAT.",
  },
  {
    id: "codigo-agrupador",
    termino: "Código Agrupador SAT",
    queEs: "Clave numérica establecida por el SAT en el Anexo 24 que homologa las cuentas de cualquier empresa con el catálogo fiscal general.",
    paraQue: "Permitir que el SAT compare la contabilidad de diferentes negocios bajo el mismo lenguaje contable.",
    ejemplo: "El código 102.01 corresponde obligatoriamente a 'Bancos Nacionales' y el 401.01 a 'Ventas o Ingresos gravados al 16%'.",
    errorComun: "Asignar un código de pasivo a una cuenta de activo, desconfigurando los reportes de contabilidad electrónica.",
  },
  {
    id: "dia-17",
    termino: "Día 17 del Mes",
    queEs: "Fecha límite general establecida en el Código Fiscal de la Federación para presentar declaraciones provisionales y pagar impuestos.",
    paraQue: "Cumplir en tiempo y forma evitando recargos, actualizaciones y requerimientos de la autoridad.",
    ejemplo: "Los impuestos correspondientes a las operaciones de enero se declaran y pagan a más tardar el 17 de febrero.",
    errorComun: "Olvidar que según el sexto dígito de tu RFC puedes tener de 1 a 5 días hábiles adicionales de prórroga legal.",
  },
  {
    id: "buzon-tributario",
    termino: "Buzón Tributario",
    queEs: "Canal de comunicación digital oficial y obligatorio entre el SAT y cada contribuyente con RFC activo.",
    paraQue: "Notificar actos administrativos, requerimientos, resoluciones a trámites y recibir avisos de interés fiscal.",
    ejemplo: "El SAT deposita un aviso en tu buzón y tienes 3 días hábiles para abrirlo antes de que se considere notificado legalmente.",
    errorComun: "No mantener actualizados los correos electrónicos y teléfonos de contacto en el Buzón Tributario (motivo de multa).",
  },
  {
    id: "lista-69-b",
    termino: "Lista Negra del SAT (Art. 69-B CFF - Simulación / Demo)",
    queEs: "Padrón del SAT sobre presuntos EFOS. En EasyConta se utiliza una muestra local de simulación para propósitos didácticos y de prueba.",
    paraQue: "Demostrar cómo operaría la detección preventiva ante proveedores con operaciones presuntamente inexistentes.",
    ejemplo: "EasyConta compara los RFC de tus facturas de gastos con la lista de demo para mostrarte alertas preventivas.",
    errorComun: "Asumir que la lista local de demo sustituye la publicación oficial en el Diario Oficial de la Federación (DOF).",
  },
  {
    id: "opinion-32-d",
    termino: "Opinión del Cumplimiento (Art. 32-D - Simulación / Demo)",
    queEs: "Simulación de la opinión que califica la situación fiscal como Positiva o Negativa para fines demostrativos en la plataforma.",
    paraQue: "Mostrar visualmente cómo se refleja el cumplimiento o inconsistencias en un tablero contable.",
    ejemplo: "En el dashboard puedes ver una simulación demostrativa del estatus de la Opinión 32-D.",
    errorComun: "Presentar el reporte o estatus de prueba de la aplicación como si fuera un documento oficial emitido por el SAT.",
  },
  {
    id: "linea-captura",
    termino: "Línea de Captura",
    queEs: "Cadena numérica de 20 dígitos generada por el SAT con el monto exacto a pagar y la fecha de vencimiento bancaria.",
    paraQue: "Pagar tus impuestos desde el portal de banca en línea de tu banco en el apartado 'Pago de Impuestos Federales'.",
    ejemplo: "Una línea de captura se parece a: 0226 5589 1234 9876 4321.",
    errorComun: "Intentar pagar la línea de captura después de la fecha límite bancaria (debes regenerarla con recargos actualizados).",
  },
];

// ---------------------------------------------------------------------------
// 5. PREGUNTAS FRECUENTES (FAQ - 12 Respuestas de 4 a 8 líneas)
// ---------------------------------------------------------------------------
export const FAQ_ASISTENTE: PreguntaFrecuente[] = [
  {
    id: "faq-reemplaza-sat",
    pregunta: "¿Esto reemplaza al SAT?",
    respuesta:
      "No. EasyConta MX es una plataforma tecnológica de control interno, cálculo provisional y emisión de facturas electrónicas. No es el portal gubernamental del SAT ni una autoridad fiscal. Todos los impuestos calculados en esta plataforma deben ser presentados y enterados formalmente a través del portal oficial del SAT (sat.gob.mx) mediante tus líneas de captura autorizadas.",
  },
  {
    id: "faq-reemplaza-contador",
    pregunta: "¿Esto reemplaza a mi contador?",
    respuesta:
      "No. EasyConta automatiza los cálculos matemáticos, la lectura de tus XML y la organización de tus pólizas, pero un contador público colegiado es indispensable para definir tu estrategia fiscal, auditar la deducibilidad de gastos complejos, atender requerimientos y defenderte ante revisiones de la autoridad. Recomendamos usar esta herramienta en equipo con tu contador.",
  },
  {
    id: "faq-facturas-sat-real",
    pregunta: "¿Mis facturas ya quedaron ante el SAT?",
    respuesta:
      "En esta versión de EasyConta MX estás operando con un PAC Mock para pruebas seguras. Los comprobantes que generas tienen el formato exacto del estándar CFDI 4.0 del SAT y sellos criptográficos simulados, pero NO se transmiten a los servidores del SAT real. Es un entorno seguro para practicar y verificar que tus procesos cuadren sin riesgo de timbrar facturas erróneas con consecuencias fiscales.",
  },
  {
    id: "faq-ppd-no-aumenta-isr",
    pregunta: "¿Por qué una factura PPD no me aumenta el ISR?",
    respuesta:
      "Porque para la mayoría de las personas físicas (RESICO, Actividad Empresarial, Arrendamiento) el ISR se causa bajo el principio de flujo de efectivo: solo pagas impuestos por el dinero que efectivamente cobraste. Al emitir en PPD indicas que el cliente aún no te paga. El impuesto se calculará hasta el momento exacto en que registres el Complemento de Pago donde se acredite el ingreso en tu cuenta bancaria.",
  },
  {
    id: "faq-sin-ingresos-mes",
    pregunta: "¿Qué hago si no tuve ingresos en el mes?",
    respuesta:
      "Aun cuando tus ingresos hayan sido de \$0.00 pesos, la ley fiscal te obliga a presentar tu declaración mensual en ceros ante el SAT. En EasyConta verás la determinación en ceros para el periodo. No presentar la declaración bajo el pretexto de no haber tenido ingresos genera multas automáticas y provocará que tu Opinión de Cumplimiento (32-D) cambie a estatus Negativo.",
  },
  {
    id: "faq-deducir-despensa-gasolina",
    pregunta: "¿Puedo deducir la despensa o la gasolina?",
    respuesta:
      "La despensa personal NUNCA es deducible para una persona física, pues el SAT exige que los gastos sean estrictamente indispensables para tu actividad comercial. La gasolina sí puede ser deducible si tu vehículo se usa para el trabajo, pero con dos reglas de oro: debe ser pagada con tarjeta, transferencia o monedero electrónico (nunca en efectivo) y contar con su respectivo XML con el permiso CRE del expendio.",
  },
  {
    id: "faq-que-es-el-16",
    pregunta: "¿Qué es el 16%?",
    respuesta:
      "El 16% es la tasa general del Impuesto al Valor Agregado (IVA) en México. Cuando vendes o prestas un servicio gravado, tienes la obligación de cobrarle al cliente ese 16% adicional sobre tu subtotal. Ese dinero no es ganancia tuya: pertenece al SAT. Al final del mes le restas el 16% de IVA que tú pagaste en tus compras autorizadas y solo transfieres al gobierno la diferencia a pagar.",
  },
  {
    id: "faq-cp-cliente",
    pregunta: "¿Por qué me pide el código postal del cliente?",
    respuesta:
      "Bajo el estándar del CFDI 4.0, el SAT estableció una validación cruzada obligatoria: el Código Postal y el Nombre o Razón Social del receptor deben coincidir idénticamente con los registros de la base de datos del SAT. Si el Código Postal de la factura no coincide con el domicilio fiscal que tu cliente tiene en su Constancia de Situación Fiscal vigente, el timbrado de la factura es rechazado.",
  },
  {
    id: "faq-error-regimen",
    pregunta: "¿Qué pasa si me equivoco de régimen?",
    respuesta:
      "Si seleccionas un régimen fiscal incorrecto en EasyConta, los cálculos de ISR serán erróneos (por ejemplo, calcular una tasa plana de RESICO en lugar de la tarifa progresiva de Actividad Empresarial). Si esto sucede, puedes modificar el régimen de tu RFC en la configuración de la organización. Sin embargo, para corregirlo ante la ley, tu contador deberá presentar una actualización de actividades económicas ante el SAT.",
  },
  {
    id: "faq-borrar-factura",
    pregunta: "¿Puedo borrar una factura?",
    respuesta:
      "Una factura con sello digital timbrado legalmente jamás se 'borra', únicamente puede ser CANCELADA siguiendo el procedimiento del SAT. Dependiendo del monto y del tiempo transcurrido desde su emisión, el SAT puede exigir la aceptación explícita de tu cliente a través del Buzón Tributario para autorizar la cancelación. En EasyConta los registros conservan trazabilidad para auditoría contable.",
  },
  {
    id: "faq-seguro-subir-efirma",
    pregunta: "¿Es seguro subir mi e.firma?",
    respuesta:
      "En EasyConta MX implementamos una Bóveda de Certificados con cifrado de grado militar AES-256-GCM y clave maestra en variable de entorno protegida. Tus archivos .key y contraseñas nunca se guardan en texto claro. Además, la plataforma tiene una regla estricta por diseño de software: la e.firma NUNCA se utiliza para timbrado de facturas, reservándose exclusivamente para trámites y validaciones de identidad.",
  },
  {
    id: "faq-dashboard-en-ceros",
    pregunta: "¿Por qué el dashboard está en ceros?",
    respuesta:
      "Esto ocurre típicamente por dos motivos: el mes seleccionado en el filtro superior no tiene movimientos registrados todavía, o tu Bóveda XML aún no cuenta con facturas importadas. Para solucionarlo en unos segundos, verifica que estés consultando el mes con datos (por ejemplo, Septiembre 2026) o dirígete al módulo de 'Bóveda XML' y haz clic en 'Cargar CFDI de Prueba' para alimentar el sistema.",
  },
];

