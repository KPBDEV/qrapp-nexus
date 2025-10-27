// CONFIG
const SUPABASE_URL = 'https://zefsmzxlhgfvmdydutzp.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InplZnNtenhsaGdmdm1keWR1dHpwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk5ODE1NDIsImV4cCI6MjA3NTU1NzU0Mn0.nm7syRkN1ZBnJ5QLk4QStITuUB1cjHZjNfrPA99CpdI';

// STATE
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
let user = JSON.parse(sessionStorage.getItem('nexus_user')) || null;
let clients = JSON.parse(localStorage.getItem('nexus_clients')) || [];
let usedCodes = JSON.parse(localStorage.getItem('nexus_usedCodes')) || [];
let cameraStream = null;
let scanAnimation = null;

// UTILITY FUNCTIONS CORREGIDAS
function $(selector) {
    const element = document.querySelector(selector);
    if (!element) {
        console.error(`❌ Elemento no encontrado: ${selector}`);
        
        // Debug: mostrar todos los elementos disponibles
        if (selector.includes('form')) {
            console.log('📋 Formularios disponibles:', document.querySelectorAll('[id*="form"]'));
        }
    }
    return element;
}

function $$(selector) {
    return document.querySelectorAll(selector);
}

function setDisplay(selector, display) {
    const element = $(selector);
    if (element) {
        element.style.display = display;
    }
}

// DIAGNÓSTICO
function diagnoseApp() {
    console.log('🔍 DIAGNÓSTICO COMPLETO:');
    
    // Verificar elementos críticos
    const criticalElements = [
        'body',
        '#login-screen',
        '#app-container',
        '#ingresar-section',
        '#verificar-section', 
        '#gestionar-section',
        '.main-content',
        '.bottom-nav',
        '.nav-btn'
    ];
    
    criticalElements.forEach(selector => {
        const elements = document.querySelectorAll(selector);
        console.log(`${selector}: ${elements.length} elementos encontrados`);
        
        elements.forEach((el, index) => {
            console.log(`  [${index}] - id: ${el.id}, class: ${el.className}`);
            console.log(`       display: ${el.style.display}, visible: ${el.offsetParent !== null}`);
        });
    });
    
    // Verificar datos de usuario
    console.log('👤 Usuario:', user);
    console.log('💾 Clientes:', clients.length);
    console.log('🔑 Códigos usados:', usedCodes.length);
}

// INIT CORREGIDO
document.addEventListener('DOMContentLoaded', () => {
    console.log('📄 DOM cargado - Iniciando Nexus');
    
    // Asegurar que el body sea visible
    document.body.style.opacity = '1';
    document.body.style.visibility = 'visible';
    
    checkAuthState();
    setupEventListeners();
    setupNavigation();
    initializeApp();
    
    console.log('✅ Nexus completamente inicializado');
    
    // Diagnóstico después de un momento
    setTimeout(() => {
        diagnoseApp();
    }, 1000);
});

// AUTH MANAGEMENT
function checkAuthState() {
    if (user && user.id) {
        console.log('✅ Usuario autenticado, mostrando app');
        showApp();
    } else {
        console.log('❌ Usuario no autenticado, mostrando login');
        showLogin();
    }
}

function showLogin() {
    console.log('🔧 Mostrando pantalla de login...');
    
    // Ocultar app completamente
    const appContainer = document.getElementById('app-container');
    if (appContainer) {
        appContainer.style.display = 'none';
        appContainer.style.visibility = 'hidden';
        appContainer.style.opacity = '0';
        appContainer.classList.add('hidden');
    }
    
    // Mostrar login completamente
    const loginScreen = document.getElementById('login-screen');
    if (loginScreen) {
        loginScreen.style.display = 'flex';
        loginScreen.style.visibility = 'visible';
        appContainer.style.opacity = '1';
        loginScreen.classList.remove('hidden');
        
        // Mostrar formulario de login por defecto
        showForm('login');
    }
    
    resetForms();
}

