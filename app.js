// ========================================
// Plant Guardian - Main Application Logic
// ========================================

// ========================================
// 1. SETUP - Supabase & API Keys
// ========================================

// API Keys are now loaded from config.js file
// Make sure config.js is loaded before this script in your HTML

// Assign values from global CONFIG object
const SUPABASE_URL = CONFIG.SUPABASE_URL;
const SUPABASE_ANON_KEY = CONFIG.SUPABASE_ANON_KEY;

// Perenual API Key from CONFIG
const PERENUAL_API_KEY = CONFIG.PERENUAL_API_KEY;

// Initialize Supabase Client
let sb;
if (typeof window !== 'undefined' && window.supabase) {
    sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
}

// ========================================
// 2. AUTHENTICATION
// ========================================

/**
 * Register a new user
 */
async function registerUser(email, password) {
    try {
        const { data, error } = await sb.auth.signUp({
            email: email,
            password: password,
        });

        if (error) throw error;

        alert('Rejestracja zakończona sukcesem! Sprawdź swoją skrzynkę email, aby potwierdzić konto.');
        return data;
    } catch (error) {
        console.error('Registration error:', error);
        alert('Błąd rejestracji: ' + error.message);
        return null;
    }
}

/**
 * Login user
 */
async function loginUser(email, password) {
    try {
        const { data, error } = await sb.auth.signInWithPassword({
            email: email,
            password: password,
        });

        if (error) throw error;

        alert('Logowanie zakończone sukcesem!');
        window.location.href = 'dashboard.html';
        return data;
    } catch (error) {
        console.error('Login error:', error);
        alert('Błąd logowania: ' + error.message);
        return null;
    }
}

/**
 * Logout user
 */
async function logoutUser() {
    try {
        const { error } = await sb.auth.signOut();
        if (error) throw error;

        alert('Wylogowano pomyślnie!');
        window.location.href = 'index.html';
    } catch (error) {
        console.error('Logout error:', error);
        alert('Błąd wylogowania: ' + error.message);
    }
}

/**
 * Get current user
 */
async function getCurrentUser() {
    try {
        const { data: { user }, error } = await sb.auth.getUser();
        if (error) throw error;
        return user;
    } catch (error) {
        console.error('Get user error:', error);
        return null;
    }
}

/**
 * Check if user is authenticated (for protected pages)
 */
async function checkAuthentication() {
    const user = await getCurrentUser();

    // List of protected pages
    const protectedPages = ['dashboard.html', 'add.html', 'details.html'];
    const currentPage = window.location.pathname.split('/').pop() || 'index.html';

    // Only redirect if on a protected page AND not authenticated
    if (protectedPages.includes(currentPage) && !user) {
        alert('Musisz być zalogowany, aby uzyskać dostęp do tej strony.');
        window.location.href = 'index.html';
        return false;
    }

    return user;
}

// ========================================
// 3. PERENUAL API INTEGRATION
// ========================================

/**
 * Fetch plant data from Perenual API
 * @param {string} query - Plant name to search
 * @returns {array} - Array of plant objects
 */
async function fetchPlantData(query) {
    try {
        const searchQuery = encodeURIComponent(query);
        const url = `https://perenual.com/api/species-list?key=${PERENUAL_API_KEY}&q=${searchQuery}`;

        const response = await fetch(url);

        if (!response.ok) {
            throw new Error('Perenual API request failed');
        }

        const data = await response.json();

        if (data.data && data.data.length > 0) {
            return data.data;
        } else {
            return [];
        }
    } catch (error) {
        console.error('Perenual API error:', error);
        throw error;
    }
}

/**
 * Convert watering text to days
 * @param {string} watering - Watering frequency text from API
 * @returns {number} - Number of days
 */
function convertWateringToDays(watering) {
    if (!watering) return null;

    const wateringLower = watering.toLowerCase();

    if (wateringLower.includes('frequent')) {
        return 3; // Every 3 days
    } else if (wateringLower.includes('average')) {
        return 7; // Once a week
    } else if (wateringLower.includes('minimum')) {
        return 14; // Every 2 weeks
    } else {
        return 7; // Default to weekly
    }
}

/**
 * Translate sunlight requirements to Polish
 * @param {string|array} sunlight - Sunlight data from API
 * @returns {string} - Polish translation
 */
function translateSunlightToPolish(sunlight) {
    if (!sunlight) return '';

    const sunlightArray = Array.isArray(sunlight) ? sunlight : [sunlight];

    const translations = {
        'full sun': 'Pełne słońce',
        'full shade': 'Pełny cień',
        'part shade': 'Półcień',
        'part sun': 'Częściowe słońce',
        'filtered shade': 'Przefiltrowany cień',
        'sun': 'Słońce',
        'shade': 'Cień'
    };

    const translated = sunlightArray.map(item => {
        const itemLower = item.toLowerCase();
        return translations[itemLower] || item;
    });

    return translated.join(', ');
}

/**
 * Handle plant search button click - show modal with results
 */
