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
    const username = document.getElementById('login-username')?.value.trim();
    const password = document.getElementById('login-password')?.value.trim();

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
                showAuthMessage('Error de conexión', 'error');
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
        showAuthMessage('Error de conexión con el servidor', 'error');
    }
}

async function handleRegister() {
    const username = document.getElementById('register-username')?.value.trim();
    const password = document.getElementById('register-password')?.value.trim();
    const organizerCode = document.getElementById('organizer-code')?.value.trim();

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
            showAuthMessage('Error creando la cuenta', 'error');
            return;
        }

        showAuthMessage('¡Cuenta creada exitosamente! Ahora puedes iniciar sesión.', 'success');
        
        setTimeout(() => {
            const registerForm = document.getElementById('register-form');
            const loginForm = document.getElementById('login-form');
            if (registerForm) registerForm.style.display = 'none';
            if (loginForm) loginForm.style.display = 'block';
            
            document.getElementById('login-username').value = username;
            document.getElementById('login-password').value = '';
            document.getElementById('register-username').value = '';
            document.getElementById('register-password').value = '';
            document.getElementById('organizer-code').value = '';
        }, 2000);

    } catch (error) {
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
        loginMessage.style.color = type === 'error' ? '#ef4444' : '#10b981';
    }
}

// ========== CONFIGURACIÓN DE EVENT LISTENERS SEGURA ==========
function setupAuthEventListeners() {
    console.log('🔧 Buscando elementos para event listeners...');
    
    // Buscar elementos de forma segura
    const btnShowRegister = document.getElementById('btn-show-register');
    const btnShowLogin = document.getElementById('btn-show-login');
    const btnLogin = document.getElementById('btn-login');
    const btnRegister = document.getElementById('btn-register');
    const btnLogout = document.getElementById('btn-logout');
    
    console.log('Elementos encontrados:', {
        btnShowRegister: !!btnShowRegister,
        btnShowLogin: !!btnShowLogin,
        btnLogin: !!btnLogin,
        btnRegister: !!btnRegister,
        btnLogout: !!btnLogout
    });
    
    // Configurar solo los elementos que existen
    if (btnShowRegister) {
        btnShowRegister.addEventListener('click', () => {
            document.getElementById('login-form').style.display = 'none';
            document.getElementById('register-form').style.display = 'block';
            document.getElementById('login-message').style.display = 'none';
        });
    } else {
        console.error('❌ btnShowRegister no encontrado');
    }

    if (btnShowLogin) {
        btnShowLogin.addEventListener('click', () => {
            document.getElementById('register-form').style.display = 'none';
            document.getElementById('login-form').style.display = 'block';
            document.getElementById('login-message').style.display = 'none';
        });
    } else {
        console.error('❌ btnShowLogin no encontrado');
    }

    if (btnLogin) {
        btnLogin.addEventListener('click', handleLogin);
    } else {
        console.error('❌ btnLogin no encontrado');
    }
    
    if (btnRegister) {
        btnRegister.addEventListener('click', handleRegister);
    } else {
        console.error('❌ btnRegister no encontrado');
    }
    
    if (btnLogout) {
        btnLogout.addEventListener('click', handleLogout);
    }

    // Enter key listeners
    const loginPassword = document.getElementById('login-password');
    const organizerCode = document.getElementById('organizer-code');
    
    if (loginPassword) {
        loginPassword.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') handleLogin();
        });
    }
    
    if (organizerCode) {
        organizerCode.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') handleRegister();
        });
    }

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
    console.log('🚀 DOM cargado - Inicializando NEXUS...');
    setupAuthEventListeners();
    checkAuthStatus();
    console.log('✅ NEXUS listo');
});

// ========== APLICACIÓN PRINCIPAL NEXUS ==========
let clientes = JSON.parse(localStorage.getItem('clientes')) || [];
let codigosUsados = JSON.parse(localStorage.getItem('codigosUsados')) || [];

function initMainApp() {
    console.log('Iniciando aplicación NEXUS principal...');
    setupMainEventListeners();
    
    if (clientes.length > 0) {
        const ultimoCliente = clientes[clientes.length - 1];
        if (!codigosUsados.includes(ultimoCliente.identificacion)) {
            generarQR(ultimoCliente.identificacion);
            document.getElementById('qr-message').textContent = `QR para: ${ultimoCliente.nombre} (Activo)`;
        } else {
            document.getElementById('qr-message').textContent = `QR para: ${ultimoCliente.nombre} (⚠️ YA USADO)`;
            document.getElementById('qr-message').style.color = '#ef4444';
        }
    }
}

