import mongoose from 'mongoose'

const lossSchema = new mongoose.Schema(
  {
    productName: { type: String, required: true, trim: true },
    quantity: { type: Number, required: true, min: 1 },
    reason: { type: String, enum: ['plagas', 'clima', 'accidente', 'otro'], required: true },
    estimatedValue: { type: Number, min: 0, default: 0 },
    notes: { type: String, default: '' },
  },
  { timestamps: true },
)

export default mongoose.model('Loss', lossSchema)
