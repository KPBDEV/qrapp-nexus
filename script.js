// ========== CONFIGURACIÓN SUPABASE ==========
const SUPABASE_URL = 'https://zefsmzxlhgfvmdydutzp.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InplZnNtenhsaGdmdm1keWR1dHpwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk5ODE1NDIsImV4cCI6MjA3NTU1NzU0Mn0.nm7syRkN1ZBnJ5QLk4QStITuUB1cjHZjNfrPA99CpdI';

// Inicializar Supabase
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// ========== SISTEMA DE AUTENTICACIÓN NEXUS ==========
const ORGANIZER_CODE = "NEXUS.082208";

// Variables globales (se inicializarán después)
let loginScreen, appContainer, loginForm, registerForm;
let btnShowRegister, btnShowLogin, btnLogin, btnRegister, btnLogout;
let userWelcome, loginMessage;

// Usuario actual
let usuarioActual = JSON.parse(sessionStorage.getItem('nexus_usuario_actual')) || null;

// ========== FUNCIONES DE AUTENTICACIÓN CON SUPABASE ==========

// Función para hashear contraseña
function hashPassword(password) {
    return btoa(unescape(encodeURIComponent(password)));
}

// Manejar login CON SUPABASE
async function handleLogin() {
    console.log('🎯 handleLogin ejecutándose...');
    
    const username = document.getElementById('login-username').value.trim();
    const password = document.getElementById('login-password').value.trim();

    console.log('📝 Datos:', { username, password });

    if (!username || !password) {
        showAuthMessage('Por favor completa todos los campos', 'error');
        return;
    }

    try {
        showAuthMessage('Verificando credenciales...', 'info');
        
        // Buscar usuario en Supabase
        const { data, error } = await supabase
            .from('nexus_usuarios')
            .select('*')
            .eq('username', username)
            .single();

        console.log('📡 Respuesta Supabase:', { data, error });

        if (error) {
            console.log('❌ Error Supabase:', error);
            if (error.code === 'PGRST116') {
                showAuthMessage('Usuario no encontrado', 'error');
            } else {
                showAuthMessage('Error de conexión: ' + error.message, 'error');
            }
            return;
        }

        // Verificar contraseña
        const passwordHash = hashPassword(password);
        console.log('🔐 Verificando contraseña:', { 
            inputHash: passwordHash, 
            dbHash: data.password_hash 
        });

        if (data.password_hash === passwordHash) {
            usuarioActual = {
                id: data.id,
                username: data.username,
                fechaRegistro: data.fecha_registro
            };
            
            sessionStorage.setItem('nexus_usuario_actual', JSON.stringify(usuarioActual));
            console.log('✅ Login exitoso:', usuarioActual);
            showApp();
            showAuthMessage('¡Bienvenido!', 'success');
        } else {
            console.log('❌ Contraseña incorrecta');
            showAuthMessage('Contraseña incorrecta', 'error');
        }

    } catch (error) {
        console.error('💥 Error en login:', error);
        showAuthMessage('Error de conexión con el servidor', 'error');
    }
}

