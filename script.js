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

// INICIALIZAR APP
document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 Iniciando NEXUS...');
    setupEventListeners();
    checkAuthStatus();
});

// ========== AUTENTICACIÓN ==========
function hashPassword(p) { 
    return btoa(unescape(encodeURIComponent(p))); 
}

async function handleLogin() {
    const username = getValue('login-username');
    const password = getValue('login-password');
    
    if (!username || !password) {
        showMessage('Completa todos los campos', 'error');
        return;
    }

    showMessage('Verificando credenciales...', 'info');
    
    try {
        const { data, error } = await supabase
            .from('nexus_usuarios')
            .select('*')
            .eq('username', username)
            .single();

        if (error) {
            showMessage('Usuario no encontrado', 'error');
            return;
        }

        if (data.password_hash === hashPassword(password)) {
            usuarioActual = { 
                id: data.id, 
                username: data.username,
                fechaRegistro: data.fecha_registro
            };
            
            sessionStorage.setItem('nexus_usuario_actual', JSON.stringify(usuarioActual));
            showApp();
            showMessage('¡Bienvenido!', 'success');
        } else {
            showMessage('Contraseña incorrecta', 'error');
        }
    } catch (error) {
        showMessage('Error de conexión', 'error');
        console.error('Login error:', error);
    }
}

async function handleRegister() {
    const username = getValue('register-username');
    const password = getValue('register-password');
    const organizerCode = getValue('organizer-code');
    
    if (!username || !password || !organizerCode) {
        showMessage('Completa todos los campos', 'error');
        return;
    }

    if (password.length < 6) {
        showMessage('La contraseña debe tener al menos 6 caracteres', 'error');
        return;
    }

    if (organizerCode !== ORGANIZER_CODE) {
        showMessage('Código de organizador incorrecto', 'error');
        return;
    }

    showMessage('Creando cuenta...', 'info');

    try {
        // Verificar si usuario existe
        const { data: existingUser, error: checkError } = await supabase
            .from('nexus_usuarios')
            .select('username')
            .eq('username', username)
            .single();

        if (existingUser) {
            showMessage('Este usuario ya existe', 'error');
            return;
        }

        // Crear nuevo usuario
        const passwordHash = hashPassword(password);
        const { data, error } = await supabase
            .from('nexus_usuarios')
            .insert([{ 
                username: username, 
                password_hash: passwordHash 
            }])
            .select()
            .single();

        if (error) {
            showMessage('Error creando la cuenta: ' + error.message, 'error');
            return;
        }

        showMessage('¡Cuenta creada exitosamente! Ahora puedes iniciar sesión.', 'success');
        
        // Volver al login
        setTimeout(() => {
            showForm('login-form');
            clearForm('register-form');
            setValue('login-username', username);
            setValue('login-password', '');
        }, 2000);

    } catch (error) {
        showMessage('Error de conexión con el servidor', 'error');
        console.error('Register error:', error);
    }
}

function handleLogout() {
    usuarioActual = null;
    sessionStorage.removeItem('nexus_usuario_actual');
    showLogin();
    showMessage('Sesión cerrada correctamente', 'success');
}

// ========== GESTIÓN DE CLIENTES ==========
async function handleClientFormSubmit(e) {
    e.preventDefault();
    
    const nombre = getValue('nombre');
    const identificacion = getValue('identificacion');
    const telefono = getValue('telefono');
    
    if (!nombre || !identificacion || !telefono) {
        alert('Por favor complete todos los campos');
        return;
    }
    
    // Verificar si ya existe
    const clienteExistente = clientes.find(cliente => cliente.identificacion === identificacion);
    
    if (clienteExistente) {
        if (codigosUsados.includes(identificacion)) {
            alert('⚠️ Este número de identificación YA FUE USADO para ingresar al evento y no puede reutilizarse.');
            return;
        }
        
        const confirmar = confirm('Este número de identificación ya está registrado. ¿Desea generar un nuevo QR?');
        if (confirmar) {
            generarQR(identificacion);
            setText('qr-message', `QR para: ${clienteExistente.nombre} (Activo)`);
            return;
        }
        return;
    }
    
    // Crear nuevo cliente
    const nuevoCliente = {
        id: Date.now(),
        nombre: nombre,
        identificacion: identificacion,
        telefono: telefono,
        fechaRegistro: new Date().toISOString(),
        usado: false
    };
    
    clientes.push(nuevoCliente);
    localStorage.setItem('clientes', JSON.stringify(clientes));
    
    generarQR(identificacion);
    setText('qr-message', `QR generado para: ${nombre} (Activo)`);
    
    // Limpiar formulario
    e.target.reset();
    
    // Sincronizar con Supabase
    await sincronizarConSupabase();
}

