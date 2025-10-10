// ========== CONFIGURACIÓN SUPABASE ==========
const SUPABASE_URL = 'https://zefsmzxlhgfvmdydutzp.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InplZnNtenhsaGdmdm1keWR1dHpwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk5ODE1NDIsImV4cCI6MjA3NTU1NzU0Mn0.nm7syRkN1ZBnJ5QLk4QStITuUB1cjHZjNfrPA99CpdI';

// Inicializar Supabase
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// ========== SISTEMA DE AUTENTICACIÓN NEXUS ==========
const ORGANIZER_CODE = "NEXUS.082208";
let usuarioActual = JSON.parse(sessionStorage.getItem('nexus_usuario_actual')) || null;

// ========== FUNCIONES DE AUTENTICACIÓN ==========
function hashPassword(password) {
    return btoa(unescape(encodeURIComponent(password)));
}

async function handleLogin() {
    console.log('🎯 handleLogin ejecutándose...');
    
    const username = document.getElementById('login-username').value.trim();
    const password = document.getElementById('login-password').value.trim();

    if (!username || !password) {
        showAuthMessage('Por favor completa todos los campos', 'error');
        return;
    }

    try {
        showAuthMessage('Verificando credenciales...', 'info');
        
        const { data, error } = await supabase
            .from('nexus_usuarios')
            .select('*')
            .eq('username', username)
            .single();

        if (error) {
            if (error.code === 'PGRST116') {
                showAuthMessage('Usuario no encontrado', 'error');
            } else {
                showAuthMessage('Error de conexión: ' + error.message, 'error');
            }
            return;
        }

        const passwordHash = hashPassword(password);
        if (data.password_hash === passwordHash) {
            usuarioActual = {
                id: data.id,
                username: data.username,
                fechaRegistro: data.fecha_registro
            };
            
            sessionStorage.setItem('nexus_usuario_actual', JSON.stringify(usuarioActual));
            showApp();
            showAuthMessage('¡Bienvenido!', 'success');
        } else {
            showAuthMessage('Contraseña incorrecta', 'error');
        }

    } catch (error) {
        console.error('Error en login:', error);
        showAuthMessage('Error de conexión con el servidor', 'error');
    }
}

async function handleRegister() {
    console.log('🎯 handleRegister ejecutándose...');
    
    const username = document.getElementById('register-username').value.trim();
    const password = document.getElementById('register-password').value.trim();
    const organizerCode = document.getElementById('organizer-code').value.trim();

    if (!username || !password || !organizerCode) {
        showAuthMessage('Por favor completa todos los campos', 'error');
        return;
    }

    if (password.length < 6) {
        showAuthMessage('La contraseña debe tener al menos 6 caracteres', 'error');
        return;
    }

    if (organizerCode !== ORGANIZER_CODE) {
        showAuthMessage('Código de organizador incorrecto', 'error');
        return;
    }

    try {
        showAuthMessage('Creando cuenta...', 'info');

        const { data: existingUsers, error: checkError } = await supabase
            .from('nexus_usuarios')
            .select('username')
            .eq('username', username);

        if (existingUsers && existingUsers.length > 0) {
            showAuthMessage('Este usuario ya existe', 'error');
            return;
        }

        const passwordHash = hashPassword(password);
        const { data, error } = await supabase
            .from('nexus_usuarios')
            .insert([{ username: username, password_hash: passwordHash }])
            .select();

        if (error) {
            showAuthMessage('Error creando la cuenta: ' + error.message, 'error');
            return;
        }

        showAuthMessage('¡Cuenta creada exitosamente! Ahora puedes iniciar sesión.', 'success');
        
        setTimeout(() => {
            document.getElementById('register-form').style.display = 'none';
            document.getElementById('login-form').style.display = 'block';
            document.getElementById('login-username').value = username;
            document.getElementById('login-password').value = '';
            document.getElementById('register-username').value = '';
            document.getElementById('register-password').value = '';
            document.getElementById('organizer-code').value = '';
        }, 2000);

    } catch (error) {
        console.error('Error en registro:', error);
        showAuthMessage('Error de conexión con el servidor', 'error');
    }
}

