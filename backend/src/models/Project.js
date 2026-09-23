import mongoose from 'mongoose'

const mediaItemSchema = new mongoose.Schema(
  {
    type: { type: String, enum: ['image', 'video'], required: true },
    url: { type: String, required: true },
    publicId: { type: String, required: true },
  },
  { _id: false },
)

const projectSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    category: { type: String, required: true },
    location: { type: String, default: '' },
    description: { type: String, default: '' },
    media: { type: [mediaItemSchema], default: [] },
  },
  { timestamps: true },
)

export default mongoose.model('Project', projectSchema)