async function handlePlantSearch() {
    const plantNameInput = document.getElementById('plant-name');
    const modal = document.getElementById('plant-modal');
    const modalLoading = document.getElementById('modal-loading');
    const modalResults = document.getElementById('modal-results');
    const modalError = document.getElementById('modal-error');

    const plantName = plantNameInput?.value || '';

    if (!plantName) {
        alert('Podaj nazwę rośliny!');
        return;
    }

    // Show modal and loading
    modal.classList.add('active');
    modalLoading.classList.remove('hidden');
    modalResults.innerHTML = '';
    modalError.classList.add('hidden');

    try {
        const plants = await fetchPlantData(plantName);

        modalLoading.classList.add('hidden');

        if (plants.length === 0) {
            modalError.classList.remove('hidden');
            return;
        }

        // Display results
        plants.forEach(plant => {
            const resultItem = document.createElement('div');
            resultItem.className = 'plant-result-item';
            resultItem.innerHTML = `
                <h3>${plant.common_name || 'Nieznana nazwa'}</h3>
                <p>${plant.scientific_name?.[0] || 'Brak nazwy naukowej'}</p>
            `;

            resultItem.addEventListener('click', () => selectPlant(plant));
            modalResults.appendChild(resultItem);
        });
    } catch (error) {
        modalLoading.classList.add('hidden');
        modalError.classList.remove('hidden');
    }
}

/**
 * Handle plant selection from modal
 */
function selectPlant(plant) {
    // Auto-fill form fields (only basic fields now)
    const plantNameInput = document.getElementById('plant-name');
    const plantSpeciesInput = document.getElementById('plant-species');
    const waterFrequencyInput = document.getElementById('water-frequency');

    // Fill in the data
    if (plantNameInput) {
        plantNameInput.value = plant.common_name || '';
    }

    if (plantSpeciesInput) {
        plantSpeciesInput.value = plant.scientific_name?.[0] || '';
    }

    if (waterFrequencyInput && plant.watering) {
        waterFrequencyInput.value = convertWateringToDays(plant.watering);
    }

    // Close modal
    closeModal();
}

/**
 * Close modal
 */
function closeModal() {
    const modal = document.getElementById('plant-modal');
    modal.classList.remove('active');
}

// ========================================
// 4. PLANT DATA MANAGEMENT
// ========================================

/**
 * Get all plants for current user
 */
async function getPlants() {
    try {
        const user = await getCurrentUser();
        if (!user) {
            console.error('No user logged in');
            return [];
        }

        const { data: plants, error } = await sb
            .from('plants')
            .select('*')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false });

        if (error) throw error;

        return plants || [];
    } catch (error) {
        console.error('Error fetching plants:', error);
        return [];
    }
}

/**
 * Add a new plant
 */
async function addPlant(plantData) {
    try {
        const user = await getCurrentUser();
        if (!user) {
            alert('Musisz być zalogowany, aby dodać roślinę.');
            return null;
        }

        const { data, error } = await sb
            .from('plants')
            .insert([{
                user_id: user.id,
                name: plantData.name,
                species: plantData.species || null,
                image_url: plantData.image_url || null,
                water_frequency: plantData.water_frequency || null,
                last_watered: plantData.last_watered || new Date().toISOString().split('T')[0],
                sunlight: plantData.sunlight || null,
                care_level: plantData.care_level || null,
                toxicity: plantData.toxicity !== undefined ? plantData.toxicity : null,
                description: plantData.description || null,
                purchase_date: plantData.purchase_date || null,
            }])
            .select();

        if (error) throw error;

        return data[0];
    } catch (error) {
        console.error('Error adding plant:', error);
        alert('Błąd podczas dodawania rośliny: ' + error.message);
        return null;
    }
}

/**
 * Get plant details by ID
 */
async function getPlantById(plantId) {
    try {
        const { data: plant, error } = await sb
            .from('plants')
            .select('*')
            .eq('id', plantId)
            .single();

        if (error) throw error;

        return plant;
    } catch (error) {
        console.error('Error fetching plant details:', error);
        alert('Nie udało się załadować danych rośliny.');
        return null;
    }
}

/**
 * Update plant (e.g., after watering)
 */
async function updatePlant(plantId, updates) {
    try {
        const { data, error } = await sb
            .from('plants')
            .update(updates)
            .eq('id', String(plantId))
            .select();

        if (error) throw error;

        return data[0];
    } catch (error) {
        console.error('Error updating plant:', error);
        alert('Błąd podczas aktualizacji rośliny: ' + error.message);
        return null;
    }
}

/**
 * Delete plant
 */
async function deletePlant(plantId) {
    try {
        const { error } = await sb
            .from('plants')
            .delete()
            .eq('id', plantId);

        if (error) throw error;

        return true;
    } catch (error) {
        console.error('Error deleting plant:', error);
        alert('Błąd podczas usuwania rośliny: ' + error.message);
        return false;
    }
}