function handleLogout() {
    usuarioActual = null;
    sessionStorage.removeItem('nexus_usuario_actual');
    showLogin();
    showAuthMessage('Sesión cerrada correctamente', 'success');
}

function showAuthMessage(text, type) {
    const loginMessage = document.getElementById('login-message');
    if (loginMessage) {
        loginMessage.textContent = text;
        loginMessage.style.display = 'block';
        loginMessage.style.color = type === 'error' ? '#ef4444' : 
                                  type === 'success' ? '#10b981' : '#6366f1';
    }
}

// ========== CONFIGURACIÓN DE EVENT LISTENERS ==========
function setupAuthEventListeners() {
    console.log('🔧 Configurando event listeners...');
    
    const btnShowRegister = document.getElementById('btn-show-register');
    const btnShowLogin = document.getElementById('btn-show-login');
    const btnLogin = document.getElementById('btn-login');
    const btnRegister = document.getElementById('btn-register');
    const btnLogout = document.getElementById('btn-logout');
    
    if (!btnLogin || !btnShowRegister) {
        console.error('❌ Elementos críticos no encontrados');
        return;
    }
    
    btnShowRegister.addEventListener('click', () => {
        document.getElementById('login-form').style.display = 'none';
        document.getElementById('register-form').style.display = 'block';
        document.getElementById('login-message').style.display = 'none';
    });

    btnShowLogin.addEventListener('click', () => {
        document.getElementById('register-form').style.display = 'none';
        document.getElementById('login-form').style.display = 'block';
        document.getElementById('login-message').style.display = 'none';
    });

    btnLogin.addEventListener('click', handleLogin);
    btnRegister.addEventListener('click', handleRegister);
    
    if (btnLogout) {
        btnLogout.addEventListener('click', handleLogout);
    }

    document.getElementById('login-password').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') handleLogin();
    });
    
    document.getElementById('organizer-code').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') handleRegister();
    });

    console.log('✅ Event listeners configurados');
}

// ========== GESTIÓN DE INTERFAZ ==========
function checkAuthStatus() {
    if (usuarioActual) {
        showApp();
    } else {
        showLogin();
    }
}

function showLogin() {
    const loginScreen = document.getElementById('login-screen');
    const appContainer = document.getElementById('app-container');
    if (loginScreen) loginScreen.style.display = 'flex';
    if (appContainer) appContainer.style.display = 'none';
}

function showApp() {
    const loginScreen = document.getElementById('login-screen');
    const appContainer = document.getElementById('app-container');
    const userWelcome = document.getElementById('user-welcome');
    
    if (loginScreen) loginScreen.style.display = 'none';
    if (appContainer) appContainer.style.display = 'block';
    if (userWelcome && usuarioActual) userWelcome.textContent = `Bienvenido, ${usuarioActual.username}`;
    
    initMainApp();
}

// ========== INICIALIZACIÓN PRINCIPAL ==========
document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 Inicializando NEXUS...');
    setupAuthEventListeners();
    checkAuthStatus();
    console.log('✅ NEXUS listo');
});

// ========== APLICACIÓN PRINCIPAL NEXUS (CÓDIGO ORIGINAL) ==========
let clientes = JSON.parse(localStorage.getItem('clientes')) || [];
let codigosUsados = JSON.parse(localStorage.getItem('codigosUsados')) || [];

