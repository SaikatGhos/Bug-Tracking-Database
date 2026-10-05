/**
 * BugTracker Lite - Main Application Script
 */

// Application State
// const state = {
//   // 1. PASTE YOUR GOOGLE APPS SCRIPT WEB APP URL HERE:
//   scriptUrl: 'https://script.google.com/macros/s/AKfycby7Q5d4U91soKThRlAkiIZ_lhVmaC7bt3NS1CtEClueUBhNQEUeYiE8RGK_8FntysJVkA/exec',
//   isMock: false,
//   bugs: [],
//   nameOptions: ['Alice Smith', 'Bob Jones', 'Charlie Brown', 'Dev Team', 'QA Team']
// };

/**
 * BugTracker Lite - Main Application Script
 */

// Application State
const state = {
  // 1. PASTE YOUR GOOGLE APPS SCRIPT WEB APP URL HERE:
  scriptUrl: 'https://script.google.com/macros/s/AKfycby7Q5d4U91soKThRlAkiIZ_lhVmaC7bt3NS1CtEClueUBhNQEUeYiE8RGK_8FntysJVkA/exec',
  isMock: false,
  bugs: [],
  nameOptions: ['Alice Smith', 'Bob Jones', 'Charlie Brown', 'Dev Team', 'QA Team'],
  
  // Pagination State
  currentPage: 1,
  pageSize: 5,
  
  // Active Record to Delete
  bugToDelete: null
};

// Fallback Mock Data
const MOCK_BUGS = [
  {
    ID: 'BUG-1001',
    Name: 'Alice Smith',
    'Sub ID': 'SUB-A1',
    Tag: 'UI',
    Description: 'Header overlapping on small screen sizes',
    CreatedAt: '2026-10-01T10:00:00.000Z'
  },
  {
    ID: 'BUG-1002',
    Name: 'Bob Jones',
    'Sub ID': 'SUB-B2',
    Tag: 'Database',
    Description: 'Connection timeout when loading dropdown items',
    CreatedAt: '2026-10-02T11:30:00.000Z'
  }
];

// DOM Elements
let searchId, searchName, searchSubId, searchTag, resetFiltersBtn, refreshDataBtn, resultsCount, bugTableBody;
let openAddModalBtn, closeAddModalBtn, cancelModalBtn, clearFormBtn, addModal, addBugForm, bugNameSelect, submitBugBtn;
let deleteModal, closeDeleteModalBtn, cancelDeleteBtn, confirmDeleteBtn;
let pageSizeSelect, prevPageBtn, nextPageBtn, pageIndicator;
let connectionPill, connectionStatusText;

// Initialize on DOM Load
document.addEventListener('DOMContentLoaded', () => {
  bindElements();
  attachEventListeners();
  loadData();
});

// Bind DOM Elements
function bindElements() {
  connectionPill = document.getElementById('connectionPill');
  connectionStatusText = document.getElementById('connectionStatusText');

  searchId = document.getElementById('searchId');
  searchName = document.getElementById('searchName');
  searchSubId = document.getElementById('searchSubId');
  searchTag = document.getElementById('searchTag');
  resetFiltersBtn = document.getElementById('resetFiltersBtn');
  refreshDataBtn = document.getElementById('refreshDataBtn');
  resultsCount = document.getElementById('resultsCount');
  bugTableBody = document.getElementById('bugTableBody');

  // Add Modal Elements
  openAddModalBtn = document.getElementById('openAddModalBtn');
  closeAddModalBtn = document.getElementById('closeAddModalBtn');
  cancelModalBtn = document.getElementById('cancelModalBtn');
  clearFormBtn = document.getElementById('clearFormBtn');
  addModal = document.getElementById('addModal');
  addBugForm = document.getElementById('addBugForm');
  bugNameSelect = document.getElementById('bugName');
  submitBugBtn = document.getElementById('submitBugBtn');

  // Delete Modal Elements
  deleteModal = document.getElementById('deleteModal');
  closeDeleteModalBtn = document.getElementById('closeDeleteModalBtn');
  cancelDeleteBtn = document.getElementById('cancelDeleteBtn');
  confirmDeleteBtn = document.getElementById('confirmDeleteBtn');

  // Pagination Elements
  pageSizeSelect = document.getElementById('pageSizeSelect');
  prevPageBtn = document.getElementById('prevPageBtn');
  nextPageBtn = document.getElementById('nextPageBtn');
  pageIndicator = document.getElementById('pageIndicator');
}