// ========================================
// 4b. CARE LOGS DATA MANAGEMENT
// ========================================

/**
 * Get all care logs for a specific plant
 * @param {string} plantId - UUID of the plant
 * @returns {array} - Array of care log objects
 */
async function getPlantLogs(plantId) {
    try {
        const { data: logs, error } = await sb
            .from('care_logs')
            .select('*')
            .eq('plant_id', plantId)
            .order('date', { ascending: false });

        if (error) throw error;

        return logs || [];
    } catch (error) {
        console.error('Error fetching care logs:', error);
        return [];
    }
}

/**
 * Add a new care log entry
 * @param {object} logData - Care log data
 * @returns {object|null} - Created log or null on error
 */
async function addCareLog(logData) {
    try {
        const user = await getCurrentUser();
        if (!user) {
            alert('Musisz być zalogowany, aby dodać wpis.');
            return null;
        }

        const { data, error } = await sb
            .from('care_logs')
            .insert([{
                plant_id: logData.plant_id,
                user_id: user.id,
                date: logData.date || new Date().toISOString().split('T')[0],
                type: logData.type,
                pest_name: logData.pest_name || null,
                medicine_name: logData.medicine_name || null,
                concentration: logData.concentration || null,
                notes: logData.notes || null,
            }])
            .select();

        if (error) throw error;

        return data[0];
    } catch (error) {
        console.error('Error adding care log:', error);
        alert('Błąd podczas dodawania wpisu: ' + error.message);
        return null;
    }
}

/**
 * Delete a care log entry by ID
 * @param {string} logId - UUID of the care log to delete
 * @returns {boolean} - True on success, false on error
 */
async function deleteCareLog(logId) {
    try {
        const user = await getCurrentUser();
        if (!user) {
            alert('Musisz być zalogowany, aby usunąć wpis.');
            return false;
        }

        const { error } = await sb
            .from('care_logs')
            .delete()
            .eq('id', logId)
            .eq('user_id', user.id);

        if (error) throw error;

        return true;
    } catch (error) {
        console.error('Error deleting care log:', error);
        alert('Błąd podczas usuwania wpisu: ' + error.message);
        return false;
    }
}

/**
 * Update an existing care log entry
 * @param {string} logId - UUID of the care log to update
 * @param {object} updatedData - Fields to update (e.g. type, notes, pest_name, etc.)
 * @returns {object|null} - Updated log object or null on error
 */
async function updateCareLog(logId, updatedData) {
    try {
        const user = await getCurrentUser();
        if (!user) {
            alert('Musisz być zalogowany, aby edytować wpis.');
            return null;
        }

        const { data, error } = await sb
            .from('care_logs')
            .update(updatedData)
            .eq('id', logId)
            .eq('user_id', user.id)
            .select();

        if (error) throw error;

        return data[0];
    } catch (error) {
        console.error('Error updating care log:', error);
        alert('Błąd podczas aktualizacji wpisu: ' + error.message);
        return null;
    }
}


/**
 * Get all care logs for the currently logged-in user
 * @returns {array} - Array of all care log objects for the user
 */
async function getAllUserLogs() {
    try {
        const user = await getCurrentUser();
        if (!user) {
            console.error('Użytkownik nie jest zalogowany.');
            return [];
        }

        const { data: logs, error } = await sb
            .from('care_logs')
            .select('*')
            .eq('user_id', user.id)
            .order('date', { ascending: false });

        if (error) throw error;

        return logs || [];
    } catch (error) {
        console.error('Error fetching all user logs:', error);
        return [];
    }
}

// ========================================
// 5. UI RENDERING FUNCTIONS
// ========================================

/**
 * Check if a plant needs watering based on last watered date and frequency
 * @param {string} lastWatered - Date string (YYYY-MM-DD)
 * @param {number} frequency - Watering frequency in days
 * @returns {boolean} - True if plant needs water
 */
function needsWater(lastWatered, frequency) {
    if (!lastWatered || !frequency) {
        return false;
    }

    const lastWateredDate = new Date(lastWatered);
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Normalize to start of day
    lastWateredDate.setHours(0, 0, 0, 0);

    const nextWateringDate = new Date(lastWateredDate);
    nextWateringDate.setDate(nextWateringDate.getDate() + frequency);

    return today >= nextWateringDate;
}

/**
 * Get watering status for a plant
 * @param {string} lastWatered - Date string (YYYY-MM-DD)
 * @param {number} frequency - Watering frequency in days
 * @returns {object} - Status object with status, color, and message
 */
function getWateringStatus(lastWatered, frequency) {
    if (!lastWatered || !frequency) {
        return { status: 'unknown', color: '#666', message: 'Nieznane' };
    }

    const lastWateredDate = new Date(lastWatered);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    lastWateredDate.setHours(0, 0, 0, 0);

    const nextWateringDate = new Date(lastWateredDate);
    nextWateringDate.setDate(nextWateringDate.getDate() + frequency);

    const daysUntilWatering = Math.ceil((nextWateringDate - today) / (1000 * 60 * 60 * 24));

    if (daysUntilWatering < 0) {
        return { status: 'overdue', color: '#dc2626', message: '⚠️ Wymaga podlewania!' };
    } else if (daysUntilWatering <= 1) {
        return { status: 'soon', color: '#d97706', message: '⏰ Niedługo podlej' };
    } else {
        return { status: 'ok', color: 'var(--secondary-green)', message: '✓ W porządku' };
    }
}