function showApp() {
    console.log('🔧 Mostrando aplicación...');
    
    // Ocultar login COMPLETAMENTE
    const loginScreen = document.getElementById('login-screen');
    if (loginScreen) {
        loginScreen.style.display = 'none';
        loginScreen.style.visibility = 'hidden';
        loginScreen.style.opacity = '0';
        loginScreen.classList.add('hidden');
    }
    
    // Mostrar app COMPLETAMENTE
    const appContainer = document.getElementById('app-container');
    if (appContainer) {
        appContainer.style.display = 'block';
        appContainer.style.visibility = 'visible';
        appContainer.style.opacity = '1';
        appContainer.classList.remove('hidden');
    }
    
    // Actualizar bienvenida
    const welcomeElement = document.getElementById('user-welcome');
    if (welcomeElement && user) {
        welcomeElement.textContent = `Hola, ${user.username}`;
    }
    
    // Mostrar sección principal
    showSection('ingresar-section');
    
    // Activar navegación
    setTimeout(() => {
        const navBtn = document.querySelector('[data-section="ingresar-section"]');
        if (navBtn) {
            document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
            navBtn.classList.add('active');
        }
        
        // Cargar datos
        loadFromCloud();
    }, 100);
    
    console.log('✅ Aplicación mostrada correctamente');
}

// EVENT LISTENERS
function setupEventListeners() {
    // Auth Events
    $('#btn-login').onclick = handleLogin;
    $('#btn-logout').onclick = handleLogout;
    $('#btn-register').onclick = handleRegister;
    $('#btn-recover-password').onclick = handlePasswordRecovery;
    
    // Form Navigation
    $('#btn-show-register').onclick = () => showForm('register');
    $('#btn-show-login').onclick = () => showForm('login');
    $('#btn-olvide-password').onclick = () => showForm('recover');
    $('#btn-show-login-from-recover').onclick = () => showForm('login');
    
    // Client Management
    $('#client-form').onsubmit = handleClientRegistration;
    $('#btn-verificar-manual').onclick = handleManualVerification;
    $('#btn-buscar').onclick = handleSearch;
    $('#btn-autorizar-reingreso').onclick = handleReentry;
    
    // Camera Controls
    $('#btn-start-camera').onclick = startCamera;
    $('#btn-stop-camera').onclick = stopCamera;
    
    // Admin Functions
    $('#btn-forzar-sincronizacion').onclick = forceSync;
    $('#btn-limpiar-db').onclick = clearDatabase;
}

function setupNavigation() {
    console.log('🔧 Configurando navegación...');
    
    const navButtons = document.querySelectorAll('.nav-btn');
    console.log(`📌 Botones de navegación encontrados: ${navButtons.length}`);
    
    navButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            const section = btn.getAttribute('data-section');
            console.log(`🔄 Navegando a: ${section}`);
            
            showSection(section);
            
            // Actualizar estado activo
            navButtons.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
        });
    });
    
    console.log('✅ Navegación configurada');
}

// AUTH FUNCTIONS
async function handleLogin() {
    const username = $('#login-username').value.trim();
    const password = $('#login-password').value.trim();
    
    if (!username || !password) {
        showMessage('Por favor completa todos los campos', 'error');
        return;
    }
    
    showLoading(true);
    
    try {
        const { data, error } = await supabase
            .from('nexus_usuarios')
            .select('*')
            .eq('username', username)
            .single();
            
        if (error) {
            if (error.code === 'PGRST116') {
                showMessage('Usuario no encontrado', 'error');
            } else {
                throw error;
            }
            return;
        }
        
        // Verificar contraseña
        if (data.password_hash === btoa(password)) {
            user = { 
                id: data.id, 
                username: data.username
            };
            sessionStorage.setItem('nexus_user', JSON.stringify(user));
            
            // Forzar una reinicialización completa
            showApp();
            
            // Esperar un frame y luego inicializar
            setTimeout(() => {
                showSection('ingresar-section');
                updateStats();
                renderClientsList();
                showMessage(`Bienvenido ${data.username}`, 'success');
            }, 100);
            
        } else {
            showMessage('Contraseña incorrecta', 'error');
        }
    } catch (error) {
        console.error('Login error:', error);
        showMessage('Error al iniciar sesión', 'error');
    } finally {
        showLoading(false);
    }
}

