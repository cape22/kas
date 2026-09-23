// URL GOOGLE APPS SCRIPT ANDA
const GOOGLE_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbzwChwpIZcLXzu1e5V8L-xfc7N54HlxT7AwVXX_Gi5h09DwF8ASSPNCUwMdloR6yJyM/exec";
const TREASURER_PIN = "150810"; // PIN Bendahara

const DEFAULT_STUDENTS = [
    "ABITIA RAHMAN", "AKHMAD ROFIQ", "ALISHA SHALSHABILA", "ALLIA RAHAYU", "AMANDA FEBRIYANTI",
    "ANNISA NURDIANA INDAH", "AUREL ANASTACIA BORU NAIBAHO", "BISMAKA RADITYA KAPINDHO",
    "CINTARA ATAFUNISYA", "DESVITA REGINA PUTRI", "DEWI PUTRI SYAGINA", "DINDA APRILLYANA",
    "DWI AYUNINGTYAS", "DZAKIRA TALITA ZAHRAN", "FAHIRA NURMAULIDA", "FAHRIZAL WAHYUDIN",
    "FAUZAN AGUNG PRATAMA", "FERONIKA DWIYANTI SILABAN", "FRANSISKUS NUWEL RAFHIDO MANIK",
    "HIRZAN NAZHIR MUZHAFFAR", "IRENE JESICA EMOR", "KENNY DWI PUSPITA", "MARIANI SRIREJEKI SITANGGANG",
    "MAULIDA EKA PUTRI", "MEISYA PUTRI FAKHRIZY", "MUHAMAD FABIAN ALFAIZI", "MUHAMAD RIZKY RAMADHAN",
    "MUHAMMAD FAIRUS SALAM", "NABILA KHOERUNNISA", "NADYA AYU NURASYFA", "NAIZAR ALDANRICO NUGRAHA",
    "NAOMI YULISTINA SIREGAR", "OKTAVIANI CAHYA PUTRI", "PUTRI AINUR ROHMAH", "RAHMAT DIPRAJA SOPYAN",
    "REIFAN FAHRIZAL", "RIDWAN AHLAN MUZAKKI", "SAKILA NOVITA NURAINI", "SHAFIQA ANANDA MALIK",
    "SHAFIRA AUROLLA WIJAYA KUSUMAH", "SHINTA MULYANI", "SITI NURAZIZAH", "SYAKILLA NURVIANTI", "WINA KHOERUNNISA"
];

let students = [];
let transactions = [];
let standardFee = 2000;
let activeFilter = 'ALL';
let searchQuery = '';
let isTreasurer = false; // Status Role: false = Siswa, true = Bendahara

function getTodayString() {
    return new Date().toISOString().split('T')[0];
}

function formatRupiah(amount) {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(amount);
}

function formatDateReadable(dateStr) {
    if (!dateStr) return '';
    return new Date(dateStr).toLocaleDateString('id-ID', { year: 'numeric', month: 'short', day: 'numeric' });
}

// Update UI Berdasarkan Role
function updateRoleUI() {
    const roleBadge = document.getElementById('roleBadge');
    const authBtn = document.getElementById('authBtn');
    const treasurerControls = document.getElementById('treasurerControls');
    const studentNoticeBar = document.getElementById('studentNoticeBar');
    const actionCols = document.querySelectorAll('.action-col');

    if (isTreasurer) {
        roleBadge.className = "bg-amber-500/20 text-amber-400 border border-amber-500/30 px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5";
        roleBadge.innerHTML = `<i class="fa-solid fa-user-shield"></i> Mode Bendahara`;
        
        authBtn.className = "bg-rose-500 hover:bg-rose-600 text-white text-xs font-bold px-3.5 py-2 rounded-lg transition flex items-center gap-1.5 shadow-md";
        authBtn.innerHTML = `<i class="fa-solid fa-right-from-bracket"></i> Keluar Bendahara`;
        
        treasurerControls.classList.remove('hidden');
        studentNoticeBar.classList.add('hidden');
        actionCols.forEach(el => el.classList.remove('hidden'));
    } else {
        roleBadge.className = "bg-slate-700/80 px-3 py-1.5 rounded-lg border border-slate-600 text-xs font-semibold text-slate-300 flex items-center gap-1.5";
        roleBadge.innerHTML = `<i class="fa-solid fa-eye text-blue-400"></i> Mode Siswa (Read-Only)`;
        
        authBtn.className = "bg-emerald-500 hover:bg-emerald-600 text-slate-950 text-xs font-bold px-3.5 py-2 rounded-lg transition flex items-center gap-1.5 shadow-md";
        authBtn.innerHTML = `<i class="fa-solid fa-key"></i> Login Bendahara`;
        
        treasurerControls.classList.add('hidden');
        studentNoticeBar.classList.remove('hidden');
        actionCols.forEach(el => el.classList.add('hidden'));
    }

    renderStudentCards();
    renderStudentSummaryTable();
    renderTransactionHistory();
}

