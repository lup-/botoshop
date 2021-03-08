<template>
    <v-container class="fill-height align-start">
        <v-row>
            <v-col cols="12">
                <v-card>
                    <v-card-title>{{isNew ? 'Новый этап' : 'Редактирование этапа'}}</v-card-title>
                    <v-card-text>
                        <v-form autocomplete="off">

                            <v-row class="mt-4">
                                <v-col cols="12">
                                    <v-text-field
                                            v-model="item.title"
                                            label="Краткое название"
                                    ></v-text-field>
                                </v-col>
                            </v-row>

                            <v-switch v-model="item.isStarting" label="Входной этап" hint="При включении все прочие входные этапы будут отключены" persistent-hint></v-switch>
                            <v-switch v-model="item.needsAnswer" label="Собирать ответы" hint="Пользователь должен написать ответ для перехода к следующему этапу" persistent-hint></v-switch>

                            <v-select v-if="item.needsAnswer"
                                    label="После ответа перейти к этому этапу"
                                    :items="nextStages"
                                    item-text="title"
                                    item-value="id"
                                    v-model="item.nextStage"
                            ></v-select>

                            <v-row class="mt-4">
                                <v-col cols="12">
                                    <vue-trix
                                            v-model="item.text"
                                            placeholder="Текст сообщения"
                                            @trix-file-accept="addFile"
                                    ></vue-trix>
                                </v-col>
                            </v-row>

                            <v-row class="my-4" v-if="photos && photos.length > 0">
                                <v-col cols="12">Фото:</v-col>
                                <v-col cols="12">
                                    <v-chip v-for="(photo, index) in photos" :key="photo.name"
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

                            <v-row class="my-4" v-if="videos && videos.length > 0">
                                <v-col cols="12">Видео:</v-col>
                                <v-col cols="12">
                                    <v-chip v-for="(video, index) in videos" :key="video.name"
                                            class="mr-2 mb-2"
                                            close
                                            close-icon="mdi-delete"
                                            @click:close="deleteVideo(index)"
                                    >
                                        {{video.name}}
                                    </v-chip>
                                </v-col>
                                <v-col cols="12">
                                    <v-switch v-model="item.telescopeVideo" label='Отправлять видео как "телескоп"'></v-switch>
                                </v-col>
                            </v-row>

                            <v-row class="my-4" v-if="other && other.length > 0">
                                <v-col cols="12">Прочие файлы:</v-col>
                                <v-col cols="12">
                                    <v-chip v-for="(file, index) in other" :key="file.name"
                                            class="mr-2 mb-2"
                                            close
                                            close-icon="mdi-delete"
                                            @click:close="deleteFile(index)"
                                    >
                                        {{file.name}}
                                    </v-chip>
                                </v-col>
                            </v-row>

                            <div v-if="!item.needsAnswer">
                                <v-row>
                                    <v-col cols="12" md="4">
                                        <v-btn @click="addButton">Добавить кнопку к сообщению</v-btn>
                                    </v-col>
                                </v-row>
                                <v-row v-for="(button, index) in buttons" :key="index">
                                    <v-col cols="12" md="6">
                                        <v-text-field
                                                label="Текст на кнопке"
                                                v-model="button.text"
                                        ></v-text-field>
                                    </v-col>
                                    <v-col cols="12" md="3">
                                        <v-select
                                                label="Тип кнопки"
                                                :items="buttonTypes"
                                                v-model="button.type"
                                        ></v-select>
                                    </v-col>
                                    <v-col cols="12" md="3">
                                        <v-select v-if="button.type === 'stage'"
                                                label="Этап"
                                                :items="nextStages"
                                                item-text="title"
                                                item-value="id"
                                                v-model="button.target"
                                        ></v-select>
                                        <v-text-field v-else-if="button.type === 'link'"
                                                label="Ссылка"
                                                v-model="button.target"
                                        ></v-text-field>
                                        <v-btn @click="removeButton(index)">Удалить</v-btn>
                                    </v-col>
                                </v-row>
                            </div>

                        </v-form>
                    </v-card-text>
                    <v-card-actions>
                        <v-btn @click="gotoList">К списку</v-btn>
                        <v-btn @click="gotoBuilder">К конструктору</v-btn>
                        <v-btn large color="primary" @click="save">Сохранить</v-btn>
                    </v-card-actions>
                </v-card>
            </v-col>
        </v-row>
    </v-container>
