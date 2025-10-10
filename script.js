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
    document.getElementById('gestionar-section').classList.add('active');
    document.getElementById('ingresar-section').classList.remove('active');
    document.getElementById('verificar-section').classList.remove('active');
    stopCamera();
    actualizarEstadisticas();
    cargarListaClientes();
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

// ... (EL RESTO DE LAS FUNCIONES DE LA APP PRINCIPAL SE MANTIENEN IGUAL)
// [Aquí va todo el resto de tu código original de la app principal]
// startCamera, stopCamera, verificarCodigo, actualizarEstadisticas, etc.

// ========== SISTEMA DE SINCRONIZACIÓN ==========
let sincronizacionActiva = false;

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
    const codigo = document.getElementById('codigo-manual')?.value.trim();
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
    const listaClientes = document.getElementById('lista-clientes');
    if (!listaClientes) return;
    
    listaClientes.innerHTML = '<div class="no-clientes">Funcionalidad de lista cargada</div>';
}

function autorizarReingreso() {
    alert('Funcionalidad de reingreso');
}

// Funciones de cámara básicas
async function startCamera() {
    try {
        stopCamera();
        
        console.log('🎥 Iniciando cámara...');
        
        const constraints = {
            video: { 
                facingMode: "environment",
                width: { ideal: 1280 },
                height: { ideal: 720 },
                frameRate: { ideal: 24 }
            } 
        };

        stream = await navigator.mediaDevices.getUserMedia(constraints);
        
        // CONFIGURAR VIDEO PRINCIPAL
        const video = document.getElementById('video');
        const cameraPlaceholder = document.getElementById('camera-placeholder');
        const canvas = document.getElementById('canvas');
        const btnStartCamera = document.getElementById('btn-start-camera');
        const btnStopCamera = document.getElementById('btn-stop-camera');
        
        video.srcObject = stream;
        video.style.display = 'block';
        video.style.width = '100%';
        video.style.height = '100%';
        video.style.objectFit = 'cover';
        
        // OCULTAR ELEMENTOS QUE CAUSAN DUPLICACIÓN
        if (cameraPlaceholder) cameraPlaceholder.style.display = 'none';
        if (canvas) canvas.style.display = 'none';
        
        if (btnStartCamera) btnStartCamera.style.display = 'none';
        if (btnStopCamera) btnStopCamera.style.display = 'inline-block';
        
        // AGREGAR OVERLAY CON TRANSPARENCIA
        agregarOverlayConTransparencia();
        
        video.addEventListener('loadedmetadata', () => {
            video.play().then(() => {
                console.log('✅ Video listo, iniciando escaneo...');
                // Configurar canvas EN MEMORIA (no visible)
                if (canvas) {
                    canvas.width = 320;
                    canvas.height = 240;
                }
                startQRScanning();
            });
        });
        
    } catch (err) {
        console.error('Error al acceder a la cámara:', err);
        const cameraPlaceholder = document.getElementById('camera-placeholder');
        if (cameraPlaceholder) {
            cameraPlaceholder.innerHTML = '❌ Error: ' + err.message;
            cameraPlaceholder.style.display = 'block';
        }
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
    
    const video = document.getElementById('video');
    const canvas = document.getElementById('canvas');
    const cameraPlaceholder = document.getElementById('camera-placeholder');
    const btnStartCamera = document.getElementById('btn-start-camera');
    const btnStopCamera = document.getElementById('btn-stop-camera');
    
    if (video) {
        video.srcObject = null;
        video.style.display = 'none';
    }
    if (canvas) canvas.style.display = 'none';
    if (cameraPlaceholder) {
        cameraPlaceholder.style.display = 'block';
        cameraPlaceholder.textContent = 'Cámara no activada';
    }
    if (btnStartCamera) btnStartCamera.style.display = 'inline-block';
    if (btnStopCamera) btnStopCamera.style.display = 'none';
    
    scanning = false;
    
    // Remover overlay
    const overlay = document.getElementById('scan-overlay');
    if (overlay) {
        overlay.remove();
    }
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

