// Rice Supply Chain Management System - Frontend JavaScript

// Configuration
// Dynamic API base URL that works for both local development and deployed environments
const API_BASE_URL = `${window.location.protocol}//${window.location.host}/api`;
const API_EXTERNAL_URL = "https://digisaka.app";

// Global variables
let currentSection = 'dashboard';
let currentEntity = null;
let transactionsPaginationState = {
    allData: [],
    filteredData: [],
    currentPage: 1,
    itemsPerPage: 10,
    filters: {
        status: '',
        paymentMethod: '',
        searchTerm: '',
        dateFrom: '',
        dateTo: '',
        moistureMin: 0,
        moistureMax: 100,
        quantityMin: 0,
        quantityMax: 999999999  // Large default to not filter out valid transactions
    }
};

// Transaction Summary Filter State
let transactionSummaryFilters = {
    dateFrom: '',
    dateTo: '',
    category: 'all'
};

// Initialize the application
document.addEventListener('DOMContentLoaded', function () {
    initializeApp();
});

function initializeApp() {
    setupEventListeners();
    initializeTheme();
    initializeApiTester();
    // Handle URL-based routing
    handleUrlRouting();
    // Listen for browser back/forward buttons
    window.addEventListener('popstate', handleUrlRouting);
}

// Handle URL-based routing
function handleUrlRouting() {
    const path = window.location.pathname;
    const pathSegments = path.split('/').filter(segment => segment.length > 0);
    
    // Get the last segment as the section name
    let section = pathSegments[pathSegments.length - 1] || 'chain-transactions';
    
    // Map URL paths to section names
    const sectionMap = {
        'chain-actors': 'chain-actors',
        'transactions': 'chain-transactions',
        'chain-transactions': 'chain-transactions',
        'production-seasons': 'production-seasons',
        'seasons': 'production-seasons',
        'rice-batches': 'rice-batches',
        'batches': 'rice-batches',
        'milled-rice': 'milled-rice',
        'milling': 'milled-rice',
        'api-tester': 'api-tester',
        'tester': 'api-tester',
        'batch-tracker': 'batch-tracker',
        'tracker': 'batch-tracker',
        'drying-data': 'drying-data',
        'drying': 'drying-data',
        'transaction-summary': 'transaction-summary',
        'summary': 'transaction-summary',
        'dashboard': 'dashboard',
        '': 'chain-transactions'
    };
    
    const mappedSection = sectionMap[section] || 'chain-transactions';
    showSection(mappedSection);
}

// Update browser URL when section changes
function updateBrowserUrl(section) {
    const url = `/${section}`;
    window.history.pushState({ section }, '', url);
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
    endpointSelect.addEventListener('change', function () {
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
        paramRow.querySelector('.remove-param-btn').addEventListener('click', function () {
            paramRow.remove();
        });

        tableBody.appendChild(paramRow);
    }

    // Setup add parameter button
    const addParamBtn = document.getElementById('add-param-btn');
    if (addParamBtn) {
        addParamBtn.addEventListener('click', function () {
            addParameterRow('', '', true); // Allow editing for manually added parameters
        });
    }

    // Update method dropdown change handler
    if (methodSelect) {
        methodSelect.addEventListener('change', function () {
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
    // Hamburger menu toggle
    const sidebarToggle = document.getElementById('sidebarToggle');
    const sidebar = document.querySelector('.sidebar');

    if (sidebarToggle && sidebar) {
        sidebarToggle.addEventListener('click', function (e) {
            e.preventDefault();
            sidebar.classList.toggle('show');
        });

        // Close sidebar when clicking on a nav link
        document.querySelectorAll('.nav-link').forEach(link => {
            link.addEventListener('click', function () {
                if (window.innerWidth < 768) {
                    sidebar.classList.remove('show');
                }
            });
        });
    }

    // Sidebar navigation
    document.querySelectorAll('.nav-link').forEach(link => {
        link.addEventListener('click', function (e) {
            e.preventDefault();
            const section = this.getAttribute('data-section');
            if (section) {
                showSection(section);
            }
        });
    });

    // Add button
    document.getElementById('add-btn').addEventListener('click', function () {
        openModal('add');
    });

    // Save button
    document.getElementById('saveBtn').addEventListener('click', function () {
        saveEntity();
    });

    // Search inputs
    setupSearchListeners();
}

// Setup search listeners
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
            input.addEventListener('input', function () {
                filterTable(this.value, inputId.replace('-search', ''));
            });
        }
    });
}

// Navigation and UI
function showSection(section) {
    // Update browser URL
    updateBrowserUrl(section);
    
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
        'batch-tracker': 'Batch Tracker',
        'drying-data': 'Drying Data',
        'transaction-summary': 'Transaction Summary'
    };

    document.getElementById('page-title').textContent = titles[section];

    const addBtn = document.getElementById('add-btn');
    if (section === 'dashboard' || section === 'api-tester' || section === 'batch-tracker' || section === 'chain-transactions' || section === 'drying-data' || section === 'transaction-summary') {
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
            loadTransactionSummary();
            break;
        case 'drying-data':
            loadDryingData();
            break;
        case 'transaction-summary':
            loadTransactionSummary();
            break;
    }
}

// Dashboard Functions
async function loadDashboard() {
    try {
        showLoading(true);

        // Load counts for dashboard cards
        const [actorsData, batchesData, milledData, transactionsData, seasonsData] = await Promise.all([
            fetchData('/chain-actors').catch(() => ({ data: [] })),
            fetchData('/rice-batches').catch(() => ({ data: [] })),
            fetchData('/milled-rice').catch(() => ({ data: [] })),
            fetchData('/transactions').catch(() => ({ data: [] })),
            fetchData('/production-seasons').catch(() => ({ data: [] }))
        ]);

        // Update dashboard cards with safe data access
        const actorsCount = (actorsData && actorsData.data && Array.isArray(actorsData.data)) ? actorsData.data.length : 0;
        const batchesCount = (batchesData && batchesData.data && Array.isArray(batchesData.data)) ? batchesData.data.length : 0;
        const milledCount = (milledData && milledData.data && Array.isArray(milledData.data)) ? milledData.data.length : 0;
        const transactionsCount = (transactionsData && transactionsData.data && Array.isArray(transactionsData.data)) ? transactionsData.data.length : 0;
        const seasonsCount = (seasonsData && seasonsData.data && Array.isArray(seasonsData.data)) ? seasonsData.data.length : 0;

        document.getElementById('actors-count').textContent = actorsCount;
        document.getElementById('batches-count').textContent = batchesCount;
        document.getElementById('milled-count').textContent = milledCount;
        document.getElementById('transactions-count').textContent = transactionsCount;
        document.getElementById('seasons-count').textContent = seasonsCount;

    } catch (error) {
        console.error('Error loading dashboard:', error);
        // Set default values on error
        document.getElementById('actors-count').textContent = '0';
        document.getElementById('batches-count').textContent = '0';
        document.getElementById('milled-count').textContent = '0';
        document.getElementById('transactions-count').textContent = '0';
        document.getElementById('seasons-count').textContent = '0';
        showToast('Error loading dashboard data', 'error');
    } finally {
        showLoading(false);
    }
}

// Data Loading Functions
async function loadChainActors(page = 1) {
    try {
        showTableLoading('actors-tbody');
        const url = `${API_BASE_URL}/chain-actors?page=${page}&per_page=10`;
        const response = await fetch(url);
        const data = await response.json();
        
        // Handle paginated response
        const actorsData = data.data.data || data.data || [];
        const paginationInfo = data.data.current_page ? data.data : null;
        
        currentData = actorsData;
        renderChainActorsTable(actorsData);
        
        // Render pagination if available
        if (paginationInfo) {
            renderActorsPagination(paginationInfo);
        }
        
        // Setup search
        setupActorsSearch();
    } catch (error) {
        console.error('Error loading chain actors:', error);
        showToast('Error loading chain actors', 'error');
        showTableError('actors-tbody', 'Error loading chain actors');
    }
}

async function loadProductionSeasons(page = 1) {
    try {
        showTableLoading('seasons-tbody');
        const url = `${API_BASE_URL}/production-seasons?page=${page}&per_page=10`;
        const response = await fetch(url);
        const data = await response.json();
        
        // Handle paginated response
        const seasonsData = data.data.data || data.data || [];
        const paginationInfo = data.data.current_page ? data.data : null;
        
        currentData = seasonsData;
        renderProductionSeasonsTable(seasonsData);
        
        // Render pagination if available
        if (paginationInfo) {
            renderSeasonsPagination(paginationInfo);
        }
        
        // Setup search
        setupSeasonsSearch();
    } catch (error) {
        console.error('Error loading production seasons:', error);
        showToast('Error loading production seasons', 'error');
        showTableError('seasons-tbody', 'Error loading production seasons');
    }
}

async function loadRiceBatches(page = 1) {
    try {
        showTableLoading('batches-tbody');
        const batchesResponse = await fetchData('/rice-batches');
        
        // Handle paginated response
        const batchesData = batchesResponse.data.data || batchesResponse.data || [];
        const paginationInfo = batchesResponse.data.current_page ? batchesResponse.data : null;
        
        // Fetch related data
        const [chainActorsData, milledRiceData] = await Promise.all([
            fetch(`${API_BASE_URL}/chain-actors`).then(r => r.json()),
            fetch(`${API_BASE_URL}/milled-rice`).then(r => r.json())
        ]);
        const usersData = { data: [] }; // No users endpoint yet
        
        // Create lookup maps
        const chainActorsMap = {};
        const milledRiceMap = {};
        const usersMap = {};
        
        if (chainActorsData.data) {
            (Array.isArray(chainActorsData.data) ? chainActorsData.data : []).forEach(actor => {
                chainActorsMap[actor.id] = actor.name || actor.actor_name || '-';
            });
        }
        
        if (milledRiceData.data) {
            (Array.isArray(milledRiceData.data) ? milledRiceData.data : []).forEach(milled => {
                if (!milledRiceMap[milled.batch_id]) {
                    milledRiceMap[milled.batch_id] = milled;
                }
            });
        }
        
        if (usersData.data) {
            (Array.isArray(usersData.data) ? usersData.data : []).forEach(user => {
                usersMap[user.id] = user.name || user.email || '-';
            });
        }
        
        currentData = batchesData;
        renderRiceBatchesTable(batchesData, chainActorsMap, milledRiceMap, usersMap);
        
        // Render pagination if available
        if (paginationInfo) {
            renderBatchesPagination(paginationInfo);
        }
        
        // Setup search
        setupBatchesSearch();
    } catch (error) {
        console.error('Error loading rice batches:', error);
        showToast('Error loading rice batches', 'error');
        showTableError('batches-tbody', 'Error loading rice batches');
    }
}

async function loadChainTransactions() {
    try {
        showTableLoading('transactions-tbody');
        console.log('Fetching transactions from:', getApiUrl('/transactions'));
        
        const response = await fetchData('/transactions');
        console.log('API Response:', response);
        
        transactionsPaginationState.allData = response.data || [];
        console.log('Loaded transactions:', transactionsPaginationState.allData.length);
        console.log('All data:', transactionsPaginationState.allData);

        // Enrich transaction data with actor names
        let actors = [];
        try {
            const actorsResponse = await fetchData('/chain-actors');
            actors = actorsResponse.data || [];
        } catch (e) {
            console.warn('Failed to load actors:', e);
        }

        // Create actor lookup map
        const actorMap = {};
        actors.forEach(actor => {
            actorMap[actor.id] = actor.name;
        });

        // Add actor names to transactions
        transactionsPaginationState.allData.forEach(transaction => {
            transaction.from_actor_name = actorMap[transaction.from_actor_id] || null;
            transaction.to_actor_name = actorMap[transaction.to_actor_id] || null;
        });

        // Initialize filters and pagination
        transactionsPaginationState.currentPage = 1;
        applyTransactionFilters();
        console.log('After filtering:', transactionsPaginationState.filteredData.length, transactionsPaginationState.filteredData);
        
        renderTransactionFilters();
        renderTransactionPagination();
        renderChainTransactionsTable();

        console.log('Rendered transactions. Filtered data:', transactionsPaginationState.filteredData.length);

        // Setup header search and filter button
        setupTransactionHeaderControls();
    } catch (error) {
        console.error('Error loading chain transactions:', error);
        console.error('Error details:', error.message, error.stack);
        showToast('Error loading chain transactions: ' + error.message, 'error');
        showTableError('transactions-tbody', 'Error loading chain transactions: ' + error.message);
    }
}

// Setup header search and filter button
function setupTransactionHeaderControls() {
    const searchInput = document.getElementById('transactions-search-header');
    const filterBtn = document.getElementById('filter-toggle-btn-header');

    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            transactionsPaginationState.filters.searchTerm = e.target.value;
            applyTransactionFilters();
            transactionsPaginationState.currentPage = 1;
            renderTransactionPagination();
            renderChainTransactionsTable();
        });
    }

    if (filterBtn) {
        filterBtn.addEventListener('click', (e) => {
            e.preventDefault();
            const panel = document.getElementById('filters-panel');
            if (panel) {
                const isHidden = panel.style.display === 'none' || panel.style.display === '';
                panel.style.display = isHidden ? 'block' : 'none';
                // Update button appearance
                if (isHidden) {
                    filterBtn.classList.add('active');
                } else {
                    filterBtn.classList.remove('active');
                }
            }
        });
    }
}

async function loadMilledRice(page = 1) {
    try {
        showTableLoading('milled-tbody');
        const url = `${API_EXTERNAL_URL}/api/mobile/trace/milling/get-all`;
        const response = await fetch(url);
        const data = await response.json();
        
        // Handle response from external API
        const milledData = data.data || [];
        
        currentData = milledData;
        renderMilledRiceTable(milledData);
        
        // Setup search
        setupMilledSearch();
    } catch (error) {
        console.error('Error loading milled rice:', error);
        showToast('Error loading milled rice', 'error');
        showTableError('milled-tbody', 'Error loading milled rice');
    }
}

