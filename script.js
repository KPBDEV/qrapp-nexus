// CONFIGURACIÓN
const SUPABASE_URL = 'https://zefsmzxlhgfvmdydutzp.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InplZnNtenhsaGdmdm1keWR1dHpwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk5ODE1NDIsImV4cCI6MjA3NTU1NzU0Mn0.nm7syRkN1ZBnJ5QLk4QStITuUB1cjHZjNfrPA99CpdI';
const ORGANIZER_CODE = "NEXUS.082208";

// VARIABLES GLOBALES
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
let usuarioActual = JSON.parse(sessionStorage.getItem('nexus_usuario_actual')) || null;
let clientes = JSON.parse(localStorage.getItem('clientes')) || [];
let codigosUsados = JSON.parse(localStorage.getItem('codigosUsados')) || [];
let stream = null, scanning = false, animationFrame = null, sincronizacionActiva = false;

// INICIALIZACIÓN
document.addEventListener('DOMContentLoaded', () => {
    setupEventListeners();
    checkAuthStatus();
});

// AUTENTICACIÓN
function hashPassword(p) { return btoa(unescape(encodeURIComponent(p))); }

async function handleLogin() {
    const username = getValue('login-username'), password = getValue('login-password');
    if (!validateFields([username, password])) return;

    showMessage('Verificando...', 'info');
    const { data, error } = await supabase.from('nexus_usuarios').select('*').eq('username', username).single();
    
    if (error) return showMessage(error.code === 'PGRST116' ? 'Usuario no encontrado' : 'Error de conexión', 'error');
    if (data.password_hash === hashPassword(password)) {
        usuarioActual = { id: data.id, username: data.username, fechaRegistro: data.fecha_registro };
        sessionStorage.setItem('nexus_usuario_actual', JSON.stringify(usuarioActual));
        showApp();
        showMessage('¡Bienvenido!', 'success');
    } else {
        showMessage('Contraseña incorrecta', 'error');
    }
}

async function handleRegister() {
    const username = getValue('register-username'), password = getValue('register-password'), code = getValue('organizer-code');
    if (!validateFields([username, password, code]) || password.length < 6) return showMessage('Contraseña muy corta', 'error');
    if (code !== ORGANIZER_CODE) return showMessage('Código incorrecto', 'error');

    showMessage('Creando cuenta...', 'info');
    const { data: existing } = await supabase.from('nexus_usuarios').select('username').eq('username', username);
    if (existing?.length > 0) return showMessage('Usuario ya existe', 'error');

    const { error } = await supabase.from('nexus_usuarios').insert([{ username, password_hash: hashPassword(password) }]);
    if (error) return showMessage('Error creando cuenta', 'error');

    showMessage('¡Cuenta creada!', 'success');
    setTimeout(() => { showLoginForm(); clearForm('register'); setValue('login-username', username); }, 2000);
}

// GESTIÓN DE CLIENTES
async function handleClientFormSubmit(e) {
    e.preventDefault();
    const nombre = getValue('nombre'), identificacion = getValue('identificacion'), telefono = getValue('telefono');
    if (!validateFields([nombre, identificacion, telefono])) return alert('Complete todos los campos');

    const existente = clientes.find(c => c.identificacion === identificacion);
    if (existente) {
        if (codigosUsados.includes(identificacion)) return alert('⚠️ ID ya usado');
        if (!confirm('¿Regenerar QR?')) return;
    }

    const nuevoCliente = { id: Date.now(), nombre, identificacion, telefono, fechaRegistro: new Date().toISOString(), usado: false };
    clientes.push(nuevoCliente);
    localStorage.setItem('clientes', JSON.stringify(clientes));
    
    generarQR(identificacion);
    setText('qr-message', `QR para: ${nombre} (Activo)`);
    e.target.reset();
    await subirASupabase();
}

function generarQR(id) {
    const qrContainer = getElement('qrcode');
    qrContainer.innerHTML = '';
    
    try {
        const qr = qrcode(0, 'L');
        qr.addData(id);
        qr.make();
        
        const canvas = document.createElement('canvas');
        const size = 250, cellSize = size / qr.getModuleCount();
        canvas.width = canvas.height = size;
        
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, size, size);
        ctx.fillStyle = '#000000';
        
        for (let row = 0; row < qr.getModuleCount(); row++) {
            for (let col = 0; col < qr.getModuleCount(); col++) {
                if (qr.isDark(row, col)) ctx.fillRect(col * cellSize, row * cellSize, cellSize, cellSize);
            }
        }
        
        qrContainer.appendChild(canvas);
    } catch (error) {
        qrContainer.innerHTML = '<p style="color: #ef4444;">Error generando QR</p>';
    }
}