// Elementos DOM de la app principal
const btnIngresar = document.getElementById('btn-ingresar');
const btnVerificar = document.getElementById('btn-verificar');
const btnGestionar = document.getElementById('btn-gestionar');
const ingresarSection = document.getElementById('ingresar-section');
const verificarSection = document.getElementById('verificar-section');
const gestionarSection = document.getElementById('gestionar-section');
const clientForm = document.getElementById('client-form');
const qrcodeElement = document.getElementById('qrcode');
const qrMessage = document.getElementById('qr-message');
const verificationResult = document.getElementById('verification-result');
const resultTitle = document.getElementById('result-title');
const resultMessage = document.getElementById('result-message');
const btnVerificarManual = document.getElementById('btn-verificar-manual');
const codigoManual = document.getElementById('codigo-manual');
const clientDetails = document.getElementById('client-details');
const btnStartCamera = document.getElementById('btn-start-camera');
const btnStopCamera = document.getElementById('btn-stop-camera');
const video = document.getElementById('video');
const canvas = document.getElementById('canvas');
const cameraPlaceholder = document.getElementById('camera-placeholder');
const totalRegistrados = document.getElementById('total-registrados');
const totalIngresaron = document.getElementById('total-ingresaron');
const totalPendientes = document.getElementById('total-pendientes');
const buscarCliente = document.getElementById('buscar-cliente');
const btnBuscar = document.getElementById('btn-buscar');
const listaClientes = document.getElementById('lista-clientes');
const codigoReingreso = document.getElementById('codigo-reingreso');
const btnAutorizarReingreso = document.getElementById('btn-autorizar-reingreso');

// Variables para la cámara
let stream = null;
let scanning = false;
let animationFrame = null;
let sincronizacionActiva = false;

function initMainApp() {
    console.log('Iniciando aplicación NEXUS...');
    setupMainEventListeners();
    
    if (clientes.length > 0) {
        const ultimoCliente = clientes[clientes.length - 1];
        if (!codigosUsados.includes(ultimoCliente.identificacion)) {
            generarQR(ultimoCliente.identificacion);
            qrMessage.textContent = `QR para: ${ultimoCliente.nombre} (Activo)`;
        } else {
            qrMessage.textContent = `QR para: ${ultimoCliente.nombre} (⚠️ YA USADO)`;
            qrMessage.style.color = '#ef4444';
        }
    }
}

function setupMainEventListeners() {
    btnIngresar.addEventListener('click', showIngresarSection);
    btnVerificar.addEventListener('click', showVerificarSection);
    btnGestionar.addEventListener('click', showGestionarSection);
    clientForm.addEventListener('submit', handleClientFormSubmit);
    btnVerificarManual.addEventListener('click', handleManualVerification);
    btnStartCamera.addEventListener('click', startCamera);
    btnStopCamera.addEventListener('click', stopCamera);
    btnBuscar.addEventListener('click', buscarClientes);
    btnAutorizarReingreso.addEventListener('click', autorizarReingreso);

    buscarCliente.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') buscarClientes();
    });
}

function showIngresarSection() {
    ingresarSection.classList.add('active');
    verificarSection.classList.remove('active');
    gestionarSection.classList.remove('active');
    stopCamera();
}

function showVerificarSection() {
    verificarSection.classList.add('active');
    ingresarSection.classList.remove('active');
    gestionarSection.classList.remove('active');
}

function showGestionarSection() {
    gestionarSection.classList.add('active');
    ingresarSection.classList.remove('active');
    verificarSection.classList.remove('active');
    stopCamera();
    actualizarEstadisticas();
    cargarListaClientes();
}

async function handleClientFormSubmit(e) {
    e.preventDefault();
    
    const nombre = document.getElementById('nombre').value;
    const identificacion = document.getElementById('identificacion').value;
    const telefono = document.getElementById('telefono').value;
    
    if (!nombre || !identificacion || !telefono) {
        alert('Por favor complete todos los campos');
        return;
    }
    
    const clienteExistente = clientes.find(cliente => cliente.identificacion === identificacion);
    
    if (clienteExistente) {
        if (codigosUsados.includes(identificacion)) {
            alert('⚠️ Este número de identificación YA FUE USADO para ingresar al evento y no puede reutilizarse.');
            return;
        }
        
        const confirmar = confirm('Este número de identificación ya está registrado. ¿Desea generar un nuevo QR?');
        if (confirmar) {
            generarQR(identificacion);
            qrMessage.textContent = `QR para: ${clienteExistente.nombre} (Activo)`;
            qrMessage.style.color = '';
        }
        return;
    }
    
    const nuevoCliente = {
        id: Date.now(),
        nombre,
        identificacion,
        telefono,
        fechaRegistro: new Date().toISOString(),
        usado: false
    };
    
    clientes.push(nuevoCliente);
    localStorage.setItem('clientes', JSON.stringify(clientes));
    
    generarQR(identificacion);
    qrMessage.textContent = `QR generado para: ${nombre} (Activo)`;
    qrMessage.style.color = '';
    
    clientForm.reset();
    await subirCambiosASupabase();
}

