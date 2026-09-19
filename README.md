# ContaFácil MX 🇲🇽 (SAT México 2026)

> **Plataforma SaaS Contable y de Facturación Electrónica CFDI 4.0 adaptada a las disposiciones fiscales vigentes del SAT para el ejercicio 2026.**

---

## 📌 Resumen del Proyecto

**ContaFácil MX** es un sistema contable integral en la nube diseñado para personas físicas, personas morales y despachos contables en México. Automatiza la emisión de CFDI 4.0 con PAC mock, el resguardo en bóveda XML con auditoría en listas negras (EFOS Art. 69-B), la conciliación de flujo de efectivo (PUE vs PPD), el cálculo provisional mensual de impuestos (RESICO PF, Actividad Empresarial, Arrendamiento y PM General) y la generación de pólizas electrónicas y balanzas de comprobación bajo el Anexo 24 del SAT.

---

## 🛠️ Stack Tecnológico

- **Framework:** Next.js 15 (App Router, Server Components y Server Actions)
- **Lenguaje:** TypeScript 5
- **Estilos & UI:** Tailwind CSS v4, Lucide React, Badges fiscales SAT
- **Base de Datos & ORM:** PostgreSQL 16/18 + Prisma ORM 6.4
- **Autenticación:** NextAuth.js con Credentials Provider y soporte multi-RFC en sesión JWT
- **Empaquetado & Contenedores:** Docker Compose & Dockerfile multi-stage
- **Gestor de Paquetes:** `pnpm`

---

## 👥 Usuarios Demo Preconfigurados

El sistema incluye una base de datos precargada con datos realistas SAT 2026 y botones de acceso en un solo clic desde `/login`:

| Usuario | Contraseña | Perfil | RFCs y Casos de Uso |
| :--- | :--- | :--- | :--- |
| **`ana@contafacil.mx`** | `Demo1234!` | **Persona Física** | • `LOMA900101ABC` - RESICO PF (Mariana López Asesorías)<br>• `GAMA850512XYZ` - Act. Empresarial (Arturo Garza Soluciones) |
| **`despacho@contafacil.mx`** | `Demo1234!` | **Despacho Contable**<br>*(Modo Multi-Cliente)* | • `SFI200115AA1` - PM General (Soluciones Fiscales Integrales SA de CV)<br>• `MERA780320K89` - PF Arrendamiento (Dr. Roberto Garza Mercado)<br>• `VAPE921004HJ2` - PF RESICO (Valeria Pérez Estudio Creativo)<br>• `TEC180723MN4` - PM con Alerta EFOS 69-B |

---

## 🚀 Puesta en Marcha Rápida

### Opción A: Ejecución Local con Node.js y PostgreSQL

1. **Clonar o abrir el directorio del proyecto:**
   ```bash
   cd contafacil-mx
   ```

2. **Instalar dependencias:**
   ```bash
   pnpm install
   ```

3. **Configurar el archivo `.env`:**
   ```env
   DATABASE_URL="postgresql://postgres:postgres@localhost:5432/contafacil_mx?schema=public"
   NEXTAUTH_SECRET="contafacil-mexico-sat-2026-super-secret-key-32chars"
   NEXTAUTH_URL="http://localhost:3000"
   NEXT_PUBLIC_APP_URL="http://localhost:3000"
   ```

4. **Sincronizar la base de datos y poblar el seed:**
   ```bash
   pnpm prisma db push
   npx tsx prisma/seed.ts
   ```

