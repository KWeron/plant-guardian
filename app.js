// ========================================
// Plant Guardian - Main Application Logic
// ========================================

// ========================================
// 1. SETUP - Supabase & API Keys
// ========================================

// Supabase Configuration (Replace with your actual values)
const SUPABASE_URL = 'https://kchryjbzelncvriufpre.supabase.co'; // e.g., https://xxxxx.supabase.co
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtjaHJ5amJ6ZWxuY3ZyaXVmcHJlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA5MDk4ODksImV4cCI6MjA4NjQ4NTg4OX0.1iSm-TdB0g4WfyB0TIeh7ncqYdT4IjPKyJWLBjRmlzA';

// Pixabay API Key (Replace with your actual key from https://pixabay.com/api/docs/)
const PIXABAY_API_KEY = '54631146-8dddee92f5e389d5dd266b899';

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
    const currentPage = window.location.pathname.split('/').pop();
    
    if (protectedPages.includes(currentPage) && !user) {
        alert('Musisz być zalogowany, aby uzyskać dostęp do tej strony.');
        window.location.href = 'index.html';
        return false;
    }
    
    return user;
}

// ========================================
// 3. PIXABAY API INTEGRATION
// ========================================

/**
 * Search for plant image using Pixabay API
 */
async function searchPlantImage(plantName) {
    try {
        const searchQuery = encodeURIComponent(plantName + ' plant');
        const url = `https://pixabay.com/api/?key=${PIXABAY_API_KEY}&q=${searchQuery}&image_type=photo&per_page=3`;
        
        const response = await fetch(url);
        
        if (!response.ok) {
            throw new Error('Pixabay API request failed');
        }
        
        const data = await response.json();
        
        if (data.hits && data.hits.length > 0) {
            // Return the first image URL (webformatURL is medium quality)
            return data.hits[0].webformatURL;
        } else {
            throw new Error('No images found');
        }
    } catch (error) {
        console.error('Pixabay API error:', error);
        
        // Fallback to Unsplash Source (no API key required, but less reliable)
        const fallbackUrl = `https://source.unsplash.com/600x400/?${encodeURIComponent(plantName)},plant`;
        return fallbackUrl;
    }
}

/**
 * Handle auto image search button click (for add.html)
 */