/**
 * Render plants on dashboard
 */
async function renderDashboard() {
    const plantsContainer = document.getElementById('plants-container');
    const emptyState = document.getElementById('empty-state');

    if (!plantsContainer) return;

    const plants = await getPlants();

    if (plants.length === 0) {
        plantsContainer.classList.add('hidden');
        if (emptyState) {
            emptyState.classList.remove('hidden');
        }
        return;
    }

    // Hide empty state and show grid
    if (emptyState) {
        emptyState.classList.add('hidden');
    }
    plantsContainer.classList.remove('hidden');

    // Clear container
    plantsContainer.innerHTML = '';

    // Render each plant card
    plants.forEach(plant => {
        const card = createPlantCard(plant);
        plantsContainer.appendChild(card);
    });
}

/**
 * Create a plant card element (text-only, no images)
 */
function createPlantCard(plant) {
    const card = document.createElement('div');
    card.className = 'plant-card';

    const needsWatering = needsWater(plant.last_watered, plant.water_frequency);
    const wateringStatus = getWateringStatus(plant.last_watered, plant.water_frequency);

    // Add class for plants that need watering
    if (needsWatering) {
        card.classList.add('needs-water');
    }

    card.innerHTML = `
        <div class="plant-card-header">
            <h3>${plant.name}</h3>
            ${plant.species ? `<p class="species-name"><em>${plant.species}</em></p>` : ''}
        </div>
        
        <div class="plant-info">
            <div class="info-row">
                <span class="info-label">💧 Podlewanie:</span>
                <span class="info-value">Co ${plant.water_frequency || '?'} dni</span>
            </div>
            
            ${plant.sunlight ? `
            <div class="info-row">
                <span class="info-label">☀️ Nałonecznienie:</span>
                <span class="info-value">${plant.sunlight}</span>
            </div>
            ` : ''}
            
            <div class="info-row">
                <span class="info-label">📅 Ostatnio podlana:</span>
                <span class="info-value">${plant.last_watered || 'Nieznane'}</span>
            </div>
            
            <div class="watering-status" style="color: ${wateringStatus.color};">
                ${wateringStatus.message}
            </div>
        </div>
        
        <div class="plant-actions">
            ${needsWatering ? `
                <button class="btn btn-primary btn-small quick-water-btn" onclick="event.stopPropagation(); quickWater('${plant.id}')">
                    💧 Podlej teraz
                </button>
            ` : ''}
            <button class="btn btn-secondary btn-small" onclick="event.stopPropagation(); window.location.href='details.html?id=${plant.id}'">
                Szczegóły
            </button>
        </div>
    `;

    // Make card clickable to go to details (except for buttons)
    card.addEventListener('click', (e) => {
        if (!e.target.closest('button')) {
            window.location.href = `details.html?id=${plant.id}`;
        }
    });

    return card;
}

/**
 * Quick water function for dashboard cards
 */
async function quickWater(plantId) {
    const today = new Date().toISOString().split('T')[0];
    const result = await updatePlant(plantId, { last_watered: today });

    if (result) {
        // Add care log entry for watering
        await addCareLog({
            plant_id: plantId,
            date: today,
            type: 'podlewanie',
            notes: 'Automatyczny zapis po podlaniu',
        });

        // Show success message
        const message = document.createElement('div');
        message.className = 'success-toast';
        message.textContent = '✓ Roślina podlana pomyślnie!';
        document.body.appendChild(message);

        setTimeout(() => {
            message.classList.add('fade-out');
            setTimeout(() => message.remove(), 300);
        }, 2000);

        // Refresh dashboard
        await renderDashboard();
    }
}

/**
 * Render plant details page (text-only, no images)
 */
