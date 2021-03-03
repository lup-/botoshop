<template>
    <v-container class="fill-height align-start">
        <v-row>
            <v-col cols="12">
                <v-card>
                    <v-card-title>{{isNew ? 'Новая рассылка' : 'Редактирование рассылки'}}</v-card-title>
                    <v-card-text>
                        <v-form autocomplete="off">
                            <v-row class="mt-4">
                                <v-col cols="12">
                                    <v-select
                                            label="Боты для рассылки"
                                            :items="bots"
                                            item-text="username"
                                            item-value="id"
                                            v-model="item.bots"
                                            multiple
                                            chips
                                            deletable-chips
                                    ></v-select>
                                </v-col>
                            </v-row>

                            <v-row>
                                <v-col cols="12" md="6">
                                    <v-menu
                                            v-model="menuDate"
                                            :close-on-content-click="false"
                                            transition="scale-transition"
                                            offset-y
                                            max-width="290px"
                                            min-width="290px"
                                    >
                                        <template v-slot:activator="{ on, attrs }">
                                            <v-text-field
                                                v-model="startDateFormatted"
                                                label="Начало рассылки"
                                                hint="В формате 31.12.2020"
                                                persistent-hint
                                                prepend-icon="mdi-calendar"
                                                v-bind="attrs"
                                                @blur="startDate = parseDate(startDateFormatted)"
                                                v-on="on"
                                            ></v-text-field>
                                        </template>
                                        <v-date-picker
                                                v-model="startDate"
                                                no-title
                                                @input="menuDate = false"
                                        ></v-date-picker>
                                    </v-menu>
                                </v-col>
                                <v-col cols="12" md="6">
                                    <v-menu
                                            ref="menuTime"
                                            v-model="menuTime"
                                            :close-on-content-click="false"
                                            :nudge-right="40"
                                            :return-value.sync="startTime"
                                            transition="scale-transition"
                                            offset-y
                                            max-width="290px"
                                            min-width="290px"
                                    >
                                        <template v-slot:activator="{ on, attrs }">
                                            <v-text-field
                                                    v-model="startTime"
                                                    prepend-icon="mdi-clock-time-four-outline"
                                                    hint="В формате 14:21"
                                                    persistent-hint
                                                    v-bind="attrs"
                                                    v-on="on"
                                            ></v-text-field>
                                        </template>
                                        <v-time-picker
                                                v-if="menuTime"
                                                v-model="startTime"
                                                format="24hr"
                                                no-title
                                                full-width
                                                @click:minute="$refs.menuTime.save(startTime)"
                                        ></v-time-picker>
                                    </v-menu>
                                </v-col>
                            </v-row>
                            <v-row>
                                <v-col cols="12">
                                    <v-checkbox
                                        v-model="item.message.disablePreview"
                                        label="Отключить предпросмотр ссылок"
                                    ></v-checkbox>
                                    <v-checkbox
                                        v-model="item.message.disableNotification"
                                        label="Отключить оповещения"
                                    ></v-checkbox>
                                    <v-checkbox
                                        v-model="item.isTest"
                                        label="Пробная рассылка"
                                    ></v-checkbox>
                                </v-col>
                            </v-row>

                            <v-row class="mt-4">
                                <v-col cols="12">
                                    <vue-trix
                                        v-model="item.message.text"
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
                                    <v-switch v-model="item.message.telescopeVideo" label='Отправлять видео как "телескоп"'></v-switch>
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

                            <v-row>
                                <v-col cols="12" md="4">
                                    <v-btn @click="addButton">Добавить кнопку к сообщению</v-btn>
                                </v-col>
                            </v-row>
                            <v-row v-for="(button, index) in buttons" :key="index">
                                <v-col cols="12" md="5">
                                    <v-text-field
                                        label="Текст на кнопке"
                                        v-model="button.text"
                                    ></v-text-field>
                                </v-col>
                                <v-col cols="12" md="5">
                                    <v-text-field
                                        label="Ссылка"
                                        v-model="button.target"
                                    ></v-text-field>
                                </v-col>
                                <v-col cols="12" md="2">
                                    <v-btn @click="removeButton(index)"><v-icon>mdi-delete</v-icon></v-btn>
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
    import moment from "moment";
    import UploadFiles from "@/mixins/UploadFiles";

    export default {
        mixins: [UploadFiles],
        data() {
            return {
                item: {message: {}},
                menuDate: false,
                menuTime: false,
                buttons: [],
                buttonTypes: [
                    {text: 'Переход к этапу', value: 'stage'},
                    {text: 'Ссылка', value: 'link'},
                ],
                startTime: moment().startOf('h').add(1, 'h').format('HH:mm'),
                startDate: moment().format('YYYY-MM-DD'),
                startDateFormatted: moment().format('DD.MM.YYYY'),

                ACTION_LOAD: 'mailing/loadItems',
                ACTION_NEW: 'mailing/newItem',
                ACTION_SAVE: 'mailing/saveItem',
                ACTION_SET_EDIT_ITEM: 'mailing/setEditItem',
                ROUTE_LIST: 'mailingsList',
                STORE_MODULE: 'mailing'
            }
        },
        async created() {
            if (this.bots.length === 0) {
                await this.$store.dispatch('bot/loadItems');
            }
            this.updateMailingDate();

            if (this.itemId) {
                if (this.allItems.length === 0) {
                    await this.$store.dispatch(this.ACTION_LOAD);
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

                    if (this.item.startAt) {
                        let mailingDate = moment.unix(this.item.startAt);

                        this.startTime = mailingDate.format('HH:mm');
                        this.startDate = mailingDate.format('YYYY-MM-DD');
                        this.startDateFormatted = mailingDate.format('DD.MM.YYYY');
                    }

                    this.buttons = this.item.message.buttons;
                    this.photos = this.item.message.photos;
                    this.videos = this.item.message.videos;
                    this.other = this.item.message.other;
                }
            },
            startTime() {
                this.updateMailingDate();
            },
            startDate () {
                this.startDateFormatted = this.formatDate(this.startDate);
                this.updateMailingDate();
            },
        },
        methods: {
            isNew() {
                return !(this.$route.params && this.$route.params.id);
            },
            async save() {
                let saveItem = Object.assign({}, this.item);
                saveItem.message = Object.assign({}, this.item.message);
                saveItem.message.buttons = this.buttons;
                saveItem.message.photos = this.photos;
                saveItem.message.videos = this.videos;
                saveItem.message.other = this.other;

                if (this.isNew()) {
                    await this.$store.dispatch(this.ACTION_NEW, saveItem);
                }
                else {
                    await this.$store.dispatch(this.ACTION_SAVE, saveItem);
                }

                return this.gotoList();
            },
            gotoList() {
                return this.$router.push({name: this.ROUTE_LIST});
            },
            addButton() {
                this.buttons.push({text: '', target: ''});
            },
            removeButton(index = 0) {
                this.buttons.splice(index, 1);
            },
            parseDate (date) {
                if (!date) return null

                const [day, month, year] = date.split('.')
                return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`
            },
            formatDate (date) {
                if (!date) return null

                const [year, month, day] = date.split('-')
                return `${day}.${month}.${year}`
            },
            updateMailingDate() {
                let date = this.startDate
                    ? moment( this.startDate ).startOf('d')
                    : moment().startOf('d');

                if (this.startTime) {
                    let [hh, mm] = this.startTime.split(':');
                    date.set({'hour': parseInt(hh), 'minute': parseInt(mm), 'second': 0});
                }

                this.item.startAt = date.unix();
            },
        },
        computed: {
            bots() {
                return this.$store.state.bot.list;
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