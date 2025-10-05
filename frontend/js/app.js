// Rice Supply Chain Management System - Frontend JavaScript

// Configuration
// Dynamic API base URL that works for both local development and deployed environments
const API_BASE_URL = `${window.location.protocol}//${window.location.host}/api`;

// Global variables
let currentSection = 'dashboard';
let currentEntity = null;

// Initialize the application
document.addEventListener('DOMContentLoaded', function() {
    initializeApp();
});

function initializeApp() {
    setupEventListeners();
    initializeTheme();
    initializeApiTester();
    loadDashboard();
    loadRecentTransactions();
    showSection('dashboard');
}

// API Tester
function initializeApiTester() {
    // Update API URL based on current domain
    const currentDomain = `${window.location.protocol}//${window.location.host}`;
    const apiUrlInput = document.getElementById('api-url');
    const endpointSelect = document.getElementById('api-endpoint');
    const methodSelect = document.getElementById('api-method');
    const requestBodySection = document.getElementById('request-body-table-section');
    const headersTextarea = document.getElementById('api-headers');
    const bodyTextarea = document.getElementById('api-body');
    
    if (!apiUrlInput || !endpointSelect) return; // Elements may not exist yet
    
    function updateApiUrl() {
        const selectedEndpoint = endpointSelect.value;
        apiUrlInput.value = `${currentDomain}${selectedEndpoint}`;

        // Auto-set POST method and initialize params for sample transaction
        if (selectedEndpoint === '/api/transactions/sample') {
            if (methodSelect) methodSelect.value = 'POST';
            if (headersTextarea && !headersTextarea.value) {
                headersTextarea.value = JSON.stringify({ 'Content-Type': 'application/json' }, null, 2);
            }
            initializeDefaultParams();
        }
        
        // Update body section visibility
        updateBodySectionVisibility();
    }
    
    // Set initial URL
    updateApiUrl();
    
    // Update URL when endpoint changes
    endpointSelect.addEventListener('change', function() {
        updateApiUrl();
        updateBodySectionVisibility();
    });
    
    // Initialize default parameters for sample transaction
    function initializeDefaultParams() {
        const tableBody = document.getElementById('params-table-body');
        if (!tableBody) return;
        
        // Clear existing params
        tableBody.innerHTML = '';
        
        // Default parameters for sample transaction
        const defaultParams = [
            { key: 'from_actor_id', value: '1' },
            { key: 'to_actor_id', value: '2' },
            { key: 'quantity', value: '50kg' },
            { key: 'unit_price', value: '200' },
            { key: 'payment_reference', value: '0' },
            { key: 'status', value: 'completed' }
        ];
        
        defaultParams.forEach(param => {
            addParameterRow(param.key, param.value, false);
        });
    }
    
    // Add parameter row
    function addParameterRow(key = '', value = '', isEditable = true) {
        const tableBody = document.getElementById('params-table-body');
        if (!tableBody) return;
        
        const paramRow = document.createElement('tr');
        paramRow.className = 'param-row';
        paramRow.innerHTML = `
            <td>
                <input type="text" class="form-control param-key" placeholder="Parameter name" value="${key}" ${isEditable ? '' : 'readonly'}>
            </td>
            <td>
                <input type="text" class="form-control param-value" placeholder="Enter value here..." value="${value}">
            </td>
            <td class="text-center">
                <button type="button" class="btn btn-outline-danger btn-sm remove-param-btn" title="Remove parameter">
                    <i class="fas fa-times"></i>
                </button>
            </td>
        `;
        
        // Add remove functionality
        paramRow.querySelector('.remove-param-btn').addEventListener('click', function() {
            paramRow.remove();
        });
        
        tableBody.appendChild(paramRow);
    }
    
    // Setup add parameter button
    const addParamBtn = document.getElementById('add-param-btn');
    if (addParamBtn) {
        addParamBtn.addEventListener('click', function() {
            addParameterRow('', '', true); // Allow editing for manually added parameters
        });
    }
    
    // Update method dropdown change handler
    if (methodSelect) {
        methodSelect.addEventListener('change', function() {
            updateBodySectionVisibility();
        });
    }
    
    // Function to update body section visibility
    function updateBodySectionVisibility() {
        const requestBodyTableSection = document.getElementById('request-body-table-section');
        const method = methodSelect.value;
        
        if (method === 'POST' || method === 'PUT') {
            // Show parameter table for ALL POST/PUT requests
            if (requestBodyTableSection) {
                requestBodyTableSection.style.display = 'block';
                // Only initialize default params for sample transaction
                const selectedEndpoint = endpointSelect.value;
                if (selectedEndpoint === '/api/transactions/sample') {
                    initializeDefaultParams();
                } else {
                    // Auto-populate parameters based on endpoint
                    initializeEndpointParams();
                }
            }
            if (requestBodySection) requestBodySection.style.display = 'none';
        } else {
            if (requestBodyTableSection) requestBodyTableSection.style.display = 'none';
            if (requestBodySection) requestBodySection.style.display = 'none';
        }
    }
    
    // Initialize parameters based on endpoint
    function initializeEndpointParams() {
        const tableBody = document.getElementById('params-table-body');
        if (!tableBody) return;
        
        // Clear existing params
        tableBody.innerHTML = '';
        
        const selectedEndpoint = endpointSelect.value;
        let params = [];
        
        switch (selectedEndpoint) {
            case '/api/chain-actors':
                params = [
                    { key: 'name', value: '', description: 'Actor name' },
                    { key: 'type', value: '', description: 'farmer/miller/trader' },
                    { key: 'contact_info', value: '', description: 'Contact details' },
                    { key: 'location', value: '', description: 'Location' },
                    { key: 'group', value: '', description: 'Group name' },
                    { key: 'farmer_id', value: '', description: 'Farmer ID' }
                ];
                break;
            case '/api/production-seasons':
                params = [
                    { key: 'season_name', value: '', description: 'Season name' },
                    { key: 'planting_date', value: '', description: 'YYYY-MM-DD' },
                    { key: 'harvesting_date', value: '', description: 'YYYY-MM-DD' },
                    { key: 'variety', value: '', description: 'Rice variety' },
                    { key: 'carbon_certified', value: '', description: 'true/false' },
                    { key: 'farmer_id', value: '', description: 'Farmer ID' }
                ];
                break;
            case '/api/rice-batches':
                params = [
                    { key: 'batch_number', value: '', description: 'Batch number' },
                    { key: 'farmer_id', value: '', description: 'Farmer ID' },
                    { key: 'rice_variety', value: '', description: 'Rice variety' },
                    { key: 'harvest_date', value: '', description: 'YYYY-MM-DD' },
                    { key: 'quantity_harvested', value: '', description: 'Quantity' },
                    { key: 'quality_grade', value: '', description: 'Quality grade' }
                ];
                break;
            case '/api/milled-rice':
                params = [
                    { key: 'batch_id', value: '', description: 'Batch ID' },
                    { key: 'miller_id', value: '', description: 'Miller ID' },
                    { key: 'milling_date', value: '', description: 'YYYY-MM-DD' },
                    { key: 'input_quantity', value: '', description: 'Input quantity' },
                    { key: 'output_quantity', value: '', description: 'Output quantity' }
                ];
                break;
            case '/api/transactions':
                params = [
                    { key: 'from_actor_id', value: '', description: 'From actor ID' },
                    { key: 'to_actor_id', value: '', description: 'To actor ID' },
                    { key: 'quantity', value: '', description: 'Quantity' },
                    { key: 'unit_price', value: '', description: 'Unit price' },
                    { key: 'payment_reference', value: '', description: '0=Cash, 1=Cheque, 2=Balance' },
                    { key: 'status', value: '', description: 'Transaction status' }
                ];
                break;
            default:
                params = [
                    { key: 'name', value: '', description: 'Parameter name' },
                    { key: 'value', value: '', description: 'Parameter value' }
                ];
        }
        
        params.forEach(param => {
            addParameterRow(param.key, param.value, false);
        });
    }
    
    // Check if there are existing parameter rows
    function hasExistingParams() {
        const tableBody = document.getElementById('params-table-body');
        return tableBody && tableBody.children.length > 0;
    }
}

// Theme Management
function initializeTheme() {
    const savedTheme = localStorage.getItem('theme') || 'light';
    document.documentElement.setAttribute('data-theme', savedTheme);
    updateThemeIcon(savedTheme);
    
    // Theme toggle event listener
    document.getElementById('themeToggle').addEventListener('click', toggleTheme);
}

function toggleTheme() {
    const currentTheme = document.documentElement.getAttribute('data-theme');
    const newTheme = currentTheme === 'light' ? 'dark' : 'light';
    
    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('theme', newTheme);
    updateThemeIcon(newTheme);
}

