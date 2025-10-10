// CONFIGURACIÓN
const SUPABASE_URL = 'https://zefsmzxlhgfvmdydutzp.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InplZnNtenhsaGdmdm1keWR1dHpwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk5ODE1NDIsImV4cCI6MjA3NTU1NzU0Mn0.nm7syRkN1ZBnJ5QLk4QStITuUB1cjHZjNfrPA99CpdI';
const ORGANIZER_CODE = "NEXUS.082208";

// INICIALIZACIÓN
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
let usuarioActual = JSON.parse(sessionStorage.getItem('nexus_usuario_actual')) || null;
let clientes = JSON.parse(localStorage.getItem('clientes')) || [];
let codigosUsados = JSON.parse(localStorage.getItem('codigosUsados')) || [];
let stream = null, scanning = false;

// ELEMENTOS DEL DOM
const elements = {
    // Pantallas
    'login-screen': () => document.getElementById('login-screen'),
    'app-container': () => document.getElementById('app-container'),
    
    // Forms
    'login-form': () => document.getElementById('login-form'),
    'register-form': () => document.getElementById('register-form'),
    'recover-form': () => document.getElementById('recover-form'),
    
    // Inputs login
    'login-username': () => document.getElementById('login-username'),
    'login-password': () => document.getElementById('login-password'),
    'register-username': () => document.getElementById('register-username'),
    'register-password': () => document.getElementById('register-password'),
    'organizer-code': () => document.getElementById('organizer-code'),
    
    // Inputs app
    'nombre': () => document.getElementById('nombre'),
    'identificacion': () => document.getElementById('identificacion'),
    'telefono': () => document.getElementById('telefono'),
    'codigo-manual': () => document.getElementById('codigo-manual'),
    'codigo-reingreso': () => document.getElementById('codigo-reingreso'),
    'buscar-cliente': () => document.getElementById('buscar-cliente'),
    
    // Botones
    'btn-login': () => document.getElementById('btn-login'),
    'btn-register': () => document.getElementById('btn-register'),
    'btn-show-register': () => document.getElementById('btn-show-register'),
    'btn-show-login': () => document.getElementById('btn-show-login'),
    'btn-olvide-password': () => document.getElementById('btn-olvide-password'),
    'btn-show-login-from-recover': () => document.getElementById('btn-show-login-from-recover'),
    'btn-recover-password': () => document.getElementById('btn-recover-password'),
    'btn-logout': () => document.getElementById('btn-logout'),
    
    // Navegación
    'btn-ingresar': () => document.getElementById('btn-ingresar'),
    'btn-verificar': () => document.getElementById('btn-verificar'),
    'btn-gestionar': () => document.getElementById('btn-gestionar'),
    
    // Cámara
    'btn-start-camera': () => document.getElementById('btn-start-camera'),
    'btn-stop-camera': () => document.getElementById('btn-stop-camera'),
    'btn-verificar-manual': () => document.getElementById('btn-verificar-manual'),
    
    // Gestión
    'btn-buscar': () => document.getElementById('btn-buscar'),
    'btn-autorizar-reingreso': () => document.getElementById('btn-autorizar-reingreso'),
    'btn-forzar-sincronizacion': () => document.getElementById('btn-forzar-sincronizacion'),
    'btn-sincronizacion-forzada': () => document.getElementById('btn-sincronizacion-forzada'),
    'btn-limpiar-db': () => document.getElementById('btn-limpiar-db'),
    
    // Display
    'user-welcome': () => document.getElementById('user-welcome'),
    'login-message': () => document.getElementById('login-message'),
    'qr-message': () => document.getElementById('qr-message'),
    'qrcode': () => document.getElementById('qrcode'),
    'verification-result': () => document.getElementById('verification-result'),
    'result-title': () => document.getElementById('result-title'),
    'result-message': () => document.getElementById('result-message'),
    'client-details': () => document.getElementById('client-details'),
    'total-registrados': () => document.getElementById('total-registrados'),
    'total-ingresaron': () => document.getElementById('total-ingresaron'),
    'total-pendientes': () => document.getElementById('total-pendientes'),
    'lista-clientes': () => document.getElementById('lista-clientes'),
    'sync-status': () => document.getElementById('sync-status'),
    
    // Cámara
    'video': () => document.getElementById('video'),
    'canvas': () => document.getElementById('canvas'),
    'camera-placeholder': () => document.getElementById('camera-placeholder'),
    
    // Secciones
    'ingresar-section': () => document.getElementById('ingresar-section'),
    'verificar-section': () => document.getElementById('verificar-section'),
    'gestionar-section': () => document.getElementById('gestionar-section')
};

