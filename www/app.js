// --- GLOBAL STATE & STORAGE ---
const STORAGE_KEYS = {
    SITES: 'nm_sites',
    ACTIVE_SITE_ID: 'nm_active_site_id',
    LABOR: 'nm_labor',
    PHOTOS: 'nm_photos',
    SETTINGS: 'nm_settings'
};

// Initial State
let sites = JSON.parse(localStorage.getItem(STORAGE_KEYS.SITES)) || [{ id: 'default', name: 'Main Project 🏗️' }];
let activeSiteId = localStorage.getItem(STORAGE_KEYS.ACTIVE_SITE_ID) || 'default';
let laborData = JSON.parse(localStorage.getItem(STORAGE_KEYS.LABOR)) || [];
let photoData = JSON.parse(localStorage.getItem(STORAGE_KEYS.PHOTOS)) || [];
let appSettings = JSON.parse(localStorage.getItem(STORAGE_KEYS.SETTINGS)) || {
    brickRate: 8,
    cementRate: 450,
    sandRate: 3500,
    apiKey: ''
};

// --- INITIALIZATION ---
document.addEventListener('DOMContentLoaded', () => {
    refreshSiteDropdown();
    showTab('calc', document.querySelector('.nav-item')); // Default tab
    updateLaborList();
    renderPhotos();
    loadSettingsUI();
});

// --- TAB SWITCHING ---
function showTab(tabId, el) {
    document.querySelectorAll('.tab-content').forEach(tab => tab.classList.remove('active'));
    document.querySelectorAll('.nav-item').forEach(nav => nav.classList.remove('active'));
    
    document.getElementById(tabId).classList.add('active');
    if (el) el.classList.add('active');
}

// --- SITE MANAGEMENT ---
function refreshSiteDropdown() {
    const dropdown = document.getElementById('activeSite');
    if (!dropdown) return;
    dropdown.innerHTML = '';
    sites.forEach(site => {
        const option = document.createElement('option');
        option.value = site.id;
        option.text = site.name;
        if (site.id === activeSiteId) option.selected = true;
        dropdown.appendChild(option);
    });
}

function addNewSite() {
    const name = prompt("Enter Site Name (e.g., Ganesh Layout Site):");
    if (name && name.trim() !== "") {
        const newSite = { id: 'site_' + Date.now(), name: name.trim() };
        sites.push(newSite);
        localStorage.setItem(STORAGE_KEYS.SITES, JSON.stringify(sites));
        activeSiteId = newSite.id;
        localStorage.setItem(STORAGE_KEYS.ACTIVE_SITE_ID, activeSiteId);
        refreshSiteDropdown();
        updateLaborList();
        renderPhotos();
    }
}

function switchSite() {
    activeSiteId = document.getElementById('activeSite').value;
    localStorage.setItem(STORAGE_KEYS.ACTIVE_SITE_ID, activeSiteId);
    updateLaborList();
    renderPhotos();
}

// --- MATERIAL CALCULATOR ---
function calculateMaterials() {
    const lengthFt = parseFloat(document.getElementById('length').value);
    const heightFt = parseFloat(document.getElementById('height').value);
    const thicknessInches = parseFloat(document.getElementById('thickness').value);

    if (!lengthFt || !heightFt) {
        alert("Please enter dimensions!");
        return;
    }

    const lengthM = lengthFt * 0.3048;
    const heightM = heightFt * 0.3048;
    const thicknessM = (thicknessInches * 0.0254);
    const wallVolume = lengthM * heightM * thicknessM;

    const brickVolWithMortar = 0.200 * 0.100 * 0.100;
    const numBricks = Math.ceil((wallVolume / brickVolWithMortar) * 1.05);

    const mortarVol = wallVolume * 0.33;
    const dryMortarVol = mortarVol * 1.33;
    const cementVol = dryMortarVol / 7;
    const sandVol = cementVol * 6;

    const cementBags = Math.ceil(cementVol / 0.0347);
    const sandCuFt = (sandVol * 35.3147).toFixed(1);

    document.getElementById('res-bricks').innerText = numBricks;
    document.getElementById('res-cement').innerText = cementBags;
    document.getElementById('res-sand').innerText = sandCuFt + " cu.ft";
    document.getElementById('calc-result').style.display = 'block';
}

function calculateFloor() {
    const len = parseFloat(document.getElementById('floor-len').value);
    const wid = parseFloat(document.getElementById('floor-wid').value);
    
    if (!len || !wid) return;
    
    const area = len * wid;
    // 2x2 tiles (4 sq ft each)
    const tiles2x2 = Math.ceil(area / 4 * 1.05); // 5% wastage
    // 1x1 tiles (1 sq ft each)
    const tiles1x1 = Math.ceil(area * 1.05);
    
    document.getElementById('res-tiles-2x2').innerText = tiles2x2;
    document.getElementById('res-tiles-1x1').innerText = tiles1x1;
    document.getElementById('floor-result').style.display = 'block';
}

