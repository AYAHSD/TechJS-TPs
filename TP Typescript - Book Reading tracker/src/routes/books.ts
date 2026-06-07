import express from 'express';
import { BookModel } from '../models/bookModel';
import { Book } from '../models/bookClass';

const router = express.Router();

router.get('/', async (req, res) => {
  const books = await BookModel.find().lean();
  // compute percentage for each
  const withPct = books.map(b => ({ ...b, percentage: b.pages ? Math.round((b.pagesRead / b.pages) * 100) : 0 }));
  res.json(withPct);
});

router.post('/', async (req, res) => {
  try {
    const data = req.body;
    // enforce finished logic
    if (typeof data.pages === 'number' && typeof data.pagesRead === 'number') {
      data.finished = data.pagesRead >= data.pages;
    } else {
      data.finished = false;
    }
    const created = await BookModel.create(data);
    res.status(201).json(created);
  } catch (err) {
    res.status(400).json({ error: 'Invalid data', details: err });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const id = req.params.id;
    const data = req.body;
    if (typeof data.pages === 'number' && typeof data.pagesRead === 'number') {
      data.finished = data.pagesRead >= data.pages;
    }
    const updated = await BookModel.findByIdAndUpdate(id, data, { new: true });
    if (!updated) return res.status(404).json({ error: 'Not found' });
    res.json(updated);
  } catch (err) {
    res.status(400).json({ error: 'Invalid data', details: err });
  }
});

router.delete('/:id', async (req, res) => {
  const id = req.params.id;
  const found = await BookModel.findById(id);
  if (!found) return res.status(404).json({ error: 'Not found' });
  const b = new Book(found as any);
  await b.deleteBook();
  res.json({ ok: true });
});

router.get('/stats/global', async (req, res) => {
  const books = await BookModel.find().lean();
  const totalBooksRead = books.filter(b => b.finished).length;
  const totalPages = books.reduce((s, b) => s + (b.pages || 0), 0);
  const totalPagesRead = books.reduce((s, b) => s + (b.pagesRead || 0), 0);
  res.json({ totalBooksRead, totalPages, totalPagesRead });
});

export default router;
