import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { PacMockAdapter } from "../src/lib/sat/pac-mock";
import { AccountingEngine, CATALOGO_SAT_BASE } from "../src/lib/sat/accounting-engine";
import { calcularImpuestosSat2026, calcularFechaVencimientoSat } from "../src/lib/sat/tax-engine";

const prisma = new PrismaClient();

async function main() {
  console.log("🚀 Iniciando seed SAT 2026 para ContaFácil MX...");

  // 1. Limpieza de tablas existentes
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
      email: "ana@contafacil.mx",
      name: "Ana Sofía Morales",
      password: passwordHash,
      role: "USER",
      isDespacho: false,
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
      email: "despacho@contafacil.mx",
      name: "C.P. Ricardo Mendoza (Despacho S.C.)",
      password: passwordHash,
      role: "CONTADOR",
      isDespacho: true,
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

  // 6. Generar Facturas CFDI 4.0 realistas con PAC Mock para Ana (RESICO PF)
  console.log("📄 Timbrando CFDI 4.0 mock para Ana (RESICO PF)...");

  // Factura 1: Emitida PUE con retención RESICO a PM (1.25% ISR y 10.6667% IVA)
  const cfdiAna1 = await PacMockAdapter.timbrarCfdi40({
    serie: "F",
    folio: "101",
    fecha: new Date("2026-09-05T10:30:00"),
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
        claveProdServ: "80141600", // Servicios contables
        claveUnidad: "E48",
        descripcion: "Servicios de asesoría fiscal, contable y auditoría mensual - Agosto 2026",
        cantidad: 1,
        valorUnitario: 35000.0,
        ivaTasa: 0.16,
        retIsrTasa: 0.0125, // 1.25% RESICO PF facturando a PM
        retIvaTasa: 0.106667, // 10.6667% (2/3 IVA)
      },
    ],
  });

  const invoiceAna1 = await prisma.invoice.create({
    data: {
      organizationId: orgAnaResico.id,
      tipo: "EMITIDA",
      serie: "F",
      folio: "101",
      uuid: cfdiAna1.uuid,
      fecha: new Date("2026-09-05T10:30:00"),
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
      fechaEfectivoCobro: new Date("2026-09-05T10:30:00"),
      estaConciliada: true,
      items: {
        create: [
          {
            claveProdServ: "80141600",
            claveUnidad: "E48",
            descripcion: "Servicios de asesoría fiscal, contable y auditoría mensual - Agosto 2026",
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

  // Generar póliza automática de factura 1
  const polizaDraft1 = AccountingEngine.generarPolizaAutomatica(invoiceAna1, 1);
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

  // Factura 2 de Ana: Emitida PPD (a crédito) por $18,000 MXN
  const cfdiAna2 = await PacMockAdapter.timbrarCfdi40({
    serie: "F",
    folio: "102",
    fecha: new Date("2026-09-10T14:15:00"),
    formaPago: "99", // Por definir
    metodoPago: "PPD", // Pago en parcialidades o diferido
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
        descripcion: "Consultoría de implementación contable en la nube",
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
      folio: "102",
      uuid: cfdiAna2.uuid,
      fecha: new Date("2026-09-10T14:15:00"),
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
      saldoPendiente: cfdiAna2.total, // Saldo insoluto inicial
      estaConciliada: false, // Pendiente de cobro
      items: {
        create: [
          {
            claveProdServ: "80141600",
            claveUnidad: "E48",
            descripcion: "Consultoría de implementación contable en la nube",
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

  const polizaDraft2 = AccountingEngine.generarPolizaAutomatica(invoiceAna2, 2);
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

  // Factura 3 de Ana: Gasto Recibido (PUE Pagado) por renta y servicios de oficina
  const cfdiGastoAna = await PacMockAdapter.timbrarCfdi40({
    serie: "W",
    folio: "8921",
    fecha: new Date("2026-09-08T09:00:00"),
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
        claveProdServ: "80131502", // Arrendamiento de oficinas
        claveUnidad: "E48",
        descripcion: "Renta de oficina privada y servicios compartidos Reforma Sep 2026",
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
      folio: "8921",
      uuid: cfdiGastoAna.uuid,
      fecha: new Date("2026-09-08T09:00:00"),
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
      fechaEfectivoCobro: new Date("2026-09-08T09:00:00"),
      estaConciliada: true,
      items: {
        create: [
          {
            claveProdServ: "80131502",
            claveUnidad: "E48",
            descripcion: "Renta de oficina privada y servicios compartidos Reforma Sep 2026",
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

  const polizaDraftGasto = AccountingEngine.generarPolizaAutomatica(invoiceGastoAna, 3);
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

  // 7. Calcular y registrar Declaración Provisional Septiembre 2026 para Ana (RESICO PF)
  const calcAnaSept = calcularImpuestosSat2026({
    regimenFiscal: "626",
    tipoPersona: "PF",
    ingresosCobrados: 35000.0, // Solo la PUE cobrada (la PPD no se ha cobrado)
    deduccionesPagadas: 8500.0,
    retencionesIsr: 437.5,
    retencionesIva: 3733.35,
    ivaCobrado: 5600.0,
    ivaPagado: 1360.0,
  });

  const vencimientoAna = calcularFechaVencimientoSat(orgAnaResico.rfc, 2026, 9);

  await prisma.taxDeclarationMonth.create({
    data: {
      organizationId: orgAnaResico.id,
      year: 2026,
      month: 9,
      regimen: "626",
      ingresosCobrados: calcAnaSept.ingresosBase,
      deduccionesPagadas: calcAnaSept.deduccionesAplicadas,
      baseGravable: calcAnaSept.baseGravable,
      tasaIsr: calcAnaSept.tasaOcuotaIsr,
      isrDeterminado: calcAnaSept.isrDeterminado,
      retencionesIsr: calcAnaSept.retencionesIsr,
      pagosProvisionalesPrevios: 0.0,
      isrAPagar: calcAnaSept.isrAPagar,
      ivaCobrado: calcAnaSept.ivaTrasladado,
      ivaPagado: calcAnaSept.ivaAcreditable,
      retencionesIva: calcAnaSept.retencionesIva,
      ivaAPagar: calcAnaSept.ivaAPagar,
      estatus: "CALCULADO",
      fechaLimite: vencimientoAna.fechaLimite,
    },
  });

  // 8. Crear Datos para el Despacho (PM General "SFI200115AA1")
  console.log("🏢 Timbrando facturas demo para PM General (Despacho)...");

  // Factura emitida PM General
  const cfdiPm = await PacMockAdapter.timbrarCfdi40({
    serie: "A",
    folio: "249",
    fecha: new Date("2026-09-02T11:00:00"),
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
        claveProdServ: "84111500", // Servicios de consultoría contable
        claveUnidad: "E48",
        descripcion: "Póliza mensual de asesoría y planeación tributaria integral SAT 2026",
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
      folio: "249",
      uuid: cfdiPm.uuid,
      fecha: new Date("2026-09-02T11:00:00"),
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
      fechaEfectivoCobro: new Date("2026-09-02T11:00:00"),
      estaConciliada: true,
      items: {
        create: [
          {
            claveProdServ: "84111500",
            claveUnidad: "E48",
            descripcion: "Póliza mensual de asesoría y planeación tributaria integral SAT 2026",
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

  const polizaPm = AccountingEngine.generarPolizaAutomatica(invoicePm, 1);
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
    folio: "991",
    fecha: new Date("2026-09-04T16:00:00"),
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
        claveProdServ: "81111812", // Mantenimiento
        claveUnidad: "E48",
        descripcion: "Mantenimiento preventivo e industrial de servidores",
        cantidad: 1,
        valorUnitario: 45000.0,
        ivaTasa: 0.16,
      },
    ],
  });

  await prisma.invoice.create({
    data: {
      organizationId: orgPmAlerta.id,
      tipo: "RECIBIDA",
      serie: "FE",
      folio: "991",
      uuid: cfdiEfoAlerta.uuid,
      fecha: new Date("2026-09-04T16:00:00"),
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
      fechaEfectivoCobro: new Date("2026-09-04T16:00:00"),
      estaConciliada: true,
      items: {
        create: [
          {
            claveProdServ: "81111812",
            claveUnidad: "E48",
            descripcion: "Mantenimiento preventivo e industrial de servidores",
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

  // Alertas preventivas
  await prisma.fiscalAlert.createMany({
    data: [
      {
        organizationId: orgPmAlerta.id,
        tipo: "EFOS_DETECTADO",
        titulo: "¡Alerta Crítica EFOS 69-B! Proveedor: FSO160412KJ9",
        descripcion: "Facturas y Servicios del Occidente SA de CV se encuentra en situación DEFINITIVO en el listado del DOF/SAT. Esta operación ampara $52,200.00 que no son deducibles.",
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
        titulo: "Declaración Provisional Septiembre 2026",
        descripcion: "El plazo límite de pago vence el día 18 según el 6to dígito de tu RFC.",
        severidad: "WARNING",
      },
    ],
  });

  // Actualizar balances en catálogo de cuentas para que la balanza tenga números vivos
  await prisma.satCatalogAccount.updateMany({
    where: { organizationId: orgAnaResico.id, codigoSat: "102.01" },
    data: { cargos: 36429.15, abonos: 9860.0, saldoFinal: 26569.15 },
  });
  await prisma.satCatalogAccount.updateMany({
    where: { organizationId: orgAnaResico.id, codigoSat: "105.01" },
    data: { cargos: 20880.0, abonos: 0.0, saldoFinal: 20880.0 },
  });
  await prisma.satCatalogAccount.updateMany({
    where: { organizationId: orgAnaResico.id, codigoSat: "113.01" },
    data: { cargos: 437.5, abonos: 0.0, saldoFinal: 437.5 },
  });
  await prisma.satCatalogAccount.updateMany({
    where: { organizationId: orgAnaResico.id, codigoSat: "118.01" },
    data: { cargos: 1360.0, abonos: 0.0, saldoFinal: 1360.0 },
  });
  await prisma.satCatalogAccount.updateMany({
    where: { organizationId: orgAnaResico.id, codigoSat: "208.01" },
    data: { cargos: 0.0, abonos: 5600.0, saldoFinal: -5600.0 },
  });
  await prisma.satCatalogAccount.updateMany({
    where: { organizationId: orgAnaResico.id, codigoSat: "209.01" },
    data: { cargos: 0.0, abonos: 2880.0, saldoFinal: -2880.0 },
  });
  await prisma.satCatalogAccount.updateMany({
    where: { organizationId: orgAnaResico.id, codigoSat: "401.01" },
    data: { cargos: 0.0, abonos: 53000.0, saldoFinal: -53000.0 },
  });
  await prisma.satCatalogAccount.updateMany({
    where: { organizationId: orgAnaResico.id, codigoSat: "601.01" },
    data: { cargos: 8500.0, abonos: 0.0, saldoFinal: 8500.0 },
  });

  console.log("✅ Seed completado con éxito!");
  console.log("👤 Usuarios disponibles:");
  console.log("   - ana@contafacil.mx / Demo1234! (Persona Física RESICO & Actividad Empresarial)");
  console.log("   - despacho@contafacil.mx / Demo1234! (Modo Despacho Contable con múltiples RFCs)");
}

main()
  .catch((e) => {
    console.error("❌ Error en seed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
