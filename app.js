import { supabase } from './supabaseClient.js'

// DOM Elements
const authContainer = document.getElementById('auth-container')
const appContainer = document.getElementById('app-container')
const authForm = document.getElementById('auth-form')
const authEmail = document.getElementById('auth-email')
const authPassword = document.getElementById('auth-password')
const authSubmitBtn = document.getElementById('auth-submit-btn')
const authTitle = document.getElementById('auth-title')
const authSubtitle = document.getElementById('auth-subtitle')
const toggleAuth = document.getElementById('toggle-auth')
const toggleText = document.getElementById('toggle-text')

const pageTitle = document.getElementById('page-title')
const userEmailDisplay = document.getElementById('user-email-display')
const contentArea = document.getElementById('content-area')
const logoutBtn = document.getElementById('logout-btn')

const modalOverlay = document.getElementById('modal-overlay')
const modalTitle = document.getElementById('modal-title')
const modalBody = document.getElementById('modal-body')
const modalCancelBtn = document.getElementById('modal-cancel-btn')
const modalSaveBtn = document.getElementById('modal-save-btn')

let isSignUp = false
let onModalSaveCallback = null
let financialChart = null
let currentDashboardFilter = 'all'
let invoiceSearchTerm = ''
let invoiceStatusFilter = 'all'

// --- TOAST NOTIFICATION UTILITY ---
function showToast(message, type = 'success') {
  const container = document.getElementById('toast-container')
  if (!container) return

  const toast = document.createElement('div')
  const bgColor = type === 'success' ? '#4ecca3' : type === 'error' ? '#e94560' : '#f39c12'
  
  toast.style.cssText = `
    background-color: ${bgColor};
    color: #fff;
    padding: 12px 20px;
    border-radius: 6px;
    font-size: 14px;
    font-weight: bold;
    box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    opacity: 0;
    transform: translateY(20px);
    transition: all 0.3s ease;
  `
  toast.innerText = message
  container.appendChild(toast)

  setTimeout(() => {
    toast.style.opacity = '1'
    toast.style.transform = 'translateY(0)'
  }, 10)

  setTimeout(() => {
    toast.style.opacity = '0'
    toast.style.transform = 'translateY(20px)'
    setTimeout(() => toast.remove(), 300)
  }, 3500)
}

// --- AUTHENTICATION MODULE ---
toggleAuth.addEventListener('click', (e) => {
  e.preventDefault()
  isSignUp = !isSignUp
  authTitle.innerText = isSignUp ? 'Create Account' : 'InvoicePulse'
  authSubtitle.innerText = isSignUp ? 'Sign up to start tracking' : 'Sign in to manage your business'
  authSubmitBtn.innerText = isSignUp ? 'Sign Up' : 'Sign In'
  toggleText.innerText = isSignUp ? 'Already have an account?' : "Don't have an account?"
  toggleAuth.innerText = isSignUp ? 'Sign In' : 'Sign Up'
})

authForm.addEventListener('submit', async (e) => {
  e.preventDefault()
  const email = authEmail.value
  const password = authPassword.value

  authSubmitBtn.disabled = true
  authSubmitBtn.innerText = 'Processing...'

  if (isSignUp) {
    const { error } = await supabase.auth.signUp({ email, password })
    if (error) showToast('Sign Up Error: ' + error.message, 'error')
    else showToast('Account created successfully! Please sign in.', 'success')
  } else {
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) showToast('Sign In Error: ' + error.message, 'error')
  }

  authSubmitBtn.disabled = false
  authSubmitBtn.innerText = isSignUp ? 'Sign Up' : 'Sign In'
})

logoutBtn.addEventListener('click', async () => {
  await supabase.auth.signOut()
})

supabase.auth.onAuthStateChange((event, session) => {
  if (session) {
    authContainer.style.display = 'none'
    appContainer.style.display = 'flex'
    userEmailDisplay.innerText = `Welcome, ${session.user.email}`
    renderDashboard()
  } else {
    authContainer.style.display = 'flex'
    appContainer.style.display = 'none'
  }
})

// --- NAVIGATION ---
document.getElementById('nav-dashboard').addEventListener('click', (e) => { setNavActive(e); renderDashboard() })
document.getElementById('nav-clients').addEventListener('click', (e) => { setNavActive(e); renderClients() })
document.getElementById('nav-invoices').addEventListener('click', (e) => { setNavActive(e); renderInvoices() })
document.getElementById('nav-expenses').addEventListener('click', (e) => { setNavActive(e); renderExpenses() })

