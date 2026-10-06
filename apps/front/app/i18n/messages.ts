export const locales = ["es", "en"] as const;

export type Locale = (typeof locales)[number];

export const defaultLocale: Locale = "es";

type AppMessages = {
  common: {
    brand: string;
    languageToggleLabel: string;
  };
  theme: {
    toDark: string;
    toLight: string;
    darkTitle: string;
    lightTitle: string;
  };
  login: {
    heroTitle: string;
    heroSubtitle: string;
    title: string;
    intro: string;
    mobileContext: string;
    emailLabel: string;
    emailPlaceholder: string;
    passwordLabel: string;
    passwordPlaceholder: string;
    showPasswordLabel: string;
    hidePasswordLabel: string;
    submit: string;
    submitting: string;
    defaultError: string;
    invalidCredentials: string;
    signOut: string;
    signingOut: string;
    signOutError: string;
    connectionError: string;
    creditPrefix: string;
    creditIconLabel: string;
    creditSuffix: string;
  };
  ok: {
    status: string;
    loadingStatus: string;
    greeting: (name: string) => string;
    userLabel: string;
    endpointLabel: string;
    sessionLabel: string;
    sessionActive: string;
    loadingMessage: string;
    defaultError: string;
    connectionError: string;
    goToBudget: string;
    backToLogin: string;
    fallbackUser: string;
  };
  budget: {
    navBudget: string;
    navCustomers: string;
    navVehicles: string;
    navWorkOrders: string;
    navFinances: string;
    workshop: string;
    openNavigation: string;
    closeNavigation: string;
    pdfNoticeFirstLine: string;
    pdfNoticeSecondLine: string;
    sectionLabel: string;
    title: string;
    draftStatus: string;
    customerLabel: string;
    customerPlaceholder: string;
    domainLabel: string;
    domainPlaceholder: string;
    vehicleLabel: string;
    vehiclePlaceholder: string;
    optionalLabel: string;
    dateLabel: string;
    templateLabel: string;
    openCalendar: string;
    previousMonth: string;
    nextMonth: string;
    today: string;
    itemsTitle: string;
    addItem: string;
    descriptionColumn: string;
    quantityColumn: string;
    unitPriceColumn: string;
    totalColumn: string;
    descriptionPlaceholder: string;
    deleteItem: string;
    itemLabel: (number: number) => string;
    subtotalLabel: string;
    totalLabel: string;
    generatePdf: string;
    generatingPdf: string;
    pdfDefaultError: string;
    pdfConnectionError: string;
  };
  customers: {
    sectionLabel: string;
    title: string;
    newCustomer: string;
    searchLabel: string;
    searchPlaceholder: string;
    includeArchivedLabel: string;
    nameColumn: string;
    emailColumn: string;
    phoneColumn: string;
    actionsColumn: string;
    viewAction: string;
    archiveAction: string;
    deleteAction: string;
    archivedStatus: string;
    noEmail: string;
    noPhone: string;
    emptySearch: string;
    emptyList: string;
    loading: string;
    loadError: string;
    actionError: string;
    archiveError: string;
    deleteError: string;
    deleteTitle: string;
    archiveTitle: string;
    deleteMessage: (name: string) => string;
    archiveMessage: (name: string) => string;
    deleteConfirm: string;
    archiveConfirm: string;
    back: string;
    createTitle: string;
    firstNameLabel: string;
    firstNamePlaceholder: string;
    lastNameLabel: string;
    lastNamePlaceholder: string;
    emailLabel: string;
    emailPlaceholder: string;
    phoneLabel: string;
    phonePlaceholder: string;
    documentLabel: string;
    documentPlaceholder: string;
    addressLabel: string;
    addressPlaceholder: string;
    notesLabel: string;
    notesPlaceholder: string;
    cancel: string;
    save: string;
    saving: string;
    createError: string;
    createdSuccess: string;
    addVehicle: string;
    backToCustomers: string;
    detailTitle: string;
    loadDetailError: string;
    loadVehiclesError: string;
    loadingDetail: string;
    notFound: string;
    associatedVehicles: string;
    noVehicles: string;
  };
  vehicles: {
    sectionLabel: string;
    title: string;
    newVehicle: string;
    searchLabel: string;
    searchPlaceholder: string;
    includeArchivedLabel: string;
    licensePlateColumn: string;
    makeColumn: string;
    modelColumn: string;
    yearColumn: string;
    statusColumn: string;
    actionsColumn: string;
    viewAction: string;
    editAction: string;
    archiveAction: string;
    deleteAction: string;
    activeStatus: string;
    archivedStatus: string;
    emptySearch: string;
    emptyList: string;
    loading: string;
    loadError: string;
    actionError: string;
    archiveError: string;
    deleteError: string;
    deleteTitle: string;
    archiveTitle: string;
    deleteMessage: (licensePlate: string) => string;
    archiveMessage: (licensePlate: string) => string;
    deleteConfirm: string;
    archiveConfirm: string;
    back: string;
    createTitle: string;
    customerLabel: string;
    customerPlaceholder: string;
    loadingCustomer: string;
    changeCustomer: string;
    loadCustomersError: string;
    unknownCustomer: string;
    licensePlateLabel: string;
    licensePlatePlaceholder: string;
    makeLabel: string;
    makePlaceholder: string;
    modelLabel: string;
    modelPlaceholder: string;
    yearLabel: string;
    yearPlaceholder: string;
    initialOdometerLabel: string;
    initialOdometerPlaceholder: string;
    odometerLabel: string;
    odometerUnitLabel: string;
    cancel: string;
    save: string;
    saving: string;
    createError: string;
    updateError: string;
    detailTitle: string;
    loadDetailError: string;
    loadingDetail: string;
    notFound: string;
    loadWorkOrdersError: string;
    workOrdersTitle: (count: number) => string;
    orderColumn: string;
    dateColumn: string;
    endDateColumn: string;
    problemColumn: string;
    totalColumn: string;
    noWorkOrders: string;
    newWorkOrderAction: string;
    finishedWorkOrdersFilter: string;
    pendingStatus: string;
    finishedStatus: string;
  };
  workOrders: {
    sectionLabel: string;
    title: string;
    pendingTitle: string;
    doneTitle: string;
    newTitle: string;
    vehicleSummaryTitle: string;
    customerInfoLabel: string;
    entryDateLabel: string;
    exitDateLabel: string;
    itemsTitle: string;
    addItem: string;
    recommendationsTitle: string;
    addRecommendation: string;
    descriptionLabel: string;
    quantityLabel: string;
    unitPriceLabel: string;
    categoryLabel: string;
    statusLabel: string;
    removeAction: string;
    actionsColumn: string;
    viewAction: string;
    editAction: string;
    deleteAction: string;
    save: string;
    saving: string;
    cancel: string;
    backToVehicle: string;
    backToWorkOrders: string;
    vehicleDetailAction: string;
    loadError: string;
    loadDetailError: string;
    createError: string;
    updateError: string;
    deleteError: string;
    deleteTitle: string;
    deleteMessage: (orderNumber: string) => string;
    deleteConfirm: string;
    notFound: string;
    reportedProblemLabel: string;
    notesLabel: string;
    diagnosisLabel: string;
    problemRequiredError: string;
    noItemsError: string;
    itemRequiredError: string;
    recommendationRequiredError: string;
    noRecommendations: string;
    exitDateError: string;
    emptyPending: string;
    emptyDone: string;
    finishedFilter: string;
    loading: string;
    orderColumn: string;
    vehicleColumn: string;
    entryDateColumn: string;
    exitDateColumn: string;
    totalColumn: string;
    laborCategory: string;
    partCategory: string;
    otherCategory: string;
    pendingRecommendation: string;
    acceptedRecommendation: string;
    rejectedRecommendation: string;
  };
  finances: {
    sectionLabel: string;
    title: string;
    startDateLabel: string;
    endDateLabel: string;
    quickFiltersLabel: string;
    currentMonthFilter: string;
    lastThirtyDaysFilter: string;
    lastSixtyDaysFilter: string;
    lastNinetyDaysFilter: string;
    laborRevenueLabel: string;
    rangeLabel: (startDate: string, endDate: string) => string;
    loading: string;
    loadError: string;
    connectionError: string;
    invalidRange: string;
  };
};

