import {Storage, UploadOptions} from '@google-cloud/storage'
import ffmpeg from "fluent-ffmpeg";
import path from 'node:path'
import * as fs from 'node:fs/promises';
import {mkdirSync} from 'node:fs';

const storage = new Storage();

const rawVideoBucketName = 'ap-yt-raw-videos'
const processedVideoBucketName = 'ap-yt-processed-videos'
const localRawVideoPath = './raw-videos'
const localProcessedVideoPath = './processed-videos'

/**
 * Creates the local directories for raw and processed videos.
 */
export function setupDirectories() {
	console.log("Setting up service directories.");
	ensureDirectoryExists(localRawVideoPath);
	ensureDirectoryExists(localProcessedVideoPath);
}

export function convertVideo(rawVideoName: string, processedVideoName: string): Promise<void> {
	return new Promise((resolve, reject) => {
		const inputPath = path.join(localRawVideoPath, rawVideoName);
		const outputPath = path.join(localProcessedVideoPath, processedVideoName);

		console.log(`Starting video processing: ${inputPath} -> ${outputPath}`);

		ffmpeg(inputPath)
			.outputOptions("-vf", "scale=-1:360") // 360p
			.on("start", (cmdline) => console.log("FFmpeg command:", cmdline))
			.on("progress", (progress) => {
				if (progress.percent) console.log(`Processing: ${progress.percent}% done`);
			})
			.on("end", async () => {
				console.log(`Video processing completed: ${outputPath}`);
				
				// Ensure the file exists
				try {
					await fs.access(outputPath);
					console.log(`Verified processed file exists: ${outputPath}`);
					resolve();
				} catch (err) {
					console.error(`Error: Processed file not found after conversion: ${outputPath}`, err);
					reject(new Error(`Processed file not found: ${outputPath}`));
				}
			})
			.on("error", (err) => {
				console.log(`FFmpeg error: ${err.message}`);
				reject(err);
			})
			.save(outputPath);
	});
}

export async function downloadRawVideo(fileName: string): Promise<void>{
	const filePath = path.join(localRawVideoPath, fileName)
	const options = {destination: filePath};

	// Downloads the file
	console.log(`Downloading file:${fileName} from ${rawVideoBucketName}`)
	await storage.bucket(rawVideoBucketName).file(fileName).download(options);

	console.log(`gs://${rawVideoBucketName}/${fileName} downloaded to ${filePath}.`);
}
export async function uploadProcessedVideo(fileName: string): Promise<void> {
	const bucket = storage.bucket(processedVideoBucketName);
	const filePath = path.join(localProcessedVideoPath, fileName);
	const options = { destination: fileName } as UploadOptions;

	console.log(`Starting upload of ${filePath} to ${processedVideoBucketName}`);

	try {
		await bucket.upload(filePath, options);
		console.log(`${fileName} uploaded successfully.`);

		await bucket.file(fileName).makePublic();
		console.log(`File made public: gs://${processedVideoBucketName}/${fileName}`);
	} catch (error) {
		console.error(`Upload failed for ${filePath}:`, error);
		throw error;
	}
}

export async function deleteRawVideo(fileName: string): Promise<void> {
	await deleteFile(path.join(localRawVideoPath, fileName))
}

export async function deleteProcessedVideo(fileName: string): Promise<void> {
	await deleteFile(path.join(localProcessedVideoPath, fileName))
}

async function deleteFile(filePath: string): Promise<void> {
	try {
		await fs.unlink(filePath);
		console.log(`Successfully deleted ${filePath}`)
	} catch (error) {
		if (error instanceof Error) {
			console.log("There was an error:", error.message);
		} else {
			console.log("An unknown error occurred:", error);
		}
	}
}

function ensureDirectoryExists(dirName: string) {
	try {
		mkdirSync(dirName, {recursive: true})
		console.log(`Created ${dirName}`);
	} catch (err) {
		console.error(`An error occured while creating the required directories ${err}`)
		throw err
	}
}