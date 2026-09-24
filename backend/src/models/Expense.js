import mongoose from 'mongoose'

export const EXPENSE_CATEGORIES = ['insumos', 'servicios', 'logistica', 'mantenimiento', 'otro']
export const EXPENSE_PAYMENT_METHODS = ['efectivo', 'tarjeta', 'transferencia', 'nequi_daviplata']

const expenseSchema = new mongoose.Schema(
  {
    vendor: { type: String, required: true, trim: true },
    concept: { type: String, required: true, trim: true },
    category: { type: String, enum: EXPENSE_CATEGORIES, default: 'otro' },
    paymentMethod: { type: String, enum: EXPENSE_PAYMENT_METHODS, required: true },
    amount: { type: Number, required: true, min: 0 },
    notes: { type: String, default: '' },
  },
  { timestamps: true },
)

export default mongoose.model('Expense', expenseSchema)