async function handleAutoImageSearch() {
    const plantNameInput = document.getElementById('plant-name');
    const plantSpeciesInput = document.getElementById('plant-species');
    const imageUrlInput = document.getElementById('image-url');
    const imagePreview = document.getElementById('image-preview');
    const searchButton = document.getElementById('auto-search-btn');
    
    const plantName = plantNameInput?.value || '';
    const plantSpecies = plantSpeciesInput?.value || '';
    
    if (!plantName && !plantSpecies) {
        alert('Podaj nazwę lub gatunek rośliny, aby wyszukać zdjęcie!');
        return;
    }
    
    const searchQuery = plantSpecies || plantName;
    
    // Show loading state
    if (searchButton) {
        searchButton.innerHTML = '⏳ Szukam...';
        searchButton.disabled = true;
    }
    
    try {
        const imageUrl = await searchPlantImage(searchQuery);
        
        // Set image URL to input and preview
        if (imageUrlInput) {
            imageUrlInput.value = imageUrl;
        }
        
        if (imagePreview) {
            imagePreview.src = imageUrl;
            imagePreview.classList.add('visible');
        }
        
        // Success state
        if (searchButton) {
            searchButton.innerHTML = '✓ Znaleziono!';
            setTimeout(() => {
                searchButton.innerHTML = '🔍 Znajdź zdjęcie (Auto)';
                searchButton.disabled = false;
            }, 2000);
        }
    } catch (error) {
        console.error('Error searching for image:', error);
        alert('Nie udało się znaleźć zdjęcia. Spróbuj ponownie lub wpisz URL ręcznie.');
        
        if (searchButton) {
            searchButton.innerHTML = '🔍 Znajdź zdjęcie (Auto)';
            searchButton.disabled = false;
        }
    }
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
            .eq('id', plantId)
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
 * Create a plant card element
 */
function createPlantCard(plant) {
    const card = document.createElement('div');
    card.className = 'plant-card';
    
    const defaultImage = 'https://images.unsplash.com/photo-1466781783364-36c955e42a7f?w=400';
    const needsWatering = needsWater(plant.last_watered, plant.water_frequency);
    const wateringStatus = getWateringStatus(plant.last_watered, plant.water_frequency);
    
    // Add class for plants that need watering
    if (needsWatering) {
        card.classList.add('needs-water');
    }
    
    card.innerHTML = `
        <img src="${plant.image_url || defaultImage}" 
             alt="${plant.name}" 
             class="plant-card-image"
             onerror="this.src='${defaultImage}'">
        <div class="plant-card-content">
            <h3>${plant.name}</h3>
            <div class="plant-info">
                <span>🌿 Gatunek: ${plant.species || 'Nieznany'}</span>
                <span>💧 Podlewanie: co ${plant.water_frequency || '?'} dni</span>
                <span>📅 Ostatnio podlana: ${plant.last_watered || 'Nieznane'}</span>
                ${needsWatering ? `<span class="water-alert" style="color: ${wateringStatus.color}; font-weight: bold;">${wateringStatus.message}</span>` : ''}
            </div>
            <div class="plant-card-actions">
                ${needsWatering ? `
                    <button class="btn btn-primary btn-small quick-water-btn" onclick="event.stopPropagation(); quickWater('${plant.id}')">
                        💧 Podlej teraz
                    </button>
                ` : ''}
                <button class="btn btn-secondary btn-small" onclick="event.stopPropagation(); window.location.href='details.html?id=${plant.id}'">
                    Szczegóły
                </button>
            </div>
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
 * Render plant details page
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
    
    // Update page elements
    const defaultImage = 'https://images.unsplash.com/photo-1466781783364-36c955e42a7f?w=800';
    
    document.getElementById('plant-image').src = plant.image_url || defaultImage;
    document.getElementById('plant-name').textContent = plant.name;
    document.getElementById('plant-species').textContent = `Gatunek: ${plant.species || 'Nieznany'}`;
    document.getElementById('water-frequency').textContent = `Co ${plant.water_frequency || '?'} dni`;
    document.getElementById('last-watered').textContent = plant.last_watered || 'Nieznane';
    
    // Calculate next watering date and status
    if (plant.last_watered && plant.water_frequency) {
        const lastWatered = new Date(plant.last_watered);
        const nextWatering = new Date(lastWatered);
        nextWatering.setDate(nextWatering.getDate() + plant.water_frequency);
        document.getElementById('next-watering').textContent = nextWatering.toISOString().split('T')[0];
        
        // Use the watering status function
        const wateringStatus = getWateringStatus(plant.last_watered, plant.water_frequency);
        const statusElement = document.getElementById('watering-status');
        statusElement.textContent = wateringStatus.message;
        statusElement.style.color = wateringStatus.color;
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
    
    // Edit button (placeholder for future implementation)
    const editBtn = document.getElementById('edit-btn');
    if (editBtn) {
        editBtn.onclick = () => {
            alert('Funkcja edycji będzie dostępna wkrótce!');
        };
    }
}

/**
 * Handle add plant form submission
 */
async function handleAddPlantForm(event) {
    event.preventDefault();
    
    const formData = new FormData(event.target);
    const plantData = {
        name: formData.get('name'),
        species: formData.get('species'),
        image_url: formData.get('image_url'),
        water_frequency: parseInt(formData.get('water_frequency')) || null,
        last_watered: formData.get('last_watered'),
    };
    
    const result = await addPlant(plantData);
    
    if (result) {
        alert('Roślina została dodana pomyślnie! 🌱');
        window.location.href = 'dashboard.html';
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
    if (['dashboard.html', 'add.html', 'details.html'].includes(currentPage)) {
        await checkAuthentication();
    }
    
    // Page-specific initialization
    switch (currentPage) {
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
            
            // Setup image preview
            const imageUrlInput = document.getElementById('image-url');
            const imagePreview = document.getElementById('image-preview');
            if (imageUrlInput && imagePreview) {
                imageUrlInput.addEventListener('input', function() {
                    if (this.value) {
                        imagePreview.src = this.value;
                        imagePreview.classList.add('visible');
                    } else {
                        imagePreview.classList.remove('visible');
                    }
                });
            }
            
            // Setup auto search button
            const autoSearchBtn = document.getElementById('auto-search-btn');
            if (autoSearchBtn) {
                autoSearchBtn.addEventListener('click', handleAutoImageSearch);
            }
            
            // Setup form submission
            const addPlantForm = document.getElementById('add-plant-form');
            if (addPlantForm) {
                addPlantForm.addEventListener('submit', handleAddPlantForm);
            }
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
    
    // API
    searchPlantImage,
    
    // Watering
    needsWater,
    getWateringStatus,
};

// Export standalone functions for inline handlers
window.quickWater = quickWater;