// FUNCIONES UTILITARIAS
const $ = (id) => elements[id] ? elements[id]() : null;
const show = (el) => el && el.classList.remove('hidden');
const hide = (el) => el && el.classList.add('hidden');
const toggle = (el) => el && el.classList.toggle('hidden');
const value = (id) => $(id) ? $(id).value.trim() : '';
const setValue = (id, val) => { if ($(id)) $(id).value = val; };
const setText = (id, text) => { if ($(id)) $(id).textContent = text; };
const setHTML = (id, html) => { if ($(id)) $(id).innerHTML = html; };

// INICIALIZACIÓN
document.addEventListener('DOMContentLoaded', () => {
    setupEventListeners();
    checkAuthStatus();
});

// AUTENTICACIÓN
function hashPassword(p) { return btoa(unescape(encodeURIComponent(p))); }

async function handleLogin() {
    const username = value('login-username'), password = value('login-password');
    if (!username || !password) return showMessage('Completa todos los campos', 'error');

    showMessage('Verificando...', 'info');
    const { data, error } = await supabase.from('nexus_usuarios').select('*').eq('username', username).single();
    
    if (error) return showMessage('Usuario no encontrado', 'error');
    if (data.password_hash === hashPassword(password)) {
        usuarioActual = { id: data.id, username: data.username };
        sessionStorage.setItem('nexus_usuario_actual', JSON.stringify(usuarioActual));
        showApp();
        showMessage('¡Bienvenido!', 'success');
    } else {
        showMessage('Contraseña incorrecta', 'error');
    }
}

async function handleRegister() {
    const username = value('register-username'), password = value('register-password'), code = value('organizer-code');
    if (!username || !password || !code) return showMessage('Completa todos los campos', 'error');
    if (password.length < 6) return showMessage('Contraseña muy corta', 'error');
    if (code !== ORGANIZER_CODE) return showMessage('Código incorrecto', 'error');

    showMessage('Creando cuenta...', 'info');
    const { data: existing } = await supabase.from('nexus_usuarios').select('username').eq('username', username);
    if (existing?.length > 0) return showMessage('Usuario ya existe', 'error');

    const { error } = await supabase.from('nexus_usuarios').insert([{ username, password_hash: hashPassword(password) }]);
    if (error) return showMessage('Error creando cuenta', 'error');

    showMessage('¡Cuenta creada! Ya puedes iniciar sesión', 'success');
    setTimeout(() => { showForm('login-form'); clearForm('register-form'); setValue('login-username', username); }, 2000);
}

// GESTIÓN DE CLIENTES
async function handleClientFormSubmit(e) {
    e.preventDefault();
    const nombre = value('nombre'), identificacion = value('identificacion'), telefono = value('telefono');
    if (!nombre || !identificacion || !telefono) return alert('Complete todos los campos');

    const existente = clientes.find(c => c.identificacion === identificacion);
    if (existente) {
        if (codigosUsados.includes(identificacion)) return alert('⚠️ Esta identificación ya fue usada');
        if (!confirm('Cliente ya existe. ¿Regenerar QR?')) return;
    }

    const nuevoCliente = { 
        id: Date.now(), 
        nombre, 
        identificacion, 
        telefono, 
        fechaRegistro: new Date().toISOString()
    };
    
    clientes.push(nuevoCliente);
    localStorage.setItem('clientes', JSON.stringify(clientes));
    
    generarQR(identificacion);
    setText('qr-message', `QR para: ${nombre}`);
    e.target.reset();
    await sincronizarDatos();
}

