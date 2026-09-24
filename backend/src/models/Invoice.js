import mongoose from 'mongoose'

const PAYMENT_METHODS = ['efectivo', 'tarjeta', 'transferencia', 'nequi_daviplata']

const invoiceItemSchema = new mongoose.Schema(
  {
    inventoryItemId: { type: mongoose.Schema.Types.ObjectId, ref: 'InventoryItem', required: true },
    name: { type: String, required: true },
    quantity: { type: Number, required: true, min: 1 },
    unitPrice: { type: Number, required: true, min: 0 },
    discountPercent: { type: Number, min: 0, max: 100, default: 0 },
    subtotal: { type: Number, required: true, min: 0 },
  },
  { _id: false },
)

const paymentSchema = new mongoose.Schema(
  {
    method: { type: String, enum: PAYMENT_METHODS, required: true },
    amount: { type: Number, required: true, min: 0 },
  },
  { _id: false },
)

const invoiceSchema = new mongoose.Schema(
  {
    invoiceNumber: { type: Number, required: true, unique: true },
    cashier: { type: String, default: '' },
    customerName: { type: String, required: true, trim: true, default: 'Consumidor final' },
    customerPhone: { type: String, default: '' },
    customerEmail: { type: String, default: '' },
    items: { type: [invoiceItemSchema], required: true },
    subtotal: { type: Number, required: true, min: 0 },
    discountTotal: { type: Number, min: 0, default: 0 },
    taxRate: { type: Number, min: 0, default: 0 },
    taxTotal: { type: Number, min: 0, default: 0 },
    total: { type: Number, required: true, min: 0 },
    payments: { type: [paymentSchema], required: true },
    changeGiven: { type: Number, min: 0, default: 0 },
    paymentMethod: { type: String, enum: [...PAYMENT_METHODS, 'mixto'], required: true },
    status: { type: String, enum: ['pagada', 'anulada', 'pendiente'], default: 'pagada' },
    notes: { type: String, default: '' },
  },
  { timestamps: true },
)

export default mongoose.model('Invoice', invoiceSchema)
export { PAYMENT_METHODS }
