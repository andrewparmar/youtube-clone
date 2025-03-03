import {Storage, UploadOptions} from '@google-cloud/storage'
import ffmpeg from "fluent-ffmpeg";
import path from 'node:path'
import * as fs from 'node:fs/promises';
import {mkdirSync} from 'node:fs';

const storage = new Storage();

const rawVideoBucketName = ''
const processedVideoBucketName = ''
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
		ffmpeg(path.join(localRawVideoPath, rawVideoName))
			.outputOptions("-vf", "scale=-1:360") // 360p
			.on("progress", progress => {
				if (progress.percent) console.log(`Processing: ${progress.percent}% done`)
			})
			.on("end", () => {
				console.log("Video processing completed.");
				resolve();
			})
			.on("error", (err) => {
				console.log(`Error: ${err.message}`);
				reject(err);
			})
			.save(path.join(localProcessedVideoPath, processedVideoName));
	})
}

export async function downloadRawVideo(fileName: string): Promise<void>{
	const filePath = path.join(localRawVideoPath, fileName)
	const options = {destination: filePath};

	// Downloads the file
	await storage.bucket(processedVideoBucketName).file(fileName).download(options);

	console.log(`gs://${rawVideoBucketName}/${fileName} downloaded to ${filePath}.`);
}

export async function uploadProcessedVideo(fileName: string): Promise<void> {
	const bucket = storage.bucket(processedVideoBucketName)
	const options = {destination: fileName} as UploadOptions;

	await bucket.upload(fileName, options);
	console.log(`${fileName} uploaded to ${processedVideoBucketName}`);

	await bucket.file(fileName).makePublic();
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

// async function ensureDirectoryExists(dirName: string){
// 	try {
// 		await fs.mkdir(dirName);
// 		console.log(`Created ${dirName}`);
// 	} catch (error) {
// 		if (error instanceof Error) {
// 			console.log("There was an error:", error.message);
// 		} else {
// 			console.log("An unknown error occurred:", error);
// 		}
// 	}
// }

function ensureDirectoryExists(dirName: string) {
	try {
		mkdirSync(dirName, {recursive: true})
		console.log(`Created ${dirName}`);
	} catch (err) {
		console.log("An error occured while creating the required directories")
		throw err
	}
}