// Attach Event Listeners
function attachEventListeners() {
  // Add Modal listeners
  if (openAddModalBtn) {
    openAddModalBtn.addEventListener('click', () => {
      populateNameDropdowns(state.nameOptions);
      addModal.classList.remove('hidden');
    });
  }
  if (closeAddModalBtn) closeAddModalBtn.addEventListener('click', () => addModal.classList.add('hidden'));
  if (cancelModalBtn) cancelModalBtn.addEventListener('click', () => addModal.classList.add('hidden'));
  if (clearFormBtn) clearFormBtn.addEventListener('click', () => addBugForm && addBugForm.reset());

  // Delete Modal listeners
  if (closeDeleteModalBtn) closeDeleteModalBtn.addEventListener('click', closeDeleteModal);
  if (cancelDeleteBtn) cancelDeleteBtn.addEventListener('click', closeDeleteModal);
  if (confirmDeleteBtn) confirmDeleteBtn.addEventListener('click', handleConfirmDelete);

  // Filter & Refresh listeners
  if (searchId) searchId.addEventListener('input', () => { state.currentPage = 1; renderTable(); });
  if (searchName) searchName.addEventListener('change', () => { state.currentPage = 1; renderTable(); });
  if (searchSubId) searchSubId.addEventListener('input', () => { state.currentPage = 1; renderTable(); });
  if (searchTag) searchTag.addEventListener('input', () => { state.currentPage = 1; renderTable(); });
  if (resetFiltersBtn) resetFiltersBtn.addEventListener('click', resetFilters);
  if (refreshDataBtn) refreshDataBtn.addEventListener('click', loadData);

  // Pagination listeners
  if (pageSizeSelect) {
    pageSizeSelect.addEventListener('change', (e) => {
      state.pageSize = parseInt(e.target.value, 10);
      state.currentPage = 1;
      renderTable();
    });
  }
  if (prevPageBtn) {
    prevPageBtn.addEventListener('click', () => {
      if (state.currentPage > 1) {
        state.currentPage--;
        renderTable();
      }
    });
  }
  if (nextPageBtn) {
    nextPageBtn.addEventListener('click', () => {
      const totalPages = Math.ceil(getFilteredBugs().length / state.pageSize) || 1;
      if (state.currentPage < totalPages) {
        state.currentPage++;
        renderTable();
      }
    });
  }

  // Form submit listener
  if (addBugForm) addBugForm.addEventListener('submit', handleAddBugSubmit);
}

// Load Data
async function loadData() {
  if (!state.scriptUrl || state.scriptUrl === 'YOUR_GOOGLE_APPS_SCRIPT_URL_HERE') {
    state.isMock = true;
    state.bugs = [...MOCK_BUGS];
    populateNameDropdowns(state.nameOptions);
    renderTable();
    updateConnectionUI(false, 'Mock Mode');
    return;
  }

  try {
    if (refreshDataBtn) {
      refreshDataBtn.disabled = true;
      refreshDataBtn.textContent = 'Refreshing...';
    }

    bugTableBody.innerHTML = `<tr><td colspan="7" class="text-center">Loading bugs from Google Sheet...</td></tr>`;

    const response = await fetch(state.scriptUrl);
    if (!response.ok) throw new Error(`HTTP Error ${response.status}`);

    const data = await response.json();

    if (data.bugs) {
      state.bugs = data.bugs;
      if (data.nameOptions && data.nameOptions.length > 0) state.nameOptions = data.nameOptions;
    } else if (Array.isArray(data)) {
      state.bugs = data;
    }

    populateNameDropdowns(state.nameOptions);
    renderTable();
    updateConnectionUI(true, 'Google Sheets Connected');

  } catch (err) {
    console.error('Fetch error:', err);
    bugTableBody.innerHTML = `<tr><td colspan="7" class="text-center" style="color: #dc2626;">Failed to fetch from Google Sheet.<br><small>${err.message}</small></td></tr>`;
    updateConnectionUI(false, 'Connection Error');
  } finally {
    if (refreshDataBtn) {
      refreshDataBtn.disabled = false;
      refreshDataBtn.textContent = '↻ Refresh Data';
    }
  }
}