function generarQR(id) {
    const qrContainer = $('qrcode');
    qrContainer.innerHTML = '';
    
    try {
        const qr = qrcode(0, 'L');
        qr.addData(id);
        qr.make();
        
        const canvas = document.createElement('canvas');
        const size = 250;
        const cellSize = size / qr.getModuleCount();
        canvas.width = canvas.height = size;
        
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, size, size);
        ctx.fillStyle = '#000000';
        
        for (let row = 0; row < qr.getModuleCount(); row++) {
            for (let col = 0; col < qr.getModuleCount(); col++) {
                if (qr.isDark(row, col)) {
                    ctx.fillRect(col * cellSize, row * cellSize, cellSize, cellSize);
                }
            }
        }
        
        qrContainer.appendChild(canvas);
    } catch (error) {
        qrContainer.innerHTML = '<p style="color: #ef4444; text-align: center;">Error generando QR</p>';
    }
}

// CÁMARA Y VERIFICACIÓN
async function startCamera() {
    try {
        stopCamera();
        stream = await navigator.mediaDevices.getUserMedia({ 
            video: { 
                facingMode: "environment",
                width: { ideal: 1280 },
                height: { ideal: 720 }
            } 
        });
        
        const video = $('video');
        video.srcObject = stream;
        show(video);
        hide($('camera-placeholder'));
        hide($('btn-start-camera'));
        show($('btn-stop-camera'));
        
        video.onloadedmetadata = () => {
            video.play();
            startQRScanning();
        };
    } catch (err) {
        setHTML('camera-placeholder', `❌ Error: ${err.message}`);
    }
}

function stopCamera() {
    if (stream) {
        stream.getTracks().forEach(track => track.stop());
        stream = null;
    }
    scanning = false;
    
    hide($('video'));
    show($('camera-placeholder'));
    show($('btn-start-camera'));
    hide($('btn-stop-camera'));
}

function startQRScanning() {
    scanning = true;
    scanQRCode();
}

function scanQRCode() {
    if (!scanning || !stream) return;
    
    const video = $('video'), canvas = $('canvas');
    if (video.readyState === video.HAVE_ENOUGH_DATA) {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        
        try {
            const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            const code = jsQR(imageData.data, imageData.width, imageData.height, {
                inversionAttempts: "dontInvert",
            });
            
            if (code) {
                verificarCodigo(code.data);
                stopCamera();
                return;
            }
        } catch (e) {}
    }
    
    if (scanning) requestAnimationFrame(scanQRCode);
}

async function verificarCodigo(codigo) {
    const result = $('verification-result');
    
    if (codigosUsados.includes(codigo)) {
        result.className = 'result-card error';
        setText('result-title', '❌ CÓDIGO YA USADO');
        setText('result-message', 'Este código ya fue utilizado para ingresar');
        setHTML('client-details', '<p>Acceso denegado - Código de un solo uso</p>');
    } else {
        const cliente = clientes.find(c => c.identificacion === codigo);
        if (cliente) {
            codigosUsados.push(codigo);
            cliente.usado = true;
            cliente.fechaUso = new Date().toISOString();
            localStorage.setItem('codigosUsados', JSON.stringify(codigosUsados));
            localStorage.setItem('clientes', JSON.stringify(clientes));
            
            result.className = 'result-card success';
            setText('result-title', '✅ ACCESO AUTORIZADO');
            setText('result-message', 'Bienvenido/a al evento');
            setHTML('client-details', `
                <p><strong>Nombre:</strong> ${cliente.nombre}</p>
                <p><strong>ID:</strong> ${cliente.identificacion}</p>
                <p><strong>Teléfono:</strong> ${cliente.telefono}</p>
                <p><strong>Hora de ingreso:</strong> ${new Date().toLocaleTimeString()}</p>
                <p><em>⚠️ Este código ya no podrá ser reutilizado</em></p>
            `);
        } else {
            result.className = 'result-card error';
            setText('result-title', '❌ CÓDIGO INVÁLIDO');
            setText('result-message', 'El código no está registrado');
            setHTML('client-details', '');
        }
    }
    
    show(result);
    setValue('codigo-manual', '');
    setTimeout(() => hide(result), 8000);
    await sincronizarDatos();
}