async function handleRegister() {
    const username = $('#register-username').value.trim();
    const password = $('#register-password').value.trim();
    const organizerCode = $('#organizer-code').value.trim();
    
    if (!username || !password || !organizerCode) {
        showMessage('Completa todos los campos', 'error');
        return;
    }
    
    if (password.length < 6) {
        showMessage('La contraseña debe tener al menos 6 caracteres', 'error');
        return;
    }
    
    if (organizerCode !== 'NEXUS.082208') {
        showMessage('Código organizador inválido', 'error');
        return;
    }
    
    showLoading(true);
    
    try {
        // Check if username exists
        const { data: existingUser } = await supabase
            .from('nexus_usuarios')
            .select('id')
            .eq('username', username)
            .single();
            
        if (existingUser) {
            showMessage('El usuario ya existe', 'error');
            return;
        }
        
        // Create new user
        const { data: newUser, error } = await supabase
            .from('nexus_usuarios')
            .insert([{
                username: username,
                password_hash: btoa(password),
                fecha_registro: new Date().toISOString()
            }])
            .select()
            .single();
            
        if (error) throw error;
        
        showMessage('Cuenta creada exitosamente', 'success');
        showForm('login');
        $('#register-form').reset();
        
    } catch (error) {
        console.error('Register error:', error);
        showMessage('Error al crear la cuenta', 'error');
    } finally {
        showLoading(false);
    }
}

function handleLogout() {
    console.log('🚪 Cerrando sesión...');
    
    // Detener cámara si está activa
    stopCamera();
    
    // Limpiar datos de usuario
    user = null;
    sessionStorage.removeItem('nexus_user');
    
    // OCULTAR APP COMPLETAMENTE
    const appContainer = document.getElementById('app-container');
    if (appContainer) {
        appContainer.style.display = 'none';
        appContainer.style.visibility = 'hidden';
        appContainer.style.opacity = '0';
        appContainer.classList.add('hidden');
    }
    
    // MOSTRAR LOGIN COMPLETAMENTE
    const loginScreen = document.getElementById('login-screen');
    if (loginScreen) {
        loginScreen.style.display = 'flex';
        loginScreen.style.visibility = 'visible';
        loginScreen.style.opacity = '1';
        loginScreen.classList.remove('hidden');
        
        // Mostrar el formulario de login por defecto
        showForm('login');
        
        // Resetear forms
        resetForms();
    }
    
    console.log('✅ Sesión cerrada correctamente');
}

// SECTION MANAGEMENT CORREGIDO
function showSection(sectionId) {
    console.log(`🔧 Mostrando sección: ${sectionId}`);
    
    // Verificar que la sección existe
    const targetSection = document.getElementById(sectionId.replace('#', ''));
    if (!targetSection) {
        console.error(`❌ Sección no encontrada: ${sectionId}`);
        
        // Intentar fallback - mostrar cualquier sección disponible
        const availableSections = document.querySelectorAll('.content-section');
        if (availableSections.length > 0) {
            const firstSection = availableSections[0];
            const firstSectionId = firstSection.id;
            console.log(`🔄 Fallback: Mostrando ${firstSectionId}`);
            
            // Ocultar todas
            availableSections.forEach(section => {
                section.style.display = 'none';
                section.classList.remove('active');
            });
            
            // Mostrar primera disponible
            firstSection.style.display = 'block';
            firstSection.classList.add('active');
        }
        return;
    }
    
    // Ocultar todas las secciones
    document.querySelectorAll('.content-section').forEach(section => {
        section.style.display = 'none';
        section.classList.remove('active');
    });
    
    // Mostrar la sección seleccionada
    targetSection.style.display = 'block';
    targetSection.classList.add('active');
    
    console.log(`✅ Sección ${sectionId} mostrada correctamente`);
    
    // Detener cámara si no estamos en verificar
    if (sectionId !== 'verificar-section') {
        stopCamera();
    }
    
    // Actualizar UI específica
    if (sectionId === 'gestionar-section') {
        updateStats();
        renderClientsList();
    }
}

function initializeApp() {
    console.log('🚀 Inicializando aplicación...');
    
    // Asegurar que los estilos se apliquen correctamente
    document.body.style.visibility = 'visible';
    
    // Forzar mostrar la sección principal si estamos en la app
    if (user && user.id) {
        setTimeout(() => {
            showSection('ingresar-section');
            
            // Activar navegación
            const navBtn = document.querySelector('[data-section="ingresar-section"]');
            if (navBtn) {
                document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
                navBtn.classList.add('active');
            }
            
            // Actualizar datos
            updateStats();
            renderClientsList();
        }, 500);
    }
    
    console.log('✅ Aplicación inicializada');
}

