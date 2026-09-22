import mongoose from 'mongoose'

const productSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    category: { type: String, required: true },
    price: { type: Number, required: true, min: 0 },
    unit: { type: String, default: 'unidad' },
    description: { type: String, default: '' },
    imageUrl: { type: String, default: '' },
    emoji: { type: String, default: '🌿' },
  },
  { timestamps: true },
)

export default mongoose.model('Product', productSchema)
