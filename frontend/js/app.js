// Rice Supply Chain Management System - Frontend JavaScript

// Configuration
const API_BASE_URL = 'http://localhost:3000/api';

// Global variables
let currentSection = 'dashboard';
let currentEntity = null;
let currentData = [];
let isEditing = false;
let editingId = null;

// Initialize the application
document.addEventListener('DOMContentLoaded', function() {
    initializeApp();
});

function initializeApp() {
    setupEventListeners();
    loadDashboard();
    showSection('dashboard');
}

// Event Listeners
function setupEventListeners() {
    // Sidebar navigation
    document.querySelectorAll('.nav-link').forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            const section = this.getAttribute('data-section');
            if (section) {
                showSection(section);
            }
        });
    });

    // Add button
    document.getElementById('add-btn').addEventListener('click', function() {
        openModal('add');
    });

    // Save button
    document.getElementById('saveBtn').addEventListener('click', function() {
        saveEntity();
    });

    // Search inputs
    setupSearchListeners();
}

function setupSearchListeners() {
    const searchInputs = [
        'actors-search',
        'seasons-search', 
        'batches-search',
        'milled-search',
        'transactions-search'
    ];

    searchInputs.forEach(inputId => {
        const input = document.getElementById(inputId);
        if (input) {
            input.addEventListener('input', function() {
                filterTable(this.value, inputId.replace('-search', ''));
            });
        }
    });
}

// Navigation and UI
function showSection(section) {
    // Update active nav link
    document.querySelectorAll('.nav-link').forEach(link => {
        link.classList.remove('active');
    });
    document.querySelector(`[data-section="${section}"]`).classList.add('active');

    // Hide all sections
    document.querySelectorAll('.content-section').forEach(sec => {
        sec.style.display = 'none';
    });

    // Show selected section
    document.getElementById(`${section}-section`).style.display = 'block';

    // Update page title and show/hide add button
    const titles = {
        'dashboard': 'Dashboard',
        'chain-actors': 'Chain Actors',
        'production-seasons': 'Production Seasons',
        'rice-batches': 'Rice Batches',
        'milled-rice': 'Milled Rice',
        'chain-transactions': 'Chain Transactions'
    };

    document.getElementById('page-title').textContent = titles[section];
    
    const addBtn = document.getElementById('add-btn');
    if (section === 'dashboard' || section === 'chain-transactions') {
        addBtn.style.display = 'none';
    } else {
        addBtn.style.display = 'block';
    }

    currentSection = section;
    currentEntity = section.replace('-', '_');

    // Load data for the section
    switch (section) {
        case 'dashboard':
            loadDashboard();
            break;
        case 'chain-actors':
            loadChainActors();
            break;
        case 'production-seasons':
            loadProductionSeasons();
            break;
        case 'rice-batches':
            loadRiceBatches();
            break;
        case 'milled-rice':
            loadMilledRice();
            break;
        case 'chain-transactions':
            loadChainTransactions();
            break;
    }
}

// Dashboard Functions
async function loadDashboard() {
    try {
        showLoading(true);
        
        // Load counts for dashboard cards
        const [actors, batches, milled, transactions] = await Promise.all([
            fetchData('/chain-actors'),
            fetchData('/rice-batches'),
            fetchData('/milled-rice'),
            fetchData('/transactions')
        ]);

        document.getElementById('actors-count').textContent = actors.data?.length || 0;
        document.getElementById('batches-count').textContent = batches.data?.length || 0;
        document.getElementById('milled-count').textContent = milled.data?.length || 0;
        document.getElementById('transactions-count').textContent = transactions.data?.length || 0;
        
    } catch (error) {
        console.error('Error loading dashboard:', error);
        showToast('Error loading dashboard data', 'error');
    } finally {
        showLoading(false);
    }
}

// Data Loading Functions
async function loadChainActors() {
    try {
        showLoading(true);
        const response = await fetchData('/chain-actors');
        currentData = response.data || [];
        renderChainActorsTable(currentData);
    } catch (error) {
        console.error('Error loading chain actors:', error);
        showToast('Error loading chain actors', 'error');
    } finally {
        showLoading(false);
    }
}