function generarQR(identificacion) {
    qrcodeElement.innerHTML = '';
    
    try {
        const typeNumber = 0;
        const errorCorrectionLevel = 'L';
        const qr = qrcode(typeNumber, errorCorrectionLevel);
        qr.addData(identificacion);
        qr.make();
        
        const qrSize = 250;
        const cellSize = qrSize / qr.getModuleCount();
        
        const canvas = document.createElement('canvas');
        canvas.width = qrSize;
        canvas.height = qrSize;
        canvas.style.border = '2px solid #6366f1';
        canvas.style.borderRadius = '10px';
        canvas.style.background = 'white';
        canvas.style.padding = '10px';
        canvas.style.display = 'block';
        canvas.style.margin = '0 auto';
        
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, qrSize, qrSize);
        ctx.fillStyle = '#000000';
        
        for (let row = 0; row < qr.getModuleCount(); row++) {
            for (let col = 0; col < qr.getModuleCount(); col++) {
                if (qr.isDark(row, col)) {
                    ctx.fillRect(col * cellSize, row * cellSize, cellSize, cellSize);
                }
            }
        }
        
        qrcodeElement.appendChild(canvas);
        
    } catch (error) {
        console.error('Error generando QR:', error);
        qrcodeElement.innerHTML = '<p style="color: #ef4444; font-weight: bold;">Error al generar QR</p>';
    }
}

async function startCamera() {
    try {
        stopCamera();
        
        console.log('🎥 Iniciando cámara...');
        const constraints = { video: { facingMode: "environment" } };
        stream = await navigator.mediaDevices.getUserMedia(constraints);
        
        video.srcObject = stream;
        video.style.display = 'block';
        cameraPlaceholder.style.display = 'none';
        canvas.style.display = 'none';
        
        btnStartCamera.style.display = 'none';
        btnStopCamera.style.display = 'inline-block';
        agregarOverlayConTransparencia();
        
        video.addEventListener('loadedmetadata', () => {
            video.play().then(() => {
                console.log('✅ Video listo, iniciando escaneo...');
                canvas.width = 320;
                canvas.height = 240;
                startQRScanning();
            });
        });
        
    } catch (err) {
        console.error('Error al acceder a la cámara:', err);
        cameraPlaceholder.innerHTML = '❌ Error: ' + err.message;
        cameraPlaceholder.style.display = 'block';
    }
}

function agregarOverlayConTransparencia() {
    const existingOverlay = document.getElementById('scan-overlay');
    if (existingOverlay) existingOverlay.remove();
    
    const overlay = document.createElement('div');
    overlay.id = 'scan-overlay';
    overlay.innerHTML = `
        <div class="overlay-mask"></div>
        <div class="scan-frame"></div>
        <div class="scan-line"></div>
        <div class="scan-text">Enfoca el código QR en el marco</div>
    `;
    document.getElementById('scanner').appendChild(overlay);
}

function scanQRCode() {
    if (!scanning || !stream) return;
    
    if (video.readyState === video.HAVE_ENOUGH_DATA) {
        const context = canvas.getContext('2d', { willReadFrequently: true });
        context.drawImage(video, 0, 0, canvas.width, canvas.height);
        const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
        
        try {
            const code = jsQR(imageData.data, imageData.width, imageData.height, {
                inversionAttempts: "dontInvert",
            });
            
            if (code) {
                console.log('✅ QR detectado:', code.data);
                verificarCodigo(code.data);
                stopCamera();
                mostrarFeedbackQRDetectado();
                return;
            }
        } catch (error) {}
    }
    
    if (scanning) {
        animationFrame = setTimeout(() => {
            requestAnimationFrame(scanQRCode);
        }, 150);
    }
}