function updateThemeIcon(theme) {
    const themeIcon = document.getElementById('themeIcon');
    themeIcon.className = theme === 'light' ? 'fas fa-moon' : 'fas fa-sun';
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
        'chain-transactions': 'Chain Transactions',
        'api-tester': 'API Tester',
        'batch-tracker': 'Batch Tracker'
    };

    document.getElementById('page-title').textContent = titles[section];
    
    const addBtn = document.getElementById('add-btn');
    if (section === 'dashboard' || section === 'api-tester' || section === 'batch-tracker') {
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
        case 'api-tester':
            initializeApiTester();
            break;
        case 'batch-tracker':
            loadBatchTracker();
            break;
    }
}

// Dashboard Functions
async function loadDashboard() {
    try {
        showLoading(true);
        
        // Load counts for dashboard cards
        const [actors, batches, milled, transactions, seasons] = await Promise.all([
            fetch(`${API_BASE_URL}/chain-actors`),
            fetch(`${API_BASE_URL}/rice-batches`),
            fetch(`${API_BASE_URL}/milled-rice`),
            fetch(`${API_BASE_URL}/transactions`),
            fetch(`${API_BASE_URL}/production-seasons`)
        ]);

        const [actorsData, batchesData, milledData, transactionsData, seasonsData] = await Promise.all([
            actors.json(),
            batches.json(),
            milled.json(),
            transactions.json(),
            seasons.json()
        ]);

        // Update dashboard cards
        document.getElementById('actors-count').textContent = actorsData.success ? actorsData.data.length : '0';
        document.getElementById('batches-count').textContent = batchesData.success ? batchesData.data.length : '0';
        document.getElementById('milled-count').textContent = milledData.success ? milledData.data.length : '0';
        document.getElementById('transactions-count').textContent = transactionsData.success ? transactionsData.data.length : '0';
        document.getElementById('seasons-count').textContent = seasonsData.success ? seasonsData.data.length : '0';
        
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
        showTableLoading('actors-tbody');
        const response = await fetchData('/chain-actors');
        currentData = response.data || [];
        renderChainActorsTable(currentData);
    } catch (error) {
        console.error('Error loading chain actors:', error);
        showToast('Error loading chain actors', 'error');
        showTableError('actors-tbody', 'Error loading chain actors');
    }
}

async function loadProductionSeasons() {
    try {
        showTableLoading('seasons-tbody');
        const response = await fetchData('/production-seasons');
        currentData = response.data || [];
        renderProductionSeasonsTable(currentData);
    } catch (error) {
        console.error('Error loading production seasons:', error);
        showToast('Error loading production seasons', 'error');
        showTableError('seasons-tbody', 'Error loading production seasons');
    }
}

async function loadRiceBatches() {
    try {
        showTableLoading('batches-tbody');
        const response = await fetchData('/rice-batches');
        currentData = response.data || [];
        renderRiceBatchesTable(currentData);
    } catch (error) {
        console.error('Error loading rice batches:', error);
        showToast('Error loading rice batches', 'error');
        showTableError('batches-tbody', 'Error loading rice batches');
    }
}

async function loadMilledRice() {
    try {
        showTableLoading('milled-tbody');
        const response = await fetchData('/milled-rice');
        currentData = response.data || [];
        renderMilledRiceTable(currentData);
    } catch (error) {
        console.error('Error loading milled rice:', error);
        showToast('Error loading milled rice', 'error');
        showTableError('milled-tbody', 'Error loading milled rice');
    }
}

async function loadChainTransactions() {
    try {
        showTableLoading('transactions-tbody');
        const response = await fetchData('/transactions');
        currentData = response.data || [];
        
        // Enrich transaction data with actor names
        const actorsResponse = await fetchData('/chain-actors');
        const actors = actorsResponse.data || [];
        
        // Create actor lookup map
        const actorMap = {};
        actors.forEach(actor => {
            actorMap[actor.id] = actor.name;
        });
        
        // Add actor names to transactions
        currentData.forEach(transaction => {
            transaction.from_actor_name = actorMap[transaction.from_actor_id] || null;
            transaction.to_actor_name = actorMap[transaction.to_actor_id] || null;
        });
        
        renderChainTransactionsTable(currentData);
    } catch (error) {
        console.error('Error loading chain transactions:', error);
        showToast('Error loading chain transactions', 'error');
        showTableError('transactions-tbody', 'Error loading chain transactions');
    }
}


async function loadRecentTransactions() {
    const container = document.getElementById('recent-transactions');
    try {
        // Show loading spinner
        container.innerHTML = `
            <div class="d-flex justify-content-center align-items-center py-3">
                <div class="spinner-border text-success me-2" role="status">
                    <span class="visually-hidden">Loading...</span>
                </div>
                <span class="text-muted">Loading recent transactions...</span>
            </div>
        `;
        
        const response = await fetchData('/transactions');
        const transactions = response.data || [];
        renderRecentTransactions(transactions.slice(0, 5)); // Show only 5 most recent
    } catch (error) {
        console.error('Error loading recent transactions:', error);
        container.innerHTML = 
            '<div class="text-center text-muted"><i class="fas fa-exclamation-triangle"></i> Unable to load recent transactions</div>';
    }
}

function renderRecentTransactions(transactions) {
    const container = document.getElementById('recent-transactions');
    
    if (!transactions || transactions.length === 0) {
        container.innerHTML = '<div class="text-center text-muted"><i class="fas fa-info-circle"></i> No recent transactions found</div>';
        return;
    }

    const transactionsList = transactions.map(tx => {
        // Convert payment reference number to text
        let paymentMethod = 'Cash';
        if (tx.payment_reference === 1) paymentMethod = 'Cheque';
        else if (tx.payment_reference === 2) paymentMethod = 'Balance';
        
        return `
        <div class="d-flex justify-content-between align-items-center py-2 border-bottom">
            <div>
                <div class="fw-medium text-success">Transaction</div>
                <small class="text-muted">${tx.publicKey ? tx.publicKey.substring(0, 8) + '...' : 'N/A'}</small>
            </div>
            <div class="text-end">
                <div class="fw-medium">${paymentMethod}</div>
                <small class="text-muted">${formatDate(tx.transaction_date)}</small>
            </div>
        </div>
    `;
    }).join('');

    container.innerHTML = transactionsList;
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
            <td>${actor.group || '-'}</td>
            <td>${actor.farmer_id || '-'}</td>
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
        tbody.innerHTML = '<tr><td colspan="8" class="text-center text-muted">No production seasons found</td></tr>';
        return;
    }

    data.forEach(season => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${season.id}</td>
            <td>${season.season_name}</td>
            <td>${formatDate(season.planting_date)}</td>
            <td>${formatDate(season.harvesting_date)}</td>
            <td>${season.variety || '-'}</td>
            <td><span class="badge ${season.carbon_certified ? 'bg-success' : 'bg-secondary'}">${season.carbon_certified ? 'Yes' : 'No'}</span></td>
            <td>${season.farmer_id || '-'}</td>
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
        
        // Display batch IDs without links
        let batchDisplay = '-';
        if (transaction.batch_ids && transaction.batch_ids.length > 0) {
            batchDisplay = transaction.batch_ids.join(', ');
        }
        
        // Create actor links
        const fromActorLink = transaction.from_actor_name ? 
            `<a href="#" class="text-primary text-decoration-none" onclick="showActorInfo(${transaction.from_actor_id})">
                <i class="fas fa-user me-1"></i>${transaction.from_actor_name}
            </a>` : (transaction.from_actor_id || '-');
            
        const toActorLink = transaction.to_actor_name ? 
            `<a href="#" class="text-primary text-decoration-none" onclick="showActorInfo(${transaction.to_actor_id})">
                <i class="fas fa-user me-1"></i>${transaction.to_actor_name}
            </a>` : (transaction.to_actor_id || '-');
        
        // Format payment reference
        let paymentRef = 'Cash';
        if (transaction.payment_reference === 1) {
            paymentRef = 'Cheque';
        } else if (transaction.payment_reference === 2) {
            paymentRef = 'Balance';
        }
        
        // Format moisture
        const moistureDisplay = transaction.moisture || '-';
        
        // Add JSON data display for transparency
        const jsonDataDisplay = transaction.json_data ? 
            `<button class="btn btn-sm btn-info" onclick="showJsonData('${transaction.publicKey}', '${encodeURIComponent(transaction.json_data)}')" title="View Raw JSON Data">
                <i class="fas fa-code"></i> JSON
            </button>` : 
            `<span class="badge bg-warning">Binary</span>`;

        row.innerHTML = `
            <td>${batchDisplay}</td>
            <td>${fromActorLink}</td>
            <td>${toActorLink}</td>
            <td>${transaction.quantity || '-'}</td>
            <td>₱${(parseFloat(transaction.quantity || 0) * parseFloat(transaction.unit_price || 0)).toFixed(2)}</td>
            <td><span class="badge bg-secondary">${paymentRef}</span></td>
            <td>${moistureDisplay}</td>
            <td>${formatDate(transaction.transaction_date)}</td>
            <td><span class="badge ${getStatusBadgeClass(transaction.status)}">${transaction.status}</span></td>
            <td>${jsonDataDisplay}</td>
            <td>
                ${transaction.signature ? `<a href="https://explorer.solana.com/tx/${transaction.signature}?cluster=devnet" target="_blank" class="btn btn-sm btn-outline-primary" title="View on Solana Explorer">
                    <i class="fas fa-external-link-alt"></i>
                </a>` : '-'}
            </td>
        `;
        tbody.appendChild(row);
    });
}

