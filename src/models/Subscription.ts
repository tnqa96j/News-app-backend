import { Schema, model, Document, Types } from "mongoose";

export interface ISubscription {
  userId: Types.ObjectId;
  sourceName: string;
  sourceId: string;
  createdAt: Date;
}

export interface ISubscriptionDocument extends ISubscription, Document {}

const subscriptionSchema = new Schema<ISubscriptionDocument>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    sourceName: {
      type: String,
      required: true,
    },
    sourceId: {
      type: String,
      required: true,
    },
  },
  { timestamps: true },
);

subscriptionSchema.index(
  {
    userId: 1,
    sourceId: 1,
  },
  { unique: true },
);

export default model<ISubscriptionDocument>("Subscription", subscriptionSchema);
