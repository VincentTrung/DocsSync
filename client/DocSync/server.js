import express from "express";

const app = express();
const PORT = 8080; // for deployment on gcloud

app.listen(PORT, () => {
  console.log(`Frontend is running on port ${PORT}`);
});
