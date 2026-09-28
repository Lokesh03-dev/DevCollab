import mongoose from 'mongoose';

const activityTypes = [
  'project_created',
  'member_added',
  'member_removed',
  'task_created',
  'task_assigned',
  'task_completed',
  'comment_added',
  'code_file_created',
  'code_file_updated',
  'code_file_deleted',
  'github_connected',
];

const activitySchema = new mongoose.Schema(
  {
    project: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Project',
      required: true,
      index: true,
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    type: {
      type: String,
      enum: activityTypes,
      required: true,
    },
    description: {
      type: String,
      required: true,
      trim: true,
      maxlength: 500,
    },
    relatedTask: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Task',
      default: null,
    },
    relatedFile: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'CodeFile',
      default: null,
    },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

activitySchema.index({ project: 1, createdAt: -1 });

const Activity = mongoose.model('Activity', activitySchema);

export default Activity;