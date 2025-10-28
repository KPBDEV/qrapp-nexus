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
        const userUniqueId = `user_${user.id}_${user.username}`;
        
        console.log(`🔑 Sincronizando: ${userUniqueId}`);
        
        // PRIMERO: Cargar y fusionar datos de TODOS los usuarios
        const { data: allCloudData, error: fetchError } = await supabase
            .from('event_data')
            .select('*');
            
        if (fetchError && fetchError.code !== 'PGRST116') {
            throw fetchError;
        }
        
        // Fusionar datos locales con TODOS los datos de la nube
        let mergedClients = [...clients];
        let mergedUsedCodes = [...usedCodes];
        
        if (allCloudData && allCloudData.length > 0) {
            allCloudData.forEach(record => {
                if (record.clientes) {
                    mergedClients = mergeArraysUnique(mergedClients, record.clientes, 'identificacion');
                }
                if (record.codigos_usados) {
                    mergedUsedCodes = [...new Set([...mergedUsedCodes, ...record.codigos_usados])];
                }
            });
        }
        
        console.log(`🔄 Después de fusión completa: ${mergedClients.length} clientes`);
        
        // Preparar datos para guardar
        const syncData = {
            id: userUniqueId,
            clientes: mergedClients, // Datos fusionados completos
            codigos_usados: mergedUsedCodes, // Datos fusionados completos
            ultima_actualizacion: new Date().toISOString()
        };
        
        // Guardar en la nube
        const { error } = await supabase
            .from('event_data')
            .upsert(syncData, { 
                onConflict: 'id'
            });
            
        if (error) throw error;
        
        // Actualizar datos locales con la fusión completa
        clients = mergedClients;
        usedCodes = mergedUsedCodes;
        localStorage.setItem('nexus_clients', JSON.stringify(clients));
        localStorage.setItem('nexus_usedCodes', JSON.stringify(usedCodes));
        
        showSyncStatus('Sincronizado ✓', 'success');
        setTimeout(() => hideSyncStatus(), 2000);
        
        console.log(`✅ Sincronización exitosa. Clientes: ${clients.length}`);
        
    } catch (error) {
        console.error('❌ Sync error:', error);
        showSyncStatus('Error de sincronización', 'error');
        setTimeout(() => hideSyncStatus(), 3000);
    }
}