// Manejar registro CON SUPABASE
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

        // Verificar si el usuario ya existe en SUPABASE
        const { data: existingUsers, error: checkError } = await supabase
            .from('nexus_usuarios')
            .select('username')
            .eq('username', username);

        if (checkError) {
            console.log('Error en verificación:', checkError);
        }

        // Si encuentra algún usuario, existe
        if (existingUsers && existingUsers.length > 0) {
            showAuthMessage('Este usuario ya existe', 'error');
            return;
        }

        // Crear nuevo usuario
        const passwordHash = hashPassword(password);
        const { data, error } = await supabase
            .from('nexus_usuarios')
            .insert([
                {
                    username: username,
                    password_hash: passwordHash
                }
            ])
            .select();

        if (error) {
            if (error.code === '23505') {
                showAuthMessage('Este usuario ya existe', 'error');
            } else {
                showAuthMessage('Error creando la cuenta: ' + error.message, 'error');
            }
            return;
        }

        showAuthMessage('¡Cuenta creada exitosamente! Ahora puedes iniciar sesión.', 'success');
        
        // Volver al login
        setTimeout(() => {
            registerForm.style.display = 'none';
            loginForm.style.display = 'block';
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

// Manejar logout
function handleLogout() {
    usuarioActual = null;
    sessionStorage.removeItem('nexus_usuario_actual');
    showLogin();
    showAuthMessage('Sesión cerrada correctamente', 'success');
}

// Mostrar mensajes de auth
function showAuthMessage(text, type) {
    loginMessage.textContent = text;
    loginMessage.style.display = 'block';
    loginMessage.style.color = type === 'error' ? '#ef4444' : 
                              type === 'success' ? '#10b981' : '#6366f1';
    loginMessage.style.fontWeight = '600';
}

// ========== INICIALIZACIÓN DE LA APLICACIÓN ==========
function initApp() {
    console.log('🚀 Inicializando aplicación NEXUS...');
    
    // Inicializar elementos DOM
    initializeDOMElements();
    
    // Configurar event listeners
    setupAuthEventListeners();
    
    // Verificar estado de autenticación
    checkAuthStatus();
    
    console.log('✅ Aplicación inicializada correctamente');
}

// Inicializar elementos DOM
function initializeDOMElements() {
    console.log('🔍 Inicializando elementos DOM...');
    
    loginScreen = document.getElementById('login-screen');
    appContainer = document.getElementById('app-container');
    loginForm = document.getElementById('login-form');
    registerForm = document.getElementById('register-form');
    btnShowRegister = document.getElementById('btn-show-register');
    btnShowLogin = document.getElementById('btn-show-login');
    btnLogin = document.getElementById('btn-login');
    btnRegister = document.getElementById('btn-register');
    btnLogout = document.getElementById('btn-logout');
    userWelcome = document.getElementById('user-welcome');
    loginMessage = document.getElementById('login-message');
    
    console.log('📋 Elementos cargados:', {
        loginScreen: !!loginScreen,
        appContainer: !!appContainer,
        loginForm: !!loginForm,
        registerForm: !!registerForm,
        btnShowRegister: !!btnShowRegister,
        btnShowLogin: !!btnShowLogin,
        btnLogin: !!btnLogin,
        btnRegister: !!btnRegister,
        btnLogout: !!btnLogout
    });
}

// Configurar event listeners de auth
function setupAuthEventListeners() {
    console.log('🔧 Configurando event listeners...');
    
    if (!btnLogin) {
        console.error('❌ btnLogin no encontrado!');
        return;
    }
    
    // Prevenir envío de formularios
    if (loginForm) {
        loginForm.addEventListener('submit', function(e) {
            e.preventDefault();
            console.log('📝 Formulario login prevenido');
        });
    }
    
    if (registerForm) {
        registerForm.addEventListener('submit', function(e) {
            e.preventDefault();
            console.log('📝 Formulario registro prevenido');
        });
    }
    
    // Configurar botones
    btnShowRegister.addEventListener('click', () => {
        console.log('🔄 Mostrar registro');
        loginForm.style.display = 'none';
        registerForm.style.display = 'block';
        loginMessage.style.display = 'none';
    });

    btnShowLogin.addEventListener('click', () => {
        console.log('🔄 Mostrar login');
        registerForm.style.display = 'none';
        loginForm.style.display = 'block';
        loginMessage.style.display = 'none';
    });

    btnLogin.addEventListener('click', function() {
        console.log('🎯 Botón login clickeado!');
        handleLogin();
    });
    
    btnRegister.addEventListener('click', function() {
        console.log('🎯 Botón registro clickeado!');
        handleRegister();
    });
    
    btnLogout.addEventListener('click', handleLogout);

    // Enter key en formularios
    const loginPassword = document.getElementById('login-password');
    const organizerCode = document.getElementById('organizer-code');
    
    if (loginPassword) {
        loginPassword.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                console.log('↵ Enter en password');
                handleLogin();
            }
        });
    }
    
    if (organizerCode) {
        organizerCode.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                console.log('↵ Enter en organizer-code');
                handleRegister();
            }
        });
    }

    console.log('✅ Event listeners configurados');
}

