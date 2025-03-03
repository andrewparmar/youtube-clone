import express from "express";
import {setupDirectories, convertVideo} from "./storage"

setupDirectories();

const app = express();
app.use(express.json())

app.post("/process-video", async (req, res) => {
	console.log(req.body);
	const inputFilePath = req.body.inputFilePath;
	const outputFilePath = req.body.outputFilePath;

	if (!inputFilePath || !outputFilePath) {
		res.status(400).send("Bad Request: Missing file path.")
	}

	await convertVideo(inputFilePath, outputFilePath)

	res.status(200).send("Video processing complete.")
});

app.get("/", async (req, res) => {
	res.status(200).send("Welcome to the video processing service")
})

const port = process.env.PORT || 3000;
app.listen(port, () => {
	console.log(`Video processing service listening at http://localhost:${port}`)
});