// CÁMARA Y VERIFICACIÓN
async function startCamera() {
    try {
        stopCamera();
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
        
        const video = getElement('video');
        video.srcObject = stream;
        video.style.display = 'block';
        getElement('camera-placeholder').style.display = 'none';
        getElement('btn-start-camera').style.display = 'none';
        getElement('btn-stop-camera').style.display = 'inline-block';
        
        video.onloadedmetadata = () => {
            video.play();
            getElement('canvas').width = 320;
            getElement('canvas').height = 240;
            startQRScanning();
        };
    } catch (err) {
        getElement('camera-placeholder').innerHTML = `❌ Error: ${err.message}`;
    }
}

function stopCamera() {
    if (stream) stream.getTracks().forEach(track => track.stop());
    if (animationFrame) clearTimeout(animationFrame);
    stream = scanning = animationFrame = null;
    
    getElement('video').style.display = 'none';
    getElement('camera-placeholder').style.display = 'block';
    getElement('btn-start-camera').style.display = 'inline-block';
    getElement('btn-stop-camera').style.display = 'none';
}

function scanQRCode() {
    if (!scanning || !stream) return;
    
    const video = getElement('video'), canvas = getElement('canvas');
    if (video.readyState === video.HAVE_ENOUGH_DATA) {
        const ctx = canvas.getContext('2d');
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        
        try {
            const code = jsQR(ctx.getImageData(0, 0, canvas.width, canvas.height).data, canvas.width, canvas.height);
            if (code) { verificarCodigo(code.data); stopCamera(); return; }
        } catch (e) {}
    }
    
    if (scanning) animationFrame = setTimeout(() => requestAnimationFrame(scanQRCode), 150);
}

function startQRScanning() { scanning = true; scanQRCode(); }

async function verificarCodigo(codigo) {
    const result = getElement('verification-result');
    if (codigosUsados.includes(codigo)) {
        result.className = 'result-message error';
        setText('result-title', '❌ CÓDIGO YA USADO');
        setText('result-message', 'Este código ya fue utilizado');
        setHTML('client-details', '<p>Acceso denegado - Código de un solo uso</p>');
    } else {
        const cliente = clientes.find(c => c.identificacion === codigo);
        if (cliente) {
            codigosUsados.push(codigo);
            cliente.usado = true;
            cliente.fechaUso = new Date().toISOString();
            localStorage.setItem('codigosUsados', JSON.stringify(codigosUsados));
            localStorage.setItem('clientes', JSON.stringify(clientes));
            
            result.className = 'result-message success';
            setText('result-title', '✅ ACCESO AUTORIZADO');
            setText('result-message', 'Bienvenido/a al evento');
            setHTML('client-details', `
                <p><strong>Nombre:</strong> ${cliente.nombre}</p>
                <p><strong>ID:</strong> ${cliente.identificacion}</p>
                <p><strong>Teléfono:</strong> ${cliente.telefono}</p>
                <p><strong>Hora:</strong> ${new Date().toLocaleTimeString()}</p>
            `);
        } else {
            result.className = 'result-message error';
            setText('result-title', '❌ CÓDIGO INVÁLIDO');
            setText('result-message', 'Código no registrado');
            setHTML('client-details', '');
        }
    }
    
    result.style.display = 'block';
    setValue('codigo-manual', '');
    setTimeout(() => result.style.display = 'none', 8000);
    await subirASupabase();
}

// GESTIÓN
function actualizarEstadisticas() {
    const total = clientes.length, usados = codigosUsados.length;
    setText('total-registrados', total);
    setText('total-ingresaron', usados);
    setText('total-pendientes', total - usados);
}

