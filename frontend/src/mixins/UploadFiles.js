import axios from "axios";

function waitFrame() {
    return new Promise(resolve => {
        requestAnimationFrame(resolve);
    });
}

export default {
    data() {
        return {
            photos: [],
            videos: [],
            other: [],
        }
    },
    methods: {
        async loadToBrowser(file) {
            return new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.readAsArrayBuffer(file);
                reader.onprogress = () => requestAnimationFrame;
                reader.onload = () => resolve(reader.result);
                reader.onerror = error => reject(error);
            });
        },
        async arrayBufferToBase64( buffer ) {
            const DRAW_INTERVALS = 100;
            let binary = '';
            let bytes = new Uint8Array( buffer );
            let len = bytes.byteLength;
            let redrawEveryNBytes = Math.ceil(len / DRAW_INTERVALS);

            for (let i = 0; i < len; i++) {
                binary += String.fromCharCode( bytes[ i ] );
                let toggleRedraw = i % redrawEveryNBytes === 0;
                if (toggleRedraw) {
                    await waitFrame();
                }
            }
            return btoa( binary );
        },
        async getDataUrl(file) {
            let buffer = await this.loadToBrowser(file);
            let base64Src = await this.arrayBufferToBase64(buffer);
            return `data:${file.type};base64,${base64Src}`;
        },
        async uploadToServer(file) {
            let requestData = new FormData();
            requestData.append('file', file);

            let {data} = await axios.post( '/api/file/link',
                requestData,
                {
                    headers: {
                        'Content-Type': 'multipart/form-data'
                    }
                }
            );

            return data;
        },

        async addFile(event) {
            event.preventDefault();
            this.$store.commit('setLoading', true);

            try {
                let file = event.file;
                let [fileType] = file.type.split('/');

                let dataUrl;
                let uploadData;

                switch (fileType) {
                    case 'image':
                        dataUrl = await this.getDataUrl(file);
                        this.photos.push({
                            file,
                            src: dataUrl,
                            type: file.type,
                            name: file.name,
                        });
                        break;
                    case 'video':
                        uploadData = await this.uploadToServer(file);

                        this.videos.push({
                            file,
                            serverFile: uploadData.file,
                            src: uploadData.link,
                            type: file.type,
                            name: file.name,
                        });
                        break;
                    default:
                        dataUrl = await this.getDataUrl(file);
                        this.other.push({
                            file,
                            src: dataUrl,
                            type: file.type,
                            name: file.name,
                        });
                        break;
                }
            }
            catch (e) {
                this.$store.commit('setErrorMessage', 'Ошибка загрузки файла: ' + e.toString());
            }
            finally {
                this.$store.commit('setLoading', false);
            }

        },
        deletePhoto(index) {
            this.photos.splice(index, 1);
        },
        async deleteVideo(index) {
            let video = this.videos[index];
            let {data} = await axios.post( '/api/file/delete', {file: video.serverFile});
            if (data.success) {
                this.videos.splice(index, 1);
            }
            else {
                this.$store.commit('setErrorMessage', 'Ошибка удаления файла: ' + data.error);
            }
        },
        deleteFile(index) {
            this.other.splice(index, 1);
        },
    }
}