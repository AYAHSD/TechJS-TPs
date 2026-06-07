import { BookModel, IBook } from './bookModel';

export class Book {
  private doc: IBook;

  constructor(doc: IBook) {
    this.doc = doc;
  }

  static async create(data: Partial<IBook>) {
    // Ensure finished is set if pagesRead >= pages
    if (typeof data.pages === 'number' && typeof data.pagesRead === 'number') {
      data.finished = data.pagesRead >= data.pages;
    } else {
      data.finished = false;
    }
    const created = await BookModel.create(data as any);
    return new Book(created as IBook);
  }

  currentlyAt(): number {
    if (!this.doc.pages || this.doc.pages <= 0) return 0;
    const pct = Math.min(100, Math.round((this.doc.pagesRead / this.doc.pages) * 100));
    return pct;
  }

  async deleteBook(): Promise<void> {
    await BookModel.findByIdAndDelete(this.doc._id);
  }

  getDocument(): IBook {
    return this.doc;
  }
}
