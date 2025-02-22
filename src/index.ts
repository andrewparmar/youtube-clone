import express from "express";
import ffmpeg from "fluent-ffmpeg"

const app = express();
app.use(express.json())

app.post("/process-video", (req, res) => {
	console.log(req.body);
	const inputFilePath = req.body.inputFilePath;
	const outputFilePath = req.body.outputFilePath;

	if (!inputFilePath || !outputFilePath) {
		res.status(400).send("Bad Request: Missing file path.")
	}

	ffmpeg(inputFilePath)
		.outputOptions("-vf", "scale=-1:360") // 360p
		.on("end", () => {
			res.status(200).send("Video processing completed.")
		})
		.on("error", (err) => {
			console.log(`Error: ${err.message}`);
			res.status(500).send(`Internal Server Error: ${err.message}`);
		})
		.save(outputFilePath);
});

const port = process.env.PORT || 3000;
app.listen(port, () => {
	console.log(`Video processing service listening at http://localhost:${port}`)
});