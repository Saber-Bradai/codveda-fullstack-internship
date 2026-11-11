const mongoose = require('mongoose');

const productSchema = new mongoose.Schema(
  {
    name: { type: String, required: [true, 'Name is required'], trim: true, minlength: 2, maxlength: 100 },
    description: { type: String, trim: true, maxlength: 1000, default: '' },
    price: { type: Number, required: [true, 'Price is required'], min: [0, 'Price must be >= 0'] },
    stock: {
      type: Number,
      default: 0,
      min: 0,
      validate: { validator: Number.isInteger, message: 'Stock must be an integer' },
    },
    // Relationships
    category: { type: mongoose.Schema.Types.ObjectId, ref: 'Category', required: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    // Denormalized rating summary (kept in sync by Review hooks) to avoid aggregations on every list call
    ratingAvg: { type: Number, default: 0, min: 0, max: 5 },
    ratingCount: { type: Number, default: 0 },
  },
  { timestamps: true }
);

// ---- Indexes ---------------------------------------------------------------
// Full-text search on name/description (used by ?search=)
productSchema.index({ name: 'text', description: 'text' }, { weights: { name: 5, description: 1 } });
// Compound index supports "filter by category, sort by price" queries
productSchema.index({ category: 1, price: 1 });
// "My products" queries, newest first
productSchema.index({ createdBy: 1, createdAt: -1 });

productSchema.set('toJSON', { versionKey: false });

module.exports = mongoose.model('Product', productSchema);