function setNavActive(e) {
  document.querySelectorAll('.nav-btn').forEach(btn => btn.classList.remove('active'))
  e.target.classList.add('active')
}

// --- MODAL UTILITY ---
function openModal(title, bodyHtml, onSave) {
  modalTitle.innerText = title
  modalBody.innerHTML = bodyHtml
  onModalSaveCallback = onSave
  modalOverlay.style.display = 'flex'
}

modalCancelBtn.addEventListener('click', closeModal)
modalSaveBtn.addEventListener('click', async () => {
  if (onModalSaveCallback) await onModalSaveCallback()
  closeModal()
})

function closeModal() {
  modalOverlay.style.display = 'none'
  modalBody.innerHTML = ''
  onModalSaveCallback = null
}

// --- DASHBOARD MODULE ---
async function renderDashboard() {
  pageTitle.innerText = 'Dashboard'
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return

  const { data: clients } = await supabase.from('clients').select('id').eq('user_id', user.id)
  const { data: invoices } = await supabase.from('invoices').select('amount, status, created_at, due_date, clients(name, client_name)').eq('user_id', user.id)
  const { data: expenses } = await supabase.from('expenses').select('category, amount, created_at').eq('user_id', user.id)

  const now = new Date()
  const currentYear = now.getFullYear()
  const currentMonth = now.getMonth()

  const filterByDate = (items) => {
    if (!items) return []
    if (currentDashboardFilter === 'all') return items

    return items.filter(item => {
      const itemDate = new Date(item.created_at)
      if (currentDashboardFilter === 'this_month') {
        return itemDate.getFullYear() === currentYear && itemDate.getMonth() === currentMonth
      }
      if (currentDashboardFilter === 'last_month') {
        const lastMonth = currentMonth === 0 ? 11 : currentMonth - 1
        const lastMonthYear = currentMonth === 0 ? currentYear - 1 : currentYear
        return itemDate.getFullYear() === lastMonthYear && itemDate.getMonth() === lastMonth
      }
      return true
    })
  }

  const filteredInvoices = filterByDate(invoices)
  const filteredExpenses = filterByDate(expenses)

  const totalClients = clients ? clients.length : 0
  const totalPaid = filteredInvoices.filter(i => i.status === 'Paid').reduce((sum, i) => sum + Number(i.amount), 0)
  const pendingRevenue = filteredInvoices.filter(i => i.status === 'Pending').reduce((sum, i) => sum + Number(i.amount), 0)
  const totalExpenses = filteredExpenses.reduce((sum, e) => sum + Number(e.amount), 0)
  const netProfit = totalPaid - totalExpenses

  contentArea.innerHTML = `
    <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 10px; margin-bottom: 20px;">
      <h3 style="color: #1a1a2e; margin: 0;">Financial Performance</h3>
      <div style="display: flex; align-items: center; gap: 10px; flex-wrap: wrap;">
        <button id="export-csv-btn" style="background-color: #107c41; color: white; padding: 8px 14px; border: none; border-radius: 6px; cursor: pointer; font-weight: bold; font-size: 14px;">
          📊 Export Report (CSV)
        </button>
        <label for="dashboard-date-filter" style="font-weight: bold; font-size: 14px; color: #555;">Time Period:</label>
        <select id="dashboard-date-filter" style="padding: 8px 12px; border-radius: 6px; border: 1px solid #ccc; font-size: 14px; background: #fff; cursor: pointer;">
          <option value="all" ${currentDashboardFilter === 'all' ? 'selected' : ''}>All Time</option>
          <option value="this_month" ${currentDashboardFilter === 'this_month' ? 'selected' : ''}>This Month</option>
          <option value="last_month" ${currentDashboardFilter === 'last_month' ? 'selected' : ''}>Last Month</option>
        </select>
      </div>
    </div>

    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px;">
      <div class="card">
        <h4>Total Clients</h4>
        <p style="font-size: 26px; font-weight: bold; color: #1a1a2e; margin-top: 10px;">${totalClients}</p>
      </div>
      <div class="card">
        <h4>Paid Revenue</h4>
        <p style="font-size: 26px; font-weight: bold; color: #4ecca3; margin-top: 10px;">$${totalPaid.toFixed(2)}</p>
      </div>
      <div class="card">
        <h4>Pending Invoices</h4>
        <p style="font-size: 26px; font-weight: bold; color: #f39c12; margin-top: 10px;">$${pendingRevenue.toFixed(2)}</p>
      </div>
      <div class="card">
        <h4>Total Expenses</h4>
        <p style="font-size: 26px; font-weight: bold; color: #e94560; margin-top: 10px;">$${totalExpenses.toFixed(2)}</p>
      </div>
    </div>

    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 20px; margin-top: 20px;">
      <div class="card">
        <h3>Net Profit Overview</h3>
        <p style="font-size: 32px; font-weight: bold; color: ${netProfit >= 0 ? '#4ecca3' : '#e94560'}; margin-top: 10px;">
          $${netProfit.toFixed(2)}
        </p>
        <span style="color: #777; font-size: 14px;">(Paid Revenue minus Total Expenses)</span>
      </div>

      <div class="card">
        <h3>Financial Breakdown</h3>
        <div style="position: relative; height: 200px; width: 100%; margin-top: 10px;">
          <canvas id="financialChartCanvas" style="max-height: 200px; width: 100%;"></canvas>
        </div>
      </div>
    </div>
  `

  document.getElementById('dashboard-date-filter').addEventListener('change', (e) => {
    currentDashboardFilter = e.target.value
    renderDashboard()
  })

  document.getElementById('export-csv-btn').addEventListener('click', () => {
    exportFinancialCSV(filteredInvoices, filteredExpenses, totalPaid, pendingRevenue, totalExpenses, netProfit)
    showToast('Report downloaded successfully!', 'success')
  })

  setTimeout(() => {
    const canvas = document.getElementById('financialChartCanvas')
    if (!canvas) return

    if (financialChart) {
      financialChart.destroy()
    }

    const ChartObj = window.Chart || Chart
    if (!ChartObj) return

    financialChart = new ChartObj(canvas, {
      type: 'bar',
      data: {
        labels: ['Paid', 'Pending', 'Expenses'],
        datasets: [{
          label: 'Amount ($)',
          data: [totalPaid, pendingRevenue, totalExpenses],
          backgroundColor: ['#4ecca3', '#f39c12', '#e94560'],
          borderRadius: 4
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false }
        },
        scales: {
          y: {
            beginAtZero: true,
            ticks: {
              callback: function(value) { return '$' + value }
            }
          }
        }
      }
    })
  }, 100)
}

