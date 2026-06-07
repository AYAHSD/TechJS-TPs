const api = '/api/books';

async function fetchBooks() {
  const res = await fetch(api);
  return res.json();
}

async function fetchStats() {
  const res = await fetch(`${api}/stats/global`);
  return res.json();
}

function renderBooks(list) {
  const el = document.getElementById('booksList');
  if (!list.length) {
    el.innerHTML = '<div class="text-gray-600">No books yet.</div>';
    return;
  }
  const rows = list.map(b => `
    <div class="p-3 border-b flex items-center justify-between">
      <div>
        <div class="font-semibold">${b.title}</div>
        <div class="text-sm text-gray-600">${b.author} • ${b.format} • ${b.status}</div>
        <div class="text-sm text-gray-500">${b.pagesRead}/${b.pages} pages • ${b.price}€ • Suggested: ${b.suggestedBy || '-'} </div>
      </div>
      <div class="text-right">
        <div class="text-sm mb-2">${b.percentage || 0}%</div>
        <div class="flex gap-2">
          <button onclick="deleteBook('${b._id}')" class="text-red-600">Delete</button>
        </div>
      </div>
    </div>
  `).join('');
  el.innerHTML = `<div class="divide-y">${rows}</div>`;
}

function renderStats(s) {
  const el = document.getElementById('globalStats');
  el.innerHTML = `
    <div>Total books read: <strong>${s.totalBooksRead}</strong></div>
    <div>Total pages: <strong>${s.totalPages}</strong></div>
    <div>Total pages read: <strong>${s.totalPagesRead}</strong></div>
  `;
}

async function refresh() {
  const [books, stats] = await Promise.all([fetchBooks(), fetchStats()]);
  renderBooks(books);
  renderStats(stats);
}

document.getElementById('bookForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const form = e.target;
  const data = {
    title: form.title.value,
    author: form.author.value,
    pages: Number(form.pages.value),
    pagesRead: Number(form.pagesRead.value) || 0,
    status: form.status.value,
    price: Number(form.price.value) || 0,
    format: form.format.value,
    suggestedBy: form.suggestedBy.value || '',
    finished: !!form.finished.checked
  };
  // If pagesRead equals pages, flag finished
  if (data.pagesRead >= data.pages) data.finished = true;

  await fetch(api, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  form.reset();
  refresh();
});

async function deleteBook(id) {
  await fetch(`${api}/${id}`, { method: 'DELETE' });
  refresh();
}

refresh();