// Load Data from Google Sheets
async function loadDataFromCloud() {
    try {
        showToast("Mengambil data terbaru...");
        const res = await fetch(GOOGLE_SCRIPT_URL);
        const data = await res.json();

        if (data.students && data.students.length > 0) {
            students = data.students;
        } else {
            students = DEFAULT_STUDENTS.map((name, idx) => ({ id: 'std_' + (idx + 1), name: name }));
            syncToCloud();
        }

        transactions = data.transactions || [];
        renderAll();
        showToast("Data berhasil disinkronkan!");
    } catch (err) {
        console.error(err);
        loadFromLocalStorage();
    }
}

function loadFromLocalStorage() {
    const savedStudents = localStorage.getItem('kas_students');
    const savedTransactions = localStorage.getItem('kas_transactions');
    if (savedStudents) students = JSON.parse(savedStudents);
    else students = DEFAULT_STUDENTS.map((name, idx) => ({ id: 'std_' + (idx + 1), name: name }));
    if (savedTransactions) transactions = JSON.parse(savedTransactions);
    renderAll();
}

async function syncToCloud() {
    localStorage.setItem('kas_students', JSON.stringify(students));
    localStorage.setItem('kas_transactions', JSON.stringify(transactions));

    try {
        await fetch(GOOGLE_SCRIPT_URL, {
            method: 'POST',
            mode: 'no-cors',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: "saveAll", students, transactions })
        });
    } catch (e) {
        console.error("Gagal sinkronisasi cloud:", e);
    }
}

function showToast(message) {
    const toast = document.getElementById('toast');
    const msg = document.getElementById('toastMessage');
    msg.textContent = message;
    toast.classList.remove('hidden');
    setTimeout(() => { toast.classList.add('hidden'); }, 3000);
}

function renderStats() {
    const today = getTodayString();
    let totalIn = 0, totalOut = 0, todayIncome = 0;
    const paidTodayStudentIds = new Set();

    transactions.forEach(tx => {
        const val = Number(tx.amount);
        if (tx.type === 'IN') {
            totalIn += val;
            if (tx.date === today) {
                todayIncome += val;
                if (tx.studentId) paidTodayStudentIds.add(tx.studentId);
            }
        } else if (tx.type === 'OUT') {
            totalOut += val;
        }
    });

    document.getElementById('statTotalSaldo').textContent = formatRupiah(totalIn - totalOut);
    document.getElementById('statTodayIncome').textContent = formatRupiah(todayIncome);
    document.getElementById('statTotalIn').textContent = formatRupiah(totalIn);
    document.getElementById('statTotalOut').textContent = formatRupiah(totalOut);
    document.getElementById('statPaidTodayCount').textContent = paidTodayStudentIds.size;
}

function getStudentPaidTodayInfo(studentId) {
    const today = getTodayString();
    const todayTx = transactions.filter(tx => tx.studentId === studentId && tx.date === today && tx.type === 'IN');
    if (todayTx.length > 0) {
        return { paid: true, amount: todayTx.reduce((sum, t) => sum + Number(t.amount), 0) };
    }
    return { paid: false, amount: 0 };
}

