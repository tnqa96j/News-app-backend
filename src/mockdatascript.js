// Mock Data Generator Script
// Document count: 10
import { faker } from "@faker-js/faker";
// Database and collection configuration - edit these to target a different location
const DB_NAME = "News";
const COLL_NAME = "comments";
// Connect to database
use(DB_NAME);
// Document generation function
function generateDocument() {
  return {
    _id: new ObjectId(),
    __v: faker.number.int(),
    content: faker.lorem.paragraph(),
    createdAt: faker.date.recent(),
    dislikes: Array.from(
      { length: 1 },
      () => new ObjectId()
    ),
    isEdited: faker.datatype.boolean(),
    likes: Array.from(
      { length: 1 },
      () => new ObjectId()
    ),
    newsId: new ObjectId(),
    parentCommentId: new ObjectId(),
    replyCount: faker.number.int(),
    updatedAt: faker.date.recent(),
    userId: new ObjectId()
  };
}
const BATCH_SIZE = 1000; // Number of documents to insert per batch
const TOTAL_DOCUMENTS = 10;
const numBatches = Math.ceil(
  TOTAL_DOCUMENTS / BATCH_SIZE
);
console.log(
  `Starting mock data generation for ${DB_NAME}.${COLL_NAME}`
);
console.log(
  `Total documents to generate: ${TOTAL_DOCUMENTS} documents`
);
console.log(
  `Batch size: ${BATCH_SIZE} documents per batch`
);
const startTime = new Date();
for (
  let batchStart = 0;
  batchStart < TOTAL_DOCUMENTS;
  batchStart += BATCH_SIZE
) {
  const batchEnd = Math.min(
    batchStart + BATCH_SIZE,
    TOTAL_DOCUMENTS
  );
  const batchSize = batchEnd - batchStart;
  console.log(
    `Generating batch ${
      Math.floor(batchStart / BATCH_SIZE) + 1
    } of ${numBatches} (${batchSize} documents)...`
  );
  // Generate documents for this batch
  const batchDocuments = [];
  for (let i = 0; i < batchSize; i++) {
    batchDocuments.push(generateDocument());
  }
  // Insert the batch
  db.getCollection(COLL_NAME).insertMany(
    batchDocuments
  );
  console.log(`Batch inserted successfully.`);
}
const endTime = new Date();
const duration = (
  (endTime - startTime) /
  1000
).toFixed(2);
console.log(
  `\n=== Mock Data Generation Complete ===`
);
console.log(`Total time: ${duration} seconds`);
console.log(
  `Collection: ${DB_NAME}.${COLL_NAME}`
);