// CLIENT MANAGEMENT
async function handleClientRegistration(e) {
    e.preventDefault();
    
    const name = $('#nombre').value.trim();
    const id = $('#identificacion').value.trim();
    const phone = $('#telefono').value.trim();
    
    if (!name || !id || !phone) {
        showMessage('Completa todos los campos', 'error');
        return;
    }
    
    if (clients.some(client => client.identificacion === id)) {
        showMessage('Esta identificación ya está registrada', 'error');
        return;
    }
    
    if (usedCodes.includes(id)) {
        showMessage('Esta identificación ya fue utilizada para ingresar', 'error');
        return;
    }
    
    const newClient = {
        id: generateId(),
        nombre: name,
        identificacion: id,
        telefono: phone,
        fecha: new Date().toISOString(),
        creadoPor: user.username
    };
    
    clients.push(newClient);
    localStorage.setItem('nexus_clients', JSON.stringify(clients));
    
    generateQR(id);
    showMessage('Cliente registrado exitosamente', 'success');
    e.target.reset();
    
    await syncToCloud();
}

function generateQR(text) {
    const container = $('#qrcode');
    container.innerHTML = '';
    
    try {
        const qr = qrcode(0, 'L');
        qr.addData(text);
        qr.make();
        
        const canvas = document.createElement('canvas');
        const size = 250;
        canvas.width = canvas.height = size;
        
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, size, size);
        ctx.fillStyle = '#000000';
        
        const cellSize = size / qr.getModuleCount();
        for (let row = 0; row < qr.getModuleCount(); row++) {
            for (let col = 0; col < qr.getModuleCount(); col++) {
                if (qr.isDark(row, col)) {
                    ctx.fillRect(col * cellSize, row * cellSize, cellSize, cellSize);
                }
            }
        }
        
        container.appendChild(canvas);
        $('#qr-message').textContent = `QR generado para: ${text}`;
        $('#qr-message').className = 'qr-message success';
        
    } catch (error) {
        console.error('QR generation error:', error);
        showMessage('Error al generar el QR', 'error');
    }
}

// VERIFICATION SYSTEM
async function verifyCode(code) {
    if (!code) return;
    
    code = code.trim();
    
    if (usedCodes.includes(code)) {
        showVerificationResult('❌ Acceso ya registrado', 'Este código ya fue utilizado anteriormente', 'error');
        return;
    }
    
    const client = clients.find(c => c.identificacion === code);
    if (client) {
        usedCodes.push(code);
        localStorage.setItem('nexus_usedCodes', JSON.stringify(usedCodes));
        
        showVerificationResult(
            '✅ Acceso permitido', 
            `Bienvenido ${client.nombre}`,
            'success',
            client
        );
        
        await syncToCloud();
        updateStats();
    } else {
        showVerificationResult('❌ Código inválido', 'No se encontró registro con este código', 'error');
    }
}

function showVerificationResult(title, message, type, client = null) {
    const result = $('#verification-result');
    const resultTitle = $('#result-title');
    const resultMessage = $('#result-message');
    const clientDetails = $('#client-details');
    
    result.className = `result-card ${type}`;
    resultTitle.textContent = title;
    resultMessage.textContent = message;
    
    if (client) {
        clientDetails.innerHTML = `
            <div class="client-info">
                <p><strong>Nombre:</strong> ${client.nombre}</p>
                <p><strong>ID:</strong> ${client.identificacion}</p>
                <p><strong>Teléfono:</strong> ${client.telefono}</p>
                <p><strong>Registrado:</strong> ${new Date(client.fecha).toLocaleDateString()}</p>
            </div>
        `;
        clientDetails.style.display = 'block';
    } else {
        clientDetails.style.display = 'none';
    }
    
    result.classList.remove('hidden');
    
    setTimeout(() => {
        result.classList.add('hidden');
    }, 5000);
}