function getStudentTotalPaid(studentId) {
    return transactions.filter(tx => tx.studentId === studentId && tx.type === 'IN').reduce((sum, t) => sum + Number(t.amount), 0);
}

function renderStudentCards() {
    const grid = document.getElementById('studentCardsGrid');
    grid.innerHTML = '';

    let filtered = students.filter(s => s.name.toLowerCase().includes(searchQuery.toLowerCase()));
    const studentStatusList = filtered.map(s => ({ student: s, status: getStudentPaidTodayInfo(s.id) }));

    let displayedList = studentStatusList;
    if (activeFilter === 'PAID') displayedList = studentStatusList.filter(item => item.status.paid);
    else if (activeFilter === 'UNPAID') displayedList = studentStatusList.filter(item => !item.status.paid);

    document.getElementById('countAll').textContent = students.length;
    document.getElementById('countPaid').textContent = students.filter(s => getStudentPaidTodayInfo(s.id).paid).length;
    document.getElementById('countUnpaid').textContent = students.length - students.filter(s => getStudentPaidTodayInfo(s.id).paid).length;

    if (displayedList.length === 0) {
        grid.innerHTML = `<div class="col-span-full py-8 text-center text-xs text-slate-500">Tidak ada nama siswa</div>`;
        return;
    }

    displayedList.forEach(({ student, status }) => {
        const card = document.createElement('div');
        card.className = `p-3.5 rounded-xl border transition flex items-center justify-between gap-3 ${status.paid ? 'bg-emerald-950/20 border-emerald-500/30' : 'bg-slate-900/60 border-slate-700/80'}`;
        
        let actionBtn = '';
        if (isTreasurer) {
            if (status.paid) {
                actionBtn = `<button onclick="undoPaymentToday('${student.id}')" title="Batalkan Kas" class="bg-slate-800 hover:bg-slate-700 text-slate-400 border border-slate-700 px-2.5 py-1.5 rounded-lg text-xs"><i class="fa-solid fa-rotate-left"></i></button>`;
            } else {
                actionBtn = `<button onclick="quickPayToday('${student.id}')" class="bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold px-3 py-1.5 rounded-lg text-xs shadow flex items-center gap-1.5"><i class="fa-solid fa-plus"></i> Bayar Kas</button>`;
            }
        }

        card.innerHTML = `
            <div class="min-w-0 flex-1">
                <span class="font-semibold text-sm text-slate-200 truncate block">${student.name}</span>
                <p class="text-xs ${status.paid ? 'text-emerald-400 font-medium' : 'text-rose-400/80'} mt-0.5">
                    ${status.paid ? `<i class="fa-solid fa-circle-check"></i> Lunas (${formatRupiah(status.amount)})` : '<i class="fa-solid fa-clock"></i> Belum bayar kas'}
                </p>
            </div>
            <div>${actionBtn}</div>
        `;
        grid.appendChild(card);
    });
}

function quickPayToday(studentId) {
    if (!isTreasurer) return;
    const student = students.find(s => s.id === studentId);
    if (!student) return;

    const newTx = {
        id: 'tx_' + Date.now(),
        studentId: student.id,
        studentName: student.name,
        type: 'IN',
        amount: standardFee,
        desc: `Uang Kas Hari Ini (${student.name})`,
        date: getTodayString(),
        createdAt: new Date().toISOString()
    };

    transactions.unshift(newTx);
    syncToCloud();
    renderAll();
    showToast(`Berhasil bayar: ${student.name}`);
}

function undoPaymentToday(studentId) {
    if (!isTreasurer) return;
    const today = getTodayString();
    const index = transactions.findIndex(tx => tx.studentId === studentId && tx.date === today && tx.type === 'IN');
    if (index !== -1) {
        const studentName = transactions[index].studentName;
        transactions.splice(index, 1);
        syncToCloud();
        renderAll();
        showToast(`Dibatalkan: ${studentName}`);
    }
}

