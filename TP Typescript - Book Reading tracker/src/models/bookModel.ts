import mongoose from 'mongoose';

export enum StatusEnum {
  Read = 'Read',
  ReRead = 'Re-read',
  DNF = 'DNF',
  Currently = 'Currently reading',
  Returned = 'Returned Unread',
  Want = 'Want to read'
}

export enum FormatEnum {
  Print = 'Print',
  PDF = 'PDF',
  Ebook = 'Ebook',
  AudioBook = 'AudioBook'
}

const BookSchema = new mongoose.Schema({
  title: { type: String, required: true },
  author: { type: String, required: true },
  pages: { type: Number, required: true, min: 1 },
  status: { type: String, enum: Object.values(StatusEnum), required: true },
  price: { type: Number, required: true, min: 0 },
  pagesRead: { type: Number, required: true, min: 0 },
  format: { type: String, enum: Object.values(FormatEnum), required: true },
  suggestedBy: { type: String },
  finished: { type: Boolean, default: false }
}, { timestamps: true });

export interface IBook extends mongoose.Document {
  title: string;
  author: string;
  pages: number;
  status: StatusEnum | string;
  price: number;
  pagesRead: number;
  format: FormatEnum | string;
  suggestedBy?: string;
  finished: boolean;
}

export const BookModel = mongoose.model<IBook>('Book', BookSchema);