// Verificar estado de autenticación
function checkAuthStatus() {
    if (usuarioActual) {
        showApp();
    } else {
        showLogin();
    }
}

// Mostrar login
function showLogin() {
    console.log('👤 Mostrando pantalla de login');
    if (loginScreen) loginScreen.style.display = 'flex';
    if (appContainer) appContainer.style.display = 'none';
    if (loginForm) loginForm.style.display = 'block';
    if (registerForm) registerForm.style.display = 'none';
    if (loginMessage) loginMessage.style.display = 'none';
}

// Mostrar aplicación
function showApp() {
    console.log('📱 Mostrando aplicación principal');
    if (loginScreen) loginScreen.style.display = 'none';
    if (appContainer) appContainer.style.display = 'block';
    if (userWelcome && usuarioActual) userWelcome.textContent = `Bienvenido, ${usuarioActual.username}`;
    
    // Iniciar la app original
    initMainApp();
}

// ========== VARIABLES DE LA APP PRINCIPAL ==========

// Base de datos local como fallback
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

// ========== SISTEMA DE SINCRONIZACIÓN CON SUPABASE ==========
let sincronizacionActiva = false;

// ========== INICIALIZACIÓN DE LA APLICACIÓN ==========
function initApp() {
    setupAuthEventListeners();
    checkAuthStatus();
}

// Verificar estado de autenticación
function checkAuthStatus() {
    if (usuarioActual) {
        showApp();
    } else {
        showLogin();
    }
}

// Mostrar login
function showLogin() {
    loginScreen.style.display = 'flex';
    appContainer.style.display = 'none';
    loginForm.style.display = 'block';
    registerForm.style.display = 'none';
    loginMessage.style.display = 'none';
}

// Mostrar aplicación
function showApp() {
    loginScreen.style.display = 'none';
    appContainer.style.display = 'block';
    userWelcome.textContent = `Bienvenido, ${usuarioActual.username}`;
    
    // Iniciar la app original
    initMainApp();
}

// Configurar event listeners de auth
function setupAuthEventListeners() {
    btnShowRegister.addEventListener('click', () => {
        loginForm.style.display = 'none';
        registerForm.style.display = 'block';
        loginMessage.style.display = 'none';
    });

    btnShowLogin.addEventListener('click', () => {
        registerForm.style.display = 'none';
        loginForm.style.display = 'block';
        loginMessage.style.display = 'none';
    });

    btnLogin.addEventListener('click', handleLogin);
    btnRegister.addEventListener('click', handleRegister);
    btnLogout.addEventListener('click', handleLogout);

    // Enter key en formularios
    document.getElementById('login-password').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') handleLogin();
    });
    
    document.getElementById('organizer-code').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') handleRegister();
    });
}

// Manejar login
function handleLogin() {
    const username = document.getElementById('login-username').value.trim();
    const password = document.getElementById('login-password').value.trim();

    if (!username || !password) {
        showAuthMessage('Por favor completa todos los campos', 'error');
        return;
    }
}

