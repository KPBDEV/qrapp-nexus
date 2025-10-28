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

// UTILITY FUNCTIONS
function $(selector) {
    const element = document.querySelector(selector);
    if (!element) {
        console.error(`❌ Elemento no encontrado: ${selector}`);
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

// INIT
document.addEventListener('DOMContentLoaded', () => {
    console.log('📄 DOM cargado - Iniciando Nexus');
    
    document.body.style.opacity = '1';
    document.body.style.visibility = 'visible';
    
    checkAuthState();
    setupEventListeners();
    setupNavigation();
    initializeApp();
    
    console.log('✅ Nexus completamente inicializado');
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
    
    const appContainer = document.getElementById('app-container');
    if (appContainer) {
        appContainer.style.display = 'none';
        appContainer.style.visibility = 'hidden';
        appContainer.style.opacity = '0';
        appContainer.classList.add('hidden');
    }
    
    const loginScreen = document.getElementById('login-screen');
    if (loginScreen) {
        loginScreen.style.display = 'flex';
        loginScreen.style.visibility = 'visible';
        loginScreen.style.opacity = '1';
        loginScreen.classList.remove('hidden');
        
        showForm('login');
    }
    
    resetForms();
}

function showApp() {
    console.log('🔧 Mostrando aplicación...');
    
    const loginScreen = document.getElementById('login-screen');
    if (loginScreen) {
        loginScreen.style.display = 'none';
        loginScreen.style.visibility = 'hidden';
        loginScreen.style.opacity = '0';
        loginScreen.classList.add('hidden');
    }
    
    const appContainer = document.getElementById('app-container');
    if (appContainer) {
        appContainer.style.display = 'block';
        appContainer.style.visibility = 'visible';
        appContainer.style.opacity = '1';
        appContainer.classList.remove('hidden');
    }
    
    const welcomeElement = document.getElementById('user-welcome');
    if (welcomeElement && user) {
        welcomeElement.textContent = `Hola, ${user.username}`;
    }
    
    showSection('ingresar-section');
    
    setTimeout(() => {
        const navBtn = document.querySelector('[data-section="ingresar-section"]');
        if (navBtn) {
            document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
            navBtn.classList.add('active');
        }
        
        loadFromCloud();
    }, 100);
    
    console.log('✅ Aplicación mostrada correctamente');
}

// EVENT LISTENERS
function setupEventListeners() {
    // Auth Events
    $('#btn-login')?.addEventListener('click', handleLogin);
    $('#btn-logout')?.addEventListener('click', handleLogout);
    $('#btn-register')?.addEventListener('click', handleRegister);
    $('#btn-recover-password')?.addEventListener('click', handlePasswordRecovery);
    
    // Form Navigation
    $('#btn-show-register')?.addEventListener('click', () => showForm('register'));
    $('#btn-show-login')?.addEventListener('click', () => showForm('login'));
    $('#btn-olvide-password')?.addEventListener('click', () => showForm('recover'));
    $('#btn-show-login-from-recover')?.addEventListener('click', () => showForm('login'));
    
    // Client Management
    $('#client-form')?.addEventListener('submit', handleClientRegistration);
    $('#btn-verificar-manual')?.addEventListener('click', handleManualVerification);
    $('#btn-buscar')?.addEventListener('click', handleSearch);
    $('#btn-autorizar-reingreso')?.addEventListener('click', handleReentry);
    
    // Camera Controls
    $('#btn-start-camera')?.addEventListener('click', startCamera);
    $('#btn-stop-camera')?.addEventListener('click', stopCamera);
    
    // Admin Functions
    $('#btn-forzar-sincronizacion')?.addEventListener('click', forceSync);
    $('#btn-limpiar-db')?.addEventListener('click', clearDatabase);
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
        
        if (data.password_hash === btoa(password)) {
            user = { 
                id: data.id, 
                username: data.username
            };
            sessionStorage.setItem('nexus_user', JSON.stringify(user));
            
            showApp();
            
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
        const { data: existingUser } = await supabase
            .from('nexus_usuarios')
            .select('id')
            .eq('username', username)
            .single();
            
        if (existingUser) {
            showMessage('El usuario ya existe', 'error');
            return;
        }
        
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
    
    stopCamera();
    
    user = null;
    sessionStorage.removeItem('nexus_user');
    
    const appContainer = document.getElementById('app-container');
    if (appContainer) {
        appContainer.style.display = 'none';
        appContainer.style.visibility = 'hidden';
        appContainer.style.opacity = '0';
        appContainer.classList.add('hidden');
    }
    
    const loginScreen = document.getElementById('login-screen');
    if (loginScreen) {
        loginScreen.style.display = 'flex';
        loginScreen.style.visibility = 'visible';
        loginScreen.style.opacity = '1';
        loginScreen.classList.remove('hidden');
        
        showForm('login');
        resetForms();
    }
    
    console.log('✅ Sesión cerrada correctamente');
}

// SECTION MANAGEMENT
function showSection(sectionId) {
    console.log(`🔧 Mostrando sección: ${sectionId}`);
    
    const targetSection = document.getElementById(sectionId.replace('#', ''));
    if (!targetSection) {
        console.error(`❌ Sección no encontrada: ${sectionId}`);
        
        const availableSections = document.querySelectorAll('.content-section');
        if (availableSections.length > 0) {
            const firstSection = availableSections[0];
            const firstSectionId = firstSection.id;
            console.log(`🔄 Fallback: Mostrando ${firstSectionId}`);
            
            availableSections.forEach(section => {
                section.style.display = 'none';
                section.classList.remove('active');
            });
            
            firstSection.style.display = 'block';
            firstSection.classList.add('active');
        }
        return;
    }
    
    document.querySelectorAll('.content-section').forEach(section => {
        section.style.display = 'none';
        section.classList.remove('active');
    });
    
    targetSection.style.display = 'block';
    targetSection.classList.add('active');
    
    console.log(`✅ Sección ${sectionId} mostrada correctamente`);
    
    if (sectionId !== 'verificar-section') {
        stopCamera();
    }
    
    if (sectionId === 'gestionar-section') {
        updateStats();
        renderClientsList();
    }
}

function initializeApp() {
    console.log('🚀 Inicializando aplicación...');
    
    document.body.style.visibility = 'visible';
    
    if (user && user.id) {
        setTimeout(() => {
            showSection('ingresar-section');
            
            const navBtn = document.querySelector('[data-section="ingresar-section"]');
            if (navBtn) {
                document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
                navBtn.classList.add('active');
            }
            
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

// SYNC SYSTEM - CORREGIDO PARA REINGRESOS
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

async function syncToCloud() {
    if (!user) return;
    
    showSyncStatus('Sincronizando...', 'syncing');
    
    try {
        const userUniqueId = `user_${user.id}_${user.username}`;
        
        console.log(`🔑 Sincronizando: ${userUniqueId}`);
        console.log(`📱 ENVIANDO usedCodes:`, usedCodes);
        
        // Obtener datos actuales SOLO para fusión de clientes
        const { data: allCloudData, error: fetchError } = await supabase
            .from('event_data')
            .select('*');
            
        if (fetchError && fetchError.code !== 'PGRST116') {
            throw fetchError;
        }
        
        // Fusionar SOLO clientes (no usedCodes)
        let mergedClients = [...clients];
        
        if (allCloudData && allCloudData.length > 0) {
            allCloudData.forEach(record => {
                if (record.clientes) {
                    mergedClients = mergeArraysUnique(mergedClients, record.clientes, 'identificacion');
                }
            });
        }
        
        // PREPARAR datos para guardar - usedCodes LOCAL se convierte en la VERDAD
        const syncData = {
            id: userUniqueId,
            clientes: mergedClients,
            codigos_usados: usedCodes, // ✅ ESTOS usedCodes se imponen a todos
            ultima_actualizacion: new Date().toISOString()
        };
        
        // GUARDAR - esto SOBRESCRIBIRÁ usedCodes para todos los usuarios
        const { error } = await supabase
            .from('event_data')
            .upsert(syncData, { 
                onConflict: 'id'
            });
            
        if (error) throw error;
        
        // Actualizar localmente
        clients = mergedClients;
        localStorage.setItem('nexus_clients', JSON.stringify(clients));
        
        showSyncStatus('Sincronizado ✓', 'success');
        setTimeout(() => hideSyncStatus(), 2000);
        
        console.log(`✅ Sincronización exitosa. usedCodes propagados:`, usedCodes);
        
    } catch (error) {
        console.error('❌ Sync error:', error);
        showSyncStatus('Error de sincronización', 'error');
        setTimeout(() => hideSyncStatus(), 3000);
    }
}

async function loadFromCloud() {
    if (!user) return;
    
    try {
        console.log('🔍 Cargando datos de la nube...');
        
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
        
        // Encontrar los usedCodes MÁS RECIENTES
        let latestUsedCodes = usedCodes;
        let latestTimestamp = 0;
        let mergedClients = [...clients];
        
        allCloudData.forEach(record => {
            // Fusionar clientes
            if (record.clientes) {
                mergedClients = mergeArraysUnique(mergedClients, record.clientes, 'identificacion');
            }
            
            // Encontrar usedCodes más recientes
            if (record.ultima_actualizacion) {
                const recordTime = new Date(record.ultima_actualizacion).getTime();
                if (recordTime > latestTimestamp && record.codigos_usados) {
                    latestTimestamp = recordTime;
                    latestUsedCodes = record.codigos_usados;
                }
            }
        });
        
        console.log(`🔄 UsedCodes más recientes:`, latestUsedCodes);
        
        // ACTUALIZAR con los datos más recientes
        clients = mergedClients;
        usedCodes = latestUsedCodes;
        localStorage.setItem('nexus_clients', JSON.stringify(clients));
        localStorage.setItem('nexus_usedCodes', JSON.stringify(usedCodes));
        
        updateStats();
        
        console.log(`✅ Carga exitosa. UsedCodes actualizados:`, usedCodes);
        
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
    
    showSection('ingresar-section');
    
    document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
    document.querySelector('[data-section="ingresar-section"]').classList.add('active');
    
    generateQR(identification);
    
    $('#qr-message').textContent = `QR de: ${clientName} (${identification})`;
    $('#qr-message').className = 'qr-message success';
    
    showMessage(`QR mostrado para: ${clientName}`, 'success');
}

// REENTRY FUNCTIONALITY - CORREGIDO
async function authorizeReentry(code) {
    $('#codigo-reingreso').value = code;
    await handleReentry();
}

async function handleReentry() {
    const code = $('#codigo-reingreso').value.trim();
    if (!code) {
        showMessage('Ingresa un código para autorizar reingreso', 'error');
        return;
    }
    
    console.log(`🔄 INICIANDO REINGRESO PARA: ${code}`);
    
    const clientExists = clients.some(client => client.identificacion === code);
    if (!clientExists) {
        showMessage('❌ Código no encontrado en clientes registrados', 'error');
        return;
    }
    
    const currentIndex = usedCodes.indexOf(code);
    console.log(`📊 Verificación: usedCodes incluye "${code}": ${currentIndex !== -1}`);
    
    if (currentIndex === -1) {
        showMessage('❌ Este código no está marcado como usado', 'error');
        return;
    }
    
    showLoading(true);
    showSyncStatus('Autorizando reingreso...', 'syncing');
    
    try {
        console.log('🔍 ANTES DE REINGRESO:');
        console.log(`   usedCodes:`, usedCodes);
        console.log(`   Índice de ${code}:`, currentIndex);
        
        // Remover localmente
        usedCodes.splice(currentIndex, 1);
        localStorage.setItem('nexus_usedCodes', JSON.stringify(usedCodes));
        
        console.log('✅ DESPUÉS DE REMOVER LOCAL:');
        console.log(`   usedCodes:`, usedCodes);
        console.log(`   usedCodes incluye "${code}":`, usedCodes.includes(code));
        
        // Sincronizar INMEDIATAMENTE con la nube
        console.log('☁️ Sincronizando con nube...');
        await syncToCloud();
        
        // Verificación final
        const finalCheck = usedCodes.includes(code);
        console.log(`🎯 VERIFICACIÓN FINAL: usedCodes incluye "${code}": ${finalCheck}`);
        
        if (finalCheck) {
            console.error('❌ El código sigue en usedCodes');
            throw new Error('El reingreso no se completó correctamente');
        }
        
        // Actualizar UI
        updateStats();
        renderClientsList();
        
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
        await loadFromCloud();
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

async function forceConsistency() {
    const { data: allData } = await supabase.from('event_data').select('*');
    const updatePromises = allData.map(record => {
        return supabase.from('event_data').update({
            codigos_usados: usedCodes, // Tus usedCodes actuales
            ultima_actualizacion: new Date().toISOString()
        }).eq('id', record.id);
    });
    await Promise.all(updatePromises);
    console.log('✅ Todos los usuarios actualizados con usedCodes consistentes');
}
forceConsistency();

async function clearDatabase() {
    if (!confirm('¿ESTÁS SEGURO? Esto borrará TODOS los datos locales y de la nube.')) {
        return;
    }
    
    if (!confirm('¿REALMENTE SEGURO? Esta acción no se puede deshacer.')) {
        return;
    }
    
    showLoading(true);
    
    try {
        const syncData = {
            id: 'main',
            clientes: [],
            codigos_usados: [],
            ultima_actualizacion: new Date().toISOString()
        };
        
        await supabase.from('event_data').upsert(syncData);
        
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

// FUNCIONES GLOBALES
window.showQRForClient = showQRForClient;
window.authorizeReentry = authorizeReentry;

// FUNCIÓN DE EMERGENCIA PARA SOLUCIONAR REINGRESOS
async function fixReentrySync() {
    console.log('🛠️ SOLUCIONANDO PROBLEMA DE REINGRESOS...');
    showLoading(true);
    
    try {
        // 1. Sincronizar datos actuales
        await syncToCloud();
        
        // 2. Forzar que todos los usuarios tengan los mismos datos
        const { data: allCloudData } = await supabase
            .from('event_data')
            .select('*');
            
        if (allCloudData) {
            const updatePromises = allCloudData.map(record => {
                return supabase
                    .from('event_data')
                    .update({
                        clientes: clients,
                        codigos_usados: usedCodes,
                        ultima_actualizacion: new Date().toISOString()
                    })
                    .eq('id', record.id);
            });
            
            await Promise.all(updatePromises);
        }
        
        showMessage('✅ Problema de reingresos solucionado', 'success');
        console.log('🎯 Todos los usuarios ahora tienen datos consistentes');
        
    } catch (error) {
        console.error('❌ Error al solucionar reingresos:', error);
        showMessage('Error al solucionar problema', 'error');
    } finally {
        showLoading(false);
    }
}

window.fixReentrySync = fixReentrySync;