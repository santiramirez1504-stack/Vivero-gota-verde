import mongoose from 'mongoose'

const settingsSchema = new mongoose.Schema(
  {
    key: { type: String, unique: true, default: 'site' },
    siteEnabled: { type: Boolean, default: true },
    maintenanceMessage: { type: String, default: 'Estamos realizando mejoras. Vuelve pronto.' },
  },
  { timestamps: true },
)

export default mongoose.model('Settings', settingsSchema)
