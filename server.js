const express = require("express");
const multer = require("multer");
const AWS = require("aws-sdk");
const cors = require("cors");
require("dotenv").config();

const app = express();
const upload = multer({ storage: multer.memoryStorage() });

// Enable CORS
app.use(cors());
app.use(express.json());

// Configure AWS
AWS.config.update({
  //   accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  //   secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: process.env.AWS_REGION || "us-east-1",
});

const rekognition = new AWS.Rekognition();
const s3 = new AWS.S3();

// Configuration
const BUCKET_NAME = process.env.S3_BUCKET_NAME;
const REFERENCE_IMAGES_PREFIX = process.env.REFERENCE_IMAGES_PREFIX || "tejas/"; // Folder in S3 with Tejas's photos
const SIMILARITY_THRESHOLD = parseFloat(
  process.env.SIMILARITY_THRESHOLD || "80",
); // 80% similarity threshold

/**
 * Endpoint to verify if the captured image matches Tejas
 */
app.post("/verify", upload.single("image"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No image file provided" });
    }

    console.log("Received image for verification");

    // Get all reference images of Tejas from S3
    const referenceImages = await getReferenceImages();

    if (referenceImages.length === 0) {
      return res.status(500).json({
        error:
          "No reference images found in S3. Please upload Tejas images first.",
      });
    }

    console.log(`Found ${referenceImages.length} reference images`);

    // Compare captured image with each reference image
    let maxSimilarity = 0;
    let isMatch = false;

    for (const referenceKey of referenceImages) {
      const similarity = await compareFaces(req.file.buffer, referenceKey);

      if (similarity > maxSimilarity) {
        maxSimilarity = similarity;
      }

      if (similarity >= SIMILARITY_THRESHOLD) {
        isMatch = true;
      }
    }

    console.log(`Max similarity: ${maxSimilarity}%`);

    res.json({
      isMatch,
      confidence: maxSimilarity / 100,
      threshold: SIMILARITY_THRESHOLD,
      message: isMatch ? "Face verified as Tejas" : "Face does not match Tejas",
    });
  } catch (error) {
    console.error("Verification error:", error);
    res.status(500).json({
      error: "Verification failed",
      details: error.message,
    });
  }
});

/**
 * Get list of reference images from S3
 */
async function getReferenceImages() {
  try {
    const params = {
      Bucket: BUCKET_NAME,
      //   Prefix: REFERENCE_IMAGES_PREFIX,
    };

    console.log("____________");
    console.log(params);

    const data = await s3.listObjectsV2(params).promise();
    console.log("data");
    console.log(data);

    // Filter only image files (jpg, jpeg, png)
    return data.Contents.filter((item) => {
      const key = item.Key.toLowerCase();
      return (
        (key.endsWith(".jpg") ||
          key.endsWith(".jpeg") ||
          key.endsWith(".png")) &&
        item.Size > 0
      );
    }).map((item) => item.Key);
  } catch (error) {
    console.error("Error listing S3 objects:", error);
    throw error;
  }
}

/**
 * Compare captured face with reference image using AWS Rekognition
 */
async function compareFaces(capturedImageBuffer, referenceImageKey) {
  try {
    const params = {
      SourceImage: {
        Bytes: capturedImageBuffer,
      },
      TargetImage: {
        S3Object: {
          Bucket: BUCKET_NAME,
          Name: referenceImageKey,
        },
      },
      SimilarityThreshold: 0, // We'll handle threshold ourselves to get max similarity
    };

    const result = await rekognition.compareFaces(params).promise();

    if (result.FaceMatches && result.FaceMatches.length > 0) {
      // Return the highest similarity score
      const similarities = result.FaceMatches.map((match) => match.Similarity);
      return Math.max(...similarities);
    }

    return 0; // No face match found
  } catch (error) {
    console.error(`Error comparing with ${referenceImageKey}:`, error.message);
    return 0; // Return 0 similarity on error
  }
}

/**
 * Health check endpoint
 */
app.get("/health", (req, res) => {
  res.json({
    status: "OK",
    bucket: BUCKET_NAME,
    prefix: REFERENCE_IMAGES_PREFIX,
    threshold: SIMILARITY_THRESHOLD,
  });
});

const PORT = process.env.PORT || 3001;
if (process.env !== "prod") {
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`S3 Bucket: ${BUCKET_NAME}`);
    console.log(`Reference Images Prefix: ${REFERENCE_IMAGES_PREFIX}`);
    console.log(`Similarity Threshold: ${SIMILARITY_THRESHOLD}%`);
  });
}

module.exports = app;