// GESTIÓN
function actualizarEstadisticas() {
    const total = clientes.length;
    const usados = codigosUsados.length;
    const pendientes = total - usados;
    
    setText('total-registrados', total);
    setText('total-ingresaron', usados);
    setText('total-pendientes', pendientes);
}

function cargarListaClientes(filtro = '') {
    const lista = $('lista-clientes');
    let clientesFiltrados = clientes;
    
    if (filtro) {
        const f = filtro.toLowerCase();
        clientesFiltrados = clientes.filter(c => 
            c.nombre.toLowerCase().includes(f) || c.identificacion.includes(f)
        );
    }
    
    if (clientesFiltrados.length === 0) {
        lista.innerHTML = '<div class="empty-state">No se encontraron clientes</div>';
        return;
    }
    
    lista.innerHTML = clientesFiltrados.map(cliente => {
        const usado = codigosUsados.includes(cliente.identificacion);
        return `
            <div class="client-item ${usado ? 'used' : ''}">
                <div class="client-info">
                    <h4>${cliente.nombre}</h4>
                    <p><strong>ID:</strong> ${cliente.identificacion}</p>
                    <p><strong>Teléfono:</strong> ${cliente.telefono}</p>
                    <p><strong>Registro:</strong> ${new Date(cliente.fechaRegistro).toLocaleString()}</p>
                    ${usado ? `<p><strong>Último ingreso:</strong> ${cliente.fechaUso ? new Date(cliente.fechaUso).toLocaleString() : 'No registrada'}</p>` : ''}
                </div>
                <div class="client-actions">
                    <span class="status-badge ${usado ? 'used' : ''}">
                        ${usado ? '✅ YA INGRESÓ' : '⏳ PENDIENTE'}
                    </span>
                    ${usado ? `<button onclick="autorizarReingresoCliente('${cliente.identificacion}')" class="btn warning small">Permitir Reingreso</button>` : ''}
                </div>
            </div>
        `;
    }).join('');
}

async function autorizarReingresoCliente(id) {
    const cliente = clientes.find(c => c.identificacion === id);
    if (!cliente) return alert('Cliente no encontrado');
    if (!codigosUsados.includes(id)) return alert('Este cliente aún no ha ingresado');

    if (confirm(`¿Autorizar reingreso para ${cliente.nombre}?`)) {
        const index = codigosUsados.indexOf(id);
        codigosUsados.splice(index, 1);
        localStorage.setItem('codigosUsados', JSON.stringify(codigosUsados));
        
        actualizarEstadisticas();
        cargarListaClientes(value('buscar-cliente'));
        await sincronizarDatos();
        alert(`✅ Reingreso autorizado para ${cliente.nombre}`);
    }
}

// SINCRONIZACIÓN SIMPLIFICADA
async function sincronizarDatos() {
    try {
        showSyncStatus('syncing', 'Sincronizando...');
        
        // Siempre subir datos locales a Supabase
        const { error } = await supabase
            .from('event_data')
            .upsert({
                id: 'main',
                clientes: clientes,
                codigos_usados: codigosUsados,
                ultima_actualizacion: new Date().toISOString()
            }, {
                onConflict: 'id'
            });

        if (error) throw error;
        
        showSyncStatus('success', 'Sincronizado');
        setTimeout(() => hide($('sync-status')), 3000);
        
    } catch (error) {
        console.error('Error sincronizando:', error);
        showSyncStatus('error', 'Error de sincronización');
        setTimeout(() => hide($('sync-status')), 5000);
    }
}

