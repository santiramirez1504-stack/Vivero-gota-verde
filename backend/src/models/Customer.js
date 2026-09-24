import mongoose from 'mongoose'

const customerSchema = new mongoose.Schema(
  {
    phone: { type: String, required: true, unique: true, trim: true },
    name: { type: String, required: true, trim: true },
    totalOrders: { type: Number, default: 0 },
    totalSpent: { type: Number, default: 0 },
    lastOrderAt: { type: Date, default: Date.now },
  },
  { timestamps: true },
)

export default mongoose.model('Customer', customerSchema)
