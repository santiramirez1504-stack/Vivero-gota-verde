import mongoose from 'mongoose'

const productImageSchema = new mongoose.Schema(
  {
    url: { type: String, required: true },
    publicId: { type: String, default: '' },
  },
  { _id: false },
)

const productSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    category: { type: String, required: true },
    price: { type: Number, required: true, min: 0 },
    unit: { type: String, default: 'unidad' },
    // null = no se está controlando stock para este producto (no se muestra nada en el catálogo público)
    stock: { type: Number, min: 0, default: null },
    description: { type: String, default: '' },
    // legado: productos creados antes de admitir varias fotos (URL pegada a mano, sin publicId)
    imageUrl: { type: String, default: '' },
    images: { type: [productImageSchema], default: [] },
    emoji: { type: String, default: '🌿' },
  },
  { timestamps: true },
)

export default mongoose.model('Product', productSchema)