// Populate Name Dropdowns
function populateNameDropdowns(options) {
  if (bugNameSelect) {
    bugNameSelect.innerHTML = '<option value="">-- Select Name --</option>';
    options.forEach(opt => {
      const el = document.createElement('option');
      el.value = opt;
      el.textContent = opt;
      bugNameSelect.appendChild(el);
    });
  }

  if (searchName) {
    const currentVal = searchName.value;
    searchName.innerHTML = '<option value="">-- All Names --</option>';
    options.forEach(opt => {
      const el = document.createElement('option');
      el.value = opt;
      el.textContent = opt;
      searchName.appendChild(el);
    });
    searchName.value = currentVal;
  }
}

// Filter Logic
function getFilteredBugs() {
  const filterId = (searchId ? searchId.value : '').trim().toLowerCase();
  const filterName = (searchName ? searchName.value : '').trim().toLowerCase();
  const filterSubId = (searchSubId ? searchSubId.value : '').trim().toLowerCase();
  const filterTag = (searchTag ? searchTag.value : '').trim().toLowerCase();

  return state.bugs.filter(bug => {
    const bId = (bug.ID || bug.id || '').toString().toLowerCase();
    const bName = (bug.Name || bug.name || '').toString().toLowerCase();
    const bSubId = (bug['Sub ID'] || bug.subId || '').toString().toLowerCase();
    const bTag = (bug.Tag || bug.tag || '').toString().toLowerCase();

    if (filterId && !bId.includes(filterId)) return false;
    if (filterName && bName !== filterName) return false;
    if (filterSubId && !bSubId.includes(filterSubId)) return false;
    if (filterTag && !bTag.includes(filterTag)) return false;

    return true;
  });
}

// Render Table Rows with Pagination
function renderTable() {
  const filteredBugs = getFilteredBugs();
  const totalRecords = filteredBugs.length;
  if (resultsCount) resultsCount.textContent = `Showing ${totalRecords} of ${state.bugs.length} records`;

  if (!bugTableBody) return;

  if (totalRecords === 0) {
    bugTableBody.innerHTML = `<tr><td colspan="7" class="text-center">No matching records found.</td></tr>`;
    updatePaginationUI(0, 1);
    return;
  }

  // Calculate Pagination Slices
  const totalPages = Math.ceil(totalRecords / state.pageSize) || 1;
  if (state.currentPage > totalPages) state.currentPage = totalPages;

  const startIndex = (state.currentPage - 1) * state.pageSize;
  const paginatedBugs = filteredBugs.slice(startIndex, startIndex + state.pageSize);

  bugTableBody.innerHTML = paginatedBugs.map(bug => {
    const id = bug.ID || bug.id || '-';
    const name = bug.Name || bug.name || '-';
    const subId = bug['Sub ID'] || bug.subId || '-';
    const tag = bug.Tag || bug.tag || '';
    const desc = bug.Description || bug.description || '-';
    const created = bug.CreatedAt || bug.createdat || '-';
    const formattedDate = created !== '-' ? new Date(created).toLocaleDateString() : '-';

    return `
      <tr>
        <td><span class="id-badge">${id}</span></td>
        <td><strong>${name}</strong></td>
        <td>${subId}</td>
        <td>${tag ? `<span class="tag-badge">${tag}</span>` : '-'}</td>
        <td>${desc}</td>
        <td><small>${formattedDate}</small></td>
        <td class="text-center">
          <button class="btn-icon-danger" onclick="openDeleteModal('${id}')">🗑 Delete</button>
        </td>
      </tr>
    `;
  }).join('');

  updatePaginationUI(totalRecords, totalPages);
}