// CAMERA SYSTEM
async function startCamera() {
    try {
        stopCamera();
        
        cameraStream = await navigator.mediaDevices.getUserMedia({ 
            video: { facingMode: "environment" } 
        });
        
        const video = $('#video');
        video.srcObject = cameraStream;
        video.classList.remove('hidden');
        $('#camera-placeholder').classList.add('hidden');
        $('#btn-start-camera').classList.add('hidden');
        $('#btn-stop-camera').classList.remove('hidden');
        
        video.onloadedmetadata = () => {
            video.play();
            startQRScanning();
        };
        
    } catch (error) {
        console.error('Camera error:', error);
        showMessage('No se pudo acceder a la cámara', 'error');
    }
}

function stopCamera() {
    if (scanAnimation) {
        cancelAnimationFrame(scanAnimation);
        scanAnimation = null;
    }
    
    if (cameraStream) {
        cameraStream.getTracks().forEach(track => track.stop());
        cameraStream = null;
    }
    
    $('#video').classList.add('hidden');
    $('#camera-placeholder').classList.remove('hidden');
    $('#btn-start-camera').classList.remove('hidden');
    $('#btn-stop-camera').classList.add('hidden');
}

function startQRScanning() {
    const video = $('#video');
    const canvas = $('#canvas');
    const ctx = canvas.getContext('2d');
    
    function scan() {
        if (!cameraStream) return;
        
        try {
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
            
            const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            const code = jsQR(imageData.data, imageData.width, imageData.height);
            
            if (code) {
                verifyCode(code.data);
                stopCamera();
                return;
            }
        } catch (error) {
            console.error('Scan error:', error);
        }
        
        scanAnimation = requestAnimationFrame(scan);
    }
    
    scan();
}

// Función para fusionar arrays evitando duplicados
function mergeArraysUnique(array1, array2, uniqueKey) {
    const merged = [...array1];
    const seen = new Set(array1.map(item => item[uniqueKey]));
    
    array2.forEach(item => {
        if (!seen.has(item[uniqueKey])) {
            merged.push(item);
            seen.add(item[uniqueKey]);
        }
    });
    
    return merged;
}

// SYNC SYSTEM
async function syncToCloud() {
    if (!user) return;
    
    showSyncStatus('Sincronizando...', 'syncing');
    
    try {
        // PRIMERO: Cargar datos actuales de la nube para evitar conflictos
        const { data: existingData, error: fetchError } = await supabase
            .from('event_data')
            .select('*')
            .eq('id', user.id.toString()) // Usar ID de usuario único
            .single();
            
        if (fetchError && fetchError.code !== 'PGRST116') {
            throw fetchError;
        }
        
        // Combinar datos: clientes y códigos usados
        let cloudClients = existingData?.clientes || [];
        let cloudUsedCodes = existingData?.codigos_usados || [];
        
        // Fusionar datos locales con datos de la nube (evitar duplicados)
        const mergedClients = mergeArraysUnique(clients, cloudClients, 'identificacion');
        const mergedUsedCodes = [...new Set([...usedCodes, ...cloudUsedCodes])];
        
        // Preparar datos para guardar - SOLO CAMPOS QUE EXISTEN EN TU TABLA
        const syncData = {
            id: user.id.toString(), // ID ÚNICO por usuario
            clientes: mergedClients,
            codigos_usados: mergedUsedCodes,
            ultima_actualizacion: new Date().toISOString()
            // NO incluir 'usuario' porque no existe en tu tabla
        };
        
        // Guardar en la nube
        const { error } = await supabase
            .from('event_data')
            .upsert(syncData, { 
                onConflict: 'id'
            });
            
        if (error) throw error;
        
        // Actualizar datos locales con la fusión
        clients = mergedClients;
        usedCodes = mergedUsedCodes;
        localStorage.setItem('nexus_clients', JSON.stringify(clients));
        localStorage.setItem('nexus_usedCodes', JSON.stringify(usedCodes));
        
        showSyncStatus('Sincronizado ✓', 'success');
        setTimeout(() => hideSyncStatus(), 2000);
        
        console.log('✅ Sincronización exitosa. Clientes:', clients.length);
        
    } catch (error) {
        console.error('❌ Sync error:', error);
        showSyncStatus('Error de sincronización', 'error');
        setTimeout(() => hideSyncStatus(), 3000);
    }
}