async function loadProductionSeasons() {
    try {
        showLoading(true);
        const response = await fetchData('/production-seasons');
        currentData = response.data || [];
        renderProductionSeasonsTable(currentData);
    } catch (error) {
        console.error('Error loading production seasons:', error);
        showToast('Error loading production seasons', 'error');
    } finally {
        showLoading(false);
    }
}

async function loadRiceBatches() {
    try {
        showLoading(true);
        const response = await fetchData('/rice-batches');
        currentData = response.data || [];
        renderRiceBatchesTable(currentData);
    } catch (error) {
        console.error('Error loading rice batches:', error);
        showToast('Error loading rice batches', 'error');
    } finally {
        showLoading(false);
    }
}

async function loadMilledRice() {
    try {
        showLoading(true);
        const response = await fetchData('/milled-rice');
        currentData = response.data || [];
        renderMilledRiceTable(currentData);
    } catch (error) {
        console.error('Error loading milled rice:', error);
        showToast('Error loading milled rice', 'error');
    } finally {
        showLoading(false);
    }
}

async function loadChainTransactions() {
    try {
        showLoading(true);
        const response = await fetchData('/transactions');
        currentData = response.data || [];
        renderChainTransactionsTable(currentData);
    } catch (error) {
        console.error('Error loading chain transactions:', error);
        showToast('Error loading chain transactions', 'error');
    } finally {
        showLoading(false);
    }
}

// Table Rendering Functions
function renderChainActorsTable(data) {
    const tbody = document.getElementById('actors-tbody');
    tbody.innerHTML = '';

    if (!data || data.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" class="text-center text-muted">No chain actors found</td></tr>';
        return;
    }

    data.forEach(actor => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${actor.id}</td>
            <td>${actor.name}</td>
            <td><span class="badge bg-primary">${actor.type}</span></td>
            <td>${actor.contact_info || '-'}</td>
            <td>${actor.location || '-'}</td>
            <td><span class="badge ${actor.status === 'active' ? 'bg-success' : 'bg-secondary'}">${actor.status}</span></td>
            <td class="action-buttons">
                <button class="btn btn-sm btn-warning" onclick="editEntity('chain_actors', ${actor.id})">
                    <i class="fas fa-edit"></i>
                </button>
                <button class="btn btn-sm btn-danger" onclick="deleteEntity('chain_actors', ${actor.id})">
                    <i class="fas fa-trash"></i>
                </button>
            </td>
        `;
        tbody.appendChild(row);
    });
}

function renderProductionSeasonsTable(data) {
    const tbody = document.getElementById('seasons-tbody');
    tbody.innerHTML = '';

    if (!data || data.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" class="text-center text-muted">No production seasons found</td></tr>';
        return;
    }

    data.forEach(season => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${season.id}</td>
            <td>${season.season_name}</td>
            <td>${formatDate(season.start_date)}</td>
            <td>${formatDate(season.end_date)}</td>
            <td><span class="badge ${season.status === 'active' ? 'bg-success' : 'bg-secondary'}">${season.status}</span></td>
            <td class="text-truncate">${season.description || '-'}</td>
            <td class="action-buttons">
                <button class="btn btn-sm btn-warning" onclick="editEntity('production_seasons', ${season.id})">
                    <i class="fas fa-edit"></i>
                </button>
                <button class="btn btn-sm btn-danger" onclick="deleteEntity('production_seasons', ${season.id})">
                    <i class="fas fa-trash"></i>
                </button>
            </td>
        `;
        tbody.appendChild(row);
    });
}