// Manejar registro CON SUPABASE
// Manejar registro CON SUPABASE (VERSIÓN CORREGIDA)
async function handleRegister() {
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

        // VERIFICAR SI EL USUARIO YA EXISTE EN SUPABASE (CORREGIDO)
        const { data: existingUsers, error: checkError } = await supabase
            .from('nexus_usuarios')
            .select('username')
            .eq('username', username);

        if (checkError) {
            console.log('Error en verificación (puede ignorarse):', checkError);
            // Continuamos aunque haya error en la verificación
        }

        // Si encuentra algún usuario, existe
        if (existingUsers && existingUsers.length > 0) {
            showAuthMessage('Este usuario ya existe', 'error');
            return;
        }

        // Crear nuevo usuario
        const passwordHash = hashPassword(password);
        const { data, error } = await supabase
            .from('nexus_usuarios')
            .insert([
                {
                    username: username,
                    password_hash: passwordHash
                }
            ])
            .select();

        if (error) {
            if (error.code === '23505') { // Unique violation
                showAuthMessage('Este usuario ya existe', 'error');
            } else {
                showAuthMessage('Error creando la cuenta: ' + error.message, 'error');
            }
            return;
        }

        showAuthMessage('¡Cuenta creada exitosamente! Ahora puedes iniciar sesión.', 'success');
        
        // Volver al login
        setTimeout(() => {
            registerForm.style.display = 'none';
            loginForm.style.display = 'block';
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

// Manejar logout
function handleLogout() {
    usuarioActual = null;
    localStorage.removeItem('nexus_usuario_actual');
    showLogin();
    showAuthMessage('Sesión cerrada correctamente', 'success');
}

// Mostrar mensajes de auth
function showAuthMessage(text, type) {
    loginMessage.textContent = text;
    loginMessage.style.display = 'block';
    loginMessage.style.color = type === 'error' ? '#ef4444' : '#10b981';
    loginMessage.style.fontWeight = '600';
}

// ========== APLICACIÓN PRINCIPAL NEXUS ==========
function initMainApp() {
    console.log('Iniciando aplicación NEXUS...');
    console.log('Clientes registrados:', clientes.length);
    console.log('Códigos ya usados:', codigosUsados.length);
    
    setupMainEventListeners();
    iniciarSincronizacionAutomatica();
    
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

// Configurar event listeners principales
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
        if (e.key === 'Enter') {
            buscarClientes();
        }
    });

    // Agregar botón de limpieza para testing
    const limpiarBtn = document.createElement('button');
    limpiarBtn.textContent = '🗑️ Limpiar BD (Testing)';
    limpiarBtn.className = 'nexus-btn';
    limpiarBtn.style.background = '#ef4444';
    limpiarBtn.style.marginTop = '10px';
    limpiarBtn.onclick = limpiarBaseDatos;
    document.querySelector('.button-container').appendChild(limpiarBtn);
}

// ========== NAVEGACIÓN ENTRE SECCIONES ==========
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

// ========== GESTIÓN DE CLIENTES Y QR ==========
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
    
    console.log('Cliente registrado:', nuevoCliente);
    
    // Subir a Supabase después de guardar localmente
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

// ========== SISTEMA DE CÁMARA Y VERIFICACIÓN ==========
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
        video.srcObject = stream;
        video.style.display = 'block';
        video.style.width = '100%';
        video.style.height = '100%';
        video.style.objectFit = 'cover';
        
        // OCULTAR ELEMENTOS QUE CAUSAN DUPLICACIÓN
        cameraPlaceholder.style.display = 'none';
        canvas.style.display = 'none';
        
        btnStartCamera.style.display = 'none';
        btnStopCamera.style.display = 'inline-block';
        
        // AGREGAR OVERLAY CON TRANSPARENCIA
        agregarOverlayConTransparencia();
        
        video.addEventListener('loadedmetadata', () => {
            video.play().then(() => {
                console.log('✅ Video listo, iniciando escaneo...');
                // Configurar canvas EN MEMORIA (no visible)
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

// Overlay con transparencia
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
    scanner.appendChild(overlay);
}

// Escanear código QR
function scanQRCode() {
    if (!scanning || !stream) return;
    
    if (video.readyState === video.HAVE_ENOUGH_DATA) {
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

// Feedback visual cuando detecta QR
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
    
    // Remover overlay
    const overlay = document.getElementById('scan-overlay');
    if (overlay) {
        overlay.remove();
    }
}

function startQRScanning() {
    scanning = true;
    scanQRCode();
}

// Verificar código manualmente
function handleManualVerification() {
    const codigo = codigoManual.value.trim();
    
    if (!codigo) {
        alert('Por favor ingrese un código para verificar');
        return;
    }
    
    verificarCodigo(codigo);
}

// Función para verificar código
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
        
        setTimeout(() => {
            verificationResult.style.display = 'none';
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
    
    setTimeout(() => {
        verificationResult.style.display = 'none';
    }, 8000);
    
    // Subir a Supabase después de verificar
    await subirCambiosASupabase();
}

// Sonido de confirmación
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

// ========== GESTIÓN Y ESTADÍSTICAS ==========
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

// Autorizar reingreso desde input
function autorizarReingreso() {
    const codigo = codigoReingreso.value.trim();
    
    if (!codigo) {
        alert('Por favor ingrese un código para autorizar reingreso');
        return;
    }
    
    autorizarReingresoCliente(codigo);
}

// Autorizar reingreso de un cliente específico
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

            // Subir a Supabase después de autorizar reingreso
            await subirCambiosASupabase();
        }
    }
}

// ========== SINCRONIZACIÓN SUPABASE ==========
// Iniciar sincronización automática
async function iniciarSincronizacionAutomatica() {
    if (sincronizacionActiva || !usuarioActual) return;
    
    sincronizacionActiva = true;
    console.log('🔄 Sincronización Supabase iniciada');
    
    crearElementoEstado();
    await cargarDatosIniciales();
    escucharCambiosEnTiempoReal();
}

// Cargar datos iniciales desde Supabase
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
            // Crear documento inicial si no existe
            await crearDocumentoInicial();
        }
    } catch (error) {
        console.error('Error en carga inicial:', error);
    }
}