function exportFinancialCSV(invoices, expenses, totalPaid, pendingRevenue, totalExpenses, netProfit) {
  let csvContent = "data:text/csv;charset=utf-8,"

  csvContent += "FINANCIAL SUMMARY REPORT\n"
  csvContent += `Time Period,${currentDashboardFilter.replace('_', ' ').toUpperCase()}\n`
  csvContent += `Paid Revenue,$${totalPaid.toFixed(2)}\n`
  csvContent += `Pending Revenue,$${pendingRevenue.toFixed(2)}\n`
  csvContent += `Total Expenses,$${totalExpenses.toFixed(2)}\n`
  csvContent += `Net Profit,$${netProfit.toFixed(2)}\n\n`

  csvContent += "INVOICES BREAKDOWN\n"
  csvContent += "Client,Amount,Status,Created Date,Due Date\n"
  if (invoices && invoices.length > 0) {
    invoices.forEach(inv => {
      const clientName = inv.clients ? (inv.clients.name || inv.clients.client_name || 'Unknown') : 'Unknown'
      const created = inv.created_at ? new Date(inv.created_at).toLocaleDateString() : ''
      const due = inv.due_date || 'N/A'
      csvContent += `"${clientName}",${inv.amount},${inv.status},"${created}","${due}"\n`
    })
  } else {
    csvContent += "No invoices found,,,\n"
  }

  csvContent += "\nEXPENSES BREAKDOWN\n"
  csvContent += "Category,Amount,Created Date\n"
  if (expenses && expenses.length > 0) {
    expenses.forEach(exp => {
      const created = exp.created_at ? new Date(exp.created_at).toLocaleDateString() : ''
      csvContent += `"${exp.category}",${exp.amount},"${created}"\n`
    })
  } else {
    csvContent += "No expenses found,,\n"
  }

  const encodedUri = encodeURI(csvContent)
  const link = document.createElement("a")
  link.setAttribute("href", encodedUri)
  link.setAttribute("download", `InvoicePulse_Financial_Report_${new Date().toISOString().split('T')[0]}.csv`)
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
}

