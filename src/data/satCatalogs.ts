export const SAT_PRODUCTS = [
    { code: '84111506', name: 'Servicios de facturación' },
    { code: '84111500', name: 'Servicios de contabilidad' },
    { code: '85121610', name: 'Servicios de oftalmólogos' },
    { code: '85121600', name: 'Servicios de médicos' },
    { code: '85121500', name: 'Servicios de médicos generales' },
    { code: '85121800', name: 'Servicios de laboratorios médicos' },
    { code: '85101500', name: 'Servicios de centros sanitarios' },
    { code: '85101600', name: 'Servicios de atención sanitaria' },
    { code: '01010101', name: 'No existe en el catálogo' },
];

export const SAT_UNITS = [
    { code: 'E48', name: 'Unidad de servicio' },
    { code: 'E49', name: 'Día de trabajo' },
    { code: 'H87', name: 'Pieza' },
    { code: 'EA', name: 'Elemento' },
    { code: 'ACT', name: 'Actividad' },
    { code: 'Q3', name: 'Comida' },
];

export const PAYMENT_METHODS = [
    { code: 'PUE', name: 'Pago en una sola exhibición' },
    { code: 'PPD', name: 'Pago en parcialidades o diferido' },
];

export const FISCAL_REGIMES = [
    { code: '601', name: 'General de Ley Personas Morales' },
    { code: '603', name: 'Personas Morales con Fines no Lucrativos' },
    { code: '605', name: 'Sueldos y Salarios e Ingresos Asimilados a Salarios' },
    { code: '606', name: 'Arrendamiento' },
    { code: '612', name: 'Personas Físicas con Actividades Empresariales y Profesionales' },
    { code: '621', name: 'Incorporación Fiscal' },
    { code: '626', name: 'Régimen Simplificado de Confianza (RESICO)' },
];

export const SAT_PAYMENT_FORMS = [
    { code: '01', name: 'Efectivo' },
    { code: '02', name: 'Cheque nominativo' },
    { code: '03', name: 'Transferencia electrónica de fondos' },
    { code: '04', name: 'Tarjeta de crédito' },
    { code: '05', name: 'Monedero electrónico' },
    { code: '06', name: 'Dinero electrónico' },
    { code: '08', name: 'Vales de despensa' },
    { code: '12', name: 'Dación en pago' },
    { code: '28', name: 'Tarjeta de débito' },
    { code: '30', name: 'Aplicación de anticipos' },
    { code: '99', name: 'Por definir' },
];

export const SAT_CFDI_USES = [
    { code: 'G01', name: 'Adquisición de mercancías', validRegimes: ['601', '612', '626'] },
    { code: 'G02', name: 'Devoluciones, descuentos o bonificaciones', validRegimes: ['601', '612', '626'] },
    { code: 'G03', name: 'Gastos en general', validRegimes: ['601', '612', '626', '605'] }, // 605 is salaried, commonly used
    { code: 'I01', name: 'Construcciones', validRegimes: ['601', '612'] },
    { code: 'I02', name: 'Mobiliario y equipo de oficina por inversiones', validRegimes: ['601', '612'] },
    { code: 'I03', name: 'Equipo de transporte', validRegimes: ['601', '612'] },
    { code: 'I04', name: 'Equipo de computo y accesorios', validRegimes: ['601', '612'] },
    { code: 'D01', name: 'Honorarios médicos, dentales y gastos hospitalarios', validRegimes: ['605', '612'] }, // Deductions for individuals
    { code: 'D02', name: 'Gastos médicos por incapacidad o discapacidad', validRegimes: ['605', '612'] },
    { code: 'D10', name: 'Pagos por servicios educativos (colegiaturas)', validRegimes: ['605', '612'] },
    { code: 'S01', name: 'Sin efectos fiscales', validRegimes: ['601', '603', '605', '606', '612', '626'] },
    { code: 'CP01', name: 'Pagos', validRegimes: ['601', '612', '626'] },
    { code: 'CN01', name: 'Nómina', validRegimes: ['605'] },
];