function mostrarFeedbackQRDetectado() {
    const overlay = document.getElementById('scan-overlay');
    if (overlay) {
        overlay.innerHTML = `<div class="scan-success">✅ QR DETECTADO</div>`;
        setTimeout(() => { if (overlay) overlay.remove(); }, 2000);
    }
}

function stopCamera() {
    if (stream) {
        stream.getTracks().forEach(track => track.stop());
        stream = null;
    }
    if (animationFrame) {
        clearTimeout(animationFrame);
        animationFrame = null;
    }
    video.srcObject = null;
    video.style.display = 'none';
    canvas.style.display = 'none';
    cameraPlaceholder.style.display = 'block';
    cameraPlaceholder.textContent = 'Cámara no activada';
    btnStartCamera.style.display = 'inline-block';
    btnStopCamera.style.display = 'none';
    scanning = false;
    
    const overlay = document.getElementById('scan-overlay');
    if (overlay) overlay.remove();
}

function startQRScanning() {
    scanning = true;
    scanQRCode();
}

function handleManualVerification() {
    const codigo = codigoManual.value.trim();
    if (!codigo) {
        alert('Por favor ingrese un código para verificar');
        return;
    }
    verificarCodigo(codigo);
}

async function verificarCodigo(codigo) {
    if (codigosUsados.includes(codigo)) {
        verificationResult.className = 'verification-result error';
        resultTitle.textContent = '❌ CÓDIGO YA USADO';
        resultMessage.textContent = 'Este código QR ya fue utilizado para ingresar al evento.';
        clientDetails.innerHTML = `
            <p><strong>Acceso denegado:</strong> Código de un solo uso</p>
            <p><strong>Medida de seguridad:</strong> Evita reutilización fraudulenta</p>
        `;
        verificationResult.style.display = 'block';
        codigoManual.value = '';
        setTimeout(() => { verificationResult.style.display = 'none'; }, 8000);
        return;
    }
    
    const cliente = clientes.find(c => c.identificacion === codigo);
    if (cliente) {
        codigosUsados.push(codigo);
        localStorage.setItem('codigosUsados', JSON.stringify(codigosUsados));
        cliente.usado = true;
        cliente.fechaUso = new Date().toISOString();
        localStorage.setItem('clientes', JSON.stringify(clientes));
        
        verificationResult.className = 'verification-result success';
        resultTitle.textContent = '✅ ACCESO AUTORIZADO';
        resultMessage.textContent = 'Bienvenido/a al evento';
        clientDetails.innerHTML = `
            <p><strong>Nombre:</strong> ${cliente.nombre}</p>
            <p><strong>Identificación:</strong> ${cliente.identificacion}</p>
            <p><strong>Teléfono:</strong> ${cliente.telefono}</p>
            <p><strong>Hora de ingreso:</strong> ${new Date().toLocaleTimeString()}</p>
            <p><strong>⚠️ Este código ya no podrá ser reutilizado</strong></p>
        `;
        verificationResult.style.display = 'block';
        playBeepSound();
    } else {
        verificationResult.className = 'verification-result error';
        resultTitle.textContent = '❌ CÓDIGO INVÁLIDO';
        resultMessage.textContent = 'El código no está registrado en nuestra base de datos.';
        clientDetails.innerHTML = '';
        verificationResult.style.display = 'block';
    }
    
    codigoManual.value = '';
    setTimeout(() => { verificationResult.style.display = 'none'; }, 8000);
    await subirCambiosASupabase();
}

function playBeepSound() {
    try {
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        oscillator.frequency.value = 800;
        oscillator.type = 'sine';
        gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);
        oscillator.start(audioContext.currentTime);
        oscillator.stop(audioContext.currentTime + 0.5);
    } catch (error) {
        console.log('Audio no disponible');
    }
}