async function loadFromCloud() {
    if (!user) return;
    
    try {
        console.log('🔍 Cargando y fusionando datos de TODOS los usuarios...');
        
        // 1. Cargar TODOS los datos de la tabla (todos los usuarios)
        const { data: allCloudData, error } = await supabase
            .from('event_data')
            .select('*');
            
        if (error) {
            if (error.code === 'PGRST116') {
                console.log('📭 No hay datos en la nube');
                return;
            }
            throw error;
        }
        
        if (!allCloudData || allCloudData.length === 0) {
            console.log('📭 No se encontraron datos en la nube');
            return;
        }
        
        console.log(`📊 Se encontraron ${allCloudData.length} registros en la nube`);
        
        // 2. Fusionar TODOS los clientes de TODOS los registros
        let allClients = [...clients]; // Empezar con datos locales
        let allUsedCodes = [...usedCodes]; // Empezar con datos locales
        
        allCloudData.forEach(record => {
            console.log(`👤 Fusionando: ${record.id} - ${record.clientes?.length || 0} clientes`);
            
            if (record.clientes && record.clientes.length > 0) {
                allClients = mergeArraysUnique(allClients, record.clientes, 'identificacion');
            }
            if (record.codigos_usados && record.codigos_usados.length > 0) {
                allUsedCodes = [...new Set([...allUsedCodes, ...record.codigos_usados])];
            }
        });
        
        console.log(`🎯 Después de fusión completa: ${allClients.length} clientes únicos`);
        
        // 3. Actualizar datos locales con la fusión completa
        clients = allClients;
        usedCodes = allUsedCodes;
        localStorage.setItem('nexus_clients', JSON.stringify(clients));
        localStorage.setItem('nexus_usedCodes', JSON.stringify(usedCodes));
        
        // 4. Actualizar UI
        updateStats();
        
        console.log(`✅ Carga completa exitosa. Clientes totales: ${clients.length}`);
        
    } catch (error) {
        console.error('❌ Load error:', error);
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
                    <p><strong>Registrado por:</strong> ${client.creadoPor || 'Sistema'}</p>
                </div>
                <div class="client-actions">
                    <span class="status-badge ${hasUsed ? 'used' : ''}">
                        ${hasUsed ? '✅ Ingresó' : '⏳ Pendiente'}
                    </span>
                    <button onclick="showQRForClient('${client.identificacion}', '${client.nombre}')" class="btn primary small">
                        📱 Ver QR
                    </button>
                    ${hasUsed ? `
                        <button onclick="authorizeReentry('${client.identificacion}')" class="btn warning small">
                            🔄 Reingreso
                        </button>
                    ` : ''}
                </div>
            </div>
        `;
    }).join('');
}

// MOSTRAR QR DE CLIENTE EXISTENTE
function showQRForClient(identification, clientName) {
    console.log(`📱 Mostrando QR para: ${clientName} - ${identification}`);
    
    // Navegar a la sección de registrar
    showSection('ingresar-section');
    
    // Activar navegación
    document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
    document.querySelector('[data-section="ingresar-section"]').classList.add('active');
    
    // Generar y mostrar el QR en la sección existente
    generateQR(identification);
    
    // Actualizar mensaje
    $('#qr-message').textContent = `QR de: ${clientName} (${identification})`;
    $('#qr-message').className = 'qr-message success';
    
    // Mostrar mensaje informativo
    showMessage(`QR mostrado para: ${clientName}`, 'success');
}

// Función auxiliar para autorizar reingreso desde la lista
async function authorizeReentry(code) {
    $('#codigo-reingreso').value = code;
    await handleReentry();
}

// Función auxiliar para autorizar reingreso desde la lista
async function authorizeReentry(code) {
    $('#codigo-reingreso').value = code;
    await handleReentry();
}

// REENTRY FUNCTIONALITY
async function handleReentry() {
    const code = $('#codigo-reingreso').value.trim();
    if (!code) {
        showMessage('Ingresa un código para autorizar reingreso', 'error');
        return;
    }
    
    console.log(`🔄 INICIANDO REINGRESO PARA: ${code}`);
    
    // 1. Verificar que el código existe en clientes
    const clientExists = clients.some(client => client.identificacion === code);
    if (!clientExists) {
        showMessage('❌ Código no encontrado en clientes registrados', 'error');
        return;
    }
    
    // 2. Verificar que el código está marcado como usado
    const currentIndex = usedCodes.indexOf(code);
    console.log(`📊 Verificación: usedCodes incluye "${code}": ${currentIndex !== -1}`);
    
    if (currentIndex === -1) {
        showMessage('❌ Este código no está marcado como usado', 'error');
        return;
    }
    
    // 3. Mostrar loading
    showLoading(true);
    showSyncStatus('Autorizando reingreso...', 'syncing');
    
    try {
        // 4. DEBUG: Estado antes
        console.log('🔍 ANTES DE REINGRESO:');
        console.log(`   usedCodes:`, usedCodes);
        console.log(`   Índice de ${code}:`, currentIndex);
        
        // 5. Remover de usedCodes LOCALMENTE
        usedCodes.splice(currentIndex, 1);
        localStorage.setItem('nexus_usedCodes', JSON.stringify(usedCodes));
        
        console.log('✅ DESPUÉS DE REMOVER LOCAL:');
        console.log(`   usedCodes:`, usedCodes);
        console.log(`   usedCodes incluye "${code}":`, usedCodes.includes(code));
        
        // 6. SINCRONIZACIÓN INMEDIATA
        console.log('☁️ Sincronizando con nube...');
        await syncToCloud();
        
        // 7. VERIFICACIÓN EXTRA - Forzar recarga desde nube
        console.log('🔍 Verificando sincronización...');
        await loadFromCloud();
        
        // 8. Verificación final
        const finalCheck = usedCodes.includes(code);
        console.log(`🎯 VERIFICACIÓN FINAL: usedCodes incluye "${code}": ${finalCheck}`);
        
        if (finalCheck) {
            console.error('❌ FALLA CRÍTICA: El código sigue en usedCodes después de todo el proceso');
            throw new Error('El reingreso no se completó correctamente');
        }
        
        // 9. ACTUALIZAR UI
        updateStats();
        renderClientsList();
        
        // 10. MOSTRAR ÉXITO
        showSyncStatus('Reingreso autorizado ✓', 'success');
        setTimeout(() => hideSyncStatus(), 3000);
        
        showMessage(`✅ Reingreso autorizado exitosamente para ${code}`, 'success');
        $('#codigo-reingreso').value = '';
        
        console.log(`🎉 REINGRESO COMPLETADO EXITOSAMENTE PARA: ${code}`);
        
    } catch (error) {
        console.error('❌ ERROR EN REINGRESO:', error);
        showSyncStatus('Error en reingreso', 'error');
        setTimeout(() => hideSyncStatus(), 3000);
        showMessage(`Error al autorizar reingreso: ${error.message}`, 'error');
    } finally {
        showLoading(false);
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
// FUNCIÓN DE EMERGENCIA - FUSIONAR DATOS DE TODOS LOS USUARIOS
async function emergencyDataRecovery() {
    console.log('🆘 INICIANDO RECUPERACIÓN COMPLETA');
    showLoading(true);
    
    try {
        // 1. Cargar TODOS los datos de la tabla
        const { data: allData, error } = await supabase
            .from('event_data')
            .select('*');
            
        if (error) throw error;
        
        console.log('📊 Todos los registros en la nube:', allData);
        
        // 2. Fusionar todos los datos de TODOS los usuarios
        let allClients = [...clients];
        let allUsedCodes = [...usedCodes];
        
        if (allData && allData.length > 0) {
            allData.forEach(userData => {
                console.log(`👤 Procesando: ${userData.id} - ${userData.clientes?.length || 0} clientes`);
                
                if (userData.clientes && userData.clientes.length > 0) {
                    allClients = mergeArraysUnique(allClients, userData.clientes, 'identificacion');
                }
                if (userData.codigos_usados && userData.codigos_usados.length > 0) {
                    allUsedCodes = [...new Set([...allUsedCodes, ...userData.codigos_usados])];
                }
            });
        }
        
        console.log(`🔄 Después de fusionar todos: ${allClients.length} clientes`);
        
        // 3. Actualizar datos locales
        clients = allClients;
        usedCodes = allUsedCodes;
        localStorage.setItem('nexus_clients', JSON.stringify(clients));
        localStorage.setItem('nexus_usedCodes', JSON.stringify(usedCodes));
        
        // 4. Sincronizar de vuelta a la nube con ID único
        const userUniqueId = `user_${user.id}_${user.username}`;
        const syncData = {
            id: userUniqueId,
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
        showMessage(`¡Recuperación exitosa! Se fusionaron ${clients.length} clientes`, 'success');
        
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

// VER TODOS LOS DATOS EN LA NUBE
async function showAllCloudData() {
    try {
        const { data: allData, error } = await supabase
            .from('event_data')
            .select('*');
            
        if (error) throw error;
        
        console.log('🌐 TODOS LOS DATOS EN LA NUBE:');
        allData.forEach(record => {
            console.log(`📁 ${record.id}: ${record.clientes?.length || 0} clientes, ${record.codigos_usados?.length || 0} códigos usados`);
            if (record.clientes) {
                record.clientes.forEach(client => {
                    console.log(`   👤 ${client.nombre} - ${client.identificacion}`);
                });
            }
        });
        
    } catch (error) {
        console.error('❌ Error al cargar datos:', error);
    }
}

// Ejecuta: showAllCloudData()

// FUSIÓN COMPLETA DE TODOS LOS USUARIOS
async function mergeAllUsersData() {
    console.log('🔄 INICIANDO FUSIÓN COMPLETA DE DATOS');
    showLoading(true);
    
    try {
        // 1. Cargar TODOS los datos de la tabla
        const { data: allData, error } = await supabase
            .from('event_data')
            .select('*');
            
        if (error) throw error;
        
        console.log('📊 Registros encontrados:', allData.length);
        
        // 2. Fusionar TODOS los clientes de TODOS los registros
        let allClients = [];
        let allUsedCodes = [];
        
        allData.forEach(record => {
            console.log(`👤 Registro: ${record.id} - ${record.clientes?.length || 0} clientes`);
            
            if (record.clientes && record.clientes.length > 0) {
                allClients = mergeArraysUnique(allClients, record.clientes, 'identificacion');
            }
            if (record.codigos_usados && record.codigos_usados.length > 0) {
                allUsedCodes = [...new Set([...allUsedCodes, ...record.codigos_usados])];
            }
        });
        
        console.log(`🎯 Después de fusión: ${allClients.length} clientes únicos`);
        
        // 3. Actualizar datos locales
        clients = allClients;
        usedCodes = allUsedCodes;
        localStorage.setItem('nexus_clients', JSON.stringify(clients));
        localStorage.setItem('nexus_usedCodes', JSON.stringify(usedCodes));
        
        // 4. ACTUALIZAR TODOS LOS REGISTROS EN LA NUBE con los mismos datos
        const updatePromises = allData.map(record => {
            const updateData = {
                id: record.id,
                clientes: allClients, // Mismos datos para todos
                codigos_usados: allUsedCodes, // Mismos datos para todos
                ultima_actualizacion: new Date().toISOString()
            };
            
            return supabase
                .from('event_data')
                .upsert(updateData, { onConflict: 'id' });
        });
        
        // Esperar a que todas las actualizaciones terminen
        await Promise.all(updatePromises);
        
        // 5. Actualizar UI
        updateStats();
        renderClientsList();
        
        console.log('✅ FUSIÓN COMPLETA EXITOSA. Clientes totales:', clients.length);
        showMessage(`¡Fusión completa! ${clients.length} clientes sincronizados`, 'success');
        
    } catch (error) {
        console.error('❌ Error en fusión:', error);
        showMessage('Error en fusión de datos', 'error');
    } finally {
        showLoading(false);
    }
}

// Ejecuta esto: mergeAllUsersData()

// DIAGNÓSTICO PROFUNDO DE SINCRONIZACIÓN
async function deepSyncDiagnosis() {
    console.log('🔍 DIAGNÓSTICO PROFUNDO DE SINCRONIZACIÓN');
    
    // 1. Ver datos locales
    console.log('📱 DATOS LOCALES:');
    console.log(`   Clientes: ${clients.length}`);
    console.log(`   Códigos usados: ${usedCodes.length}`);
    console.log('   Últimos 3 clientes locales:', clients.slice(-3).map(c => `${c.nombre} - ${c.identificacion}`));
    
    // 2. Ver TODOS los datos en la nube
    const { data: allCloudData, error } = await supabase
        .from('event_data')
        .select('*');
    
    if (error) {
        console.error('❌ Error al cargar datos de nube:', error);
        return;
    }
    
    console.log('🌐 DATOS EN LA NUBE:');
    allCloudData.forEach(record => {
        console.log(`   📁 ${record.id}: ${record.clientes?.length || 0} clientes`);
        if (record.clientes && record.clientes.length > 0) {
            console.log(`      Últimos 3:`, record.clientes.slice(-3).map(c => `${c.nombre} - ${c.identificacion}`));
        }
    });
    
    // 3. Ver datos específicos de CADA usuario
    const myId = `user_${user.id}_${user.username}`;
    console.log(`🔑 MI ID: ${myId}`);
    
    const myData = allCloudData.find(r => r.id === myId);
    console.log(`📊 MIS DATOS EN NUBE: ${myData?.clientes?.length || 0} clientes`);
    
    // 4. Contar clientes ÚNICOS en toda la nube
    let allUniqueClients = [];
    allCloudData.forEach(record => {
        if (record.clientes) {
            allUniqueClients = mergeArraysUnique(allUniqueClients, record.clientes, 'identificacion');
        }
    });
    
    console.log(`🎯 CLIENTES ÚNICOS EN TODA LA NUBE: ${allUniqueClients.length}`);
    console.log('   Últimos 3 únicos:', allUniqueClients.slice(-3).map(c => `${c.nombre} - ${c.identificacion}`));
    
    // 5. Comparar con datos locales
    const localUniqueCount = clients.length;
    const cloudUniqueCount = allUniqueClients.length;
    
    console.log(`⚖️ COMPARACIÓN: Local ${localUniqueCount} vs Nube ${cloudUniqueCount}`);
    
    if (localUniqueCount !== cloudUniqueCount) {
        console.log('❌ ¡INCONSISTENCIA DETECTADA!');
        console.log('   Los datos locales no coinciden con los datos únicos de la nube');
    } else {
        console.log('✅ Los datos están consistentes');
    }
}

// Ejecuta en AMBOS: deepSyncDiagnosis()

// SOLUCIÓN RADICAL - FORZAR CONSISTENCIA
async function forceConsistency() {
    if (!confirm('⚠️ ¿ESTÁS SEGURO? Esto sobrescribirá todos los datos con la versión más completa de la nube.')) return;
    
    console.log('🔄 FORZANDO CONSISTENCIA...');
    showLoading(true);
    
    try {
        // 1. Cargar TODOS los datos de la nube
        const { data: allCloudData, error } = await supabase
            .from('event_data')
            .select('*');
        
        if (error) throw error;
        
        // 2. Encontrar el registro con MÁS clientes
        let maxClientsRecord = allCloudData[0];
        allCloudData.forEach(record => {
            if (record.clientes && record.clientes.length > (maxClientsRecord.clientes?.length || 0)) {
                maxClientsRecord = record;
            }
        });
        
        console.log(`📈 Registro con más clientes: ${maxClientsRecord.id} con ${maxClientsRecord.clientes?.length || 0} clientes`);
        
        // 3. Fusionar TODOS los clientes de TODOS los registros
        let allClients = [];
        let allUsedCodes = [];
        
        allCloudData.forEach(record => {
            if (record.clientes) {
                allClients = mergeArraysUnique(allClients, record.clientes, 'identificacion');
            }
            if (record.codigos_usados) {
                allUsedCodes = [...new Set([...allUsedCodes, ...record.codigos_usados])];
            }
        });
        
        console.log(`🎯 Después de fusión completa: ${allClients.length} clientes únicos`);
        
        // 4. ACTUALIZAR TODOS los registros con los mismos datos COMPLETOS
        const updatePromises = allCloudData.map(record => {
            const updateData = {
                id: record.id,
                clientes: allClients, // MISMO dato completo para todos
                codigos_usados: allUsedCodes, // MISMO dato completo para todos
                ultima_actualizacion: new Date().toISOString()
            };
            
            return supabase
                .from('event_data')
                .upsert(updateData, { onConflict: 'id' });
        });
        
        // Esperar a que TODAS las actualizaciones terminen
        await Promise.all(updatePromises);
        
        // 5. Actualizar datos locales
        clients = allClients;
        usedCodes = allUsedCodes;
        localStorage.setItem('nexus_clients', JSON.stringify(clients));
        localStorage.setItem('nexus_usedCodes', JSON.stringify(usedCodes));
        
        // 6. Actualizar UI
        updateStats();
        renderClientsList();
        
        console.log('✅ CONSISTENCIA FORZADA EXITOSA');
        console.log(`   Todos los registros ahora tienen: ${allClients.length} clientes`);
        showMessage(`¡Consistencia forzada! Todos tienen ${allClients.length} clientes`, 'success');
        
    } catch (error) {
        console.error('❌ Error en consistencia forzada:', error);
        showMessage('Error en consistencia forzada', 'error');
    } finally {
        showLoading(false);
    }
}

// Ejecuta en AMBOS: forceConsistency()

// DIAGNÓSTICO ESPECÍFICO DE REINGRESOS
async function diagnoseReentryProblem() {
    console.log('🔍 DIAGNÓSTICO ESPECÍFICO DE REINGRESO');
    
    // 1. Ver estado local
    console.log('📱 ESTADO LOCAL:');
    console.log(`   Códigos usados: ${usedCodes.length}`);
    console.log('   Lista:', usedCodes);
    
    // 2. Ver estado en la nube de CADA registro
    const { data: allCloudData, error } = await supabase
        .from('event_data')
        .select('*');
        
    if (error) {
        console.error('❌ Error:', error);
        return;
    }
    
    console.log('🌐 ESTADO EN LA NUBE:');
    allCloudData.forEach(record => {
        console.log(`   ${record.id}:`);
        console.log(`      Clientes: ${record.clientes?.length || 0}`);
        console.log(`      Códigos usados: ${record.codigos_usados?.length || 0}`);
        if (record.codigos_usados && record.codigos_usados.length > 0) {
            console.log(`      Lista:`, record.codigos_usados);
        }
    });
    
    // 3. Verificar si el código 001DM está en algún registro
    const targetCode = '001DM';
    console.log(`🎯 BUSCANDO CÓDIGO: ${targetCode}`);
    
    let codeFoundInCloud = false;
    allCloudData.forEach(record => {
        if (record.codigos_usados && record.codigos_usados.includes(targetCode)) {
            console.log(`   ✅ Encontrado en: ${record.id}`);
            codeFoundInCloud = true;
        }
    });
    
    if (!codeFoundInCloud) {
        console.log(`   ❌ Código ${targetCode} NO encontrado en la nube`);
    }
    
    // 4. Verificar consistencia
    const allCloudUsedCodes = [];
    allCloudData.forEach(record => {
        if (record.codigos_usados) {
            allCloudUsedCodes.push(...record.codigos_usados);
        }
    });
    
    const uniqueCloudCodes = [...new Set(allCloudUsedCodes)];
    console.log(`📊 RESUMEN NUBE: ${uniqueCloudCodes.length} códigos únicos`);
    
    // Comparar con local
    const localCodesSet = new Set(usedCodes);
    const cloudCodesSet = new Set(uniqueCloudCodes);
    
    console.log(`⚖️ COMPARACIÓN: Local ${usedCodes.length} vs Nube ${uniqueCloudCodes.length}`);
    
    // Encontrar diferencias
    const onlyInLocal = usedCodes.filter(code => !cloudCodesSet.has(code));
    const onlyInCloud = uniqueCloudCodes.filter(code => !localCodesSet.has(code));
    
    if (onlyInLocal.length > 0) {
        console.log('❌ Códigos solo en local:', onlyInLocal);
    }
    if (onlyInCloud.length > 0) {
        console.log('❌ Códigos solo en nube:', onlyInCloud);
    }
    
    if (onlyInLocal.length === 0 && onlyInCloud.length === 0) {
        console.log('✅ Los códigos están consistentes');
    }
}

// Ejecuta: diagnoseReentryProblem()

// PRUEBA CONTROLADA DE REINGRESO
async function testReentryControlled() {
    const testCode = '001DM'; // Usamos un código que sabemos que existe
    
    console.log('🧪 PRUEBA CONTROLADA DE REINGRESO');
    console.log(`🔍 Código de prueba: ${testCode}`);
    
    // 1. Estado inicial
    console.log('📊 ESTADO INICIAL:');
    console.log(`   usedCodes incluye "${testCode}":`, usedCodes.includes(testCode));
    console.log(`   Índice en array:`, usedCodes.indexOf(testCode));
    console.log(`   usedCodes completo:`, usedCodes);
    
    // 2. Verificar que el cliente existe
    const client = clients.find(c => c.identificacion === testCode);
    if (!client) {
        console.log('❌ Cliente no encontrado');
        return;
    }
    console.log(`✅ Cliente encontrado: ${client.nombre}`);
    
    // 3. Simular el proceso EXACTO de reingreso
    console.log('🔄 EJECUTANDO REINGRESO...');
    
    const index = usedCodes.indexOf(testCode);
    if (index === -1) {
        console.log('❌ Código no encontrado en usedCodes');
        return;
    }
    
    console.log(`✅ Código encontrado en índice: ${index}`);
    
    // 4. Remover LOCALMENTE
    usedCodes.splice(index, 1);
    localStorage.setItem('nexus_usedCodes', JSON.stringify(usedCodes));
    
    console.log('📱 DESPUÉS DE REMOVER LOCAL:');
    console.log(`   usedCodes incluye "${testCode}":`, usedCodes.includes(testCode));
    console.log(`   Nuevo usedCodes:`, usedCodes);
    
    // 5. Sincronizar con la nube
    console.log('☁️ SINCRONIZANDO CON NUBE...');
    await syncToCloud();
    
    // 6. Verificar estado final
    console.log('📊 ESTADO FINAL:');
    console.log(`   usedCodes incluye "${testCode}":`, usedCodes.includes(testCode));
    
    // 7. Actualizar UI
    updateStats();
    renderClientsList();
    
    console.log('🎉 PRUEBA COMPLETADA');
    
    if (!usedCodes.includes(testCode)) {
        showMessage('✅ ¡Reingreso funcionó correctamente en la prueba!', 'success');
    } else {
        showMessage('❌ El reingreso no funcionó en la prueba', 'error');
    }
}

// Ejecuta: testReentryControlled()

// PRUEBA RÁPIDA DESDE CONSOLA
async function quickReentryTest(code = '001DM') {
    console.log(`⚡ PRUEBA RÁPIDA: ${code}`);
    
    // Verificar estado inicial
    console.log(`📊 INICIAL: usedCodes incluye "${code}":`, usedCodes.includes(code));
    
    // Ejecutar reingreso
    $('#codigo-reingreso').value = code;
    await handleReentry();
    
    // Verificar estado final
    setTimeout(() => {
        console.log(`📊 FINAL: usedCodes incluye "${code}":`, usedCodes.includes(code));
    }, 2000);
}

// Ejecuta: quickReentryTest('001DM')