function setupMainEventListeners() {
    // Configurar listeners principales de forma segura
    const elements = {
        'btn-ingresar': (el) => el.addEventListener('click', showIngresarSection),
        'btn-verificar': (el) => el.addEventListener('click', showVerificarSection),
        'btn-gestionar': (el) => el.addEventListener('click', showGestionarSection),
        'client-form': (el) => el.addEventListener('submit', handleClientFormSubmit),
        'btn-verificar-manual': (el) => el.addEventListener('click', handleManualVerification),
        'btn-start-camera': (el) => el.addEventListener('click', startCamera),
        'btn-stop-camera': (el) => el.addEventListener('click', stopCamera),
        'btn-buscar': (el) => el.addEventListener('click', buscarClientes),
        'btn-autorizar-reingreso': (el) => el.addEventListener('click', autorizarReingreso),
        'buscar-cliente': (el) => el.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') buscarClientes();
        })
    };

    Object.keys(elements).forEach(id => {
        const element = document.getElementById(id);
        if (element) {
            elements[id](element);
        } else {
            console.warn(`⚠️ Elemento no encontrado: ${id}`);
        }
    });
}

// ========== FUNCIONES DE LA APP PRINCIPAL ==========
function showIngresarSection() {
    document.getElementById('ingresar-section').classList.add('active');
    document.getElementById('verificar-section').classList.remove('active');
    document.getElementById('gestionar-section').classList.remove('active');
    stopCamera();
}

function showVerificarSection() {
    document.getElementById('verificar-section').classList.add('active');
    document.getElementById('ingresar-section').classList.remove('active');
    document.getElementById('gestionar-section').classList.remove('active');
}

function showGestionarSection() {
    console.log('📊 Mostrando sección de gestión...');
    
    // Obtener elementos de forma segura
    const gestionarSection = document.getElementById('gestionar-section');
    const ingresarSection = document.getElementById('ingresar-section');
    const verificarSection = document.getElementById('verificar-section');
    
    // Actualizar clases activas
    if (gestionarSection) gestionarSection.classList.add('active');
    if (ingresarSection) ingresarSection.classList.remove('active');
    if (verificarSection) verificarSection.classList.remove('active');
    
    // Detener cámara de forma segura
    try {
        stopCamera();
    } catch (error) {
        console.log('⚠️ Error al detener cámara en gestión:', error);
    }
    
    // Actualizar interfaz
    actualizarEstadisticas();
    cargarListaClientes();
    
    console.log('✅ Sección de gestión mostrada');
}

async function handleClientFormSubmit(e) {
    e.preventDefault();
    
    const nombre = document.getElementById('nombre')?.value;
    const identificacion = document.getElementById('identificacion')?.value;
    const telefono = document.getElementById('telefono')?.value;
    
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
            document.getElementById('qr-message').textContent = `QR para: ${clienteExistente.nombre} (Activo)`;
            document.getElementById('qr-message').style.color = '';
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
    document.getElementById('qr-message').textContent = `QR generado para: ${nombre} (Activo)`;
    document.getElementById('qr-message').style.color = '';
    
    document.getElementById('client-form').reset();
    await subirCambiosASupabase();
}