// --- CLIENTS MODULE ---
async function renderClients() {
  pageTitle.innerText = 'Clients'
  const { data: { user } } = await supabase.auth.getUser()

  contentArea.innerHTML = `
    <div class="card" style="margin-bottom: 20px;">
      <h3>Add New Client</h3>
      <div class="form-inline" style="margin-top: 15px;">
        <input type="text" id="client-name" placeholder="Client Name">
        <input type="email" id="client-email" placeholder="Client Email">
        <input type="text" id="client-address" placeholder="Address">
        <button id="add-client-btn">Add Client</button>
      </div>
    </div>

    <div class="card">
      <h3>Client Directory</h3>
      <div class="table-container" style="margin-top: 15px;">
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Email</th>
              <th>Address</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody id="clients-table-body">
            <tr><td colspan="4">Loading clients...</td></tr>
          </tbody>
        </table>
      </div>
    </div>
  `

  document.getElementById('add-client-btn').addEventListener('click', async () => {
    const nameInput = document.getElementById('client-name')
    const emailInput = document.getElementById('client-email')
    const addressInput = document.getElementById('client-address')

    const name = nameInput.value.trim()
    const email = emailInput.value.trim()
    const address = addressInput.value.trim()

    if (!name || !email) return showToast('Please enter both name and email.', 'warning')

    let { error } = await supabase.from('clients').insert([
      { name, email, address, user_id: user.id }
    ])

    if (error && error.message.includes('column')) {
      const fallback = await supabase.from('clients').insert([
        { client_name: name, email, address, user_id: user.id }
      ])
      error = fallback.error
    }

    if (error) {
      showToast('Error adding client: ' + error.message, 'error')
    } else {
      showToast('Client added successfully!', 'success')
      nameInput.value = ''
      emailInput.value = ''
      addressInput.value = ''
      renderClients()
    }
  })

  const { data: clients, error } = await supabase.from('clients').select('*').eq('user_id', user.id).order('created_at', { ascending: false })
  const tbody = document.getElementById('clients-table-body')

  if (error) {
    tbody.innerHTML = `<tr><td colspan="4" style="color: red;">Error fetching clients: ${error.message}</td></tr>`
    return
  }

  if (!clients || clients.length === 0) {
    tbody.innerHTML = '<tr><td colspan="4">No clients found. Add one above!</td></tr>'
    return
  }

  tbody.innerHTML = clients.map(client => {
    const clientName = client.name || client.client_name || 'No Name'
    const clientAddress = client.address || client.description || ''

    return `
      <tr>
        <td><strong>${clientName}</strong></td>
        <td>${client.email}</td>
        <td>${clientAddress}</td>
        <td>
          <button class="btn-edit client-edit" data-id="${client.id}" data-name="${clientName}" data-email="${client.email}" data-address="${clientAddress}">Edit</button>
          <button class="btn-delete client-delete" data-id="${client.id}" data-name="${clientName}">Delete</button>
        </td>
      </tr>
    `
  }).join('')

  document.querySelectorAll('.client-edit').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const id = e.target.dataset.id
      const currentName = e.target.dataset.name
      const currentEmail = e.target.dataset.email
      const currentAddress = e.target.dataset.address

      const fieldsHtml = `
        <input type="text" id="edit-client-name" value="${currentName}" placeholder="Name">
        <input type="email" id="edit-client-email" value="${currentEmail}" placeholder="Email">
        <input type="text" id="edit-client-address" value="${currentAddress}" placeholder="Address">
      `

      openModal('Edit Client', fieldsHtml, async () => {
        const newName = document.getElementById('edit-client-name').value.trim()
        const newEmail = document.getElementById('edit-client-email').value.trim()
        const newAddress = document.getElementById('edit-client-address').value.trim()

        let { error } = await supabase.from('clients').update({ name: newName, email: newEmail, address: newAddress }).eq('id', id)
        
        if (error && error.message.includes('column')) {
          const fallback = await supabase.from('clients').update({ client_name: newName, email: newEmail, address: newAddress }).eq('id', id)
          error = fallback.error
        }

        if (error) {
          showToast('Error updating client: ' + error.message, 'error')
        } else {
          showToast('Client updated successfully!', 'success')
          renderClients()
        }
      })
    })
  })

  document.querySelectorAll('.client-delete').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      const id = e.target.dataset.id
      const name = e.target.dataset.name
      
      if (confirm(`Are you sure you want to delete client "${name}"?`)) {
        const { error } = await supabase.from('clients').delete().eq('id', id)
        if (error) {
          showToast('Error deleting client: ' + error.message, 'error')
        } else {
          showToast('Client deleted.', 'warning')
          renderClients()
        }
      }
    })
  })
}