function renderStudentSummaryTable() {
    const tbody = document.getElementById('studentSummaryTableBody');
    tbody.innerHTML = '';
    students.forEach((student, index) => {
        const totalPaid = getStudentTotalPaid(student.id);
        const statusToday = getStudentPaidTodayInfo(student.id);
        const tr = document.createElement('tr');
        tr.className = "hover:bg-slate-800/40 border-b border-slate-800/60";
        
        let actionColCell = isTreasurer 
            ? `<td class="py-2.5 px-3 text-center action-col"><button onclick="deleteStudent('${student.id}')" class="text-slate-500 hover:text-rose-400 text-xs px-1.5 py-1"><i class="fa-solid fa-trash-can"></i></button></td>`
            : `<td class="py-2.5 px-3 text-center action-col hidden"></td>`;

        tr.innerHTML = `
            <td class="py-2.5 px-3 text-xs text-slate-500">${index + 1}</td>
            <td class="py-2.5 px-3 font-medium text-slate-200 text-xs">${student.name}</td>
            <td class="py-2.5 px-3 text-right font-bold text-emerald-400 text-xs">${formatRupiah(totalPaid)}</td>
            <td class="py-2.5 px-3 text-center">
                ${statusToday.paid ? '<span class="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] font-bold px-2 py-0.5 rounded-full">LUNAS</span>' : '<span class="bg-rose-500/10 text-rose-400 border border-rose-500/20 text-[10px] font-bold px-2 py-0.5 rounded-full">BELUM</span>'}
            </td>
            ${actionColCell}
        `;
        tbody.appendChild(tr);
    });
}

function deleteStudent(studentId) {
    if (!isTreasurer) return;
    const student = students.find(s => s.id === studentId);
    if (!student) return;
    if (confirm(`Hapus ${student.name}?`)) {
        students = students.filter(s => s.id !== studentId);
        syncToCloud();
        renderAll();
    }
}

function renderTransactionHistory() {
    const list = document.getElementById('transactionHistoryList');
    const filterType = document.getElementById('txTypeFilter').value;
    list.innerHTML = '';

    let filteredTx = transactions;
    if (filterType !== 'ALL') filteredTx = transactions.filter(t => t.type === filterType);

    if (filteredTx.length === 0) {
        list.innerHTML = `<div class="py-8 text-center text-xs text-slate-500">Belum ada transaksi</div>`;
        return;
    }

    filteredTx.forEach(tx => {
        const item = document.createElement('div');
        item.className = "p-3 rounded-xl bg-slate-900/70 border border-slate-700/60 flex items-center justify-between gap-3";
        const isIn = tx.type === 'IN';
        
        let deleteBtn = isTreasurer 
            ? `<button onclick="deleteTransaction('${tx.id}')" class="text-[10px] text-slate-500 hover:text-rose-400 mt-1 block"><i class="fa-solid fa-trash"></i> Hapus</button>` 
            : '';

        item.innerHTML = `
            <div class="flex items-center gap-3 min-w-0">
                <div class="w-8 h-8 rounded-lg ${isIn ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'} flex items-center justify-center shrink-0 text-xs">
                    <i class="fa-solid ${isIn ? 'fa-arrow-down-left' : 'fa-arrow-up-right'}"></i>
                </div>
                <div class="min-w-0">
                    <p class="text-xs font-semibold text-slate-200 truncate">${tx.desc}</p>
                    <p class="text-[10px] text-slate-400 mt-0.5">${formatDateReadable(tx.date)} ${tx.studentName ? `• ${tx.studentName}` : ''}</p>
                </div>
            </div>
            <div class="text-right shrink-0">
                <p class="text-xs font-bold ${isIn ? 'text-emerald-400' : 'text-rose-400'}">${isIn ? '+' : '-'} ${formatRupiah(tx.amount)}</p>
                ${deleteBtn}
            </div>
        `;
        list.appendChild(item);
    });
}

function deleteTransaction(txId) {
    if (!isTreasurer) return;
    if (confirm("Hapus transaksi ini?")) {
        transactions = transactions.filter(t => t.id !== txId);
        syncToCloud();
        renderAll();
    }
}