// Show JSON Data Modal
function showJsonData(publicKey, encodedJsonData) {
    const jsonData = decodeURIComponent(encodedJsonData);
    
    // Create modal HTML
    const modalHtml = `
        <div class="modal fade" id="jsonDataModal" tabindex="-1" aria-labelledby="jsonDataModalLabel" aria-hidden="true">
            <div class="modal-dialog modal-lg">
                <div class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title" id="jsonDataModalLabel">
                            <i class="fas fa-code me-2"></i>Raw JSON Data - Transaction ${publicKey.substring(0, 8)}...
                        </h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                    </div>
                    <div class="modal-body">
                        <div class="alert alert-info">
                            <i class="fas fa-info-circle me-2"></i>
                            This is the raw JSON data stored transparently on the Solana blockchain.
                        </div>
                        <div class="mb-3">
                            <label class="form-label fw-bold">Public Key:</label>
                            <input type="text" class="form-control" value="${publicKey}" readonly>
                        </div>
                        <div class="mb-3">
                            <label class="form-label fw-bold">Raw JSON Data:</label>
                            <textarea class="form-control" rows="15" readonly style="font-family: monospace; font-size: 12px;">${JSON.stringify(JSON.parse(jsonData), null, 2)}</textarea>
                        </div>
                        <div class="d-flex gap-2">
                            <button type="button" class="btn btn-outline-primary" onclick="copyToClipboard('${publicKey}')">
                                <i class="fas fa-copy me-1"></i>Copy Public Key
                            </button>
                            <button type="button" class="btn btn-outline-success" onclick="copyToClipboard('${encodedJsonData}')">
                                <i class="fas fa-copy me-1"></i>Copy JSON Data
                            </button>
                        </div>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Close</button>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    // Remove existing modal if any
    const existingModal = document.getElementById('jsonDataModal');
    if (existingModal) {
        existingModal.remove();
    }
    
    // Add modal to body
    document.body.insertAdjacentHTML('beforeend', modalHtml);
    
    // Show modal
    const modal = new bootstrap.Modal(document.getElementById('jsonDataModal'));
    modal.show();
    
    // Clean up modal after it's hidden
    document.getElementById('jsonDataModal').addEventListener('hidden.bs.modal', function() {
        this.remove();
    });
}

// Copy to clipboard function
function copyToClipboard(text) {
    const decodedText = text.startsWith('http') ? text : decodeURIComponent(text);
    navigator.clipboard.writeText(decodedText).then(() => {
        showToast('Copied to clipboard!', 'success');
    }).catch(() => {
        showToast('Failed to copy to clipboard', 'error');
    });
}

// Modal Functions
async function openModal(mode, entityType = null, id = null) {
    isEditing = mode === 'edit';
    editingId = id;
    
    const modal = new bootstrap.Modal(document.getElementById('entityModal'));
    const modalTitle = document.getElementById('modalTitle');
    const formFields = document.getElementById('formFields');
    
    modalTitle.textContent = isEditing ? 'Edit ' + getCurrentEntityDisplayName() : 'Add New ' + getCurrentEntityDisplayName();
    
    // Load dynamic options for all forms that need them
    await loadFormOptions();
    
    // Generate form fields based on current entity
    formFields.innerHTML = generateFormFields(currentEntity);
    
    // If editing, populate form with existing data
    if (isEditing && id) {
        populateForm(id);
    }
    
    modal.show();
}

// Setup event listeners for dynamic fields
function setupDynamicFieldListeners() {
    // Multiselect dropdowns
    document.querySelectorAll('.multiselect-dropdown').forEach(dropdown => {
        dropdown.addEventListener('change', function() {
            if (this.value) {
                addChip(this.id.replace('_dropdown', ''), this.value, this.options[this.selectedIndex].text);
                this.value = '';
            }
        });
    });
    
    // Chips input fields
    document.querySelectorAll('.chips-input').forEach(input => {
        input.addEventListener('keypress', function(e) {
            if (e.key === 'Enter' && this.value.trim()) {
                e.preventDefault();
                addChip(this.id.replace('_input', ''), this.value.trim(), this.value.trim());
                this.value = '';
            }
        });
    });
}

// Add chip to multiselect or chips field
function addChip(fieldName, value, label) {
    const chipsContainer = document.getElementById(`${fieldName}_chips`);
    const hiddenInput = document.getElementById(fieldName);
    
    // Check if chip already exists
    if (chipsContainer.querySelector(`[data-value="${value}"]`)) {
        return;
    }
    
    const chip = document.createElement('div');
    chip.className = 'chip';
    chip.setAttribute('data-value', value);
    chip.innerHTML = `
        ${label}
        <button type="button" class="chip-remove" onclick="removeChip('${fieldName}', '${value}')">
            ×
        </button>
    `;
    
    chipsContainer.appendChild(chip);
    updateHiddenInput(fieldName);
}

// Remove chip
function removeChip(fieldName, value) {
    const chip = document.querySelector(`#${fieldName}_chips [data-value="${value}"]`);
    if (chip) {
        chip.remove();
        updateHiddenInput(fieldName);
    }
}

// Update hidden input with current chip values
function updateHiddenInput(fieldName) {
    const chipsContainer = document.getElementById(`${fieldName}_chips`);
    const hiddenInput = document.getElementById(fieldName);
    const values = Array.from(chipsContainer.querySelectorAll('.chip')).map(chip => chip.getAttribute('data-value'));
    hiddenInput.value = values.join(',');
}

// Store dynamic options globally
let transactionFormOptions = {
    actors: [],
    batches: [],
    farmers: [],
    millers: [],
    validators: [],
    seasons: [],
    batches: [],
    millings: []
};

// Load dynamic form options
async function loadFormOptions() {
    try {
        const [actorsResponse, seasonsResponse, batchesResponse, millingsResponse] = await Promise.all([
            fetchData('/chain-actors'),
            fetchData('/production-seasons'),
            fetchData('/rice-batches'),
            fetchData('/milled-rice')
        ]);

        // Store options globally for form generation
        transactionFormOptions = {
            actors: actorsResponse.data?.map(actor => ({ value: actor.id, label: actor.name })) || [],
            farmers: actorsResponse.data?.filter(actor => {
                const types = actor.type ? actor.type.split(',') : [];
                return types.includes('farmer');
            }).map(actor => ({ value: actor.id, label: actor.name })) || [],
            millers: actorsResponse.data?.filter(actor => {
                const types = actor.type ? actor.type.split(',') : [];
                return types.includes('miller');
            }).map(actor => ({ value: actor.id, label: actor.name })) || [],
            validators: actorsResponse.data?.filter(actor => {
                const types = actor.type ? actor.type.split(',') : [];
                return types.includes('validator');
            }).map(actor => ({ value: actor.id, label: actor.name })) || [],
            seasons: seasonsResponse.data?.map(season => ({ value: season.id, label: season.season_name })) || [],
            batches: batchesResponse.data?.map(batch => ({ value: batch.id, label: `${batch.batch_id || batch.batch_number || batch.id}` })) || [],
            millings: millingsResponse.data?.map(milling => ({ value: milling.id, label: `Milling ${milling.id} - ${milling.rice_variety || 'Unknown'}` })) || []
        };

        console.log('Form options loaded:', transactionFormOptions);
        
    } catch (error) {
        console.error('Error loading transaction form options:', error);
    }
}

function generateFormFields(entityType) {
    const fields = getEntityFields(entityType);
    let html = '';
    
    // Group fields in pairs for better layout
    for (let i = 0; i < fields.length; i += 2) {
        const field1 = fields[i];
        const field2 = fields[i + 1];
        
        html += '<div class="row">';
        
        // First field
        html += `
            <div class="col-md-${field2 ? '6' : '12'} mb-3">
                ${field1.type !== 'checkbox' ? `<label for="${field1.name}" class="form-label">${field1.label}</label>` : ''}
                ${generateFieldInput(field1)}
            </div>
        `;
        
        // Second field if exists
        if (field2) {
            html += `
                <div class="col-md-6 mb-3">
                    ${field2.type !== 'checkbox' ? `<label for="${field2.name}" class="form-label">${field2.label}</label>` : ''}
                    ${generateFieldInput(field2)}
                </div>
            `;
        }
        
        html += '</div>';
    }
    
    // Add event listeners for dynamic fields after modal is shown
    setTimeout(() => {
        setupDynamicFieldListeners();
    }, 100);
    
    return html;
}