5. **Iniciar el servidor de desarrollo:**
   ```bash
   pnpm dev
   ```
   Abre [http://localhost:3000](http://localhost:3000) en tu navegador.

---

### Opción B: Ejecución con Docker Compose

Si cuentas con Docker instalado:

```bash
docker compose up -d --build
```

Esto levantará el contenedor de PostgreSQL y la aplicación Next.js 15 en `http://localhost:3000`.

---

## 🧩 Módulos y Funcionalidades del MVP

### 1. Autenticación & Multi-RFC
- Inicio de sesión con correo y contraseña cifrada con bcrypt.
- **Selector rápido de RFC** en el encabezado: permite alternar de forma inmediata entre personas físicas, morales o clientes del despacho sin cerrar sesión.

### 2. Onboarding PF / PM
- Wizard guiado en 4 pasos para incorporar nuevos contribuyentes:
  1. Selección de tipo: Persona Física (13 posiciones) o Persona Moral (12 posiciones).
  2. Validación en vivo del RFC con homoclave SAT y código postal.
  3. Selección de régimen SAT 2026 (626, 612, 606, 601) con configuración de Coeficiente de Utilidad (CU) o deducción ciega (35%).
  4. Carga de Certificado de Sello Digital (CSD) mock (.cer, .key) y asignación automática del catálogo contable SAT Anexo 24.

### 3. Facturación CFDI 4.0 con PAC Mock
- Adaptador de timbrado que cumple con el estándar técnico del Anexo 20 del SAT versión 4.0:
  - Generación de UUID versión 4 en mayúsculas.
  - Sello digital del CFD y sello del SAT mediante hashes criptográficos.
  - Cadena original del complemento de certificación digital.
  - Generación automática de URL y código QR oficial SAT para verificación.
  - Tasa de IVA 16%, retención de ISR (1.25% RESICO a PM o 10% honorarios) y retención de IVA (10.6667%).
  - Al timbrar, se genera automáticamente la **Póliza Contable de Ingreso o Diario**.

### 4. Bóveda XML y Parser CFDI 4.0
- Almacenamiento seguro de comprobantes emitidos y recibidos.
- Carga de archivos `.xml` con extracción inmediata de Emisor, Receptor, Conceptos, Impuestos y Timbre Fiscal.
- **Auditoría automática preventiva:** al subir una factura de gasto, el sistema verifica el RFC emisor contra la lista negra del SAT (Art. 69-B).
- Visor integrado de sintaxis XML con botón para copiar al portapapeles y descarga de archivos.

### 5. Conciliación PUE vs PPD & Complementos de Pago 2.0
- Diferenciación clara entre facturas de contado (**PUE**) y a crédito (**PPD**).
- Módulo de cobranza para facturas PPD: muestra saldo original, pagos aplicados y saldo insoluto restante.
- Emisión de **Recibo Electrónico de Pago (Complemento de Recepción de Pagos 2.0)**:
  - Dispara el momento de acumulación para el flujo de efectivo del mes.
  - Genera la póliza de cobro reclasificando el IVA de cuenta 209 (no cobrado) a cuenta 208 (cobrado).

### 6. Motor Fiscal SAT 2026
Implementación exacta de las fórmulas tributarias mexicanas:
1. **RESICO PF (Art. 113-E a 113-J LISR):**
   - 1.00% a 2.50% sobre ingresos cobrados en flujo de efectivo sin deducciones de ISR.
   - Acreditamiento de la retención del 1.25% de ISR realizada por personas morales.
   - Cálculo de IVA: IVA cobrado - IVA pagado deducible - Retenciones de IVA (10.6667%).
2. **Actividad Empresarial y Profesional (Art. 96/106 LISR):**
   - Base gravable = Ingresos cobrados - Deducciones comprobadas pagadas.
   - Aplicación de tarifa mensual del Art. 96 LISR (10 rangos progresivos).
   - Acreditamiento de retención de honorarios (10%).
3. **Arrendamiento de Inmuebles (Art. 114 a 118 LISR):**
   - Opción de Deducción Ciega del 35% sin comprobante fiscal + Impuesto Predial pagado.
   - O deducciones comprobadas de mantenimiento y gastos reales.
4. **Persona Moral Régimen General (Título II LISR):**
   - Ingresos nominales × Coeficiente de Utilidad (CU) = Utilidad fiscal estimada.
   - Aplicación de la tasa del 30% fija de ISR corporativo.
   - Determinación de IVA mensual definitivo.
- **Simulador Interactivo:** Permite cambiar montos en tiempo real, ver la memoria de cálculo en 11 pasos explicados y guardar la declaración provisional del mes.

### 7. Dashboard ISR / IVA & Calendario SAT
- 4 tarjetas KPI: Ingresos Cobrados, Deducciones, ISR Estimado a Pagar e IVA Neto / Saldo a Favor.
- **Calendario Fiscal SAT 2026:** Aplica la regla miscelánea del 6to dígito numérico del RFC (día 17 + de 1 a 5 días adicionales) para calcular la fecha límite de pago de cada empresa.

### 8. Expediente PDF (Representación Impresa)
- Plantilla fiscal CFDI 4.0 con tipografía compacta, datos fiscales de emisor y receptor, desglose de conceptos con claves SAT, importe con letra en pesos mexicanos, cadena original, sellos digitales y **código QR SAT generado en alta resolución**.
- Botón de impresión directa con estilos adaptados para guardar como PDF.

### 9. Pólizas Contables Electrónicas
- Generación automática de pólizas de **Ingreso**, **Egreso** y **Diario**.
- Control estricto de partida doble (Suma de Debe = Suma de Haber).
- Clasificación de asientos bajo el catálogo de cuentas con códigos agrupadores del SAT (102.01 Bancos, 105.01 Clientes, 118.01 IVA Acreditable, 201.01 Proveedores, 208.01 IVA Trasladado, 401.01 Ingresos, 601.01 Gastos).

### 10. Balanza de Comprobación SAT (Anexo 24)
- Formato oficial de balanza de comprobación mensual con saldos iniciales, cargos, abonos y saldos finales.
- Comprobación matemática de sumas iguales.
- Botón para **exportar la Balanza en formato XML oficial SAT 1.3** listo para envío al buzón tributario.

### 11. Alertas Fiscales & EFOS 69-B
- Monitoreo del estatus de la **Opinión de Cumplimiento 32-D** (Positiva / Negativa).
- **Buscador directo en la Lista Negra del SAT (Art. 69-B CFF):** verifica si un RFC está catalogado como Presunto, Definitivo o Desvirtuado en el Diario Oficial de la Federación.
- Alertas de facturas con riesgo emitidas por proveedores en listas negras y avisos de vencimiento de pago provisional.

### 12. Modo Despacho (Multi-Cliente)
- Panel maestro para contadores públicos con vista de cartera consolidada.
- Matriz de clientes con estatus 32-D, volumen facturado en el mes y estado de la declaración provisional.
- Botón **"Entrar"** con 1 clic para gestionar cualquier cliente de la cartera y cambiar el contexto operativo de todo el sistema.

---

## 🏛️ Estructura del Código

```
contafacil-mx/
├── prisma/
│   ├── schema.prisma           # Esquema relacional con modelos SAT, CFDIs y Pólizas
│   └── seed.ts                 # Script de seed con usuarios demo y facturas reales
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   ├── auth/[...nextauth]  # API NextAuth Credentials
│   │   │   ├── cfdi/timbrar        # API Timbrado PAC Mock CFDI 4.0
│   │   │   ├── cfdi/upload-xml     # API Ingesta y parseo XML con auditoría 69-B
│   │   │   ├── cfdi/ppd-pago       # API Complemento de Recepción de Pagos 2.0
│   │   │   ├── company/switch      # API Cambio de contexto multi-RFC
│   │   │   ├── onboarding          # API Registro nuevo RFC PF/PM
│   │   │   └── tax/save-declaration# API Cálculo y guardado de declaración mensual
│   │   ├── dashboard/
│   │   │   ├── page.tsx            # Dashboard principal ISR / IVA y calendario
│   │   │   ├── facturacion/        # Emisión interactiva de facturas CFDI 4.0
│   │   │   ├── facturas/[id]/pdf/  # Expediente y representación impresa con QR
│   │   │   ├── boveda/             # Bóveda XML y visor de código
│   │   │   ├── conciliacion/       # Conciliador PUE / PPD y pagos diferidos
│   │   │   ├── motor-fiscal/       # Simulador interactivo SAT 2026 (4 regímenes)
│   │   │   ├── polizas/            # Pólizas electrónicas de partida doble
│   │   │   ├── balanza/            # Balanza de comprobación Anexo 24 SAT y XML
│   │   │   ├── alertas/            # Centro de alertas 32-D y buscador 69-B
│   │   │   ├── despacho/           # Modo despacho contable multi-cliente
│   │   │   └── onboarding/         # Asistente de alta de nuevos RFCs
│   │   ├── login/page.tsx          # Pantalla de acceso con botones de 1 clic demo
│   │   └── layout.tsx              # Layout raíz con estilos Tailwind v4
│   ├── components/layout/
│   │   ├── Navbar.tsx              # Barra superior con multi-RFC switcher
│   │   ├── Sidebar.tsx             # Menú de navegación lateral
│   │   └── CompanySwitcher.tsx     # Selector desplegable de empresas
│   ├── lib/
│   │   ├── prisma.ts               # Singleton de Prisma Client
│   │   ├── session.ts              # Resolución de usuario y organización activa
│   │   ├── utils.ts                # Utilidades de formato monetario y catálogos SAT
│   │   └── sat/
│   │       ├── pac-mock.ts         # Adaptador PAC Mock CFDI 4.0 con sellos y QR
│   │       ├── tax-engine.ts       # Motor de cálculo tributario SAT 2026
│   │       ├── xml-parser.ts       # Parser de comprobantes CFDI 4.0 y Pagos 2.0
│   │       ├── accounting-engine.ts# Motor de pólizas automáticas y catálogo SAT
│   │       ├── sat-alerts-engine.ts# Auditor de listas negras 69-B y opinión 32-D
│   │       └── qr-helper.ts        # Generador de QR SAT y número a letras MXN
│   └── auth.ts                     # Configuración centralizada de NextAuth v5
├── docker-compose.yml              # Configuración Docker para PostgreSQL y App
├── Dockerfile                      # Imagen multi-stage optimizada para producción
└── package.json                    # Dependencias y scripts de ejecución
```

---

## 🔒 Notas de Cumplimiento SAT 2026

- **No contiene adaptadores a PAC comercial de cobro:** Cuenta con un adaptador mock desacoplado (`PacMockAdapter`) que simula la respuesta estándar de un Proveedor Autorizado de Certificación (PAC) del SAT con firma criptográfica y sello digital.
- **No implementa descarga masiva SAT real:** Utiliza adaptadores mock y carga de archivos XML en bóveda para no requerir credenciales CIEC ni e.firma reales en ambientes de prueba.
- **No incluye módulo de nómina ni dictamen fiscal**, tal como fue especificado para el alcance de este MVP.

---

ContaFácil MX © 2026 • Diseñado para la contabilidad digital mexicana moderna.