// Update Pagination Controls UI
function updatePaginationUI(totalRecords, totalPages) {
  if (pageIndicator) pageIndicator.textContent = `Page ${state.currentPage} of ${totalPages}`;
  if (prevPageBtn) prevPageBtn.disabled = state.currentPage <= 1;
  if (nextPageBtn) nextPageBtn.disabled = state.currentPage >= totalPages;
}

// Open Delete Confirmation Modal
window.openDeleteModal = function(id) {
  const targetBug = state.bugs.find(b => (b.ID || b.id || '').toString() === id.toString());
  if (!targetBug) return;

  state.bugToDelete = targetBug;

  document.getElementById('delBugId').textContent = targetBug.ID || targetBug.id || '-';
  document.getElementById('delBugName').textContent = targetBug.Name || targetBug.name || '-';
  document.getElementById('delBugSubId').textContent = targetBug['Sub ID'] || targetBug.subId || '-';
  document.getElementById('delBugTag').textContent = targetBug.Tag || targetBug.tag || '-';
  document.getElementById('delBugDesc').textContent = targetBug.Description || targetBug.description || '-';

  deleteModal.classList.remove('hidden');
};

function closeDeleteModal() {
  state.bugToDelete = null;
  deleteModal.classList.add('hidden');
}

// Handle Delete Execution
async function handleConfirmDelete() {
  if (!state.bugToDelete) return;

  const targetId = state.bugToDelete.ID || state.bugToDelete.id;

  try {
    confirmDeleteBtn.disabled = true;
    confirmDeleteBtn.textContent = 'Deleting...';

    if (state.isMock || !state.scriptUrl) {
      state.bugs = state.bugs.filter(b => (b.ID || b.id) !== targetId);
      alert('Bug deleted in Mock Mode!');
    } else {
      await fetch(state.scriptUrl, {
        method: 'POST',
        mode: 'no-cors',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({ action: 'delete', id: targetId })
      });

      await loadData();
    }

    closeDeleteModal();

  } catch (err) {
    alert('Failed to delete bug: ' + err.message);
  } finally {
    confirmDeleteBtn.disabled = false;
    confirmDeleteBtn.textContent = 'Delete Record';
  }
}

// Reset Filters
function resetFilters() {
  if (searchId) searchId.value = '';
  if (searchName) searchName.value = '';
  if (searchSubId) searchSubId.value = '';
  if (searchTag) searchTag.value = '';
  state.currentPage = 1;
  renderTable();
}

// Submit Add Bug Form
async function handleAddBugSubmit(e) {
  e.preventDefault();

  const idVal = document.getElementById('bugId').value.trim() || ('BUG-' + Date.now().toString().slice(-4));
  const nameVal = bugNameSelect.value;
  const subIdVal = document.getElementById('bugSubId').value.trim();
  const tagVal = document.getElementById('bugTag').value.trim();
  const descVal = document.getElementById('bugDescription').value.trim();

  const newBug = {
    id: idVal,
    name: nameVal,
    subId: subIdVal,
    tag: tagVal,
    description: descVal
  };

  try {
    submitBugBtn.disabled = true;
    submitBugBtn.textContent = 'Saving...';

    if (state.isMock || !state.scriptUrl) {
      state.bugs.unshift({
        ID: newBug.id,
        Name: newBug.name,
        'Sub ID': newBug.subId,
        Tag: newBug.tag,
        Description: newBug.description,
        CreatedAt: new Date().toISOString()
      });
      alert('Bug added in Mock Mode!');
    } else {
      await fetch(state.scriptUrl, {
        method: 'POST',
        mode: 'no-cors',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify(newBug)
      });

      await loadData();
    }

    addBugForm.reset();
    addModal.classList.add('hidden');
    renderTable();

  } catch (err) {
    alert('Failed to save bug: ' + err.message);
  } finally {
    submitBugBtn.disabled = false;
    submitBugBtn.textContent = 'Submit Bug';
  }
}

// Update Connection UI
function updateConnectionUI(isConnected, text) {
  if (connectionStatusText) connectionStatusText.textContent = text;
  if (connectionPill) {
    if (isConnected) {
      connectionPill.classList.add('connected');
    } else {
      connectionPill.classList.remove('connected');
    }
  }
}