function renderRiceBatchesTable(data) {
    const tbody = document.getElementById('batches-tbody');
    tbody.innerHTML = '';

    if (!data || data.length === 0) {
        tbody.innerHTML = '<tr><td colspan="8" class="text-center text-muted">No rice batches found</td></tr>';
        return;
    }

    data.forEach(batch => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${batch.id}</td>
            <td>${batch.batch_number}</td>
            <td>${batch.farmer_name || '-'}</td>
            <td>${batch.rice_variety}</td>
            <td>${formatDate(batch.harvest_date)}</td>
            <td>${batch.quantity_harvested || '-'}</td>
            <td>${batch.quality_grade || '-'}</td>
            <td class="action-buttons">
                <button class="btn btn-sm btn-warning" onclick="editEntity('rice_batches', ${batch.id})">
                    <i class="fas fa-edit"></i>
                </button>
                <button class="btn btn-sm btn-danger" onclick="deleteEntity('rice_batches', ${batch.id})">
                    <i class="fas fa-trash"></i>
                </button>
            </td>
        `;
        tbody.appendChild(row);
    });
}

function renderMilledRiceTable(data) {
    const tbody = document.getElementById('milled-tbody');
    tbody.innerHTML = '';

    if (!data || data.length === 0) {
        tbody.innerHTML = '<tr><td colspan="8" class="text-center text-muted">No milled rice records found</td></tr>';
        return;
    }

    data.forEach(milled => {
        const yieldPercentage = milled.input_quantity && milled.output_quantity 
            ? ((milled.output_quantity / milled.input_quantity) * 100).toFixed(2)
            : '-';
            
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${milled.id}</td>
            <td>${milled.batch_number || '-'}</td>
            <td>${milled.miller_name || '-'}</td>
            <td>${formatDate(milled.milling_date)}</td>
            <td>${milled.input_quantity || '-'}</td>
            <td>${milled.output_quantity || '-'}</td>
            <td>${yieldPercentage}%</td>
            <td class="action-buttons">
                <button class="btn btn-sm btn-warning" onclick="editEntity('milled_rice', ${milled.id})">
                    <i class="fas fa-edit"></i>
                </button>
                <button class="btn btn-sm btn-danger" onclick="deleteEntity('milled_rice', ${milled.id})">
                    <i class="fas fa-trash"></i>
                </button>
            </td>
        `;
        tbody.appendChild(row);
    });
}

