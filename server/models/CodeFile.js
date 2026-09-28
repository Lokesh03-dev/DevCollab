import mongoose from 'mongoose';

const codeFileSchema = new mongoose.Schema(
  {
    project: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Project',
      required: true,
      index: true,
    },
    fileName: {
      type: String,
      required: true,
      trim: true,
      maxlength: 120,
    },
    path: {
      type: String,
      required: true,
      trim: true,
      maxlength: 500,
    },
    language: {
      type: String,
      required: true,
      trim: true,
      maxlength: 50,
      default: 'plaintext',
    },
    content: {
      type: String,
      default: '',
      maxlength: 1000000,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
  },
  { timestamps: true },
);

codeFileSchema.index({ project: 1, path: 1 }, { unique: true });

const CodeFile = mongoose.model('CodeFile', codeFileSchema);

export default CodeFile;