// --- INVOICES MODULE ---
async function renderInvoices() {
  pageTitle.innerText = 'Invoices'
  const { data: { user } } = await supabase.auth.getUser()

  const { data: clients } = await supabase.from('clients').select('*').eq('user_id', user.id)

  contentArea.innerHTML = `
    <div class="card" style="margin-bottom: 20px;">
      <h3>Create New Invoice</h3>
      <div class="form-inline" style="margin-top: 15px;">
        <select id="invoice-client">
          <option value="">Select Client</option>
          ${clients ? clients.map(c => {
            const displayName = c.name || c.client_name || 'Unnamed Client'
            return `<option value="${c.id}">${displayName}</option>`
          }).join('') : ''}
        </select>
        <input type="number" id="invoice-amount" placeholder="Amount ($)" step="0.01">
        <input type="date" id="invoice-due-date" title="Due Date">
        <select id="invoice-status">
          <option value="Pending">Pending</option>
          <option value="Paid">Paid</option>
        </select>
        <button id="add-invoice-btn">Create Invoice</button>
      </div>
    </div>

    <div class="card">
      <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 10px;">
        <h3>Invoice Records</h3>
        <div style="display: flex; gap: 10px; flex-wrap: wrap;">
          <input type="text" id="invoice-search" placeholder="Search by client..." value="${invoiceSearchTerm}" style="padding: 8px 12px; border-radius: 6px; border: 1px solid #ccc; font-size: 14px;">
          <select id="invoice-filter-status" style="padding: 8px 12px; border-radius: 6px; border: 1px solid #ccc; font-size: 14px; background: #fff; cursor: pointer;">
            <option value="all" ${invoiceStatusFilter === 'all' ? 'selected' : ''}>All Statuses</option>
            <option value="Pending" ${invoiceStatusFilter === 'Pending' ? 'selected' : ''}>Pending</option>
            <option value="Paid" ${invoiceStatusFilter === 'Paid' ? 'selected' : ''}>Paid</option>
            <option value="Overdue" ${invoiceStatusFilter === 'Overdue' ? 'selected' : ''}>Overdue</option>
          </select>
        </div>
      </div>

      <div class="table-container" style="margin-top: 15px;">
        <table>
          <thead>
            <tr>
              <th>Client</th>
              <th>Amount</th>
              <th>Due Date</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody id="invoices-table-body">
            <tr><td colspan="5">Loading invoices...</td></tr>
          </tbody>
        </table>
      </div>
    </div>
  `

  document.getElementById('add-invoice-btn').addEventListener('click', async () => {
    const clientSelect = document.getElementById('invoice-client')
    const amountInput = document.getElementById('invoice-amount')
    const dueDateInput = document.getElementById('invoice-due-date')
    const statusSelect = document.getElementById('invoice-status')

    const clientId = clientSelect.value
    const amount = amountInput.value
    const dueDate = dueDateInput.value
    const status = statusSelect.value

    if (!clientId || !amount) return showToast('Please select a client and enter an amount.', 'warning')

    let insertPayload = { 
      client_id: clientId, 
      amount: parseFloat(amount), 
      status, 
      user_id: user.id 
    }
    if (dueDate) insertPayload.due_date = dueDate

    let { error } = await supabase.from('invoices').insert([insertPayload])
    
    if (error && error.message.includes('due_date')) {
      delete insertPayload.due_date
      const fallback = await supabase.from('invoices').insert([insertPayload])
      error = fallback.error
    }

    if (error) {
      showToast('Error creating invoice: ' + error.message, 'error')
    } else {
      showToast('Invoice created successfully!', 'success')
      clientSelect.value = ''
      amountInput.value = ''
      dueDateInput.value = ''
      statusSelect.value = 'Pending'
      renderInvoices()
    }
  })

  document.getElementById('invoice-search').addEventListener('input', (e) => {
    invoiceSearchTerm = e.target.value.toLowerCase()
    filterAndRenderInvoicesTable(allInvoicesData)
  })

  document.getElementById('invoice-filter-status').addEventListener('change', (e) => {
    invoiceStatusFilter = e.target.value
    filterAndRenderInvoicesTable(allInvoicesData)
  })

  const { data: invoices } = await supabase
    .from('invoices')
    .select('*, clients(*)')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  const allInvoicesData = invoices || []
  filterAndRenderInvoicesTable(allInvoicesData)
}

