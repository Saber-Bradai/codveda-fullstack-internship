const mongoose = require('mongoose');

const reviewSchema = new mongoose.Schema(
  {
    product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    rating: { type: Number, required: true, min: 1, max: 5 },
    comment: { type: String, trim: true, maxlength: 500, default: '' },
  },
  { timestamps: true }
);

// One review per user per product + fast lookups by product
reviewSchema.index({ product: 1, user: 1 }, { unique: true });

// Recalculate the product's rating summary with an aggregation pipeline.
reviewSchema.statics.recalc = async function (productId) {
  const [stats] = await this.aggregate([
    { $match: { product: productId } },
    { $group: { _id: '$product', avg: { $avg: '$rating' }, count: { $sum: 1 } } },
  ]);
  await mongoose.model('Product').updateOne(
    { _id: productId },
    { ratingAvg: stats ? Math.round(stats.avg * 10) / 10 : 0, ratingCount: stats ? stats.count : 0 }
  );
};

reviewSchema.post('save', function () {
  return this.constructor.recalc(this.product);
});
reviewSchema.post('deleteOne', { document: true, query: false }, function () {
  return this.constructor.recalc(this.product);
});

reviewSchema.set('toJSON', { versionKey: false });

module.exports = mongoose.model('Review', reviewSchema);