function generarQR(identificacion) {
    const qrcodeElement = getElement('qrcode');
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
        canvas.style.border = '2px solid #8b5cf6';
        canvas.style.borderRadius = '10px';
        canvas.style.background = 'white';
        canvas.style.padding = '10px';
        canvas.style.display = 'block';
        canvas.style.margin = '0 auto';
        
        const ctx = canvas.getContext('2d');
        
        // Fondo blanco
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, qrSize, qrSize);
        
        // Código QR negro
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
        qrcodeElement.innerHTML = '<p style="color: #ef4444; font-weight: bold; text-align: center;">Error al generar QR</p>';
    }
}

// ========== CÁMARA Y VERIFICACIÓN ==========
async function startCamera() {
    try {
        stopCamera();
        
        console.log('🎥 Iniciando cámara...');
        const constraints = {
            video: { 
                facingMode: "environment",
                width: { ideal: 1280 },
                height: { ideal: 720 }
            } 
        };

        stream = await navigator.mediaDevices.getUserMedia(constraints);
        
        const video = getElement('video');
        video.srcObject = stream;
        showElement(video);
        hideElement(getElement('camera-placeholder'));
        hideElement(getElement('btn-start-camera'));
        showElement(getElement('btn-stop-camera'));
        
        video.addEventListener('loadedmetadata', () => {
            video.play().then(() => {
                console.log('✅ Video listo, iniciando escaneo...');
                startQRScanning();
            });
        });
        
    } catch (err) {
        console.error('Error al acceder a la cámara:', err);
        const placeholder = getElement('camera-placeholder');
        placeholder.innerHTML = '❌ Error: ' + err.message;
        showElement(placeholder);
    }
}

function stopCamera() {
    if (stream) {
        stream.getTracks().forEach(track => track.stop());
        stream = null;
    }
    
    scanning = false;
    
    hideElement(getElement('video'));
    showElement(getElement('camera-placeholder'));
    showElement(getElement('btn-start-camera'));
    hideElement(getElement('btn-stop-camera'));
}

function startQRScanning() {
    scanning = true;
    scanQRCode();
}

function scanQRCode() {
    if (!scanning || !stream) return;
    
    const video = getElement('video');
    const canvas = getElement('canvas');
    
    if (video.readyState === video.HAVE_ENOUGH_DATA) {
        // Configurar canvas
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const context = canvas.getContext('2d');
        context.drawImage(video, 0, 0, canvas.width, canvas.height);
        
        try {
            const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
            const code = jsQR(imageData.data, imageData.width, imageData.height, {
                inversionAttempts: "dontInvert",
            });
            
            if (code) {
                console.log('✅ QR detectado:', code.data);
                verificarCodigo(code.data);
                stopCamera();
                return;
            }
        } catch (error) {
            // Silenciar errores de escaneo
        }
    }
    
    if (scanning) {
        requestAnimationFrame(scanQRCode);
    }
}