function cargarListaClientes(filtro = '') {
    const lista = getElement('lista-clientes');
    let filtrados = clientes;
    
    if (filtro) {
        const f = filtro.toLowerCase();
        filtrados = clientes.filter(c => c.nombre.toLowerCase().includes(f) || c.identificacion.includes(f));
    }
    
    lista.innerHTML = filtrados.map(cliente => {
        const usado = codigosUsados.includes(cliente.identificacion);
        return `
            <div class="client-item ${usado ? 'used' : ''}">
                <div class="client-info">
                    <h4>${cliente.nombre}</h4>
                    <p><strong>ID:</strong> ${cliente.identificacion}</p>
                    <p><strong>Teléfono:</strong> ${cliente.telefono}</p>
                    <p><strong>Registro:</strong> ${new Date(cliente.fechaRegistro).toLocaleString()}</p>
                    ${usado ? `<p><strong>Ingreso:</strong> ${cliente.fechaUso ? new Date(cliente.fechaUso).toLocaleString() : 'No registrada'}</p>` : ''}
                </div>
                <div class="client-actions">
                    <span class="status-badge ${usado ? 'used' : ''}">${usado ? '✅ INGRESÓ' : '⏳ PENDIENTE'}</span>
                    ${usado ? `<button onclick="autorizarReingresoCliente('${cliente.identificacion}')" class="nexus-btn btn-warning">Reingreso</button>` : ''}
                </div>
            </div>
        `;
    }).join('') || '<div class="no-clientes">No hay clientes</div>';
}

async function autorizarReingresoCliente(id) {
    const cliente = clientes.find(c => c.identificacion === id);
    if (!cliente || !codigosUsados.includes(id)) return alert('Cliente no encontrado o no ha ingresado');
    
    if (confirm(`¿Autorizar reingreso para ${cliente.nombre}?`)) {
        codigosUsados.splice(codigosUsados.indexOf(id), 1);
        localStorage.setItem('codigosUsados', JSON.stringify(codigosUsados));
        actualizarEstadisticas();
        cargarListaClientes();
        await subirASupabase();
        alert(`✅ Reingreso autorizado para ${cliente.nombre}`);
    }
}

// SINCRONIZACIÓN
async function subirASupabase() {
    try {
        await supabase.from('event_data').upsert({
            id: 'main',
            clientes: clientes,
            codigos_usados: codigosUsados,
            ultima_actualizacion: new Date().toISOString()
        });
    } catch (error) {
        console.error('Error sincronización:', error);
    }
}

async function sincronizacionForzada() {
    try {
        const { data } = await supabase.from('event_data').select('*').eq('id', 'main').single();
        if (data) {
            clientes = data.clientes || [];
            codigosUsados = data.codigos_usados || [];
            localStorage.setItem('clientes', JSON.stringify(clientes));
            localStorage.setItem('codigosUsados', JSON.stringify(codigosUsados));
            actualizarEstadisticas();
            cargarListaClientes();
            alert('✅ Sincronización forzada completada');
        }
    } catch (error) {
        alert('❌ Error en sincronización');
    }
}

// UTILIDADES
function getElement(id) { return document.getElementById(id); }
function getValue(id) { return getElement(id)?.value.trim() || ''; }
function setValue(id, value) { const el = getElement(id); if (el) el.value = value; }
function setText(id, text) { const el = getElement(id); if (el) el.textContent = text; }
function setHTML(id, html) { const el = getElement(id); if (el) el.innerHTML = html; }
function clearForm(id) { const form = getElement(id); if (form) form.reset(); }

function validateFields(fields) {
    if (fields.some(f => !f)) { showMessage('Complete todos los campos', 'error'); return false; }
    return true;
}

function showMessage(text, type) {
    const msg = getElement('login-message');
    if (msg) {
        msg.textContent = text;
        msg.className = `message ${type}`;
        msg.style.display = 'block';
    }
}

// NAVEGACIÓN
function showSection(section) {
    ['ingresar-section', 'verificar-section', 'gestionar-section'].forEach(s => {
        getElement(s)?.classList.toggle('active', s === section);
    });
    if (section !== 'verificar-section') stopCamera();
    if (section === 'gestionar-section') { actualizarEstadisticas(); cargarListaClientes(); }
}

function showLogin() {
    getElement('login-screen').style.display = 'flex';
    getElement('app-container').style.display = 'none';
}

function showApp() {
    getElement('login-screen').style.display = 'none';
    getElement('app-container').style.display = 'block';
    setText('user-welcome', `Bienvenido, ${usuarioActual.username}`);
    initMainApp();
}

function showLoginForm() {
    ['login-form', 'register-form', 'recover-form'].forEach((f, i) => {
        getElement(f).style.display = i === 0 ? 'block' : 'none';
    });
}

function checkAuthStatus() {
    usuarioActual ? showApp() : showLogin();
}