</template>

<script>
    import UploadFiles from "@/mixins/UploadFiles";

    export default {
        mixins: [UploadFiles],
        data() {
            return {
                item: {},
                buttons: [],
                buttonTypes: [
                    {text: 'Переход к этапу', value: 'stage'},
                    {text: 'Ссылка', value: 'link'},
                ],

                ACTION_LOAD: 'stage/loadItems',
                ACTION_NEW: 'stage/newItem',
                ACTION_SAVE: 'stage/saveItem',
                ACTION_SET_EDIT_ITEM: 'stage/setEditItem',
                ROUTE_LIST: 'stagesList',
                STORE_MODULE: 'stage'
            }
        },
        async created() {
            if (this.itemId) {
                if (this.allItems.length === 0) {
                    await this.$store.dispatch(this.ACTION_LOAD, {funnelId: this.funnelId});
                }

                this.$store.dispatch(this.ACTION_SET_EDIT_ITEM, this.itemId);
            }
        },
        watch: {
            itemId() {
                this.$store.dispatch(this.ACTION_SET_EDIT_ITEM, this.itemId);
            },
            allItems: {
                deep: true,
                handler() {
                    if (this.itemId) {
                        this.$store.dispatch(this.ACTION_SET_EDIT_ITEM, this.itemId);
                    }
                }
            },
            storeItem() {
                if (this.storeItem) {
                    this.item = this.storeItem;
                    this.buttons = this.item.buttons;
                    this.photos = this.item.photos;
                    this.videos = this.item.videos;
                    this.other = this.item.other;
                }
            },
        },
        methods: {
            isNew() {
                return !(this.$route.params && this.$route.params.id);
            },
            async save() {
                let saveItem = Object.assign({}, this.item);
                saveItem.buttons = this.buttons;
                saveItem.photos = this.photos;
                saveItem.videos = this.videos;
                saveItem.other = this.other;

                if (this.isNew()) {
                    if (this.funnelHasNoStages) {
                        saveItem.isStarting = true;
                    }

                    await this.$store.dispatch(this.ACTION_NEW, {item: saveItem, funnelId: this.funnelId});
                }
                else {
                    await this.$store.dispatch(this.ACTION_SAVE, {item: saveItem, funnelId: this.funnelId});
                }

                return this.gotoBuilder();
            },
            gotoList() {
                return this.$router.push({name: this.ROUTE_LIST, params: {funnelId: this.funnelId}});
            },
            gotoBuilder() {
                return this.$router.push({name: 'funnelBuilderEdit', params: {id: this.funnelId}});
            },
            addButton() {
                this.buttons.push({text: '', type: 'stage', target: ''});
            },
            removeButton(index = 0) {
                this.buttons.splice(index, 1);
            },
        },
        computed: {
            funnelHasNoStages() {
                return this.allItems.length === 0;
            },
            funnelId() {
                return this.$route.params && this.$route.params.funnelId
                    ? this.$route.params.funnelId || false
                    : false;
            },
            itemId() {
                return this.$route.params && this.$route.params.id
                    ? this.$route.params.id || false
                    : false;
            },
            storeItem() {
                return this.$store.state[this.STORE_MODULE].edit;
            },
            nextStages() {
                return this.allItems.filter(stage => stage.id !== this.itemId);
            },
            allItems() {
                return this.$store.state[this.STORE_MODULE].list;
            },
        }
    }
</script>

<style scoped>

</style>