async function sincronizacionForzada() {
    try {
        showSyncStatus('syncing', 'Sincronización forzada...');
        
        // 1. Subir datos locales
        await sincronizarDatos();
        
        // 2. Pequeña pausa
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // 3. Descargar datos de Supabase
        const { data, error } = await supabase
            .from('event_data')
            .select('*')
            .eq('id', 'main')
            .single();

        if (error) throw error;
        
        if (data) {
            // Reemplazar datos locales completamente
            clientes = data.clientes || [];
            codigosUsados = data.codigos_usados || [];
            
            localStorage.setItem('clientes', JSON.stringify(clientes));
            localStorage.setItem('codigosUsados', JSON.stringify(codigosUsados));
            
            actualizarEstadisticas();
            cargarListaClientes();
            
            alert(`✅ Sincronización forzada completada\nClientes: ${clientes.length}\nCódigos: ${codigosUsados.length}`);
        }
        
    } catch (error) {
        alert('❌ Error en sincronización forzada');
        console.error(error);
    } finally {
        hide($('sync-status'));
    }
}

function showSyncStatus(type, text) {
    const status = $('sync-status');
    if (status) {
        status.className = `sync-status ${type}`;
        status.querySelector('.sync-text').textContent = text;
        show(status);
    }
}

// NAVEGACIÓN Y UI
function showScreen(screenId) {
    document.querySelectorAll('.screen').forEach(screen => {
        screen.classList.toggle('active', screen.id === screenId);
    });
}

function showForm(formId) {
    ['login-form', 'register-form', 'recover-form'].forEach(id => {
        const form = $(id);
        if (form) form.style.display = id === formId ? 'block' : 'none';
    });
}

function showSection(sectionId) {
    // Actualizar navegación
    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.section === sectionId);
    });
    
    // Mostrar sección
    ['ingresar-section', 'verificar-section', 'gestionar-section'].forEach(id => {
        const section = $(id);
        if (section) section.classList.toggle('active', id === sectionId);
    });
    
    // Detener cámara si no estamos en verificación
    if (sectionId !== 'verificar-section') {
        stopCamera();
    }
    
    // Actualizar gestión si es necesario
    if (sectionId === 'gestionar-section') {
        actualizarEstadisticas();
        cargarListaClientes();
    }
}

function showLogin() {
    showScreen('login-screen');
    showForm('login-form');
}

function showApp() {
    showScreen('app-container');
    setText('user-welcome', `Hola, ${usuarioActual.username}`);
    initMainApp();
}

function checkAuthStatus() {
    if (usuarioActual) {
        showApp();
    } else {
        showLogin();
    }
}

function initMainApp() {
    setupMainEventListeners();
    
    // Mostrar último QR si existe
    if (clientes.length > 0) {
        const ultimo = clientes[clientes.length - 1];
        if (!codigosUsados.includes(ultimo.identificacion)) {
            generarQR(ultimo.identificacion);
            setText('qr-message', `QR para: ${ultimo.nombre}`);
        }
    }
    
    // Sincronizar al iniciar
    sincronizarDatos();
}

function showMessage(text, type) {
    const msg = $('login-message');
    if (msg) {
        msg.textContent = text;
        msg.className = `message ${type}`;
        show(msg);
        setTimeout(() => hide(msg), 5000);
    }
}

function clearForm(formId) {
    const form = $(formId);
    if (form) form.reset();
}