function initMainApp() {
    setupMainEventListeners();
    if (clientes.length > 0) {
        const ultimo = clientes[clientes.length - 1];
        if (!codigosUsados.includes(ultimo.identificacion)) {
            generarQR(ultimo.identificacion);
            setText('qr-message', `QR para: ${ultimo.nombre} (Activo)`);
        }
    }
}

// EVENT LISTENERS
function setupEventListeners() {
    // Auth
    const authElements = {
        'btn-login': handleLogin,
        'btn-register': handleRegister,
        'btn-show-register': () => showForm('register-form'),
        'btn-show-login': () => showForm('login-form'),
        'btn-olvide-password': () => showForm('recover-form'),
        'btn-show-login-from-recover': () => showForm('login-form'),
        'btn-logout': () => { usuarioActual = null; sessionStorage.removeItem('nexus_usuario_actual'); showLogin(); }
    };

    Object.entries(authElements).forEach(([id, handler]) => {
        getElement(id)?.addEventListener('click', handler);
    });

    // Enter keys
    ['login-password', 'organizer-code', 'confirm-password'].forEach(id => {
        getElement(id)?.addEventListener('keypress', e => {
            if (e.key === 'Enter') {
                if (id === 'login-password') handleLogin();
                else if (id === 'organizer-code') handleRegister();
                else if (id === 'confirm-password') handlePasswordRecovery();
            }
        });
    });
}

function setupMainEventListeners() {
    const elements = {
        'btn-ingresar': () => showSection('ingresar-section'),
        'btn-verificar': () => showSection('verificar-section'),
        'btn-gestionar': () => showSection('gestionar-section'),
        'client-form': (el) => el.addEventListener('submit', handleClientFormSubmit),
        'btn-verificar-manual': () => verificarCodigo(getValue('codigo-manual')),
        'btn-start-camera': startCamera,
        'btn-stop-camera': stopCamera,
        'btn-buscar': () => cargarListaClientes(getValue('buscar-cliente')),
        'btn-autorizar-reingreso': () => autorizarReingresoCliente(getValue('codigo-reingreso')),
        'btn-forzar-sincronizacion': subirASupabase,
        'btn-sincronizacion-forzada': sincronizacionForzada,
        'btn-limpiar-db': () => {
            if (confirm('¿Limpiar TODA la base de datos?')) {
                clientes = []; codigosUsados = [];
                localStorage.removeItem('clientes'); localStorage.removeItem('codigosUsados');
                getElement('qrcode').innerHTML = '';
                setText('qr-message', 'El código QR aparecerá aquí');
                actualizarEstadisticas(); cargarListaClientes();
                subirASupabase();
                alert('Base de datos limpiada');
            }
        }
    };

    Object.entries(elements).forEach(([id, handler]) => {
        const el = getElement(id);
        if (el) typeof handler === 'function' ? el.addEventListener('click', handler) : handler(el);
    });

    getElement('buscar-cliente')?.addEventListener('keypress', e => {
        if (e.key === 'Enter') cargarListaClientes(getValue('buscar-cliente'));
    });
}

function showForm(formId) {
    ['login-form', 'register-form', 'recover-form'].forEach(id => {
        getElement(id).style.display = id === formId ? 'block' : 'none';
    });
}

// Recuperación de contraseña (función básica)
async function handlePasswordRecovery() {
    const username = getValue('recover-username'), code = getValue('recover-organizer-code');
    const newPass = getValue('new-password'), confirmPass = getValue('confirm-password');
    
    if (!validateFields([username, code, newPass, confirmPass]) || newPass.length < 6) return showMessage('Contraseña muy corta', 'error');
    if (code !== ORGANIZER_CODE) return showMessage('Código incorrecto', 'error');
    if (newPass !== confirmPass) return showMessage('Contraseñas no coinciden', 'error');

    showMessage('Verificando...', 'info');
    const { data } = await supabase.from('nexus_usuarios').select('username').eq('username', username).single();
    if (!data) return showMessage('Usuario no encontrado', 'error');

    const { error } = await supabase.from('nexus_usuarios').update({ password_hash: hashPassword(newPass) }).eq('username', username);
    if (error) return showMessage('Error actualizando', 'error');

    showMessage('✅ Contraseña actualizada', 'success');
    setTimeout(() => { showForm('login-form'); setValue('login-username', username); clearForm('recover-form'); }, 2000);
}