async function verificarCodigo(codigo) {
    const verificationResult = getElement('verification-result');
    const resultTitle = getElement('result-title');
    const resultMessage = getElement('result-message');
    const clientDetails = getElement('client-details');
    
    if (codigosUsados.includes(codigo)) {
        // Código ya usado
        verificationResult.className = 'result-card error';
        resultTitle.textContent = '❌ CÓDIGO YA USADO';
        resultMessage.textContent = 'Este código QR ya fue utilizado para ingresar al evento.';
        clientDetails.innerHTML = `
            <p><strong>Acceso denegado:</strong> Código de un solo uso</p>
            <p><strong>Medida de seguridad:</strong> Evita reutilización fraudulenta</p>
        `;
        showElement(verificationResult);
        
    } else {
        const cliente = clientes.find(c => c.identificacion === codigo);
        
        if (cliente) {
            // Código válido
            codigosUsados.push(codigo);
            localStorage.setItem('codigosUsados', JSON.stringify(codigosUsados));
            
            cliente.usado = true;
            cliente.fechaUso = new Date().toISOString();
            localStorage.setItem('clientes', JSON.stringify(clientes));
            
            verificationResult.className = 'result-card success';
            resultTitle.textContent = '✅ ACCESO AUTORIZADO';
            resultMessage.textContent = 'Bienvenido/a al evento';
            clientDetails.innerHTML = `
                <p><strong>Nombre:</strong> ${cliente.nombre}</p>
                <p><strong>Identificación:</strong> ${cliente.identificacion}</p>
                <p><strong>Teléfono:</strong> ${cliente.telefono}</p>
                <p><strong>Hora de ingreso:</strong> ${new Date().toLocaleTimeString()}</p>
                <p><strong>⚠️ Este código ya no podrá ser reutilizado</strong></p>
            `;
            showElement(verificationResult);
            
        } else {
            // Código inválido
            verificationResult.className = 'result-card error';
            resultTitle.textContent = '❌ CÓDIGO INVÁLIDO';
            resultMessage.textContent = 'El código no está registrado en nuestra base de datos.';
            clientDetails.innerHTML = '';
            showElement(verificationResult);
        }
    }
    
    // Limpiar y ocultar después de 8 segundos
    setValue('codigo-manual', '');
    setTimeout(() => {
        hideElement(verificationResult);
    }, 8000);
    
    // Sincronizar cambios
    await sincronizarConSupabase();
}

function handleManualVerification() {
    const codigo = getValue('codigo-manual');
    if (!codigo) {
        alert('Por favor ingrese un código para verificar');
        return;
    }
    verificarCodigo(codigo);
}

// ========== GESTIÓN Y ESTADÍSTICAS ==========
function actualizarEstadisticas() {
    const total = clientes.length;
    const usados = codigosUsados.length;
    const pendientes = total - usados;
    
    setText('total-registrados', total);
    setText('total-ingresaron', usados);
    setText('total-pendientes', pendientes);
}

function cargarListaClientes(filtro = '') {
    const listaClientes = getElement('lista-clientes');
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
        listaClientes.innerHTML = '<div class="empty-state">No se encontraron clientes</div>';
        return;
    }
    
    clientesFiltrados.forEach(cliente => {
        const usado = codigosUsados.includes(cliente.identificacion);
        const item = document.createElement('div');
        item.className = `client-item ${usado ? 'used' : ''}`;
        
        item.innerHTML = `
            <div class="client-info">
                <h4>${cliente.nombre}</h4>
                <p><strong>ID:</strong> ${cliente.identificacion}</p>
                <p><strong>Teléfono:</strong> ${cliente.telefono}</p>
                <p><strong>Registro:</strong> ${new Date(cliente.fechaRegistro).toLocaleString()}</p>
                ${usado ? `<p><strong>Último ingreso:</strong> ${cliente.fechaUso ? new Date(cliente.fechaUso).toLocaleString() : 'Fecha no registrada'}</p>` : ''}
            </div>
            <div class="client-actions">
                <span class="status-badge ${usado ? 'used' : ''}">
                    ${usado ? '✅ YA INGRESÓ' : '⏳ PENDIENTE'}
                </span>
                ${usado ? `<button class="btn warning small" onclick="autorizarReingresoCliente('${cliente.identificacion}')">Permitir Reingreso</button>` : ''}
            </div>
        `;
        
        listaClientes.appendChild(item);
    });
}

function buscarClientes() {
    const filtro = getValue('buscar-cliente');
    cargarListaClientes(filtro);
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
    
    const confirmar = confirm(`¿Autorizar reingreso para ${cliente.nombre} (${identificacion})?\n\nEl cliente podrá ingresar nuevamente al evento.`);
    
    if (confirmar) {
        const index = codigosUsados.indexOf(identificacion);
        if (index > -1) {
            codigosUsados.splice(index, 1);
            localStorage.setItem('codigosUsados', JSON.stringify(codigosUsados));
            
            cliente.reingresoAutorizado = true;
            cliente.fechaReingreso = new Date().toISOString();
            localStorage.setItem('clientes', JSON.stringify(clientes));
            
            alert(`✅ Reingreso autorizado para ${cliente.nombre}\n\nAhora puede ingresar nuevamente al evento.`);
            
            actualizarEstadisticas();
            cargarListaClientes(getValue('buscar-cliente'));
            setValue('codigo-reingreso', '');

            await sincronizarConSupabase();
        }
    }
}

