import mongoose from 'mongoose';

const projectSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      minlength: 1,
      maxlength: 100,
    },
    description: {
      type: String,
      trim: true,
      maxlength: 2000,
      default: '',
    },
    startDate: {
      type: Date,
      default: null,
    },
    endDate: {
      type: Date,
      default: null,
    },
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    members: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
    ],
    status: {
      type: String,
      enum: ['planning', 'active', 'completed'],
      default: 'planning',
    },
    technologies: {
      type: [{ type: String, trim: true, minlength: 1, maxlength: 50 }],
      default: [],
    },
    githubRepository: {
      type: String,
      trim: true,
      match: [/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/, 'GitHub repository must use owner/repo format'],
      default: null,
    },
  },
  { timestamps: true },
);

const Project = mongoose.model('Project', projectSchema);

export default Project;