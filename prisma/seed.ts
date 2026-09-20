import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { PacMockAdapter } from "../src/lib/sat/pac-mock";
import { AccountingEngine, CATALOGO_SAT_BASE } from "../src/lib/sat/accounting-engine";
import { calcularImpuestosSat2026, calcularFechaVencimientoSat } from "../src/lib/sat/tax-engine";

const prisma = new PrismaClient();

async function main() {
  console.log("🚀 Iniciando seed SAT 2026 para EasyConta MX...");

  // 1. Limpieza de tablas existentes
  await prisma.bankTransaction.deleteMany({});
  await prisma.polizaEntry.deleteMany({});
  await prisma.poliza.deleteMany({});
  await prisma.paymentComplement.deleteMany({});
  await prisma.invoiceItem.deleteMany({});
  await prisma.invoice.deleteMany({});
  await prisma.taxDeclarationMonth.deleteMany({});
  await prisma.fiscalAlert.deleteMany({});
  await prisma.satCatalogAccount.deleteMany({});
  await prisma.satBlacklist.deleteMany({});
  await prisma.organizationMember.deleteMany({});
  await prisma.organization.deleteMany({});
  await prisma.subscription.deleteMany({});
  await prisma.user.deleteMany({});

  console.log("🧹 Tablas limpias.");

  // 2. Poblar Lista Negra SAT 69-B (EFOS)
  await prisma.satBlacklist.createMany({
    data: [
      {
        rfc: "FSO160412KJ9",
        razonSocial: "Facturas y Servicios del Occidente SA de CV",
        situacion: "DEFINITIVO",
        publicacionDof: new Date("2024-05-18"),
        oficio: "500-05-2024-18492",
        motivo: "Comprobantes fiscales sin activos, personal o infraestructura (Art. 69-B CFF)",
      },
      {
        rfc: "GMB190304PL3",
        razonSocial: "Grupo Multiservicios del Bajío SA de CV",
        situacion: "PRESUNTO",
        publicacionDof: new Date("2025-11-04"),
        oficio: "500-05-2025-09123",
        motivo: "Notificación de presunción de inexistencia de operaciones",
      },
    ],
  });
  console.log("📋 Lista negra SAT 69-B precargada.");

  // Password compartida para usuarios demo
  const passwordHash = await bcrypt.hash("Demo1234!", 10);

  // 3. Crear Usuario Demo 1: Ana (Persona Física)
  const userAna = await prisma.user.create({
    data: {
      email: "ana@easyconta.mx",
      name: "Ana Sofía Morales",
      password: passwordHash,
      role: "USER",
      isDespacho: false,
    },
  });

  // Suscripción FREE de Ana
  await prisma.subscription.create({
    data: {
      userId: userAna.id,
      plan: "FREE",
      status: "ACTIVE",
      timbresIncluidos: 10,
      timbresUsados: 5,
    },
  });

  // Empresas de Ana:
  // Empresa 1: RESICO PF
  const orgAnaResico = await prisma.organization.create({
    data: {
      rfc: "LOMA900101ABC",
      razonSocial: "Mariana López Asesorías",
      tipoPersona: "PF",
      regimenFiscal: "626", // RESICO PF
      codigoPostal: "06600",
      calle: "Paseo de la Reforma 222",
      colonia: "Juárez",
      municipio: "Cuauhtémoc",
      estado: "Ciudad de México",
      csdStatus: "ACTIVO",
      csdNoCertificado: "30001000000500003416",
      csdVencimiento: new Date("2028-12-31"),
      opinionCumplimiento: "POSITIVA",
      efosStatus: "LIMPIO",
      serieDefault: "F",
      folioActual: 104,
    },
  });

  await prisma.organizationMember.create({
    data: {
      userId: userAna.id,
      organizationId: orgAnaResico.id,
      role: "OWNER",
    },
  });

  // Empresa 2 de Ana: Actividad Empresarial
  const orgAnaAe = await prisma.organization.create({
    data: {
      rfc: "GAMA850512XYZ",
      razonSocial: "Arturo Garza Soluciones Técnicas",
      tipoPersona: "PF",
      regimenFiscal: "612", // Actividad Empresarial y Profesional
      codigoPostal: "64000",
      calle: "Av. Constitución 1500",
      colonia: "Centro",
      municipio: "Monterrey",
      estado: "Nuevo León",
      opinionCumplimiento: "POSITIVA",
      efosStatus: "LIMPIO",
    },
  });

  await prisma.organizationMember.create({
    data: {
      userId: userAna.id,
      organizationId: orgAnaAe.id,
      role: "OWNER",
    },
  });

  // Establecer empresa activa por defecto de Ana
  await prisma.user.update({
    where: { id: userAna.id },
    data: { activeCompanyId: orgAnaResico.id },
  });

  // 4. Crear Usuario Demo 2: Despacho Contable (Multi-Cliente)
  const userDespacho = await prisma.user.create({
    data: {
      email: "despacho@easyconta.mx",
      name: "C.P. Ricardo Mendoza (Despacho S.C.)",
      password: passwordHash,
      role: "CONTADOR",
      isDespacho: true,
    },
  });

  // Suscripción DESPACHO
  await prisma.subscription.create({
    data: {
      userId: userDespacho.id,
      plan: "DESPACHO",
      status: "ACTIVE",
      timbresIncluidos: 200,
      timbresUsados: 25,
    },
  });

  // Clientes del despacho
  // Cliente 1: PM General
  const orgPmGeneral = await prisma.organization.create({
    data: {
      rfc: "SFI200115AA1",
      razonSocial: "Soluciones Fiscales Integrales SA de CV",
      tipoPersona: "PM",
      regimenFiscal: "601", // General de Ley PM
      codigoPostal: "01000",
      calle: "Av. Insurgentes Sur 1602",
      colonia: "Crédito Constructor",
      municipio: "Benito Juárez",
      estado: "Ciudad de México",
      coeficienteUtilidad: 0.0825,
      csdStatus: "ACTIVO",
      opinionCumplimiento: "POSITIVA",
      efosStatus: "LIMPIO",
      serieDefault: "A",
      folioActual: 250,
    },
  });

  // Cliente 2: Arrendamiento PF
  const orgArrendamiento = await prisma.organization.create({
    data: {
      rfc: "MERA780320K89",
      razonSocial: "Dr. Roberto Garza Mercado",
      tipoPersona: "PF",
      regimenFiscal: "606", // Arrendamiento
      codigoPostal: "44100",
      calle: "Av. Vallarta 2100",
      colonia: "Lafayette",
      municipio: "Guadalajara",
      estado: "Jalisco",
      deduccionCiega: true, // 35% sin comprobante
      opinionCumplimiento: "POSITIVA",
      efosStatus: "LIMPIO",
      serieDefault: "ARR",
      folioActual: 45,
    },
  });

  // Cliente 3: RESICO PF Cliente Despacho
  const orgResicoCliente = await prisma.organization.create({
    data: {
      rfc: "VAPE921004HJ2",
      razonSocial: "Valeria Pérez Estudio Creativo",
      tipoPersona: "PF",
      regimenFiscal: "626", // RESICO PF
      codigoPostal: "76000",
      calle: "Av. 5 de Febrero 100",
      colonia: "Centro",
      municipio: "Querétaro",
      estado: "Querétaro",
      opinionCumplimiento: "POSITIVA",
      efosStatus: "LIMPIO",
    },
  });

  // Cliente 4: PM con observación de proveedor 69-B
  const orgPmAlerta = await prisma.organization.create({
    data: {
      rfc: "TEC180723MN4",
      razonSocial: "Tecnologías de Vanguardia SA de CV",
      tipoPersona: "PM",
      regimenFiscal: "601",
      codigoPostal: "66260",
      calle: "Calzada del Valle 400",
      colonia: "Del Valle",
      municipio: "San Pedro Garza García",
      estado: "Nuevo León",
      coeficienteUtilidad: 0.125,
      opinionCumplimiento: "NEGATIVA", // Para simular alerta 32-D
      efosStatus: "EN_OBSERVACION",
    },
  });

  // Asignar todas las organizaciones al despacho
  const despachoClients = [orgPmGeneral, orgArrendamiento, orgResicoCliente, orgPmAlerta, orgAnaResico];
  for (const client of despachoClients) {
    await prisma.organizationMember.upsert({
      where: {
        userId_organizationId: {
          userId: userDespacho.id,
          organizationId: client.id,
        },
      },
      update: {},
      create: {
        userId: userDespacho.id,
        organizationId: client.id,
        role: "CONTADOR",
      },
    });
  }

  await prisma.user.update({
    where: { id: userDespacho.id },
    data: { activeCompanyId: orgPmGeneral.id },
  });

  console.log("🏢 Organizaciones y Usuarios creados con éxito.");

  // 5. Poblar Catálogo de Cuentas SAT Anexo 24 para cada empresa
  for (const org of [orgAnaResico, orgAnaAe, orgPmGeneral, orgArrendamiento, orgResicoCliente, orgPmAlerta]) {
    for (const cta of CATALOGO_SAT_BASE) {
      await prisma.satCatalogAccount.create({
        data: {
          organizationId: org.id,
          codigoSat: cta.codigoSat,
          nombre: cta.nombre,
          tipo: cta.tipo,
          nivel: cta.nivel,
          saldoInicial: 0.0,
          cargos: 0.0,
          abonos: 0.0,
          saldoFinal: 0.0,
        },
      });
    }
  }
  console.log("📖 Catálogo de cuentas SAT inicializado.");

  // 6. Generar Facturas CFDI 4.0 realistas con PAC Mock para mes actual y mes anterior
  console.log("📄 Timbrando CFDI 4.0 mock para mes actual y mes anterior...");

  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1; // 1-12

  const prevDate = new Date(currentYear, currentMonth - 2, 1);
  const prevYear = prevDate.getFullYear();
  const prevMonth = prevDate.getMonth() + 1;

  // Garantizar tanto el mes actual, el mes anterior, y 2026-08 / 2026-09
  const periodMap = new Map<string, { year: number; month: number }>();
  periodMap.set(`${prevYear}-${prevMonth}`, { year: prevYear, month: prevMonth });
  periodMap.set(`${currentYear}-${currentMonth}`, { year: currentYear, month: currentMonth });
  periodMap.set("2026-8", { year: 2026, month: 8 });
  periodMap.set("2026-9", { year: 2026, month: 9 });

  const periodsToSeed = Array.from(periodMap.values()).sort((a, b) => {
    return a.year !== b.year ? a.year - b.year : a.month - b.month;
  });

  const pad = (n: number) => n.toString().padStart(2, "0");
  const nombresMeses = [
    "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
    "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"
  ];

  let totalPeriodosProcesados = 0;

  for (const p of periodsToSeed) {
    const { year, month } = p;
    const mStr = pad(month);
    const yStr = year.toString();
    const mesNombre = nombresMeses[month - 1];

    console.log(`📅 Generando datos fiscales SAT 2026 para ${mesNombre} ${year}...`);

    // Factura 1 Ana: Emitida PUE con retención RESICO a PM (1.25% ISR y 10.6667% IVA)
    const cfdiAna1 = await PacMockAdapter.timbrarCfdi40({
      serie: "F",
      folio: `${year.toString().slice(-2)}${mStr}1`,
      fecha: new Date(`${yStr}-${mStr}-05T10:30:00`),
      formaPago: "03", // Transferencia
      metodoPago: "PUE",
      lugarExpedicion: orgAnaResico.codigoPostal,
      emisor: {
        rfc: orgAnaResico.rfc,
        nombre: orgAnaResico.razonSocial,
        regimenFiscal: orgAnaResico.regimenFiscal,
      },
      receptor: {
        rfc: "KCM8403217U4",
        nombre: "KIMBERLY CLARK DE MEXICO SAB DE CV",
        domicilioFiscalReceptor: "11560",
        regimenFiscalReceptor: "601",
        usoCfdi: "G03",
      },
      conceptos: [
        {
          claveProdServ: "80141600",
          claveUnidad: "E48",
          descripcion: `Servicios de asesoría fiscal, contable y auditoría mensual - ${mesNombre} ${year}`,
          cantidad: 1,
          valorUnitario: 35000.0,
          ivaTasa: 0.16,
          retIsrTasa: 0.0125,
          retIvaTasa: 0.106667,
        },
      ],
    });

    const invoiceAna1 = await prisma.invoice.create({
      data: {
        organizationId: orgAnaResico.id,
        tipo: "EMITIDA",
        serie: "F",
        folio: `${year.toString().slice(-2)}${mStr}1`,
        uuid: cfdiAna1.uuid,
        fecha: new Date(`${yStr}-${mStr}-05T10:30:00`),
        formaPago: "03",
        metodoPago: "PUE",
        lugarExpedicion: orgAnaResico.codigoPostal,
        subtotal: cfdiAna1.subtotal,
        descuento: cfdiAna1.descuento,
        total: cfdiAna1.total,
        emisorRfc: orgAnaResico.rfc,
        emisorNombre: orgAnaResico.razonSocial,
        emisorRegimen: orgAnaResico.regimenFiscal,
        receptorRfc: "KCM8403217U4",
        receptorNombre: "KIMBERLY CLARK DE MEXICO SAB DE CV",
        receptorCp: "11560",
        receptorRegimen: "601",
        receptorUsoCfdi: "G03",
        totalIvaTrasladado: cfdiAna1.totalIvaTrasladado,
        totalIvaRetenido: cfdiAna1.totalIvaRetenido,
        totalIsrRetenido: cfdiAna1.totalIsrRetenido,
        estatus: "VIGENTE",
        fechaTimbrado: new Date(cfdiAna1.fechaTimbrado),
        selloCFD: cfdiAna1.selloCFD,
        selloSAT: cfdiAna1.selloSAT,
        noCertificadoSAT: cfdiAna1.noCertificadoSAT,
        cadenaOriginal: cfdiAna1.cadenaOriginalSAT,
        qrCodeData: cfdiAna1.qrCodeUrl,
        rawXml: cfdiAna1.xmlTimbrado,
        saldoPendiente: 0.0,
        fechaEfectivoCobro: new Date(`${yStr}-${mStr}-05T10:30:00`),
        estaConciliada: true,
        items: {
          create: [
            {
              claveProdServ: "80141600",
              claveUnidad: "E48",
              descripcion: `Servicios de asesoría fiscal, contable y auditoría mensual - ${mesNombre} ${year}`,
              cantidad: 1,
              valorUnitario: 35000.0,
              importe: 35000.0,
              ivaTasa: 0.16,
              ivaImporte: 5600.0,
              retIsrTasa: 0.0125,
              retIsrImporte: 437.5,
              retIvaTasa: 0.106667,
              retIvaImporte: 3733.35,
            },
          ],
        },
      },
    });

    // Póliza automática Factura 1
    const polizaDraft1 = AccountingEngine.generarPolizaAutomatica(invoiceAna1, Number(`${month}01`));
    await prisma.poliza.create({
      data: {
        organizationId: orgAnaResico.id,
        invoiceId: invoiceAna1.id,
        tipo: polizaDraft1.tipo,
        numero: polizaDraft1.numero,
        fecha: polizaDraft1.fecha,
        concepto: polizaDraft1.concepto,
        uuidRelacionado: polizaDraft1.uuidRelacionado,
        totalDebe: polizaDraft1.totalDebe,
        totalHaber: polizaDraft1.totalHaber,
        estaCuadrada: polizaDraft1.estaCuadrada,
        entries: {
          create: polizaDraft1.entries.map((e) => ({
            cuentaCodigo: e.cuentaCodigo,
            cuentaNombre: e.cuentaNombre,
            concepto: e.concepto,
            debe: e.debe,
            haber: e.haber,
          })),
        },
      },
    });

    // Factura 2 Ana: Emitida PPD (a crédito) por $18,000 MXN
    const cfdiAna2 = await PacMockAdapter.timbrarCfdi40({
      serie: "F",
      folio: `${year.toString().slice(-2)}${mStr}2`,
      fecha: new Date(`${yStr}-${mStr}-10T14:15:00`),
      formaPago: "99",
      metodoPago: "PPD",
      lugarExpedicion: orgAnaResico.codigoPostal,
      emisor: {
        rfc: orgAnaResico.rfc,
        nombre: orgAnaResico.razonSocial,
        regimenFiscal: orgAnaResico.regimenFiscal,
      },
      receptor: {
        rfc: "MSE930215JJ8",
        nombre: "MERCADO Y SERVICIOS EMPRESARIALES SA DE CV",
        domicilioFiscalReceptor: "03100",
        regimenFiscalReceptor: "601",
        usoCfdi: "G03",
      },
      conceptos: [
        {
          claveProdServ: "80141600",
          claveUnidad: "E48",
          descripcion: `Consultoría de implementación contable en la nube - ${mesNombre} ${year}`,
          cantidad: 1,
          valorUnitario: 18000.0,
          ivaTasa: 0.16,
          retIsrTasa: 0.0125,
          retIvaTasa: 0.106667,
        },
      ],
    });

    const invoiceAna2 = await prisma.invoice.create({
      data: {
        organizationId: orgAnaResico.id,
        tipo: "EMITIDA",
        serie: "F",
        folio: `${year.toString().slice(-2)}${mStr}2`,
        uuid: cfdiAna2.uuid,
        fecha: new Date(`${yStr}-${mStr}-10T14:15:00`),
        formaPago: "99",
        metodoPago: "PPD",
        lugarExpedicion: orgAnaResico.codigoPostal,
        subtotal: cfdiAna2.subtotal,
        descuento: 0.0,
        total: cfdiAna2.total,
        emisorRfc: orgAnaResico.rfc,
        emisorNombre: orgAnaResico.razonSocial,
        emisorRegimen: orgAnaResico.regimenFiscal,
        receptorRfc: "MSE930215JJ8",
        receptorNombre: "MERCADO Y SERVICIOS EMPRESARIALES SA DE CV",
        receptorCp: "03100",
        receptorRegimen: "601",
        receptorUsoCfdi: "G03",
        totalIvaTrasladado: cfdiAna2.totalIvaTrasladado,
        totalIvaRetenido: cfdiAna2.totalIvaRetenido,
        totalIsrRetenido: cfdiAna2.totalIsrRetenido,
        estatus: "VIGENTE",
        fechaTimbrado: new Date(cfdiAna2.fechaTimbrado),
        selloCFD: cfdiAna2.selloCFD,
        selloSAT: cfdiAna2.selloSAT,
        noCertificadoSAT: cfdiAna2.noCertificadoSAT,
        cadenaOriginal: cfdiAna2.cadenaOriginalSAT,
        qrCodeData: cfdiAna2.qrCodeUrl,
        rawXml: cfdiAna2.xmlTimbrado,
        saldoPendiente: cfdiAna2.total,
        estaConciliada: false,
        items: {
          create: [
            {
              claveProdServ: "80141600",
              claveUnidad: "E48",
              descripcion: `Consultoría de implementación contable en la nube - ${mesNombre} ${year}`,
              cantidad: 1,
              valorUnitario: 18000.0,
              importe: 18000.0,
              ivaTasa: 0.16,
              ivaImporte: 2880.0,
              retIsrTasa: 0.0125,
              retIsrImporte: 225.0,
              retIvaTasa: 0.106667,
              retIvaImporte: 1920.01,
            },
          ],
        },
      },
    });

    // Póliza Factura 2
    const polizaDraft2 = AccountingEngine.generarPolizaAutomatica(invoiceAna2, Number(`${month}02`));
    await prisma.poliza.create({
      data: {
        organizationId: orgAnaResico.id,
        invoiceId: invoiceAna2.id,
        tipo: polizaDraft2.tipo,
        numero: polizaDraft2.numero,
        fecha: polizaDraft2.fecha,
        concepto: polizaDraft2.concepto,
        uuidRelacionado: polizaDraft2.uuidRelacionado,
        totalDebe: polizaDraft2.totalDebe,
        totalHaber: polizaDraft2.totalHaber,
        estaCuadrada: polizaDraft2.estaCuadrada,
        entries: {
          create: polizaDraft2.entries.map((e) => ({
            cuentaCodigo: e.cuentaCodigo,
            cuentaNombre: e.cuentaNombre,
            concepto: e.concepto,
            debe: e.debe,
            haber: e.haber,
          })),
        },
      },
    });

    // Factura 3 Ana: Gasto Recibido (PUE Pagado) por renta y servicios de oficina
    const cfdiGastoAna = await PacMockAdapter.timbrarCfdi40({
      serie: "W",
      folio: `${year.toString().slice(-2)}${mStr}3`,
      fecha: new Date(`${yStr}-${mStr}-08T09:00:00`),
      formaPago: "03",
      metodoPago: "PUE",
      lugarExpedicion: "06600",
      emisor: {
        rfc: "IOM150820T90",
        nombre: "INMOBILIARIA DE OFICINAS MODERNAS SA DE CV",
        regimenFiscal: "601",
      },
      receptor: {
        rfc: orgAnaResico.rfc,
        nombre: orgAnaResico.razonSocial,
        domicilioFiscalReceptor: orgAnaResico.codigoPostal,
        regimenFiscalReceptor: orgAnaResico.regimenFiscal,
        usoCfdi: "G03",
      },
      conceptos: [
        {
          claveProdServ: "80131502",
          claveUnidad: "E48",
          descripcion: `Renta de oficina privada y servicios compartidos Reforma ${mesNombre} ${year}`,
          cantidad: 1,
          valorUnitario: 8500.0,
          ivaTasa: 0.16,
        },
      ],
    });

    const invoiceGastoAna = await prisma.invoice.create({
      data: {
        organizationId: orgAnaResico.id,
        tipo: "RECIBIDA",
        serie: "W",
        folio: `${year.toString().slice(-2)}${mStr}3`,
        uuid: cfdiGastoAna.uuid,
        fecha: new Date(`${yStr}-${mStr}-08T09:00:00`),
        formaPago: "03",
        metodoPago: "PUE",
        lugarExpedicion: "06600",
        subtotal: cfdiGastoAna.subtotal,
        descuento: 0.0,
        total: cfdiGastoAna.total,
        emisorRfc: "IOM150820T90",
        emisorNombre: "INMOBILIARIA DE OFICINAS MODERNAS SA DE CV",
        emisorRegimen: "601",
        receptorRfc: orgAnaResico.rfc,
        receptorNombre: orgAnaResico.razonSocial,
        receptorCp: orgAnaResico.codigoPostal,
        receptorRegimen: orgAnaResico.regimenFiscal,
        receptorUsoCfdi: "G03",
        totalIvaTrasladado: cfdiGastoAna.totalIvaTrasladado,
        totalIvaRetenido: 0.0,
        totalIsrRetenido: 0.0,
        estatus: "VIGENTE",
        fechaTimbrado: new Date(cfdiGastoAna.fechaTimbrado),
        selloCFD: cfdiGastoAna.selloCFD,
        selloSAT: cfdiGastoAna.selloSAT,
        noCertificadoSAT: cfdiGastoAna.noCertificadoSAT,
        cadenaOriginal: cfdiGastoAna.cadenaOriginalSAT,
        qrCodeData: cfdiGastoAna.qrCodeUrl,
        rawXml: cfdiGastoAna.xmlTimbrado,
        saldoPendiente: 0.0,
        fechaEfectivoCobro: new Date(`${yStr}-${mStr}-08T09:00:00`),
        estaConciliada: true,
        items: {
          create: [
            {
              claveProdServ: "80131502",
              claveUnidad: "E48",
              descripcion: `Renta de oficina privada y servicios compartidos Reforma ${mesNombre} ${year}`,
              cantidad: 1,
              valorUnitario: 8500.0,
              importe: 8500.0,
              ivaTasa: 0.16,
              ivaImporte: 1360.0,
            },
          ],
        },
      },
    });

    // Póliza Factura 3
    const polizaDraftGasto = AccountingEngine.generarPolizaAutomatica(invoiceGastoAna, Number(`${month}03`));
    await prisma.poliza.create({
      data: {
        organizationId: orgAnaResico.id,
        invoiceId: invoiceGastoAna.id,
        tipo: polizaDraftGasto.tipo,
        numero: polizaDraftGasto.numero,
        fecha: polizaDraftGasto.fecha,
        concepto: polizaDraftGasto.concepto,
        uuidRelacionado: polizaDraftGasto.uuidRelacionado,
        totalDebe: polizaDraftGasto.totalDebe,
        totalHaber: polizaDraftGasto.totalHaber,
        estaCuadrada: polizaDraftGasto.estaCuadrada,
        entries: {
          create: polizaDraftGasto.entries.map((e) => ({
            cuentaCodigo: e.cuentaCodigo,
            cuentaNombre: e.cuentaNombre,
            concepto: e.concepto,
            debe: e.debe,
            haber: e.haber,
          })),
        },
      },
    });

    // Movimientos bancarios para Ana (Conciliación)
    await prisma.bankTransaction.createMany({
      data: [
        {
          organizationId: orgAnaResico.id,
          fecha: new Date(`${yStr}-${mStr}-05T12:00:00`),
          concepto: `DEPOSITO SPEI KIMBERLY CLARK FAC ${year.toString().slice(-2)}${mStr}1`,
          monto: Number(invoiceAna1.total),
          tipo: "ABONO",
          referencia: `SPEI-IN-${year}${mStr}05`,
          cfdiUuidRelacionado: invoiceAna1.uuid,
          conciliado: true,
          fechaConciliacion: new Date(`${yStr}-${mStr}-05T12:30:00`),
        },
        {
          organizationId: orgAnaResico.id,
          fecha: new Date(`${yStr}-${mStr}-08T11:30:00`),
          concepto: `CARGO SPEI RENTA OFICINAS FAC ${year.toString().slice(-2)}${mStr}3`,
          monto: Number(invoiceGastoAna.total),
          tipo: "CARGO",
          referencia: `SPEI-OUT-${year}${mStr}08`,
          cfdiUuidRelacionado: invoiceGastoAna.uuid,
          conciliado: true,
          fechaConciliacion: new Date(`${yStr}-${mStr}-08T12:00:00`),
        },
      ],
    });

    // Declaración provisional del mes para Ana (RESICO PF)
    const calcAnaMes = calcularImpuestosSat2026({
      regimenFiscal: "626",
      tipoPersona: "PF",
      ingresosCobrados: 35000.0,
      deduccionesPagadas: 8500.0,
      retencionesIsr: 437.5,
      retencionesIva: 3733.35,
      ivaCobrado: 5600.0,
      ivaPagado: 1360.0,
    });

    const vencimientoAna = calcularFechaVencimientoSat(orgAnaResico.rfc, year, month);

    await prisma.taxDeclarationMonth.create({
      data: {
        organizationId: orgAnaResico.id,
        year,
        month,
        regimen: "626",
        ingresosCobrados: calcAnaMes.ingresosBase,
        deduccionesPagadas: calcAnaMes.deduccionesAplicadas,
        baseGravable: calcAnaMes.baseGravable,
        tasaIsr: calcAnaMes.tasaOcuotaIsr,
        isrDeterminado: calcAnaMes.isrDeterminado,
        retencionesIsr: calcAnaMes.retencionesIsr,
        pagosProvisionalesPrevios: 0.0,
        isrAPagar: calcAnaMes.isrAPagar,
        ivaCobrado: calcAnaMes.ivaTrasladado,
        ivaPagado: calcAnaMes.ivaAcreditable,
        retencionesIva: calcAnaMes.retencionesIva,
        ivaAPagar: calcAnaMes.ivaAPagar,
        estatus: "CALCULADO",
        fechaLimite: vencimientoAna.fechaLimite,
      },
    });

    // Factura emitida PM General (Despacho)
    const cfdiPm = await PacMockAdapter.timbrarCfdi40({
      serie: "A",
      folio: `${year.toString().slice(-2)}${mStr}9`,
      fecha: new Date(`${yStr}-${mStr}-02T11:00:00`),
      formaPago: "03",
      metodoPago: "PUE",
      lugarExpedicion: orgPmGeneral.codigoPostal,
      emisor: {
        rfc: orgPmGeneral.rfc,
        nombre: orgPmGeneral.razonSocial,
        regimenFiscal: orgPmGeneral.regimenFiscal,
      },
      receptor: {
        rfc: "CEM8501182A0",
        nombre: "CEMEX MEXICO SA DE CV",
        domicilioFiscalReceptor: "64000",
        regimenFiscalReceptor: "601",
        usoCfdi: "G03",
      },
      conceptos: [
        {
          claveProdServ: "84111500",
          claveUnidad: "E48",
          descripcion: `Póliza mensual de asesoría y planeación tributaria integral SAT ${mesNombre} ${year}`,
          cantidad: 1,
          valorUnitario: 120000.0,
          ivaTasa: 0.16,
        },
      ],
    });

    const invoicePm = await prisma.invoice.create({
      data: {
        organizationId: orgPmGeneral.id,
        tipo: "EMITIDA",
        serie: "A",
        folio: `${year.toString().slice(-2)}${mStr}9`,
        uuid: cfdiPm.uuid,
        fecha: new Date(`${yStr}-${mStr}-02T11:00:00`),
        formaPago: "03",
        metodoPago: "PUE",
        lugarExpedicion: orgPmGeneral.codigoPostal,
        subtotal: cfdiPm.subtotal,
        descuento: 0.0,
        total: cfdiPm.total,
        emisorRfc: orgPmGeneral.rfc,
        emisorNombre: orgPmGeneral.razonSocial,
        emisorRegimen: orgPmGeneral.regimenFiscal,
        receptorRfc: "CEM8501182A0",
        receptorNombre: "CEMEX MEXICO SA DE CV",
        receptorCp: "64000",
        receptorRegimen: "601",
        receptorUsoCfdi: "G03",
        totalIvaTrasladado: cfdiPm.totalIvaTrasladado,
        totalIvaRetenido: 0.0,
        totalIsrRetenido: 0.0,
        estatus: "VIGENTE",
        fechaTimbrado: new Date(cfdiPm.fechaTimbrado),
        selloCFD: cfdiPm.selloCFD,
        selloSAT: cfdiPm.selloSAT,
        noCertificadoSAT: cfdiPm.noCertificadoSAT,
        cadenaOriginal: cfdiPm.cadenaOriginalSAT,
        qrCodeData: cfdiPm.qrCodeUrl,
        rawXml: cfdiPm.xmlTimbrado,
        saldoPendiente: 0.0,
        fechaEfectivoCobro: new Date(`${yStr}-${mStr}-02T11:00:00`),
        estaConciliada: true,
        items: {
          create: [
            {
              claveProdServ: "84111500",
              claveUnidad: "E48",
              descripcion: `Póliza mensual de asesoría y planeación tributaria integral SAT ${mesNombre} ${year}`,
              cantidad: 1,
              valorUnitario: 120000.0,
              importe: 120000.0,
              ivaTasa: 0.16,
              ivaImporte: 19200.0,
            },
          ],
        },
      },
    });

    const polizaPm = AccountingEngine.generarPolizaAutomatica(invoicePm, Number(`${month}01`));
    await prisma.poliza.create({
      data: {
        organizationId: orgPmGeneral.id,
        invoiceId: invoicePm.id,
        tipo: polizaPm.tipo,
        numero: polizaPm.numero,
        fecha: polizaPm.fecha,
        concepto: polizaPm.concepto,
        uuidRelacionado: polizaPm.uuidRelacionado,
        totalDebe: polizaPm.totalDebe,
        totalHaber: polizaPm.totalHaber,
        estaCuadrada: polizaPm.estaCuadrada,
        entries: {
          create: polizaPm.entries.map((e) => ({
            cuentaCodigo: e.cuentaCodigo,
            cuentaNombre: e.cuentaNombre,
            concepto: e.concepto,
            debe: e.debe,
            haber: e.haber,
          })),
        },
      },
    });

    // Factura Gasto de Proveedor en Lista Negra EFOS 69-B asignada a orgPmAlerta
    const cfdiEfoAlerta = await PacMockAdapter.timbrarCfdi40({
      serie: "FE",
      folio: `${year.toString().slice(-2)}${mStr}4`,
      fecha: new Date(`${yStr}-${mStr}-04T16:00:00`),
      formaPago: "03",
      metodoPago: "PUE",
      lugarExpedicion: "44100",
      emisor: {
        rfc: "FSO160412KJ9", // ¡En lista negra definitiva del SAT!
        nombre: "Facturas y Servicios del Occidente SA de CV",
        regimenFiscal: "601",
      },
      receptor: {
        rfc: orgPmAlerta.rfc,
        nombre: orgPmAlerta.razonSocial,
        domicilioFiscalReceptor: orgPmAlerta.codigoPostal,
        regimenFiscalReceptor: orgPmAlerta.regimenFiscal,
        usoCfdi: "G03",
      },
      conceptos: [
        {
          claveProdServ: "81111812",
          claveUnidad: "E48",
          descripcion: `Mantenimiento preventivo e industrial de servidores ${mesNombre} ${year}`,
          cantidad: 1,
          valorUnitario: 45000.0,
          ivaTasa: 0.16,
        },
      ],
    });

    const invoiceEfoAlerta = await prisma.invoice.create({
      data: {
        organizationId: orgPmAlerta.id,
        tipo: "RECIBIDA",
        serie: "FE",
        folio: `${year.toString().slice(-2)}${mStr}4`,
        uuid: cfdiEfoAlerta.uuid,
        fecha: new Date(`${yStr}-${mStr}-04T16:00:00`),
        formaPago: "03",
        metodoPago: "PUE",
        lugarExpedicion: "44100",
        subtotal: cfdiEfoAlerta.subtotal,
        descuento: 0.0,
        total: cfdiEfoAlerta.total,
        emisorRfc: "FSO160412KJ9",
        emisorNombre: "Facturas y Servicios del Occidente SA de CV",
        emisorRegimen: "601",
        receptorRfc: orgPmAlerta.rfc,
        receptorNombre: orgPmAlerta.razonSocial,
        receptorCp: orgPmAlerta.codigoPostal,
        receptorRegimen: orgPmAlerta.regimenFiscal,
        receptorUsoCfdi: "G03",
        totalIvaTrasladado: cfdiEfoAlerta.totalIvaTrasladado,
        totalIvaRetenido: 0.0,
        totalIsrRetenido: 0.0,
        estatus: "VIGENTE",
        fechaTimbrado: new Date(cfdiEfoAlerta.fechaTimbrado),
        selloCFD: cfdiEfoAlerta.selloCFD,
        selloSAT: cfdiEfoAlerta.selloSAT,
        noCertificadoSAT: cfdiEfoAlerta.noCertificadoSAT,
        cadenaOriginal: cfdiEfoAlerta.cadenaOriginalSAT,
        qrCodeData: cfdiEfoAlerta.qrCodeUrl,
        rawXml: cfdiEfoAlerta.xmlTimbrado,
        saldoPendiente: 0.0,
        fechaEfectivoCobro: new Date(`${yStr}-${mStr}-04T16:00:00`),
        estaConciliada: true,
        items: {
          create: [
            {
              claveProdServ: "81111812",
              claveUnidad: "E48",
              descripcion: `Mantenimiento preventivo e industrial de servidores ${mesNombre} ${year}`,
              cantidad: 1,
              valorUnitario: 45000.0,
              importe: 45000.0,
              ivaTasa: 0.16,
              ivaImporte: 7200.0,
            },
          ],
        },
      },
    });

    const polizaEfo = AccountingEngine.generarPolizaAutomatica(invoiceEfoAlerta, Number(`${month}04`));
    await prisma.poliza.create({
      data: {
        organizationId: orgPmAlerta.id,
        invoiceId: invoiceEfoAlerta.id,
        tipo: polizaEfo.tipo,
        numero: polizaEfo.numero,
        fecha: polizaEfo.fecha,
        concepto: polizaEfo.concepto,
        uuidRelacionado: polizaEfo.uuidRelacionado,
        totalDebe: polizaEfo.totalDebe,
        totalHaber: polizaEfo.totalHaber,
        estaCuadrada: polizaEfo.estaCuadrada,
        entries: {
          create: polizaEfo.entries.map((e) => ({
            cuentaCodigo: e.cuentaCodigo,
            cuentaNombre: e.cuentaNombre,
            concepto: e.concepto,
            debe: e.debe,
            haber: e.haber,
          })),
        },
      },
    });

    totalPeriodosProcesados++;
  }

  // Alertas preventivas
  await prisma.fiscalAlert.createMany({
    data: [
      {
        organizationId: orgPmAlerta.id,
        tipo: "EFOS_DETECTADO",
        titulo: "¡Alerta Crítica EFOS 69-B! Proveedor: FSO160412KJ9",
        descripcion: "Facturas y Servicios del Occidente SA de CV se encuentra en situación DEFINITIVO en el listado del DOF/SAT. Esta operación ampara operaciones que no son deducibles.",
        severidad: "CRITICAL",
      },
      {
        organizationId: orgPmAlerta.id,
        tipo: "OPINION_CUMPLIMIENTO",
        titulo: "Opinión 32-D NEGATIVA ante el SAT",
        descripcion: "Se detectó omisión en el pago provisional de ISR. Regulariza la situación para evitar la suspensión temporal del CSD.",
        severidad: "CRITICAL",
      },
      {
        organizationId: orgAnaResico.id,
        tipo: "VENCIMIENTO_PROXIMO",
        titulo: `Declaración Provisional ${nombresMeses[currentMonth - 1]} ${currentYear}`,
        descripcion: "El plazo límite de pago vence el día 18 según el 6to dígito de tu RFC.",
        severidad: "WARNING",
      },
    ],
  });

  // Actualizar balances en catálogo de cuentas para que la balanza tenga números vivos acumulados
  await prisma.satCatalogAccount.updateMany({
    where: { organizationId: orgAnaResico.id, codigoSat: "102.01" },
    data: {
      cargos: 36429.15 * totalPeriodosProcesados,
      abonos: 9860.0 * totalPeriodosProcesados,
      saldoFinal: 26569.15 * totalPeriodosProcesados,
    },
  });
  await prisma.satCatalogAccount.updateMany({
    where: { organizationId: orgAnaResico.id, codigoSat: "105.01" },
    data: {
      cargos: 20880.0 * totalPeriodosProcesados,
      abonos: 0.0,
      saldoFinal: 20880.0 * totalPeriodosProcesados,
    },
  });
  await prisma.satCatalogAccount.updateMany({
    where: { organizationId: orgAnaResico.id, codigoSat: "113.01" },
    data: {
      cargos: 437.5 * totalPeriodosProcesados,
      abonos: 0.0,
      saldoFinal: 437.5 * totalPeriodosProcesados,
    },
  });
  await prisma.satCatalogAccount.updateMany({
    where: { organizationId: orgAnaResico.id, codigoSat: "118.01" },
    data: {
      cargos: 1360.0 * totalPeriodosProcesados,
      abonos: 0.0,
      saldoFinal: 1360.0 * totalPeriodosProcesados,
    },
  });
  await prisma.satCatalogAccount.updateMany({
    where: { organizationId: orgAnaResico.id, codigoSat: "208.01" },
    data: {
      cargos: 0.0,
      abonos: 5600.0 * totalPeriodosProcesados,
      saldoFinal: -5600.0 * totalPeriodosProcesados,
    },
  });
  await prisma.satCatalogAccount.updateMany({
    where: { organizationId: orgAnaResico.id, codigoSat: "209.01" },
    data: {
      cargos: 0.0,
      abonos: 2880.0 * totalPeriodosProcesados,
      saldoFinal: -2880.0 * totalPeriodosProcesados,
    },
  });
  await prisma.satCatalogAccount.updateMany({
    where: { organizationId: orgAnaResico.id, codigoSat: "401.01" },
    data: {
      cargos: 0.0,
      abonos: 53000.0 * totalPeriodosProcesados,
      saldoFinal: -53000.0 * totalPeriodosProcesados,
    },
  });
  await prisma.satCatalogAccount.updateMany({
    where: { organizationId: orgAnaResico.id, codigoSat: "601.01" },
    data: {
      cargos: 8500.0 * totalPeriodosProcesados,
      abonos: 0.0,
      saldoFinal: 8500.0 * totalPeriodosProcesados,
    },
  });

  console.log("✅ Seed completado con éxito!");
  console.log("👤 Usuarios disponibles:");
  console.log("   - ana@easyconta.mx / Demo1234! (Persona Física RESICO & Actividad Empresarial)");
  console.log("   - despacho@easyconta.mx / Demo1234! (Modo Despacho Contable con múltiples RFCs)");
}

main()
  .catch((e) => {
    console.error("❌ Error en seed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

