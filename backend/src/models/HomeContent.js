import mongoose from 'mongoose'

const statSchema = new mongoose.Schema(
  {
    value: { type: String, required: true, trim: true },
    label: { type: String, required: true, trim: true },
  },
  { _id: false },
)

const homeContentSchema = new mongoose.Schema(
  {
    key: { type: String, unique: true, default: 'home' },

    colors: {
      primary: { type: String, default: '' },
      textDark: { type: String, default: '' },
    },

    logoUrl: { type: String, default: '' },
    logoPublicId: { type: String, default: '' },

    backgroundUrl: { type: String, default: '' },
    backgroundPublicId: { type: String, default: '' },

    hero: {
      badge: { type: String, default: '' },
      title: { type: String, default: '' },
      description: { type: String, default: '' },
      imageUrl: { type: String, default: '' },
      imagePublicId: { type: String, default: '' },
      floatingTitle: { type: String, default: '' },
      floatingDescription: { type: String, default: '' },
    },

    stats: { type: [statSchema], default: [] },

    cta: {
      title: { type: String, default: '' },
      description: { type: String, default: '' },
    },

    footer: {
      tagline: { type: String, default: '' },
      address: { type: String, default: '' },
      phone: { type: String, default: '' },
      email: { type: String, default: '' },
      instagram: { type: String, default: '' },
      facebook: { type: String, default: '' },
      whatsapp: { type: String, default: '' },
    },
  },
  { timestamps: true },
)

export default mongoose.model('HomeContent', homeContentSchema)
