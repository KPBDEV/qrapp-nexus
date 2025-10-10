// CONFIG
const SUPABASE_URL = 'https://zefsmzxlhgfvmdydutzp.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InplZnNtenhsaGdmdm1keWR1dHpwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk5ODE1NDIsImV4cCI6MjA3NTU1NzU0Mn0.nm7syRkN1ZBnJ5QLk4QStITuUB1cjHZjNfrPA99CpdI';

// STATE
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
let user = JSON.parse(sessionStorage.getItem('user')) || null;
let clients = JSON.parse(localStorage.getItem('clients')) || [];
let usedCodes = JSON.parse(localStorage.getItem('usedCodes')) || [];

// INIT
document.addEventListener('DOMContentLoaded', () => {
    user ? showApp() : showLogin();
    setupEvents();
});

// NAVIGATION
function showLogin() {
    $('#login-screen').style.display = 'flex';
    $('#app-container').style.display = 'none';
}

function showApp() {
    $('#login-screen').style.display = 'none';
    $('#app-container').style.display = 'block';
    $('#user-welcome').textContent = `Hola, ${user.username}`;
    loadFromCloud();
}

// AUTH
$('#btn-login').onclick = async () => {
    const username = $('#login-username').value;
    const password = $('#login-password').value;
    
    const { data } = await supabase.from('nexus_usuarios').select('*').eq('username', username).single();
    if (!data) return alert('Usuario no existe');
    
    if (data.password_hash === btoa(password)) {
        user = { id: data.id, username: data.username };
        sessionStorage.setItem('user', JSON.stringify(user));
        showApp();
    } else {
        alert('Contraseña incorrecta');
    }
};

$('#btn-logout').onclick = () => {
    user = null;
    sessionStorage.removeItem('user');
    showLogin();
};

// CLIENTS
$('#client-form').onsubmit = async (e) => {
    e.preventDefault();
    const name = $('#nombre').value;
    const id = $('#identificacion').value;
    const phone = $('#telefono').value;
    
    if (!name || !id || !phone) return alert('Completa todos los campos');
    
    // Check if ID already used
    if (usedCodes.includes(id)) return alert('Esta ID ya fue usada');
    
    // Add client
    clients.push({
        id: Date.now(),
        nombre: name,
        identificacion: id,
        telefono: phone,
        fecha: new Date().toISOString()
    });
    
    localStorage.setItem('clients', JSON.stringify(clients));
    generateQR(id);
    e.target.reset();
    await syncToCloud();
};

function generateQR(text) {
    const container = $('#qrcode');
    container.innerHTML = '';
    
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
    $('#qr-message').textContent = `QR para: ${text}`;
}

// SYNC
async function syncToCloud() {
    try {
        await supabase.from('event_data').upsert({
            id: 'main',
            clientes: clients,
            codigos_usados: usedCodes,
            updated: new Date().toISOString()
        });
        console.log('✅ Sincronizado');
    } catch (error) {
        console.error('❌ Error sync:', error);
    }
}

async function loadFromCloud() {
    try {
        const { data } = await supabase.from('event_data').select('*').eq('id', 'main').single();
        if (data) {
            clients = data.clientes || [];
            usedCodes = data.codigos_usados || [];
            localStorage.setItem('clients', JSON.stringify(clients));
            localStorage.setItem('usedCodes', JSON.stringify(usedCodes));
            updateStats();
        }
    } catch (error) {
        console.error('❌ Error load:', error);
    }
}

// VERIFICATION
async function verifyCode(code) {
    if (usedCodes.includes(code)) {
        showResult('❌ Código ya usado', 'error');
        return;
    }
    
    const client = clients.find(c => c.identificacion === code);
    if (client) {
        usedCodes.push(code);
        localStorage.setItem('usedCodes', JSON.stringify(usedCodes));
        showResult(`✅ Bienvenido ${client.nombre}`, 'success');
        await syncToCloud();
    } else {
        showResult('❌ Código no válido', 'error');
    }
}

function showResult(message, type) {
    const result = $('#verification-result');
    result.innerHTML = message;
    result.className = `result ${type}`;
    result.style.display = 'block';
    setTimeout(() => result.style.display = 'none', 3000);
}

// CAMERA
let cameraStream = null;

$('#btn-start-camera').onclick = async () => {
    try {
        stopCamera();
        cameraStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
        const video = $('#video');
        video.srcObject = cameraStream;
        video.style.display = 'block';
        $('#camera-placeholder').style.display = 'none';
        
        video.onloadedmetadata = () => {
            video.play();
            scanQR();
        };
    } catch (error) {
        alert('Error cámara: ' + error.message);
    }
};

$('#btn-stop-camera').onclick = stopCamera;

function stopCamera() {
    if (cameraStream) {
        cameraStream.getTracks().forEach(track => track.stop());
        cameraStream = null;
    }
    $('#video').style.display = 'none';
    $('#camera-placeholder').style.display = 'block';
}

function scanQR() {
    if (!cameraStream) return;
    
    const video = $('#video');
    const canvas = $('#canvas');
    const ctx = canvas.getContext('2d');
    
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    
    try {
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const code = jsQR(imageData.data, imageData.width, imageData.height);
        if (code) {
            verifyCode(code.data);
            stopCamera();
            return;
        }
    } catch (e) {}
    
    requestAnimationFrame(scanQR);
}

// MANUAL VERIFICATION
$('#btn-verificar-manual').onclick = () => {
    const code = $('#codigo-manual').value;
    if (code) verifyCode(code);
};

// UTILS
function $(id) { return document.getElementById(id); }

function updateStats() {
    $('#total-registrados').textContent = clients.length;
    $('#total-ingresaron').textContent = usedCodes.length;
    $('#total-pendientes').textContent = clients.length - usedCodes.length;
}

function setupEvents() {
    // Navigation
    $('#btn-ingresar').onclick = () => showSection('ingresar-section');
    $('#btn-verificar').onclick = () => showSection('verificar-section');
    $('#btn-gestionar').onclick = () => {
        showSection('gestionar-section');
        updateStats();
    };
    
    // Sync
    $('#btn-forzar-sincronizacion').onclick = async () => {
        await syncToCloud();
        await loadFromCloud();
        alert('Sincronizado');
    };
    
    // Clear DB
    $('#btn-limpiar-db').onclick = async () => {
        if (confirm('¿Borrar TODOS los datos?')) {
            clients = [];
            usedCodes = [];
            localStorage.removeItem('clients');
            localStorage.removeItem('usedCodes');
            $('#qrcode').innerHTML = '';
            await syncToCloud();
            updateStats();
            alert('Base de datos limpiada');
        }
    };
}

function showSection(sectionId) {
    // Hide all sections
    ['ingresar-section', 'verificar-section', 'gestionar-section'].forEach(id => {
        $(id).classList.remove('active');
    });
    
    // Show target section
    $(sectionId).classList.add('active');
    
    // Stop camera if not in verification section
    if (sectionId !== 'verificar-section') {
        stopCamera();
    }
}