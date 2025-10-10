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
    checkAuthState();
    setupEventListeners();
    setupNavigation();
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
    setDisplay('#login-screen', 'none');
    setDisplay('#app-container', 'block');
    $('#user-welcome').textContent = `Hola, ${user.username}`;
    loadFromCloud();
    // No llamar showSection aquí - ya se llama desde setupNavigation
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
    const navButtons = document.querySelectorAll('.nav-btn');
    navButtons.forEach(btn => {
        btn.onclick = () => {
            const section = btn.getAttribute('data-section');
            showSection(section);
            
            // Update active state
            navButtons.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
        };
    });
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
        
        if (!data) {
            showMessage('Usuario no encontrado', 'error');
            return;
        }
        
        // Simple password verification
        if (data.password_hash === btoa(password)) {
            user = { 
                id: data.id, 
                username: data.username,
                lastLogin: new Date().toISOString()
            };
            sessionStorage.setItem('nexus_user', JSON.stringify(user));
            showApp();
            showMessage(`Bienvenido ${data.username}`, 'success');
        } else {
            showMessage('Contraseña incorrecta', 'error');
        }
    } catch (error) {
        console.error('Login error:', error);
        showMessage('Error al iniciar sesión: ' + error.message, 'error');
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
    
    // CÓDIGO ORGANIZADOR CORREGIDO
    if (organizerCode !== 'NEXUS.082208') {
        showMessage('Código organizador inválido', 'error');
        return;
    }
    
    showLoading(true);
    
    try {
        // Check if username exists
        const { data: existingUser, error: checkError } = await supabase
            .from('nexus_usuarios')
            .select('id')
            .eq('username', username)
            .single();
            
        if (checkError && checkError.code !== 'PGRST116') {
            throw checkError;
        }
        
        if (existingUser) {
            showMessage('El usuario ya existe', 'error');
            return;
        }
        
        // Create new user
        const { data: newUser, error: insertError } = await supabase
            .from('nexus_usuarios')
            .insert([{
                username: username,
                password_hash: btoa(password),
                created_at: new Date().toISOString()
            }])
            .select()
            .single();
            
        if (insertError) throw insertError;
        
        showMessage('Cuenta creada exitosamente', 'success');
        showForm('login');
        $('#register-form').reset();
        
    } catch (error) {
        console.error('Register error:', error);
        showMessage('Error al crear la cuenta: ' + error.message, 'error');
    } finally {
        showLoading(false);
    }
}