function autorizarReingreso() {
    const codigo = getValue('codigo-reingreso');
    if (!codigo) {
        alert('Por favor ingrese un código para autorizar reingreso');
        return;
    }
    autorizarReingresoCliente(codigo);
}

// ========== SINCRONIZACIÓN SUPABASE ==========
async function sincronizarConSupabase() {
    try {
        console.log('🔄 Sincronizando con Supabase...');
        showSyncStatus('Sincronizando...', 'syncing');
        
        const { data, error } = await supabase
            .from('event_data')
            .upsert({
                id: 'main',
                clientes: clientes,
                codigos_usados: codigosUsados,
                ultima_actualizacion: new Date().toISOString()
            }, {
                onConflict: 'id'
            })
            .select();

        if (error) {
            console.error('❌ Error sincronizando:', error);
            showSyncStatus('Error de sincronización', 'error');
            throw error;
        }
        
        console.log('✅ Sincronización exitosa');
        showSyncStatus('Sincronizado', 'success');
        
        setTimeout(() => {
            hideElement(getElement('sync-status'));
        }, 3000);
        
        return data;
        
    } catch (error) {
        console.error('💥 Error en sincronización:', error);
        showSyncStatus('Error de conexión', 'error');
        
        setTimeout(() => {
            hideElement(getElement('sync-status'));
        }, 5000);
        
        throw error;
    }
}

async function cargarDesdeSupabase() {
    try {
        console.log('📥 Cargando datos desde Supabase...');
        
        const { data, error } = await supabase
            .from('event_data')
            .select('*')
            .eq('id', 'main')
            .single();

        if (error && error.code !== 'PGRST116') {
            console.error('❌ Error cargando datos:', error);
            return;
        }

        if (data) {
            console.log('✅ Datos cargados desde Supabase');
            clientes = data.clientes || [];
            codigosUsados = data.codigos_usados || [];
            
            localStorage.setItem('clientes', JSON.stringify(clientes));
            localStorage.setItem('codigosUsados', JSON.stringify(codigosUsados));
            
            actualizarEstadisticas();
            cargarListaClientes();
        }
        
    } catch (error) {
        console.error('💥 Error cargando datos:', error);
    }
}

async function sincronizacionForzada() {
    try {
        showSyncStatus('Sincronización forzada...', 'syncing');
        
        // Primero subir datos locales
        await sincronizarConSupabase();
        
        // Pequeña pausa
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Luego descargar datos actualizados
        await cargarDesdeSupabase();
        
        alert('✅ Sincronización forzada completada');
        
    } catch (error) {
        alert('❌ Error en sincronización forzada');
        console.error(error);
    }
}

async function limpiarBaseDatos() {
    const confirmacion = confirm(`⚠️ ¿ESTÁS ABSOLUTAMENTE SEGURO?\n\nEsta acción:\n• Eliminará TODOS los clientes (${clientes.length} registros)\n• Eliminará TODOS los códigos usados (${codigosUsados.length} códigos)\n• Se sincronizará con todos los dispositivos\n\n¿Continuar?`);
    
    if (!confirmacion) {
        console.log('❌ Limpieza cancelada por el usuario');
        return;
    }
    
    try {
        // Limpiar datos locales
        clientes = [];
        codigosUsados = [];
        localStorage.removeItem('clientes');
        localStorage.removeItem('codigosUsados');
        
        // Limpiar interfaz
        const qrcodeElement = getElement('qrcode');
        qrcodeElement.innerHTML = '';
        setText('qr-message', 'El código QR aparecerá aquí después del registro');
        
        // Actualizar estadísticas y lista
        actualizarEstadisticas();
        cargarListaClientes();
        
        // Sincronizar con Supabase - ESTA ES LA PARTE CLAVE QUE FALTABA
        await sincronizarConSupabase();
        
        alert(`✅ Base de datos limpiada completamente\n\nSe ha sincronizado con todos los dispositivos.`);
        
        console.log('✅ Base de datos limpiada exitosamente');
        
    } catch (error) {
        console.error('❌ Error limpiando base de datos:', error);
        alert('❌ Error al limpiar la base de datos. Revisa la consola para más detalles.');
    }
}