// RECUPERACIÓN DE CONTRASEÑA
async function handlePasswordRecovery() {
    const username = value('recover-username'), code = value('recover-organizer-code');
    const newPass = value('new-password'), confirmPass = value('confirm-password');
    
    if (!username || !code || !newPass || !confirmPass) return showMessage('Completa todos los campos', 'error');
    if (newPass.length < 6) return showMessage('Contraseña muy corta', 'error');
    if (code !== ORGANIZER_CODE) return showMessage('Código incorrecto', 'error');
    if (newPass !== confirmPass) return showMessage('Contraseñas no coinciden', 'error');

    showMessage('Verificando...', 'info');
    const { data } = await supabase.from('nexus_usuarios').select('username').eq('username', username).single();
    if (!data) return showMessage('Usuario no encontrado', 'error');

    const { error } = await supabase.from('nexus_usuarios').update({ password_hash: hashPassword(newPass) }).eq('username', username);
    if (error) return showMessage('Error actualizando contraseña', 'error');

    showMessage('✅ Contraseña actualizada', 'success');
    setTimeout(() => { 
        showForm('login-form'); 
        setValue('login-username', username); 
        clearForm('recover-form'); 
    }, 2000);
}

// EVENT LISTENERS
function setupEventListeners() {
    // Auth listeners
    const authHandlers = {
        'btn-login': handleLogin,
        'btn-register': handleRegister,
        'btn-show-register': () => showForm('register-form'),
        'btn-show-login': () => showForm('login-form'),
        'btn-olvide-password': () => showForm('recover-form'),
        'btn-show-login-from-recover': () => showForm('login-form'),
        'btn-recover-password': handlePasswordRecovery,
        'btn-logout': () => {
            usuarioActual = null;
            sessionStorage.removeItem('nexus_usuario_actual');
            showLogin();
        }
    };

    Object.entries(authHandlers).forEach(([id, handler]) => {
        const element = $(id);
        if (element) element.addEventListener('click', handler);
    });

    // Enter keys
    ['login-password', 'organizer-code', 'confirm-password'].forEach(id => {
        const element = $(id);
        if (element) {
            element.addEventListener('keypress', e => {
                if (e.key === 'Enter') {
                    if (id === 'login-password') handleLogin();
                    else if (id === 'organizer-code') handleRegister();
                    else if (id === 'confirm-password') handlePasswordRecovery();
                }
            });
        }
    });
}

function setupMainEventListeners() {
    // Navegación
    ['btn-ingresar', 'btn-verificar', 'btn-gestionar'].forEach(id => {
        const element = $(id);
        if (element) {
            element.addEventListener('click', () => showSection(element.dataset.section));
        }
    });

    // Formularios y botones
    const mainHandlers = {
        'client-form': (el) => el.addEventListener('submit', handleClientFormSubmit),
        'btn-verificar-manual': () => verificarCodigo(value('codigo-manual')),
        'btn-start-camera': startCamera,
        'btn-stop-camera': stopCamera,
        'btn-buscar': () => cargarListaClientes(value('buscar-cliente')),
        'btn-autorizar-reingreso': () => autorizarReingresoCliente(value('codigo-reingreso')),
        'btn-forzar-sincronizacion': sincronizarDatos,
        'btn-sincronizacion-forzada': sincronizacionForzada,
        'btn-limpiar-db': () => {
            if (confirm('¿ESTÁS SEGURO? Esto eliminará TODOS los clientes y códigos.')) {
                clientes = [];
                codigosUsados = [];
                localStorage.removeItem('clientes');
                localStorage.removeItem('codigosUsados');
                $('qrcode').innerHTML = '';
                setText('qr-message', 'El código QR aparecerá aquí después del registro');
                actualizarEstadisticas();
                cargarListaClientes();
                sincronizarDatos();
                alert('Base de datos limpiada');
            }
        }
    };

    Object.entries(mainHandlers).forEach(([id, handler]) => {
        const element = $(id);
        if (element) {
            if (typeof handler === 'function') {
                element.addEventListener('click', handler);
            } else {
                handler(element);
            }
        }
    });

    // Búsqueda con Enter
    const buscarInput = $('buscar-cliente');
    if (buscarInput) {
        buscarInput.addEventListener('keypress', e => {
            if (e.key === 'Enter') cargarListaClientes(value('buscar-cliente'));
        });
    }
}