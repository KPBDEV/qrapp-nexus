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

// INIT
document.addEventListener('DOMContentLoaded', () => {
    console.log('📄 DOM cargado - Iniciando Nexus');
    
    // Asegurar que el body sea visible
    document.body.style.opacity = '1';
    document.body.style.visibility = 'visible';
    
    checkAuthState();
    setupEventListeners();
    setupNavigation();
    initializeApp(); // ← Agregar esta línea
    
    console.log('✅ Nexus completamente inicializado');
});

// AUTH MANAGEMENT
function checkAuthState() {
    if (user && user.id) {
        showApp();
    } else {
        showLogin();
    }
}

function showLogin() {
    setDisplay('#login-screen', 'flex');
    setDisplay('#app-container', 'none');
    resetForms();
}

function showApp() {
    console.log('🔧 Mostrando aplicación...'); // Debug
    
    setDisplay('#login-screen', 'none');
    setDisplay('#app-container', 'block');
    
    // Asegurar que el contenido sea visible
    $('#app-container').style.opacity = '1';
    $('#app-container').style.visibility = 'visible';
    
    // Actualizar bienvenida
    if ($('#user-welcome')) {
        $('#user-welcome').textContent = `Hola, ${user.username}`;
    }
    
    // Forzar mostrar la sección activa
    showSection('ingresar-section');
    
    // Activar el botón de navegación correspondiente
    const navBtn = document.querySelector('[data-section="ingresar-section"]');
    if (navBtn) {
        document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
        navBtn.classList.add('active');
    }
    
    // Cargar datos y actualizar UI
    setTimeout(() => {
        loadFromCloud();
        updateStats();
        renderClientsList();
    }, 100);
    
    console.log('✅ Aplicación mostrada correctamente'); // Debug
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

function setupNavigation() {
    const navButtons = document.querySelectorAll('.nav-btn');
    navButtons.forEach(btn => {
        btn.onclick = () => {
            const section = btn.getAttribute('data-section');
            showSection(section);
            
            navButtons.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
        };
    });
}

// AUTH FUNCTIONS - ADAPTADO A TU ESTRUCTURA
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
        
        // Verificar contraseña - usando la estructura de tu tabla
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
        
        // Create new user - adaptado a tu estructura
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
    stopCamera();
    user = null;
    sessionStorage.removeItem('nexus_user');
    showLogin();
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

// SYNC SYSTEM - ADAPTADO A TU ESTRUCTURA DE event_data
async function syncToCloud() {
    if (!user) return;
    
    showSyncStatus('Sincronizando...', 'syncing');
    
    try {
        // Usar la estructura EXACTA de tu tabla event_data
        const syncData = {
            id: 'main', // Usamos 'main' como ID fijo según tu estructura
            clientes: clients,
            codigos_usados: usedCodes,
            ultima_actualizacion: new Date().toISOString()
            // No incluimos created_at porque ya existe en tu tabla
        };
        
        const { error } = await supabase
            .from('event_data')
            .upsert(syncData, { 
                onConflict: 'id'
            });
            
        if (error) throw error;
        
        showSyncStatus('Sincronizado ✓', 'success');
        setTimeout(() => hideSyncStatus(), 2000);
        
    } catch (error) {
        console.error('Sync error:', error);
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
            .eq('id', 'main') // Buscar por ID 'main' según tu estructura
            .single();
            
        if (error) {
            if (error.code === 'PGRST116') {
                // No hay datos, es normal para el primer uso
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
function showSection(sectionId) {
    console.log(`🔧 Mostrando sección: ${sectionId}`); // Debug
    
    // Ocultar todas las secciones
    document.querySelectorAll('.content-section').forEach(section => {
        section.style.display = 'none';
        section.classList.remove('active');
    });
    
    // Mostrar la sección seleccionada
    const targetSection = $(sectionId);
    if (targetSection) {
        targetSection.style.display = 'block';
        targetSection.classList.add('active');
        
        // Forzar reflow para asegurar la animación
        targetSection.offsetHeight;
        
        console.log(`✅ Sección ${sectionId} mostrada`); // Debug
    } else {
        console.error(`❌ Sección no encontrada: ${sectionId}`);
    }
    
    // Detener cámara si no estamos en verificar
    if (sectionId !== 'verificar-section') {
        stopCamera();
    }
    
    // Actualizar UI específica de cada sección
    if (sectionId === 'gestionar-section') {
        updateStats();
        renderClientsList();
    }
}

function showForm(formType) {
    ['login-form', 'register-form', 'recover-form'].forEach(form => {
        $(form).classList.add('hidden');
    });
    
    $(`${formType}-form`).classList.remove('hidden');
    $('#login-message').classList.add('hidden');
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
function $(selector) {
    return document.querySelector(selector);
}

function setDisplay(selector, display) {
    $(selector).style.display = display;
}

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
    await syncToCloud();
    await loadFromCloud();
    showMessage('Sincronización forzada completada', 'success');
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
}, 30000); // Sync every 30 seconds

function debugAppState() {
    console.log('🔍 DEBUG - Estado de la aplicación:');
    console.log('Usuario:', user);
    console.log('App Container display:', $('#app-container').style.display);
    console.log('Login Screen display:', $('#login-screen').style.display);
    console.log('Secciones activas:', document.querySelectorAll('.content-section.active').length);
    console.log('Body visible:', document.body.style.visibility);
    
    // Verificar elementos críticos
    const criticalElements = [
        '#app-container',
        '#ingresar-section', 
        '.main-content',
        '.bottom-nav'
    ];
    
    criticalElements.forEach(selector => {
        const el = $(selector);
        console.log(`${selector}:`, el ? 'ENCONTRADO' : 'NO ENCONTRADO');
        if (el) {
            console.log(`  - display: ${el.style.display}`);
            console.log(`  - visibility: ${el.style.visibility}`);
            console.log(`  - opacity: ${el.style.opacity}`);
        }
    });
}