import express from "express";
import {
	setupDirectories,
	convertVideo,
	downloadRawVideo,
	deleteRawVideo,
	deleteProcessedVideo,
	uploadProcessedVideo
} from "./storage"
import {Request, Response} from 'express';

setupDirectories();

const app = express();
app.use(express.json())

app.post('/process-video', async (req, res): Promise<void> => {

	// Get the bucket and filename from the Cloud Pub/Sub message
	let data;
	try {
	  const message = Buffer.from(req.body.message.data, 'base64').toString('utf8');
	  data = JSON.parse(message);
	  if (!data.name) {
		throw new Error('Invalid message payload received.');
	  }
	} catch (error) {
	  console.error(error);
	  res.status(400).send('Bad Request: missing filename.');
	  return
	}

	const inputFileName = data.name;
	const outputFileName = `processed-${inputFileName}`;

	// Download the raw video from Cloud Storage
	await downloadRawVideo(inputFileName);

	try {
		// Process the video into 360p
		await convertVideo(inputFileName, outputFileName);
	  
		// Upload the processed video to Cloud Storage
		await uploadProcessedVideo(outputFileName);
	  } catch (err) {
		res.status(500).send('Processing failed');
		return;
	  } finally {
		// Ensure cleanup happens no matter what
		await Promise.all([
		  deleteRawVideo(inputFileName),
		  deleteProcessedVideo(outputFileName)
		]);
	  }
	  

	res.status(200).send('Processing finished successfully');
  });

app.get("/", async (req, res) => {
	res.status(200).send("Welcome to the video processing service")
})

const port = process.env.PORT || 3000;
app.listen(port, () => {
	console.log(`Video processing service listening at http://localhost:${port}`)
});

