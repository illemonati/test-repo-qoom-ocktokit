import axios from 'https://cdn.pika.dev/axios@^0.19.2';


const displaySize = (size) => {
	const MBSize = (size / (1024**2)).toFixed(2);
	if (MBSize === '0.00') {
		return size.toFixed(2) + "B";
	}
	return MBSize + "MB";
}

export const uploadZip = async () => {
	console.log(axios);
	console.log('uploadZip');
	const uploadZipFileInput = document.getElementById('uploadZipFileInput');
	console.log(uploadZipFileInput);
	const files = uploadZipFileInput.files;
	if (files.length != 1) return;
	const zipFile = files[0];
	console.log(zipFile);
	const formData = new FormData();
    formData.append('zipFile', zipFile);
    const uploadInfoDisplayInfo = document.getElementById('uploadInfoDisplayInfo');
    const uploadInfoDisplayProgress = document.getElementById('uploadInfoDisplayProgress');
    uploadInfoDisplayInfo.innerText = `Uploading ${zipFile.name} - ${displaySize(zipFile.size)}`;
    uploadInfoDisplayProgress.style.display = 'block';
    uploadInfoDisplayProgress.max = zipFile.size;
    uploadInfoDisplayProgress.value = 0;
	const resp = await axios.post(
		'../upload-zip',
		formData,
		{
			onUploadProgress: async ( progressEvent ) => {
        		uploadInfoDisplayProgress.value = progressEvent.loaded;
			}
		}
	);
	console.log(resp);
};