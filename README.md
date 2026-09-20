# EasyConta MX 🇲🇽 (SAT México 2026)

> **Plataforma SaaS Contable y de Facturación Electrónica CFDI 4.0 adaptada a las disposiciones fiscales vigentes del SAT para el ejercicio 2026, con Motor Fiscal de alta precisión en `Decimal`, Bóveda Criptográfica AES-256-GCM y Asistente Didáctico Integrado.**

---

## 📌 Resumen del Proyecto

**EasyConta MX** es un sistema contable integral en la nube diseñado para personas físicas, personas morales y despachos contables en México. Automatiza la emisión de CFDI 4.0 con PAC mock, el resguardo en bóveda XML con auditoría en listas negras (EFOS Art. 69-B), la conciliación de flujo de efectivo (PUE vs PPD), conciliación bancaria con estados de cuenta en CSV, el cálculo provisional mensual de impuestos con `decimal.js` (RESICO PF, Actividad Empresarial, Arrendamiento y PM General), la generación de pólizas electrónicas y balanzas de comprobación bajo el Anexo 24 del SAT, y cuenta con un **Asistente de Uso** local para guiar a usuarios no contadores en cada pantalla.

---

## 🛠️ Stack Tecnológico

- **Framework:** Next.js 16 (App Router, Server Components y Server Actions)
- **Lenguaje:** TypeScript 5
- **Aritmética Fiscal:** `decimal.js` con redondeo estándar fiscal (`ROUND_HALF_UP` a 2 decimales)
- **Criptografía:** AES-256-GCM autenticado con tag de integridad y vector de inicialización de 12 bytes
- **Estilos & UI:** Tailwind CSS v4, Lucide React, Badges fiscales SAT
- **Base de Datos & ORM:** PostgreSQL 16 + Prisma ORM 6.4 (todos los montos financieros en `Decimal(14,2)` y tasas en `Decimal(8,4)`)
- **Autenticación:** NextAuth.js con Credentials Provider y soporte multi-RFC en sesión JWT
- **Tests Automatizados:** Vitest 5.0 (31 tests unitarios cubriendo tax engine, crypto vault y conciliación bancaria)
- **Empaquetado & Contenedores:** Docker Compose & Dockerfile multi-stage
- **Gestor de Paquetes:** `pnpm`

---

## 👥 Usuarios Demo Preconfigurados

El sistema incluye una base de datos precargada con datos realistas SAT 2026 y botones de acceso en un solo clic desde `/login`:

| Usuario | Contraseña | Perfil | RFCs y Casos de Uso |
| :--- | :--- | :--- | :--- |
| **`ana@easyconta.mx`** | `Demo1234!` | **Persona Física** | • `LOMA900101ABC` - RESICO PF (Mariana López Asesorías)<br>• `GAMA850512XYZ` - Act. Empresarial (Arturo Garza Soluciones) |
| **`despacho@easyconta.mx`** | `Demo1234!` | **Despacho Contable**<br>*(Modo Multi-Cliente)* | • `SFI200115AA1` - PM General (Soluciones Fiscales Integrales SA de CV)<br>• `MERA780320K89` - PF Arrendamiento (Dr. Roberto Garza Mercado)<br>• `VAPE921004HJ2` - PF RESICO (Valeria Pérez Estudio Creativo)<br>• `TEC180723MN4` - PM con Alerta EFOS 69-B |

---

## 🚀 Puesta en Marcha Rápida

### Opción A: Ejecución Local con Node.js y PostgreSQL

1. **Instalar dependencias:**
   ```bash
   pnpm install
   ```

2. **Configurar el archivo `.env`:**
   Asegúrate de configurar `CERT_VAULT_KEY` (obligatoria para la bóveda criptográfica de certificados):
   ```env
   DATABASE_URL="postgresql://postgres:postgres@localhost:5432/contafacil_mx?schema=public"
   NEXTAUTH_SECRET="contafacil-mexico-sat-2026-super-secret-key-32chars"
   NEXTAUTH_URL="http://localhost:3000"
   NEXT_PUBLIC_APP_URL="http://localhost:3000"
   CERT_VAULT_KEY="contafacil-vault-secret-master-key-2026-strict"
   ```