async function loadFromCloud() {
    if (!user) return;
    
    try {
        const { data, error } = await supabase
            .from('event_data')
            .select('*')
            .eq('id', 'main')
            .single();
            
        if (error) {
            if (error.code === 'PGRST116') {
                console.log('No hay datos en la nube, empezando fresco');
                return;
            }
            throw error;
        }
        
        if (data) {
            clients = data.clientes || [];
            usedCodes = data.codigos_usados || [];
            
            localStorage.setItem('nexus_clients', JSON.stringify(clients));
            localStorage.setItem('nexus_usedCodes', JSON.stringify(usedCodes));
            
            updateStats();
            console.log('✅ Datos cargados desde la nube');
        }
    } catch (error) {
        console.error('Load error:', error);
        showMessage('Error al cargar datos', 'error');
    }
}

// UI FUNCTIONS
function showForm(formType) {
    console.log(`🔧 Mostrando formulario: ${formType}`);
    
    const forms = ['login-form', 'register-form', 'recover-form'];
    
    forms.forEach(formId => {
        const formElement = document.getElementById(formId);
        if (formElement) {
            if (formId === `${formType}-form`) {
                formElement.classList.remove('hidden');
                console.log(`✅ Mostrando: ${formId}`);
            } else {
                formElement.classList.add('hidden');
                console.log(`❌ Ocultando: ${formId}`);
            }
        } else {
            console.error(`❌ Formulario no encontrado: ${formId}`);
        }
    });
    
    // Ocultar mensajes
    const messageElement = document.getElementById('login-message');
    if (messageElement) {
        messageElement.classList.add('hidden');
    } else {
        console.error('❌ Elemento login-message no encontrado');
    }
}

function updateStats() {
    $('#total-registrados').textContent = clients.length;
    $('#total-ingresaron').textContent = usedCodes.length;
    $('#total-pendientes').textContent = clients.length - usedCodes.length;
}

function showSyncStatus(message, type) {
    const status = $('#sync-status');
    status.textContent = message;
    status.className = `sync-status ${type}`;
    status.classList.remove('hidden');
}

function hideSyncStatus() {
    $('#sync-status').classList.add('hidden');
}

function showMessage(message, type) {
    const messageEl = $('#login-message');
    messageEl.textContent = message;
    messageEl.className = `message ${type}`;
    messageEl.classList.remove('hidden');
    
    setTimeout(() => {
        messageEl.classList.add('hidden');
    }, 5000);
}

function showLoading(show) {
    const buttons = document.querySelectorAll('button');
    buttons.forEach(btn => {
        btn.disabled = show;
    });
}

// UTILITY FUNCTIONS
function generateId() {
    return Date.now() + Math.random().toString(36).substr(2, 9);
}

function resetForms() {
    document.querySelectorAll('form').forEach(form => form.reset());
    $('#qrcode').innerHTML = '';
    $('#qr-message').textContent = 'El código QR aparecerá aquí después del registro';
    $('#qr-message').className = 'qr-message';
}

// MANUAL VERIFICATION
function handleManualVerification() {
    const code = $('#codigo-manual').value.trim();
    if (code) {
        verifyCode(code);
        $('#codigo-manual').value = '';
    } else {
        showMessage('Ingresa un código para verificar', 'error');
    }
}

// SEARCH FUNCTIONALITY
function handleSearch() {
    const query = $('#buscar-cliente').value.trim().toLowerCase();
    renderClientsList(query);
}

function renderClientsList(query = '') {
    const container = $('#lista-clientes');
    
    let filteredClients = clients;
    if (query) {
        filteredClients = clients.filter(client => 
            client.nombre.toLowerCase().includes(query) ||
            client.identificacion.toLowerCase().includes(query)
        );
    }
    
    if (filteredClients.length === 0) {
        container.innerHTML = '<div class="empty-state">No se encontraron clientes</div>';
        return;
    }
    
    container.innerHTML = filteredClients.map(client => {
        const hasUsed = usedCodes.includes(client.identificacion);
        return `
            <div class="client-item ${hasUsed ? 'used' : ''}">
                <div class="client-info">
                    <h4>${client.nombre}</h4>
                    <p><strong>ID:</strong> ${client.identificacion}</p>
                    <p><strong>Teléfono:</strong> ${client.telefono}</p>
                    <p><strong>Fecha:</strong> ${new Date(client.fecha).toLocaleString()}</p>
                </div>
                <div class="client-actions">
                    <span class="status-badge ${hasUsed ? 'used' : ''}">
                        ${hasUsed ? '✅ Ingresó' : '⏳ Pendiente'}
                    </span>
                </div>
            </div>
        `;
    }).join('');
}