async function renderPlantDetails() {
    const urlParams = new URLSearchParams(window.location.search);
    const plantId = urlParams.get('id');

    if (!plantId) {
        alert('Nie podano ID rośliny');
        window.location.href = 'dashboard.html';
        return;
    }

    const plant = await getPlantById(plantId);

    if (!plant) {
        window.location.href = 'dashboard.html';
        return;
    }

    // Update page with text-only content
    const wateringStatus = getWateringStatus(plant.last_watered, plant.water_frequency);

    // Calculate next watering
    let nextWateringText = 'Nieznane';
    if (plant.last_watered && plant.water_frequency) {
        const lastWatered = new Date(plant.last_watered);
        const nextWatering = new Date(lastWatered);
        nextWatering.setDate(nextWatering.getDate() + plant.water_frequency);
        nextWateringText = nextWatering.toISOString().split('T')[0];
    }

    // Update DOM elements
    document.getElementById('plant-name').textContent = plant.name;
    document.getElementById('plant-species').textContent = `Gatunek: ${plant.species || 'Nieznany'}`;
    document.getElementById('water-frequency').textContent = `Co ${plant.water_frequency || '?'} dni`;
    document.getElementById('last-watered').textContent = plant.last_watered || 'Nieznane';
    document.getElementById('next-watering').textContent = nextWateringText;

    const statusElement = document.getElementById('watering-status');
    statusElement.textContent = wateringStatus.message;
    statusElement.style.color = wateringStatus.color;

    // Add sunlight info if exists
    if (plant.sunlight) {
        const sunlightEl = document.getElementById('plant-sunlight');
        if (sunlightEl) {
            sunlightEl.textContent = plant.sunlight;
        }
    }

    // Setup action buttons
    setupDetailButtons(plant.id);
}

/**
 * Setup action buttons on details page
 */
function setupDetailButtons(plantId) {
    // Water now button
    const waterBtn = document.getElementById('water-now-btn');
    if (waterBtn) {
        waterBtn.onclick = async () => {
            const today = new Date().toISOString().split('T')[0];
            const result = await updatePlant(plantId, { last_watered: today });
            if (result) {
                // Add care log entry for watering
                await addCareLog({
                    plant_id: plantId,
                    date: today,
                    type: 'podlewanie',
                    notes: 'Automatyczny zapis po podlaniu',
                });
                alert('Roślina została podlana! 💧');
                renderPlantDetails(); // Refresh
            }
        };
    }

    // Delete button
    const deleteBtn = document.getElementById('delete-btn');
    if (deleteBtn) {
        deleteBtn.onclick = async () => {
            if (!confirm('Czy na pewno chcesz usunąć tę roślinę?')) {
                return;
            }
            const result = await deletePlant(plantId);
            if (result) {
                alert('Roślina została usunięta.');
                window.location.href = 'dashboard.html';
            }
        };
    }

    // Edit button
    const editBtn = document.getElementById('edit-btn');
    if (editBtn) {
        editBtn.onclick = () => {
            window.location.href = `edit.html?id=${plantId}`;
        };
    }

    // Journal link
    const journalLink = document.getElementById('journal-link');
    if (journalLink) {
        journalLink.href = `journal.html?id=${plantId}`;
    }
}

/**
 * Handle add plant form submission
 */
async function handleAddPlantForm(event) {
    event.preventDefault();

    const formData = new FormData(event.target);

    // Only collect basic plant data
    const plantData = {
        name: formData.get('name'),
        species: formData.get('species') || null,
        water_frequency: parseInt(formData.get('water_frequency')) || null,
        last_watered: formData.get('last_watered') || null,
        purchase_date: formData.get('purchase_date') || null,
    };

    const result = await addPlant(plantData);

    if (result) {
        alert('Roślina została dodana pomyślnie! 🌱');
        window.location.href = 'dashboard.html';
    }
}

/**
 * Render the journal page for a specific plant
 */
async function renderJournal() {
    const urlParams = new URLSearchParams(window.location.search);
    const plantId = urlParams.get('id');

    if (!plantId) {
        alert('Nie podano ID rośliny.');
        window.location.href = 'dashboard.html';
        return;
    }

    // Load plant name
    const plant = await getPlantById(plantId);
    if (!plant) {
        window.location.href = 'dashboard.html';
        return;
    }

    const plantNameEl = document.getElementById('journal-plant-name');
    if (plantNameEl) {
        plantNameEl.textContent = `Roślina: ${plant.name}`;
    }

    // Update back link to point to plant details
    const backNav = document.querySelector('.back-nav');
    if (backNav) {
        backNav.href = `details.html?id=${plantId}`;
        backNav.textContent = `Powrót do ${plant.name}`;
    }

    // Load and render logs
    const logs = await getPlantLogs(plantId);
    const logsContainer = document.getElementById('logs-container');
    const logsEmpty = document.getElementById('logs-empty');

    if (logs.length === 0) {
        if (logsEmpty) logsEmpty.classList.remove('hidden');
        if (logsContainer) logsContainer.innerHTML = '';
        return;
    }

    if (logsEmpty) logsEmpty.classList.add('hidden');

    // Build a table of logs
    const typeLabels = {
        'oprysk': '🧴 Oprysk',
        'przycinanie': '✂️ Przycinanie',
        'pasożyty': '🐛 Pasożyty',
        'nawożenie': '🌱 Nawożenie',
    };

    let tableHTML = `
        <div style="overflow-x: auto;">
        <table class="care-logs-table">
            <thead>
                <tr>
                    <th>Data</th>
                    <th>Typ zabiegu</th>
                    <th>Szkodnik</th>
                    <th>Preparat</th>
                    <th>Stężenie</th>
                    <th>Notatki</th>
                    <th>Akcje</th>
                </tr>
            </thead>
            <tbody>
    `;

    logs.forEach(log => {
        tableHTML += `
            <tr>
                <td>${log.date || '—'}</td>
                <td>${typeLabels[log.type] || log.type}</td>
                <td>${log.pest_name || '—'}</td>
                <td>${log.medicine_name || '—'}</td>
                <td>${log.concentration || '—'}</td>
                <td>${log.notes || '—'}</td>
                <td class="actions-cell">
                    <button class="btn btn-small btn-danger" onclick="handleDeleteLog('${log.id}')" title="Usuń wpis">🗑️</button>
                    <button class="btn btn-small btn-secondary" onclick="prepareLogEdit('${log.id}')" title="Edytuj wpis">✏️</button>
                </td>
            </tr>
        `;
    });

    tableHTML += `
            </tbody>
        </table>
        </div>
    `;

    if (logsContainer) {
        logsContainer.innerHTML = tableHTML;
    }
}

