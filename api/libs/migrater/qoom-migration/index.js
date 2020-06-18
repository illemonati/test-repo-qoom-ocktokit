import { downloadAsZip } from './download.js';
import { connectToGithub } from './github.js';
import { uploadZip } from './uploadZip.js';


const main = async () => {
	const qoomFileDownloadButton = document.getElementById('qoomFileDownloadButton');
	qoomFileDownloadButton.addEventListener('click', downloadAsZip);
	const connectToGithubButton = document.getElementById('connectToGithubButton');
	connectToGithubButton.addEventListener('click', connectToGithub);
	const qoomFileUploadButton = document.getElementById('qoomFileUploadButton');
	qoomFileUploadButton.addEventListener('click', uploadZip);
}

main().then();