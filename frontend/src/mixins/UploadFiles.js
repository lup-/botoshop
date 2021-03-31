import axios from "axios";

export default {
    data() {
        return {
            photos: [],
            videos: [],
            other: [],
        }
    },
    methods: {
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

                let uploadData = await this.uploadToServer(file);
                let fileData = {
                    file,
                    serverFile: uploadData.file,
                    src: uploadData.link,
                    type: file.type,
                    name: file.name,
                };

                switch (fileType) {
                    case 'image':
                        if (!this.photos) {
                            this.photos = [];
                        }
                        this.photos.push(fileData);
                        break;
                    case 'video':
                        if (!this.videos) {
                            this.videos = [];
                        }

                        this.videos.push(fileData);
                        break;
                    default:
                        if (!this.other) {
                            this.other = [];
                        }

                        this.other.push(fileData);
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
            return this.deleteFile(index, 'photos');
        },
        deleteVideo(index) {
            return this.deleteFile(index, 'videos');
        },
        async deleteFile(index, target = 'other') {
            let file = this[target][index];
            let {data} = await axios.post( '/api/file/delete', {file: file.serverFile});
            if (data.success) {
                this[target].splice(index, 1);
            }
            else {
                this.$store.commit('setErrorMessage', 'Ошибка удаления файла: ' + data.error);
            }
        },
    }
}