async function loadTransactionSummary() {
    try {
        const container = document.getElementById('transaction-summary-tbody');
        if (!container) return;
        
        showTableLoading('transaction-summary-tbody');
        const response = await fetchData('/transaction/summary/all');
        const data = response.data || [];
        renderTransactionSummaryTable(data);
    } catch (error) {
        console.error('Error loading transaction summary:', error);
        showToast('Error loading transaction summary', 'error');
        showTableError('transaction-summary-tbody', 'Error loading transaction summary');
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
        tbody.innerHTML = '<tr><td colspan="9" class="text-center text-muted">No chain actors found</td></tr>';
        return;
    }

    data.forEach(actor => {
        const row = document.createElement('tr');
        const actorTypes = Array.isArray(actor.actor_type) ? actor.actor_type.join(', ') : actor.actor_type || '-';
        const isActiveBadge = `<span class="badge ${actor.is_active ? 'bg-success' : 'bg-danger'}">${actor.is_active ? 'Active' : 'Inactive'}</span>`;
        
        // Parse address if it's a JSON string
        let addressDisplay = '-';
        try {
            if (actor.address) {
                const addressObj = typeof actor.address === 'string' ? JSON.parse(actor.address) : actor.address;
                addressDisplay = addressObj.name || '-';
            }
        } catch (e) {
            addressDisplay = actor.address || '-';
        }
        
        row.innerHTML = `
            <td>${actor.id}</td>
            <td>${actor.name}</td>
            <td>${actorTypes}</td>
            <td>${actor.organization || '-'}</td>
            <td>${actor.contact_number || '-'}</td>
            <td>${addressDisplay}</td>
            <td>₱${actor.balance || '0.00'}</td>
            <td>${isActiveBadge}</td>
            <td class="action-buttons">
                <button class="btn btn-sm btn-warning" onclick="openChainActorModal('edit', ${actor.id})">
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

function renderActorsPagination(paginationInfo) {
    const paginationContainer = document.getElementById('actors-pagination');
    if (!paginationContainer) return;
    
    const currentPage = paginationInfo.current_page;
    const lastPage = paginationInfo.last_page;
    const total = paginationInfo.total;
    const perPage = paginationInfo.per_page;
    
    // Generate page numbers to display (show up to 7 pages)
    let pageNumbers = [];
    if (lastPage <= 7) {
        pageNumbers = Array.from({ length: lastPage }, (_, i) => i + 1);
    } else {
        // Always show first page, last page, and pages around current page
        pageNumbers = [1];
        const startPage = Math.max(2, currentPage - 2);
        const endPage = Math.min(lastPage - 1, currentPage + 2);

        if (startPage > 2) pageNumbers.push('...');
        for (let i = startPage; i <= endPage; i++) {
            pageNumbers.push(i);
        }
        if (endPage < lastPage - 1) pageNumbers.push('...');
        pageNumbers.push(lastPage);
    }

    const html = `
        <div class="d-flex justify-content-between align-items-center flex-wrap gap-3">
            <div class="d-flex align-items-center gap-2">
                <small class="text-muted fw-semibold">Show</small>
                <select class="form-select form-select-sm" id="actors-per-page" style="width: auto;">
                    <option value="10" ${perPage === 10 ? 'selected' : ''}>10</option>
                    <option value="20" ${perPage === 20 ? 'selected' : ''}>20</option>
                    <option value="50" ${perPage === 50 ? 'selected' : ''}>50</option>
                    <option value="100" ${perPage === 100 ? 'selected' : ''}>100</option>
                </select>
                <small class="text-muted fw-semibold">entries</small>
            </div>
            
            <small class="text-muted">Showing ${total === 0 ? 0 : (currentPage - 1) * perPage + 1}-${Math.min(currentPage * perPage, total)} of ${total} actors</small>
            
            <nav aria-label="Actors pagination">
                <ul class="pagination pagination-sm mb-0">
                    <li class="page-item ${currentPage === 1 ? 'disabled' : ''}">
                        <a class="page-link" href="#" onclick="changeActorPage(1); return false;" title="First Page">
                            <i class="fas fa-step-backward"></i>
                        </a>
                    </li>
                    <li class="page-item ${currentPage === 1 ? 'disabled' : ''}">
                        <a class="page-link" href="#" onclick="changeActorPage(${currentPage - 1}); return false;" title="Previous Page">
                            <i class="fas fa-chevron-left"></i>
                        </a>
                    </li>
                    ${pageNumbers.map(pageNum => {
        if (pageNum === '...') {
            return `<li class="page-item disabled"><span class="page-link">...</span></li>`;
        }
        return `<li class="page-item ${pageNum === currentPage ? 'active' : ''}">
                            <a class="page-link" href="#" onclick="changeActorPage(${pageNum}); return false;">${pageNum}</a>
                        </li>`;
    }).join('')}
                    <li class="page-item ${currentPage === lastPage ? 'disabled' : ''}">
                        <a class="page-link" href="#" onclick="changeActorPage(${currentPage + 1}); return false;" title="Next Page">
                            <i class="fas fa-chevron-right"></i>
                        </a>
                    </li>
                    <li class="page-item ${currentPage === lastPage ? 'disabled' : ''}">
                        <a class="page-link" href="#" onclick="changeActorPage(${lastPage}); return false;" title="Last Page">
                            <i class="fas fa-step-forward"></i>
                        </a>
                    </li>
                </ul>
            </nav>
        </div>
    `;

    paginationContainer.innerHTML = html;

    // Attach event listener for items per page dropdown
    const perPageSelect = document.getElementById('actors-per-page');
    if (perPageSelect) {
        perPageSelect.addEventListener('change', (e) => {
            loadChainActors(1); // Reset to first page when changing per_page
        });
    }
}

function setupActorsSearch() {
    const searchInput = document.getElementById('actors-search');
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            filterTable(e.target.value, 'actors');
        });
    }
}

function changeActorPage(page) {
    loadChainActors(page);
}

function renderSeasonsPagination(paginationInfo) {
    const paginationContainer = document.getElementById('seasons-pagination');
    if (!paginationContainer) return;
    
    const currentPage = paginationInfo.current_page;
    const lastPage = paginationInfo.last_page;
    const total = paginationInfo.total;
    const perPage = paginationInfo.per_page;
    
    // Generate page numbers to display (show up to 7 pages)
    let pageNumbers = [];
    if (lastPage <= 7) {
        pageNumbers = Array.from({ length: lastPage }, (_, i) => i + 1);
    } else {
        pageNumbers = [1];
        const startPage = Math.max(2, currentPage - 2);
        const endPage = Math.min(lastPage - 1, currentPage + 2);

        if (startPage > 2) pageNumbers.push('...');
        for (let i = startPage; i <= endPage; i++) {
            pageNumbers.push(i);
        }
        if (endPage < lastPage - 1) pageNumbers.push('...');
        pageNumbers.push(lastPage);
    }

    const html = `
        <div class="d-flex justify-content-between align-items-center flex-wrap gap-3">
            <div class="d-flex align-items-center gap-2">
                <small class="text-muted fw-semibold">Show</small>
                <select class="form-select form-select-sm" id="seasons-per-page" style="width: auto;">
                    <option value="10" ${perPage === 10 ? 'selected' : ''}>10</option>
                    <option value="20" ${perPage === 20 ? 'selected' : ''}>20</option>
                    <option value="50" ${perPage === 50 ? 'selected' : ''}>50</option>
                    <option value="100" ${perPage === 100 ? 'selected' : ''}>100</option>
                </select>
                <small class="text-muted fw-semibold">entries</small>
            </div>
            <small class="text-muted">Showing ${total === 0 ? 0 : (currentPage - 1) * perPage + 1}-${Math.min(currentPage * perPage, total)} of ${total} seasons</small>
            <nav aria-label="Seasons pagination">
                <ul class="pagination pagination-sm mb-0">
                    <li class="page-item ${currentPage === 1 ? 'disabled' : ''}">
                        <a class="page-link" href="#" onclick="changeSeasonPage(1); return false;" title="First Page">
                            <i class="fas fa-step-backward"></i>
                        </a>
                    </li>
                    <li class="page-item ${currentPage === 1 ? 'disabled' : ''}">
                        <a class="page-link" href="#" onclick="changeSeasonPage(${currentPage - 1}); return false;" title="Previous Page">
                            <i class="fas fa-chevron-left"></i>
                        </a>
                    </li>
                    ${pageNumbers.map(pageNum => pageNum === '...' ? `<li class="page-item disabled"><span class="page-link">...</span></li>` : `<li class="page-item ${pageNum === currentPage ? 'active' : ''}"><a class="page-link" href="#" onclick="changeSeasonPage(${pageNum}); return false;">${pageNum}</a></li>`).join('')}
                    <li class="page-item ${currentPage === lastPage ? 'disabled' : ''}">
                        <a class="page-link" href="#" onclick="changeSeasonPage(${currentPage + 1}); return false;" title="Next Page">
                            <i class="fas fa-chevron-right"></i>
                        </a>
                    </li>
                    <li class="page-item ${currentPage === lastPage ? 'disabled' : ''}">
                        <a class="page-link" href="#" onclick="changeSeasonPage(${lastPage}); return false;" title="Last Page">
                            <i class="fas fa-step-forward"></i>
                        </a>
                    </li>
                </ul>
            </nav>
        </div>
    `;

    paginationContainer.innerHTML = html;
    const perPageSelect = document.getElementById('seasons-per-page');
    if (perPageSelect) {
        perPageSelect.addEventListener('change', () => loadProductionSeasons(1));
    }
}

function setupSeasonsSearch() {
    const searchInput = document.getElementById('seasons-search');
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            filterTable(e.target.value, 'seasons');
        });
    }
}

function changeSeasonPage(page) {
    loadProductionSeasons(page);
}

function renderProductionSeasonsTable(data) {
    const tbody = document.getElementById('seasons-tbody');
    tbody.innerHTML = '';

    if (!data || data.length === 0) {
        tbody.innerHTML = '<tr><td colspan="10" class="text-center text-muted">No production seasons found</td></tr>';
        return;
    }

    data.forEach(season => {
        const row = document.createElement('tr');
        const carbonCertified = season.carbon_smart_certified === 1 || season.carbon_smart_certified === true;
        row.innerHTML = `
            <td>${season.id}</td>
            <td>${season.farmer_id || '-'}</td>
            <td>${season.crop_year || '-'}</td>
            <td>${season.variety || '-'}</td>
            <td>${formatDate(season.planting_date)}</td>
            <td>${formatDate(season.harvest_date)}</td>
            <td>${season.total_yield_kg || '0'} kg</td>
            <td>${season.moisture_content || '-'}%</td>
            <td><span class="badge ${carbonCertified ? 'bg-success' : 'bg-secondary'}">${carbonCertified ? 'Yes' : 'No'}</span></td>
            <td><span class="badge bg-${season.validation_status === 'pending' ? 'warning' : 'success'}">${season.validation_status || 'pending'}</span></td>
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

function renderRiceBatchesTable(data, chainActorsMap = {}, milledRiceMap = {}, usersMap = {}) {
    const tbody = document.getElementById('batches-tbody');
    tbody.innerHTML = '';

    if (!data || data.length === 0) {
        tbody.innerHTML = '<tr><td colspan="10" class="text-center text-muted">No rice batches found</td></tr>';
        return;
    }

    data.forEach(batch => {
        const row = document.createElement('tr');
        
        // Extract season info from nested season object
        const seasonName = batch.season?.season || batch.season?.crop_year || '-';
        const harvestDate = batch.season?.harvest_date || batch.harvest_date || '-';
        
        // Extract current holder info from nested current_holder object
        const currentHolderName = batch.current_holder?.name || '-';
        
        // Get milling data - check if milling object exists
        const millingName = batch.milling?.miller_name || '-';
        
        // Get drying data from milling object if available
        const dryingName = batch.milling?.dryer_name || '-';
        
        // Get validator name
        const validatorName = batch.validator || usersMap[batch.validator_id] || '-';
        
        // Get weight - use batch_weight_kg
        const weight = batch.batch_weight_kg || '-';
        
        row.innerHTML = `
            <td>${batch.id}</td>
            <td>${weight} kg</td>
            <td>${harvestDate !== '-' ? new Date(harvestDate).toLocaleDateString() : '-'}</td>
            <td>${seasonName}</td>
            <td>${currentHolderName}</td>
            <td>${millingName}</td>
            <td>${dryingName}</td>
            <td>${validatorName}</td>
            <td>${batch.status || '-'}</td>
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

function renderBatchesPagination(paginationInfo) {
    const paginationContainer = document.getElementById('batches-pagination');
    if (!paginationContainer) return;
    
    const currentPage = paginationInfo.current_page;
    const lastPage = paginationInfo.last_page;
    const total = paginationInfo.total;
    const perPage = paginationInfo.per_page;
    
    // Generate page numbers to display (show up to 7 pages)
    let pageNumbers = [];
    if (lastPage <= 7) {
        pageNumbers = Array.from({ length: lastPage }, (_, i) => i + 1);
    } else {
        pageNumbers = [1];
        const startPage = Math.max(2, currentPage - 2);
        const endPage = Math.min(lastPage - 1, currentPage + 2);
        if (startPage > 2) pageNumbers.push('...');
        for (let i = startPage; i <= endPage; i++) {
            pageNumbers.push(i);
        }
        if (endPage < lastPage - 1) pageNumbers.push('...');
        pageNumbers.push(lastPage);
    }

    const html = `
        <div class="d-flex justify-content-between align-items-center flex-wrap gap-3">
            <div class="d-flex align-items-center gap-2">
                <small class="text-muted fw-semibold">Show</small>
                <select class="form-select form-select-sm" id="batches-per-page" style="width: auto;">
                    <option value="10" ${perPage === 10 ? 'selected' : ''}>10</option>
                    <option value="20" ${perPage === 20 ? 'selected' : ''}>20</option>
                    <option value="50" ${perPage === 50 ? 'selected' : ''}>50</option>
                    <option value="100" ${perPage === 100 ? 'selected' : ''}>100</option>
                </select>
                <small class="text-muted fw-semibold">entries</small>
            </div>
            <small class="text-muted">Showing ${total === 0 ? 0 : (currentPage - 1) * perPage + 1}-${Math.min(currentPage * perPage, total)} of ${total} batches</small>
            <nav aria-label="Batches pagination">
                <ul class="pagination pagination-sm mb-0">
                    <li class="page-item ${currentPage === 1 ? 'disabled' : ''}">
                        <a class="page-link" href="#" onclick="changeBatchPage(1); return false;" title="First Page">
                            <i class="fas fa-step-backward"></i>
                        </a>
                    </li>
                    <li class="page-item ${currentPage === 1 ? 'disabled' : ''}">
                        <a class="page-link" href="#" onclick="changeBatchPage(${currentPage - 1}); return false;" title="Previous Page">
                            <i class="fas fa-chevron-left"></i>
                        </a>
                    </li>
                    ${pageNumbers.map(pageNum => pageNum === '...' ? `<li class="page-item disabled"><span class="page-link">...</span></li>` : `<li class="page-item ${pageNum === currentPage ? 'active' : ''}"><a class="page-link" href="#" onclick="changeBatchPage(${pageNum}); return false;">${pageNum}</a></li>`).join('')}
                    <li class="page-item ${currentPage === lastPage ? 'disabled' : ''}">
                        <a class="page-link" href="#" onclick="changeBatchPage(${currentPage + 1}); return false;" title="Next Page">
                            <i class="fas fa-chevron-right"></i>
                        </a>
                    </li>
                    <li class="page-item ${currentPage === lastPage ? 'disabled' : ''}">
                        <a class="page-link" href="#" onclick="changeBatchPage(${lastPage}); return false;" title="Last Page">
                            <i class="fas fa-step-forward"></i>
                        </a>
                    </li>
                </ul>
            </nav>
        </div>
    `;
    paginationContainer.innerHTML = html;
    const perPageSelect = document.getElementById('batches-per-page');
    if (perPageSelect) {
        perPageSelect.addEventListener('change', () => loadRiceBatches(1));
    }
}

function setupBatchesSearch() {
    const searchInput = document.getElementById('batches-search');
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            filterTable(e.target.value, 'batches');
        });
    }
}

function changeBatchPage(page) {
    loadRiceBatches(page);
}

function renderMilledRiceTable(data) {
    const tbody = document.getElementById('milled-tbody');
    tbody.innerHTML = '';

    if (!data || data.length === 0) {
        tbody.innerHTML = '<tr><td colspan="8" class="text-center text-muted">No milled rice records found</td></tr>';
        return;
    }

    data.forEach(milled => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${milled.id}</td>
            <td>${milled.farmer_id || '-'}</td>
            <td>${milled.total_weight_kg || '-'} kg</td>
            <td>${milled.milling_type || '-'}</td>
            <td>${milled.quality || '-'}</td>
            <td>${milled.moisture || '-'}%</td>
            <td>${milled.total_weight_processed_kg || '-'} kg</td>
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

function renderMilledPagination(paginationInfo) {
    const paginationContainer = document.getElementById('milled-pagination');
    if (!paginationContainer) return;
    
    const currentPage = paginationInfo.current_page;
    const lastPage = paginationInfo.last_page;
    const total = paginationInfo.total;
    const perPage = paginationInfo.per_page;
    
    // Generate page numbers to display (show up to 7 pages)
    let pageNumbers = [];
    if (lastPage <= 7) {
        pageNumbers = Array.from({ length: lastPage }, (_, i) => i + 1);
    } else {
        pageNumbers = [1];
        const startPage = Math.max(2, currentPage - 2);
        const endPage = Math.min(lastPage - 1, currentPage + 2);

        if (startPage > 2) pageNumbers.push('...');
        for (let i = startPage; i <= endPage; i++) {
            pageNumbers.push(i);
        }
        if (endPage < lastPage - 1) pageNumbers.push('...');
        pageNumbers.push(lastPage);
    }

    const html = `
        <div class="d-flex justify-content-between align-items-center flex-wrap gap-3">
            <div class="d-flex align-items-center gap-2">
                <small class="text-muted fw-semibold">Show</small>
                <select class="form-select form-select-sm" id="milled-per-page" style="width: auto;">
                    <option value="10" ${perPage === 10 ? 'selected' : ''}>10</option>
                    <option value="20" ${perPage === 20 ? 'selected' : ''}>20</option>
                    <option value="50" ${perPage === 50 ? 'selected' : ''}>50</option>
                    <option value="100" ${perPage === 100 ? 'selected' : ''}>100</option>
                </select>
                <small class="text-muted fw-semibold">entries</small>
            </div>
            <small class="text-muted">Showing ${total === 0 ? 0 : (currentPage - 1) * perPage + 1}-${Math.min(currentPage * perPage, total)} of ${total} records</small>
            <nav aria-label="Milled pagination">
                <ul class="pagination pagination-sm mb-0">
                    <li class="page-item ${currentPage === 1 ? 'disabled' : ''}">
                        <a class="page-link" href="#" onclick="changeMilledPage(1); return false;" title="First Page">
                            <i class="fas fa-step-backward"></i>
                        </a>
                    </li>
                    <li class="page-item ${currentPage === 1 ? 'disabled' : ''}">
                        <a class="page-link" href="#" onclick="changeMilledPage(${currentPage - 1}); return false;" title="Previous Page">
                            <i class="fas fa-chevron-left"></i>
                        </a>
                    </li>
                    ${pageNumbers.map(pageNum => pageNum === '...' ? `<li class="page-item disabled"><span class="page-link">...</span></li>` : `<li class="page-item ${pageNum === currentPage ? 'active' : ''}"><a class="page-link" href="#" onclick="changeMilledPage(${pageNum}); return false;">${pageNum}</a></li>`).join('')}
                    <li class="page-item ${currentPage === lastPage ? 'disabled' : ''}">
                        <a class="page-link" href="#" onclick="changeMilledPage(${currentPage + 1}); return false;" title="Next Page">
                            <i class="fas fa-chevron-right"></i>
                        </a>
                    </li>
                    <li class="page-item ${currentPage === lastPage ? 'disabled' : ''}">
                        <a class="page-link" href="#" onclick="changeMilledPage(${lastPage}); return false;" title="Last Page">
                            <i class="fas fa-step-forward"></i>
                        </a>
                    </li>
                </ul>
            </nav>
        </div>
    `;
    paginationContainer.innerHTML = html;
    const perPageSelect = document.getElementById('milled-per-page');
    if (perPageSelect) {
        perPageSelect.addEventListener('change', () => loadMilledRice(1));
    }
}

function setupMilledSearch() {
    const searchInput = document.getElementById('milled-search');
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            filterTable(e.target.value, 'milled');
        });
    }
}

function changeMilledPage(page) {
    loadMilledRice(page);
}

function renderChainTransactionsTable() {
    const tbody = document.getElementById('transactions-tbody');
    tbody.innerHTML = '';

    const data = transactionsPaginationState.filteredData;
    if (!data || data.length === 0) {
        tbody.innerHTML = '<tr><td colspan="10" class="text-center text-muted">No chain transactions found</td></tr>';
        return;
    }

    // Calculate pagination
    const itemsPerPage = transactionsPaginationState.itemsPerPage;
    const currentPage = transactionsPaginationState.currentPage;
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const paginatedData = data.slice(startIndex, endIndex);

    paginatedData.forEach(transaction => {
        const row = document.createElement('tr');

        // Display batch IDs without links
        let batchDisplay = '-';
        if (transaction.batch_ids && transaction.batch_ids.length > 0) {
            batchDisplay = transaction.batch_ids.join(', ');
        }

        // Show real actor IDs with hyperlinks to digisaka.app
        const fromActorId = transaction.from_actor_id || '-';
        const toActorId = transaction.to_actor_id || '-';

        const fromActorDisplay = fromActorId !== '-'
            ? `<a href="https://digisaka.app/api/mobile/trace/actor/get-by-farmer/${fromActorId}" target="_blank" class="text-decoration-none">${fromActorId}</a>`
            : '-';
        const toActorDisplay = toActorId !== '-'
            ? `<a href="https://digisaka.app/api/mobile/trace/actor/get-by-farmer/${toActorId}" target="_blank" class="text-decoration-none">${toActorId}</a>`
            : '-';

        // Format payment reference
        let paymentRef = 'Cash';
        if (transaction.payment_reference === 1) {
            paymentRef = 'Cheque';
        } else if (transaction.payment_reference === 2) {
            paymentRef = 'Balance';
        }

        // Format moisture
        const moistureDisplay = transaction.moisture || '-';

        // Convert status number to readable string
        let statusDisplay = transaction.status;
        if (typeof transaction.status === 'number') {
            const statusMap = { 0: 'Cancelled', 1: 'Completed', 2: 'Pending' };
            statusDisplay = statusMap[transaction.status] || 'Unknown';
        }

        row.innerHTML = `
            <td>${batchDisplay}</td>
            <td>${fromActorDisplay}</td>
            <td>${toActorDisplay}</td>
            <td>${transaction.quantity || '-'}</td>
            <td>₱${(parseFloat(transaction.quantity || 0) * parseFloat(transaction.unit_price || 0)).toFixed(2)}</td>
            <td><span class="badge bg-secondary">${paymentRef}</span></td>
            <td>${moistureDisplay}</td>
            <td>${formatDate(transaction.transaction_date)}</td>
            <td><span class="badge ${getStatusBadgeClass(transaction.status)}">${statusDisplay}</span></td>
            <td>
                ${transaction.signature ? `<a href="https://explorer.solana.com/tx/${transaction.signature}?cluster=devnet" target="_blank" class="btn btn-sm btn-outline-primary" title="View on Solana Explorer">
                    <i class="fas fa-external-link-alt"></i>
                </a>` : '-'}
            </td>
        `;
        tbody.appendChild(row);

        // Add click handlers for actor links after row is added to DOM
        const fromLink = row.querySelector('td:nth-child(2) a');
        const toLink = row.querySelector('td:nth-child(3) a');
        if (fromLink) {
            fromLink.addEventListener('click', (e) => {
                e.preventDefault();
                window.open(fromLink.href, '_blank');
            });
        }
        if (toLink) {
            toLink.addEventListener('click', (e) => {
                e.preventDefault();
                window.open(toLink.href, '_blank');
            });
        }
    });
}

// Apply transaction filters
function applyTransactionFilters() {
    const allData = transactionsPaginationState.allData;
    const filters = transactionsPaginationState.filters;

    transactionsPaginationState.filteredData = allData.filter(transaction => {
        // Skip transactions with corrupted/binary data (huge numbers indicating uninitialized memory)
        // Check if numeric fields have unreasonable values (> 1 billion)
        if (transaction.from_actor_id > 1000000000 || 
            transaction.to_actor_id > 1000000000 ||
            (transaction.quantity && parseFloat(transaction.quantity) > 1000000000) ||
            (transaction.unit_price && parseFloat(transaction.unit_price) > 1000000000)) {
            return false;
        }

        // Filter by status (convert numeric status to string for comparison)
        if (filters.status) {
            let statusStr = '';
            if (transaction.status === 0) statusStr = 'cancelled';
            else if (transaction.status === 1) statusStr = 'completed';
            else if (transaction.status === 2) statusStr = 'pending';
            
            if (statusStr !== filters.status) {
                return false;
            }
        }

        // Filter by payment method
        if (filters.paymentMethod) {
            let paymentRef = 'Cash';
            if (transaction.payment_reference === 1) paymentRef = 'Cheque';
            else if (transaction.payment_reference === 2) paymentRef = 'Balance';

            if (paymentRef !== filters.paymentMethod) {
                return false;
            }
        }

        // Filter by date range (skip if transaction_date is null)
        if ((filters.dateFrom || filters.dateTo) && transaction.transaction_date) {
            const txDate = new Date(transaction.transaction_date);
            if (filters.dateFrom) {
                const fromDate = new Date(filters.dateFrom);
                if (txDate < fromDate) return false;
            }
            if (filters.dateTo) {
                const toDate = new Date(filters.dateTo);
                toDate.setHours(23, 59, 59, 999);
                if (txDate > toDate) return false;
            }
        }

        // Filter by moisture range
        const moisture = parseFloat(transaction.moisture) || 0;
        if (moisture < filters.moistureMin || moisture > filters.moistureMax) {
            return false;
        }

        // Filter by quantity range
        const quantity = parseFloat(transaction.quantity) || 0;
        if (quantity < filters.quantityMin || quantity > filters.quantityMax) {
            return false;
        }

        // Filter by search term (searches in actor names, batch IDs, etc.)
        if (filters.searchTerm) {
            const searchLower = filters.searchTerm.toLowerCase();
            const searchableText = `
                ${transaction.from_actor_name || ''} 
                ${transaction.to_actor_name || ''} 
                ${transaction.batch_ids ? transaction.batch_ids.join(' ') : ''}
                ${transaction.quantity || ''}
            `.toLowerCase();

            if (!searchableText.includes(searchLower)) {
                return false;
            }
        }

        return true;
    });

    // Reset to first page when filters change
    transactionsPaginationState.currentPage = 1;
}

// Render transaction filters (collapsible panel)
function renderTransactionFilters() {
    const container = document.getElementById('transactions-filters-container');
    if (!container) return;

    const html = `
        <div id="filters-panel" class="card mb-3" style="display: none;">
            <div class="card-body">
                <div class="row g-3">
                    <!-- Status Filter -->
                    <div class="col-md-3">
                        <label class="form-label small mb-2">Status</label>
                        <select class="form-select form-select-sm" id="transactions-status-filter">
                            <option value="">All Status</option>
                            <option value="completed" ${transactionsPaginationState.filters.status === 'completed' ? 'selected' : ''}>Completed</option>
                            <option value="pending" ${transactionsPaginationState.filters.status === 'pending' ? 'selected' : ''}>Pending</option>
                            <option value="cancelled" ${transactionsPaginationState.filters.status === 'cancelled' ? 'selected' : ''}>Cancelled</option>
                        </select>
                    </div>
                    
                    <!-- Payment Method Filter -->
                    <div class="col-md-3">
                        <label class="form-label small mb-2">Payment Method</label>
                        <select class="form-select form-select-sm" id="transactions-payment-filter">
                            <option value="">All Payment Methods</option>
                            <option value="Cash" ${transactionsPaginationState.filters.paymentMethod === 'Cash' ? 'selected' : ''}>Cash</option>
                            <option value="Cheque" ${transactionsPaginationState.filters.paymentMethod === 'Cheque' ? 'selected' : ''}>Cheque</option>
                            <option value="Balance" ${transactionsPaginationState.filters.paymentMethod === 'Balance' ? 'selected' : ''}>Balance</option>
                        </select>
                    </div>
                    
                    <!-- Date Range Filter -->
                    <div class="col-md-3">
                        <label class="form-label small mb-2">Date From</label>
                        <input type="date" class="form-control form-control-sm" id="transactions-date-from" 
                               value="${transactionsPaginationState.filters.dateFrom}">
                    </div>
                    
                    <div class="col-md-3">
                        <label class="form-label small mb-2">Date To</label>
                        <input type="date" class="form-control form-control-sm" id="transactions-date-to" 
                               value="${transactionsPaginationState.filters.dateTo}">
                    </div>
                </div>
                
                <hr class="my-3">
                
                <div class="row g-3">
                    <!-- Moisture Range Slider -->
                    <div class="col-md-6">
                        <label class="form-label small mb-2">Moisture Range: <span id="moisture-value">${transactionsPaginationState.filters.moistureMin}-${transactionsPaginationState.filters.moistureMax}%</span></label>
                        <div class="d-flex gap-2 align-items-center">
                            <input type="range" class="form-range" id="transactions-moisture-min" 
                                   min="0" max="100" value="${transactionsPaginationState.filters.moistureMin}">
                            <input type="range" class="form-range" id="transactions-moisture-max" 
                                   min="0" max="100" value="${transactionsPaginationState.filters.moistureMax}">
                        </div>
                    </div>
                    
                    <!-- Quantity Range Slider -->
                    <div class="col-md-6">
                        <label class="form-label small mb-2">Quantity Range: <span id="quantity-value">${transactionsPaginationState.filters.quantityMin}-${transactionsPaginationState.filters.quantityMax}</span></label>
                        <div class="d-flex gap-2 align-items-center">
                            <input type="range" class="form-range" id="transactions-quantity-min" 
                                   min="0" max="10000" step="10" value="${transactionsPaginationState.filters.quantityMin}">
                            <input type="range" class="form-range" id="transactions-quantity-max" 
                                   min="0" max="10000" step="10" value="${transactionsPaginationState.filters.quantityMax}">
                        </div>
                    </div>
                </div>
                
                <div class="row g-2 mt-3">
                    <div class="col-12">
                        <button class="btn btn-sm btn-outline-secondary w-100" id="clear-filters-btn">
                            <i class="fas fa-times me-1"></i>Clear All Filters
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `;

    container.innerHTML = html;

    // Attach event listeners
    document.getElementById('transactions-status-filter').addEventListener('change', (e) => {
        transactionsPaginationState.filters.status = e.target.value;
        applyTransactionFilters();
        transactionsPaginationState.currentPage = 1;
        renderTransactionPagination();
        renderChainTransactionsTable();
    });

    document.getElementById('transactions-payment-filter').addEventListener('change', (e) => {
        transactionsPaginationState.filters.paymentMethod = e.target.value;
        applyTransactionFilters();
        transactionsPaginationState.currentPage = 1;
        renderTransactionPagination();
        renderChainTransactionsTable();
    });

    document.getElementById('transactions-date-from').addEventListener('change', (e) => {
        transactionsPaginationState.filters.dateFrom = e.target.value;
        applyTransactionFilters();
        transactionsPaginationState.currentPage = 1;
        renderTransactionPagination();
        renderChainTransactionsTable();
    });

    document.getElementById('transactions-date-to').addEventListener('change', (e) => {
        transactionsPaginationState.filters.dateTo = e.target.value;
        applyTransactionFilters();
        transactionsPaginationState.currentPage = 1;
        renderTransactionPagination();
        renderChainTransactionsTable();
    });

    // Moisture range sliders
    const moistureMin = document.getElementById('transactions-moisture-min');
    const moistureMax = document.getElementById('transactions-moisture-max');
    const moistureValue = document.getElementById('moisture-value');

    moistureMin.addEventListener('input', (e) => {
        if (parseInt(e.target.value) > parseInt(moistureMax.value)) {
            moistureMax.value = e.target.value;
        }
        transactionsPaginationState.filters.moistureMin = parseInt(e.target.value);
        moistureValue.textContent = `${transactionsPaginationState.filters.moistureMin}-${transactionsPaginationState.filters.moistureMax}%`;
        applyTransactionFilters();
        transactionsPaginationState.currentPage = 1;
        renderTransactionPagination();
        renderChainTransactionsTable();
    });

    moistureMax.addEventListener('input', (e) => {
        if (parseInt(e.target.value) < parseInt(moistureMin.value)) {
            moistureMin.value = e.target.value;
        }
        transactionsPaginationState.filters.moistureMax = parseInt(e.target.value);
        moistureValue.textContent = `${transactionsPaginationState.filters.moistureMin}-${transactionsPaginationState.filters.moistureMax}%`;
        applyTransactionFilters();
        transactionsPaginationState.currentPage = 1;
        renderTransactionPagination();
        renderChainTransactionsTable();
    });

    // Quantity range sliders
    const quantityMin = document.getElementById('transactions-quantity-min');
    const quantityMax = document.getElementById('transactions-quantity-max');
    const quantityValue = document.getElementById('quantity-value');

    quantityMin.addEventListener('input', (e) => {
        if (parseInt(e.target.value) > parseInt(quantityMax.value)) {
            quantityMax.value = e.target.value;
        }
        transactionsPaginationState.filters.quantityMin = parseInt(e.target.value);
        quantityValue.textContent = `${transactionsPaginationState.filters.quantityMin}-${transactionsPaginationState.filters.quantityMax}`;
        applyTransactionFilters();
        transactionsPaginationState.currentPage = 1;
        renderTransactionPagination();
        renderChainTransactionsTable();
    });

    quantityMax.addEventListener('input', (e) => {
        if (parseInt(e.target.value) < parseInt(quantityMin.value)) {
            quantityMin.value = e.target.value;
        }
        transactionsPaginationState.filters.quantityMax = parseInt(e.target.value);
        quantityValue.textContent = `${transactionsPaginationState.filters.quantityMin}-${transactionsPaginationState.filters.quantityMax}`;
        applyTransactionFilters();
        transactionsPaginationState.currentPage = 1;
        renderTransactionPagination();
        renderChainTransactionsTable();
    });

    // Clear filters button
    document.getElementById('clear-filters-btn').addEventListener('click', () => {
        transactionsPaginationState.filters = {
            status: '',
            paymentMethod: '',
            searchTerm: '',
            dateFrom: '',
            dateTo: '',
            moistureMin: 0,
            moistureMax: 100,
            quantityMin: 0,
            quantityMax: 10000
        };
        document.getElementById('transactions-search-header').value = '';
        renderTransactionFilters();
        applyTransactionFilters();
        transactionsPaginationState.currentPage = 1;
        renderTransactionPagination();
        renderChainTransactionsTable();
    });
}

// Render transaction pagination (bottom pagination)
function renderTransactionPagination() {
    const container = document.getElementById('transactions-pagination-container');
    if (!container) return;

    const totalItems = transactionsPaginationState.filteredData.length;
    const itemsPerPage = transactionsPaginationState.itemsPerPage;
    const totalPages = Math.ceil(totalItems / itemsPerPage);
    const currentPage = transactionsPaginationState.currentPage;

    // Generate page numbers to display (show up to 7 pages)
    let pageNumbers = [];
    if (totalPages <= 7) {
        pageNumbers = Array.from({ length: totalPages }, (_, i) => i + 1);
    } else {
        // Always show first page, last page, and pages around current page
        pageNumbers = [1];
        const startPage = Math.max(2, currentPage - 2);
        const endPage = Math.min(totalPages - 1, currentPage + 2);

        if (startPage > 2) pageNumbers.push('...');
        for (let i = startPage; i <= endPage; i++) {
            pageNumbers.push(i);
        }
        if (endPage < totalPages - 1) pageNumbers.push('...');
        pageNumbers.push(totalPages);
    }

    const html = `
        <div class="d-flex justify-content-between align-items-center flex-wrap gap-3">
            <div class="d-flex align-items-center gap-2">
                <small class="text-muted fw-semibold">Show</small>
                <select class="form-select form-select-sm" id="transactions-per-page-bottom" style="width: auto;">
                    <option value="10" ${itemsPerPage === 10 ? 'selected' : ''}>10</option>
                    <option value="20" ${itemsPerPage === 20 ? 'selected' : ''}>20</option>
                    <option value="50" ${itemsPerPage === 50 ? 'selected' : ''}>50</option>
                    <option value="100" ${itemsPerPage === 100 ? 'selected' : ''}>100</option>
                </select>
                <small class="text-muted fw-semibold">entries</small>
            </div>
            
            <small class="text-muted">Showing ${totalItems === 0 ? 0 : (currentPage - 1) * itemsPerPage + 1}-${Math.min(currentPage * itemsPerPage, totalItems)} of ${totalItems} transactions</small>
            
            <nav aria-label="Transaction pagination">
                <ul class="pagination pagination-sm mb-0">
                    <li class="page-item ${currentPage === 1 ? 'disabled' : ''}">
                        <a class="page-link" href="#" onclick="changeTransactionPage(1); return false;" title="First Page">
                            <i class="fas fa-step-backward"></i>
                        </a>
                    </li>
                    <li class="page-item ${currentPage === 1 ? 'disabled' : ''}">
                        <a class="page-link" href="#" onclick="changeTransactionPage(${currentPage - 1}); return false;" title="Previous Page">
                            <i class="fas fa-chevron-left"></i>
                        </a>
                    </li>
                    ${pageNumbers.map(pageNum => pageNum === '...' ? `<li class="page-item disabled"><span class="page-link">...</span></li>` : `<li class="page-item ${pageNum === currentPage ? 'active' : ''}">
                            <a class="page-link" href="#" onclick="changeTransactionPage(${pageNum}); return false;">${pageNum}</a>
                        </li>`).join('')}
                    <li class="page-item ${currentPage === totalPages ? 'disabled' : ''}">
                        <a class="page-link" href="#" onclick="changeTransactionPage(${currentPage + 1}); return false;" title="Next Page">
                            <i class="fas fa-chevron-right"></i>
                        </a>
                    </li>
                    <li class="page-item ${currentPage === totalPages ? 'disabled' : ''}">
                        <a class="page-link" href="#" onclick="changeTransactionPage(${totalPages}); return false;" title="Last Page">
                            <i class="fas fa-step-forward"></i>
                        </a>
                    </li>
                </ul>
            </nav>
        </div>
    `;

    container.innerHTML = html;

    // Attach event listener for items per page dropdown
    const perPageSelect = document.getElementById('transactions-per-page-bottom');
    if (perPageSelect) {
        perPageSelect.addEventListener('change', (e) => {
            transactionsPaginationState.itemsPerPage = parseInt(e.target.value);
            transactionsPaginationState.currentPage = 1;
            renderTransactionPagination();
            renderChainTransactionsTable();
        });
    }
}

// Change transaction page
function changeTransactionPage(pageNum) {
    const totalPages = Math.ceil(transactionsPaginationState.filteredData.length / transactionsPaginationState.itemsPerPage);
    if (pageNum >= 1 && pageNum <= totalPages) {
        transactionsPaginationState.currentPage = pageNum;
        renderTransactionPagination();
        renderChainTransactionsTable();
        // Scroll to table
        document.getElementById('transactions-tbody').scrollIntoView({ behavior: 'smooth' });
    }
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
    document.getElementById('jsonDataModal').addEventListener('hidden.bs.modal', function () {
        this.remove();
    });
}

// Copy to clipboard function
function copyToClipboard(text) {
    const decodedText = text.startsWith('http') ? text : decodeURIComponent(text);
    navigator.clipboard.writeText(decodedText).then(() => {
        showToast('Copied to clipboard!', 'success');
    }).catch((error) => {
        console.error('Error copying to clipboard:', error);
        showToast('Failed to copy to clipboard', 'error');
    });
}

function setupFileInputPreview() {
    const photoInput = document.getElementById('photo_url');
    if (photoInput) {
        photoInput.addEventListener('change', function(e) {
            const files = e.target.files;
            const previewDiv = document.getElementById('photo_url_preview');
            const maxFiles = parseInt(photoInput.getAttribute('data-max-files')) || 5;
            
            if (previewDiv) {
                previewDiv.innerHTML = '';
                
                // Check file limit
                if (files.length > maxFiles) {
                    showToast(`Maximum ${maxFiles} files allowed`, 'error');
                    photoInput.value = '';
                    return;
                }
                
                // Display preview for each file
                Array.from(files).forEach((file, index) => {
                    const reader = new FileReader();
                    reader.onload = function(event) {
                        const imgContainer = document.createElement('div');
                        imgContainer.className = 'position-relative';
                        imgContainer.style.width = '120px';
                        imgContainer.innerHTML = `
                            <img src="${event.target.result}" class="img-fluid rounded" style="width: 120px; height: 120px; object-fit: cover;">
                            <small class="text-muted d-block text-center mt-1">${index + 1}/${files.length}</small>
                        `;
                        previewDiv.appendChild(imgContainer);
                    };
                    reader.readAsDataURL(file);
                });
            }
        });
    }
}

// Display prefilled photos on form load
function displayPrefillPhotos() {
    if (currentEntity !== 'milled_rice') return;
    
    const entity = currentData.find(item => item.id == editingId);
    if (!entity || !entity.photo_url) return;
    
    const previewDiv = document.getElementById('photo_url_preview');
    if (!previewDiv) return;
    
    previewDiv.innerHTML = '';
    
    // Handle photo_url as array or JSON string
    let photos = [];
    if (Array.isArray(entity.photo_url)) {
        photos = entity.photo_url;
    } else if (typeof entity.photo_url === 'string') {
        try {
            photos = JSON.parse(entity.photo_url);
            if (!Array.isArray(photos)) {
                photos = entity.photo_url.split(',').map(p => p.trim()).filter(p => p);
            }
        } catch (e) {
            photos = entity.photo_url.split(',').map(p => p.trim()).filter(p => p);
        }
    }
    
    // Display each photo
    photos.forEach((photoUrl, index) => {
        if (photoUrl) {
            const imgContainer = document.createElement('div');
            imgContainer.className = 'position-relative';
            imgContainer.style.width = '120px';
            imgContainer.innerHTML = `
                <img src="${photoUrl}" class="img-fluid rounded" style="width: 120px; height: 120px; object-fit: cover;" onerror="this.src='data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%22120%22 height=%22120%22%3E%3Crect fill=%22%23ddd%22 width=%22120%22 height=%22120%22/%3E%3Ctext x=%2250%25%22 y=%2250%25%22 dominant-baseline=%22middle%22 text-anchor=%22middle%22 font-family=%22Arial%22 font-size=%2214%22 fill=%22%23999%22%3ENo Image%3C/text%3E%3C/svg%3E'">
                <small class="text-muted d-block text-center mt-1">${index + 1}</small>
            `;
            previewDiv.appendChild(imgContainer);
        }
    });
}

// Chain Actor Add/Edit Modal - NEW IMPLEMENTATION
async function openChainActorModal(mode, id = null) {
    isEditing = mode === 'edit';
    editingId = id;

    const modal = new bootstrap.Modal(document.getElementById('chainActorModal'));
    const modalTitle = document.getElementById('chainActorModalTitle');
    const formFields = document.getElementById('chainActorFormFields');

    modalTitle.textContent = isEditing ? 'Edit Chain Actor' : 'Add New Chain Actor';

    // Generate form fields
    formFields.innerHTML = generateChainActorFormFields();

    // Setup event listeners for type dropdown
    setupChainActorFormListeners();

    // If editing, populate form with existing data
    if (isEditing && id) {
        await populateChainActorForm(id);
    }

    modal.show();
}

function generateChainActorFormFields() {
    return `
        <div class="row">
            <div class="col-md-6 mb-3">
                <label for="actor_name" class="form-label">Name <span class="text-danger">*</span></label>
                <input type="text" class="form-control" id="actor_name" required>
            </div>
            <div class="col-md-6 mb-3">
                <label for="actor_contact_number" class="form-label">Contact Number</label>
                <div class="input-group">
                    <span class="input-group-text">+63</span>
                    <input type="text" class="form-control" id="actor_contact_number" placeholder="9XXXXXXXXX" inputmode="numeric">
                </div>
            </div>
        </div>
        <div class="row">
            <div class="col-md-6 mb-3">
                <label for="actor_type" class="form-label">Actor Type <span class="text-danger">*</span></label>
                <div id="actor_type_chips" class="mb-2"></div>
                <select class="form-select" id="actor_type_dropdown">
                    <option value="">Add Type</option>
                    <option value="farmer">Farmer</option>
                    <option value="trader">Trader</option>
                    <option value="miller">Miller</option>
                    <option value="distributor">Distributor</option>
                    <option value="retailer">Retailer</option>
                    <option value="validator">Validator</option>
                </select>
                <input type="hidden" id="actor_type" value="">
            </div>
            <div class="col-md-6 mb-3">
                <label for="actor_organization" class="form-label">Organization</label>
                <select class="form-select" id="actor_organization">
                    <option value="">Select Organization</option>
                    <option value="blo">BLO</option>
                    <option value="coop">Cooperative</option>
                    <option value="buyback">Buyback</option>
                    <option value="individual">Individual</option>
                </select>
            </div>
        </div>
        <div class="row">
            <div class="col-md-6 mb-3">
                <label for="actor_farmer_id" class="form-label">Farmer</label>
                <div class="input-group">
                    <input type="text" class="form-control" id="actor_farmer_id" placeholder="Search farmer...">
                    <button class="btn btn-outline-secondary" type="button" id="actor_farmer_id_search">
                        <i class="fas fa-search"></i>
                    </button>
                </div>
                <small class="text-muted d-block mt-1" id="actor_farmer_id_display"></small>
                <div id="actor_farmer_id_dropdown" class="dropdown-menu" style="display: none; position: absolute; width: 100%; max-height: 200px; overflow-y: auto; z-index: 1000;"></div>
            </div>
            <div class="col-md-6 mb-3">
                <label for="actor_farm_id" class="form-label">Farm</label>
                <select class="form-select" id="actor_farm_id" disabled>
                    <option value="">Select Farm</option>
                    <option value="farm_1">Farm 1</option>
                    <option value="farm_2">Farm 2</option>
                    <option value="farm_3">Farm 3</option>
                    <option value="farm_4">Farm 4</option>
                </select>
            </div>
        </div>
        <div class="row">
            <div class="col-md-6 mb-3">
                <label for="actor_assigned_tps" class="form-label">Assign TPS</label>
                <div class="input-group">
                    <input type="text" class="form-control" id="actor_assigned_tps" placeholder="Search TPS...">
                    <button class="btn btn-outline-secondary" type="button" id="actor_assigned_tps_search">
                        <i class="fas fa-search"></i>
                    </button>
                </div>
                <small class="text-muted d-block mt-1" id="actor_assigned_tps_display"></small>
                <div id="actor_assigned_tps_dropdown" class="dropdown-menu" style="display: none; position: absolute; width: 100%; max-height: 200px; overflow-y: auto; z-index: 1000;"></div>
            </div>
            <div class="col-md-6 mb-3">
                <label for="actor_is_active" class="form-label">Status</label>
                <select class="form-select" id="actor_is_active">
                    <option value="1">Active</option>
                    <option value="0">Inactive</option>
                </select>
            </div>
        </div>
        <div class="row">
            <div class="col-md-6 mb-3">
                <label for="actor_pin" class="form-label">PIN</label>
                <div class="input-group" id="pin_container">
                    <input type="text" class="form-control pin-box" maxlength="1" inputmode="numeric" >
                    <input type="text" class="form-control pin-box" maxlength="1" inputmode="numeric" >
                    <input type="text" class="form-control pin-box" maxlength="1" inputmode="numeric" >
                    <input type="text" class="form-control pin-box" maxlength="1" inputmode="numeric" >
                    <input type="text" class="form-control pin-box" maxlength="1" inputmode="numeric" >
                    <input type="text" class="form-control pin-box" maxlength="1" inputmode="numeric" >
                </div>
                <input type="hidden" id="actor_pin" value="">
            </div>
            <div class="col-md-6 mb-3">
                <label for="actor_address" class="form-label">Address Name</label>
                <div class="input-group">
                    <input type="text" class="form-control" id="actor_address" placeholder="e.g., Home, Office, Farm">
                    <button class="btn btn-outline-secondary" type="button" id="actor_pick_location" title="Pick location">
                        <i class="fas fa-map-marker-alt"></i>
                    </button>
                </div>
                <small class="text-muted d-block mt-1">Location will be saved with coordinates</small>
                <input type="hidden" id="actor_location_lat" value="">
                <input type="hidden" id="actor_location_lng" value="">
            </div>
        </div>
    `;
}

async function populateChainActorForm(id) {
    // Get actor from current data (already loaded)
    const actor = currentData.find(item => item.id == id);
    
    if (!actor) {
        console.warn(`Actor with id ${id} not found in current data`);
        return;
    }
    
    // Safely set form values with fallback
    const nameEl = document.getElementById('actor_name');
    if (nameEl) nameEl.value = actor.name || '';
    
    const contactEl = document.getElementById('actor_contact_number');
    if (contactEl) contactEl.value = actor.contact_number || '';
    
    const organizationEl = document.getElementById('actor_organization');
    if (organizationEl) organizationEl.value = actor.organization || '';
    
    const farmerIdEl = document.getElementById('actor_farmer_id');
    if (farmerIdEl && actor.farmer_id) {
        farmerIdEl.value = actor.farmer_id;
        farmerIdEl.dataset.userId = actor.farmer_id;
        const farmerDisplayEl = document.getElementById('actor_farmer_id_display');
        if (farmerDisplayEl) {
            farmerDisplayEl.textContent = `ID: ${actor.farmer_id}`;
        }
    }
    
    const farmIdEl = document.getElementById('actor_farm_id');
    if (farmIdEl) farmIdEl.value = actor.farm_id || '';
    
    const assignedTpsEl = document.getElementById('actor_assigned_tps');
    if (assignedTpsEl && actor.assigned_tps) {
        assignedTpsEl.value = actor.assigned_tps;
        assignedTpsEl.dataset.userId = actor.assigned_tps;
        const tpsDisplayEl = document.getElementById('actor_assigned_tps_display');
        if (tpsDisplayEl) {
            tpsDisplayEl.textContent = `ID: ${actor.assigned_tps}`;
        }
    }
    
    // Populate PIN boxes
    const pinEl = document.getElementById('actor_pin');
    if (pinEl && actor.pin) {
        const pinValue = actor.pin.toString();
        const pinBoxes = document.querySelectorAll('.pin-box');
        pinBoxes.forEach((box, index) => {
            box.value = pinValue[index] || '';
        });
        pinEl.value = pinValue;
    }
    
    // Parse address if it's a JSON string
    let addressValue = '';
    let latitude = '';
    let longitude = '';
    if (actor.address) {
        try {
            if (typeof actor.address === 'string') {
                const addressObj = JSON.parse(actor.address);
                addressValue = addressObj.name || '';
                latitude = addressObj.latitude || '';
                longitude = addressObj.longitude || '';
            } else {
                addressValue = actor.address.name || '';
                latitude = actor.address.latitude || '';
                longitude = actor.address.longitude || '';
            }
        } catch (e) {
            addressValue = actor.address || '';
        }
    }
    const addressEl = document.getElementById('actor_address');
    if (addressEl) addressEl.value = addressValue;
    
    const latEl = document.getElementById('actor_location_lat');
    if (latEl) latEl.value = latitude;
    
    const lngEl = document.getElementById('actor_location_lng');
    if (lngEl) lngEl.value = longitude;
    
    const activeEl = document.getElementById('actor_is_active');
    if (activeEl) activeEl.value = actor.is_active ? '1' : '0';
    
    // Handle actor types
    if (actor.actor_type) {
        const types = Array.isArray(actor.actor_type) ? actor.actor_type : actor.actor_type.split(',');
        types.forEach(type => {
            addChainActorChip(type.trim(), type.trim());
        });
    }
}

function addChainActorChip(value, label) {
    const chipsContainer = document.getElementById('actor_type_chips');
    const hiddenInput = document.getElementById('actor_type');

    // Check if chip already exists
    if (chipsContainer.querySelector(`[data-value="${value}"]`)) {
        return;
    }

    const chip = document.createElement('div');
    chip.className = 'chip';
    chip.setAttribute('data-value', value);
    chip.innerHTML = `
        ${label}
        <button type="button" class="chip-remove" onclick="removeChainActorChip('${value}')">
            ×
        </button>
    `;

    chipsContainer.appendChild(chip);
    updateChainActorHiddenInput();
}

function removeChainActorChip(value) {
    const chip = document.querySelector(`#actor_type_chips [data-value="${value}"]`);
    if (chip) {
        chip.remove();
        updateChainActorHiddenInput();
    }
}

function updateChainActorHiddenInput() {
    const chipsContainer = document.getElementById('actor_type_chips');
    const hiddenInput = document.getElementById('actor_type');
    const values = Array.from(chipsContainer.querySelectorAll('.chip')).map(chip => chip.getAttribute('data-value'));
    hiddenInput.value = values.join(',');
}

function setupChainActorFormListeners() {
    // Type dropdown listener
    const typeDropdown = document.getElementById('actor_type_dropdown');
    if (typeDropdown) {
        typeDropdown.addEventListener('change', function () {
            if (this.value) {
                addChainActorChip(this.value, this.options[this.selectedIndex].text);
                this.value = '';
            }
        });
    }

    // Farmer ID search - auto search on typing
    const farmerIdInput = document.getElementById('actor_farmer_id');
    if (farmerIdInput) {
        let farmerSearchTimeout;
        farmerIdInput.addEventListener('keyup', (e) => {
            clearTimeout(farmerSearchTimeout);
            const query = farmerIdInput.value.trim();
            if (query.length >= 2) {
                farmerSearchTimeout = setTimeout(() => {
                    searchUsers(query, 'actor_farmer_id_dropdown', 'actor_farmer_id');
                }, 300);
            } else if (query.length === 0) {
                document.getElementById('actor_farmer_id_dropdown').style.display = 'none';
            }
        });
    }

    // Assign TPS search - auto search on typing
    const assignTpsInput = document.getElementById('actor_assigned_tps');
    if (assignTpsInput) {
        let tpsSearchTimeout;
        assignTpsInput.addEventListener('keyup', (e) => {
            clearTimeout(tpsSearchTimeout);
            const query = assignTpsInput.value.trim();
            if (query.length >= 2) {
                tpsSearchTimeout = setTimeout(() => {
                    searchUsers(query, 'actor_assigned_tps_dropdown', 'actor_assigned_tps');
                }, 300);
            } else if (query.length === 0) {
                document.getElementById('actor_assigned_tps_dropdown').style.display = 'none';
            }
        });
    }

    // PIN box navigation
    const pinBoxes = document.querySelectorAll('.pin-box');
    pinBoxes.forEach((box, index) => {
        box.addEventListener('keyup', (e) => {
            if (e.key === 'Backspace') {
                box.value = '';
                if (index > 0) pinBoxes[index - 1].focus();
            } else if (/^\d$/.test(e.key)) {
                box.value = e.key;
                if (index < pinBoxes.length - 1) pinBoxes[index + 1].focus();
                updatePinValue();
            }
        });
        
        box.addEventListener('input', (e) => {
            if (e.target.value.length > 1) {
                e.target.value = e.target.value.slice(-1);
            }
            if (/^\d$/.test(e.target.value) && index < pinBoxes.length - 1) {
                pinBoxes[index + 1].focus();
            }
            updatePinValue();
        });
    });

    // Pick location button
    const pickLocationBtn = document.getElementById('actor_pick_location');
    if (pickLocationBtn) {
        pickLocationBtn.addEventListener('click', () => openLocationPicker());
    }
}

// Update PIN value from boxes
function updatePinValue() {
    const pinBoxes = document.querySelectorAll('.pin-box');
    const pinValue = Array.from(pinBoxes).map(box => box.value).join('');
    const pinInput = document.getElementById('actor_pin');
    if (pinInput) {
        pinInput.value = pinValue;
    }
}

async function searchUsers(query, dropdownId, inputId) {
    if (!query || query.trim().length < 2) {
        showToast('Please enter at least 2 characters', 'warning');
        return;
    }

    try {
        const response = await fetch(`${API_BASE_URL}/chain-actors/search-users?query=${encodeURIComponent(query)}`);
        const data = await response.json();
        
        const dropdown = document.getElementById(dropdownId);
        if (!dropdown) return;

        if (data.success && data.data && Array.isArray(data.data)) {
            dropdown.innerHTML = '';
            data.data.forEach(user => {
                const item = document.createElement('div');
                item.className = 'dropdown-item';
                item.style.cursor = 'pointer';
                
                // Extract name from nested user object or use direct name property
                let displayName = user.name;
                let userId = user.id || user.user_id;
                
                if (!displayName && user.user) {
                    const firstName = user.user.first_name || '';
                    const lastName = user.user.last_name || '';
                    displayName = `${firstName} ${lastName}`.trim();
                }
                
                item.innerHTML = `<div><strong>${displayName || userId}</strong><br><small class="text-muted">ID: ${userId}</small></div>`;
                item.addEventListener('click', () => {
                    const inputEl = document.getElementById(inputId);
                    inputEl.value = displayName || userId;
                    
                    // Update display field with ID
                    const displayFieldId = inputId + '_display';
                    const displayEl = document.getElementById(displayFieldId);
                    if (displayEl) {
                        displayEl.textContent = `ID: ${userId}`;
                    }
                    
                    // Store the actual ID in a data attribute for submission
                    inputEl.dataset.userId = userId;
                    dropdown.style.display = 'none';
                });
                dropdown.appendChild(item);
            });
            dropdown.style.display = 'block';
        } else {
            dropdown.innerHTML = '<div class="dropdown-item text-muted">No results found</div>';
            dropdown.style.display = 'block';
        }
    } catch (error) {
        console.error('Error searching users:', error);
        showToast('Error searching users', 'error');
    }
}

// Perform search for form fields
async function performSearchFieldSearch(query, dropdownId, inputId, fieldType) {
    const dropdown = document.getElementById(dropdownId);
    if (!dropdown) return;
    
    try {
        // For farmer and validator fields, use external API
        if (fieldType === 'farmer' || fieldType === 'validator') {
            const externalApiUrl = API_EXTERNAL_URL;
            const response = await fetch(`${externalApiUrl}/api/mobile/get-all-users/${encodeURIComponent(query)}`);
            const data = await response.json();
            
            if (data.data && Array.isArray(data.data)) {
                dropdown.innerHTML = '';
                data.data.forEach(user => {
                    const item = document.createElement('div');
                    item.className = 'dropdown-item';
                    item.style.cursor = 'pointer';
                    
                    // Extract name from nested user object
                    let displayName = user.name || user.full_name || '';
                    if (!displayName && user.user) {
                        const firstName = user.user.first_name || '';
                        const lastName = user.user.last_name || '';
                        displayName = `${firstName} ${lastName}`.trim();
                    }
                    
                    let userId = user.id || user.user_id;
                    item.innerHTML = `<div><strong>${displayName || userId}</strong><br><small class="text-muted">ID: ${userId}</small></div>`;
                    item.addEventListener('click', () => {
                        const inputEl = document.getElementById(inputId);
                        inputEl.value = userId;
                        dropdown.style.display = 'none';
                    });
                    dropdown.appendChild(item);
                });
                dropdown.style.display = 'block';
            } else {
                dropdown.innerHTML = '<div class="dropdown-item text-muted">No results found</div>';
                dropdown.style.display = 'block';
            }
        } else {
            // For other fields, use local options
            const options = transactionFormOptions[fieldType] || [];
            const filtered = options.filter(opt => 
                opt.label.toLowerCase().includes(query.toLowerCase()) ||
                opt.value.toString().includes(query)
            );
            
            if (filtered.length > 0) {
                dropdown.innerHTML = '';
                filtered.forEach(option => {
                    const item = document.createElement('div');
                    item.className = 'dropdown-item';
                    item.style.cursor = 'pointer';
                    item.innerHTML = `${option.label} (ID: ${option.value})`;
                    item.addEventListener('click', () => {
                        const inputEl = document.getElementById(inputId);
                        inputEl.value = option.value;
                        dropdown.style.display = 'none';
                    });
                    dropdown.appendChild(item);
                });
                dropdown.style.display = 'block';
            } else {
                dropdown.innerHTML = '<div class="dropdown-item text-muted">No results found</div>';
                dropdown.style.display = 'block';
            }
        }
    } catch (error) {
        console.error('Error searching:', error);
        dropdown.innerHTML = '<div class="dropdown-item text-muted">Error searching</div>';
        dropdown.style.display = 'block';
    }
}

// Setup search listeners for form search fields
function setupFormSearchListeners() {
    // Setup search for farmer_id field in rice batches form
    const farmerIdSearchBtn = document.getElementById('farmer_id_search_btn');
    const farmerIdInput = document.getElementById('farmer_id');
    
    if (farmerIdSearchBtn && farmerIdInput) {
        farmerIdSearchBtn.addEventListener('click', () => {
            const query = farmerIdInput.value;
            if (query && query.trim().length >= 2) {
                performSearchFieldSearch(query, 'farmer_id_dropdown', 'farmer_id', 'farmer');
            } else {
                showToast('Please enter at least 2 characters', 'warning');
            }
        });
        
        farmerIdInput.addEventListener('keyup', (e) => {
            if (e.key === 'Enter') {
                const query = farmerIdInput.value;
                if (query && query.trim().length >= 2) {
                    performSearchFieldSearch(query, 'farmer_id_dropdown', 'farmer_id', 'farmer');
                }
            }
        });
    }

    // Setup search for validator_id field in rice batches form
    const validatorIdSearchBtn = document.getElementById('validator_id_search_btn');
    const validatorIdInput = document.getElementById('validator_id');
    
    if (validatorIdSearchBtn && validatorIdInput) {
        validatorIdSearchBtn.addEventListener('click', () => {
            const query = validatorIdInput.value;
            if (query && query.trim().length >= 2) {
                performSearchFieldSearch(query, 'validator_id_dropdown', 'validator_id', 'validator');
            } else {
                showToast('Please enter at least 2 characters', 'warning');
            }
        });
        
        validatorIdInput.addEventListener('keyup', (e) => {
            if (e.key === 'Enter') {
                const query = validatorIdInput.value;
                if (query && query.trim().length >= 2) {
                    performSearchFieldSearch(query, 'validator_id_dropdown', 'validator_id', 'validator');
                }
            }
        });
    }
}

// Setup transaction-specific form listeners
function setupTransactionFormListeners() {
    const fromActorSelect = document.getElementById('from_actor_id');
    const deductionField = document.getElementById('deduction');
    
    if (!fromActorSelect || !deductionField) return;
    
    // Function to check if actor is buyback and show/hide deduction field
    function updateDeductionVisibility() {
        const selectedActorId = fromActorSelect.value;
        if (!selectedActorId) {
            deductionField.parentElement.parentElement.style.display = 'none';
            return;
        }
        
        // Find the selected actor in transactionFormOptions
        const selectedActor = transactionFormOptions.actors.find(actor => actor.value == selectedActorId);
        
        if (selectedActor) {
            // Fetch the full actor data to check if it's a buyback group
            const actorData = currentData.find(item => item.id == selectedActorId);
            
            if (actorData && actorData.group && actorData.group.toLowerCase() === 'buyback') {
                // Show deduction field for buyback actors
                deductionField.parentElement.parentElement.style.display = 'block';
            } else {
                // Hide deduction field for non-buyback actors
                deductionField.parentElement.parentElement.style.display = 'none';
                // Reset to default value
                deductionField.value = '0';
            }
        }
    }
    
    // Listen for changes to from_actor_id
    fromActorSelect.addEventListener('change', updateDeductionVisibility);
    
    // Initial check on form load
    updateDeductionVisibility();
}

async function saveChainActor() {
    try {
        // Validate required fields
        const name = document.getElementById('actor_name').value.trim();
        const type = document.getElementById('actor_type').value.trim();

        if (!name) {
            showToast('Name is required', 'error');
            return;
        }

        if (!type) {
            showToast('At least one type is required', 'error');
            return;
        }

        // Collect form data
        const addressName = document.getElementById('actor_address').value || '';
        const latitude = document.getElementById('actor_location_lat').value || '';
        const longitude = document.getElementById('actor_location_lng').value || '';
        
        // Build address object with name and coordinates
        let addressData = null;
        if (addressName || latitude || longitude) {
            addressData = {
                name: addressName,
                latitude: latitude,
                longitude: longitude
            };
        }
        
        // Get actual IDs from data attributes (set during search selection)
        const farmerIdEl = document.getElementById('actor_farmer_id');
        const assignedTpsEl = document.getElementById('actor_assigned_tps');
        
        const formData = {
            name: name,
            actor_type: type.split(',').filter(t => t.trim()),
            contact_number: document.getElementById('actor_contact_number').value || null,
            organization: document.getElementById('actor_organization').value || null,
            farmer_id: farmerIdEl.dataset.userId || farmerIdEl.value || null,
            farm_id: document.getElementById('actor_farm_id').value || null,
            assigned_tps: assignedTpsEl.dataset.userId || assignedTpsEl.value || null,
            pin: document.getElementById('actor_pin').value || null,
            address: addressData ? JSON.stringify(addressData) : null,
            is_active: parseInt(document.getElementById('actor_is_active').value)
        };

        showLoading(true);

        // Call external API upsert endpoint
        const endpoint = isEditing ? `/chain-actors/${editingId}` : '/chain-actors';
        const url = `${API_BASE_URL}${endpoint}`;
        const response = isEditing
            ? await axios.put(url, formData)
            : await axios.post(url, formData);

        const result = response.data;

        console.log('API Response:', result);
        console.log('Response Status:', response.status);

        if (result.success) {
            showToast(isEditing ? 'Actor updated successfully' : 'Actor created successfully', 'success');
            bootstrap.Modal.getInstance(document.getElementById('chainActorModal')).hide();
            
            // Reload chain actors table
            loadChainActors();
        } else {
            showToast(result.message || 'Operation failed', 'error');
        }
    } catch (error) {
        console.error('Error saving chain actor:', error);
        const message = error.response?.data?.message || 'Error saving chain actor';
        showToast(message, 'error');
    } finally {
        showLoading(false);
    }
}

// Open location picker for address field
function openLocationPicker() {
    // Check if geolocation is available
    if (!navigator.geolocation) {
        showToast('Geolocation is not supported by your browser', 'error');
        return;
    }

    showLoading(true);
    
    navigator.geolocation.getCurrentPosition(
        (position) => {
            const { latitude, longitude } = position.coords;
            const latEl = document.getElementById('actor_location_lat');
            const lngEl = document.getElementById('actor_location_lng');
            
            if (latEl && lngEl) {
                // Store latitude and longitude in hidden fields
                latEl.value = latitude;
                lngEl.value = longitude;
                
                showToast(`Location picked: ${latitude.toFixed(6)}, ${longitude.toFixed(6)}`, 'success');
            }
            
            showLoading(false);
        },
        (error) => {
            console.error('Geolocation error:', error);
            showToast('Unable to get your location. Please check permissions.', 'error');
            showLoading(false);
        }
    );
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
    const values = Array.from(chipsContainer.querySelectorAll('[data-value]')).map(chip => chip.getAttribute('data-value'));
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
    millings: [],
    dryings: []
};

// Load dynamic form options
async function loadFormOptions() {
    try {
        const [actorsResponse, seasonsResponse, batchesResponse, millingsResponse, dryingResponse] = await Promise.all([
            fetchData('/chain-actors'),
            fetchData('/production-seasons'),
            fetchData('/rice-batches'),
            fetchData('/milled-rice'),
            fetchData('/drying-data')
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
            millings: millingsResponse.data?.map(milling => ({ value: milling.id, label: `Milling ${milling.id}${milling.milling_type ? ` - ${milling.milling_type}` : ''}` })) || [],
            dryings: dryingResponse.data?.map(drying => ({ value: drying.id, label: `Drying ${drying.id}${drying.drying_method ? ` - ${drying.drying_method}` : ''}` })) || []
        };

        console.log('Form options loaded:', transactionFormOptions);

    } catch (error) {
        console.error('Error loading transaction form options:', error);
    }
}

function generateFormFields(entityType) {
    const fields = getEntityFields(entityType);
    let html = '';

    // Separate checkbox fields from regular fields
    const regularFields = fields.filter(f => f.type !== 'checkbox');
    const checkboxFields = fields.filter(f => f.type === 'checkbox');

    // Group regular fields in pairs for better layout
    for (let i = 0; i < regularFields.length; i += 2) {
        const field1 = regularFields[i];
        const field2 = regularFields[i + 1];

        html += '<div class="row g-2 mb-1">';

        // First field
        const field1Display = field1.visible === false ? 'display: none;' : '';
        html += `
            <div class="col-md-${field2 ? '6' : '12'}" style="${field1Display}">
                <div class="form-group">
                    ${field1.type !== 'checkbox' ? `<label for="${field1.name}" class="form-label fw-semibold text-dark mb-1 d-block">${field1.label}${field1.required ? '<span class="text-danger ms-1">*</span>' : ''}</label>` : ''}
                    <div class="form-input-wrapper">
                        ${generateFieldInput(field1)}
                    </div>
                </div>
            </div>
        `;

        // Second field if exists
        if (field2) {
            const field2Display = field2.visible === false ? 'display: none;' : '';
            html += `
                <div class="col-md-6" style="${field2Display}">
                    <div class="form-group">
                        ${field2.type !== 'checkbox' ? `<label for="${field2.name}" class="form-label fw-semibold text-dark mb-1 d-block">${field2.label}${field2.required ? '<span class="text-danger ms-1">*</span>' : ''}</label>` : ''}
                        <div class="form-input-wrapper">
                            ${generateFieldInput(field2)}
                        </div>
                    </div>
                </div>
            `;
        }

        html += '</div>';
    }

    // Add checkbox fields at the end, each on its own full-width row
    checkboxFields.forEach(field => {
        html += '<div class="row g-2 mb-1">';
        html += `
            <div class="col-12">
                <div class="form-group">
                    ${generateFieldInput(field)}
                </div>
            </div>
        `;
        html += '</div>';
    });

    return html;
}

function generateFieldInput(field) {
    switch (field.type) {
        case 'search':
            return `<div class="input-group input-group-sm">
                        <input type="text" class="form-control form-control-sm border-1" id="${field.name}" placeholder="Search ${field.label}..." ${field.required ? 'required' : ''}>
                        <button class="btn btn-outline-secondary btn-sm" type="button" id="${field.name}_search_btn">
                            <i class="fas fa-search"></i>
                        </button>
                        <div class="dropdown-menu w-100 position-absolute" id="${field.name}_dropdown" style="display: none; top: 100%; left: 0; z-index: 1000;"></div>
                    </div>`;
        case 'select':
            let options = '';
            // For dynamic options (like batch_id in transactions), get fresh options from transactionFormOptions
            let fieldOptions = field.options;
            if (field.name === 'batch_id' && currentEntity === 'chain_transactions') {
                fieldOptions = transactionFormOptions.batches;
                console.log('🔍 Rendering batch_id field. Available batches:', fieldOptions);
            }
            if (fieldOptions && Array.isArray(fieldOptions)) {
                fieldOptions.forEach(option => {
                    const selected = field.defaultValue === option.value ? 'selected' : '';
                    options += `<option value="${option.value}" ${selected}>${option.label}</option>`;
                });
            }
            return `<select class="form-select form-select-sm border-1" id="${field.name}" ${field.required ? 'required' : ''}>
                        ${!field.defaultValue ? `<option value="">Select ${field.label}</option>` : ''}
                        ${options}
                    </select>`;
        case 'multiselect':
            const multiOptions = field.options && Array.isArray(field.options) ? field.options.map(opt => `<option value="${opt.value}">${opt.label}</option>`).join('') : '';
            return `<div class="multiselect-container" id="${field.name}_container">
                        <input type="hidden" id="${field.name}" value="">
                        <div class="multiselect-chips mb-2" id="${field.name}_chips"></div>
                        <select class="form-select form-select-sm multiselect-dropdown" id="${field.name}_dropdown">
                            <option value="">Add ${field.label}</option>
                            ${multiOptions}
                        </select>
                    </div>`;
        case 'chips':
            return `<div class="chips-container" id="${field.name}_container">
                        <input type="hidden" id="${field.name}" value="">
                        <div class="input-group input-group-sm mb-2">
                            <input type="text" class="form-control form-control-sm border-1" id="${field.name}_input" placeholder="Type and press Enter">
                            <button class="btn btn-outline-secondary btn-sm" type="button" id="${field.name}_add_btn">
                                <i class="fas fa-plus"></i> Add
                            </button>
                        </div>
                        <div class="chips-display" id="${field.name}_chips"></div>
                    </div>`;
        case 'checkbox':
            return `<div class="form-check mt-2">
                        <input class="form-check-input" type="checkbox" id="${field.name}" ${field.required ? 'required' : ''}>
                        <label class="form-check-label" for="${field.name}">
                            ${field.label}
                        </label>
                    </div>`;
        case 'textarea':
            return `<textarea class="form-control form-control-sm border-1" id="${field.name}" rows="3" ${field.required ? 'required' : ''}></textarea>`;
        case 'date':
            const defaultDate = field.defaultValue || '';
            return `<input type="date" class="form-control form-control-sm border-1" id="${field.name}" value="${defaultDate}" ${field.required ? 'required' : ''} ${field.readonly ? 'readonly' : ''}>`;
        case 'number':
            const step = field.step || '0.01';
            const placeholder = field.placeholder ? `placeholder="${field.placeholder}"` : '';
            return `<input type="number" class="form-control form-control-sm border-1" id="${field.name}" step="${step}" ${placeholder} ${field.required ? 'required' : ''}>`;
        case 'file':
            const accept = field.accept ? `accept="${field.accept}"` : '';
            const multiple = field.multiple ? 'multiple' : '';
            const maxFiles = field.maxFiles ? `data-max-files="${field.maxFiles}"` : '';
            return `<div>
                        <input type="file" class="form-control form-control-sm border-1" id="${field.name}" ${accept} ${multiple} ${maxFiles} ${field.required ? 'required' : ''}>
                        <small class="text-muted d-block mt-1">${field.maxFiles ? `Max ${field.maxFiles} files` : ''}</small>
                        <div id="${field.name}_preview" class="mt-2 d-flex flex-wrap gap-2"></div>
                    </div>`;
        case 'hidden':
            return `<input type="hidden" id="${field.name}" value="${field.defaultValue || ''}">`;
        default:
            return `<input type="text" class="form-control form-control-sm border-1" id="${field.name}" ${field.required ? 'required' : ''} ${field.readonly ? 'readonly' : ''} value="${field.defaultValue || ''}" placeholder="${field.placeholder || ''}">`;
    }
}

function getEntityFields(entityType) {
    const fieldDefinitions = {
        'chain_actors': [
            { name: 'name', label: 'Name', type: 'text', required: true, placeholder: 'e.g., John Farmer' },
            {
                name: 'type', label: 'Type', type: 'multiselect', required: true,
                options: [
                    { value: 'farmer', label: 'Farmer' },
                    { value: 'miller', label: 'Miller' },
                    { value: 'distributor', label: 'Distributor' },
                    { value: 'retailer', label: 'Retailer' },
                    { value: 'validator', label: 'Validator' }
                ]
            },
            { name: 'location', label: 'Location', type: 'text', required: false, placeholder: 'e.g., Barangay Name, Municipality' },
            {
                name: 'group', label: 'Group', type: 'select', required: false,
                options: [
                    { value: 'blo', label: 'BLO' },
                    { value: 'coop', label: 'Cooperative' },
                    { value: 'buyback', label: 'Buyback' }
                ]
            },
            { name: 'farmer_id', label: 'Farmer ID', type: 'text', required: false, placeholder: 'Optional farmer ID' },
            { name: 'assign_tps', label: 'Assign TPS', type: 'text', required: false, placeholder: 'Optional TPS assignment' }
        ],
        'production_seasons': [
            { name: 'crop_year', label: 'Crop Year', type: 'text', required: true, placeholder: 'e.g., 2025-2026' },
            { name: 'farmer_id', label: 'Farmer', type: 'select', required: true, options: transactionFormOptions.actors },
            { name: 'variety', label: 'Variety', type: 'text', required: true, placeholder: 'e.g., NK8840VIP - GMCn92' },
            { 
                name: 'season', label: 'Season', type: 'select', required: true,
                options: [
                    { value: 'wet', label: 'Wet Season' },
                    { value: 'dry', label: 'Dry Season' }
                ]
            },
            { name: 'planting_date', label: 'Planting Date', type: 'date', required: true },
            { name: 'harvest_date', label: 'Harvest Date', type: 'date', required: true },
            { 
                name: 'planned_practice', label: 'Planting Method', type: 'select', required: false,
                options: [
                    { value: 'transplanting', label: 'Transplanting' },
                    { value: 'direct_seeding', label: 'Direct Seeding' },
                    { value: 'broadcasting', label: 'Broadcasting' }
                ]
            },
            { 
                name: 'irrigation_practice', label: 'Irrigation Practice', type: 'select', required: false,
                options: [
                    { value: 'irrigated', label: 'Irrigated' },
                    { value: 'non_irrigated', label: 'Non-Irrigated' }
                ]
            },
            { name: 'total_yield_kg', label: 'Total Yield (kg)', type: 'number', required: false, step: '0.01' },
            { name: 'moisture_content', label: 'Moisture Content (%)', type: 'number', required: false, step: '0.01' },
            { name: 'fertilizer_used', label: 'Fertilizer Used', type: 'chips', required: false },
            { name: 'pesticide_used', label: 'Pesticide Used', type: 'chips', required: false },
            { 
                name: 'carbon_smart_certified', label: 'Carbon Smart Certified', type: 'select', required: false, defaultValue: '0',
                options: [
                    { value: '0', label: 'No' },
                    { value: '1', label: 'Yes' }
                ]
            }
        ],
        'rice_batches': [
            { name: 'farmer_id', label: 'Farmer', type: 'select', required: true, options: transactionFormOptions.actors },
            { name: 'season_id', label: 'Production Season', type: 'select', required: true, options: transactionFormOptions.seasons },
            { name: 'moisture_content', label: 'Moisture Content (%)', type: 'number', required: true, step: '0.01', placeholder: 'e.g., 14' },
            { name: 'price_per_kg', label: 'Price per kg (₱)', type: 'number', required: true, step: '0.01', placeholder: 'e.g., 50' },
            { name: 'weight', label: 'Weight (kg)', type: 'number', required: false, step: '0.01' },
            { name: 'current_holder_id', label: 'Current Holder', type: 'select', required: false, options: transactionFormOptions.actors },
            { name: 'milling_id', label: 'Milling', type: 'select', required: false, options: transactionFormOptions.millings },
            { name: 'drying_id', label: 'Drying', type: 'select', required: false, options: transactionFormOptions.dryings },
            { name: 'validator_id', label: 'Validator', type: 'search', required: false }
        ],
        'milled_rice': [
            { name: 'batch_id', label: 'Batch', type: 'select', required: false, options: transactionFormOptions.batches },
            { name: 'user_id', label: 'Actor', type: 'select', required: true, options: transactionFormOptions.actors },
            { name: 'total_weight_kg', label: 'Total Weight (kg)', type: 'number', required: true, placeholder: 'e.g., 15' },
            {
                name: 'machine_type', label: 'Machine Type', type: 'select', required: true,
                options: [
                    { value: 'Mobile Rice Mill', label: 'Mobile Rice Mill' },
                    { value: 'Stationary Rice Mill', label: 'Stationary Rice Mill' },
                    { value: 'Mini Rice Mill', label: 'Mini Rice Mill' },
                    { value: 'Compact Rice Mill', label: 'Compact Rice Mill' }
                ]
            },
            {
                name: 'quality_grade', label: 'Quality Grade', type: 'select', required: true,
                options: [
                    { value: 'premium', label: 'Premium' },
                    { value: 'grade_a', label: 'Grade A' },
                    { value: 'grade_b', label: 'Grade B' },
                    { value: 'standard', label: 'Standard' }
                ]
            },
            { name: 'moisture_content', label: 'Moisture Content (%)', type: 'number', required: true, step: '0.01', placeholder: 'e.g., 14.00' },
            { name: 'estimated_output_min', label: '', type: 'hidden', required: false, defaultValue: '10' },
            { name: 'estimated_output_max', label: '', type: 'hidden', required: false, defaultValue: '14' },
            { name: 'output', label: 'Actual Output (kg)', type: 'number', required: true, placeholder: 'e.g., 12' },
            { name: 'recovery', label: 'Recovery (%)', type: 'number', required: false, step: '0.01', placeholder: 'e.g., 0.00' },
            { name: 'actual_price', label: 'Total Milling Price (₱)', type: 'number', required: false, step: '0.01', placeholder: 'e.g., 0.00' },
            { name: 'comment', label: 'Comment', type: 'textarea', required: false, placeholder: 'Optional notes' },
            { name: 'photo_url', label: 'Photos', type: 'file', required: false, accept: 'image/*', multiple: true, maxFiles: 5 },
            { name: 'geotagging', label: 'Geotagging', type: 'text', required: false, placeholder: 'Optional location coordinates' }
        ],
        'chain_transactions': [
            { name: 'from_actor_id', label: 'From Actor', type: 'select', required: true, options: transactionFormOptions.actors },
            { name: 'to_actor_id', label: 'To Actor', type: 'select', required: true, options: transactionFormOptions.actors },
            { name: 'batch_id', label: 'Batch ID', type: 'select', required: false, options: transactionFormOptions.batches },
            { name: 'quantity', label: 'Quantity (kg)', type: 'number', required: false, placeholder: 'e.g., 100' },
            { name: 'price_per_kg', label: 'Price per KG', type: 'number', required: false },
            {
                name: 'payment_reference', label: 'Payment Method', type: 'select', required: false,
                options: [
                    { value: '0', label: 'Cash' },
                    { value: '1', label: 'Cheque' },
                    { value: '2', label: 'Balance' }
                ]
            },
            {
                name: 'quality', label: 'Quality Grade', type: 'select', required: false,
                options: [
                    { value: '0', label: 'Premium' },
                    { value: '1', label: 'Well-milled' },
                    { value: '2', label: 'Regular' },
                    { value: '3', label: 'Broken' }
                ]
            },
            { name: 'moisture', label: 'Moisture Content (%)', type: 'text', required: false, placeholder: 'e.g., 14.5%' },
            { name: 'deduction', label: 'Deduction (₱)', type: 'number', required: false, step: '0.01', placeholder: 'e.g., 0', visible: false, defaultValue: '0' },
            {
                name: 'status', label: 'Status', type: 'select', required: true, defaultValue: 'completed',
                options: [
                    { value: 'pending', label: 'Pending' },
                    { value: 'completed', label: 'Completed' },
                    { value: 'cancelled', label: 'Cancelled' }
                ]
            },
            { name: 'agree_seller', label: '', type: 'hidden', required: false, defaultValue: '1' },
            { name: 'agree_buyer', label: '', type: 'hidden', required: false, defaultValue: '1' },
            { name: 'is_test', label: '', type: 'hidden', required: false, defaultValue: '1' }
        ],
        'drying_data': [
            { name: 'initial_mc', label: 'Initial Moisture Content (%)', type: 'number', required: false, step: '0.01', placeholder: 'e.g., 20.00' },
            { name: 'final_mc', label: 'Final Moisture Content (%)', type: 'number', required: false, step: '0.01', placeholder: 'e.g., 15.00' },
            { name: 'temperature', label: 'Temperature (°C)', type: 'number', required: false, step: '0.01', placeholder: 'Optional' },
            { name: 'airflow', label: 'Airflow (m/s)', type: 'text', required: false, placeholder: 'Optional' },
            { name: 'humidity', label: 'Humidity (%)', type: 'number', required: false, step: '0.01', placeholder: 'Optional' },
            { name: 'duration', label: 'Duration (hours)', type: 'number', required: false, step: '0.01', placeholder: 'e.g., 20.00' },
            { name: 'price', label: 'Price (₱)', type: 'number', required: false, step: '0.01', placeholder: 'e.g., 0.00' },
            { name: 'initial_weight', label: 'Initial Weight (kg)', type: 'number', required: false, step: '0.01', placeholder: 'e.g., 200.00' },
            { name: 'final_weight', label: 'Final Weight (kg)', type: 'number', required: false, step: '0.01', placeholder: 'e.g., 20.00' }
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
        if (input) {
            let value = entity[field.name];
            
            // Handle special cases for rice batches
            if (currentEntity === 'rice_batches') {
                // Get farmer_id from season object if not directly available
                if (field.name === 'farmer_id' && (!value || value === undefined) && entity.season && entity.season.farmer_id) {
                    value = entity.season.farmer_id;
                }
            }
            
            // For hidden fields, always set the value from entity or use defaultValue
            if (field.type === 'hidden') {
                input.value = value !== undefined && value !== null ? value : (field.defaultValue || '');
            } else if (value !== undefined && value !== null) {
                if (field.type === 'checkbox') {
                    input.checked = value === true || value === 1 || value === 'true';
                } else if (field.type === 'chips') {
                    // Handle chips field - convert array to comma-separated string
                    if (Array.isArray(value)) {
                        input.value = value.join(', ');
                    } else if (typeof value === 'string') {
                        input.value = value;
                    } else {
                        input.value = '';
                    }
                } else {
                    input.value = value;
                }
            }
        }
    });
}

async function saveEntity() {
    try {
        const formData = collectFormData();
        const endpoint = getEntityEndpoint(currentEntity);

        let response;
        
        // Special handling for entities with upsert pattern (POST for both create and update)
        if (currentEntity === 'rice_batches' || currentEntity === 'milled_rice' || currentEntity === 'drying_data') {
            const upsertEndpoint = `${endpoint}${isEditing ? `/${editingId}` : ''}`;
            response = await createData(upsertEndpoint, formData);
        } else if (isEditing) {
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
                case 'drying-data':
                    loadDryingData();
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
                // For production seasons chips, keep as comma-separated string
                if (currentEntity === 'production_seasons' && field.type === 'chips') {
                    if (value) {
                        data[field.name] = value;
                    }
                } else {
                    // For other entities, convert to array
                    const entries = value
                        ? value
                            .split(',')
                            .map(v => v.trim())
                            .filter(Boolean)
                        : [];
                    if (entries.length > 0) {
                        data[field.name] = entries;
                    }
                }
            } else if (currentEntity === 'chain_transactions') {
                if (field.name === 'batch_id' && value) {
                    // Convert single batch ID to array
                    data[field.name] = [parseInt(value)];
                } else if (field.name === 'payment_reference' && value) {
                    // Convert to integer
                    data[field.name] = parseInt(value);
                } else if (field.name === 'deduction') {
                    // Always include deduction, default to 0
                    data[field.name] = value ? parseFloat(value) : 0;
                } else if (field.name === 'transaction_date') {
                    // Use today's date
                    data[field.name] = new Date().toISOString().split('T')[0];
                } else if (field.type === 'hidden') {
                    // Always include hidden fields
                    data[field.name] = value || field.defaultValue || '1';
                } else if (value !== null) {
                    data[field.name] = value;
                }
            } else if (currentEntity === 'drying_data' || currentEntity === 'milled_rice' || currentEntity === 'rice_batches') {
                // For drying data, milled rice, and rice batches, include all fields even if empty (external API requires them)
                // Convert empty strings to null for numeric fields
                if (field.type === 'number') {
                    data[field.name] = value ? parseFloat(value) : null;
                } else if (field.type === 'hidden') {
                    // For hidden fields, just add the value as-is
                    data[field.name] = value || null;
                } else if (currentEntity === 'rice_batches' && (field.name === 'farmer_id' || field.name === 'season_id' || field.name === 'current_holder_id' || field.name === 'milling_id' || field.name === 'drying_id' || field.name === 'validator_id')) {
                    // Convert ID fields to integers for rice batches
                    data[field.name] = value ? parseInt(value) : null;
                } else {
                    data[field.name] = value || null;
                }
            } else {
                // Only add field if it has a value
                if (value !== null && value !== '') {
                    data[field.name] = value;
                }
            }
        }
    });

    // For milled rice, set estimated_output_min and estimated_output_max to the same value as output
    if (currentEntity === 'milled_rice') {
        const outputValue = data.output;
        data.estimated_output_min = outputValue;
        data.estimated_output_max = outputValue;
    }

    if (currentEntity === 'production_seasons') {
        const chipFields = ['fertilizer_used', 'pesticide_used'];
        chipFields.forEach(fieldName => {
            if (Array.isArray(data[fieldName])) {
                if (data[fieldName].length > 0) {
                    data[fieldName] = data[fieldName].join(',');
                } else {
                    delete data[fieldName];
                }
            } else if (typeof data[fieldName] === 'string' && data[fieldName].startsWith('[')) {
                // Handle JSON array string
                try {
                    const parsed = JSON.parse(data[fieldName]);
                    if (Array.isArray(parsed) && parsed.length > 0) {
                        data[fieldName] = parsed.join(',');
                    } else {
                        delete data[fieldName];
                    }
                } catch (e) {
                    // If parsing fails, delete the field
                    delete data[fieldName];
                }
            }
        });
    }

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

async function openTransactionModal() {
    openModal('add', 'chain_transactions');
}

async function deleteEntity(entityType, id) {
    if (!confirm('Are you sure you want to delete this item?')) {
        return;
    }

    try {
        // Map entity types to external trace API delete endpoints
        const deleteEndpoints = {
            'chain_actors': '/api/mobile/trace/actor/delete',
            'production_seasons': '/api/mobile/trace/season/delete',
            'rice_batches': '/api/mobile/trace/batch/delete',
            'milled_rice': '/api/mobile/trace/milling/delete',
            'drying_data': '/api/mobile/trace/drying/delete'
        };

        const deleteEndpoint = deleteEndpoints[entityType];
        if (!deleteEndpoint) {
            showToast('Unknown entity type', 'error');
            return;
        }

        const response = await fetch(`${API_EXTERNAL_URL}${deleteEndpoint}/${id}`, {
            method: 'GET'
        });
        const data = await response.json();

        if (response.ok || data.success) {
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
                case 'drying-data':
                    loadDryingData();
                    break;
                default:
                    loadChainActors();
            }
        } else {
            showToast(data.error || 'Delete failed', 'error');
        }
    } catch (error) {
        console.error('Error deleting entity:', error);
        showToast('Error deleting data', 'error');
    }
}

// API Functions
function getApiUrl(endpoint) {
    // Chain transactions use local API_BASE_URL, all others use external API
    if (endpoint === '/transactions') {
        return `${API_BASE_URL}${endpoint}`;
    }
    // Map endpoints to external API paths
    const externalEndpoints = {
        '/chain-actors': '/api/mobile/trace/actor/get-all',
        '/rice-batches': '/api/mobile/trace/batch/get-all',
        '/milled-rice': '/api/mobile/trace/milling/get-all',
        '/production-seasons': '/api/mobile/trace/season/get-all',
        '/drying-data': '/api/mobile/trace/drying/get-all'
    };
    
    if (externalEndpoints[endpoint]) {
        return `${API_EXTERNAL_URL}${externalEndpoints[endpoint]}`;
    }
    
    return `${API_BASE_URL}${endpoint}`;
}

async function fetchData(endpoint) {
    const url = getApiUrl(endpoint);
    try {
        const response = await fetch(url);
        if (!response.ok) {
            console.error(`API Error: ${response.status} ${response.statusText} for ${url}`);
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        const data = await response.json();
        console.log(`Fetched from ${url}:`, data);
        return data;
    } catch (error) {
        console.error(`Failed to fetch ${url}:`, error);
        throw error;
    }
}

async function createData(endpoint, data) {
    try {
        const response = await axios.post(`${API_BASE_URL}${endpoint}`, data);
        return response.data;
    } catch (error) {
        console.error('Create request failed:', error);
        return {
            success: false,
            error: error.response?.data?.message || 'Failed to create record'
        };
    }
}

async function updateData(endpoint, data) {
    try {
        const response = await axios.put(`${API_BASE_URL}${endpoint}`, data);
        return response.data;
    } catch (error) {
        console.error('Update request failed:', error);
        return {
            success: false,
            error: error.response?.data?.message || 'Failed to update record'
        };
    }
}

async function upsertBatch(endpoint, data) {
    try {
        console.log('Sending upsert batch request:', { endpoint, data });
        const response = await axios.post(`${API_BASE_URL}${endpoint}`, data);
        return response.data;
    } catch (error) {
        console.error('Upsert batch request failed:', error);
        return {
            success: false,
            error: error.response?.data?.message || 'Failed to upsert batch'
        };
    }
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
        'chain_transactions': '/transactions',
        'drying_data': '/drying-data'
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

    function loadEndpointTemplate(endpoint) {
        const template = endpointTemplates[endpoint];
        if (!template) return;

        // Clear existing rows
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
    sendButton.addEventListener('click', async function () {
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
    clearButton.addEventListener('click', function () {
        document.getElementById('api-response').textContent = 'Click "Send Request" to see the response here...';
        document.getElementById('response-status').textContent = 'Ready';
        document.getElementById('response-status').className = 'badge bg-secondary';
    });

    // Initialize URL
    updateUrl();
}

async function loadBatchTracker() {
    try {
        showLoading(true);

        // Load all batches from external API (optional for scanner)
        const response = await fetch(`${API_EXTERNAL_URL}/api/mobile/trace/batch/get-all`);
        const data = await response.json();

        if (data.success && data.data) {
            populateBatchList(data.data);
            setupBatchSearch(data.data);
        }
    } catch (error) {
        console.error('Error loading batch tracker:', error);
        showToast('Error loading batch data', 'error');
    } finally {
        // Always set up QR scanner button, even if API fails
        setupQRScanner();
        showLoading(false);
    }
}

// QR Scanner Setup - fullscreen overlay
function setupQRScanner() {
    const btn = document.getElementById('qr-scanner-toggle');
    const overlay = document.getElementById('qr-overlay');
    const video = document.getElementById('qr-video');
    const closeBtn = document.getElementById('qr-close-btn');
    const searchInput = document.getElementById('batch-search-input');

    if (!btn || !overlay || !video || !closeBtn || !searchInput) return;

    let stream = null;

    async function openScanner() {
        try {
            stream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: 'environment' },
                audio: false
            });

            video.srcObject = stream;
            overlay.style.display = 'flex';

            // Start scanning
            scanQRCode(video, async (qrValue) => {
                // Put QR text into input
                searchInput.value = qrValue;

                // Stop camera & hide overlay
                if (stream) {
                    stream.getTracks().forEach(t => t.stop());
                    stream = null;
                }
                overlay.style.display = 'none';

                // Call external batch API
                try {
                    const resp = await fetch(`${API_EXTERNAL_URL}/api/mobile/trace/batch/${encodeURIComponent(qrValue)}`);
                    const data = await resp.json();
                    console.log('Batch lookup result:', data);
                    if (data && data.success) {
                        showToast('Batch found', 'success');
                        // You can plug this into your existing display logic here later
                    } else {
                        showToast('Batch not found', 'error');
                    }
                } catch (err) {
                    console.error('Error fetching batch by QR:', err);
                    showToast('Error fetching batch info', 'error');
                }
            });
        } catch (err) {
            console.error('Camera error:', err);
            showToast('Camera error: ' + err.message, 'error');
        }
    }

    function closeScanner() {
        overlay.style.display = 'none';
        if (stream) {
            stream.getTracks().forEach(t => t.stop());
            stream = null;
        }
    }

    btn.addEventListener('click', (e) => {
        e.preventDefault();
        openScanner();
    });

    closeBtn.addEventListener('click', (e) => {
        e.preventDefault();
        closeScanner();
    });
}

// QR Code Scanning - generic
function scanQRCode(video, onResult) {
    if (typeof jsQR === 'undefined') {
        console.error('jsQR not loaded');
        showToast('QR library not loaded', 'error');
        return;
    }

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    let lastValue = null;

    function loop() {
        if (video.readyState === video.HAVE_ENOUGH_DATA) {
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;

            if (canvas.width && canvas.height) {
                ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
                const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
                const code = jsQR(imageData.data, imageData.width, imageData.height);

                if (code && code.data && code.data !== lastValue) {
                    lastValue = code.data;
                    onResult(code.data);
                    return; // stop after first successful scan
                }
            }
        }

        // continue scanning while overlay is visible
        const overlay = document.getElementById('qr-overlay');
        if (overlay && overlay.style.display !== 'none') {
            requestAnimationFrame(loop);
        }
    }

    requestAnimationFrame(loop);
}

function populateBatchList(batches) {
    const batchList = document.getElementById('batch-list');
    batchList.innerHTML = '';

    batches.forEach(batch => {
        const listItem = document.createElement('a');
        listItem.href = '#';
        listItem.className = 'list-group-item list-group-item-action';
        listItem.dataset.batchId = batch.id;
        listItem.dataset.qrCode = batch.qr_code;
        listItem.innerHTML = `
            <div class="d-flex w-100 justify-content-between">
                <h6 class="mb-1">${batch.qr_code ? batch.qr_code.substring(0, 8) + '...' : 'Batch ' + batch.id}</h6>
                <small>${new Date(batch.created_at).toLocaleDateString()}</small>
            </div>
            <p class="mb-1">Weight: ${batch.batch_weight_kg} kg</p>
            <small>Status: ${batch.status || 'Unknown'}</small>
        `;

        listItem.addEventListener('click', (e) => {
            e.preventDefault();
            selectBatch(batch.qr_code);

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
            (batch.qr_code && batch.qr_code.toLowerCase().includes(searchTerm)) ||
            (batch.batch_weight_kg && batch.batch_weight_kg.toString().includes(searchTerm)) ||
            (batch.status && batch.status.toLowerCase().includes(searchTerm))
        );

        populateBatchList(filteredBatches);
    });
}

async function selectBatch(qrCode) {
    try {
        showLoading(true);

        // Fetch batch data from external API using QR code
        const response = await fetch(`${API_EXTERNAL_URL}/api/mobile/trace/batch/${qrCode}`);
        const data = await response.json();

        if (data.success && data.data) {
            displayBatchDetails(data.data);
        } else {
            showToast('Batch not found', 'error');
        }

        showLoading(false);
    } catch (error) {
        console.error('Error loading batch details:', error);
        showToast('Error loading batch details', 'error');
        showLoading(false);
    }
}

function displayBatchDetails(batch) {
    // Show batch details section and hide empty state
    document.getElementById('batch-details').style.display = 'block';
    document.getElementById('batch-empty-state').style.display = 'none';

    // Populate batch overview
    const batchOverview = document.getElementById('batch-overview');
    batchOverview.innerHTML = `
        <div class="col-md-6">
            <p><strong>QR Code:</strong> ${batch.qr_code || 'N/A'}</p>
            <p><strong>Batch Weight:</strong> ${batch.batch_weight_kg || 'N/A'} kg</p>
            <p><strong>Moisture Content:</strong> ${batch.moisture_content || 'N/A'}%</p>
            <p><strong>Status:</strong> <span class="badge bg-${batch.status === 'for_sale' ? 'success' : 'warning'}">${batch.status || 'N/A'}</span></p>
        </div>
        <div class="col-md-6">
            <p><strong>Price per kg:</strong> ₱${batch.price_per_kg || 'N/A'}</p>
            <p><strong>Current Holder ID:</strong> ${batch.current_holder_id || 'N/A'}</p>
            <p><strong>Created:</strong> ${batch.created_at ? new Date(batch.created_at).toLocaleDateString() : 'N/A'}</p>
            <p><strong>Updated:</strong> ${batch.updated_at ? new Date(batch.updated_at).toLocaleDateString() : 'N/A'}</p>
        </div>
    `;

    // Populate milling information
    const farmerInfo = document.getElementById('farmer-info');
    farmerInfo.innerHTML = `
        <div class="col-md-6">
            <p><strong>Milling ID:</strong> ${batch.milling_id || 'N/A'}</p>
            <p><strong>Drying ID:</strong> ${batch.drying_id || 'N/A'}</p>
        </div>
        <div class="col-md-6">
            <p><strong>Season ID:</strong> ${batch.season_id || 'N/A'}</p>
            <p><strong>Validator:</strong> ${batch.validator || 'Pending'}</p>
        </div>
    `;

    // Populate season information
    const seasonInfo = document.getElementById('season-info');
    seasonInfo.innerHTML = `
        <div class="col-md-12">
            <p class="text-muted"><i class="fas fa-info-circle me-2"></i>Additional batch information is available in the batch details above.</p>
        </div>
    `;

    // Hide milling data section (not available from this API)
    const millingDataDiv = document.getElementById('milling-data');
    millingDataDiv.innerHTML = '<p class="text-muted">Milling data not available in current API response.</p>';

    // Hide transaction history section (not available from this API)
    const transactionsTbody = document.getElementById('batch-transactions-tbody');
    transactionsTbody.innerHTML = '<tr><td colspan="6" class="text-center text-muted">Transaction history not available in current API response.</td></tr>';
}


// Function to view season details
function viewSeasonDetails(seasonId) {
    showToast('Season details for ID: ' + seasonId, 'info');
    // This can be expanded to show a modal with detailed season information
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
    // Handle both number (0, 1, 2) and string formats
    let statusStr = status;
    if (typeof status === 'number') {
        // 0=cancelled, 1=completed, 2=pending
        const statusMap = { 0: 'cancelled', 1: 'completed', 2: 'pending' };
        statusStr = statusMap[status] || 'unknown';
    }

    switch (statusStr?.toLowerCase()) {
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

// Transaction Summary Functions
async function loadTransactionSummary() {
    try {
        showTableLoading('transaction-summary-tbody');

        // Get the selected filter values
        const filterSelect = document.getElementById('transaction-filter');
        const dateFromInput = document.getElementById('transaction-summary-date-from');
        const dateToInput = document.getElementById('transaction-summary-date-to');
        
        const filter = filterSelect ? filterSelect.value : 'all';
        let dateFrom = dateFromInput ? dateFromInput.value : '';
        let dateTo = dateToInput ? dateToInput.value : '';

        // Set default to today for dateTo only (dateFrom remains empty for "from any date")
        const today = new Date().toISOString().split('T')[0];
        if (!dateTo) dateTo = today;

        // Update input values and filter state
        if (dateFromInput) dateFromInput.value = dateFrom;
        if (dateToInput) dateToInput.value = dateTo;
        
        transactionSummaryFilters.category = filter;
        transactionSummaryFilters.dateFrom = dateFrom;
        transactionSummaryFilters.dateTo = dateTo;

        // Build query parameters
        let queryParams = `?category=${filter}`;
        if (dateFrom) queryParams += `&dateFrom=${dateFrom}`;
        if (dateTo) queryParams += `&dateTo=${dateTo}`;

        // Fetch from external API
        const response = await fetch(`${API_EXTERNAL_URL}/api/mobile/trace/transaction/summary/${filter}${queryParams}`);
        
        // Handle 404 and other error responses
        if (!response.ok) {
            if (response.status === 404) {
                showTableError('transaction-summary-tbody', 'No transaction summary data available');
            } else {
                showTableError('transaction-summary-tbody', `Error: ${response.status} ${response.statusText}`);
            }
            return;
        }

        const data = await response.json();

        if (data.success) {
            renderTransactionSummaryTable(data.data || []);
        } else {
            // Handle API returning success: false
            const errorMsg = data.message || 'Error loading transaction summary';
            showTableError('transaction-summary-tbody', errorMsg);
        }

        // Setup filter change listeners
        if (filterSelect) {
            filterSelect.removeEventListener('change', loadTransactionSummary);
            filterSelect.addEventListener('change', loadTransactionSummary);
        }
        if (dateFromInput) {
            dateFromInput.removeEventListener('change', loadTransactionSummary);
            dateFromInput.addEventListener('change', loadTransactionSummary);
        }
        if (dateToInput) {
            dateToInput.removeEventListener('change', loadTransactionSummary);
            dateToInput.addEventListener('change', loadTransactionSummary);
        }
    } catch (error) {
        console.error('Error loading transaction summary:', error);
        showToast('Error loading transaction summary', 'error');
        showTableError('transaction-summary-tbody', 'Error loading transaction summary');
    }
}

function renderTransactionSummaryTable(data) {
    const tbody = document.getElementById('transaction-summary-tbody');
    tbody.innerHTML = '';

    if (!data || data.length === 0) {
        tbody.innerHTML = '<tr><td colspan="9" class="text-center text-muted">No transaction summary data found</td></tr>';
        return;
    }

    data.forEach(transaction => {
        const row = document.createElement('tr');

        // Parse address JSON
        let addressName = '-';
        try {
            if (transaction.address) {
                const addressObj = JSON.parse(transaction.address);
                addressName = addressObj.name || '-';
            }
        } catch (e) {
            addressName = transaction.address || '-';
        }

        // Determine badge category
        let badgeCategory = transaction.category || 'none';
        let badgeColor = 'bg-secondary';
        let categoryDisplay = 'None';
        
        if (badgeCategory === 'buyback') {
            badgeColor = 'bg-primary';
            categoryDisplay = 'Buyback';
        } else if (badgeCategory === 'blo') {
            badgeColor = 'bg-success';
            categoryDisplay = 'BLO';
        } else if (badgeCategory === 'coop') {
            badgeColor = 'bg-info';
            categoryDisplay = 'COOP';
        } else if (badgeCategory === 'individual') {
            badgeColor = 'bg-warning';
            categoryDisplay = 'Individual';
        }

        row.innerHTML = `
            <td>${transaction.season || '-'}</td>
            <td>${transaction.farmers_name || '-'}</td>
            <td>${addressName}</td>
            <td>${transaction.ha || '0'}</td>
            <td>${transaction.variety || '-'}</td>
            <td>${transaction.kgs || '0'}</td>
            <td style="text-align: center;">₱${transaction.price_kg || '0'}</td>
            <td style="background-color: #1b7a3d; color: white; font-weight: 600; text-align: center;"><strong>₱${transaction.fresh_harvest || '0'}</strong></td>
            <td style="text-align: center;"><span class="badge ${badgeColor}">${categoryDisplay}</span></td>
        `;
        tbody.appendChild(row);
    });
}
// Drying Data Functions
async function loadDryingData(page = 1) {
    try {
        showTableLoading('drying-data-tbody');
        const url = `${API_EXTERNAL_URL}/api/mobile/trace/drying/get-all/`;
        const response = await fetch(url);
        const data = await response.json();
        
        // Handle response from external API
        const dryingData = data.data || [];
        
        currentData = dryingData;
        renderDryingDataTable(dryingData);
        
        // Setup search
        setupDryingDataSearch();
    } catch (error) {
        console.error('Error loading drying data:', error);
        showToast('Error loading drying data', 'error');
        showTableError('drying-data-tbody', 'Error loading drying data');
    }
}

function renderDryingDataTable(data) {
    const tbody = document.getElementById('drying-data-tbody');
    tbody.innerHTML = '';

    if (!data || data.length === 0) {
        tbody.innerHTML = '<tr><td colspan="9" class="text-center text-muted">No drying data found</td></tr>';
        return;
    }

    data.forEach(item => {
        const row = document.createElement('tr');
        const initialMc = item.initial_mc ? `${item.initial_mc}%` : '-';
        const finalMc = item.final_mc ? `${item.final_mc}%` : '-';
        const initialWeight = item.initial_weight ? `${item.initial_weight} kg` : '-';
        const finalWeight = item.final_weight ? `${item.final_weight} kg` : '-';
        const duration = item.duration ? `${item.duration} hrs` : '-';
        const temperature = item.temperature ? `${item.temperature}°C` : '-';
        const humidity = item.humidity ? `${item.humidity}%` : '-';
        const airflow = item.airflow || '-';
        const price = item.price ? `₱${item.price}` : '₱0.00';
        
        // Determine drying method badge
        const isNullHumidity = item.humidity === null || item.humidity === undefined || item.humidity === '';
        const isNullTemperature = item.temperature === null || item.temperature === undefined || item.temperature === '';
        const isNullAirflow = item.airflow === null || item.airflow === undefined || item.airflow === '';
        
        let methodBadgeColor = 'bg-success';
        let methodDisplay = 'Machine';
        
        if (isNullHumidity && isNullTemperature && isNullAirflow) {
            methodBadgeColor = 'bg-warning';
            methodDisplay = 'Sun';
        }
        
        const methodBadge = `<span class="badge ${methodBadgeColor}">${methodDisplay}</span>`;
        
        row.innerHTML = `
            <td>${methodBadge}</td>
            <td>${initialMc}</td>
            <td>${finalMc}</td>
            <td>${initialWeight}</td>
            <td>${finalWeight}</td>
            <td>${duration}</td>
            <td>${temperature}</td>
            <td>${humidity}</td>
            <td>${airflow}</td>
            <td>${price}</td>
            <td class="action-buttons">
                <button class="btn btn-sm btn-warning" onclick="editEntity('drying_data', ${item.id})">
                    <i class="fas fa-edit"></i>
                </button>
                <button class="btn btn-sm btn-danger" onclick="deleteEntity('drying_data', ${item.id})">
                    <i class="fas fa-trash"></i>
                </button>
            </td>
        `;
        tbody.appendChild(row);
    });
}

function setupDryingDataSearch() {
    const searchInput = document.getElementById('drying-search');
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            filterTable(e.target.value, 'drying-data');
        });
    }
}

function renderDryingPagination(paginationInfo) {
    const paginationContainer = document.getElementById('drying-pagination');
    if (!paginationContainer) return;
    
    const currentPage = paginationInfo.current_page;
    const lastPage = paginationInfo.last_page;
    const total = paginationInfo.total;
    const perPage = paginationInfo.per_page;
    
    // Generate page numbers to display (show up to 7 pages)
    let pageNumbers = [];
    if (lastPage <= 7) {
        pageNumbers = Array.from({ length: lastPage }, (_, i) => i + 1);
    } else {
        pageNumbers = [1];
        const startPage = Math.max(2, currentPage - 2);
        const endPage = Math.min(lastPage - 1, currentPage + 2);
        if (startPage > 2) pageNumbers.push('...');
        for (let i = startPage; i <= endPage; i++) {
            pageNumbers.push(i);
        }
        if (endPage < lastPage - 1) pageNumbers.push('...');
        pageNumbers.push(lastPage);
    }

    const html = `
        <div class="d-flex justify-content-between align-items-center flex-wrap gap-3">
            <div class="d-flex align-items-center gap-2">
                <small class="text-muted fw-semibold">Show</small>
                <select class="form-select form-select-sm" id="drying-per-page" style="width: auto;">
                    <option value="10" ${perPage === 10 ? 'selected' : ''}>10</option>
                    <option value="20" ${perPage === 20 ? 'selected' : ''}>20</option>
                    <option value="50" ${perPage === 50 ? 'selected' : ''}>50</option>
                    <option value="100" ${perPage === 100 ? 'selected' : ''}>100</option>
                </select>
                <small class="text-muted fw-semibold">entries</small>
            </div>
            <small class="text-muted">Showing ${total === 0 ? 0 : (currentPage - 1) * perPage + 1}-${Math.min(currentPage * perPage, total)} of ${total} records</small>
            <nav aria-label="Drying pagination">
                <ul class="pagination pagination-sm mb-0">
                    <li class="page-item ${currentPage === 1 ? 'disabled' : ''}">
                        <a class="page-link" href="#" onclick="changeDryingPage(1); return false;" title="First Page">
                            <i class="fas fa-step-backward"></i>
                        </a>
                    </li>
                    <li class="page-item ${currentPage === 1 ? 'disabled' : ''}">
                        <a class="page-link" href="#" onclick="changeDryingPage(${currentPage - 1}); return false;" title="Previous Page">
                            <i class="fas fa-chevron-left"></i>
                        </a>
                    </li>
                    ${pageNumbers.map(pageNum => pageNum === '...' ? `<li class="page-item disabled"><span class="page-link">...</span></li>` : `<li class="page-item ${pageNum === currentPage ? 'active' : ''}"><a class="page-link" href="#" onclick="changeDryingPage(${pageNum}); return false;">${pageNum}</a></li>`).join('')}
                    <li class="page-item ${currentPage === lastPage ? 'disabled' : ''}">
                        <a class="page-link" href="#" onclick="changeDryingPage(${currentPage + 1}); return false;" title="Next Page">
                            <i class="fas fa-chevron-right"></i>
                        </a>
                    </li>
                    <li class="page-item ${currentPage === lastPage ? 'disabled' : ''}">
                        <a class="page-link" href="#" onclick="changeDryingPage(${lastPage}); return false;" title="Last Page">
                            <i class="fas fa-step-forward"></i>
                        </a>
                    </li>
                </ul>
            </nav>
        </div>
    `;
    paginationContainer.innerHTML = html;
    const perPageSelect = document.getElementById('drying-per-page');
    if (perPageSelect) {
        perPageSelect.addEventListener('change', () => loadDryingData(1));
    }
}

function changeDryingPage(page) {
    loadDryingData(page);
}

// ============================================
// Modal and Form Functions
// ============================================

let isEditing = false;
let editingId = null;

function getEntityEndpoint(entityType) {
    const endpoints = {
        'chain_actors': '/chain-actors',
        'production_seasons': '/production-seasons',
        'rice_batches': '/rice-batches',
        'milled_rice': '/milled-rice',
        'chain_transactions': '/transactions',
        'drying_data': '/drying-data'
    };
    return endpoints[entityType] || '';
}

async function openModal(mode, entityType, id = null) {
    isEditing = mode === 'edit';
    editingId = id;
    currentEntity = entityType;

    const modal = new bootstrap.Modal(document.getElementById('entityModal'));
    const loadingModal = new bootstrap.Modal(document.getElementById('loadingModal'));
    const modalTitle = document.getElementById('modalTitle');
    const modalSubtitle = document.getElementById('modalSubtitle');
    const saveBtnText = document.getElementById('saveBtnText');
    const formFields = document.getElementById('formFields');

    // Set title
    const entityNames = {
        'chain_actors': 'Chain Actor',
        'production_seasons': 'Production Season',
        'rice_batches': 'Rice Batch',
        'milled_rice': 'Milled Rice',
        'chain_transactions': 'Chain Transaction',
        'drying_data': 'Drying Data'
    };

    const entityName = entityNames[entityType];
    modalTitle.textContent = isEditing ? `Edit ${entityName}` : `Add New ${entityName}`;
    saveBtnText.textContent = isEditing ? 'Update' : 'Create';
    
    // Set subtitle
    if (isEditing && id) {
        modalSubtitle.textContent = `ID: ${id}`;
    } else {
        modalSubtitle.textContent = `Create a new ${entityName.toLowerCase()}`;
    }

    // Show loading modal
    loadingModal.show();

    try {
        // Load form options FIRST
        console.log('📋 Opening modal for', entityType);
        await loadFormOptions(entityType);

        // THEN generate form fields with loaded options
        formFields.innerHTML = generateFormFields(entityType);

        // Setup search fields
        setupFormSearchListeners();

        // Setup transaction-specific listeners
        if (entityType === 'chain_transactions') {
            setupTransactionFormListeners();
        }

        // If editing, prefill from currentData without fetching
        if (isEditing && id) {
            prefillFormFromCurrentData(entityType, id);
        }

        // Hide loading modal and show entity modal
        loadingModal.hide();
        modal.show();
    } catch (error) {
        console.error('Error opening modal:', error);
        loadingModal.hide();
        showToast('Error loading form', 'error');
    }
}

function addChip(fieldName, value) {
    const chipsDisplay = document.getElementById(`${fieldName}_chips`);
    const hiddenInput = document.getElementById(fieldName);
    
    if (!chipsDisplay) return;
    
    // Create chip element
    const chip = document.createElement('span');
    chip.className = 'badge bg-primary me-2 mb-2';
    chip.setAttribute('data-value', value);
    chip.innerHTML = `
        ${value}
        <button type="button" class="btn-close btn-close-white ms-1" onclick="removeChip('${fieldName}', '${value}')"></button>
    `;
    chipsDisplay.appendChild(chip);
    updateHiddenInput(fieldName);
}

function prefillFormFromCurrentData(entityType, id) {
    const data = currentData.find(item => item.id === id);
    if (data) {
        populateFormFields(entityType, data);
    }
}

async function loadFormOptions(entityType) {
    try {
        console.log('🔄 Loading form options...');
        
        const [actorsResponse, seasonsResponse, batchesResponse, millingsResponse, dryingResponse] = await Promise.all([
            fetchData('/chain-actors'),
            fetchData('/production-seasons'),
            fetchData('/rice-batches'),
            fetchData('/milled-rice'),
            fetchData('/drying-data')
        ]);

        console.log('✅ Actors loaded:', actorsResponse.data?.length || 0);
        console.log('✅ Seasons loaded:', seasonsResponse.data?.length || 0);
        console.log('✅ Batches loaded:', batchesResponse.data?.length || 0);
        console.log('✅ Millings loaded:', millingsResponse.data?.length || 0);
        console.log('✅ Dryings loaded:', dryingResponse.data?.length || 0);
        
        // Debug: Log first actor and season to see structure
        if (actorsResponse.data && actorsResponse.data.length > 0) {
            console.log('📊 Sample actor:', actorsResponse.data[0]);
        }
        if (seasonsResponse.data && seasonsResponse.data.length > 0) {
            console.log('📊 Sample season:', seasonsResponse.data[0]);
        }

        // Store options globally for form generation
        transactionFormOptions = {
            actors: actorsResponse.data?.map(actor => ({ value: actor.id, label: actor.name })) || [],
            farmers: actorsResponse.data?.filter(actor => {
                const types = actor.type ? actor.type.split(',').map(t => t.trim().toLowerCase()) : [];
                return types.includes('farmer');
            }).map(actor => ({ value: actor.id, label: actor.name })) || [],
            millers: actorsResponse.data?.filter(actor => {
                const types = actor.type ? actor.type.split(',').map(t => t.trim().toLowerCase()) : [];
                return types.includes('miller');
            }).map(actor => ({ value: actor.id, label: actor.name })) || [],
            validators: actorsResponse.data?.filter(actor => {
                const types = actor.type ? actor.type.split(',').map(t => t.trim().toLowerCase()) : [];
                return types.includes('validator');
            }).map(actor => ({ value: actor.id, label: actor.name })) || [],
            seasons: seasonsResponse.data?.map(season => ({ value: season.id, label: season.season_name || season.crop_year || `Season ${season.id}` })) || [],
            batches: batchesResponse.data?.map(batch => ({ value: batch.id, label: `${batch.batch_id || batch.batch_number || batch.id}` })) || [],
            millings: millingsResponse.data?.map(milling => ({ value: milling.id, label: `Milling ${milling.id}${milling.milling_type ? ` - ${milling.milling_type}` : ''}` })) || [],
            dryings: dryingResponse.data?.map(drying => ({ value: drying.id, label: `Drying ${drying.id}${drying.drying_method ? ` - ${drying.drying_method}` : ''}` })) || []
        };

        console.log('✅ Form options loaded successfully:', transactionFormOptions);

    } catch (error) {
        console.error('❌ Error loading form options:', error);
        showToast('Error loading form data', 'error');
    }
}

async function loadEntityData(entityType, id) {
    try {
        const endpoint = getEntityEndpoint(entityType);
        const response = await fetchData(`${endpoint}/${id}`);

        if (response.success && response.data) {
            const data = response.data;
            populateFormFields(entityType, data);
        }
    } catch (error) {
        console.error('Error loading entity data:', error);
    }
}

function populateFormFields(entityType, data) {
    const fields = getEntityFields(entityType);
    console.log('📝 Populating form for', entityType, 'with data:', data);

    fields.forEach(field => {
        // Skip file input fields - they cannot be set programmatically
        if (field.type === 'file') {
            return;
        }
        
        const input = document.getElementById(field.name);
        if (!input) {
            console.log(`⚠️ Input not found for field: ${field.name}`);
            return;
        }

        let value = data[field.name];

        // Handle nested JSON objects for rice batches
        if (entityType === 'rice_batches') {
            if (field.name === 'milling_id') {
                if (data.milling && typeof data.milling === 'object') {
                    value = data.milling.id;
                } else {
                    value = data.milling_id;
                }
            } else if (field.name === 'drying_id') {
                if (data.drying && typeof data.drying === 'object') {
                    value = data.drying.id;
                } else {
                    value = data.drying_id;
                }
            } else if (field.name === 'current_holder_id') {
                if (data.current_holder && typeof data.current_holder === 'object') {
                    value = data.current_holder.id;
                } else {
                    value = data.current_holder_id;
                }
            } else if (field.name === 'season_id') {
                if (data.season && typeof data.season === 'object') {
                    value = data.season.id;
                } else {
                    value = data.season_id;
                }
            } else if (field.name === 'validator_id') {
                // Handle validator as direct number or nested object
                if (typeof data.validator === 'number') {
                    value = data.validator;
                } else if (data.validator && typeof data.validator === 'object') {
                    value = data.validator.id;
                } else {
                    value = data.validator_id;
                }
            } else if (field.name === 'farmer_id') {
                if (data.season && typeof data.season === 'object' && data.season.farmer_id) {
                    value = data.season.farmer_id;
                } else {
                    value = data.farmer_id;
                }
            } else if (field.name === 'weight') {
                // Handle weight field - may come from batch_weight_kg in API response
                value = data.weight || data.batch_weight_kg;
            }
        }

        // Handle nested JSON objects for milled rice
        if (entityType === 'milled_rice') {
            if (field.name === 'batch_id') {
                value = data.batch_id;
            } else if (field.name === 'user_id') {
                value = data.user_id;
            } else if (field.name === 'total_weight_kg') {
                value = data.total_weight_kg;
            } else if (field.name === 'machine_type') {
                value = data.milling_type || data.machine_type;
            } else if (field.name === 'quality_grade') {
                value = data.quality || data.quality_grade;
            } else if (field.name === 'moisture_content') {
                value = data.moisture || data.moisture_content;
            } else if (field.name === 'output') {
                value = data.total_weight_processed_kg || data.output;
            } else if (field.name === 'actual_price') {
                value = data.actual_price;
            } else if (field.name === 'recovery') {
                value = data.recovery;
            } else if (field.name === 'comment') {
                value = data.comment;
            } else if (field.name === 'geotagging') {
                value = data.geotagging;
            }
        }

        console.log(`✏️ Setting ${field.name} = ${value}`);

        if (field.type === 'checkbox') {
            input.checked = value === true || value === 1 || value === 'true';
        } else if (field.type === 'chips' || field.type === 'multiselect') {
            // Handle array fields
            if (typeof value === 'string') {
                value = value.split(',').map(v => v.trim());
            }
            if (Array.isArray(value)) {
                input.value = JSON.stringify(value);
                if (field.type === 'chips') {
                    renderChips(field.name, value);
                }
            }
        } else {
            input.value = value || '';
        }
    });
}

function renderChips(fieldName, values) {
    const container = document.getElementById(`${fieldName}_chips`);
    if (!container) return;

    container.innerHTML = values.map(value => `
        <span class="badge bg-primary me-2 mb-2" data-value="${value}">
            ${value}
            <button type="button" class="btn-close btn-close-white ms-1" onclick="removeChip('${fieldName}', '${value}')"></button>
        </span>
    `).join('');
}

function removeChip(fieldName, value) {
    const input = document.getElementById(fieldName);
    let values = JSON.parse(input.value || '[]');
    values = values.filter(v => v !== value);
    input.value = JSON.stringify(values);
    renderChips(fieldName, values);
}