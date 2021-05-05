<template>
    <v-container class="fill-height align-start">
        <v-row>
            <v-col cols="12">
                <v-card>
                    <v-card-title>{{isNew ? 'Новый товар' : 'Редактирование товара'}}</v-card-title>
                    <v-card-text>
                        <v-form autocomplete="off">

                            <v-row class="mt-4">
                                <v-col cols="12">
                                    <v-text-field
                                            v-model="item.title"
                                            label="Название товара"
                                    ></v-text-field>
                                </v-col>
                            </v-row>

                            <v-row class="mt-4">
                                <v-col cols="12">
                                    <v-file-input
                                            ref="fileInput"
                                            v-model="photo"
                                            @change="addPhoto"
                                            hint="Фотографии товара"
                                            persistent-hint
                                    ></v-file-input>
                                </v-col>
                            </v-row>

                            <v-row class="my-4" v-if="item.photos && item.photos.length > 0">
                                <v-col cols="12">
                                    <v-chip v-for="(photo, index) in item.photos" :key="photo.name"
                                            class="mr-2 mb-2"
                                            close
                                            close-icon="mdi-delete"
                                            @click:close="deletePhoto(index)"
                                    >
                                        <v-avatar left>
                                            <v-img :src="photo.src"></v-img>
                                        </v-avatar>
                                        {{photo.name}}
                                    </v-chip>
                                </v-col>
                            </v-row>

                            <v-autocomplete
                                    :items="categories"
                                    v-model="item.categories"
                                    chips
                                    deletable-chips
                                    multiple
                                    item-text="title"
                                    item-value="id"
                                    label="Категории"
                            ></v-autocomplete>

                            <v-row class="mt-4">
                                <v-col cols="12">
                                    <v-text-field
                                            v-model="item.price"
                                            label="Цена"
                                            type="number"
                                    ></v-text-field>
                                </v-col>
                            </v-row>


                            <v-row class="mt-4">
                                <v-col cols="12">
                                    <v-text-field
                                            v-model="item.originalPrice"
                                            label="Старая стоимость"
                                            hint="Для скидки"
                                            persistent-hint
                                            type="number"
                                    ></v-text-field>
                                </v-col>
                            </v-row>

                            <v-row class="mt-4">
                                <v-col cols="12">
                                    <v-file-input
                                            ref="fileInput"
                                            v-model="file"
                                            @change="addFile"
                                            hint="Прикрепить файл для скачиваемых товаров"
                                            persistent-hint
                                    ></v-file-input>
                                </v-col>
                            </v-row>

                            <v-row class="my-4" v-if="files && files.length > 0">
                                <v-col cols="12">Файлы:</v-col>
                                <v-col cols="12">
                                    <v-chip v-for="(file, index) in files" :key="file.name"
                                            class="mr-2 mb-2"
                                            close
                                            close-icon="mdi-delete"
                                            @click:close="deleteFile(index)"
                                    >
                                        {{file.name}}
                                    </v-chip>
                                </v-col>
                            </v-row>

                            <v-row class="mt-4 no-files">
                                <v-col cols="12">
                                    <vue-trix
                                            v-model="item.description"
                                    ></vue-trix>
                                </v-col>
                            </v-row>

                        </v-form>
                    </v-card-text>
                    <v-card-actions>
                        <v-btn @click="gotoList">К списку</v-btn>
                        <v-btn large color="primary" @click="save">Сохранить</v-btn>
                    </v-card-actions>
                </v-card>
            </v-col>
        </v-row>
    </v-container>
</template>

<script>
    import axios from "axios";
    import CrudEdit from '@/components/CrudEdit';

    export default {
        extends: CrudEdit,
        data() {
            return {
                item: {},
                file: null,
                files: [],

                ACTION_LOAD: 'product/loadItems',
                ACTION_NEW: 'product/newItem',
                ACTION_SAVE: 'product/saveItem',
                ACTION_SET_EDIT_ITEM: 'product/setEditItem',
                ROUTE_LIST: 'productsList',
                STORE_MODULE: 'product'
            }
        },
        async created() {
            if (this.itemId) {
                if (this.allItems.length === 0) {
                    await this.$store.dispatch(this.ACTION_LOAD);
                }

                this.$store.dispatch(this.ACTION_SET_EDIT_ITEM, this.itemId);
                this.$store.dispatch('category/loadItems');
            }
        },
        watch: {
            storeItem() {
                if (this.storeItem) {
                    this.item = this.storeItem;
                    this.files = this.storeItem.files || [];
                }
            },
        },
        methods: {
            async addPhoto(photo) {
                if (!photo) {
                    return;
                }
                let uploadedPhoto = await this.addFileApi(photo);
                if (!this.item.photos) {
                    this.$set(this.item, 'photos', []);
                }

                this.item.photos.push(uploadedPhoto);
                this.photo = null;
            },
           async deletePhoto(index) {
                let file = this.item.photos[index];
                let deleteSuccess = await this.deleteFileApi(file);
                if (deleteSuccess) {
                    this.item.photos.splice(index, 1);
                }
            },
            async save() {
                this.item.files = this.files;
                this.item.price = parseFloat(this.item.price) || 0;
                this.item.originalPrice = parseFloat(this.item.originalPrice) || 0;

                if (this.isNew()) {
                    await this.$store.dispatch(this.ACTION_NEW, this.item);
                }
                else {
                    await this.$store.dispatch(this.ACTION_SAVE, this.item);
                }

                return this.gotoList();
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

            async addFileApi(file) {
                let uploadData = await this.uploadToServer(file);

                return {
                    file,
                    serverFile: uploadData.file,
                    src: uploadData.link,
                    type: file.type,
                    name: file.name,
                };
            },

            async addFile(file) {
                if (!file) {
                    return;
                }
                let uploadedFile = await this.addFileApi(file);

                if (!this.files) {
                    this.files = [];
                }

                this.files.push(uploadedFile);
                this.file = null;
            },

            async deleteFileApi(file) {
                let isValidFile = file && file.serverFile;

                if (isValidFile) {
                    let {data} = await axios.post('/api/file/delete', {file: file.serverFile});
                    if (data.success) {
                        return true;
                    }
                    else {
                        this.$store.commit('setErrorMessage', 'Ошибка удаления файла: ' + data.error);
                        return false;
                    }
                }
            },

            async deleteFile(index) {
                let file = this.files[index];
                let deleteSuccess = await this.deleteFileApi(file);
                if (deleteSuccess) {
                    this.files.splice(index, 1);
                }
            }
        },
        computed: {
            categories() {
                return this.$store.state.category.list;
            },
            addPhotoTrix() {
                return event => this.addPhoto(event, this);
            }
        }
    }
</script>

<style scoped>
    .no-files .trix-button-group--file-tools {display: none}
</style>