function generarQR(identificacion) {
    const qrcodeElement = document.getElementById('qrcode');
    if (!qrcodeElement) return;
    
    qrcodeElement.innerHTML = '';
    
    try {
        const qr = qrcode(0, 'L');
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

// ========== SISTEMA DE SINCRONIZACIÓN ==========
let sincronizacionActiva = false;

// ========== VARIABLES GLOBALES PARA LA CÁMARA ==========
let stream = null;
let scanning = false;
let animationFrame = null;

async function subirCambiosASupabase() {
    try {
        const { error } = await supabase
            .from('event_data')
            .update({ 
                clientes: clientes, 
                codigos_usados: codigosUsados, 
                ultima_actualizacion: new Date().toISOString() 
            })
            .eq('id', 'main');
        if (error) throw error;
        console.log('📤 Cambios subidos a Supabase');
    } catch (error) {
        console.error('Error subiendo cambios:', error);
    }
}

// Funciones básicas de la app principal (para que no de error)
function handleManualVerification() {
    const codigoManual = document.getElementById('codigo-manual');
    const codigo = codigoManual ? codigoManual.value.trim() : '';
    
    if (!codigo) {
        alert('Por favor ingrese un código para verificar');
        return;
    }
    
    verificarCodigo(codigo);
}

function verificarCodigo(codigo) {
    // Implementación básica
    alert(`Verificando código: ${codigo}`);
}

function actualizarEstadisticas() {
    const total = clientes.length;
    const usados = codigosUsados.length;
    const pendientes = total - usados;
    
    const totalRegistrados = document.getElementById('total-registrados');
    const totalIngresaron = document.getElementById('total-ingresaron');
    const totalPendientes = document.getElementById('total-pendientes');
    
    if (totalRegistrados) totalRegistrados.textContent = total;
    if (totalIngresaron) totalIngresaron.textContent = usados;
    if (totalPendientes) totalPendientes.textContent = pendientes;
}

function cargarListaClientes(filtro = '') {
    console.log('📋 Cargando lista de clientes...');
    
    const listaClientes = document.getElementById('lista-clientes');
    if (!listaClientes) {
        console.error('❌ Elemento lista-clientes no encontrado');
        return;
    }
    
    // Limpiar lista
    listaClientes.innerHTML = '';
    
    // Filtrar clientes si hay búsqueda
    let clientesFiltrados = clientes;
    
    if (filtro) {
        const filtroLower = filtro.toLowerCase();
        clientesFiltrados = clientes.filter(cliente => 
            cliente.nombre.toLowerCase().includes(filtroLower) ||
            cliente.identificacion.includes(filtro)
        );
        console.log(`🔍 ${clientesFiltrados.length} clientes encontrados con filtro: "${filtro}"`);
    } else {
        console.log(`📊 Mostrando todos los ${clientes.length} clientes`);
    }
    
    // Mostrar mensaje si no hay clientes
    if (clientesFiltrados.length === 0) {
        listaClientes.innerHTML = '<div class="no-clientes">No se encontraron clientes</div>';
        return;
    }
    
    // Crear elementos para cada cliente
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
    
    console.log('✅ Lista de clientes cargada correctamente');
}
function autorizarReingreso() {
    const codigoReingreso = document.getElementById('codigo-reingreso');
    const codigo = codigoReingreso ? codigoReingreso.value.trim() : '';
    
    if (!codigo) {
        alert('Por favor ingrese un código para autorizar reingreso');
        return;
    }
    
    autorizarReingresoCliente(codigo);
}

// Funciones de cámara básicas
async function startCamera() {
    console.log('🎥 Intentando iniciar cámara...');
    
    try {
        // Primero detener cualquier cámara activa
        stopCamera();
        
        // Solicitar permisos de cámara
        const constraints = {
            video: { 
                facingMode: "environment",
                width: { ideal: 1280 },
                height: { ideal: 720 }
            } 
        };

        console.log('📷 Solicitando acceso a cámara...');
        stream = await navigator.mediaDevices.getUserMedia(constraints);
        console.log('✅ Acceso a cámara concedido');
        
        // Obtener elementos de forma segura
        const video = document.getElementById('video');
        const cameraPlaceholder = document.getElementById('camera-placeholder');
        const canvas = document.getElementById('canvas');
        const btnStartCamera = document.getElementById('btn-start-camera');
        const btnStopCamera = document.getElementById('btn-stop-camera');
        
        if (!video) {
            throw new Error('Elemento video no encontrado');
        }
        
        // Configurar video
        video.srcObject = stream;
        video.style.display = 'block';
        video.style.width = '100%';
        video.style.height = '100%';
        video.style.objectFit = 'cover';
        
        // Ocultar placeholder y mostrar video
        if (cameraPlaceholder) {
            cameraPlaceholder.style.display = 'none';
        }
        
        if (canvas) {
            canvas.style.display = 'none';
        }
        
        // Actualizar botones
        if (btnStartCamera) {
            btnStartCamera.style.display = 'none';
        }
        
        if (btnStopCamera) {
            btnStopCamera.style.display = 'inline-block';
        }
        
        // Agregar overlay de escaneo
        agregarOverlayConTransparencia();
        
        // Esperar a que el video esté listo
        video.addEventListener('loadedmetadata', () => {
            console.log('🎬 Video cargado, reproduciendo...');
            video.play().then(() => {
                console.log('✅ Video reproduciéndose, iniciando escáner QR...');
                
                // Configurar canvas para escaneo
                if (canvas) {
                    canvas.width = 320;
                    canvas.height = 240;
                }
                
                // Iniciar escaneo QR
                startQRScanning();
            }).catch(error => {
                console.error('❌ Error al reproducir video:', error);
            });
        });
        
    } catch (err) {
        console.error('❌ Error al acceder a la cámara:', err);
        
        // Mostrar error al usuario
        const cameraPlaceholder = document.getElementById('camera-placeholder');
        if (cameraPlaceholder) {
            cameraPlaceholder.innerHTML = `
                ❌ Error: ${err.name === 'NotAllowedError' ? 'Permiso de cámara denegado' : err.message}
                <br><small>Asegúrate de permitir el acceso a la cámara</small>
            `;
            cameraPlaceholder.style.display = 'block';
        }
        
        // Resetear estado
        stopCamera();
    }
}

function stopCamera() {
    console.log('🛑 Deteniendo cámara...');
    
    // Detener stream si existe
    if (stream) {
        try {
            stream.getTracks().forEach(track => {
                track.stop();
            });
            stream = null;
        } catch (error) {
            console.log('Error al detener stream:', error);
        }
    }
    
    // Limpiar animation frame si existe
    if (animationFrame) {
        clearTimeout(animationFrame);
        animationFrame = null;
    }
    
    // Resetear variables de estado
    scanning = false;
    
    // Obtener elementos de forma segura
    const video = document.getElementById('video');
    const canvas = document.getElementById('canvas');
    const cameraPlaceholder = document.getElementById('camera-placeholder');
    const btnStartCamera = document.getElementById('btn-start-camera');
    const btnStopCamera = document.getElementById('btn-stop-camera');
    
    // Resetear elementos de UI
    if (video) {
        video.srcObject = null;
        video.style.display = 'none';
    }
    
    if (canvas) {
        canvas.style.display = 'none';
    }
    
    if (cameraPlaceholder) {
        cameraPlaceholder.style.display = 'block';
        cameraPlaceholder.textContent = 'Cámara no activada';
    }
    
    if (btnStartCamera) {
        btnStartCamera.style.display = 'inline-block';
    }
    
    if (btnStopCamera) {
        btnStopCamera.style.display = 'none';
    }
    
    // Remover overlay si existe
    const overlay = document.getElementById('scan-overlay');
    if (overlay) {
        overlay.remove();
    }
    
    console.log('✅ Cámara detenida correctamente');
}

// Inicialización de sincronización
async function iniciarSincronizacionAutomatica() {
    if (sincronizacionActiva || !usuarioActual) return;
    sincronizacionActiva = true;
    console.log('🔄 Sincronización iniciada');
    await subirCambiosASupabase();
}

function agregarOverlayConTransparencia() {
    const existingOverlay = document.getElementById('scan-overlay');
    if (existingOverlay) {
        existingOverlay.remove();
    }
    
    const overlay = document.createElement('div');
    overlay.id = 'scan-overlay';
    overlay.innerHTML = `
        <div class="overlay-mask"></div>
        <div class="scan-frame"></div>
        <div class="scan-line"></div>
        <div class="scan-text">Enfoca el código QR en el marco</div>
    `;
    
    const scanner = document.getElementById('scanner');
    if (scanner) {
        scanner.appendChild(overlay);
    }
}

function scanQRCode() {
    if (!scanning || !stream) return;
    
    const video = document.getElementById('video');
    const canvas = document.getElementById('canvas');
    
    if (video && video.readyState === video.HAVE_ENOUGH_DATA && canvas) {
        const context = canvas.getContext('2d', { willReadFrequently: true });
        
        // DIBUJAR FRAME REDUCIDO (más rápido)
        context.drawImage(video, 0, 0, canvas.width, canvas.height);
        
        const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
        
        try {
            const code = jsQR(imageData.data, imageData.width, imageData.height, {
                inversionAttempts: "dontInvert",
            });
            
            if (code) {
                console.log('✅ QR detectado instantáneamente:', code.data);
                verificarCodigo(code.data);
                stopCamera();
                // Mostrar feedback visual
                mostrarFeedbackQRDetectado();
                return;
            }
        } catch (error) {
            // Silenciar errores de escaneo
        }
    }
    
    if (scanning) {
        // ESCANEAR CADA 150ms (no continuo) - MENOS LAG
        animationFrame = setTimeout(() => {
            requestAnimationFrame(scanQRCode);
        }, 150);
    }
}

function startQRScanning() {
    scanning = true;
    scanQRCode();
}

function mostrarFeedbackQRDetectado() {
    const overlay = document.getElementById('scan-overlay');
    if (overlay) {
        overlay.innerHTML = `
            <div class="scan-success">✅ QR DETECTADO</div>
        `;
        setTimeout(() => {
            if (overlay) overlay.remove();
        }, 2000);
    }
}

function buscarClientes() {
    const buscarCliente = document.getElementById('buscar-cliente');
    const filtro = buscarCliente ? buscarCliente.value.trim() : '';
    console.log('🔍 Buscando clientes:', filtro);
    cargarListaClientes(filtro);
}

async function verificarCodigo(codigo) {
    if (codigosUsados.includes(codigo)) {
        const verificationResult = document.getElementById('verification-result');
        const resultTitle = document.getElementById('result-title');
        const resultMessage = document.getElementById('result-message');
        const clientDetails = document.getElementById('client-details');
        
        if (verificationResult && resultTitle && resultMessage && clientDetails) {
            verificationResult.className = 'verification-result error';
            resultTitle.textContent = '❌ CÓDIGO YA USADO';
            resultMessage.textContent = 'Este código QR ya fue utilizado para ingresar al evento.';
            clientDetails.innerHTML = `
                <p><strong>Acceso denegado:</strong> Código de un solo uso</p>
                <p><strong>Medida de seguridad:</strong> Evita reutilización fraudulenta</p>
            `;
            verificationResult.style.display = 'block';
        }
        
        const codigoManual = document.getElementById('codigo-manual');
        if (codigoManual) codigoManual.value = '';
        
        setTimeout(() => {
            if (verificationResult) verificationResult.style.display = 'none';
        }, 8000);
        return;
    }
    
    const cliente = clientes.find(c => c.identificacion === codigo);
    
    if (cliente) {
        codigosUsados.push(codigo);
        localStorage.setItem('codigosUsados', JSON.stringify(codigosUsados));
        
        cliente.usado = true;
        cliente.fechaUso = new Date().toISOString();
        localStorage.setItem('clientes', JSON.stringify(clientes));
        
        const verificationResult = document.getElementById('verification-result');
        const resultTitle = document.getElementById('result-title');
        const resultMessage = document.getElementById('result-message');
        const clientDetails = document.getElementById('client-details');
        
        if (verificationResult && resultTitle && resultMessage && clientDetails) {
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
        }
        
        playBeepSound();
        
    } else {
        const verificationResult = document.getElementById('verification-result');
        const resultTitle = document.getElementById('result-title');
        const resultMessage = document.getElementById('result-message');
        const clientDetails = document.getElementById('client-details');
        
        if (verificationResult && resultTitle && resultMessage && clientDetails) {
            verificationResult.className = 'verification-result error';
            resultTitle.textContent = '❌ CÓDIGO INVÁLIDO';
            resultMessage.textContent = 'El código no está registrado en nuestra base de datos.';
            clientDetails.innerHTML = '';
            verificationResult.style.display = 'block';
        }
    }
    
    const codigoManual = document.getElementById('codigo-manual');
    if (codigoManual) codigoManual.value = '';
    
    setTimeout(() => {
        const verificationResult = document.getElementById('verification-result');
        if (verificationResult) verificationResult.style.display = 'none';
    }, 8000);
    
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

async function autorizarReingresoCliente(identificacion) {
    console.log('🔄 Intentando autorizar reingreso para:', identificacion);
    
    const cliente = clientes.find(c => c.identificacion === identificacion);
    
    if (!cliente) {
        alert('❌ Cliente no encontrado');
        return;
    }
    
    if (!codigosUsados.includes(identificacion)) {
        alert('ℹ️ Este cliente aún no ha ingresado por primera vez');
        return;
    }
    
    const confirmar = confirm(`¿Autorizar reingreso para ${cliente.nombre} (${identificacion})?\n\nEl cliente podrá ingresar nuevamente al evento.`);
    
    if (confirmar) {
        const index = codigosUsados.indexOf(identificacion);
        if (index > -1) {
            // Remover de códigos usados para permitir reingreso
            codigosUsados.splice(index, 1);
            localStorage.setItem('codigosUsados', JSON.stringify(codigosUsados));
            
            // Actualizar datos del cliente
            cliente.reingresoAutorizado = true;
            cliente.fechaReingreso = new Date().toISOString();
            localStorage.setItem('clientes', JSON.stringify(clientes));
            
            alert(`✅ Reingreso autorizado para ${cliente.nombre}\n\nAhora puede ingresar nuevamente al evento.`);
            
            // Actualizar interfaz
            actualizarEstadisticas();
            
            // Recargar la lista manteniendo el filtro actual
            const buscarCliente = document.getElementById('buscar-cliente');
            const filtroActual = buscarCliente ? buscarCliente.value.trim() : '';
            cargarListaClientes(filtroActual);
            
            // Limpiar input de reingreso
            const codigoReingreso = document.getElementById('codigo-reingreso');
            if (codigoReingreso) codigoReingreso.value = '';

            // Sincronizar con Supabase
            await subirCambiosASupabase();
            
            console.log('✅ Reingreso autorizado exitosamente');
        }
    } else {
        console.log('❌ Reingreso cancelado por el usuario');
    }
}