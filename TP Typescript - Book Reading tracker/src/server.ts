import express from 'express';
import cors from 'cors';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import booksRouter from './routes/books';
import path from 'path';

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

app.use('/api/books', booksRouter);

const publicDir = path.join(__dirname, '..', 'public');
app.use(express.static(publicDir));

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/book-tracker';
const PORT = process.env.PORT || 4000;

mongoose.connect(MONGODB_URI).then(() => {
  console.log('Connected to MongoDB');
  app.listen(PORT, () => console.log(`Server running on ${PORT}`));
}).catch(err => {
  console.error('MongoDB connection error', err);
});