// Escuchar cambios en tiempo real
function escucharCambiosEnTiempoReal() {
    const subscription = supabase
        .channel('event-changes')
        .on('postgres_changes', 
            { 
                event: '*', 
                schema: 'public', 
                table: 'event_data',
                filter: 'id=eq.main'
            }, 
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

// Crear documento inicial
async function crearDocumentoInicial() {
    try {
        const { error } = await supabase
            .from('event_data')
            .insert([
                {
                    id: 'main',
                    clientes: clientes,
                    codigos_usados: codigosUsados,
                    ultima_actualizacion: new Date().toISOString()
                }
            ]);

        if (error) throw error;
        console.log('📝 Documento inicial creado en Supabase');
    } catch (error) {
        console.error('Error creando documento inicial:', error);
    }
}

// Subir cambios locales a Supabase
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

// Actualizar estado visual
function actualizarEstadoSincronizacion(estado) {
    const elemento = document.getElementById('estado-sincronizacion');
    if (!elemento) return;
    
    elemento.className = 'sincronizacion-estado ' + estado;
    
    switch(estado) {
        case 'sincronizado':
            elemento.innerHTML = '🟢 Sincronizado';
            break;
        case 'sincronizando':
            elemento.innerHTML = '🟡 Sincronizando...';
            break;
        case 'error':
            elemento.innerHTML = '🔴 Sin Supabase';
            break;
    }
}

function crearElementoEstado() {
    const elemento = document.createElement('div');
    elemento.id = 'estado-sincronizacion';
    elemento.className = 'sincronizacion-estado sincronizado';
    document.body.appendChild(elemento);
    return elemento;
}

// ========== FUNCIONES UTILITARIAS ==========
function actualizarInterfaz() {
    actualizarEstadisticas();
    
    if (gestionarSection.classList.contains('active')) {
        cargarListaClientes();
    }
    
    if (ingresarSection.classList.contains('active') && clientes.length > 0) {
        const ultimoCliente = clientes[clientes.length - 1];
        if (!codigosUsados.includes(ultimoCliente.identificacion)) {
            generarQR(ultimoCliente.identificacion);
            qrMessage.textContent = `QR para: ${ultimoCliente.nombre} (Activo)`;
        }
    }
}

// Limpiar base de datos (para testing)
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
        
        // También limpiar Supabase
        await subirCambiosASupabase();
    }
}

// ========== INICIALIZACIÓN FINAL ==========
document.addEventListener('DOMContentLoaded', initApp);