/**
 * Render statistics on the stats page
 */
async function renderStats() {
    // Fetch all data
    const plants = await getPlants();
    const allLogs = await getAllUserLogs();

    // 1. Total number of plants
    const totalPlantsEl = document.getElementById('total-plants-value');
    if (totalPlantsEl) {
        totalPlantsEl.textContent = plants.length;
    }

    // 2. Number of care logs in the current month
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth(); // 0-indexed

    const monthlyLogs = allLogs.filter(log => {
        if (!log.date) return false;
        const logDate = new Date(log.date);
        return logDate.getFullYear() === currentYear && logDate.getMonth() === currentMonth;
    });

    const monthlyTreatmentsEl = document.getElementById('monthly-treatments-value');
    if (monthlyTreatmentsEl) {
        monthlyTreatmentsEl.textContent = monthlyLogs.length;
    }

    // 3. Oldest plant by purchase_date
    const plantsWithDate = plants.filter(p => p.purchase_date);
    const oldestPlantEl = document.getElementById('oldest-plant-value');

    if (oldestPlantEl) {
        if (plantsWithDate.length > 0) {
            plantsWithDate.sort((a, b) => new Date(a.purchase_date) - new Date(b.purchase_date));
            oldestPlantEl.textContent = plantsWithDate[0].name;
        } else {
            oldestPlantEl.textContent = 'Brak danych';
        }
    }
}

/**
 * Handle deleting a care log entry with confirmation
 * @param {string} logId - UUID of the log to delete
 */
async function handleDeleteLog(logId) {
    if (!confirm('Czy na pewno chcesz usunąć ten wpis?')) {
        return;
    }

    const success = await deleteCareLog(logId);
    if (success) {
        alert('Wpis został usunięty. 🗑️');
        await renderJournal();
    }
}

/**
 * Prepare the form for editing an existing care log entry
 * Fetches the log by ID from Supabase and populates the form fields
 * @param {string} logId - UUID of the log to edit
 */
async function prepareLogEdit(logId) {
    try {
        // Fetch the log entry from Supabase
        const { data, error } = await sb
            .from('care_logs')
            .select('*')
            .eq('id', logId)
            .single();

        if (error) throw error;
        if (!data) {
            alert('Nie znaleziono wpisu.');
            return;
        }

        const log = data;

        // Set hidden log_id field
        const logIdInput = document.getElementById('log-id');
        if (logIdInput) logIdInput.value = log.id;

        // Populate form fields with existing data
        const dateInput = document.getElementById('log-date');
        const typeSelect = document.getElementById('log-type');
        const pestInput = document.getElementById('log-pest-name');
        const medicineInput = document.getElementById('log-medicine-name');
        const concentrationInput = document.getElementById('log-concentration');
        const notesInput = document.getElementById('log-notes');

        if (dateInput) dateInput.value = log.date || '';
        if (typeSelect) {
            typeSelect.value = log.type || '';
            toggleCareLogFields(); // update field visibility for the selected type
        }
        if (pestInput) pestInput.value = log.pest_name || '';
        if (medicineInput) medicineInput.value = log.medicine_name || '';
        if (concentrationInput) concentrationInput.value = log.concentration || '';
        if (notesInput) notesInput.value = log.notes || '';

        // Change submit button text
        const submitBtn = document.getElementById('care-log-submit-btn');
        if (submitBtn) submitBtn.textContent = 'Zapisz zmiany';

        // Show cancel button
        const cancelBtn = document.getElementById('care-log-cancel-btn');
        if (cancelBtn) cancelBtn.classList.remove('hidden');

        // Scroll to the form
        const form = document.getElementById('care-log-form');
        if (form) form.scrollIntoView({ behavior: 'smooth' });

    } catch (error) {
        console.error('Error preparing log edit:', error);
        alert('Błąd podczas ładowania wpisu: ' + error.message);
    }
}

/**
 * Cancel edit mode and reset form back to "add" mode
 */