function actualizarEstadisticas() {
    const total = clientes.length;
    const usados = codigosUsados.length;
    const pendientes = total - usados;
    totalRegistrados.textContent = total;
    totalIngresaron.textContent = usados;
    totalPendientes.textContent = pendientes;
}

function cargarListaClientes(filtro = '') {
    listaClientes.innerHTML = '';
    let clientesFiltrados = clientes;
    
    if (filtro) {
        const filtroLower = filtro.toLowerCase();
        clientesFiltrados = clientes.filter(cliente => 
            cliente.nombre.toLowerCase().includes(filtroLower) ||
            cliente.identificacion.includes(filtro)
        );
    }
    
    if (clientesFiltrados.length === 0) {
        listaClientes.innerHTML = '<div class="no-clientes">No se encontraron clientes</div>';
        return;
    }
    
    clientesFiltrados.forEach(cliente => {
        const usado = codigosUsados.includes(cliente.identificacion);
        const item = document.createElement('div');
        item.className = `nexus-client-item ${usado ? 'usado' : ''}`;
        item.innerHTML = `
            <div class="cliente-info">
                <h4>${cliente.nombre}</h4>
                <p><strong>ID:</strong> ${cliente.identificacion}</p>
                <p><strong>Teléfono:</strong> ${cliente.telefono}</p>
                <p><strong>Registro:</strong> ${new Date(cliente.fechaRegistro).toLocaleString()}</p>
                ${usado ? `<p><strong>Último ingreso:</strong> ${cliente.fechaUso ? new Date(cliente.fechaUso).toLocaleString() : 'Fecha no registrada'}</p>` : ''}
            </div>
            <div class="cliente-actions">
                <span class="estado-badge ${usado ? 'estado-usado' : 'estado-activo'}">
                    ${usado ? '✅ YA INGRESÓ' : '⏳ PENDIENTE'}
                </span>
                ${usado ? `<button class="btn-reingresar" onclick="autorizarReingresoCliente('${cliente.identificacion}')">Permitir Reingreso</button>` : ''}
            </div>
        `;
        listaClientes.appendChild(item);
    });
}

function buscarClientes() {
    const filtro = buscarCliente.value.trim();
    cargarListaClientes(filtro);
}

function autorizarReingreso() {
    const codigo = codigoReingreso.value.trim();
    if (!codigo) {
        alert('Por favor ingrese un código para autorizar reingreso');
        return;
    }
    autorizarReingresoCliente(codigo);
}

async function autorizarReingresoCliente(identificacion) {
    const cliente = clientes.find(c => c.identificacion === identificacion);
    if (!cliente) {
        alert('Cliente no encontrado');
        return;
    }
    if (!codigosUsados.includes(identificacion)) {
        alert('Este cliente aún no ha ingresado por primera vez');
        return;
    }
    const confirmar = confirm(`¿Autorizar reingreso para ${cliente.nombre} (${identificacion})?`);
    if (confirmar) {
        const index = codigosUsados.indexOf(identificacion);
        if (index > -1) {
            codigosUsados.splice(index, 1);
            localStorage.setItem('codigosUsados', JSON.stringify(codigosUsados));
            cliente.reingresoAutorizado = true;
            cliente.fechaReingreso = new Date().toISOString();
            localStorage.setItem('clientes', JSON.stringify(clientes));
            alert(`✅ Reingreso autorizado para ${cliente.nombre}\nAhora puede ingresar nuevamente al evento`);
            actualizarEstadisticas();
            cargarListaClientes(buscarCliente.value);
            codigoReingreso.value = '';
            await subirCambiosASupabase();
        }
    }
}

async function iniciarSincronizacionAutomatica() {
    if (sincronizacionActiva || !usuarioActual) return;
    sincronizacionActiva = true;
    console.log('🔄 Sincronización Supabase iniciada');
    crearElementoEstado();
    await cargarDatosIniciales();
    escucharCambiosEnTiempoReal();
}