function filterAndRenderInvoicesTable(invoices) {
  const tbody = document.getElementById('invoices-table-body')
  if (!tbody) return

  const todayStr = new Date().toISOString().split('T')[0]

  const filtered = invoices.filter(inv => {
    const clientObj = inv.clients
    const clientName = clientObj ? (clientObj.name || clientObj.client_name || '').toLowerCase() : ''
    const matchesSearch = clientName.includes(invoiceSearchTerm)

    const isOverdue = inv.status === 'Pending' && inv.due_date && inv.due_date < todayStr

    let matchesStatus = true
    if (invoiceStatusFilter === 'Pending') matchesStatus = inv.status === 'Pending' && !isOverdue
    else if (invoiceStatusFilter === 'Paid') matchesStatus = inv.status === 'Paid'
    else if (invoiceStatusFilter === 'Overdue') matchesStatus = isOverdue

    return matchesSearch && matchesStatus
  })

  if (filtered.length === 0) {
    tbody.innerHTML = '<tr><td colspan="5">No invoices match your search or filter criteria.</td></tr>'
    return
  }

  tbody.innerHTML = filtered.map(inv => {
    const clientObj = inv.clients
    const clientName = clientObj ? (clientObj.name || clientObj.client_name || 'Unknown Client') : 'Unknown Client'
    const clientEmail = clientObj ? clientObj.email || '' : ''
    const clientAddress = clientObj ? (clientObj.address || clientObj.description || '') : ''
    const createdAt = inv.created_at ? new Date(inv.created_at).toLocaleDateString() : new Date().toLocaleDateString()
    const dueDateFormatted = inv.due_date ? new Date(inv.due_date).toLocaleDateString() : 'N/A'

    const isOverdue = inv.status === 'Pending' && inv.due_date && inv.due_date < todayStr

    let statusTagHtml = `<span style="color: ${inv.status === 'Paid' ? '#4ecca3' : '#f39c12'}; font-weight: bold;">${inv.status}</span>`
    if (isOverdue) {
      statusTagHtml = `<span style="background-color: #e94560; color: #fff; padding: 3px 8px; border-radius: 4px; font-weight: bold; font-size: 12px;">OVERDUE</span>`
    }

    return `
      <tr>
        <td><strong>${clientName}</strong></td>
        <td>$${Number(inv.amount).toFixed(2)}</td>
        <td>${dueDateFormatted}</td>
        <td>${statusTagHtml}</td>
        <td>
          <button class="btn-edit invoice-edit" data-id="${inv.id}" data-amount="${inv.amount}" data-status="${inv.status}" data-duedate="${inv.due_date || ''}">Edit</button>
          <button class="btn-pdf invoice-pdf" 
            data-id="${inv.id.substring(0, 8).toUpperCase()}" 
            data-client="${clientName}" 
            data-email="${clientEmail}" 
            data-address="${clientAddress}" 
            data-amount="${inv.amount}" 
            data-status="${isOverdue ? 'Overdue' : inv.status}"
            data-date="${createdAt}"
            data-duedate="${dueDateFormatted}">PDF</button>
          <button class="btn-delete invoice-delete" data-id="${inv.id}">Delete</button>
        </td>
      </tr>
    `
  }).join('')

  document.querySelectorAll('.invoice-edit').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const id = e.target.dataset.id
      const currentAmount = e.target.dataset.amount
      const currentStatus = e.target.dataset.status
      const currentDueDate = e.target.dataset.duedate

      const fieldsHtml = `
        <input type="number" id="edit-invoice-amount" value="${currentAmount}" step="0.01" placeholder="Amount ($)">
        <input type="date" id="edit-invoice-duedate" value="${currentDueDate}">
        <select id="edit-invoice-status">
          <option value="Pending" ${currentStatus === 'Pending' ? 'selected' : ''}>Pending</option>
          <option value="Paid" ${currentStatus === 'Paid' ? 'selected' : ''}>Paid</option>
        </select>
      `

      openModal('Edit Invoice', fieldsHtml, async () => {
        const newAmount = document.getElementById('edit-invoice-amount').value
        const newStatus = document.getElementById('edit-invoice-status').value
        const newDueDate = document.getElementById('edit-invoice-duedate').value

        let updateData = { amount: parseFloat(newAmount), status: newStatus }
        if (newDueDate) updateData.due_date = newDueDate

        let { error } = await supabase.from('invoices').update(updateData).eq('id', id)
        if (error && error.message.includes('due_date')) {
          delete updateData.due_date
          const fallback = await supabase.from('invoices').update(updateData).eq('id', id)
          error = fallback.error
        }

        if (error) {
          showToast('Error updating invoice: ' + error.message, 'error')
        } else {
          showToast('Invoice updated successfully!', 'success')
          renderInvoices()
        }
      })
    })
  })

  document.querySelectorAll('.invoice-pdf').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const invId = e.target.dataset.id
      const clientName = e.target.dataset.client
      const clientEmail = e.target.dataset.email
      const clientAddress = e.target.dataset.address
      const amount = Number(e.target.dataset.amount).toFixed(2)
      const status = e.target.dataset.status
      const date = e.target.dataset.date
      const dueDate = e.target.dataset.duedate

      const element = document.createElement('div')
      element.style.padding = '40px'
      element.style.fontFamily = 'Arial, sans-serif'
      element.style.color = '#333'

      element.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #4ecca3; padding-bottom: 20px;">
          <div>
            <h1 style="margin: 0; color: #1a1a2e; font-size: 28px;">INVOICEPULSE</h1>
            <p style="margin: 5px 0 0; color: #777; font-size: 14px;">Professional Billing Solutions</p>
          </div>
          <div style="text-align: right;">
            <h2 style="margin: 0; color: #4ecca3; font-size: 22px;">INVOICE</h2>
            <p style="margin: 5px 0 0; font-size: 14px; font-weight: bold;">#INV-${invId}</p>
            <p style="margin: 2px 0 0; font-size: 12px; color: #777;">Issue Date: ${date}</p>
            <p style="margin: 2px 0 0; font-size: 12px; color: #777;">Due Date: ${dueDate}</p>
          </div>
        </div>

        <div style="display: flex; justify-content: space-between; margin-top: 30px;">
          <div>
            <h4 style="margin: 0 0 8px; color: #1a1a2e;">Billed To:</h4>
            <p style="margin: 0; font-weight: bold;">${clientName}</p>
            ${clientEmail ? `<p style="margin: 4px 0 0; color: #555;">${clientEmail}</p>` : ''}
            ${clientAddress ? `<p style="margin: 4px 0 0; color: #555;">${clientAddress}</p>` : ''}
          </div>
          <div style="text-align: right;">
            <h4 style="margin: 0 0 8px; color: #1a1a2e;">Payment Status:</h4>
            <span style="display: inline-block; padding: 6px 16px; border-radius: 4px; font-weight: bold; background: ${status === 'Paid' ? '#e8f8f5' : '#fdedec'}; color: ${status === 'Paid' ? '#27ae60' : '#e94560'}; border: 1px solid ${status === 'Paid' ? '#27ae60' : '#e94560'};">
              ${status.toUpperCase()}
            </span>
          </div>
        </div>

        <table style="width: 100%; border-collapse: collapse; margin-top: 40px;">
          <thead>
            <tr style="background: #1a1a2e; color: #fff;">
              <th style="padding: 12px; text-left;">Description</th>
              <th style="padding: 12px; text-align: right;">Amount</th>
            </tr>
          </thead>
          <tbody>
            <tr style="border-bottom: 1px solid #eee;">
              <td style="padding: 16px 12px;">Professional Services Rendered</td>
              <td style="padding: 16px 12px; text-align: right; font-weight: bold;">$${amount}</td>
            </tr>
          </tbody>
        </table>

        <div style="display: flex; justify-content: flex-end; margin-top: 20px;">
          <div style="width: 250px; text-align: right;">
            <div style="display: flex; justify-content: space-between; padding: 10px 0; border-top: 2px solid #1a1a2e; font-size: 18px; font-weight: bold;">
              <span>Total:</span>
              <span style="color: #4ecca3;">$${amount}</span>
            </div>
          </div>
        </div>

        <div style="margin-top: 60px; text-align: center; border-top: 1px solid #eee; padding-top: 20px; color: #999; font-size: 12px;">
          Thank you for your business! If you have any questions regarding this invoice, please contact support.
        </div>
      `

      html2pdf().from(element).save(`Invoice_INV-${invId}_${clientName.replace(/\s+/g, '_')}.pdf`)
      showToast('Generating PDF...', 'info')
    })
  })

  document.querySelectorAll('.invoice-delete').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      const id = e.target.dataset.id
      if (confirm('Are you sure you want to delete this invoice?')) {
        const { error } = await supabase.from('invoices').delete().eq('id', id)
        if (error) {
          showToast('Error deleting invoice: ' + error.message, 'error')
        } else {
          showToast('Invoice deleted.', 'warning')
          renderInvoices()
        }
      }
    })
  })
}

// --- EXPENSES MODULE ---
async function renderExpenses() {
  pageTitle.innerText = 'Expenses'
  const { data: { user } } = await supabase.auth.getUser()

  contentArea.innerHTML = `
    <div class="card" style="margin-bottom: 20px;">
      <h3>Record New Expense</h3>
      <div class="form-inline" style="margin-top: 15px;">
        <input type="text" id="expense-category" placeholder="Category (e.g. Hosting, Utilities)">
        <input type="number" id="expense-amount" placeholder="Amount ($)" step="0.01">
        <button id="add-expense-btn">Add Expense</button>
      </div>
    </div>

    <div class="card">
      <h3>Expense History</h3>
      <div class="table-container" style="margin-top: 15px;">
        <table>
          <thead>
            <tr>
              <th>Category</th>
              <th>Amount</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody id="expenses-table-body">
            <tr><td colspan="3">Loading expenses...</td></tr>
          </tbody>
        </table>
      </div>
    </div>
  `

  document.getElementById('add-expense-btn').addEventListener('click', async () => {
    const categoryInput = document.getElementById('expense-category')
    const amountInput = document.getElementById('expense-amount')

    const category = categoryInput.value.trim()
    const amount = amountInput.value

    if (!category || !amount) return showToast('Please enter both category and amount.', 'warning')

    const { error } = await supabase.from('expenses').insert([
      { category, amount: parseFloat(amount), user_id: user.id }
    ])

    if (error) {
      showToast('Error adding expense: ' + error.message, 'error')
    } else {
      showToast('Expense added successfully!', 'success')
      categoryInput.value = ''
      amountInput.value = ''
      renderExpenses()
    }
  })

  const { data: expenses, error } = await supabase
    .from('expenses')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  const tbody = document.getElementById('expenses-table-body')

  if (error) {
    tbody.innerHTML = `<tr><td colspan="3" style="color: red;">Error fetching expenses: ${error.message}</td></tr>`
    return
  }

  if (!expenses || expenses.length === 0) {
    tbody.innerHTML = '<tr><td colspan="3">No expenses recorded yet. Add one above!</td></tr>'
    return
  }

  tbody.innerHTML = expenses.map(exp => `
    <tr>
      <td><strong>${exp.category}</strong></td>
      <td style="color: #e94560; font-weight: bold;">-$${Number(exp.amount).toFixed(2)}</td>
      <td>
        <button class="btn-edit expense-edit" data-id="${exp.id}" data-category="${exp.category}" data-amount="${exp.amount}">Edit</button>
        <button class="btn-delete expense-delete" data-id="${exp.id}" data-category="${exp.category}">Delete</button>
      </td>
    </tr>
  `).join('')

  document.querySelectorAll('.expense-edit').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const id = e.target.dataset.id
      const currentCategory = e.target.dataset.category
      const currentAmount = e.target.dataset.amount

      const fieldsHtml = `
        <input type="text" id="edit-expense-category" value="${currentCategory}" placeholder="Category">
        <input type="number" id="edit-expense-amount" value="${currentAmount}" step="0.01" placeholder="Amount ($)">
      `

      openModal('Edit Expense', fieldsHtml, async () => {
        const newCategory = document.getElementById('edit-expense-category').value.trim()
        const newAmount = document.getElementById('edit-expense-amount').value

        const { error } = await supabase
          .from('expenses')
          .update({ category: newCategory, amount: parseFloat(newAmount) })
          .eq('id', id)

        if (error) {
          showToast('Error updating expense: ' + error.message, 'error')
        } else {
          showToast('Expense updated successfully!', 'success')
          renderExpenses()
        }
      })
    })
  })

  document.querySelectorAll('.expense-delete').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      const id = e.target.dataset.id
      const category = e.target.dataset.category

      if (confirm(`Are you sure you want to delete the expense "${category}"?`)) {
        const { error } = await supabase.from('expenses').delete().eq('id', id)
        if (error) {
          showToast('Error deleting expense: ' + error.message, 'error')
        } else {
          showToast('Expense deleted.', 'warning')
          renderExpenses()
        }
      }
    })
  })
}