function generateFieldInput(field) {
    switch (field.type) {
        case 'select':
            let options = '';
            field.options.forEach(option => {
                const selected = field.defaultValue === option.value ? 'selected' : '';
                options += `<option value="${option.value}" ${selected}>${option.label}</option>`;
            });
            return `<select class="form-select" id="${field.name}" ${field.required ? 'required' : ''}>
                        ${!field.defaultValue ? `<option value="">Select ${field.label}</option>` : ''}
                        ${options}
                    </select>`;
        case 'multiselect':
            return `<div class="multiselect-container" id="${field.name}_container">
                        <input type="hidden" id="${field.name}" value="">
                        <div class="multiselect-chips" id="${field.name}_chips"></div>
                        <select class="form-select multiselect-dropdown" id="${field.name}_dropdown">
                            <option value="">Add ${field.label}</option>
                            ${field.options.map(opt => `<option value="${opt.value}">${opt.label}</option>`).join('')}
                        </select>
                    </div>`;
        case 'chips':
            return `<div class="chips-container" id="${field.name}_container">
                        <input type="hidden" id="${field.name}" value="">
                        <div class="chips-display" id="${field.name}_chips"></div>
                        <input type="text" class="form-control chips-input" id="${field.name}_input" placeholder="Type and press Enter">
                    </div>`;
        case 'checkbox':
            return `<div class="form-check">
                        <input class="form-check-input" type="checkbox" id="${field.name}" ${field.required ? 'required' : ''}>
                        <label class="form-check-label" for="${field.name}">
                            ${field.label}
                        </label>
                    </div>`;
        case 'textarea':
            return `<textarea class="form-control" id="${field.name}" rows="3" ${field.required ? 'required' : ''}></textarea>`;
        case 'date':
            const defaultDate = field.defaultValue || '';
            return `<input type="date" class="form-control" id="${field.name}" value="${defaultDate}" ${field.required ? 'required' : ''} ${field.readonly ? 'readonly' : ''}>`;
        case 'number':
            return `<input type="number" class="form-control" id="${field.name}" step="0.01" ${field.required ? 'required' : ''}>`;
        case 'hidden':
            return `<input type="hidden" id="${field.name}" value="${field.defaultValue || ''}">`;
        default:
            return `<input type="text" class="form-control" id="${field.name}" ${field.required ? 'required' : ''} ${field.readonly ? 'readonly' : ''} value="${field.defaultValue || ''}">`;
    }
}

function getEntityFields(entityType) {
    const fieldDefinitions = {
        'chain_actors': [
            { name: 'name', label: 'Name', type: 'text', required: true },
            { name: 'type', label: 'Type', type: 'multiselect', required: true, 
              options: [
                  { value: 'farmer', label: 'Farmer' },
                  { value: 'miller', label: 'Miller' },
                  { value: 'distributor', label: 'Distributor' },
                  { value: 'retailer', label: 'Retailer' },
                  { value: 'validator', label: 'Validator' }
              ]
            },
            { name: 'location', label: 'Location', type: 'text', required: false },
            { name: 'group', label: 'Group', type: 'select', required: false,
              options: [
                  { value: 'blo', label: 'BLO' },
                  { value: 'coop', label: 'Cooperative' },
                  { value: 'buyback', label: 'Buyback' }
              ]
            },
            { name: 'farmer_id', label: 'Farmer ID', type: 'text', required: false },
            { name: 'assign_tps', label: 'Assign TPS', type: 'text', required: false }
        ],
        'production_seasons': [
            { name: 'season_name', label: 'Season Name', type: 'text', required: true },
            { name: 'planting_date', label: 'Planting Date', type: 'date', required: true },
            { name: 'harvesting_date', label: 'Harvesting Date', type: 'date', required: true },
            { name: 'variety', label: 'Variety', type: 'text', required: true },
            { name: 'carbon_certified', label: 'Carbon Certified', type: 'checkbox', required: false },
            { name: 'fertilizer_used', label: 'Fertilizer Used', type: 'chips', required: false },
            { name: 'pesticide_used', label: 'Pesticide Used', type: 'chips', required: false },
            { name: 'farmer_id', label: 'Farmer', type: 'select', required: true, options: transactionFormOptions.farmers }
        ],
        'rice_batches': [
            { name: 'batch_number', label: 'Batch Number', type: 'text', required: false, placeholder: 'Auto-generated if empty' },
            { name: 'farmer_id', label: 'Farmer', type: 'select', required: true, options: transactionFormOptions.farmers },
            { name: 'production_season_id', label: 'Production Season', type: 'select', required: true, options: transactionFormOptions.seasons },
            { name: 'rice_variety', label: 'Rice Variety', type: 'text', required: true },
            { name: 'milling_id', label: 'Milling', type: 'select', required: false, options: transactionFormOptions.millings },
            { name: 'validator_id', label: 'Validator', type: 'select', required: false, options: transactionFormOptions.validators },
            { name: 'dryer', label: 'Dryer', type: 'text', required: false },
            { name: 'planting_date', label: 'Planting Date', type: 'date', required: false },
            { name: 'harvest_date', label: 'Harvest Date', type: 'date', required: false },
            { name: 'quantity_harvested', label: 'Quantity Harvested (kg)', type: 'number', required: false },
            { name: 'quality_grade', label: 'Quality Grade', type: 'text', required: false }
        ],
        'milled_rice': [
            { name: 'batch_id', label: 'Batch ID', type: 'select', required: true, options: transactionFormOptions.batches },
            { name: 'rice_variety', label: 'Rice Variety', type: 'text', required: true },
            { name: 'milling_date', label: 'Milling Date', type: 'date', required: true, defaultValue: new Date().toISOString().split('T')[0] },
            { name: 'miller_id', label: 'Miller', type: 'select', required: true, options: transactionFormOptions.millers },
            { name: 'input_quantity', label: 'Input Quantity (kg)', type: 'number', required: true },
            { name: 'output_quantity', label: 'Output Quantity (kg)', type: 'number', required: true },
            { name: 'quality', label: 'Quality', type: 'select', required: false,
              options: [
                  { value: 'premium', label: 'Premium' },
                  { value: 'grade_a', label: 'Grade A' },
                  { value: 'grade_b', label: 'Grade B' },
                  { value: 'standard', label: 'Standard' }
              ]
            },
            { name: 'machine', label: 'Machine', type: 'select', required: false,
              options: [
                  { value: 'mobile_rice_mill_type_1', label: 'Mobile Rice Mill Type 1' },
                  { value: 'mobile_rice_mill_type_2', label: 'Mobile Rice Mill Type 2' },
                  { value: 'stationary_rice_mill', label: 'Stationary Rice Mill' },
                  { value: 'mini_rice_mill', label: 'Mini Rice Mill' },
                  { value: 'compact_rice_mill', label: 'Compact Rice Mill' }
              ]
            }
        ],
        'chain_transactions': [
            { name: 'from_actor_id', label: 'From Actor', type: 'select', required: true, options: transactionFormOptions.actors },
            { name: 'to_actor_id', label: 'To Actor', type: 'select', required: true, options: transactionFormOptions.actors },
            { name: 'batch_id', label: 'Batch ID', type: 'select', required: false, options: transactionFormOptions.batches },
            { name: 'quantity', label: 'Quantity (kg)', type: 'number', required: false, placeholder: 'e.g., 100' },
            { name: 'price_per_kg', label: 'Price per KG', type: 'number', required: false },
            { name: 'payment_reference', label: 'Payment Method', type: 'select', required: false,
              options: [
                  { value: '0', label: 'Cash' },
                  { value: '1', label: 'Cheque' },
                  { value: '2', label: 'Balance' }
              ]
            },
            { name: 'quality', label: 'Quality Grade', type: 'select', required: false,
              options: [
                  { value: '0', label: 'Premium' },
                  { value: '1', label: 'Well-milled' },
                  { value: '2', label: 'Regular' },
                  { value: '3', label: 'Broken' }
              ]
            },
            { name: 'moisture', label: 'Moisture Content (%)', type: 'text', required: false, placeholder: 'e.g., 14.5%' },
            { name: 'status', label: 'Status', type: 'select', required: true, defaultValue: 'completed',
              options: [
                  { value: 'pending', label: 'Pending' },
                  { value: 'completed', label: 'Completed' },
                  { value: 'cancelled', label: 'Cancelled' }
              ]
            }
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
            if (field.type === 'checkbox') {
                input.checked = entity[field.name] === true || entity[field.name] === 1 || entity[field.name] === 'true';
            } else if (field.type === 'chips') {
                // Handle chips field - convert array to comma-separated string
                if (Array.isArray(entity[field.name])) {
                    input.value = entity[field.name].join(', ');
                } else if (typeof entity[field.name] === 'string') {
                    input.value = entity[field.name];
                } else {
                    input.value = '';
                }
            } else {
                input.value = entity[field.name];
            }
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
                case 'chain-transactions':
                    loadChainTransactions();
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
            let value = input.value || null;
            
            // Handle different field types
            if (field.type === 'checkbox') {
                data[field.name] = input.checked;
            } else if (field.type === 'multiselect' || field.type === 'chips') {
                // Convert comma-separated values to array
                data[field.name] = value ? value.split(',').filter(v => v.trim()) : [];
            } else if (currentEntity === 'chain_transactions') {
                if (field.name === 'batch_ids' && value) {
                    // Convert single batch ID to array
                    data[field.name] = [parseInt(value)];
                } else if (field.name === 'payment_reference' && value) {
                    // Convert to integer
                    data[field.name] = parseInt(value);
                } else if (field.name === 'transaction_date') {
                    // Use today's date
                    data[field.name] = new Date().toISOString().split('T')[0];
                } else {
                    data[field.name] = value;
                }
            } else {
                data[field.name] = value;
            }
        }
    });
    
    // Always add transaction_date for transactions
    if (currentEntity === 'chain_transactions') {
        data.transaction_date = new Date().toISOString().split('T')[0];
    }
    
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
                case 'chain-transactions':
                    loadChainTransactions();
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
        'milled_rice': '/milled-rice',
        'chain_transactions': '/transactions'
    };
    return endpoints[entityType];
}