export const messages = {
  es: {
    common: {
      brand: "carDoc",
      languageToggleLabel: "Cambiar idioma",
    },
    theme: {
      toDark: "Cambiar a modo oscuro",
      toLight: "Cambiar a modo claro",
      darkTitle: "Modo oscuro",
      lightTitle: "Modo claro",
    },
    login: {
      heroTitle: "Gestión simple para clientes, vehículos y órdenes de trabajo.",
      heroSubtitle: "Accedé al panel operativo para administrar el taller desde un mismo lugar.",
      title: "Iniciar sesión",
      intro: "Ingresá con tu email y contraseña para continuar.",
      mobileContext: "Clientes, vehículos y órdenes de trabajo en un solo panel.",
      emailLabel: "Email",
      emailPlaceholder: "usuario@ejemplo.com",
      passwordLabel: "Contraseña",
      passwordPlaceholder: "Ingresá tu contraseña",
      showPasswordLabel: "Mostrar contraseña",
      hidePasswordLabel: "Ocultar contraseña",
      submit: "Ingresar",
      submitting: "Ingresando...",
      defaultError: "No se pudo iniciar sesión. Intentá nuevamente.",
      invalidCredentials: "El email o la contraseña son incorrectos.",
      signOut: "Cerrar sesión",
      signingOut: "Cerrando sesión...",
      signOutError: "No se pudo cerrar la sesión. Intentá nuevamente.",
      connectionError: "No se pudo conectar con el servicio de autenticación.",
      creditPrefix: "<> with",
      creditIconLabel: "amor",
      creditSuffix: "by F94",
    },
    ok: {
      status: "Sesión validada",
      loadingStatus: "Validando sesión",
      greeting: (name: string) => `Hola ${name}`,
      userLabel: "Usuario",
      endpointLabel: "Endpoint",
      sessionLabel: "Sesión",
      sessionActive: "Activa",
      loadingMessage: "Validando la sesión...",
      defaultError: "No se pudo validar la sesión.",
      connectionError: "No se pudo conectar con el servicio de autenticación.",
      goToBudget: "Ir al presupuesto",
      backToLogin: "Volver al login",
      fallbackUser: "usuario",
    },
    budget: {
      navBudget: "Presupuesto",
      navCustomers: "Clientes",
      navVehicles: "Vehículos",
      navWorkOrders: "Órdenes de trabajo",
      navFinances: "Finanzas",
      workshop: "Taller",
      openNavigation: "Abrir navegación",
      closeNavigation: "Cerrar navegación",
      pdfNoticeFirstLine: "El PDF se generará y se descargará en tu dispositivo.",
      pdfNoticeSecondLine: "No se guarda en el sistema.",
      sectionLabel: "Presupuesto",
      title: "Nuevo presupuesto",
      draftStatus: "Borrador local",
      customerLabel: "Cliente",
      customerPlaceholder: "Nombre del cliente",
      domainLabel: "Dominio",
      domainPlaceholder: "Patente del vehículo",
      vehicleLabel: "Vehículo",
      vehiclePlaceholder: "Marca, modelo...",
      optionalLabel: "opcional",
      dateLabel: "Fecha",
      templateLabel: "Modelo de PDF",
      openCalendar: "Abrir calendario",
      previousMonth: "Mes anterior",
      nextMonth: "Mes siguiente",
      today: "Hoy",
      itemsTitle: "Ítems del presupuesto",
      addItem: "Agregar ítem",
      descriptionColumn: "Descripción",
      quantityColumn: "Cantidad",
      unitPriceColumn: "Precio unit.",
      totalColumn: "Total",
      descriptionPlaceholder: "Descripción del ítem",
      deleteItem: "Eliminar ítem",
      itemLabel: (number: number) => `Ítem ${number}`,
      subtotalLabel: "Subtotal",
      totalLabel: "Total",
      generatePdf: "Generar PDF",
      generatingPdf: "Generando PDF...",
      pdfDefaultError: "No se pudo generar el PDF. Revisá los datos e intentá nuevamente.",
      pdfConnectionError: "No se pudo conectar con la API. Verificá que el backend esté corriendo.",
    },
    customers: {
      sectionLabel: "Clientes",
      title: "Clientes",
      newCustomer: "Nuevo cliente",
      searchLabel: "Buscar clientes",
      searchPlaceholder: "Buscar por nombre...",
      includeArchivedLabel: "Incluir archivados",
      nameColumn: "Nombre",
      emailColumn: "Email",
      phoneColumn: "Teléfono",
      actionsColumn: "Acciones",
      viewAction: "Ver cliente",
      archiveAction: "Archivar",
      deleteAction: "Eliminar",
      archivedStatus: "Archivado",
      noEmail: "Sin email",
      noPhone: "Sin teléfono",
      emptySearch: "No hay clientes que coincidan con la búsqueda.",
      emptyList: "Todavía no hay clientes cargados.",
      loading: "Cargando clientes...",
      loadError: "No se pudieron cargar los clientes.",
      actionError: "No se pudo completar la acción.",
      archiveError: "No se pudo archivar el cliente.",
      deleteError: "No se pudo eliminar el cliente.",
      deleteTitle: "Eliminar cliente",
      archiveTitle: "Archivar cliente",
      deleteMessage: (name: string) =>
        `¿Estás seguro de que deseas eliminar a ${name}? Esta acción no se puede deshacer.`,
      archiveMessage: (name: string) =>
        `¿Estás seguro de que deseas archivar a ${name}? También se archivarán sus vehículos asociados.`,
      deleteConfirm: "Eliminar",
      archiveConfirm: "Archivar",
      back: "Volver",
      createTitle: "Nuevo cliente",
      firstNameLabel: "Nombre",
      firstNamePlaceholder: "Tony",
      lastNameLabel: "Apellido",
      lastNamePlaceholder: "Stark",
      emailLabel: "Email",
      emailPlaceholder: "tony.stark@starkentreprises.com",
      phoneLabel: "Teléfono",
      phonePlaceholder: "1122334455",
      documentLabel: "Documento",
      documentPlaceholder: "11.111.111",
      addressLabel: "Dirección",
      addressPlaceholder: "Balcarce 50",
      notesLabel: "Notas",
      notesPlaceholder: "Notas adicionales...",
      cancel: "Cancelar",
      save: "Guardar",
      saving: "Guardando...",
      createError: "No se pudo crear el cliente.",
      createdSuccess: "Cliente creado correctamente",
      addVehicle: "Agregar vehículo",
      backToCustomers: "Volver a clientes",
      detailTitle: "Detalle cliente",
      loadDetailError: "No se pudo cargar el cliente.",
      loadVehiclesError: "No se pudieron cargar los vehículos.",
      loadingDetail: "Cargando cliente...",
      notFound: "Cliente no encontrado.",
      associatedVehicles: "Vehículos asociados",
      noVehicles: "Este cliente no tiene vehículos asociados.",
    },
    vehicles: {
      sectionLabel: "Vehículos",
      title: "Vehículos",
      newVehicle: "Nuevo vehículo",
      searchLabel: "Buscar vehículos",
      searchPlaceholder: "Buscar por patente, marca o modelo...",
      includeArchivedLabel: "Incluir archivados",
      licensePlateColumn: "Patente",
      makeColumn: "Marca",
      modelColumn: "Modelo",
      yearColumn: "Año",
      statusColumn: "Estado",
      actionsColumn: "Acciones",
      viewAction: "Ver vehículo",
      editAction: "Editar",
      archiveAction: "Archivar",
      deleteAction: "Eliminar",
      activeStatus: "Activo",
      archivedStatus: "Archivado",
      emptySearch: "No hay vehículos que coincidan con la búsqueda.",
      emptyList: "Todavía no hay vehículos cargados.",
      loading: "Cargando vehículos...",
      loadError: "No se pudieron cargar los vehículos.",
      actionError: "No se pudo completar la acción.",
      archiveError: "No se pudo archivar el vehículo.",
      deleteError: "No se pudo eliminar el vehículo.",
      deleteTitle: "Eliminar vehículo",
      archiveTitle: "Archivar vehículo",
      deleteMessage: (licensePlate: string) =>
        `¿Estás seguro de que deseas eliminar el vehículo ${licensePlate}? Esta acción no se puede deshacer.`,
      archiveMessage: (licensePlate: string) =>
        `¿Estás seguro de que deseas archivar el vehículo ${licensePlate}? Podrás restaurarlo desde la lista de vehículos archivados.`,
      deleteConfirm: "Eliminar",
      archiveConfirm: "Archivar",
      back: "Volver",
      createTitle: "Nuevo vehículo",
      customerLabel: "Cliente",
      customerPlaceholder: "Seleccioná un cliente",
      loadingCustomer: "Cargando cliente...",
      changeCustomer: "Cambiar cliente",
      loadCustomersError: "No se pudieron cargar los clientes.",
      unknownCustomer: "Cliente desconocido",
      licensePlateLabel: "Patente",
      licensePlatePlaceholder: "ABC123",
      makeLabel: "Marca",
      makePlaceholder: "Toyota",
      modelLabel: "Modelo",
      modelPlaceholder: "Corolla",
      yearLabel: "Año",
      yearPlaceholder: "2018",
      initialOdometerLabel: "Odómetro inicial",
      initialOdometerPlaceholder: "45000",
      odometerLabel: "Odómetro",
      odometerUnitLabel: "Unidad de odómetro",
      cancel: "Cancelar",
      save: "Guardar",
      saving: "Guardando...",
      createError: "No se pudo crear el vehículo.",
      updateError: "No se pudo actualizar el vehículo.",
      detailTitle: "Detalle vehículo",
      loadDetailError: "No se pudo cargar el vehículo.",
      loadingDetail: "Cargando vehículo...",
      notFound: "Vehículo no encontrado.",
      loadWorkOrdersError: "No se pudieron cargar las órdenes de trabajo.",
      workOrdersTitle: (count: number) => `Órdenes de trabajo (${count})`,
      orderColumn: "N° Orden",
      dateColumn: "Fecha",
      endDateColumn: "Finalización",
      problemColumn: "Problema",
      totalColumn: "Total",
      noWorkOrders: "Este vehículo no tiene órdenes de trabajo adjuntadas.",
      newWorkOrderAction: "Nueva orden de trabajo",
      finishedWorkOrdersFilter: "Trabajos terminados",
      pendingStatus: "Pendiente",
      finishedStatus: "Finalizada",
    },
    workOrders: {
      sectionLabel: "Órdenes de trabajo",
      title: "Órdenes de trabajo",
      pendingTitle: "Órdenes pendientes",
      doneTitle: "Órdenes finalizadas",
      newTitle: "Nueva orden de trabajo",
      vehicleSummaryTitle: "Vehículo",
      customerInfoLabel: "Cliente",
      entryDateLabel: "Ingreso",
      exitDateLabel: "Egreso",
      itemsTitle: "Ítems",
      addItem: "Agregar ítem",
      recommendationsTitle: "Recomendaciones",
      addRecommendation: "Agregar recomendación",
      descriptionLabel: "Descripción",
      quantityLabel: "Cantidad",
      unitPriceLabel: "Precio unitario",
      categoryLabel: "Categoría",
      statusLabel: "Estado",
      removeAction: "Eliminar",
      actionsColumn: "Acciones",
      viewAction: "Ver",
      editAction: "Editar",
      deleteAction: "Eliminar",
      save: "Guardar",
      saving: "Guardando...",
      cancel: "Cancelar",
      backToVehicle: "Volver al vehículo",
      backToWorkOrders: "Volver a órdenes",
      vehicleDetailAction: "Ver vehículo",
      loadError: "No se pudieron cargar las órdenes de trabajo.",
      loadDetailError: "No se pudo cargar la orden de trabajo.",
      createError: "No se pudo crear la orden de trabajo.",
      updateError: "No se pudo actualizar la orden de trabajo.",
      deleteError: "No se pudo eliminar la orden de trabajo.",
      deleteTitle: "Eliminar orden de trabajo",
      deleteMessage: (orderNumber: string) =>
        `¿Estás seguro de que deseas eliminar ${orderNumber}? Esta acción no se puede deshacer.`,
      deleteConfirm: "Eliminar",
      notFound: "Orden de trabajo no encontrada.",
      reportedProblemLabel: "Problema reportado",
      notesLabel: "Notas",
      diagnosisLabel: "Diagnóstico",
      problemRequiredError: "Completá el problema reportado.",
      noItemsError: "La orden de trabajo debe tener al menos un ítem.",
      itemRequiredError: "Completá los campos obligatorios de cada ítem.",
      recommendationRequiredError: "Completá las recomendaciones cargadas.",
      noRecommendations: "Esta orden no tiene recomendaciones.",
      exitDateError: "La fecha de egreso debe ser igual o posterior a la fecha de ingreso.",
      emptyPending: "No hay órdenes de trabajo pendientes.",
      emptyDone: "No hay órdenes de trabajo finalizadas.",
      finishedFilter: "Trabajos terminados",
      loading: "Cargando órdenes de trabajo...",
      orderColumn: "N° Orden",
      vehicleColumn: "Vehículo",
      entryDateColumn: "Ingreso",
      exitDateColumn: "Egreso",
      totalColumn: "Total",
      laborCategory: "Mano de obra",
      partCategory: "Repuesto",
      otherCategory: "Otro",
      pendingRecommendation: "Pendiente",
      acceptedRecommendation: "Aceptada",
      rejectedRecommendation: "Rechazada",
    },
    finances: {
      sectionLabel: "Finanzas",
      title: "Ganancias de mano de obra",
      startDateLabel: "Desde",
      endDateLabel: "Hasta",
      quickFiltersLabel: "Filtros rápidos",
      currentMonthFilter: "Último mes",
      lastThirtyDaysFilter: "30 días",
      lastSixtyDaysFilter: "60 días",
      lastNinetyDaysFilter: "90 días",
      laborRevenueLabel: "Total ganado",
      rangeLabel: (startDate: string, endDate: string) => `${startDate} al ${endDate}`,
      loading: "Calculando ingresos...",
      loadError: "No se pudieron cargar las finanzas.",
      connectionError: "No se pudo conectar con la API. Verificá que el backend esté corriendo.",
      invalidRange: "La fecha hasta debe ser igual o posterior a la fecha desde.",
    },
  },
  en: {
    common: {
      brand: "carDoc",
      languageToggleLabel: "Change language",
    },
    theme: {
      toDark: "Switch to dark mode",
      toLight: "Switch to light mode",
      darkTitle: "Dark mode",
      lightTitle: "Light mode",
    },
    login: {
      heroTitle: "Simple management for customers, vehicles, and work orders.",
      heroSubtitle: "Access the operations panel to manage the shop from one place.",
      title: "Sign in",
      intro: "Enter your email and password to continue.",
      mobileContext: "Customers, vehicles, and work orders in one panel.",
      emailLabel: "Email",
      emailPlaceholder: "user@example.com",
      passwordLabel: "Password",
      passwordPlaceholder: "Enter your password",
      showPasswordLabel: "Show password",
      hidePasswordLabel: "Hide password",
      submit: "Sign in",
      submitting: "Signing in...",
      defaultError: "Could not sign in. Try again.",
      invalidCredentials: "The email or password is incorrect.",
      signOut: "Sign out",
      signingOut: "Signing out...",
      signOutError: "Could not sign out. Try again.",
      connectionError: "Could not connect to the authentication service.",
      creditPrefix: "<> with",
      creditIconLabel: "love",
      creditSuffix: "by F94",
    },
    ok: {
      status: "Session validated",
      loadingStatus: "Validating session",
      greeting: (name: string) => `Hello ${name}`,
      userLabel: "User",
      endpointLabel: "Endpoint",
      sessionLabel: "Session",
      sessionActive: "Active",
      loadingMessage: "Validating session...",
      defaultError: "Could not validate the session.",
      connectionError: "Could not connect to the authentication service.",
      goToBudget: "Go to budget",
      backToLogin: "Back to login",
      fallbackUser: "user",
    },
    budget: {
      navBudget: "Budget",
      navCustomers: "Customers",
      navVehicles: "Vehicles",
      navWorkOrders: "Work orders",
      navFinances: "Finances",
      workshop: "Workshop",
      openNavigation: "Open navigation",
      closeNavigation: "Close navigation",
      pdfNoticeFirstLine: "The PDF will be generated and downloaded to your device.",
      pdfNoticeSecondLine: "It is not saved in the system.",
      sectionLabel: "Budget",
      title: "New budget",
      draftStatus: "Local draft",
      customerLabel: "Customer",
      customerPlaceholder: "Customer name",
      domainLabel: "License plate",
      domainPlaceholder: "Vehicle plate",
      vehicleLabel: "Vehicle",
      vehiclePlaceholder: "Make, model...",
      optionalLabel: "optional",
      dateLabel: "Date",
      templateLabel: "PDF template",
      openCalendar: "Open calendar",
      previousMonth: "Previous month",
      nextMonth: "Next month",
      today: "Today",
      itemsTitle: "Budget items",
      addItem: "Add item",
      descriptionColumn: "Description",
      quantityColumn: "Quantity",
      unitPriceColumn: "Unit price",
      totalColumn: "Total",
      descriptionPlaceholder: "Item description",
      deleteItem: "Delete item",
      itemLabel: (number: number) => `Item ${number}`,
      subtotalLabel: "Subtotal",
      totalLabel: "Total",
      generatePdf: "Generate PDF",
      generatingPdf: "Generating PDF...",
      pdfDefaultError: "Could not generate the PDF. Check the data and try again.",
      pdfConnectionError: "Could not connect to the API. Check that the backend is running.",
    },
    customers: {
      sectionLabel: "Customers",
      title: "Customers",
      newCustomer: "New customer",
      searchLabel: "Search customers",
      searchPlaceholder: "Search by name...",
      includeArchivedLabel: "Include archived",
      nameColumn: "Name",
      emailColumn: "Email",
      phoneColumn: "Phone",
      actionsColumn: "Actions",
      viewAction: "View customer",
      archiveAction: "Archive",
      deleteAction: "Delete",
      archivedStatus: "Archived",
      noEmail: "No email",
      noPhone: "No phone",
      emptySearch: "No customers match the search.",
      emptyList: "There are no customers yet.",
      loading: "Loading customers...",
      loadError: "Could not load customers.",
      actionError: "Could not complete the action.",
      archiveError: "Could not archive the customer.",
      deleteError: "Could not delete the customer.",
      deleteTitle: "Delete customer",
      archiveTitle: "Archive customer",
      deleteMessage: (name: string) =>
        `Are you sure you want to delete ${name}? This action cannot be undone.`,
      archiveMessage: (name: string) =>
        `Are you sure you want to archive ${name}? Their associated vehicles will also be archived.`,
      deleteConfirm: "Delete",
      archiveConfirm: "Archive",
      back: "Back",
      createTitle: "New customer",
      firstNameLabel: "First name",
      firstNamePlaceholder: "Tony",
      lastNameLabel: "Last name",
      lastNamePlaceholder: "Stark",
      emailLabel: "Email",
      emailPlaceholder: "tony.stark@starkentreprises.com",
      phoneLabel: "Phone",
      phonePlaceholder: "1122334455",
      documentLabel: "Document",
      documentPlaceholder: "11.111.111",
      addressLabel: "Address",
      addressPlaceholder: "1600 Pennsylvania Avenue",
      notesLabel: "Notes",
      notesPlaceholder: "Additional notes...",
      cancel: "Cancel",
      save: "Save",
      saving: "Saving...",
      createError: "Could not create the customer.",
      createdSuccess: "Customer created successfully",
      addVehicle: "Add vehicle",
      backToCustomers: "Back to customers",
      detailTitle: "Customer detail",
      loadDetailError: "Could not load the customer.",
      loadVehiclesError: "Could not load vehicles.",
      loadingDetail: "Loading customer...",
      notFound: "Customer not found.",
      associatedVehicles: "Associated vehicles",
      noVehicles: "This customer has no associated vehicles.",
    },
    vehicles: {
      sectionLabel: "Vehicles",
      title: "Vehicles",
      newVehicle: "New vehicle",
      searchLabel: "Search vehicles",
      searchPlaceholder: "Search by license plate, make, or model...",
      includeArchivedLabel: "Include archived",
      licensePlateColumn: "License plate",
      makeColumn: "Make",
      modelColumn: "Model",
      yearColumn: "Year",
      statusColumn: "Status",
      actionsColumn: "Actions",
      viewAction: "View vehicle",
      editAction: "Edit",
      archiveAction: "Archive",
      deleteAction: "Delete",
      activeStatus: "Active",
      archivedStatus: "Archived",
      emptySearch: "No vehicles match the search.",
      emptyList: "There are no vehicles yet.",
      loading: "Loading vehicles...",
      loadError: "Could not load vehicles.",
      actionError: "Could not complete the action.",
      archiveError: "Could not archive the vehicle.",
      deleteError: "Could not delete the vehicle.",
      deleteTitle: "Delete vehicle",
      archiveTitle: "Archive vehicle",
      deleteMessage: (licensePlate: string) =>
        `Are you sure you want to delete vehicle ${licensePlate}? This action cannot be undone.`,
      archiveMessage: (licensePlate: string) =>
        `Are you sure you want to archive vehicle ${licensePlate}? You can restore it from the archived vehicles list.`,
      deleteConfirm: "Delete",
      archiveConfirm: "Archive",
      back: "Back",
      createTitle: "New vehicle",
      customerLabel: "Customer",
      customerPlaceholder: "Select a customer",
      loadingCustomer: "Loading customer...",
      changeCustomer: "Change customer",
      loadCustomersError: "Could not load customers.",
      unknownCustomer: "Unknown customer",
      licensePlateLabel: "License plate",
      licensePlatePlaceholder: "ABC123",
      makeLabel: "Make",
      makePlaceholder: "Toyota",
      modelLabel: "Model",
      modelPlaceholder: "Corolla",
      yearLabel: "Year",
      yearPlaceholder: "2018",
      initialOdometerLabel: "Initial odometer",
      initialOdometerPlaceholder: "45000",
      odometerLabel: "Odometer",
      odometerUnitLabel: "Odometer unit",
      cancel: "Cancel",
      save: "Save",
      saving: "Saving...",
      createError: "Could not create the vehicle.",
      updateError: "Could not update the vehicle.",
      detailTitle: "Vehicle detail",
      loadDetailError: "Could not load the vehicle.",
      loadingDetail: "Loading vehicle...",
      notFound: "Vehicle not found.",
      loadWorkOrdersError: "Could not load work orders.",
      workOrdersTitle: (count: number) => `Work Orders (${count})`,
      orderColumn: "Order No.",
      dateColumn: "Date",
      endDateColumn: "End date",
      problemColumn: "Problem",
      totalColumn: "Total",
      noWorkOrders: "This vehicle has no attached work orders.",
      newWorkOrderAction: "New work order",
      finishedWorkOrdersFilter: "Orders done",
      pendingStatus: "Pending",
      finishedStatus: "Finished",
    },
    workOrders: {
      sectionLabel: "Work orders",
      title: "Work orders",
      pendingTitle: "Pending work orders",
      doneTitle: "Finished work orders",
      newTitle: "New work order",
      vehicleSummaryTitle: "Vehicle",
      customerInfoLabel: "Customer",
      entryDateLabel: "Entry",
      exitDateLabel: "Exit",
      itemsTitle: "Items",
      addItem: "Add item",
      recommendationsTitle: "Recommendations",
      addRecommendation: "Add recommendation",
      descriptionLabel: "Description",
      quantityLabel: "Quantity",
      unitPriceLabel: "Unit price",
      categoryLabel: "Category",
      statusLabel: "Status",
      removeAction: "Remove",
      actionsColumn: "Actions",
      viewAction: "View",
      editAction: "Edit",
      deleteAction: "Delete",
      save: "Save",
      saving: "Saving...",
      cancel: "Cancel",
      backToVehicle: "Back to vehicle",
      backToWorkOrders: "Back to work orders",
      vehicleDetailAction: "View vehicle",
      loadError: "Could not load work orders.",
      loadDetailError: "Could not load the work order.",
      createError: "Could not create the work order.",
      updateError: "Could not update the work order.",
      deleteError: "Could not delete the work order.",
      deleteTitle: "Delete work order",
      deleteMessage: (orderNumber: string) =>
        `Are you sure you want to delete ${orderNumber}? This action cannot be undone.`,
      deleteConfirm: "Delete",
      notFound: "Work order not found.",
      reportedProblemLabel: "Reported problem",
      notesLabel: "Notes",
      diagnosisLabel: "Diagnosis",
      problemRequiredError: "Complete the reported problem.",
      noItemsError: "The work order must contain at least one item.",
      itemRequiredError: "Complete every required item field.",
      recommendationRequiredError: "Complete the recommendations you added.",
      noRecommendations: "This work order has no recommendations.",
      exitDateError: "Exit date must be equal to or later than entry date.",
      emptyPending: "There are no pending work orders.",
      emptyDone: "There are no finished work orders.",
      finishedFilter: "Orders done",
      loading: "Loading work orders...",
      orderColumn: "Order No.",
      vehicleColumn: "Vehicle",
      entryDateColumn: "Entry",
      exitDateColumn: "Exit",
      totalColumn: "Total",
      laborCategory: "Labor",
      partCategory: "Part",
      otherCategory: "Other",
      pendingRecommendation: "Pending",
      acceptedRecommendation: "Accepted",
      rejectedRecommendation: "Rejected",
    },
    finances: {
      sectionLabel: "Finances",
      title: "Labor revenue",
      startDateLabel: "From",
      endDateLabel: "To",
      quickFiltersLabel: "Quick filters",
      currentMonthFilter: "Current month",
      lastThirtyDaysFilter: "30 days",
      lastSixtyDaysFilter: "60 days",
      lastNinetyDaysFilter: "90 days",
      laborRevenueLabel: "Total earned",
      rangeLabel: (startDate: string, endDate: string) => `${startDate} to ${endDate}`,
      loading: "Calculating revenue...",
      loadError: "Could not load finances.",
      connectionError: "Could not connect to the API. Check that the backend is running.",
      invalidRange: "End date must be equal to or later than start date.",
    },
  },
} satisfies Record<Locale, AppMessages>;