function calculateRoof() {
    const area = parseFloat(document.getElementById('roof-area').value);
    const thickInches = parseFloat(document.getElementById('roof-thick').value);
    
    if (!area || !thickInches) return;
    
    // Volume in Cubic Feet
    const volCuFt = area * (thickInches / 12);
    // Convert to Cubic Meters
    const volM3 = volCuFt * 0.0283168;
    
    // Wet to Dry volume (1.54 factor)
    const dryVol = volM3 * 1.54;
    
    // Mix M20 (1:1.5:3 -> Cement:Sand:Aggregate) -> Total 5.5 parts
    const cementVol = dryVol / 5.5;
    const sandVol = cementVol * 1.5;
    const aggVol = cementVol * 3;
    
    const bags = Math.ceil(cementVol / 0.0347);
    const sandLoads = (sandVol * 35.3147 / 100).toFixed(1); // 1 load approx 100 cu ft
    const aggLoads = (aggVol * 35.3147 / 100).toFixed(1);
    
    document.getElementById('res-roof-cement').innerText = bags;
    document.getElementById('res-roof-sand').innerText = sandLoads + " loads";
    document.getElementById('res-roof-agg').innerText = aggLoads + " loads";
    document.getElementById('roof-result').style.display = 'block';
}

// --- LABOR DIARY ---
function addLaborer() {
    const name = document.getElementById('laborer-name').value;
    const wage = document.getElementById('daily-wage').value;

    if (!name || !wage) return;

    const worker = {
        id: Date.now(),
        siteId: activeSiteId,
        name: name,
        wage: parseFloat(wage),
        attendance: [], // Dates as strings
        advances: 0
    };

    laborData.push(worker);
    saveLaborData();
    updateLaborList();
    
    document.getElementById('laborer-name').value = '';
    document.getElementById('daily-wage').value = '';
}

function saveLaborData() {
    localStorage.setItem(STORAGE_KEYS.LABOR, JSON.stringify(laborData));
}

function updateLaborList() {
    const list = document.getElementById('labor-list');
    if (!list) return;
    list.innerHTML = '';

    // Filter labor for active site
    const siteLabor = laborData.filter(worker => worker.siteId === activeSiteId);

    if (siteLabor.length === 0) {
        list.innerHTML = `<p style="text-align:center; padding:20px; color:var(--text-secondary);">No workers added to this site yet.</p>`;
        return;
    }

    siteLabor.forEach(worker => {
        const card = document.createElement('div');
        card.className = 'card';
        card.style.borderLeftColor = 'var(--success)';
        
        const balance = (worker.attendance.length * worker.wage) - worker.advances;

        card.innerHTML = `
            <div style="display:flex; justify-content:space-between; align-items:center;">
                <h3>${worker.name}</h3>
                <span style="color:var(--construction-yellow); font-weight:800;">₹${balance} Due</span>
            </div>
            <p style="font-size:0.8rem; color:var(--text-secondary);">Wage: ₹${worker.wage}/day</p>
            <div style="display:grid; grid-template-columns: 1fr 1fr; gap:10px; margin-top:10px;">
                <button class="btn btn-secondary" onclick="markAttendance(${worker.id})" style="padding:10px; font-size:0.8rem;">
                    Present (${worker.attendance.length})
                </button>
                <button class="btn btn-secondary" onclick="addAdvance(${worker.id})" style="padding:10px; font-size:0.8rem;">
                    Pay Advance
                </button>
            </div>
            <button onclick="removeWorker(${worker.id})" style="background:none; border:none; color:var(--danger); font-size:0.7rem; margin-top:10px; cursor:pointer;">Delete Worker</button>
        `;
        list.appendChild(card);
    });
}

function markAttendance(workerId) {
    const worker = laborData.find(l => l.id === workerId);
    const today = new Date().toLocaleDateString();
    
    if (worker && !worker.attendance.includes(today)) {
        worker.attendance.push(today);
        saveLaborData();
        updateLaborList();
    } else {
        alert("Already marked present for today!");
    }
}

function addAdvance(workerId) {
    const amount = prompt("Enter Advance Amount Paid (₹):");
    if (!amount || isNaN(amount)) return;

    const worker = laborData.find(l => l.id === workerId);
    if (worker) {
        worker.advances += parseFloat(amount);
        saveLaborData();
        updateLaborList();
    }
}

function removeWorker(workerId) {
    if (confirm("Permanently remove this worker from this site?")) {
        laborData = laborData.filter(l => l.id !== workerId);
        saveLaborData();
        updateLaborList();
    }
}

// --- PHOTO GALLERY ---
function handlePhoto(input) {
    if (input.files && input.files[0]) {
        const reader = new FileReader();
        reader.onload = function(e) {
            const photo = {
                id: Date.now(),
                siteId: activeSiteId,
                src: e.target.result,
                date: new Date().toLocaleString()
            };
            photoData.unshift(photo);
            // Limit to 20 photos per site to save space
            if (photoData.length > 50) photoData.pop();
            
            localStorage.setItem(STORAGE_KEYS.PHOTOS, JSON.stringify(photoData));
            renderPhotos();
        };
        reader.readAsDataURL(input.files[0]);
    }
}