async function cargarDatosIniciales() {
    try {
        const { data, error } = await supabase
            .from('event_data')
            .select('*')
            .eq('id', 'main')
            .single();

        if (error && error.code !== 'PGRST116') {
            console.error('Error cargando datos:', error);
            return;
        }

        if (data) {
            console.log('📥 Datos cargados desde Supabase');
            clientes = data.clientes || [];
            codigosUsados = data.codigos_usados || [];
            localStorage.setItem('clientes', JSON.stringify(clientes));
            localStorage.setItem('codigosUsados', JSON.stringify(codigosUsados));
            actualizarInterfaz();
        } else {
            await crearDocumentoInicial();
        }
    } catch (error) {
        console.error('Error en carga inicial:', error);
    }
}

function escucharCambiosEnTiempoReal() {
    const subscription = supabase
        .channel('event-changes')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'event_data', filter: 'id=eq.main' }, 
            async (payload) => {
                console.log('🔄 Cambio en tiempo real detectado');
                actualizarEstadoSincronizacion('sincronizando');
                if (payload.new) {
                    clientes = payload.new.clientes || [];
                    codigosUsados = payload.new.codigos_usados || [];
                    localStorage.setItem('clientes', JSON.stringify(clientes));
                    localStorage.setItem('codigosUsados', JSON.stringify(codigosUsados));
                    actualizarInterfaz();
                    console.log('✅ Base de datos actualizada desde Supabase');
                }
                actualizarEstadoSincronizacion('sincronizado');
            }
        )
        .subscribe();
    return subscription;
}

async function crearDocumentoInicial() {
    try {
        const { error } = await supabase
            .from('event_data')
            .insert([{ id: 'main', clientes: clientes, codigos_usados: codigosUsados, ultima_actualizacion: new Date().toISOString() }]);
        if (error) throw error;
        console.log('📝 Documento inicial creado en Supabase');
    } catch (error) {
        console.error('Error creando documento inicial:', error);
    }
}

async function subirCambiosASupabase() {
    try {
        const { error } = await supabase
            .from('event_data')
            .update({ clientes: clientes, codigos_usados: codigosUsados, ultima_actualizacion: new Date().toISOString() })
            .eq('id', 'main');
        if (error) throw error;
        console.log('📤 Cambios subidos a Supabase');
    } catch (error) {
        console.error('Error subiendo cambios:', error);
    }
}

function actualizarEstadoSincronizacion(estado) {
    const elemento = document.getElementById('estado-sincronizacion');
    if (!elemento) return;
    elemento.className = 'sincronizacion-estado ' + estado;
    switch(estado) {
        case 'sincronizado': elemento.innerHTML = '🟢 Sincronizado'; break;
        case 'sincronizando': elemento.innerHTML = '🟡 Sincronizando...'; break;
        case 'error': elemento.innerHTML = '🔴 Sin Supabase'; break;
    }
}

function crearElementoEstado() {
    const elemento = document.createElement('div');
    elemento.id = 'estado-sincronizacion';
    elemento.className = 'sincronizacion-estado sincronizado';
    document.body.appendChild(elemento);
    return elemento;
}

function actualizarInterfaz() {
    actualizarEstadisticas();
    if (gestionarSection.classList.contains('active')) cargarListaClientes();
    if (ingresarSection.classList.contains('active') && clientes.length > 0) {
        const ultimoCliente = clientes[clientes.length - 1];
        if (!codigosUsados.includes(ultimoCliente.identificacion)) {
            generarQR(ultimoCliente.identificacion);
            qrMessage.textContent = `QR para: ${ultimoCliente.nombre} (Activo)`;
        }
    }
}

async function limpiarBaseDatos() {
    if (confirm('¿Está seguro de que desea limpiar TODA la base de datos? Se perderán todos los clientes y códigos usados.')) {
        localStorage.removeItem('clientes');
        localStorage.removeItem('codigosUsados');
        clientes = [];
        codigosUsados = [];
        qrcodeElement.innerHTML = '';
        qrMessage.textContent = 'El código QR aparecerá aquí después de ingresar los datos';
        qrMessage.style.color = '';
        actualizarEstadisticas();
        cargarListaClientes();
        alert('Base de datos limpiada completamente');
        await subirCambiosASupabase();
    }
}