// REENTRY FUNCTIONALITY
function handleReentry() {
    const code = $('#codigo-reingreso').value.trim();
    if (!code) {
        showMessage('Ingresa un código para autorizar reingreso', 'error');
        return;
    }
    
    const index = usedCodes.indexOf(code);
    if (index > -1) {
        usedCodes.splice(index, 1);
        localStorage.setItem('nexus_usedCodes', JSON.stringify(usedCodes));
        syncToCloud();
        updateStats();
        showMessage('Reingreso autorizado exitosamente', 'success');
        $('#codigo-reingreso').value = '';
    } else {
        showMessage('Código no encontrado en ingresos', 'error');
    }
}

// ADMIN FUNCTIONS
async function forceSync() {
    console.log('🔄 Forzando sincronización completa...');
    showLoading(true);
    
    try {
        // Primero cargar todos los datos disponibles
        await loadFromCloud();
        // Luego sincronizar
        await syncToCloud();
        
        updateStats();
        renderClientsList();
        showMessage('Sincronización forzada completada', 'success');
        
    } catch (error) {
        console.error('❌ Force sync error:', error);
        showMessage('Error en sincronización forzada', 'error');
    } finally {
        showLoading(false);
    }
}

async function clearDatabase() {
    if (!confirm('¿ESTÁS SEGURO? Esto borrará TODOS los datos locales y de la nube.')) {
        return;
    }
    
    if (!confirm('¿REALMENTE SEGURO? Esta acción no se puede deshacer.')) {
        return;
    }
    
    showLoading(true);
    
    try {
        // Limpiar datos en la nube
        const syncData = {
            id: 'main',
            clientes: [],
            codigos_usados: [],
            ultima_actualizacion: new Date().toISOString()
        };
        
        await supabase.from('event_data').upsert(syncData);
        
        // Limpiar datos locales
        clients = [];
        usedCodes = [];
        localStorage.removeItem('nexus_clients');
        localStorage.removeItem('nexus_usedCodes');
        
        $('#qrcode').innerHTML = '';
        $('#qr-message').textContent = 'El código QR aparecerá aquí después del registro';
        $('#qr-message').className = 'qr-message';
        
        updateStats();
        renderClientsList();
        
        showMessage('Base de datos limpiada exitosamente', 'success');
        
    } catch (error) {
        console.error('Clear DB error:', error);
        showMessage('Error al limpiar la base de datos', 'error');
    } finally {
        showLoading(false);
    }
}

// PASSWORD RECOVERY
async function handlePasswordRecovery() {
    const username = $('#recover-username').value.trim();
    const organizerCode = $('#recover-organizer-code').value.trim();
    const newPassword = $('#new-password').value.trim();
    const confirmPassword = $('#confirm-password').value.trim();
    
    if (!username || !organizerCode || !newPassword || !confirmPassword) {
        showMessage('Completa todos los campos', 'error');
        return;
    }
    
    if (newPassword !== confirmPassword) {
        showMessage('Las contraseñas no coinciden', 'error');
        return;
    }
    
    if (newPassword.length < 6) {
        showMessage('La contraseña debe tener al menos 6 caracteres', 'error');
        return;
    }
    
    if (organizerCode !== 'NEXUS.082208') {
        showMessage('Código organizador inválido', 'error');
        return;
    }
    
    showLoading(true);
    
    try {
        const { error } = await supabase
            .from('nexus_usuarios')
            .update({ 
                password_hash: btoa(newPassword)
            })
            .eq('username', username);
            
        if (error) throw error;
        
        showMessage('Contraseña actualizada exitosamente', 'success');
        showForm('login');
        $('#recover-form').reset();
        
    } catch (error) {
        console.error('Password recovery error:', error);
        showMessage('Error al recuperar contraseña', 'error');
    } finally {
        showLoading(false);
    }
}

// SINCRONIZACIÓN PERIÓDICA
setInterval(() => {
    if (user && navigator.onLine) {
        syncToCloud();
    }
}, 30000);

