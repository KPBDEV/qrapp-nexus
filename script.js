// ========== CONFIGURACIÓN SUPABASE ==========
const SUPABASE_URL = 'https://zefsmzxlhgfvmdydutzp.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InplZnNtenhsaGdmdm1keWR1dHpwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk5ODE1NDIsImV4cCI6MjA3NTU1NzU0Mn0.nm7syRkN1ZBnJ5QLk4QStITuUB1cjHZjNfrPA99CpdI';

// Inicializar Supabase
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// Base de datos local como fallback
let clientes = JSON.parse(localStorage.getItem('clientes')) || [];
let codigosUsados = JSON.parse(localStorage.getItem('codigosUsados')) || [];

// Elementos DOM
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

// Iniciar sincronización automática
async function iniciarSincronizacionAutomatica() {
    if (sincronizacionActiva) return;
    
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

// ========== CÁMARA OPTIMIZADA ==========
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
        canvas.style.display = 'none'; // ← IMPORTANTE: OCULTAR CANVAS
        
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

// NUEVA FUNCIÓN CON TRANSPARENCIA
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

// AGREGAR OVERLAY VISUAL
function agregarOverlayEscanero() {
    const existingOverlay = document.getElementById('scan-overlay');
    if (existingOverlay) {
        existingOverlay.remove();
    }
    
    const overlay = document.createElement('div');
    overlay.id = 'scan-overlay';
    overlay.innerHTML = `
        <div class="scan-frame"></div>
        <div class="scan-line"></div>
        <div class="scan-text">Enfoca el código QR</div>
    `;
    
    const scanner = document.getElementById('scanner');
    scanner.style.position = 'relative';
    scanner.appendChild(overlay);
}

// ESCANEO OPTIMIZADO
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

// FEEDBACK VISUAL CUANDO DETECTA QR
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

// Desactivar cámara
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

// Escanear código QR con jsQR
function startQRScanning() {
    scanning = true;
    scanQRCode();
}

// ========== FUNCIONES PRINCIPALES ==========

// Inicialización de la aplicación
function initApp() {
    console.log('Iniciando aplicación con Supabase...');
    console.log('Clientes registrados:', clientes.length);
    console.log('Códigos ya usados:', codigosUsados.length);
    setupEventListeners();
    
    iniciarSincronizacionAutomatica();
    
    if (clientes.length > 0) {
        const ultimoCliente = clientes[clientes.length - 1];
        if (!codigosUsados.includes(ultimoCliente.identificacion)) {
            generarQR(ultimoCliente.identificacion);
            qrMessage.textContent = `QR para: ${ultimoCliente.nombre} (Activo)`;
        } else {
            qrMessage.textContent = `QR para: ${ultimoCliente.nombre} (⚠️ YA USADO)`;
            qrMessage.style.color = '#e74c3c';
        }
    }
}

// Configurar event listeners
function setupEventListeners() {
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
}

// Mostrar sección de ingreso de datos
function showIngresarSection() {
    ingresarSection.classList.add('active');
    verificarSection.classList.remove('active');
    gestionarSection.classList.remove('active');
    btnIngresar.style.backgroundColor = '#2980b9';
    btnVerificar.style.backgroundColor = '#2ecc71';
    btnGestionar.style.backgroundColor = '#f39c12';
    stopCamera();
}

// Mostrar sección de verificación
function showVerificarSection() {
    verificarSection.classList.add('active');
    ingresarSection.classList.remove('active');
    gestionarSection.classList.remove('active');
    btnVerificar.style.backgroundColor = '#27ae60';
    btnIngresar.style.backgroundColor = '#3498db';
    btnGestionar.style.backgroundColor = '#f39c12';
}

// Mostrar sección de gestión
function showGestionarSection() {
    gestionarSection.classList.add('active');
    ingresarSection.classList.remove('active');
    verificarSection.classList.remove('active');
    btnGestionar.style.backgroundColor = '#e67e22';
    btnIngresar.style.backgroundColor = '#3498db';
    btnVerificar.style.backgroundColor = '#2ecc71';
    stopCamera();
    
    actualizarEstadisticas();
    cargarListaClientes();
}

// Procesar formulario de cliente
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

// Generar código QR
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
        canvas.style.border = '2px solid #3498db';
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
        qrcodeElement.innerHTML = '<p style="color: red; font-weight: bold;">Error al generar QR</p>';
    }
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

// Actualizar estadísticas
function actualizarEstadisticas() {
    const total = clientes.length;
    const usados = codigosUsados.length;
    const pendientes = total - usados;
    
    totalRegistrados.textContent = total;
    totalIngresaron.textContent = usados;
    totalPendientes.textContent = pendientes;
}

// Cargar lista de clientes
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
        item.className = `cliente-item ${usado ? 'usado' : ''}`;
        
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

// Buscar clientes
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

// Actualizar toda la interfaz
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

// Agregar botón de limpieza para testing
document.addEventListener('DOMContentLoaded', function() {
    const limpiarBtn = document.createElement('button');
    limpiarBtn.textContent = '🗑️ Limpiar BD (Testing)';
    limpiarBtn.style.background = '#e74c3c';
    limpiarBtn.style.marginTop = '10px';
    limpiarBtn.onclick = limpiarBaseDatos;
    document.querySelector('.button-container').appendChild(limpiarBtn);
});

// Inicializar la aplicación cuando se carga la página
document.addEventListener('DOMContentLoaded', initApp);