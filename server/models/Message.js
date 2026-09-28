import mongoose from 'mongoose';

const messageSchema = new mongoose.Schema(
  {
    project: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Project',
      default: null,
      index: true,
    },
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    recipient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
      index: true,
    },
    message: {
      type: String,
      required: true,
      trim: true,
      minlength: 1,
      maxlength: 4000,
    },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

messageSchema.pre('validate', function validateMessageDestination() {
  if (Boolean(this.project) === Boolean(this.recipient)) {
    this.invalidate('recipient', 'A message must belong to one project or one direct conversation.');
  }
  if (this.recipient?.equals(this.sender)) {
    this.invalidate('recipient', 'A user cannot send a direct message to themselves.');
  }
});

messageSchema.index({ sender: 1, recipient: 1, createdAt: -1 });
messageSchema.index({ recipient: 1, sender: 1, createdAt: -1 });

const Message = mongoose.model('Message', messageSchema);

export default Message;