// Función de diagnóstico de formularios - temporal
function diagnoseForms() {
    console.log('🔍 DIAGNÓSTICO DE FORMULARIOS:');
    
    const forms = ['login-form', 'register-form', 'recover-form', 'login-message'];
    
    forms.forEach(id => {
        const element = document.getElementById(id);
        console.log(`${id}:`, element ? 'ENCONTRADO' : 'NO ENCONTRADO');
        if (element) {
            console.log(`  - classList:`, element.classList);
            console.log(`  - display:`, element.style.display);
        }
    });
}

// Llámala después del DOMContentLoaded
document.addEventListener('DOMContentLoaded', () => {
    // ... tu código existente
    
    // Diagnóstico de formularios
    setTimeout(() => {
        diagnoseForms();
    }, 500);
});

// FUNCIÓN DE EMERGENCIA - DIAGNÓSTICO Y RECUPERACIÓN
async function emergencyDataRecovery() {
    console.log('🆘 INICIANDO RECUPERACIÓN DE EMERGENCIA');
    showLoading(true);
    
    try {
        // 1. Cargar TODOS los datos de la tabla
        const { data: allData, error } = await supabase
            .from('event_data')
            .select('*');
            
        if (error) throw error;
        
        console.log('📊 Todos los datos en la nube:', allData);
        
        // 2. Fusionar todos los datos de todos los usuarios
        let allClients = [...clients];
        let allUsedCodes = [...usedCodes];
        
        if (allData && allData.length > 0) {
            allData.forEach(userData => {
                if (userData.clientes) {
                    allClients = mergeArraysUnique(allClients, userData.clientes, 'identificacion');
                }
                if (userData.codigos_usados) {
                    allUsedCodes = [...new Set([...allUsedCodes, ...userData.codigos_usados])];
                }
            });
        }
        
        // 3. Actualizar datos locales
        clients = allClients;
        usedCodes = allUsedCodes;
        localStorage.setItem('nexus_clients', JSON.stringify(clients));
        localStorage.setItem('nexus_usedCodes', JSON.stringify(usedCodes));
        
        // 4. Sincronizar de vuelta a la nube (SOLO con campos existentes)
        const syncData = {
            id: user.id.toString(),
            clientes: clients,
            codigos_usados: usedCodes,
            ultima_actualizacion: new Date().toISOString()
        };
        
        const { error: syncError } = await supabase
            .from('event_data')
            .upsert(syncData, { onConflict: 'id' });
            
        if (syncError) throw syncError;
        
        updateStats();
        renderClientsList();
        
        console.log('✅ RECUPERACIÓN EXITOSA. Clientes totales:', clients.length);
        showMessage(`¡Recuperación exitosa! Se recuperaron ${clients.length} clientes`, 'success');
        
    } catch (error) {
        console.error('❌ Error en recuperación:', error);
        showMessage('Error en recuperación de datos', 'error');
    } finally {
        showLoading(false);
    }
}

// VERIFICAR ESTRUCTURA DE LA TABLA
async function checkTableStructure() {
    try {
        const { data, error } = await supabase
            .from('event_data')
            .select('*')
            .limit(1)
            .single();
            
        if (error) throw error;
        
        console.log('🏗️ ESTRUCTURA DE event_data:', Object.keys(data));
        console.log('📊 DATOS DE EJEMPLO:', data);
        
    } catch (error) {
        console.error('❌ Error al verificar estructura:', error);
    }
}

// Ejecuta esto:
checkTableStructure();

// LIMPIAR Y SINCRONIZAR DESDE CERO
async function cleanAndResync() {
    if (!confirm('⚠️ ¿ESTÁS SEGURO? Esto borrará todos los datos locales y empezará desde los datos de la nube.')) return;
    
    showLoading(true);
    
    try {
        // 1. Limpiar datos locales
        clients = [];
        usedCodes = [];
        localStorage.removeItem('nexus_clients');
        localStorage.removeItem('nexus_usedCodes');
        
        // 2. Cargar datos frescos desde la nube
        await loadFromCloud();
        
        // 3. Actualizar UI
        updateStats();
        renderClientsList();
        
        showMessage('Sincronización limpia completada', 'success');
        console.log('✅ Sincronización limpia. Clientes:', clients.length);
        
    } catch (error) {
        console.error('❌ Error en limpieza:', error);
        showMessage('Error en sincronización limpia', 'error');
    } finally {
        showLoading(false);
    }
}