function cancelEditMode() {
    // Clear hidden log_id
    const logIdInput = document.getElementById('log-id');
    if (logIdInput) logIdInput.value = '';

    const form = document.getElementById('care-log-form');
    if (form) form.reset();

    // Reset date to today
    const dateInput = document.getElementById('log-date');
    if (dateInput) dateInput.valueAsDate = new Date();

    // Reset button text
    const submitBtn = document.getElementById('care-log-submit-btn');
    if (submitBtn) submitBtn.textContent = 'Dodaj wpis';

    // Hide cancel button
    const cancelBtn = document.getElementById('care-log-cancel-btn');
    if (cancelBtn) cancelBtn.classList.add('hidden');

    // Reset field visibility
    toggleCareLogFields();
}

// Make handlers available globally for inline onclick
window.handleDeleteLog = handleDeleteLog;
window.deleteCareLog = deleteCareLog;
window.prepareLogEdit = prepareLogEdit;
window.cancelEditMode = cancelEditMode;

/**
 * Handle care log form submission
 */
async function handleCareLogForm(event) {
    event.preventDefault();

    const urlParams = new URLSearchParams(window.location.search);
    const plantId = urlParams.get('id');

    if (!plantId) {
        alert('Nie podano ID rośliny.');
        return;
    }

    const formData = new FormData(event.target);
    const logId = formData.get('log_id');

    const logData = {
        date: formData.get('date'),
        type: formData.get('type'),
        pest_name: formData.get('pest_name') || null,
        medicine_name: formData.get('medicine_name') || null,
        concentration: formData.get('concentration') || null,
        notes: formData.get('notes') || null,
    };

    let result;

    if (logId) {
        // Edit mode — update existing log
        result = await updateCareLog(logId, logData);
        if (result) {
            alert('Wpis został zaktualizowany! ✏️');
            cancelEditMode();
            await renderJournal();
        }
    } else {
        // Add mode — create new log
        logData.plant_id = plantId;
        result = await addCareLog(logData);
        if (result) {
            alert('Wpis dodany pomyślnie! 📓');
            event.target.reset();
            // Reset date to today
            const dateInput = document.getElementById('log-date');
            if (dateInput) dateInput.valueAsDate = new Date();
            // Refresh logs list
            await renderJournal();
        }
    }
}

/**
 * Initialize the edit plant page
 */
async function initEditPage() {
    const urlParams = new URLSearchParams(window.location.search);
    const plantId = urlParams.get('id');

    if (!plantId) {
        alert('Nie podano ID rośliny.');
        window.location.href = 'dashboard.html';
        return;
    }

    // Set back link to details page
    const backLink = document.getElementById('back-link');
    if (backLink) {
        backLink.href = `details.html?id=${plantId}`;
    }

    // Fetch plant data
    const plant = await getPlantById(plantId);
    if (!plant) {
        alert('Nie znaleziono rośliny.');
        window.location.href = 'dashboard.html';
        return;
    }

    // Pre-fill form fields
    const nameInput = document.getElementById('plant-name');
    const speciesInput = document.getElementById('plant-species');
    const waterFreqInput = document.getElementById('water-frequency');
    const lastWateredInput = document.getElementById('last-watered');
    const purchaseDateInput = document.getElementById('purchase-date');

    if (nameInput) nameInput.value = plant.name || '';
    if (speciesInput) speciesInput.value = plant.species || '';
    if (waterFreqInput) waterFreqInput.value = plant.water_frequency || '';
    if (lastWateredInput) lastWateredInput.value = plant.last_watered || '';
    if (purchaseDateInput) purchaseDateInput.value = plant.purchase_date || '';

    // Handle form submission
    const editForm = document.getElementById('edit-plant-form');
    if (editForm) {
        editForm.addEventListener('submit', async (event) => {
            event.preventDefault();

            const formData = new FormData(event.target);

            const updates = {
                name: formData.get('name') || null,
                species: formData.get('species') || null,
                water_frequency: parseInt(formData.get('water_frequency')) || null,
                last_watered: formData.get('last_watered') || null,
                purchase_date: formData.get('purchase_date') || null,
            };

            const result = await updatePlant(plantId, updates);

            if (result) {
                alert('Zmiany zostały zapisane! ✅');
                window.location.href = `details.html?id=${plantId}`;
            }
        });
    }
}

/**
 * Toggle care log form fields based on selected type
 * - przycinanie: hide pest_name, medicine_name, concentration
 * - pasożyty: show all fields
 * - oprysk / nawożenie: show medicine_name, concentration; hide pest_name
 * - no selection: hide all three
 */