function renderPhotos() {
    const gallery = document.getElementById('photo-gallery');
    if (!gallery) return;
    gallery.innerHTML = '';
    
    const sitePhotos = photoData.filter(p => p.siteId === activeSiteId);

    if (sitePhotos.length === 0) {
        gallery.innerHTML = `<p style="text-align:center; padding:20px; color:var(--text-secondary);">No progress photos yet.</p>`;
        return;
    }

    sitePhotos.forEach(photo => {
        const div = document.createElement('div');
        div.className = 'card';
        div.style.padding = '5px';
        div.innerHTML = `
            <img src="${photo.src}" style="width:100%; border-radius:8px; aspect-ratio:1; object-fit:cover;">
            <div style="display:flex; justify-content:space-between; align-items:center; padding:5px;">
                <span style="font-size:0.6rem; color:var(--text-secondary);">${photo.date}</span>
                <button onclick="removePhoto(${photo.id})" style="background:none; border:none; color:var(--danger); font-size:0.8rem; cursor:pointer;">🗑️</button>
            </div>
        `;
        gallery.appendChild(div);
    });
}

function removePhoto(id) {
    photoData = photoData.filter(p => p.id !== id);
    localStorage.setItem(STORAGE_KEYS.PHOTOS, JSON.stringify(photoData));
    renderPhotos();
}

// --- SETTINGS ---
function openSettings() {
    showTab('rates', document.querySelector('.nav-item i.fa-cog')?.parentElement);
}

function saveSettings() {
    appSettings = {
        apiKey: document.getElementById('api-key').value,
        cementRate: document.getElementById('rate-cement').value,
        brickRate: document.getElementById('rate-bricks').value,
        sandRate: document.getElementById('rate-sand').value
    };
    localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(appSettings));
    alert("Settings saved successfully!");
}

function loadSettingsUI() {
    document.getElementById('api-key').value = appSettings.apiKey || '';
    document.getElementById('rate-cement').value = appSettings.cementRate || 450;
    document.getElementById('rate-bricks').value = appSettings.brickRate || 8;
    document.getElementById('rate-sand').value = appSettings.sandRate || 3500;
}

// --- MISTRI AI (Gemini 2.5 Flash) ---
async function askAI() {
    const input = document.getElementById('chat-input');
    const chatWindow = document.getElementById('chat-window');
    const question = input.value;

    if (!question) return;
    
    if (!appSettings.apiKey || appSettings.apiKey.trim() === "") {
        alert("⚠️ Please add your Gemini API Key in Settings first!");
        openSettings();
        return;
    }

    chatWindow.innerHTML += `<div style="text-align:right; margin:10px 0; background:#333; padding:10px; border-radius:12px; border-bottom-right-radius:0;"><strong>You:</strong><br>${question}</div>`;
    input.value = '';
    chatWindow.scrollTop = chatWindow.scrollHeight;

    const thinkingId = 'think-' + Date.now();
    chatWindow.innerHTML += `<div id="${thinkingId}" style="color:var(--safety-orange); font-style:italic; margin:5px 0; padding:10px; background:rgba(255,140,0,0.1); border-radius:8px;">
        <i class="fas fa-spinner fa-spin"></i> Mistri AI is thinking...
    </div>`;
    chatWindow.scrollTop = chatWindow.scrollHeight;

    try {
        const response = await fetch(`https://generativelanguage.googleapis.com/v1/models/gemini-2.5-flash:generateContent?key=${appSettings.apiKey}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{
                    parts: [{
                        text: `You are Namma-Mistri, a helpful Indian Construction Assistant. 
                        A local mason is asking: ${question}. 
                        Provide safe, practical advice in English and Kannada.`
                    }]
                }]
            })
        });

        const data = await response.json();
        document.getElementById(thinkingId).remove();

        if (data.error) throw new Error(data.error.message);

        if (data.candidates && data.candidates[0].content.parts[0].text) {
            const aiText = data.candidates[0].content.parts[0].text;
            chatWindow.innerHTML += `<div style="color:var(--text-primary); margin:10px 0; background:var(--card-bg); padding:12px; border-radius:12px; border-bottom-left-radius:0; border-left:4px solid var(--safety-orange);">
                <strong>Mistri AI:</strong><br>${aiText.replace(/\n/g, '<br>')}
            </div>`;
        }
    } catch (error) {
        if (document.getElementById(thinkingId)) document.getElementById(thinkingId).remove();
        chatWindow.innerHTML += `<div style="color:var(--danger); background:rgba(244,67,54,0.1); padding:10px; border-radius:8px; margin:10px 0; border:1px solid var(--danger);">
            <strong>Error:</strong> ${error.message}
        </div>`;
    }
    chatWindow.scrollTop = chatWindow.scrollHeight;
}