function getCurrentEntityDisplayName() {
    const names = {
        'chain_actors': 'Chain Actor',
        'production_seasons': 'Production Season',
        'rice_batches': 'Rice Batch',
        'milled_rice': 'Milled Rice',
        'chain_transactions': 'Chain Transaction'
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

// API Tester functionality
function initializeApiTester() {
    const methodSelect = document.getElementById('api-method');
    const endpointSelect = document.getElementById('api-endpoint');
    const urlInput = document.getElementById('api-url');
    const sendButton = document.getElementById('send-request');
    const clearButton = document.getElementById('clear-response');
    const bodySection = document.getElementById('request-body-section');

    // Pre-filled data templates
    const endpointTemplates = {
        '/api/chain-actors': {
            headers: [
                { name: 'Content-Type', value: 'application/json' },
                { name: 'Accept', value: 'application/json' }
            ],
            body: [
                { name: 'name', value: '' },
                { name: 'type', value: 'farmer' },
                { name: 'contact_info', value: '' },
                { name: 'location', value: '' },
                { name: 'group_name', value: '' },
                { name: 'farmer_id', value: '' }
            ]
        },
        '/api/production-seasons': {
            headers: [
                { name: 'Content-Type', value: 'application/json' },
                { name: 'Accept', value: 'application/json' }
            ],
            body: [
                { name: 'season_name', value: '' },
                { name: 'planting_date', value: '' },
                { name: 'harvesting_date', value: '' },
                { name: 'variety', value: '' },
                { name: 'carbon_certified', value: 'false' },
                { name: 'farmer_id', value: '' }
            ]
        },
        '/api/rice-batches': {
            headers: [
                { name: 'Content-Type', value: 'application/json' },
                { name: 'Accept', value: 'application/json' }
            ],
            body: [
                { name: 'batch_number', value: '' },
                { name: 'farmer_name', value: '' },
                { name: 'rice_variety', value: '' },
                { name: 'planting_date', value: '' },
                { name: 'harvest_date', value: '' },
                { name: 'quantity_harvested', value: '' },
                { name: 'quality_grade', value: '' },
                { name: 'storage_conditions', value: '' },
                { name: 'certifications', value: '' }
            ]
        },
        '/api/milled-rice': {
            headers: [
                { name: 'Content-Type', value: 'application/json' },
                { name: 'Accept', value: 'application/json' }
            ],
            body: [
                { name: 'batch_id', value: '' },
                { name: 'miller_name', value: '' },
                { name: 'milling_date', value: '' },
                { name: 'input_quantity', value: '' },
                { name: 'output_quantity', value: '' },
                { name: 'yield_percentage', value: '' }
            ]
        },
        '/api/transactions': {
            headers: [
                { name: 'Content-Type', value: 'application/json' },
                { name: 'Accept', value: 'application/json' }
            ],
            body: [
                { name: 'batch_id', value: '' },
                { name: 'from_actor', value: '' },
                { name: 'to_actor', value: '' },
                { name: 'quantity', value: '' },
                { name: 'total_amount', value: '' },
                { name: 'payment_reference', value: '' },
                { name: 'moisture_content', value: '' }
            ]
        },
    };

    // Initialize tables
    initializeHeadersTable();
    initializeBodyTable();
    
    // Add event listeners for add buttons
    document.getElementById('add-header-btn').addEventListener('click', () => addHeaderRow());
    document.getElementById('generate-sample-btn').addEventListener('click', () => generateSampleData());

    // Update URL when method or endpoint changes
    function updateUrl() {
        const baseUrl = 'http://localhost:3000';
        const endpoint = endpointSelect.value;
        urlInput.value = baseUrl + endpoint;
        
        // Show/hide body section based on method
        const method = methodSelect.value;
        if (method === 'POST' || method === 'PUT') {
            bodySection.style.display = 'block';
        } else {
            bodySection.style.display = 'none';
        }
        
        // Load pre-filled data for the selected endpoint
        loadEndpointTemplate(endpoint);
    }

    function loadEndpointTemplate(endpoint) {
        const template = endpointTemplates[endpoint];
        if (template) {
            // Clear existing data
            clearHeadersTable();
            clearBodyTable();
            
            // Load headers
            template.headers.forEach(header => {
                addHeaderRow(header.name, header.value);
            });
            
            // Load body parameters
            template.body.forEach(param => {
                addBodyRow(param.name, param.value);
            });
        }
    }

    methodSelect.addEventListener('change', updateUrl);
    endpointSelect.addEventListener('change', updateUrl);

    // Helper functions for table management
    function initializeHeadersTable() {
        // Clear any existing rows first
        clearHeadersTable();
        // Add default Content-Type header
        addHeaderRow('Content-Type', 'application/json');
    }

    function initializeBodyTable() {
        // Body table starts empty
    }

    function addHeaderRow(name = '', value = '') {
        const tbody = document.getElementById('headers-table-body');
        const row = document.createElement('tr');
        row.className = 'header-row';
        row.innerHTML = `
            <td>
                <input type="text" class="form-control header-name" value="${name}" placeholder="Header name">
            </td>
            <td>
                <input type="text" class="form-control header-value" value="${value}" placeholder="Header value">
            </td>
            <td class="text-center">
                <button type="button" class="btn btn-sm btn-outline-danger remove-header-btn">
                    <i class="fas fa-trash"></i>
                </button>
            </td>
        `;
        
        // Add remove functionality
        row.querySelector('.remove-header-btn').addEventListener('click', () => {
            row.remove();
        });
        
        tbody.appendChild(row);
    }

    function addBodyRow(name = '', value = '') {
        const tbody = document.getElementById('params-table-body');
        const row = document.createElement('tr');
        row.className = 'param-row';
        row.innerHTML = `
            <td>
                <input type="text" class="form-control param-key" value="${name}" placeholder="Parameter name" readonly>
            </td>
            <td>
                <input type="text" class="form-control param-value" value="${value}" placeholder="Parameter value">
            </td>
        `;
        
        tbody.appendChild(row);
    }

    function clearHeadersTable() {
        document.getElementById('headers-table-body').innerHTML = '';
    }

    function clearBodyTable() {
        document.getElementById('params-table-body').innerHTML = '';
    }

    function getHeadersFromTable() {
        const headers = {};
        const headerRows = document.querySelectorAll('.header-row');
        
        headerRows.forEach(row => {
            const nameInput = row.querySelector('.header-name');
            const valueInput = row.querySelector('.header-value');
            
            if (nameInput && valueInput && nameInput.value.trim() && valueInput.value.trim()) {
                headers[nameInput.value.trim()] = valueInput.value.trim();
            }
        });
        
        return headers;
    }

    function getBodyFromTable() {
        const requestData = {};
        const paramRows = document.querySelectorAll('.param-row');
        
        paramRows.forEach(row => {
            const keyInput = row.querySelector('.param-key');
            const valueInput = row.querySelector('.param-value');
            
            if (keyInput && valueInput && keyInput.value.trim() && valueInput.value.trim()) {
                let value = valueInput.value.trim();
                
                // Try to parse as number if it looks like a number
                if (!isNaN(value) && !isNaN(parseFloat(value))) {
                    value = parseFloat(value);
                }
                
                // Try to parse as boolean
                if (value === 'true') value = true;
                if (value === 'false') value = false;
                
                requestData[keyInput.value.trim()] = value;
            }
        });
        
        // Add transaction date automatically for transactions
        if (endpointSelect && endpointSelect.value === '/api/transactions') {
            requestData.transaction_date = new Date().toISOString();
        }
        
        return requestData;
    }

    function generateSampleData() {
        const endpoint = endpointSelect.value;
        const paramRows = document.querySelectorAll('.param-row');
        
        try {
            paramRows.forEach(row => {
                const keyInput = row.querySelector('.param-key');
                const valueInput = row.querySelector('.param-value');
                
                if (keyInput && valueInput) {
                    const paramName = keyInput.value.trim().toLowerCase();
                    let sampleValue = '';
                    
                    // Generate sample data - use Faker if available, otherwise use fallback
                    if (typeof faker !== 'undefined') {
                    // Generate sample data using Faker.js (v3.1.0 API)
                    switch (paramName) {
                                case 'name':
                                case 'farmer_name':
                                case 'miller_name':
                                    sampleValue = faker.name.findName();
                                    break;
                                case 'type':
                                    sampleValue = faker.random.arrayElement(['farmer', 'miller', 'distributor', 'retailer']);
                                    break;
                                case 'contact_info':
                                    sampleValue = faker.phone.phoneNumber();
                                    break;
                                case 'location':
                                case 'farmer_location':
                                    sampleValue = `${faker.address.city()}, ${faker.address.state()}`;
                                    break;
                                case 'group_name':
                                    sampleValue = `${faker.company.companyName()} Cooperative`;
                                    break;
                                case 'farmer_id':
                                case 'batch_id':
                                    sampleValue = faker.random.number({ min: 1, max: 100 }).toString();
                                    break;
                                case 'season_name':
                                    sampleValue = `${faker.random.arrayElement(['Spring', 'Summer', 'Fall', 'Winter'])} ${new Date().getFullYear()}`;
                                    break;
                                case 'planting_date':
                                case 'harvest_date':
                                case 'harvesting_date':
                                case 'milling_date':
                                    sampleValue = faker.date.past().toISOString().split('T')[0];
                                    break;
                                case 'variety':
                                case 'rice_variety':
                                    sampleValue = faker.random.arrayElement(['Jasmine', 'Basmati', 'Arborio', 'Brown Rice', 'Wild Rice']);
                                    break;
                                case 'carbon_certified':
                                    sampleValue = faker.random.boolean().toString();
                                    break;
                                case 'batch_number':
                                    sampleValue = `BATCH-${faker.random.alphaNumeric(8).toUpperCase()}`;
                                    break;
                                case 'quantity_harvested':
                                case 'input_quantity':
                                case 'output_quantity':
                                case 'quantity':
                                    sampleValue = faker.random.number({ min: 50, max: 1000 }).toString();
                                    break;
                                case 'quality_grade':
                                    sampleValue = faker.random.arrayElement(['A', 'B', 'C', 'Premium', 'Standard']);
                                    break;
                                case 'storage_conditions':
                                    sampleValue = faker.random.arrayElement(['Cool & Dry', 'Temperature Controlled', 'Warehouse Storage']);
                                    break;
                                case 'certifications':
                                    sampleValue = faker.random.arrayElement(['Organic', 'Fair Trade', 'Non-GMO', 'Sustainable']);
                                    break;
                                case 'yield_percentage':
                                    sampleValue = (faker.random.number({ min: 600, max: 950 }) / 10).toString();
                                    break;
                                case 'from_actor':
                                case 'to_actor':
                                    sampleValue = faker.name.findName();
                                    break;
                                case 'total_amount':
                                    sampleValue = faker.random.number({ min: 1000, max: 50000 }).toString();
                                    break;
                                case 'payment_reference':
                                    sampleValue = `PAY-${faker.random.alphaNumeric(10).toUpperCase()}`;
                                    break;
                                case 'moisture_content':
                                    sampleValue = (faker.random.number({ min: 100, max: 200 }) / 10).toString();
                                    break;
                                default:
                                    // Generic fallback based on data type patterns
                                    if (paramName.includes('date')) {
                                        sampleValue = faker.date.past().toISOString().split('T')[0];
                                    } else if (paramName.includes('amount') || paramName.includes('price')) {
                                        sampleValue = faker.random.number({ min: 100, max: 10000 }).toString();
                                    } else if (paramName.includes('id')) {
                                        sampleValue = faker.random.number({ min: 1, max: 100 }).toString();
                                    } else {
                                        sampleValue = faker.lorem.words(2);
                                    }
                                    break;
                            }
                        } else {
                            // Fallback basic sample data generation without Faker
                            switch (paramName) {
                                case 'name':
                                case 'farmer_name':
                                case 'miller_name':
                                    sampleValue = ['John Doe', 'Jane Smith', 'Mike Johnson', 'Sarah Wilson'][Math.floor(Math.random() * 4)];
                                    break;
                                case 'type':
                                    sampleValue = ['farmer', 'miller', 'distributor', 'retailer'][Math.floor(Math.random() * 4)];
                                    break;
                                case 'contact_info':
                                    sampleValue = `+1-${Math.floor(Math.random() * 900) + 100}-${Math.floor(Math.random() * 900) + 100}-${Math.floor(Math.random() * 9000) + 1000}`;
                                    break;
                                case 'location':
                                case 'farmer_location':
                                    sampleValue = ['Manila, Philippines', 'Cebu, Philippines', 'Davao, Philippines'][Math.floor(Math.random() * 3)];
                                    break;
                                case 'group_name':
                                    sampleValue = ['Rice Farmers Cooperative', 'Agricultural Alliance', 'Harvest Group'][Math.floor(Math.random() * 3)];
                                    break;
                                case 'farmer_id':
                                case 'batch_id':
                                    sampleValue = (Math.floor(Math.random() * 100) + 1).toString();
                                    break;
                                case 'season_name':
                                    sampleValue = `${['Spring', 'Summer', 'Fall', 'Winter'][Math.floor(Math.random() * 4)]} ${new Date().getFullYear()}`;
                                    break;
                                case 'planting_date':
                                case 'harvest_date':
                                case 'harvesting_date':
                                case 'milling_date':
                                    const pastDate = new Date();
                                    pastDate.setDate(pastDate.getDate() - Math.floor(Math.random() * 365));
                                    sampleValue = pastDate.toISOString().split('T')[0];
                                    break;
                                case 'variety':
                                case 'rice_variety':
                                    sampleValue = ['Jasmine', 'Basmati', 'Arborio', 'Brown Rice', 'Wild Rice'][Math.floor(Math.random() * 5)];
                                    break;
                                case 'carbon_certified':
                                    sampleValue = Math.random() > 0.5 ? 'true' : 'false';
                                    break;
                                case 'batch_number':
                                    sampleValue = `BATCH-${Math.random().toString(36).substr(2, 8).toUpperCase()}`;
                                    break;
                                case 'quantity_harvested':
                                case 'input_quantity':
                                case 'output_quantity':
                                case 'quantity':
                                    sampleValue = (Math.floor(Math.random() * 950) + 50).toString();
                                    break;
                                case 'quality_grade':
                                    sampleValue = ['A', 'B', 'C', 'Premium', 'Standard'][Math.floor(Math.random() * 5)];
                                    break;
                                case 'storage_conditions':
                                    sampleValue = ['Cool & Dry', 'Temperature Controlled', 'Warehouse Storage'][Math.floor(Math.random() * 3)];
                                    break;
                                case 'certifications':
                                    sampleValue = ['Organic', 'Fair Trade', 'Non-GMO', 'Sustainable'][Math.floor(Math.random() * 4)];
                                    break;
                                case 'yield_percentage':
                                    sampleValue = (Math.random() * 35 + 60).toFixed(1);
                                    break;
                                case 'from_actor':
                                case 'to_actor':
                                    sampleValue = ['John Doe', 'Jane Smith', 'Mike Johnson', 'Sarah Wilson'][Math.floor(Math.random() * 4)];
                                    break;
                                case 'total_amount':
                                    sampleValue = (Math.floor(Math.random() * 49000) + 1000).toString();
                                    break;
                                case 'payment_reference':
                                    sampleValue = `PAY-${Math.random().toString(36).substr(2, 10).toUpperCase()}`;
                                    break;
                                case 'moisture_content':
                                    sampleValue = (Math.random() * 10 + 10).toFixed(1);
                                    break;
                                default:
                                    // Generic fallback
                                    if (paramName.includes('date')) {
                                        const pastDate = new Date();
                                        pastDate.setDate(pastDate.getDate() - Math.floor(Math.random() * 365));
                                        sampleValue = pastDate.toISOString().split('T')[0];
                                    } else if (paramName.includes('amount') || paramName.includes('price')) {
                                        sampleValue = (Math.floor(Math.random() * 9900) + 100).toString();
                                    } else if (paramName.includes('id')) {
                                        sampleValue = (Math.floor(Math.random() * 100) + 1).toString();
                                    } else {
                                        sampleValue = 'Sample Data';
                                    }
                                    break;
                            }
                        }
                        
                        valueInput.value = sampleValue;
                    }
                });
                
            showToast('Sample data generated successfully!', 'success');
        } catch (error) {
            showToast('Error generating sample data: ' + error.message, 'error');
        }
    }

    // Send API request
    sendButton.addEventListener('click', async function() {
        const method = methodSelect.value;
        const url = urlInput.value;
        const responseElement = document.getElementById('api-response');
        const statusElement = document.getElementById('response-status');

        try {
            statusElement.textContent = 'Loading...';
            statusElement.className = 'badge bg-warning';

            // Get headers from table
            const headers = getHeadersFromTable();

            // Prepare request options
            const options = {
                method: method,
                headers: headers
            };

            // Add body for POST/PUT requests
            if (method === 'POST' || method === 'PUT') {
                const requestData = getBodyFromTable();
                if (Object.keys(requestData).length > 0) {
                    options.body = JSON.stringify(requestData);
                }
            }

            const startTime = Date.now();
            const response = await fetch(url, options);
            const endTime = Date.now();
            const responseTime = endTime - startTime;

            const responseData = await response.text();
            let formattedResponse;

            try {
                // Try to parse as JSON for pretty formatting
                const jsonData = JSON.parse(responseData);
                formattedResponse = JSON.stringify(jsonData, null, 2);
            } catch {
                // If not JSON, display as plain text
                formattedResponse = responseData;
            }

            // Update status badge
            if (response.ok) {
                statusElement.textContent = `${response.status} ${response.statusText} (${responseTime}ms)`;
                statusElement.className = 'badge bg-success';
            } else {
                statusElement.textContent = `${response.status} ${response.statusText} (${responseTime}ms)`;
                statusElement.className = 'badge bg-danger';
            }

            // Display response
            responseElement.textContent = formattedResponse;

        } catch (error) {
            statusElement.textContent = 'Error';
            statusElement.className = 'badge bg-danger';
            responseElement.textContent = `Error: ${error.message}`;
        }
    });

    // Clear response
    clearButton.addEventListener('click', function() {
        document.getElementById('api-response').textContent = 'Click "Send Request" to see the response here...';
        document.getElementById('response-status').textContent = 'Ready';
        document.getElementById('response-status').className = 'badge bg-secondary';
    });

    // Initialize URL
    updateUrl();
}

// Batch Tracker functionality
async function loadBatchTracker() {
    try {
        showLoading(true);
        
        // Load all batches for selection
        const response = await fetch(`${API_BASE_URL}/rice-batches`);
        const data = await response.json();
        
        if (data.success) {
            populateBatchList(data.data);
            setupBatchSearch(data.data);
        }
        
        showLoading(false);
    } catch (error) {
        console.error('Error loading batch tracker:', error);
        showToast('Error loading batch data', 'error');
        showLoading(false);
    }
}

function populateBatchList(batches) {
    const batchList = document.getElementById('batch-list');
    batchList.innerHTML = '';
    
    batches.forEach(batch => {
        const listItem = document.createElement('a');
        listItem.href = '#';
        listItem.className = 'list-group-item list-group-item-action';
        listItem.dataset.batchId = batch.id;
        listItem.innerHTML = `
            <div class="d-flex w-100 justify-content-between">
                <h6 class="mb-1">${batch.batch_number}</h6>
                <small>${new Date(batch.created_at).toLocaleDateString()}</small>
            </div>
            <p class="mb-1">${batch.rice_variety}</p>
            <small>Farmer: ${batch.farmer_name || 'Unknown'}</small>
        `;
        
        listItem.addEventListener('click', (e) => {
            e.preventDefault();
            selectBatch(batch.id);
            
            // Update active state
            document.querySelectorAll('#batch-list .list-group-item').forEach(item => {
                item.classList.remove('active');
            });
            listItem.classList.add('active');
        });
        
        batchList.appendChild(listItem);
    });
}

function setupBatchSearch(batches) {
    const searchInput = document.getElementById('batch-search-input');
    
    searchInput.addEventListener('input', (e) => {
        const searchTerm = e.target.value.toLowerCase();
        const filteredBatches = batches.filter(batch => 
            batch.batch_number.toLowerCase().includes(searchTerm) ||
            batch.rice_variety.toLowerCase().includes(searchTerm) ||
            (batch.farmer_name && batch.farmer_name.toLowerCase().includes(searchTerm))
        );
        
        populateBatchList(filteredBatches);
    });
}

async function selectBatch(batchId) {
    try {
        showLoading(true);
        
        // Fetch comprehensive batch data
        const [batchResponse, millingResponse, transactionsResponse] = await Promise.all([
            fetch(`${API_BASE_URL}/rice-batches/${batchId}`),
            fetch(`${API_BASE_URL}/milled-rice?batch_id=${batchId}`),
            fetch(`${API_BASE_URL}/transactions?batch_id=${batchId}`)
        ]);
        
        const batchData = await batchResponse.json();
        const millingData = await millingResponse.json();
        const transactionsData = await transactionsResponse.json();
        
        if (batchData.success) {
            displayBatchDetails(batchData.data, millingData.data || [], transactionsData.data || []);
        }
        
        showLoading(false);
    } catch (error) {
        console.error('Error loading batch details:', error);
        showToast('Error loading batch details', 'error');
        showLoading(false);
    }
}

function displayBatchDetails(batch, millingData, transactions) {
    // Show batch details section and hide empty state
    document.getElementById('batch-details').style.display = 'block';
    document.getElementById('batch-empty-state').style.display = 'none';
    
    // Populate batch overview
    const batchOverview = document.getElementById('batch-overview');
    batchOverview.innerHTML = `
        <div class="col-md-6">
            <p><strong>Batch Number:</strong> ${batch.batch_number}</p>
            <p><strong>Rice Variety:</strong> ${batch.rice_variety}</p>
            <p><strong>Quality Grade:</strong> ${batch.quality_grade || 'N/A'}</p>
            <p><strong>Quantity Harvested:</strong> ${batch.quantity_harvested || 'N/A'} kg</p>
        </div>
        <div class="col-md-6">
            <p><strong>Planting Date:</strong> ${batch.planting_date ? new Date(batch.planting_date).toLocaleDateString() : 'N/A'}</p>
            <p><strong>Harvest Date:</strong> ${batch.harvest_date ? new Date(batch.harvest_date).toLocaleDateString() : 'N/A'}</p>
            <p><strong>Storage Conditions:</strong> ${batch.storage_conditions || 'N/A'}</p>
            <p><strong>Certifications:</strong> ${batch.certifications || 'N/A'}</p>
        </div>
    `;
    
    // Populate farmer information
    const farmerInfo = document.getElementById('farmer-info');
    farmerInfo.innerHTML = `
        <div class="col-md-6">
            <p><strong>Name:</strong> ${batch.farmer_name || 'N/A'}</p>
            <p><strong>Contact:</strong> ${batch.farmer_contact || 'N/A'}</p>
        </div>
        <div class="col-md-6">
            <p><strong>Location:</strong> ${batch.farmer_location || 'N/A'}</p>
            <p><strong>Group:</strong> ${batch.farmer_group || 'N/A'}</p>
        </div>
    `;
    
    // Populate season information
    const seasonInfo = document.getElementById('season-info');
    seasonInfo.innerHTML = `
        <div class="col-md-6">
            <p><strong>Season Name:</strong> ${batch.season_name || 'N/A'}</p>
            <p><strong>Planting Date:</strong> ${batch.season_planting_date ? new Date(batch.season_planting_date).toLocaleDateString() : 'N/A'}</p>
        </div>
        <div class="col-md-6">
            <p><strong>Harvesting Date:</strong> ${batch.season_harvesting_date ? new Date(batch.season_harvesting_date).toLocaleDateString() : 'N/A'}</p>
            <p><strong>Variety:</strong> ${batch.season_variety || 'N/A'}</p>
        </div>
    `;
    
    // Populate milling data (only show the first/latest milling record)
    const millingDataDiv = document.getElementById('milling-data');
    if (millingData && millingData.length > 0) {
        const milling = millingData[0]; // Show only the first milling record
        millingDataDiv.innerHTML = `
            <div class="row">
                <div class="col-md-6">
                    <p><strong>Milling Date:</strong> ${new Date(milling.milling_date).toLocaleDateString()}</p>
                    <p><strong>Miller:</strong> ${milling.miller_name || 'N/A'}</p>
                    <p><strong>Input Quantity:</strong> ${milling.input_quantity} kg</p>
                    <p><strong>Machine:</strong> ${milling.machine || 'N/A'}</p>
                </div>
                <div class="col-md-6">
                    <p><strong>Output Quantity:</strong> ${milling.output_quantity} kg</p>
                    <p><strong>Yield:</strong> ${((milling.output_quantity / milling.input_quantity) * 100).toFixed(1)}%</p>
                    <p><strong>Quality:</strong> ${milling.quality || 'N/A'}</p>
                    <p><strong>Notes:</strong> ${milling.notes || 'N/A'}</p>
                </div>
            </div>
        `;
    } else {
        millingDataDiv.innerHTML = '<p class="text-muted">No milling data available for this batch.</p>';
    }
    
    // Populate transaction history
    const transactionsTbody = document.getElementById('batch-transactions-tbody');
    if (transactions && transactions.length > 0) {
        transactionsTbody.innerHTML = transactions.map(transaction => `
            <tr>
                <td>${new Date(transaction.transaction_date).toLocaleDateString()}</td>
                <td><span class="badge bg-info">${transaction.transaction_type}</span></td>
                <td>${transaction.from_actor_name || 'N/A'}</td>
                <td>${transaction.to_actor_name || 'N/A'}</td>
                <td>₱${transaction.total_amount || '0.00'}</td>
                <td><span class="badge bg-${transaction.status === 'completed' ? 'success' : 'warning'}">${transaction.status}</span></td>
            </tr>
        `).join('');
    } else {
        transactionsTbody.innerHTML = '<tr><td colspan="6" class="text-center text-muted">No transactions found for this batch.</td></tr>';
    }
}


// Function to show actor information modal
async function showActorInfo(actorId) {
    try {
        const response = await fetchData(`/chain-actors/${actorId}`);
        if (response.success && response.data) {
            const actor = response.data;
            
            const modalTitle = document.getElementById('actorModalTitle');
            const modalContent = document.getElementById('actorInfoContent');
            
            modalTitle.innerHTML = `<i class="fas fa-user me-2"></i>${actor.name}`;
            
            modalContent.innerHTML = `
                <div class="row">
                    <div class="col-md-6">
                        <div class="card border-0 bg-light">
                            <div class="card-body">
                                <h6 class="card-title text-primary">
                                    <i class="fas fa-info-circle me-2"></i>Basic Information
                                </h6>
                                <p><strong>ID:</strong> ${actor.id}</p>
                                <p><strong>Name:</strong> ${actor.name}</p>
                                <p><strong>Type:</strong> <span class="badge bg-primary">${actor.type}</span></p>
                                <p><strong>Farmer ID:</strong> ${actor.farmer_id || 'N/A'}</p>
                            </div>
                        </div>
                    </div>
                    <div class="col-md-6">
                        <div class="card border-0 bg-light">
                            <div class="card-body">
                                <h6 class="card-title text-success">
                                    <i class="fas fa-map-marker-alt me-2"></i>Contact & Location
                                </h6>
                                <p><strong>Contact Info:</strong> ${actor.contact_info || 'N/A'}</p>
                                <p><strong>Location:</strong> ${actor.location || 'N/A'}</p>
                                <p><strong>Group:</strong> ${actor.group || 'N/A'}</p>
                                <p><strong>TPS Assignment:</strong> ${actor.assign_tps || 'N/A'}</p>
                            </div>
                        </div>
                    </div>
                </div>
                <div class="row mt-3">
                    <div class="col-12">
                        <div class="card border-0 bg-light">
                            <div class="card-body">
                                <h6 class="card-title text-info">
                                    <i class="fas fa-chart-line me-2"></i>Activity Summary
                                </h6>
                                <div class="row text-center">
                                    <div class="col-md-3">
                                        <div class="p-2">
                                            <div class="h4 text-primary mb-0" id="actor-transactions-count">-</div>
                                            <small class="text-muted">Transactions</small>
                                        </div>
                                    </div>
                                    <div class="col-md-3">
                                        <div class="p-2">
                                            <div class="h4 text-success mb-0" id="actor-batches-count">-</div>
                                            <small class="text-muted">Batches</small>
                                        </div>
                                    </div>
                                    <div class="col-md-3">
                                        <div class="p-2">
                                            <div class="h4 text-info mb-0" id="actor-volume">-</div>
                                            <small class="text-muted">Total Volume (kg)</small>
                                        </div>
                                    </div>
                                    <div class="col-md-3">
                                        <div class="p-2">
                                            <div class="h4 text-warning mb-0" id="actor-value">-</div>
                                            <small class="text-muted">Total Value (₱)</small>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            `;
            
            // Load activity statistics
            loadActorStatistics(actorId);
            
            const modal = new bootstrap.Modal(document.getElementById('actorInfoModal'));
            modal.show();
        } else {
            showToast('Actor not found', 'error');
        }
    } catch (error) {
        console.error('Error loading actor info:', error);
        showToast('Error loading actor information', 'error');
    }
}

// Load actor statistics
async function loadActorStatistics(actorId) {
    try {
        const [transactionsResponse, batchesResponse] = await Promise.all([
            fetchData('/transactions'),
            fetchData('/rice-batches')
        ]);
        
        const transactions = transactionsResponse.data || [];
        const batches = batchesResponse.data || [];
        
        // Filter transactions for this actor
        const actorTransactions = transactions.filter(tx => 
            tx.from_actor_id == actorId || tx.to_actor_id == actorId
        );
        
        // Filter batches for this actor (if farmer)
        const actorBatches = batches.filter(batch => batch.farmer_id == actorId);
        
        // Calculate statistics
        const transactionCount = actorTransactions.length;
        const batchCount = actorBatches.length;
        const totalVolume = actorBatches.reduce((sum, batch) => 
            sum + (parseFloat(batch.quantity_harvested) || 0), 0
        );
        const totalValue = actorTransactions.reduce((sum, tx) => 
            sum + (parseFloat(tx.total_amount) || 0), 0
        );
        
        // Update UI
        document.getElementById('actor-transactions-count').textContent = transactionCount;
        document.getElementById('actor-batches-count').textContent = batchCount;
        document.getElementById('actor-volume').textContent = totalVolume.toFixed(2);
        document.getElementById('actor-value').textContent = totalValue.toFixed(2);
        
    } catch (error) {
        console.error('Error loading actor statistics:', error);
    }
}

// Function to open batch details (navigate to batch tracker)
function openBatchDetails(batchId) {
    // Switch to batch tracker section
    showSection('batch-tracker');
    
    // Load and select the specific batch
    setTimeout(() => {
        selectBatch(batchId);
    }, 100);
}

// Filter table function for search functionality
function filterTable(searchTerm, tableType) {
    const tableId = tableType === 'solana-transactions' ? 'solana-transactions-table' : `${tableType}-table`;
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

// Get status badge class helper
function getStatusBadgeClass(status) {
    switch(status?.toLowerCase()) {
        case 'completed': return 'bg-success';
        case 'pending': return 'bg-warning';
        case 'cancelled': return 'bg-danger';
        default: return 'bg-secondary';
    }
}

// Format date helper
function formatDate(dateString) {
    if (!dateString) return 'N/A';
    try {
        return new Date(dateString).toLocaleDateString();
    } catch {
        return dateString;
    }
}

// Fetch data helper
async function fetchData(endpoint) {
    const response = await fetch(`${API_BASE_URL}${endpoint}`);
    return await response.json();
}

// Show loading helper
function showLoading(show) {
    const spinner = document.getElementById('loadingSpinner');
    if (spinner) {
        spinner.classList.toggle('d-none', !show);
    }
}

// Show table loading state
function showTableLoading(tbodyId) {
    const tbody = document.getElementById(tbodyId);
    if (tbody) {
        const colCount = tbody.closest('table').querySelector('thead tr').children.length;
        tbody.innerHTML = `
            <tr>
                <td colspan="${colCount}" class="text-center py-4">
                    <div class="d-flex justify-content-center align-items-center">
                        <div class="spinner-border text-success me-2" role="status">
                            <span class="visually-hidden">Loading...</span>
                        </div>
                        <span class="text-muted">Loading data...</span>
                    </div>
                </td>
            </tr>
        `;
    }
}

// Show table error state
function showTableError(tbodyId, message) {
    const tbody = document.getElementById(tbodyId);
    if (tbody) {
        const colCount = tbody.closest('table').querySelector('thead tr').children.length;
        tbody.innerHTML = `
            <tr>
                <td colspan="${colCount}" class="text-center py-4 text-danger">
                    <i class="fas fa-exclamation-triangle me-2"></i>${message}
                </td>
            </tr>
        `;
    }
}

// Show toast helper
function showToast(message, type = 'info') {
    console.log(`Toast (${type}): ${message}`);
}