function populateStudentSelect() {
    const select = document.getElementById('txStudentSelect');
    select.innerHTML = '<option value="">-- Bukan Transaksi Perorangan --</option>';
    students.forEach(s => {
        const opt = document.createElement('option');
        opt.value = s.id;
        opt.textContent = s.name;
        select.appendChild(opt);
    });
}

function renderAll() {
    renderStats();
    renderStudentCards();
    renderStudentSummaryTable();
    renderTransactionHistory();
}

document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('currentDateText').textContent = formatDateReadable(getTodayString());
    
    // Auth Bendahara Handling
    const authBtn = document.getElementById('authBtn');
    const pinModal = document.getElementById('pinModal');
    const pinForm = document.getElementById('pinForm');
    const pinInput = document.getElementById('pinInput');
    const pinErrorMsg = document.getElementById('pinErrorMsg');

    authBtn.addEventListener('click', () => {
        if (isTreasurer) {
            isTreasurer = false;
            updateRoleUI();
            showToast("Keluar dari Mode Bendahara");
        } else {
            pinModal.classList.remove('hidden');
            pinInput.value = '';
            pinErrorMsg.classList.add('hidden');
            pinInput.focus();
        }
    });

    document.getElementById('closePinModalBtn').addEventListener('click', () => pinModal.classList.add('hidden'));

    pinForm.addEventListener('submit', (e) => {
        e.preventDefault();
        if (pinInput.value === TREASURER_PIN) {
            isTreasurer = true;
            pinModal.classList.add('hidden');
            updateRoleUI();
            showToast("Berhasil masuk sebagai Bendahara!");
        } else {
            pinErrorMsg.classList.remove('hidden');
        }
    });

    // Load Cloud Data
    loadDataFromCloud();

    document.getElementById('saveFeeBtn').addEventListener('click', () => {
        const val = parseInt(document.getElementById('standardFeeInput').value, 10);
        if (!isNaN(val) && val > 0) {
            standardFee = val;
            showToast(`Iuran diset ke ${formatRupiah(standardFee)}`);
        }
    });

    document.getElementById('studentSearchInput').addEventListener('input', (e) => {
        searchQuery = e.target.value;
        renderStudentCards();
    });

    const btnAll = document.getElementById('filterAllBtn');
    const btnUnpaid = document.getElementById('filterUnpaidBtn');
    const btnPaid = document.getElementById('filterPaidBtn');

    btnAll.addEventListener('click', () => { activeFilter = 'ALL'; renderStudentCards(); });
    btnUnpaid.addEventListener('click', () => { activeFilter = 'UNPAID'; renderStudentCards(); });
    btnPaid.addEventListener('click', () => { activeFilter = 'PAID'; renderStudentCards(); });

    const txModal = document.getElementById('transactionModal');
    document.getElementById('openTransactionModalBtn').addEventListener('click', () => {
        populateStudentSelect();
        document.getElementById('txDateInput').value = getTodayString();
        txModal.classList.remove('hidden');
    });

    const closeTxModal = () => txModal.classList.add('hidden');
    document.getElementById('closeTxModalBtn').addEventListener('click', closeTxModal);
    document.getElementById('cancelTxModalBtn').addEventListener('click', closeTxModal);

    document.getElementById('transactionForm').addEventListener('submit', (e) => {
        e.preventDefault();
        const type = document.querySelector('input[name="txType"]:checked').value;
        const studentId = document.getElementById('txStudentSelect').value;
        const amount = Number(document.getElementById('txAmountInput').value);
        const desc = document.getElementById('txDescInput').value;
        const date = document.getElementById('txDateInput').value;
        const student = students.find(s => s.id === studentId);

        transactions.unshift({
            id: 'tx_' + Date.now(),
            studentId: studentId || null,
            studentName: student ? student.name : '',
            type, amount, desc, date,
            createdAt: new Date().toISOString()
        });

        syncToCloud();
        renderAll();
        closeTxModal();
        e.target.reset();
        showToast("Transaksi disimpan!");
    });

    document.getElementById('txTypeFilter').addEventListener('change', renderTransactionHistory);
    updateRoleUI();
});