function showSyncStatus(text, type) {
    const status = getElement('sync-status');
    if (status) {
        status.textContent = text;
        status.className = `sync-status ${type}`;
        showElement(status);
    }
}

// ========== RECUPERACIÓN DE CONTRASEÑA ==========
async function handlePasswordRecovery() {
    const username = getValue('recover-username');
    const organizerCode = getValue('recover-organizer-code');
    const newPassword = getValue('new-password');
    const confirmPassword = getValue('confirm-password');

    if (!username || !organizerCode || !newPassword || !confirmPassword) {
        showMessage('Por favor completa todos los campos', 'error');
        return;
    }

    if (organizerCode !== ORGANIZER_CODE) {
        showMessage('Código de organizador incorrecto', 'error');
        return;
    }

    if (newPassword.length < 6) {
        showMessage('La nueva contraseña debe tener al menos 6 caracteres', 'error');
        return;
    }

    if (newPassword !== confirmPassword) {
        showMessage('Las contraseñas no coinciden', 'error');
        return;
    }

    try {
        showMessage('Verificando usuario...', 'info');

        // Buscar usuario en Supabase
        const { data: user, error } = await supabase
            .from('nexus_usuarios')
            .select('*')
            .eq('username', username)
            .single();

        if (error) {
            showMessage('Usuario no encontrado', 'error');
            return;
        }

        // Actualizar contraseña
        const passwordHash = hashPassword(newPassword);
        const { error: updateError } = await supabase
            .from('nexus_usuarios')
            .update({ password_hash: passwordHash })
            .eq('username', username);

        if (updateError) {
            showMessage('Error al actualizar la contraseña', 'error');
            return;
        }

        showMessage('✅ Contraseña restablecida exitosamente. Ahora puedes iniciar sesión.', 'success');
        
        // Volver al login
        setTimeout(() => {
            showForm('login-form');
            setValue('login-username', username);
            clearForm('recover-form');
        }, 3000);

    } catch (error) {
        console.error('Error en recuperación:', error);
        showMessage('Error de conexión con el servidor', 'error');
    }
}

// ========== NAVEGACIÓN Y UI ==========
function showScreen(screenId) {
    // Ocultar todas las pantallas
    document.querySelectorAll('.screen').forEach(screen => {
        screen.classList.remove('active');
    });
    
    // Mostrar la pantalla específica
    const screen = document.getElementById(screenId);
    if (screen) {
        screen.classList.add('active');
    }
}

function showForm(formId) {
    // Ocultar todos los formularios
    const forms = ['login-form', 'register-form', 'recover-form'];
    forms.forEach(id => {
        const form = document.getElementById(id);
        if (form) form.style.display = 'none';
    });
    
    // Mostrar el formulario específico
    const form = document.getElementById(formId);
    if (form) {
        form.style.display = 'block';
    }
}

function showSection(sectionId) {
    // Actualizar navegación
    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    
    const activeBtn = document.querySelector(`[data-section="${sectionId}"]`);
    if (activeBtn) {
        activeBtn.classList.add('active');
    }
    
    // Ocultar todas las secciones
    document.querySelectorAll('.content-section').forEach(section => {
        section.classList.remove('active');
    });
    
    // Mostrar sección específica
    const section = document.getElementById(sectionId);
    if (section) {
        section.classList.add('active');
    }
    
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
    console.log('📱 Iniciando aplicación principal...');
    setupMainEventListeners();
    
    // Cargar datos de Supabase al iniciar
    cargarDesdeSupabase();
    
    // Mostrar último QR si existe
    if (clientes.length > 0) {
        const ultimoCliente = clientes[clientes.length - 1];
        if (!codigosUsados.includes(ultimoCliente.identificacion)) {
            generarQR(ultimoCliente.identificacion);
            setText('qr-message', `QR para: ${ultimoCliente.nombre} (Activo)`);
        }
    }
}