function toggleCareLogFields() {
    const typeSelect = document.getElementById('log-type');
    const pestField = document.getElementById('field-pest-name');
    const medicineField = document.getElementById('field-medicine-name');
    const concentrationField = document.getElementById('field-concentration');

    if (!typeSelect || !pestField || !medicineField || !concentrationField) return;

    const type = typeSelect.value;

    // Helper: show/hide a field and manage required attribute on its inputs
    function toggleField(field, visible) {
        if (visible) {
            field.classList.remove('hidden');
        } else {
            field.classList.add('hidden');
            // Clear and remove required from hidden inputs so form validation passes
            const inputs = field.querySelectorAll('input, select, textarea');
            inputs.forEach(input => {
                input.removeAttribute('required');
                input.value = '';
            });
        }
    }

    switch (type) {
        case 'przycinanie':
            toggleField(pestField, false);
            toggleField(medicineField, false);
            toggleField(concentrationField, false);
            break;
        case 'pasożyty':
            toggleField(pestField, true);
            toggleField(medicineField, true);
            toggleField(concentrationField, true);
            break;
        case 'oprysk':
        case 'nawożenie':
            toggleField(pestField, false);
            toggleField(medicineField, true);
            toggleField(concentrationField, true);
            break;
        default:
            // No selection — hide optional fields
            toggleField(pestField, false);
            toggleField(medicineField, false);
            toggleField(concentrationField, false);
            break;
    }
}

// ========================================
// 6. PAGE INITIALIZATION
// ========================================

/**
 * Initialize the application based on current page
 */
document.addEventListener('DOMContentLoaded', async () => {
    const currentPage = window.location.pathname.split('/').pop();

    // Check authentication for protected pages
    if (['dashboard.html', 'add.html', 'details.html', 'journal.html', 'edit.html', 'stats.html'].includes(currentPage)) {
        await checkAuthentication();
    }

    // Page-specific initialization
    switch (currentPage) {
        case 'index.html':
        case '':
            // Setup login and register buttons
            const loginBtn = document.getElementById('login-btn');
            const registerBtn = document.getElementById('register-btn');
            const emailInput = document.getElementById('email');
            const passwordInput = document.getElementById('password');

            if (loginBtn) {
                loginBtn.addEventListener('click', async () => {
                    const email = emailInput?.value || '';
                    const password = passwordInput?.value || '';

                    if (!email || !password) {
                        alert('Podaj email i hasło!');
                        return;
                    }

                    await loginUser(email, password);
                });
            }

            if (registerBtn) {
                registerBtn.addEventListener('click', async () => {
                    const email = emailInput?.value || '';
                    const password = passwordInput?.value || '';

                    if (!email || !password) {
                        alert('Podaj email i hasło!');
                        return;
                    }

                    if (password.length < 6) {
                        alert('Hasło musi mieć minimum 6 znaków!');
                        return;
                    }

                    await registerUser(email, password);
                });
            }
            break;

        case 'dashboard.html':
            await renderDashboard();
            break;

        case 'details.html':
            await renderPlantDetails();
            break;

        case 'add.html':
            // Set default date to today
            const lastWateredInput = document.getElementById('last-watered');
            if (lastWateredInput) {
                lastWateredInput.valueAsDate = new Date();
            }

            // Setup plant search button
            const searchPlantBtn = document.getElementById('search-plant-btn');
            if (searchPlantBtn) {
                searchPlantBtn.addEventListener('click', handlePlantSearch);
            }

            // Setup modal close button
            const closeModalBtn = document.querySelector('.close-modal');
            if (closeModalBtn) {
                closeModalBtn.addEventListener('click', closeModal);
            }

            // Close modal on outside click
            const modal = document.getElementById('plant-modal');
            if (modal) {
                modal.addEventListener('click', (e) => {
                    if (e.target === modal) {
                        closeModal();
                    }
                });
            }

            // Setup form submission
            const addPlantForm = document.getElementById('add-plant-form');
            if (addPlantForm) {
                addPlantForm.addEventListener('submit', handleAddPlantForm);
            }
            break;

        case 'journal.html':
            // Set default date to today
            const logDateInput = document.getElementById('log-date');
            if (logDateInput) {
                logDateInput.valueAsDate = new Date();
            }

            // Setup dynamic field visibility based on type selection
            const logTypeSelect = document.getElementById('log-type');
            if (logTypeSelect) {
                logTypeSelect.addEventListener('change', toggleCareLogFields);
                toggleCareLogFields(); // Set initial state
            }

            // Setup form submission
            const careLogForm = document.getElementById('care-log-form');
            if (careLogForm) {
                careLogForm.addEventListener('submit', handleCareLogForm);
            }

            // Render existing logs
            await renderJournal();
            break;

        case 'edit.html':
            await initEditPage();
            break;

        case 'stats.html':
            await renderStats();
            break;
    }

    // Setup logout button (available on all authenticated pages)
    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', (e) => {
            e.preventDefault();
            logoutUser();
        });
    }
});

// Export functions for global access
window.plantGuardian = {
    // Auth
    registerUser,
    loginUser,
    logoutUser,
    getCurrentUser,

    // Plants
    getPlants,
    addPlant,
    getPlantById,
    updatePlant,
    deletePlant,

    // Care Logs
    getPlantLogs,
    addCareLog,
    getAllUserLogs,

    // API
    // searchPlantImage,

    // Watering
    needsWater,
    getWateringStatus,
};

// Export standalone functions for inline handlers
window.quickWater = quickWater;