function renderChainTransactionsTable(data) {
    const tbody = document.getElementById('transactions-tbody');
    tbody.innerHTML = '';

    if (!data || data.length === 0) {
        tbody.innerHTML = '<tr><td colspan="8" class="text-center text-muted">No chain transactions found</td></tr>';
        return;
    }

    data.forEach(transaction => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td class="text-truncate">${transaction.transaction_id}</td>
            <td><span class="badge bg-info">${transaction.transaction_type}</span></td>
            <td>${transaction.from_actor_id || '-'}</td>
            <td>${transaction.to_actor_id || '-'}</td>
            <td>${transaction.quantity || '-'}</td>
            <td>${transaction.total_amount || '-'}</td>
            <td>${formatDate(transaction.transaction_date)}</td>
            <td><span class="badge ${getStatusBadgeClass(transaction.status)}">${transaction.status}</span></td>
        `;
        tbody.appendChild(row);
    });
}

// Modal Functions
function openModal(mode, entityType = null, id = null) {
    isEditing = mode === 'edit';
    editingId = id;
    
    const modal = new bootstrap.Modal(document.getElementById('entityModal'));
    const modalTitle = document.getElementById('modalTitle');
    const formFields = document.getElementById('formFields');
    
    modalTitle.textContent = isEditing ? 'Edit ' + getCurrentEntityDisplayName() : 'Add New ' + getCurrentEntityDisplayName();
    
    // Generate form fields based on current entity
    formFields.innerHTML = generateFormFields(currentEntity);
    
    // If editing, populate form with existing data
    if (isEditing && id) {
        populateForm(id);
    }
    
    modal.show();
}

function generateFormFields(entityType) {
    const fields = getEntityFields(entityType);
    let html = '';
    
    fields.forEach(field => {
        html += `
            <div class="mb-3">
                <label for="${field.name}" class="form-label">${field.label}</label>
                ${generateFieldInput(field)}
            </div>
        `;
    });
    
    return html;
}

function generateFieldInput(field) {
    switch (field.type) {
        case 'select':
            let options = '';
            field.options.forEach(option => {
                options += `<option value="${option.value}">${option.label}</option>`;
            });
            return `<select class="form-control" id="${field.name}" ${field.required ? 'required' : ''}>
                        <option value="">Select ${field.label}</option>
                        ${options}
                    </select>`;
        case 'textarea':
            return `<textarea class="form-control" id="${field.name}" rows="3" ${field.required ? 'required' : ''}></textarea>`;
        case 'date':
            return `<input type="date" class="form-control" id="${field.name}" ${field.required ? 'required' : ''}>`;
        case 'number':
            return `<input type="number" class="form-control" id="${field.name}" step="0.01" ${field.required ? 'required' : ''}>`;
        default:
            return `<input type="text" class="form-control" id="${field.name}" ${field.required ? 'required' : ''}>`;
    }
}

function getEntityFields(entityType) {
    const fieldDefinitions = {
        'chain_actors': [
            { name: 'name', label: 'Name', type: 'text', required: true },
            { name: 'type', label: 'Type', type: 'select', required: true, 
              options: [
                  { value: 'farmer', label: 'Farmer' },
                  { value: 'miller', label: 'Miller' },
                  { value: 'distributor', label: 'Distributor' },
                  { value: 'retailer', label: 'Retailer' }
              ]
            },
            { name: 'contact_info', label: 'Contact Info', type: 'text', required: false },
            { name: 'location', label: 'Location', type: 'text', required: false },
            { name: 'status', label: 'Status', type: 'select', required: true,
              options: [
                  { value: 'active', label: 'Active' },
                  { value: 'inactive', label: 'Inactive' }
              ]
            }
        ],
        'production_seasons': [
            { name: 'season_name', label: 'Season Name', type: 'text', required: true },
            { name: 'start_date', label: 'Start Date', type: 'date', required: true },
            { name: 'end_date', label: 'End Date', type: 'date', required: true },
            { name: 'status', label: 'Status', type: 'select', required: true,
              options: [
                  { value: 'active', label: 'Active' },
                  { value: 'inactive', label: 'Inactive' }
              ]
            },
            { name: 'description', label: 'Description', type: 'textarea', required: false }
        ],
        'rice_batches': [
            { name: 'batch_number', label: 'Batch Number', type: 'text', required: true },
            { name: 'farmer_id', label: 'Farmer ID', type: 'number', required: true },
            { name: 'production_season_id', label: 'Production Season ID', type: 'number', required: true },
            { name: 'rice_variety', label: 'Rice Variety', type: 'text', required: true },
            { name: 'planting_date', label: 'Planting Date', type: 'date', required: false },
            { name: 'harvest_date', label: 'Harvest Date', type: 'date', required: false },
            { name: 'quantity_harvested', label: 'Quantity Harvested', type: 'number', required: false },
            { name: 'quality_grade', label: 'Quality Grade', type: 'text', required: false },
            { name: 'farming_practices', label: 'Farming Practices', type: 'textarea', required: false },
            { name: 'certifications', label: 'Certifications', type: 'text', required: false },
            { name: 'storage_conditions', label: 'Storage Conditions', type: 'textarea', required: false }
        ],
        'milled_rice': [
            { name: 'batch_id', label: 'Batch ID', type: 'number', required: true },
            { name: 'miller_id', label: 'Miller ID', type: 'number', required: true },
            { name: 'milling_date', label: 'Milling Date', type: 'date', required: true },
            { name: 'input_quantity', label: 'Input Quantity', type: 'number', required: true },
            { name: 'output_quantity', label: 'Output Quantity', type: 'number', required: true },
            { name: 'milling_process', label: 'Milling Process', type: 'textarea', required: false },
            { name: 'quality_parameters', label: 'Quality Parameters', type: 'textarea', required: false },
            { name: 'packaging_details', label: 'Packaging Details', type: 'textarea', required: false }
        ]
    };
    
    return fieldDefinitions[entityType] || [];
}

function populateForm(id) {
    const entity = currentData.find(item => item.id == id);
    if (!entity) return;
    
    const fields = getEntityFields(currentEntity);
    fields.forEach(field => {
        const input = document.getElementById(field.name);
        if (input && entity[field.name] !== undefined) {
            input.value = entity[field.name];
        }
    });
}

async function saveEntity() {
    try {
        const formData = collectFormData();
        const endpoint = getEntityEndpoint(currentEntity);
        
        let response;
        if (isEditing) {
            response = await updateData(`${endpoint}/${editingId}`, formData);
        } else {
            response = await createData(endpoint, formData);
        }
        
        if (response.success) {
            showToast(isEditing ? 'Updated successfully' : 'Created successfully', 'success');
            bootstrap.Modal.getInstance(document.getElementById('entityModal')).hide();
            
            // Reload current section data
            switch (currentSection) {
                case 'chain-actors':
                    loadChainActors();
                    break;
                case 'production-seasons':
                    loadProductionSeasons();
                    break;
                case 'rice-batches':
                    loadRiceBatches();
                    break;
                case 'milled-rice':
                    loadMilledRice();
                    break;
            }
        } else {
            showToast(response.error || 'Operation failed', 'error');
        }
    } catch (error) {
        console.error('Error saving entity:', error);
        showToast('Error saving data', 'error');
    }
}

function collectFormData() {
    const fields = getEntityFields(currentEntity);
    const data = {};
    
    fields.forEach(field => {
        const input = document.getElementById(field.name);
        if (input) {
            data[field.name] = input.value || null;
        }
    });
    
    return data;
}

// CRUD Operations
async function editEntity(entityType, id) {
    currentEntity = entityType;
    openModal('edit', entityType, id);
}

async function deleteEntity(entityType, id) {
    if (!confirm('Are you sure you want to delete this item?')) {
        return;
    }
    
    try {
        const endpoint = getEntityEndpoint(entityType);
        const response = await deleteData(`${endpoint}/${id}`);
        
        if (response.success) {
            showToast('Deleted successfully', 'success');
            
            // Reload current section data
            switch (currentSection) {
                case 'chain-actors':
                    loadChainActors();
                    break;
                case 'production-seasons':
                    loadProductionSeasons();
                    break;
                case 'rice-batches':
                    loadRiceBatches();
                    break;
                case 'milled-rice':
                    loadMilledRice();
                    break;
            }
        } else {
            showToast(response.error || 'Delete failed', 'error');
        }
    } catch (error) {
        console.error('Error deleting entity:', error);
        showToast('Error deleting data', 'error');
    }
}

// API Functions
async function fetchData(endpoint) {
    const response = await fetch(`${API_BASE_URL}${endpoint}`);
    return await response.json();
}

async function createData(endpoint, data) {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
    });
    return await response.json();
}

async function updateData(endpoint, data) {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
    });
    return await response.json();
}

async function deleteData(endpoint) {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        method: 'DELETE'
    });
    return await response.json();
}

// Utility Functions
function getEntityEndpoint(entityType) {
    const endpoints = {
        'chain_actors': '/chain-actors',
        'production_seasons': '/production-seasons',
        'rice_batches': '/rice-batches',
        'milled_rice': '/milled-rice'
    };
    return endpoints[entityType];
}

function getCurrentEntityDisplayName() {
    const names = {
        'chain_actors': 'Chain Actor',
        'production_seasons': 'Production Season',
        'rice_batches': 'Rice Batch',
        'milled_rice': 'Milled Rice'
    };
    return names[currentEntity] || 'Item';
}

function formatDate(dateString) {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleDateString();
}

function getStatusBadgeClass(status) {
    const classes = {
        'active': 'bg-success',
        'inactive': 'bg-secondary',
        'pending': 'bg-warning',
        'completed': 'bg-success',
        'cancelled': 'bg-danger'
    };
    return classes[status] || 'bg-secondary';
}

function filterTable(searchTerm, tableType) {
    const tableId = `${tableType}-table`;
    const table = document.getElementById(tableId);
    if (!table) return;
    
    const tbody = table.querySelector('tbody');
    const rows = tbody.querySelectorAll('tr');
    
    rows.forEach(row => {
        const text = row.textContent.toLowerCase();
        const matches = text.includes(searchTerm.toLowerCase());
        row.style.display = matches ? '' : 'none';
    });
}

function showLoading(show) {
    const spinner = document.getElementById('loadingSpinner');
    if (show) {
        spinner.classList.remove('d-none');
    } else {
        spinner.classList.add('d-none');
    }
}

function showToast(message, type = 'info') {
    const toast = document.getElementById('toast');
    const toastBody = document.getElementById('toastBody');
    const toastTitle = document.getElementById('toastTitle');
    
    toastTitle.textContent = type === 'error' ? 'Error' : 'Success';
    toastBody.textContent = message;
    
    // Update toast styling based on type
    toast.className = `toast ${type === 'error' ? 'bg-danger text-white' : 'bg-success text-white'}`;
    
    const bsToast = new bootstrap.Toast(toast);
    bsToast.show();
}