import mongoose from 'mongoose'

const inventoryItemSchema = new mongoose.Schema(
  {
    commonName: { type: String, required: true, trim: true },
    scientificName: { type: String, default: '', trim: true },
    barcode: { type: String, default: '', trim: true },
    price: { type: Number, min: 0, default: 0 },
    growthTime: { type: String, default: '' },
    wateringFrequency: { type: String, default: '' },
    fertilizerType: { type: String, default: '' },
    minStock: { type: Number, min: 0, default: 5 },
    stock: {
      semillero: { type: Number, min: 0, default: 0 },
      crecimiento: { type: Number, min: 0, default: 0 },
      listoVenta: { type: Number, min: 0, default: 0 },
    },
    notes: { type: String, default: '' },
  },
  { timestamps: true },
)

export default mongoose.model('InventoryItem', inventoryItemSchema)