// ========== UTILIDADES ==========
function getElement(id) {
    return document.getElementById(id);
}

function getValue(id) {
    const element = getElement(id);
    return element ? element.value.trim() : '';
}

function setValue(id, value) {
    const element = getElement(id);
    if (element) element.value = value;
}

function setText(id, text) {
    const element = getElement(id);
    if (element) element.textContent = text;
}

function showElement(element) {
    if (element) element.classList.remove('hidden');
}

function hideElement(element) {
    if (element) element.classList.add('hidden');
}

function clearForm(formId) {
    const form = getElement(formId);
    if (form) form.reset();
}

function showMessage(text, type) {
    const messageElement = getElement('login-message');
    if (messageElement) {
        messageElement.textContent = text;
        messageElement.className = `message ${type}`;
        showElement(messageElement);
        
        // Ocultar después de 5 segundos
        setTimeout(() => {
            hideElement(messageElement);
        }, 5000);
    }
}

// ========== EVENT LISTENERS ==========
function setupEventListeners() {
    console.log('🔧 Configurando event listeners...');
    
    // Auth listeners
    const authElements = {
        'btn-login': handleLogin,
        'btn-register': handleRegister,
        'btn-show-register': () => showForm('register-form'),
        'btn-show-login': () => showForm('login-form'),
        'btn-olvide-password': () => showForm('recover-form'),
        'btn-show-login-from-recover': () => showForm('login-form'),
        'btn-recover-password': handlePasswordRecovery,
        'btn-logout': handleLogout
    };

    Object.entries(authElements).forEach(([id, handler]) => {
        const element = getElement(id);
        if (element) {
            element.addEventListener('click', handler);
        }
    });

    // Enter keys
    const enterHandlers = {
        'login-password': handleLogin,
        'organizer-code': handleRegister,
        'confirm-password': handlePasswordRecovery
    };

    Object.entries(enterHandlers).forEach(([id, handler]) => {
        const element = getElement(id);
        if (element) {
            element.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    handler();
                }
            });
        }
    });
}

function setupMainEventListeners() {
    console.log('🔧 Configurando event listeners principales...');
    
    // Navegación
    const navButtons = ['btn-ingresar', 'btn-verificar', 'btn-gestionar'];
    navButtons.forEach(id => {
        const element = getElement(id);
        if (element) {
            element.addEventListener('click', () => {
                showSection(element.dataset.section);
            });
        }
    });

    // Formularios y botones
    const mainHandlers = {
        'client-form': (el) => el.addEventListener('submit', handleClientFormSubmit),
        'btn-verificar-manual': handleManualVerification,
        'btn-start-camera': startCamera,
        'btn-stop-camera': stopCamera,
        'btn-buscar': buscarClientes,
        'btn-autorizar-reingreso': autorizarReingreso,
        'btn-forzar-sincronizacion': sincronizarConSupabase,
        'btn-sincronizacion-forzada': sincronizacionForzada,
        'btn-limpiar-db': limpiarBaseDatos
    };

    Object.entries(mainHandlers).forEach(([id, handler]) => {
        const element = getElement(id);
        if (element) {
            if (typeof handler === 'function') {
                element.addEventListener('click', handler);
            } else {
                handler(element);
            }
        }
    });

    // Búsqueda con Enter
    const buscarInput = getElement('buscar-cliente');
    if (buscarInput) {
        buscarInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                buscarClientes();
            }
        });
    }
}

// DEBUG FUNCTION - EJECUTAR EN CONSOLA
function debugSupabase() {
    console.log('🐛 DEBUG SUPABASE');
    console.log('Usuario actual:', usuarioActual);
    console.log('Clientes locales:', clientes.length);
    console.log('Códigos locales:', codigosUsados.length);
    
    supabase.from('event_data').select('*').eq('id', 'main').single().then(({data, error}) => {
        if (error) {
            console.log('❌ Error Supabase:', error);
        } else if (data) {
            console.log('✅ Datos en Supabase:');
            console.log('- Clientes:', data.clientes?.length || 0);
            console.log('- Códigos:', data.codigos_usados?.length || 0);
            console.log('- Última actualización:', data.ultima_actualizacion);
        } else {
            console.log('❌ No hay datos en Supabase');
        }
    });
}