function handleLogout() {
    stopCamera();
    user = null;
    sessionStorage.removeItem('nexus_user');
    clients = [];
    usedCodes = [];
    localStorage.removeItem('nexus_clients');
    localStorage.removeItem('nexus_usedCodes');
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
    
    // Check if ID already exists
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
            video: { 
                facingMode: "environment",
                width: { ideal: 1280 },
                height: { ideal: 720 }
            } 
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
        showMessage('No se pudo acceder a la cámara: ' + error.message, 'error');
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

// SYNC SYSTEM - CORREGIDO
async function syncToCloud() {
    if (!user) return;
    
    showSyncStatus('Sincronizando...', 'syncing');
    
    try {
        // Usar la estructura correcta que existe en Supabase
        const { error } = await supabase
            .from('event_data')
            .upsert({
                id: user.id,
                clientes: clients,
                codigos_usados: usedCodes,
                updated: new Date().toISOString(), // Usar 'updated' en lugar de 'updated_at'
                usuario: user.username
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
            .eq('id', user.id)
            .single();
            
        if (error) {
            if (error.code === 'PGRST116') {
                // No hay datos para este usuario, es normal
                console.log('No hay datos en la nube para este usuario');
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
        showMessage('Error al cargar datos: ' + error.message, 'error');
    }
}

// UI FUNCTIONS - CORREGIDAS
function showSection(sectionId) {
    // Verificar que el elemento existe
    const sectionElement = $(sectionId);
    if (!sectionElement) {
        console.error('Sección no encontrada:', sectionId);
        return;
    }
    
    // Hide all sections
    const allSections = document.querySelectorAll('.content-section');
    allSections.forEach(section => {
        if (section) {
            section.classList.remove('active');
        }
    });
    
    // Show target section
    sectionElement.classList.add('active');
    
    // Stop camera if not in verification section
    if (sectionId !== 'verificar-section') {
        stopCamera();
    }
    
    // Update stats when showing management section
    if (sectionId === 'gestionar-section') {
        updateStats();
        renderClientsList();
    }
}

function showForm(formType) {
    const forms = ['login-form', 'register-form', 'recover-form'];
    forms.forEach(form => {
        const formElement = $(form);
        if (formElement) {
            formElement.classList.add('hidden');
        }
    });
    
    const targetForm = $(`${formType}-form`);
    if (targetForm) {
        targetForm.classList.remove('hidden');
    }
    
    const messageElement = $('#login-message');
    if (messageElement) {
        messageElement.classList.add('hidden');
    }
}

function updateStats() {
    const registrados = $('#total-registrados');
    const ingresaron = $('#total-ingresaron');
    const pendientes = $('#total-pendientes');
    
    if (registrados) registrados.textContent = clients.length;
    if (ingresaron) ingresaron.textContent = usedCodes.length;
    if (pendientes) pendientes.textContent = clients.length - usedCodes.length;
}

function showSyncStatus(message, type) {
    const status = $('#sync-status');
    if (status) {
        status.textContent = message;
        status.className = `sync-status ${type}`;
        status.classList.remove('hidden');
    }
}

function hideSyncStatus() {
    const status = $('#sync-status');
    if (status) {
        status.classList.add('hidden');
    }
}

function showMessage(message, type) {
    const messageEl = $('#login-message');
    if (messageEl) {
        messageEl.textContent = message;
        messageEl.className = `message ${type}`;
        messageEl.classList.remove('hidden');
        
        setTimeout(() => {
            messageEl.classList.add('hidden');
        }, 5000);
    }
}

function showLoading(show) {
    // Implement loading indicator if needed
    const buttons = document.querySelectorAll('button');
    buttons.forEach(btn => {
        if (show) {
            btn.disabled = true;
            btn.classList.add('loading');
        } else {
            btn.disabled = false;
            btn.classList.remove('loading');
        }
    });
}

// UTILITY FUNCTIONS - CORREGIDAS
function $(selector) {
    const element = document.querySelector(selector);
    if (!element) {
        console.warn('Elemento no encontrado:', selector);
    }
    return element;
}

function setDisplay(selector, display) {
    const element = $(selector);
    if (element) {
        element.style.display = display;
    }
}

function generateId() {
    return Date.now() + Math.random().toString(36).substr(2, 9);
}

function resetForms() {
    document.querySelectorAll('form').forEach(form => {
        if (form) form.reset();
    });
    
    const qrcode = $('#qrcode');
    if (qrcode) qrcode.innerHTML = '';
    
    const qrMessage = $('#qr-message');
    if (qrMessage) {
        qrMessage.textContent = 'El código QR aparecerá aquí después del registro';
        qrMessage.className = 'qr-message';
    }
}

// MANUAL VERIFICATION
function handleManualVerification() {
    const code = $('#codigo-manual')?.value.trim();
    if (code) {
        verifyCode(code);
        const input = $('#codigo-manual');
        if (input) input.value = '';
    } else {
        showMessage('Ingresa un código para verificar', 'error');
    }
}

// SEARCH FUNCTIONALITY
function handleSearch() {
    const query = $('#buscar-cliente')?.value.trim().toLowerCase() || '';
    renderClientsList(query);
}

function renderClientsList(query = '') {
    const container = $('#lista-clientes');
    if (!container) return;
    
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
    const code = $('#codigo-reingreso')?.value.trim();
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
        const input = $('#codigo-reingreso');
        if (input) input.value = '';
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
        // Clear cloud data
        const { error } = await supabase
            .from('event_data')
            .delete()
            .eq('id', user.id);
            
        if (error) throw error;
        
        // Clear local data
        clients = [];
        usedCodes = [];
        localStorage.removeItem('nexus_clients');
        localStorage.removeItem('nexus_usedCodes');
        
        // Clear UI
        const qrcode = $('#qrcode');
        if (qrcode) qrcode.innerHTML = '';
        
        const qrMessage = $('#qr-message');
        if (qrMessage) {
            qrMessage.textContent = 'El código QR aparecerá aquí después del registro';
            qrMessage.className = 'qr-message';
        }
        
        await syncToCloud();
        updateStats();
        renderClientsList();
        
        showMessage('Base de datos limpiada exitosamente', 'success');
        
    } catch (error) {
        console.error('Clear DB error:', error);
        showMessage('Error al limpiar la base de datos: ' + error.message, 'error');
    } finally {
        showLoading(false);
    }
}

// PASSWORD RECOVERY
async function handlePasswordRecovery() {
    const username = $('#recover-username')?.value.trim() || '';
    const organizerCode = $('#recover-organizer-code')?.value.trim() || '';
    const newPassword = $('#new-password')?.value.trim() || '';
    const confirmPassword = $('#confirm-password')?.value.trim() || '';
    
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
    
    // CÓDIGO ORGANIZADOR CORREGIDO
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
        const recoverForm = $('#recover-form');
        if (recoverForm) recoverForm.reset();
        
    } catch (error) {
        console.error('Password recovery error:', error);
        showMessage('Error al recuperar contraseña: ' + error.message, 'error');
    } finally {
        showLoading(false);
    }
}

// OFFLINE SUPPORT & SYNC
window.addEventListener('online', () => {
    console.log('Online - Syncing data...');
    syncToCloud();
});

window.addEventListener('offline', () => {
    console.log('Offline - Working locally');
    showMessage('Modo offline activado', 'warning');
});

// PERIODIC SYNC - SOLO SI ESTÁ LOGUEADO
setInterval(() => {
    if (user && navigator.onLine) {
        syncToCloud();
    }
}, 30000); // Sync every 30 seconds