3. **Sincronizar base de datos y Re-seeding tras migración a `Decimal`:**
   > [!IMPORTANT]
   > Tras la migración de todos los montos de `Float` a `Decimal` en Prisma, es indispensable ejecutar la sincronización y el script de seed para poblar la base de datos con los tipos de datos numéricos exactos:
   ```bash
   pnpm prisma db push
   npx tsx prisma/seed.ts
   ```

4. **Ejecutar suite de pruebas unitarias:**
   ```bash
   pnpm test
   ```

5. **Iniciar el servidor de desarrollo:**
   ```bash
   pnpm dev
   ```
   Abre [http://localhost:3000](http://localhost:3000) en tu navegador.

---

### Opción B: Ejecución con Docker Compose

```bash
docker compose up -d --build
```
Esto levantará el contenedor de PostgreSQL y la aplicación en `http://localhost:3000`.

---

## 🧪 Pruebas Unitarias Automatizadas (`pnpm test`)

EasyConta MX cuenta con una suite integral de **31 pruebas unitarias** ejecutadas con Vitest en menos de 1 segundo:

```bash
pnpm test
```

### Cobertura de Pruebas:
1. **`tests/tax-engine.test.ts` (20 pruebas con `decimal.js`):**
   - RESICO Personas Físicas: escalón 1.00% ($0 - $25,000), escalón 1.10% ($25,001 - $50,000), escalón 1.50% ($50,001 - $83,333.33), escalón 2.00% ($83,333.34 - $208,333.33), escalón 2.50% ($208,333.34 - $3,500,000), y retención obligatoria del 1.25% de ISR a Personas Morales.
   - Actividad Empresarial y Profesional: tarifa progresiva mensual Art. 96 LISR (límite inferior, porcentaje sobre excedente y cuota fija) con retención del 10%.
   - Arrendamiento: deducción ciega del 35% sin comprobante + predial vs comprobación de gastos reales.
   - Persona Moral General: Coeficiente de Utilidad (CU) gravado al 30%, amortización de pérdidas fiscales y pagos provisionales previos.
   - Determinación de IVA: IVA trasladado (16%), IVA acreditable pagado, retenciones (10.6667%) y saldos a favor.
   - Regla de negocio: rechazo de regímenes no soportados sin aplicar fallbacks arbitrarios.
2. **`tests/crypto-vault.test.ts` (7 pruebas de seguridad):**
   - Validación estricta de `CERT_VAULT_KEY` (falla de forma segura si la variable falta o está vacía).
   - Cifrado y descifrado AES-256-GCM de archivos binarios (.cer y .key) y contraseñas.
   - Detección de alteraciones o corrupción de datos mediante Authentication Tag (GCM).
   - Aplicación estricta de la regla SAT Art. 29 CFF: bloqueo automático si se intenta usar una e.firma para timbrado de comprobantes.
3. **`tests/bank-csv.test.ts` (4 pruebas de conciliación):**
   - Parseo de extractos bancarios en formato CSV mexicano (BBVA, Banorte, Santander, etc.).
   - Conciliación y match 1 a 1 por monto exacto y fecha contra facturas CFDI 4.0.

---

## 🤖 Asistente EasyConta MX

Diseñado para que cualquier persona sin conocimientos contables previos pueda entender y operar la plataforma con confianza:

1. **Botón Flotante Permanente:**
   - Ubicado en la esquina inferior derecha en `/login` y en todas las pantallas de `/dashboard/*`.
   - Incluye el badge identificador: `¿Cómo uso esto?`.
   - Abre un drawer lateral derecho (~420px), responsive, deslizable y accesible con `Esc` y `X`.
   - Recuerda su estado (abierto/cerrado) en `localStorage`.

2. **Tres Pestañas de Ayuda:**
   - **Guía de esta pantalla:** Detecta la URL activa y explica:
     - Título de 1 línea.
     - *Para qué sirve esta página.*
     - *Qué significa cada bloque o botón.*
     - *Qué hacer ahora (3 a 5 pasos claros).*
     - *Errores frecuentes a evitar.*
     - *Cuándo SÍ necesitas a un contador.*
   - **Recorrido paso a paso:**
     - Checklist interactivo de 9 pasos fundamentales para usar el sistema por primera vez.
     - Progreso porcentual persistido en `localStorage`.
     - Botón para repetir el Tour de 7 Pasos.
   - **Glosario SAT & FAQ:**
     - Buscador en tiempo real de **28 fichas oficiales**: RFC, CFDI 4.0, UUID, XML, PDF, PAC, CSD, e.firma, PUE, PPD, complemento de pago, ISR, IVA, retención, RESICO, actividad empresarial, arrendamiento, persona moral, coeficiente de utilidad, póliza, balanza, catálogo de cuentas, código agrupador, día 17, Buzón Tributario, lista 69-B, opinión 32-D, y línea de captura.
     - Cada ficha detalla: *Qué es*, *Para qué sirve*, *Ejemplo de 1 frase*, y *Error común*.
     - Sección de **12 Preguntas Frecuentes (FAQ)** con respuestas de 4 a 8 líneas.

3. **Tour Interactivo de Primera Visita (7 Pasos):**
   - Aparece automáticamente la primera vez que un usuario ingresa al sistema (`cfmx_tour_visto !== '1'`).
   - Cubre los conceptos clave: Qué es y qué NO es EasyConta, Cambio de RFC, Emisión de facturas, Bóveda XML, PUE vs PPD, Dónde ver impuestos ISR/IVA, y Cómo reactivar el Asistente.

4. **Ayuda Contextual con Icono `?`:**
   - Ubicada junto a términos fiscales complejos en toda la interfaz (Dashboard, Sidebar, Impuestos, Certificados).
   - Tooltip informativo inmediato al pasar el cursor y apertura directa de la ficha correspondiente en el Glosario al hacer clic.

---

## 🔐 Bóveda de Certificados SAT (CSD vs e.firma)

Ruta en la aplicación: `/dashboard/certificados`

### Diferencia Crítica de Seguridad y Normativa SAT:
- **CSD (Certificado de Sello Digital):** Creado exclusivamente para sellar y emitir facturas electrónicas CFDI 4.0. Se puede revocar sin comprometer la identidad legal de la empresa.
- **e.firma (Firma Electrónica Avanzada / FIEL):** Firma de identidad personal para trámites oficiales ante el SAT, declaraciones anuales y renovaciones.
- **Regla Estricta por Software:** Conforme al Artículo 29 del Código Fiscal de la Federación, **la e.firma NUNCA se utiliza para timbrado de facturas**. Si el sistema detecta un intento de timbrado con e.firma, la operación es abortada de inmediato.
- **Cifrado Militar AES-256-GCM:** Los archivos `.cer`, `.key` y contraseñas se almacenan cifrados con IV aleatorio de 12 bytes y Authentication Tag de 16 bytes, utilizando la llave maestra `CERT_VAULT_KEY` de 256 bits.

---

## 📅 Selector de Periodo Fiscal (Mes y Año)

Presente en los módulos clave del sistema:
- `/dashboard` (Tablero ISR / IVA)
- `/dashboard/motor-fiscal` (Determinación de pagos provisionales)
- `/dashboard/polizas` (Pólizas contables electrónicas)
- `/dashboard/balanza` (Balanza de comprobación Anexo 24)
- `/dashboard/conciliacion` (Conciliación PUE/PPD y bancaria)

### Características:
- Permite cambiar de mes y año con actualización reactiva de la URL (`?year=2026&month=9`).
- **Preservación del Seed:** Si no se especifican parámetros en la URL, el sistema selecciona automáticamente **Septiembre 2026** (donde residen los datos demo precargados) evitando que las facturas y cálculos desaparezcan al cambiar la fecha del sistema operativo.
- Botón rápido *"Ver Demo (Sep 2026)"* para regresar a la vista de datos cargados con un solo clic.

---

## ⚖️ Aviso Legal SAT

EasyConta MX es una plataforma tecnológica independiente de gestión interna y cálculo contable. Los cálculos, declaraciones preliminares y simulaciones son de carácter meramente informativo conforme a la legislación fiscal mexicana vigente (LISR, LIVA, CFF y RMF). No sustituyen la asesoría profesional de un Contador Público Titulado ni constituyen una resolución vinculante por parte del Servicio de Administración Tributaria (SAT).

---

EasyConta MX © 2026 • Diseñado con rigor técnico para la contabilidad digital mexicana moderna.

